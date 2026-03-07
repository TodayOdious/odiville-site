/**
 * api/collection.js — Vercel serverless function
 * Returns all data for a single collection: stats, active listings, NFT list.
 * Usage: GET /api/collection?slug=odiouseditions
 * Response is CDN-cached for 60 seconds.
 */

'use strict';

const { readFileSync } = require('fs');
const { join }        = require('path');

const OPENSEA_BASE = 'https://api.opensea.io/api/v2';
const PAGE_LIMIT   = 10;

function getInventoryData(slug) {
  const data = JSON.parse(
    readFileSync(join(process.cwd(), 'js', 'data', 'inventory.json'), 'utf-8')
  );
  const records = data.records || [];

  // Build ordered list of all unique collections (preserving first-seen order)
  const seen  = new Map();
  for (const r of records) {
    if (r.openseaCollection && !seen.has(r.openseaCollection)) {
      seen.set(r.openseaCollection, r.projectName || r.openseaCollection);
    }
  }
  const allCollections = [...seen.entries()].map(([s, name]) => ({ slug: s, name }));

  const nfts = records
    .filter(r => r.openseaCollection === slug)
    .map(r => ({
      tokenId:     r.tokenId,
      contract:    (r.contract || '').toLowerCase(),
      title:       r.title       || '',
      imageUrl:             r.imageUrl || r.mediaUrl || '',
      displayAnimationUrl:  r.displayAnimationUrl || '',
      openseaUrl:  r.openseaUrl  || '',
      description: r.description || '',
      traits:      r.traits      || [],
      projectName: r.projectName || '',
      mediaType:   r.mediaType   || '',
      fileExt:     r.fileExt     || '',
      editions:    r.editions    || null,
      mintDate:    r.mintDate    || '',
      blockchain:  r.blockchain  || 'ethereum',
    }));

  return { nfts, allCollections };
}

async function apiGet(path, apiKey) {
  const res = await fetch(OPENSEA_BASE + path, {
    headers: {
      'x-api-key':  apiKey,
      'Accept':     'application/json',
      'User-Agent': 'odiville-collection/1.0',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

function weiToEth(val, dec) {
  try { return parseInt(val, 10) / Math.pow(10, dec != null ? dec : 18); }
  catch (_) { return 0; }
}

async function fetchStats(slug, apiKey) {
  const data = await apiGet('/collections/' + slug + '/stats', apiKey);
  if (!data) return {};
  const t   = data.total || {};
  const day = ((data.intervals || []).find(i => i.interval === 'one_day') || {});
  return {
    floor:       Math.round((t.floor_price  || 0) * 1e6) / 1e6,
    floorSymbol: t.floor_price_symbol || 'ETH',
    volume:      Math.round((t.volume       || 0) * 1e4) / 1e4,
    sales:       t.sales        || 0,
    owners:      t.num_owners   || 0,
    supply:      t.count        || 0,
    volume24h:   Math.round((day.volume     || 0) * 1e6) / 1e6,
    sales24h:    day.sales      || 0,
  };
}

async function fetchListings(slug, apiKey) {
  const results = {};
  let next = null;
  let page = 0;

  while (page < PAGE_LIMIT) {
    const qs   = '?limit=50' + (next ? '&next=' + encodeURIComponent(next) : '');
    const data = await apiGet('/listings/collection/' + slug + '/all' + qs, apiKey);
    if (!data) break;

    for (const item of data.listings || []) {
      try {
        const priceInfo = (item.price && item.price.current) ? item.price.current : {};
        const price     = weiToEth(priceInfo.value || '0', priceInfo.decimals);
        const proto     = (item.protocol_data && item.protocol_data.parameters) ? item.protocol_data.parameters : {};
        const offer     = (proto.offer && proto.offer[0]) ? proto.offer[0] : {};
        const contract  = (offer.token || '').toLowerCase();
        const tokenId   = offer.identifierOrCriteria || '';
        if (!contract || !tokenId) continue;

        const k = contract + ':' + tokenId;
        if (!results[k] || price < results[k].price) {
          results[k] = {
            contract:  contract,
            tokenId:   tokenId,
            price:     Math.round(price * 1e6) / 1e6,
            currency:  priceInfo.currency || 'ETH',
            orderHash: item.order_hash || '',
            seller:    proto.offerer   || '',
          };
        }
      } catch (_) {}
    }

    next = data.next || null;
    page++;
    if (!next || !(data.listings || []).length) break;
  }

  return results;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const slug = (req.query && req.query.slug) || '';
  if (!slug) return res.status(400).json({ error: 'slug parameter required' });

  const API_KEY = process.env.OPENSEA_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'OPENSEA_API_KEY not set' });

  try {
    const { nfts, allCollections } = getInventoryData(slug);
    if (!nfts.length) {
      return res.status(404).json({ error: 'Collection not found: ' + slug });
    }

    const [stats, listings] = await Promise.all([
      fetchStats(slug, API_KEY),
      fetchListings(slug, API_KEY),
    ]);

    return res.json({
      fetchedAt:      new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      slug:           slug,
      name:           nfts[0].projectName || slug,
      stats:          stats,
      listings:       listings,
      nfts:           nfts,
      allCollections: allCollections,
    });

  } catch (e) {
    console.error('[collection] Error:', e);
    return res.status(500).json({ error: e.message });
  }
};
