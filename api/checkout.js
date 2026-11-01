'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

// Read only trusted, deployed files; never evaluate data sent by a visitor.
const context = vm.createContext({ window: {} });
for (const file of ['catalog.js', 'loja-config.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { timeout: 1000 });
}
const config = context.window.LOJA_CONFIG;
const products = new Map(context.window.STORE_PRODUCTS.map(product => [product.id, product]));
const reply = (res, status, data) => res.status(status).json(data);

function lineItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 50) throw new Error('Invalid shopping bag.');
  const currency = String(config.moeda || 'EUR').toLowerCase();
  if (!['eur', 'brl', 'usd', 'gbp', 'cad', 'aud'].includes(currency)) throw new Error('Currency is not configured.');
  const seen = new Set();
  return items.map(item => {
    const product = products.get(item?.id);
    const sizes = product?.sizes?.length ? product.sizes : ['One size'];
    if (!product || !sizes.includes(item.size) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw new Error('A product, size or quantity is invalid. Please update your bag.');
    }
    const identity = `${item.id}|${item.size}`;
    if (seen.has(identity)) throw new Error('Duplicate shopping bag item.');
    seen.add(identity);
    const custom = config.precos?.[product.id];
    const price = typeof custom === 'number' && Number.isFinite(custom) && custom > 0 ? custom :
      config.usarPrecosImportados && currency === 'eur' ? product.price : null;
    const amount = Math.round(price * 100);
    if (typeof price !== 'number' || !Number.isFinite(price) || !Number.isSafeInteger(amount) || amount < 1 || amount > 99999999) {
      throw new Error('This product has no confirmed price. Please contact the store.');
    }
    return { id: product.id, size: item.size, name: `${product.name} - Size ${item.size}`, quantity: item.quantity, amount, currency };
  });
}

async function stripeRequest(route, key, options = {}) {
  const response = await fetch(`https://api.stripe.com/v1/${route}`, {
    ...options,
    headers: { Authorization: `Bearer ${key}`, ...options.headers },
    signal: AbortSignal.timeout(20000)
  });
  const result = await response.json();
  if (!response.ok) throw new Error('Stripe request failed.');
  return result;
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['POST', 'GET'].includes(req.method)) {
    res.setHeader('Allow', 'POST, GET');
    return reply(res, 405, { error: 'Method not allowed.' });
  }
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]+$/.test(key)) {
    return reply(res, 503, { error: 'Payments are not available yet. Please try again later.' });
  }
  const site = process.env.SITE_URL || 'https://gringa-olive.vercel.app';
  let origin;
  try {
    const url = new URL(site);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    origin = url.origin;
  } catch { return reply(res, 503, { error: 'Payments are not available yet.' }); }

  if (req.method === 'GET') {
    const sessionId = req.query?.session_id;
    if (typeof sessionId !== 'string' || !/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) {
      return reply(res, 400, { error: 'Invalid payment reference.' });
    }
    try {
      const session = await stripeRequest(`checkout/sessions/${encodeURIComponent(sessionId)}`, key);
      return reply(res, 200, { paid: session.payment_status === 'paid', status: session.status });
    } catch { return reply(res, 502, { error: 'Unable to confirm payment. Please try again.' }); }
  }

  if (req.headers.origin !== origin) return reply(res, 403, { error: 'Invalid request origin.' });
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    return reply(res, 415, { error: 'Expected JSON.' });
  }
  if (config.freteGratis !== true) return reply(res, 503, { error: 'Shipping is not configured yet.' });
  let body;
  let lines;
  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!raw || Buffer.byteLength(raw) > 20000) throw new Error('Invalid shopping bag.');
    body = JSON.parse(raw);
    if (!/^[a-f0-9-]{36}$/i.test(body.requestId || '')) throw new Error('Invalid payment request.');
    lines = lineItems(body.items);
  } catch (error) { return reply(res, 400, { error: error.message.startsWith('Unexpected') ? 'Invalid shopping bag.' : error.message }); }

  const params = new URLSearchParams({
    mode: 'payment',
    success_url: `${origin}/payment-result.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout.html?payment=cancelled`,
    billing_address_collection: 'required',
    'phone_number_collection[enabled]': 'true',
    'payment_method_types[0]': 'card',
    'metadata[store]': 'loja-gringa',
    'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': '0',
    'shipping_options[0][shipping_rate_data][fixed_amount][currency]': lines[0].currency,
    'shipping_options[0][shipping_rate_data][display_name]': 'Free shipping'
  });
  // Match the destination countries offered by the storefront.
  ['BR', 'US', 'GB', 'CA', 'PT', 'ES', 'FR', 'DE', 'IT', 'AU'].forEach((country, index) => {
    params.set(`shipping_address_collection[allowed_countries][${index}]`, country);
  });
  lines.forEach((line, index) => {
    const prefix = `line_items[${index}]`;
    params.set(`${prefix}[quantity]`, String(line.quantity));
    params.set(`${prefix}[price_data][currency]`, line.currency);
    params.set(`${prefix}[price_data][unit_amount]`, String(line.amount));
    params.set(`${prefix}[price_data][product_data][name]`, line.name);
    params.set(`${prefix}[price_data][product_data][metadata][product_id]`, line.id);
    params.set(`${prefix}[price_data][product_data][metadata][size]`, line.size);
  });
  try {
    const hash = createHash('sha256').update(params.toString()).digest('hex');
    const session = await stripeRequest('checkout/sessions', key, {
      method: 'POST', body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `${body.requestId}-${hash}` }
    });
    if (!session.url || new URL(session.url).origin !== 'https://checkout.stripe.com') throw new Error();
    return reply(res, 200, { url: session.url });
  } catch { return reply(res, 502, { error: 'Unable to open secure payment. Please try again later.' }); }
}

module.exports = handler;
module.exports.lineItems = lineItems;
