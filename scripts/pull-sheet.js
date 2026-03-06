#!/usr/bin/env node
// Pulls the Odiville Archive Google Sheet back into inventory.json
// Usage: node scripts/pull-sheet.js

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1NTo1bVKh7ovKmE6SqLbTcr4ZUYUTWsws2v21IA93RBw';
const SHEET_NAME = 'Inventory';
const TOKEN_PATH = path.join(__dirname, '_gtoken.json');
const CLIENT_SECRET_PATH = path.resolve(process.env.USERPROFILE || process.env.HOME, '.config/gws/client_secret.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// ── Auth (reuses saved token from populate-sheet) ─────────────────────────────
function getAuth() {
  const secret = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8'));
  const { client_id, client_secret } = secret.installed;
  const oAuth2 = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');
  if (!fs.existsSync(TOKEN_PATH)) throw new Error('No token found — run populate-sheet.js first to authorise.');
  oAuth2.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
  return oAuth2;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Reading sheet...');
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:P`,
  });

  const [headers, ...rows] = res.data.values || [];
  if (!headers) throw new Error('Sheet appears empty.');
  console.log(`Read ${rows.length} data rows`);

  // Map header names to indices
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  const records = rows
    .filter(r => r.some(c => c && c.trim()))  // skip blank rows
    .map(r => {
      const get = (name) => (r[col[name]] || '').trim();
      const tokenRaw = get('Token ID');
      const editionsRaw = get('Editions');
      return {
        tokenId:       tokenRaw !== '' ? Number(tokenRaw) : null,
        title:         get('Title'),
        description:   get('Description'),
        projectName:   get('Collection'),
        project:       get('Project Key'),
        blockchain:    get('Blockchain'),
        contract:      get('Contract'),
        tokenStandard: get('Token Standard'),
        editions:      editionsRaw !== '' ? Number(editionsRaw) : null,
        mintDate:      get('Mint Date'),
        mediaType:     get('Media Type'),
        fileExt:       get('File Ext'),
        storageType:   get('Storage Type'),
        owner:         get('Owner'),
        mediaUrl:      get('Media URL'),
        imageUrl:      get('Image URL'),
      };
    });

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'Google Sheets',
    aggregates: {
      totalRecords: records.length,
    },
    records,
  };

  const outPath = path.join(__dirname, '..', 'js', 'data', 'inventory.js');
  fs.writeFileSync(outPath, 'window.INVENTORY = ' + JSON.stringify(output) + ';');
  console.log(`Saved ${records.length} records to js/data/inventory.js`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
