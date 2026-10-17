const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

const SHARED_SECRET = 'suprtajnazprava';

app.post('/order', (req, res) => {
  const order = req.body;
  console.log('Přijata objednávka:', order);

  res.sendStatus(202);

  const sendWH = (status, customEventId = null) => {
    const eventId = customEventId || crypto.randomUUID();
    // Posilame vsechny tri polozky v objektu (s malym event_id)
    const payload = { id: order.id, status: status, event_id: eventId };
    const body = JSON.stringify(payload);

    const sig = crypto
      .createHmac('sha256', SHARED_SECRET)
      .update(body, 'utf8')
      .digest('hex');

    fetch(order.callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': sig
      },
      body: body // Posilame cele podepsane telo zpravy
    })
      .then(response => console.log(`Stav '${status}', (event_id: ${eventId.slice(0, 8)}...) odeslan objednavce ${order.id}, ${response.status}`))
      .catch(error => console.log(`neco nekde nefunguje`, error.message));

    return eventId;
  };

  setTimeout(() => {
    console.log(`restaurace pripravuje ${order.id}`);
    sendWH('restaurace pripravuje');

    setTimeout(() => {
      console.log(`restaurace rozvazi ${order.id}`);
      const duplicateEventId = sendWH('rozvazi se');

      // Simulace opakovaneho odeslani se stejnym event_id
      setTimeout(() => {
        console.log(`simulace retry, znovu odesilam rozvazi se pro ${order.id}`);
        sendWH('rozvazi se', duplicateEventId);
      }, 1000);

      setTimeout(() => {
        console.log(`objednavka ${order.id} dorucena`);
        sendWH('Doruceno');
      }, 5000);
    }, 5000);
  }, 5000);
});

app.listen(3000, () => {
  console.log('Courier runs on http://localhost:3000');
});