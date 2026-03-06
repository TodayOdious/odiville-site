/**
 * api/listings.js — Vercel serverless function
 * Proxies OpenSea listings + floor prices for all Odiville collections.
 * Also enriches listings with NFT title/image from inventory.json.
 * Response is CDN-cached for 5 minutes (s-maxage=300).
 */

'use strict';

const { readFileSync } = require('fs');
const { join }        = require('path');

const OPENSEA_BASE = 'https://api.opensea.io/api/v2';
const PAGE_LIMIT   = 10;

/* ── Inventory helpers ─────────────────────────────────────── */

function getInventory() {
  const data = JSON.parse(
    readFileSync(join(process.cwd(), 'js', 'data', 'inventory.json'), 'utf-8')
  );
  const records = data.records || [];
  const slugs   = [...new Set(records.map(r => r.openseaCollection).filter(Boolean))].sort();
  return { records, slugs };
}

/* ── OpenSea helpers ───────────────────────────────────────── */

async function apiGet(path, apiKey) {
  const url = OPENSEA_BASE + path;
  const res = await fetch(url, {
    headers: {
      'x-api-key':  apiKey,
      'Accept':     'application/json',
      'User-Agent': 'odiville-listings/1.0',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

function weiToEth(valueStr, decimals) {
  try {
    return parseInt(valueStr, 10) / Math.pow(10, decimals != null ? decimals : 18);
  } catch (_) {
    return 0;
  }
}

/* ── Fetch floor price for one collection ──────────────────── */

async function fetchFloor(slug, apiKey) {
  const data = await apiGet('/collections/' + slug + '/stats', apiKey);
  if (!data) return null;
  const total = data.total || {};
  const price = total.floor_price;
  if (price != null && price > 0) {
    return {
      price:    Math.round(price * 1e6) / 1e6,
      currency: total.floor_price_symbol || 'ETH',
    };
  }
  return null;
}

/* ── Fetch all active listings for one collection ──────────── */

async function fetchListings(slug, apiKey) {
  const results = [];
  let next = null;
  let page = 0;

  while (page < PAGE_LIMIT) {
    const qs   = '?limit=50' + (next ? '&next=' + encodeURIComponent(next) : '');
    const data = await apiGet('/listings/collection/' + slug + '/all' + qs, apiKey);
    if (!data) break;

    const raw = data.listings || [];

    for (const item of raw) {
      try {
        const priceInfo = (item.price && item.price.current) ? item.price.current : {};
        const price     = weiToEth(priceInfo.value || '0', priceInfo.decimals);
        const proto     = (item.protocol_data && item.protocol_data.parameters) ? item.protocol_data.parameters : {};
        const offer     = (proto.offer && proto.offer[0]) ? proto.offer[0] : {};
        const contract  = (offer.token || '').toLowerCase();
        const tokenId   = offer.identifierOrCriteria || '';
        if (!contract || !tokenId) continue;

        results.push({
          key:        contract + ':' + tokenId,
          contract:   contract,
          tokenId:    tokenId,
          price:      Math.round(price * 1e6) / 1e6,
          priceWei:   priceInfo.value || '0',
          currency:   priceInfo.currency || 'ETH',
          seller:     proto.offerer || '',
          orderHash:  item.order_hash || '',
          expiration: item.closing_date || '',
          collection: slug,
        });
      } catch (_) { /* skip malformed */ }
    }

    next = data.next || null;
    page++;
    if (!next || !raw.length) break;
  }

  return results;
}

/* ── Handler ───────────────────────────────────────────────── */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const API_KEY = process.env.OPENSEA_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'OPENSEA_API_KEY environment variable not set' });
  }

  try {
    const { records, slugs } = getInventory();

    const [floorResults, listingResults] = await Promise.all([
      Promise.all(slugs.map(function(slug) {
        return fetchFloor(slug, API_KEY).then(function(fp) { return { slug: slug, fp: fp }; });
      })),
      Promise.all(slugs.map(function(slug) {
        return fetchListings(slug, API_KEY).then(function(items) { return { slug: slug, items: items }; });
      })),
    ]);

    const floors = {};
    for (const { slug, fp } of floorResults) {
      floors[slug] = fp ? fp : { price: 0, currency: '' };
    }

    const allListings = {};
    for (const { items } of listingResults) {
      for (const item of items) {
        const k = item.key;
        if (!allListings[k] || item.price < allListings[k].price) {
          allListings[k] = {
            contract:   item.contract,
            tokenId:    item.tokenId,
            price:      item.price,
            priceWei:   item.priceWei,
            currency:   item.currency,
            seller:     item.seller,
            orderHash:  item.orderHash,
            expiration: item.expiration,
            collection: item.collection,
          };
        }
      }
    }

    // Enrich listings with NFT details from inventory
    const nftDetails = {};
    for (const rec of records) {
      const k = (rec.contract || '').toLowerCase() + ':' + rec.tokenId;
      if (allListings[k]) {
        nftDetails[k] = {
          title:       rec.title       || '',
          imageUrl:    rec.displayAnimationUrl || rec.imageUrl || rec.mediaUrl || '',
          openseaUrl:  rec.openseaUrl  || '',
          projectName: rec.projectName || '',
        };
      }
    }

    return res.json({
      fetchedAt:    new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      listingCount: Object.keys(allListings).length,
      floors:       floors,
      listings:     allListings,
      nftDetails:   nftDetails,
    });

  } catch (e) {
    console.error('[listings] Error:', e);
    return res.status(500).json({ error: e.message });
  }
};
