(() => {
  'use strict';
  const facts = window.MERCHANT_PRODUCT_DATA || {};
  const details = window.PRODUCT_DETAILS || {};
  const clean = value => typeof value === 'string' && !['not set', 'others'].includes(value.toLowerCase()) ? value.trim() : '';
  const capitalize = value => value.charAt(0).toUpperCase() + value.slice(1);
  function describe(product) {
    const info = facts[product.id] || {};
    const detail = details[product.id] || {};
    const parts = [`${product.name}.`];
    if (info.summary && info.summary.toLowerCase().replace(/\.$/, '') !== product.name.toLowerCase()) parts.push(info.summary.replace(/\.?$/, '.'));
    parts.push(`Product type: ${product.category}.`);
    if (clean(info.brand)) parts.push(`Brand: ${info.brand}.`);
    if (clean(detail.colour)) parts.push(`Colour: ${detail.colour}.`);
    const material = clean(info.material) || clean(detail.material);
    if (material) parts.push(`Material: ${material}.`);
    if (clean(info.pattern)) parts.push(`Pattern: ${info.pattern}.`);
    if (clean(detail.heel) && /^\d+(\.\d+)?$/.test(detail.heel)) parts.push(`Heel height: ${detail.heel} cm.`);
    if (clean(detail.fit)) parts.push(`Fit guidance: ${detail.fit}.`);
    if (clean(detail.origin)) parts.push(`Made in ${capitalize(detail.origin)}.`);
    if (product.sizes?.length) parts.push(`Available sizes: ${product.sizes.map(size => size === 'U' ? 'one size' : size).join(', ')}${product.sizes.every(size => /^\d+$/.test(size)) ? ' (EU)' : ''}.`);
    return parts.join(' ');
  }
  window.StoreDescriptions = Object.freeze({ describe });
})();
