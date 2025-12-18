async function log(msg) {
  const el = document.getElementById('log');
  el.textContent = el.textContent + '\n' + msg;
  console.log(msg);
}

document.getElementById('apple-pay-btn').addEventListener('click', async () => {
  try {
    if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
      await log('Apple Pay not available. Open this page in Safari on iPhone with Wallet configured.');
      alert('Apple Pay not available. Use Safari on an iPhone.');
      return;
    }

    const paymentRequest = {
      countryCode: 'US',
      currencyCode: 'EUR',
      total: { label: 'Demo Store', amount: '10.00' },
      supportedNetworks: ['visa', 'masterCard', 'amex'],
      merchantCapabilities: ['supports3DS']
    };

    const session = new ApplePaySession(3, paymentRequest);

    session.onvalidatemerchant = async (event) => {
      await log('onvalidatemerchant triggered. Requesting merchant session from backend...');
      const origin = window.location.origin;
      const resp = await fetch('/api/adyen/applepay/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, domainName: window.location.hostname, displayName: 'OneBill Store', amount: { currency: 'EUR', value: 1000 }})
      });
      if (!resp.ok) {
        const txt = await resp.text();
        await log('Failed to get merchant session: ' + txt);
        session.abort();
        return;
      }
      const sessionData = await resp.json();
      await log('Received merchant session. Completing merchant validation.');
      session.completeMerchantValidation(sessionData);
    };

    session.onpaymentauthorized = async (event) => {
      await log('Payment authorized by device. Sending token to backend...');
      const payment = event.payment;
      const paymentData = payment.token ? payment.token.paymentData : payment.paymentData;

      const resp = await fetch('/api/adyen/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentData, amount: { currency: 'EUR', value: 1000 } })
      });
      const result = await resp.json();
      await log('Adyen response: ' + JSON.stringify(result));
      const success = result && result.resultCode && result.resultCode.toLowerCase() === 'authorised';
      if (success) {
        session.completePayment(ApplePaySession.STATUS_SUCCESS);
        await log('Payment succeeded (sandbox).');
        alert('Payment succeeded (sandbox)');
      } else {
        session.completePayment(ApplePaySession.STATUS_FAILURE);
        await log('Payment failed. See server/console logs for details.');
        alert('Payment failed. Check logs.');
      }
    };

    session.begin();
  } catch (err) {
    console.error(err);
    alert('Error starting Apple Pay: ' + (err && err.message));
  }
});
