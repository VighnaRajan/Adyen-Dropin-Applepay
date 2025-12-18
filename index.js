/**
 * Minimal Node/Express backend for Apple Pay + Adyen sample
 * - Serves static files from /public
 * - POST /api/adyen/applepay/sessions -> requests an Apple session from Adyen (Adyen-managed cert)
 * - POST /api/adyen/payments -> forwards Apple Pay token to Adyen /payments (sandbox)
 *
 * NOTE: Do not commit your ADYEN_API_KEY or merchant certs to git.
 */
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const bodyParser = require('body-parser');

const ADYEN_API_KEY = process.env.ADYEN_API_KEY;
const ADYEN_MERCHANT_ACCOUNT = process.env.ADYEN_MERCHANT_ACCOUNT;
const ADYEN_CHECKOUT_BASE = process.env.ADYEN_CHECKOUT_BASE || 'https://checkout-test.adyen.com/v67';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ---- Apple Pay domain verification audit filter ----
app.use('/.well-known/apple-developer-merchantid-domain-association', (req, res, next) => {
  console.log('=== Apple Pay Domain Verification Request ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('Host:', req.headers.host);
  console.log('IP:', req.ip);

  console.log('Headers:', {
    'user-agent': req.headers['user-agent'],
    'accept': req.headers['accept'],
    'accept-encoding': req.headers['accept-encoding'],
    'connection': req.headers['connection']
  });

  console.log('Query params:', req.query);
  console.log('Body:', req.body);

  console.log('============================================');

  next(); // IMPORTANT: allow request to continue
});


// Request an Apple merchant session from Adyen (Adyen-managed certificate)
app.post('/api/adyen/applepay/sessions', async (req, res) => {
  if (!ADYEN_API_KEY) return res.status(500).json({ error: 'ADYEN_API_KEY not configured' });
  console.log("ADYEN_API_KEY", ADYEN_API_KEY);
  
  const { origin, domainName, displayName, amount } = req.body || {};
  const payload = {
    domainName: domainName || new URL(origin || 'https://example.com').hostname,
    displayName: displayName || 'Demo Store',
    merchantIdentifier: "merchant.com.onebill.payment1",
  };
  console.log("payload", payload);
  

  try {
    const resp = await fetch(`${ADYEN_CHECKOUT_BASE}/applePay/sessions`, {
      method: 'POST',
      headers: {
        'x-api-key': ADYEN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log("resp", resp);
    
    if (!resp.ok) {
      const txt = await resp.text();
      console.log("errResp", txt);
      
      console.error('Adyen sessions error', resp.status, txt);
      return res.status(resp.status).send({ error: txt });
    }
    const json = await resp.json();
    console.log("jsonresp", json);
    
    return res.json(json);
  } catch (err) {
    console.error('applepay/sessions err', err);
    return res.status(500).json({ error: 'internal' });
  }
});

app.get(
  '/.well-known/apple-developer-merchantid-domain-association',
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        'public',
        '.well-known',
        'apple-developer-merchantid-domain-association'
      )
    );
  }
);


// Send Apple Pay token to Adyen /payments (sandbox)
app.post('/api/adyen/payments', async (req, res) => {
  if (!ADYEN_API_KEY) return res.status(500).json({ error: 'ADYEN_API_KEY not configured' });
  const { paymentData, amount } = req.body || {};
  if (!paymentData) return res.status(400).json({ error: 'paymentData required' });

  // Adyen expects applePayToken as base64 encoded JSON
  const applePayTokenBase64 = Buffer.from(JSON.stringify(paymentData)).toString('base64');

  const payload = {
    amount: amount || { currency: 'EUR', value: 1000 },
    paymentMethod: { type: 'applepay' },
    applePayToken: applePayTokenBase64,
    reference: `ORDER-${Date.now()}`,
    merchantAccount: ADYEN_MERCHANT_ACCOUNT
  };

  try {
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
    console.error('adyen payments error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Serve SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
