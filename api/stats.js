/**
 * api/stats.js — Vercel serverless function
 * Returns per-collection stats: floor, volume, sales, owners, supply.
 * Response is CDN-cached for 5 minutes (s-maxage=300).
 */

'use strict';

const { readFileSync } = require('fs');
const { join }        = require('path');

const OPENSEA_BASE = 'https://api.opensea.io/api/v2';

function getCollectionMeta() {
  const data = JSON.parse(
    readFileSync(join(process.cwd(), 'js', 'data', 'inventory.json'), 'utf-8')
  );
  // Build slug → display name map
  const meta = {};
  for (const rec of data.records || []) {
    if (rec.openseaCollection && !meta[rec.openseaCollection]) {
      meta[rec.openseaCollection] = rec.projectName || rec.openseaCollection;
    }
  }
  return meta;
}

async function apiGet(path, apiKey) {
  const res = await fetch(OPENSEA_BASE + path, {
    headers: {
      'x-api-key':  apiKey,
      'Accept':     'application/json',
      'User-Agent': 'odiville-dashboard/1.0',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

function round(n, dp) {
  if (!n) return 0;
  return Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const API_KEY = process.env.OPENSEA_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'OPENSEA_API_KEY not set' });

  try {
    const meta  = getCollectionMeta();
    const slugs = Object.keys(meta).sort();

    const results = await Promise.all(
      slugs.map(slug =>
        apiGet('/collections/' + slug + '/stats', API_KEY)
          .then(data => {
            const t    = (data && data.total)     || {};
            const day  = ((data && data.intervals) || []).find(i => i.interval === 'one_day')    || {};
            const week = ((data && data.intervals) || []).find(i => i.interval === 'seven_day')  || {};
            return {
              slug,
              name:       meta[slug],
              floor:      round(t.floor_price,    4),
              floorSymbol: t.floor_price_symbol || 'ETH',
              volume:     round(t.volume,         2),
              sales:      t.sales       || 0,
              avgPrice:   round(t.average_price,  4),
              owners:     t.num_owners  || 0,
              supply:     t.count       || 0,
              volume24h:  round(day.volume,        4),
              sales24h:   day.sales     || 0,
              volume7d:   round(week.volume,       2),
              sales7d:    week.sales    || 0,
            };
          })
          .catch(() => ({ slug, name: meta[slug] }))
      )
    );

    return res.json({
      fetchedAt:   new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      collections: results,
    });

  } catch (e) {
    console.error('[stats] Error:', e);
    return res.status(500).json({ error: e.message });
  }
};
