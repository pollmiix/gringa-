'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/checkout.js');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const productId = 'rosalind-contrast-vintage-effect-brown-leather-ballet-flats';
const item = { id: productId, size: '38', quantity: 2 };
const requestId = '12345678-1234-4234-8234-123456789012';
const origin = 'https://aloha-official.online';

test('store-wide reductions use cents, preserve original prices and agree with server prices', () => {
  const context = vm.createContext({ window: {} });
  for (const file of ['loja-config.js', 'catalog.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  }
  const pricing = context.window.StorePricing;
  const config = context.window.LOJA_CONFIG;
  const sample = { id: 'example', price: 100 };
  assert.equal(pricing.quote(sample).reducedCents, 7000);
  assert.equal(pricing.quote(sample).finalCents, 6300);
  assert.equal(pricing.quote(sample).finalCents, 6300, 'Reloading or quoting twice must not apply discounts again');
  assert.equal(sample.price, 100);
  assert.equal(pricing.quote({ id: 'bag', price: 295 }).finalCents, 18585);
  assert.equal(pricing.quote({ id: 'rounding', price: 19.99 }).finalCents, 1259);
  assert.equal(pricing.quote({ id: 'invalid', price: null }), null);
  config.precos.example = 200;
  assert.equal(pricing.quote(sample).finalCents, 12600, 'Custom product prices also receive both reductions');
  delete config.precos.example;
  for (const product of context.window.STORE_PRODUCTS) {
    const expected = pricing.quote(product);
    if (!expected) continue;
    const size = product.sizes?.[0] || 'One size';
    assert.equal(handler.lineItems([{ id: product.id, size, quantity: 3 }])[0].amount, expected.finalCents, product.id);
  }
});

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
    assert.equal(lines[0].amount, 7056);
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
    assert.equal((await call({ headers: { origin: `${origin}.other.example`, 'content-type': 'application/json' } })).code, 403);
    assert.equal((await call({ headers: { 'content-type': 'application/json' } })).code, 403);
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
      assert.deepEqual(methods, [], 'Current Stripe API rejects payment_method_types; use the methods enabled in the Dashboard');
      assert.equal(params.get('line_items[0][price_data][unit_amount]'), '7056');
      assert.equal(params.get('line_items[0][quantity]'), '2');
      assert.equal(params.get('line_items[0][price_data][currency]'), 'eur');
      assert.equal(params.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '0');
      assert.equal(params.get('shipping_address_collection[allowed_countries][0]'), 'US');
      assert.equal(params.get('shipping_address_collection[allowed_countries][1]'), null, 'Only the merchant-confirmed destination may be offered');
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
  await t.test('domain migration keeps return URLs on the trusted requesting domain despite an old SITE_URL', async () => {
    const previous = 'https://gringa-olive.vercel.app';
    process.env.SITE_URL = previous;
    try {
      for (const requestingOrigin of [origin, previous]) {
        global.fetch = async (url, options) => {
          const params = new URLSearchParams(options.body);
          assert.equal(params.get('success_url'), `${requestingOrigin}/payment-result.html?session_id={CHECKOUT_SESSION_ID}`);
          assert.equal(params.get('cancel_url'), `${requestingOrigin}/checkout.html?payment=cancelled`);
          return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/c/pay/example' }) };
        };
        assert.equal((await call({ headers: { origin: requestingOrigin, 'content-type': 'application/json' } })).code, 200);
      }
    } finally { process.env.SITE_URL = origin; }
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
  await t.test('distinguishes authentication, permissions and invalid configuration without exposing Stripe messages', async () => {
    for (const [status, code] of [[401, 'PAYMENT_AUTH'], [403, 'PAYMENT_PERMISSIONS'], [400, 'PAYMENT_CONFIGURATION']]) {
      global.fetch = async () => ({ ok: false, status, headers: { get: () => 'req_example' }, json: async () => ({ error: { code: 'example_code', param: 'shipping_options[0]', message: 'private credential details' } }) });
      const result = await call();
      assert.equal(result.code, 502);
      assert.equal(result.data.code, code);
      assert.equal(result.data.requestId, 'req_example');
      assert.equal(result.data.parameter, 'shipping_options[0]');
      assert.doesNotMatch(JSON.stringify(result.data), /private credential details|placeholder/);
    }
  });
});
