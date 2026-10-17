const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const SHARED_SECRET = 'suprtajnazprava';
const orders = {};
const processedEvents = new Set();

app.post('/update', (req, res) => {
  // 1. Data vytahujeme z req.body HNED na zacatku
  const { id, status, event_id } = req.body;

  // 2. Overeni HMAC podpisu ze vsech poli
  const body = JSON.stringify({ id, status, event_id });
  const sigHeader = (req.get('X-Signature') || '').trim();
  const expectedSig = crypto
    .createHmac('sha256', SHARED_SECRET)
    .update(body, 'utf8')
    .digest('hex');

  if (sigHeader !== expectedSig) {
    console.log(`chyba 401, neplatny secret. prislo: '${sigHeader}', ocekavano: '${expectedSig}'`);
    return res.status(401).send('Neplatny podpis webhooku');
  }

  // 3. Kontrola duplicity
  if (processedEvents.has(event_id)) {
    console.log(`ignoruju duplicitu ${event_id ? event_id.slice(0, 8) : ''}`);
    return res.sendStatus(200);
  }

  // 4. Uloženi události a aktualizace stavu
  processedEvents.add(event_id);
  orders[id] = status;

  console.log(`objednavka '${id}' ma zmeneny stav na: ${status}`);
  console.log('aktualni objednavky:', orders);

  res.sendStatus(200);
});

app.get('/orders', (req, res) => {
  res.json(orders);
});

app.listen(3001, () => {
  console.log('Server restaurace bezi na http://localhost:3001');
});