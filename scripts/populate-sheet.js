#!/usr/bin/env node
// Populates the Odiville Archive Google Sheet from inventory.json
// Uses googleapis + existing client_secret.json credentials
// Usage: node scripts/populate-sheet.js

const { google } = require('googleapis');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1NTo1bVKh7ovKmE6SqLbTcr4ZUYUTWsws2v21IA93RBw';
const SHEET_NAME = 'Inventory';
const SHEET_ID = 846003232;
const TOKEN_PATH = path.join(__dirname, '_gtoken.json');
const CLIENT_SECRET_PATH = path.resolve(process.env.USERPROFILE || process.env.HOME, '.config/gws/client_secret.json');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// ── Auth ─────────────────────────────────────────────────────────────────────
function getAuth() {
  const secret = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8'));
  const { client_id, client_secret } = secret.installed;
  const oAuth2 = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');

  if (fs.existsSync(TOKEN_PATH)) {
    oAuth2.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
    return Promise.resolve(oAuth2);
  }

  return new Promise((resolve, reject) => {
    const authUrl = oAuth2.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
    console.log('\nOpen this URL in your browser:\n');
    console.log(authUrl);
    console.log('\nAfter approving, Google will show you a code. Paste it here and press Enter:');

    exec(`start "" "${authUrl}"`, () => {});

    const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    readline.question('> ', async (code) => {
      readline.close();
      try {
        const { tokens } = await oAuth2.getToken(code.trim());
        oAuth2.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('Authorised!');
        resolve(oAuth2);
      } catch (e) { reject(e); }
    });
  });
}

// ── Load artworks.js in Node context ─────────────────────────────────────────
function loadArtworkRegistry() {
  const vm = require('vm');
  const artworksPath = path.join(__dirname, '..', 'js', 'data', 'artworks.js');
  const code = fs.readFileSync(artworksPath, 'utf8');
  const ctx = { window: {} };
  vm.runInNewContext(code, ctx);
  return ctx.window.ARTWORK_REGISTRY || [];
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const inventoryPath = path.join(__dirname, '..', 'js', 'data', 'inventory.json');
  const { records: inventoryRecords } = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  console.log(`Loaded ${inventoryRecords.length} inventory records`);

  // Load DUU artworks from artworks.js, labelled as "Echoes by Odious"
  const artworkRegistry = loadArtworkRegistry();
  const duuArtworks = artworkRegistry.filter(a => a.project === 'duu');
  console.log(`Loaded ${duuArtworks.length} DUU artworks from registry`);

  // Convert artworks to inventory-style records
  const artworkRecords = duuArtworks.map(a => ({
    tokenId:       a.tokenId,
    title:         a.name,
    description:   '',
    projectName:   'Echoes by Odious',
    project:       'duu',
    blockchain:    'ethereum',
    contract:      a.contract || '',
    tokenStandard: 'erc-721',
    editions:      null,
    mintDate:      a.date || '',
    mediaType:     '',
    fileExt:       a.src ? a.src.split('.').pop() : '',
    storageType:   'Local',
    owner:         '',
    mediaUrl:      '',
    imageUrl:      a.src || '',
  }));

  // Merge: inventory first, then artwork records not already covered
  // Deduplicate by tokenId + contract (string)
  const seen = new Set(inventoryRecords.map(r => r.tokenId + '|' + r.contract));
  const newArtworks = artworkRecords.filter(a => !seen.has(a.tokenId + '|' + a.contract));
  console.log(`Adding ${newArtworks.length} new artwork records (${artworkRecords.length - newArtworks.length} already in inventory)`);

  const records = [...inventoryRecords, ...newArtworks];

  const auth = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const HEADERS = [
    'Token ID', 'Title', 'Description', 'Collection', 'Project Key',
    'Blockchain', 'Contract', 'Token Standard', 'Editions',
    'Mint Date', 'Media Type', 'File Ext', 'Storage Type',
    'Owner', 'Media URL', 'Image URL'
  ];

  const rows = [HEADERS, ...records.map(r => [
    r.tokenId != null ? String(r.tokenId) : '',
    r.title || '',
    r.description || '',
    // Rename any existing 'The Book' labels to 'Echoes by Odious'
    (r.projectName === 'The Book' ? 'Echoes by Odious' : r.projectName) || '',
    r.project || '',
    r.blockchain || '',
    r.contract || '',
    r.tokenStandard || '',
    r.editions != null ? String(r.editions) : '',
    r.mintDate || '',
    r.mediaType || '',
    r.fileExt || '',
    r.storageType || '',
    r.owner || '',
    r.mediaUrl || '',
    r.imageUrl || '',
  ])];

  // Write data
  console.log(`Writing ${rows.length} rows...`);
  const writeRes = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [{ range: `${SHEET_NAME}!A1`, values: rows }]
    }
  });
  console.log(`Updated: ${writeRes.data.totalUpdatedRows} rows`);

  // Format
  console.log('Applying formatting...');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: SHEET_ID, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount'
          }
        },
        {
          repeatCell: {
            range: { sheetId: SHEET_ID, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                backgroundColor: { red: 0.1, green: 0.1, blue: 0.1 }
              }
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)'
          }
        },
        {
          autoResizeDimensions: {
            dimensions: { sheetId: SHEET_ID, dimension: 'COLUMNS', startIndex: 0, endIndex: 16 }
          }
        }
      ]
    }
  });
  console.log('Done!\nhttps://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit');
}

main().catch(e => { console.error(e.message); process.exit(1); });
