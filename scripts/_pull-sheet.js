const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const secret = JSON.parse(fs.readFileSync(path.resolve(process.env.USERPROFILE, '.config/gws/client_secret.json'), 'utf8')).installed;
const oAuth2 = new google.auth.OAuth2(secret.client_id, secret.client_secret, 'urn:ietf:wg:oauth:2.0:oob');
oAuth2.setCredentials(JSON.parse(fs.readFileSync(path.join(__dirname, '_gtoken.json'), 'utf8')));
const sheets = google.sheets({ version: 'v4', auth: oAuth2 });

sheets.spreadsheets.values.get({
  spreadsheetId: '1NTo1bVKh7ovKmE6SqLbTcr4ZUYUTWsws2v21IA93RBw',
  range: 'Inventory!A1:P'
}).then(res => {
  const [, ...rows] = res.data.values;
  const records = rows.map(r => ({
    tokenId:       r[0] !== '' && r[0] != null ? Number(r[0]) : null,
    title:         r[1]  || '',
    description:   r[2]  || '',
    projectName:   r[3]  || '',
    project:       r[4]  || '',
    blockchain:    r[5]  || '',
    contract:      r[6]  || '',
    tokenStandard: r[7]  || '',
    editions:      r[8] !== '' && r[8] != null ? Number(r[8]) : null,
    mintDate:      r[9]  || '',
    mediaType:     r[10] || '',
    fileExt:       r[11] || '',
    storageType:   r[12] || '',
    owner:         r[13] || '',
    mediaUrl:      r[14] || '',
    imageUrl:      r[15] || '',
  }));

  const inventory = {
    generatedAt: new Date().toISOString(),
    aggregates: {
      totalRecords: records.length,
      contracts: [...new Set(records.map(r => r.contract).filter(Boolean))].length,
      chains: [...new Set(records.map(r => r.blockchain).filter(Boolean))]
    },
    records
  };

  fs.writeFileSync(path.join(__dirname, '..', 'js', 'data', 'inventory.json'), JSON.stringify(inventory, null, 2));
  fs.writeFileSync(path.join(__dirname, '..', 'js', 'data', 'inventory.js'), 'window.INVENTORY = ' + JSON.stringify(inventory) + ';');
  console.log('Saved ' + records.length + ' records to inventory.json + inventory.js');
}).catch(e => { console.error(e.message); process.exit(1); });
