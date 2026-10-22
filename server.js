// Volitelný server pro Render: proxy k Datové kostce + záloha dat.
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const TOKEN = process.env.APP_TOKEN;
const DK_KEY = process.env.DATAKOSTKA_KEY;
const DK_URL = process.env.DATAKOSTKA_URL || 'https://api.dataovozidlech.cz/api/vehicletechnicaldata/v2';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const BACKUP = path.join(DATA_DIR, 'backup.json');

app.use(express.json({ limit: '5mb' }));

// CORS (aplikace může běžet i na GitHub Pages)
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Authorization, api_key, Content-Type',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function auth(req, res, next) {
  const given = (req.get('authorization') || '').replace(/^Bearer /, '') || req.get('api_key');
  if (!TOKEN || given !== TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// Bez tokenu a bez dat: jen probudí službu na bezplatném Renderu
app.get('/api/ping', (req, res) => res.json({ ok: true }));

app.get('/api/vin', auth, async (req, res) => {
  const vin = String(req.query.vin || '').toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return res.status(400).json({ error: 'bad vin' });
  if (!DK_KEY) return res.status(500).json({ error: 'DATAKOSTKA_KEY není nastaven' });
  try {
    const r = await fetch(DK_URL + '?vin=' + encodeURIComponent(vin), {
      headers: { api_key: DK_KEY, Accept: 'application/json' },
    });
    res.status(r.status).type('json').send(await r.text());
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.put('/api/backup', auth, (req, res) => {
  if (!req.body || !Array.isArray(req.body.cars)) return res.status(400).json({ error: 'bad body' });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(BACKUP, JSON.stringify(req.body));
  res.json({ ok: true });
});

app.get('/api/backup', auth, (req, res) => {
  if (!fs.existsSync(BACKUP)) return res.status(404).json({ error: 'no backup' });
  res.type('json').send(fs.readFileSync(BACKUP));
});

// Jen povolené statické soubory (nic jiného z repozitáře se nezveřejní)
['index.html', 'manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png'].forEach((f) => {
  const paths = f === 'index.html' ? ['/', '/index.html'] : ['/' + f];
  app.get(paths, (req, res) => res.sendFile(path.join(__dirname, f)));
});

app.listen(process.env.PORT || 3000, () => console.log('Garáž běží'));
