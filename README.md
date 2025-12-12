# Adyen Apple Pay Drop-in - Render Ready Example (Full)

IMPORTANT: Apple requires each merchant to own and verify their **own Apple Merchant ID and domain association file**.
You cannot reuse or copy Adyen's merchant-id file. This sample uses Adyen-managed certificates for processing (Adyen
decrypts tokens), but you must supply your own Apple Merchant ID and host the `apple-developer-merchantid-domain-association`
file on your domain under `/.well-known/`. Adyen must also enable your Apple Merchant ID on your Adyen merchant account.

## What this repo contains
- `index.js` - Node/Express backend with:
  - `POST /api/adyen/applepay/sessions`  -> calls Adyen `/applePay/sessions` to obtain Apple merchant session (Adyen-managed cert)
  - `POST /api/adyen/payments` -> calls Adyen `/payments` with Apple Pay token (Adyen processes)
- `public/` - frontend:
  - `index.html` - demo page with "Pay with Apple Pay" button (works in Safari on iPhone)
  - `applepay.js` - wiring ApplePaySession to backend endpoints
- `public/.well-known/apple-developer-merchantid-domain-association` - placeholder (REPLACE with Apple-provided file)
- `Dockerfile`, `render.yaml`, `.env.example`, `package.json`

## High-level prerequisites (what you must prepare before running)
1. **Apple Developer (merchant setup)**
   - An Apple Developer account (team).
   - Create a Merchant ID (Identifiers → Merchant IDs) e.g. `merchant.com.yourorg.pay`.
   - Under that Merchant ID, add your domain (e.g. `yourdomain.com` or `yourapp.onrender.com`).
   - Download the `apple-developer-merchantid-domain-association` file provided by Apple.
   - Host the downloaded file at:
     ```
     https://<your-domain>/.well-known/apple-developer-merchantid-domain-association
     ```
   - In Apple Developer, verify the domain for the Merchant ID (Apple will fetch the file).

2. **Adyen (Sandbox / Test)**
   - An Adyen account (sandbox).
   - Ensure Apple Pay is enabled for your **Adyen merchant account**. You may need to contact Adyen support and request enabling Apple Pay for your merchantAccount and provide your Apple Merchant ID.
   - Create an API key with Checkout permissions and note:
     - `ADYEN_API_KEY` (keep secret)
     - `ADYEN_MERCHANT_ACCOUNT` (your Adyen merchant account name)

3. **Domain & HTTPS**
   - Apple Pay on the web requires HTTPS. For local testing use `ngrok` (HTTPS tunnel) and register the ngrok host in Apple Developer and Adyen.
   - For Render deployment, use the Render-provided hostname (e.g., `myapp.onrender.com`) and register that exact hostname with Apple (Merchant Domains) and Adyen (Apple Pay domains) and provide the association file on that domain.

4. **Environment variables required**
   - `ADYEN_API_KEY` - Adyen API key (test).
   - `ADYEN_MERCHANT_ACCOUNT` - Adyen merchant account.
   - `APPLE_MERCHANT_ID` - Your Apple Merchant ID (e.g., merchant.com.yourorg.pay).
   - `DOMAIN_NAME` - The public domain name where the app is hosted (e.g., myapp.onrender.com). Must match the hosted association file.
   - `ADYEN_CHECKOUT_BASE` - Optional; default `https://checkout-test.adyen.com/v67`.

## Local quick-start (development with ngrok)
1. Copy `.env.example` → `.env` and fill in values.
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Start server:
   ```bash
   npm start
   ```
4. Expose to HTTPS using ngrok:
   ```bash
   ngrok http 3000
   ```
   Note the HTTPS forwarding host (e.g., `abcd-1234.ngrok.io`) and:
   - Add that hostname to Apple Developer Merchant ID → Merchant Domains.
   - Upload the Apple association file to `https://abcd-1234.ngrok.io/.well-known/apple-developer-merchantid-domain-association`.
   - In Adyen Customer Area, add the hostname as an Apple Pay domain (if required).
5. Open the HTTPS URL in Safari on your iPhone and click **Pay with Apple Pay**.

## Deploy to Render
1. Push the repository to GitHub.
2. Create a Web Service on Render, connect to the repo.
3. Set the environment variables in Render:
   - `ADYEN_API_KEY`, `ADYEN_MERCHANT_ACCOUNT`, `APPLE_MERCHANT_ID`, `DOMAIN_NAME`
4. Deploy. Once live, add the Render hostname (e.g., `yourapp.onrender.com`) to Apple Merchant Domains and host the association file there. Also ensure Adyen has been told to enable Apple Pay for your merchantAccount + merchantId.

## Security notes
- Do NOT commit actual API keys or the Apple merchant identity `.p12` into the repository.
- For production, use a stable domain and follow Adyen's production onboarding.

## Support request template for Adyen
```
Please enable Apple Pay for merchantAccount: <YOUR_ADYEN_MERCHANT_ACCOUNT>
Our Apple Merchant ID: <merchant.com.yourorg.pay>
Our domain: <your-domain.com>
Please link and enable Web Apple Pay sessions for this merchantAccount.
```
