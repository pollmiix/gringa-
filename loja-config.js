
// Store identity. All storefront files and product images use local paths.
window.LOJA_CONFIG = {
  nome: 'YOUR STORE',
  // Optional contact number with country code; digits only.
  whatsapp: '',
  // Public Stripe key. Checkout still requires a server integration.
  // Never add a secret key (sk_...) to this public file.
  stripeChavePublicavel: 'pk_live_51UX118C3b4QRgsFmqQUGWaopd9AN0XfiaXXsEowbZtZMogLQkLkyTOA5w0HykBTBRgGKVdbJ2PCwgnBZaPohxxK400ZxKv0GCX',
  // Set true only if your store offers free shipping.
  freteGratis: true,
  freteDescricao: 'Free Shipping Worldwide - DHL - 1–3 Business Days',
  // Imported prices use EUR. Changing this code does not convert prices.
  moeda: 'EUR',
  usarPrecosImportados: true,
  reducaoPrecosPercentual: 30,
  descontoAdicionalPercentual: 10,
  // Set your own prices by product handle. Example:
  // 'aven-black-leather-loafers': 160
  precos: {}
};

// One pricing rule for the catalogue, cart and server. Round each step to cents.
window.StorePricing = (() => {
  const config = window.LOJA_CONFIG;
  function percentage(value) {
    const amount = value === undefined ? 0 : value;
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount >= 100) throw new Error('Invalid discount configuration.');
    return amount;
  }
  function quote(product) {
    const custom = config.precos?.[product?.id];
    const base = typeof custom === 'number' && Number.isFinite(custom) && custom > 0 ? custom :
      config.usarPrecosImportados && (config.moeda || 'EUR') === 'EUR' ? product?.price : null;
    if (typeof base !== 'number' || !Number.isFinite(base) || base <= 0) return null;
    const originalCents = Math.round(base * 100);
    if (!Number.isSafeInteger(originalCents) || originalCents < 1) return null;
    const reducedCents = Math.round(originalCents * (100 - percentage(config.reducaoPrecosPercentual)) / 100);
    const finalCents = Math.round(reducedCents * (100 - percentage(config.descontoAdicionalPercentual)) / 100);
    if (finalCents < 1) return null;
    return { originalCents, reducedCents, finalCents };
  }
  function unitPrice(product) { const value = quote(product); return value ? value.finalCents / 100 : null; }
  function format(cents) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: config.moeda || 'EUR' }).format(cents / 100); }
  function render(element, product) {
    const value = quote(product);
    if (!value) { element.textContent = 'Price on request'; return; }
    element.classList.add('sale-price');
    const final = document.createElement('span'); final.textContent = format(value.finalCents);
    const children = [];
    if (value.reducedCents > value.finalCents) {
      const previous = document.createElement('s'); previous.textContent = format(value.reducedCents);
      previous.setAttribute('aria-label', 'Price before extra discount'); children.push(previous);
    }
    children.push(final);
    if (config.descontoAdicionalPercentual > 0) {
      const badge = document.createElement('small'); badge.textContent = `${config.descontoAdicionalPercentual}% OFF`; children.push(badge);
    }
    element.replaceChildren(...children);
  }
  return { quote, unitPrice, render };
})();
