'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadStore, createFeed, xml } = require('../scripts/build-merchant-feed.cjs');
const checkout = require('../api/checkout.js');
const store = loadStore();

test('feed covers every catalogue product and size with genuine manufacturer identifiers and all gallery photos', () => {
  const result = createFeed(store);
  const entries = [...result.output.matchAll(/<item>(.*?)<\/item>/gs)].map(match => match[1]);
  const expected = store.STORE_PRODUCTS.reduce((count, product) => count + Math.max(1, product.sizes.length), 0);
  assert.equal(result.products, store.STORE_PRODUCTS.length);
  assert.equal(entries.length, expected);
  assert.equal(entries.length, result.variants);
  let offset = 0;
  const ids = new Set();
  for (const product of store.STORE_PRODUCTS) {
    const sizes = product.sizes.length ? product.sizes : [''];
    for (const size of sizes) {
      const entry = entries[offset++];
      const value = name => entry.match(new RegExp(`<g:${name}>(.*?)</g:${name}>`, 's'))?.[1];
      assert.ok(value('id').length <= 50);
      assert.ok(!ids.has(value('id')));
      ids.add(value('id'));
      assert.equal(value('brand'), 'ALOHAS', 'Aloha is the retailer, not the product manufacturer');
      const variant = store.MERCHANT_PRODUCT_DATA[product.id].variants[size];
      assert.equal(value('mpn'), variant?.mpn || undefined);
      assert.equal(value('gtin'), undefined, 'Missing barcodes must not be fabricated');
      assert.equal(value('identifier_exists'), undefined, 'Missing GTIN does not mean no GTIN exists');
      assert.ok(value('link').startsWith('https://aloha-official.online/product.html?'));
      assert.ok(value('link').includes(`product=${product.id}`));
      if (size) assert.ok(value('link').includes(`&amp;size=${encodeURIComponent(size)}`));
      const photos = store.PRODUCT_GALLERIES[product.id];
      assert.equal(value('image_link'), `https://aloha-official.online/${photos[0].src}`);
      assert.equal((entry.match(/<g:additional_image_link>/g) || []).length, photos.length - 1);
      assert.equal(value('content'), xml(store.StoreDescriptions.describe(product)));
      assert.equal(value('digital_source_type'), 'trained_algorithmic_media');
      const current = value('sale_price') || value('price');
      const amount = Number(current.split(' ')[0]);
      const line = checkout.lineItems([{ id: product.id, size: size || 'One size', quantity: 1 }])[0];
      assert.equal(Math.round(amount * 100), line.amount, `${product.id}: feed and checkout must agree`);
      assert.equal(current.split(' ')[1], 'EUR');
      assert.equal(value('availability'), 'in_stock');
    }
  }
  assert.equal(result.images, 1737);
  assert.equal(result.warnings.filter(warning => warning.includes('gender not provided')).length, 4);
  assert.ok(result.warnings.some(warning => warning.includes('US price rules')));
});

test('feed rebuilds current prices and stock rather than freezing submitted values', () => {
  const isolated = loadStore();
  isolated.LOJA_CONFIG.precos[isolated.STORE_PRODUCTS[0].id] = 100;
  isolated.LOJA_CONFIG.estoqueConfirmado = false;
  const output = createFeed(isolated).output;
  const first = output.match(/<item>(.*?)<\/item>/s)[1];
  assert.match(first, /<g:price>70\.00 EUR<\/g:price>/);
  assert.match(first, /<g:sale_price>63\.00 EUR<\/g:sale_price>/);
  assert.match(first, /<g:availability>out_of_stock<\/g:availability>/);
});

test('XML escapes merchant text and URLs without allowing markup injection', () => {
  assert.equal(xml('Bag & shoe <new> "one"'), 'Bag &amp; shoe &lt;new&gt; &quot;one&quot;');
  assert.equal(xml('unsafe\u0001value'), 'unsafevalue');
});
