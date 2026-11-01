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
  // Set your own prices by product handle. Example:
  // 'aven-black-leather-loafers': 160
  precos: {}
};
