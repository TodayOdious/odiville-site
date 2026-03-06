/**
 * api/activity.js — Vercel serverless function
 * Returns recent marketplace events (sales, listings, transfers) across all Odiville collections.
 * Response is CDN-cached for 2 minutes.
 */

'use strict';

const { readFileSync } = require('fs');
const { join }        = require('path');

const OPENSEA_BASE = 'https://api.opensea.io/api/v2';

function getSlugs() {
  const data = JSON.parse(
    readFileSync(join(process.cwd(), 'js', 'data', 'inventory.json'), 'utf-8')
  );
  const seen = new Set();
  for (const rec of data.records || []) {
    if (rec.openseaCollection) seen.add(rec.openseaCollection);
  }
  return [...seen].sort();
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

function parsePrice(payment) {
  if (!payment || !payment.quantity) return null;
  try {
    const eth = parseInt(payment.quantity, 10) / Math.pow(10, payment.decimals || 18);
    return { price: Math.round(eth * 1e6) / 1e6, currency: payment.symbol || 'ETH' };
  } catch (_) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Cache 2 min, stale for 5 min
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  const API_KEY = process.env.OPENSEA_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'OPENSEA_API_KEY not set' });

  try {
    const slugs = getSlugs();

    const results = await Promise.all(
      slugs.map(slug =>
        apiGet('/events/collection/' + slug + '?limit=30', API_KEY)
          .then(data => {
            if (!data) return [];
            return (data.asset_events || []).map(e => {
              const priceInfo = parsePrice(e.payment);
              return {
                type:        e.event_type  || 'unknown',
                collection:  slug,
                nftName:     e.nft ? (e.nft.name || '') : '',
                nftImage:    e.nft ? (e.nft.display_image_url || '') : '',
                nftUrl:      e.nft ? (e.nft.permalink || '') : '',
                tokenId:     e.nft ? (e.nft.identifier || '') : '',
                contract:    e.nft ? (e.nft.contract || '').toLowerCase() : '',
                price:       priceInfo ? priceInfo.price : null,
                currency:    priceInfo ? priceInfo.currency : null,
                from:        e.from_address || '',
                to:          e.to_address   || '',
                date:        e.created_date || '',
                txHash:      e.transaction  || '',
              };
            });
          })
          .catch(() => [])
      )
    );

    const events = results
      .flat()
      .filter(e => e.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 100);

    return res.json({
      fetchedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      events,
    });

  } catch (e) {
    console.error('[activity] Error:', e);
    return res.status(500).json({ error: e.message });
  }
};
