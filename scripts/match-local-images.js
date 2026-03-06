#!/usr/bin/env node
// Matches artworks.js local image paths to inventory records.
// Adds a `localImage` field to each matched inventory record.
// Usage: node scripts/match-local-images.js

const fs = require('fs');
const path = require('path');

// ── Load artworks registry ────────────────────────────────────────────────────
const artworksRaw = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'data', 'artworks.js'), 'utf8'
);
// Strip the window.ARTWORK_REGISTRY = ... wrapper and eval
const registryJson = artworksRaw
  .replace(/^[\s\S]*?window\.ARTWORK_REGISTRY\s*=\s*/, '')
  .replace(/;\s*$/, '');
const registry = eval('(' + registryJson + ')');

// ── Load inventory ────────────────────────────────────────────────────────────
const inventoryPath = path.join(__dirname, '..', 'js', 'data', 'inventory.json');
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const records = inventory.records;

// ── Normalise title for fuzzy matching ───────────────────────────────────────
function norm(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ── Build lookup maps ─────────────────────────────────────────────────────────
// Map: project+tokenId → record index (primary match)
const byProjectToken = new Map();
// Map: project+normTitle → record index (fallback)
const byProjectTitle = new Map();

records.forEach((r, i) => {
  if (r.tokenId != null) {
    byProjectToken.set(`${r.project}__${r.tokenId}`, i);
  }
  byProjectTitle.set(`${r.project}__${norm(r.title)}`, i);
});

// ── Match and annotate ────────────────────────────────────────────────────────
let matched = 0, unmatched = [];

registry.forEach(art => {
  if (!art.src) return;

  const proj = art.project; // 'duu' | 'whispers' | 'owt'
  let idx = -1;

  // Primary: tokenId match
  if (art.tokenId != null) {
    idx = byProjectToken.get(`${proj}__${art.tokenId}`) ?? -1;
  }

  // Fallback: title match (also try 'residents' project for whispers residents)
  if (idx === -1) {
    idx = byProjectTitle.get(`${proj}__${norm(art.name)}`) ?? -1;
  }
  if (idx === -1 && proj === 'whispers') {
    idx = byProjectTitle.get(`residents__${norm(art.name)}`) ?? -1;
  }

  if (idx !== -1) {
    records[idx].localImage = art.src;
    matched++;
  } else {
    unmatched.push({ name: art.name, project: art.project, tokenId: art.tokenId });
  }
});

// ── Save updated inventory ────────────────────────────────────────────────────
fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
fs.writeFileSync(
  path.join(__dirname, '..', 'js', 'data', 'inventory.js'),
  'window.INVENTORY = ' + JSON.stringify(inventory) + ';'
);

console.log(`Matched:   ${matched} / ${registry.length} artworks`);
console.log(`Inventory: ${records.filter(r => r.localImage).length} records now have localImage`);

if (unmatched.length) {
  console.log('\nUnmatched artworks:');
  unmatched.forEach(u => console.log(`  [${u.project}] "${u.name}" (tokenId: ${u.tokenId})`));
}
