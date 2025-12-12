/**
 * Adyen Apple Pay Drop-in (Render-ready)
 * - Exposes /api/adyen/applepay/sessions -> calls Adyen /applePay/sessions
 * - Exposes /api/adyen/payments -> calls Adyen /payments with applePay token
 *
 * This implementation expects:
 * - ADYEN_API_KEY, ADYEN_MERCHANT_ACCOUNT, APPLE_MERCHANT_ID, DOMAIN_NAME in env
 *
 * Important: You must host the apple-developer-merchantid-domain-association file at
 * https://<DOMAIN_NAME>/.well-known/apple-developer-merchantid-domain-association
 * (download it from Apple Developer and place it there).
 */
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const bodyParser = require('body-parser');

const ADYEN_API_KEY = process.env.ADYEN_API_KEY;
const ADYEN_MERCHANT_ACCOUNT = process.env.ADYEN_MERCHANT_ACCOUNT;
const APPLE_MERCHANT_ID = process.env.APPLE_MERCHANT_ID;
const DOMAIN_NAME = process.env.DOMAIN_NAME;
const ADYEN_CHECKOUT_BASE = process.env.ADYEN_CHECKOUT_BASE || 'https://checkout-test.adyen.com/v67';
const PORT = process.env.PORT || 3000;

if (!ADYEN_API_KEY) {
  console.error('ADYEN_API_KEY is required in environment');
}

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Create Apple merchant session via Adyen. Requires APPLE_MERCHANT_ID and domain verification
app.post('/api/adyen/applepay/sessions', async (req, res) => {
  try {
    if (!ADYEN_API_KEY) return res.status(500).json({ error: 'ADYEN_API_KEY not configured' });

    const { origin, displayName } = req.body || {};
    const domainName = process.env.DOMAIN_NAME || new URL(origin || 'https://example.com').hostname;
    const payload = {
      merchantIdentifier: process.env.APPLE_MERCHANT_ID,
      domainName,
      displayName: displayName || 'Demo Store',
      amount: { currency: 'EUR', value: 1000 },
      channel: 'Web'
    };

    const resp = await fetch(`${ADYEN_CHECKOUT_BASE}/applePay/sessions`, {
      method: 'POST',
      headers: {
        'x-api-key': ADYEN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Adyen sessions error', resp.status, txt);
      return res.status(resp.status).json({ error: txt });
    }
    const json = await resp.json();
    return res.json(json);
  } catch (err) {
    console.error('applepay sessions err', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Process payment via Adyen /payments using applePayToken
app.post('/api/adyen/payments', async (req, res) => {
  try {
    if (!ADYEN_API_KEY) return res.status(500).json({ error: 'ADYEN_API_KEY not configured' });
    const { paymentData, amount } = req.body || {};
    if (!paymentData) return res.status(400).json({ error: 'paymentData required' });

    const applePayTokenBase64 = Buffer.from(JSON.stringify(paymentData)).toString('base64');
    const payload = {
      amount: amount || { currency: 'EUR', value: 1000 },
      paymentMethod: { type: 'applepay' },
      applePayToken: applePayTokenBase64,
      reference: `ORDER-${Date.now()}`,
      merchantAccount: ADYEN_MERCHANT_ACCOUNT
    };

    const resp = await fetch(`${ADYEN_CHECKOUT_BASE}/payments`, {
      method: 'POST',
      headers: {
        'x-api-key': ADYEN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const json = await resp.json();
    return res.json(json);
  } catch (err) {
    console.error('adyen payments err', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
