const { google } = require('googleapis');
const fs = require('fs');
(async () => {
  try {
    const key = JSON.parse(fs.readFileSync('./server/google-service.json','utf8'));
    const auth = new google.auth.GoogleAuth({ credentials: key, scopes: ['https://www.googleapis.com/auth/spreadsheets']});
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = '1vxQS25U1q6pJG7x3MqAsybC_BBwq3rb1eYK5a9NoVgA';
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    console.log('Sheets found:');
    (meta.data.sheets || []).forEach((s) => console.log('-', s.properties?.title));
  } catch (err) {
    console.error('Error listing sheets:', err?.response?.data || err.message || err);
  }
})();