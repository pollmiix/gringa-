'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
function loadStore(root = ROOT) {
  const context = vm.createContext({ window: {} });
  for (const file of ['loja-config.js', 'catalog.js', 'product-data.js', 'gallery.js', 'merchant-data.js', 'product-descriptions.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { timeout: 1000 });
  }
  return context.window;
}
const xml = value => String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
const tag = (name, value) => value === undefined || value === null || value === '' ? '' : `<g:${name}>${xml(value)}</g:${name}>`;
const valid = value => value && !['not set', 'others'].includes(value.toLowerCase()) ? value : '';
function createFeed(store, root = ROOT) {
  const config = store.LOJA_CONFIG;
  const base = new URL(config.siteUrl);
  if (base.protocol !== 'https:') throw new Error('The feed needs an HTTPS store URL.');
  const currency = config.moeda;
  const categories = { Bags: '3032', 'Gift Card': '53', 'Other Accessories': '200', Charms: '175', Trousers: '204', Skirts: '1581', Vests: '1831', Blazers: '5598', Shirts: '212' };
  const footwear = new Set(['Ballet Flats', 'Ankle Boots', 'Boots', 'Sneakers', 'Pumps', 'Oxfords', 'Loafers', 'Sandals']);
  const money = cents => `${(cents / 100).toFixed(2)} ${currency}`;
  const entries = [];
  const warnings = [];
  const imagePaths = new Set();
  const ids = new Set();
  for (const product of store.STORE_PRODUCTS) {
    const facts = store.MERCHANT_PRODUCT_DATA[product.id];
    const details = store.PRODUCT_DETAILS[product.id] || {};
    const quote = store.StorePricing.quote(product);
    if (!facts || !quote) throw new Error(`Incomplete catalogue entry: ${product.id}`);
    if (!facts.gender && product.category !== 'Gift Card') warnings.push(`${product.id}: gender not provided; omitted rather than guessed.`);
    const photos = [...new Set((store.PRODUCT_GALLERIES[product.id] || []).map(photo => photo.src))];
    if (!photos.length) photos.push(product.image);
    for (const photo of photos) {
      if (!fs.existsSync(path.join(root, photo))) throw new Error(`Missing image: ${photo}`);
      imagePaths.add(photo);
    }
    const sizes = product.sizes.length ? product.sizes : [''];
    const description = store.StoreDescriptions.describe(product);
    if (!description || description.length > 5000) throw new Error(`Invalid description: ${product.id}`);
    for (const size of sizes) {
      const variant = facts.variants[size] || {};
      const id = variant.id ? `v-${variant.id}` : `p-${product.sourceId}`;
      if (ids.has(id) || id.length > 50) throw new Error(`Duplicate or invalid item ID: ${id}`);
      ids.add(id);
      const link = new URL('product.html', base);
      link.searchParams.set('product', product.id);
      if (size) link.searchParams.set('size', size);
      const title = `${product.name}${size && size !== 'U' ? ` - ${footwear.has(product.category) ? 'EU ' : ''}${size}` : ''}`;
      if (title.length > 150) throw new Error(`Title too long: ${id}`);
      let entry = tag('id', id) + tag('title', title);
      entry += `<g:structured_description>${tag('digital_source_type', 'trained_algorithmic_media')}${tag('content', description)}</g:structured_description>`;
      entry += tag('link', link.href) + tag('image_link', new URL(photos[0], base).href);
      entry += photos.slice(1, 11).map(photo => tag('additional_image_link', new URL(photo, base).href)).join('');
      entry += tag('availability', config.estoqueConfirmado ? 'in_stock' : 'out_of_stock') + tag('condition', 'new');
      entry += tag('price', money(quote.reducedCents));
      if (quote.finalCents < quote.reducedCents) entry += tag('sale_price', money(quote.finalCents));
      entry += tag('brand', facts.brand) + tag('mpn', variant.mpn);
      // Absence of a barcode in the source does not mean the manufacturer has
      // not assigned one. Never fabricate a GTIN or set identifier_exists=no.
      if (variant.gtin) entry += tag('gtin', variant.gtin);
      entry += tag('google_product_category', categories[product.category] || (footwear.has(product.category) ? '187' : '166'));
      entry += tag('product_type', `${product.category === 'Gift Card' ? 'Gift cards' : 'Apparel & Accessories'} > ${product.category}`);
      if (sizes.length > 1) entry += tag('item_group_id', `p-${product.sourceId}`);
      entry += tag('size', size === 'U' ? 'one size' : size);
      if (footwear.has(product.category)) entry += tag('size_system', 'EU');
      entry += tag('color', valid(details.colour)) + tag('material', valid(facts.material) || valid(details.material));
      entry += tag('gender', facts.gender) + tag('age_group', facts.ageGroup) + tag('pattern', facts.pattern);
      for (const country of config.entrega.paises) {
        entry += `<g:shipping>${tag('country', country)}${tag('service', 'Free standard shipping')}${tag('price', money(0))}</g:shipping>`;
      }
      entries.push(`<item>${entry}</item>`);
    }
  }
  warnings.push('GTIN/EAN barcodes are absent from the source catalogue. Obtain genuine manufacturer codes when assigned.');
  if (config.impostosIncluidos && config.entrega.paises.includes('US')) warnings.push('US price rules exclude taxes from feed prices. The store currently includes taxes/import charges and provides no tax breakdown; resolve the tax treatment before advertising. Prices have not been silently changed.');
  warnings.push('The ALOHAS gift card is included as requested. Confirm redemption rights, delivery and value before advertising it.');
  const output = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${xml(config.nome)} product catalogue</title><link>${xml(base.href)}</link><description>Product data for the United States, in English. Prices in ${xml(currency)}.</description>\n${entries.join('\n')}\n</channel></rss>\n`;
  return { output, products: store.STORE_PRODUCTS.length, variants: entries.length, images: imagePaths.size, warnings };
}
if (require.main === module) {
  const result = createFeed(loadStore());
  fs.writeFileSync(path.join(ROOT, 'google-products.xml'), result.output);
  console.log(`Feed: ${result.products} products, ${result.variants} variants, ${result.images} product photos.`);
  for (const warning of result.warnings) console.warn(`Merchant review: ${warning}`);
}
module.exports = { loadStore, createFeed, xml };
