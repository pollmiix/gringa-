'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/checkout.js');
const productId = 'rosalind-contrast-vintage-effect-brown-leather-ballet-flats';
const item = { id: productId, size: '38', quantity: 2 };
const requestId = '12345678-1234-4234-8234-123456789012';
const origin = 'https://gringa-olive.vercel.app';

async function call(overrides = {}) {
  const req = { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: { items: [item], requestId }, ...overrides };
  const res = { headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await handler(req, res);
  return res;
}

test('checkout validation and Stripe boundary', async t => {
  const oldKey = process.env.STRIPE_SECRET_KEY;
  const oldSite = process.env.SITE_URL;
  const oldFetch = global.fetch;
  process.env.SITE_URL = origin;
  t.after(() => {
    if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = oldKey;
    if (oldSite === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = oldSite;
    global.fetch = oldFetch;
  });

  await t.test('server uses catalog prices and ignores browser price and currency', () => {
    const lines = handler.lineItems([{ ...item, price: 0.01, currency: 'brl' }]);
    assert.equal(lines[0].amount, 11200);
    assert.equal(lines[0].currency, 'eur');
    assert.equal(lines[0].quantity, 2);
  });
  await t.test('rejects empty bags, unknown products, sizes, quantities and duplicates', () => {
    for (const items of [[], null, [{ ...item, id: 'missing' }], [{ ...item, size: '100' }], [{ ...item, quantity: 0 }], [{ ...item, quantity: 100 }], [{ ...item, quantity: 1.2 }], [item, item]]) {
      assert.throws(() => handler.lineItems(items));
    }
  });
  await t.test('does not call Stripe without a server key', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    global.fetch = () => { throw new Error('Stripe must not be called'); };
    assert.equal((await call()).code, 503);
  });
  process.env.STRIPE_SECRET_KEY = ['rk', 'test', 'placeholder'].join('_');
  await t.test('rejects foreign origins, malformed bodies and unsupported methods', async () => {
    global.fetch = () => { throw new Error('Stripe must not be called'); };
    assert.equal((await call({ headers: { origin: 'https://other.example', 'content-type': 'application/json' } })).code, 403);
    assert.equal((await call({ headers: { origin, 'content-type': 'text/plain' } })).code, 415);
    assert.equal((await call({ body: '{broken' })).code, 400);
    assert.equal((await call({ body: null })).code, 400);
    assert.equal((await call({ method: 'DELETE' })).code, 405);
    assert.equal((await call({ body: { items: [item], requestId: 'invalid' } })).code, 400);
  });
  await t.test('creates a hosted session with validated amounts, shipping and idempotency', async () => {
    let firstKey;
    let calls = 0;
    global.fetch = async (url, options) => {
      calls++;
      assert.equal(url, 'https://api.stripe.com/v1/checkout/sessions');
      assert.equal(options.method, 'POST');
      const params = new URLSearchParams(options.body);
      const methods = [...params].filter(([key]) => key.startsWith('payment_method_types')).map(([,value]) => value);
      assert.deepEqual(methods, ['card', 'link'], 'Only cards, their supported wallets, and Link are allowed; Pix and boleto must not be offered');
      assert.equal(params.get('line_items[0][price_data][unit_amount]'), '11200');
      assert.equal(params.get('line_items[0][quantity]'), '2');
      assert.equal(params.get('line_items[0][price_data][currency]'), 'eur');
      assert.equal(params.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '0');
      assert.equal(params.get('shipping_address_collection[allowed_countries][0]'), 'BR');
      assert.equal(params.get('success_url'), `${origin}/payment-result.html?session_id={CHECKOUT_SESSION_ID}`);
      assert.equal(params.get('line_items[0][price_data][product_data][metadata][size]'), '38');
      if (firstKey) assert.equal(options.headers['Idempotency-Key'], firstKey);
      firstKey = options.headers['Idempotency-Key'];
      return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/c/pay/example' }) };
    };
    const result = await call();
    assert.equal(result.code, 200);
    assert.deepEqual(result.data, { url: 'https://checkout.stripe.com/c/pay/example' });
    assert.equal(result.headers['Cache-Control'], 'no-store');
    await call();
    assert.equal(calls, 2);
  });
  await t.test('a browser success parameter is not proof of payment', async () => {
    global.fetch = async () => ({ ok: true, json: async () => ({ payment_status: 'unpaid', status: 'open' }) });
    const result = await call({ method: 'GET', query: { session_id: 'cs_test_example', paid: 'true' } });
    assert.equal(result.code, 200);
    assert.equal(result.data.paid, false);
    global.fetch = async () => ({ ok: true, json: async () => ({ payment_status: 'paid', status: 'complete' }) });
    assert.equal((await call({ method: 'GET', query: { session_id: 'cs_test_example' } })).data.paid, true);
    global.fetch = async () => ({ ok: true, json: async () => ({ payment_status: 'unpaid', status: 'complete' }) });
    assert.equal((await call({ method: 'GET', query: { session_id: 'cs_test_example' } })).data.paid, false, 'Completion of a delayed payment checkout is not confirmation of funds');
    assert.equal((await call({ method: 'GET', query: { session_id: '../bad' } })).code, 400);
  });
  await t.test('Stripe failures do not leak upstream details or the key', async () => {
    global.fetch = async () => ({ ok: false, json: async () => ({ error: { message: 'private upstream detail' } }) });
    const result = await call();
    assert.equal(result.code, 502);
    assert.doesNotMatch(JSON.stringify(result.data), /private upstream detail|placeholder/);
  });
});
