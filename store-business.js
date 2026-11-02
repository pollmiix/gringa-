(() => {
  'use strict';
  const config = window.LOJA_CONFIG;
  if (!config?.empresa) return;
  const base = config.siteUrl || 'https://aloha-official.online';
  const company = config.empresa;
  const returns = {
    '@type': 'MerchantReturnPolicy', '@id': `${base}/#return-policy`,
    applicableCountry: 'US', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 7, returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn', refundType: 'https://schema.org/FullRefund',
    merchantReturnLink: `${base}/trocas-devolucoes.html`
  };
  const organization = {
    '@context': 'https://schema.org', '@type': 'OnlineStore', '@id': `${base}/#store`,
    name: config.nome, legalName: company.razaoSocial, taxID: company.cnpj,
    url: base, email: company.email, telephone: company.telefoneInternacional,
    address: { '@type': 'PostalAddress', streetAddress: 'Avenida Brasil, 1271, Sala Le 35 Piso Estaleiro, Centro',
      addressLocality: 'Balneário Camboriú', addressRegion: 'SC', postalCode: '88330-900', addressCountry: 'BR' },
    hasMerchantReturnPolicy: returns
  };
  function structured(id, value) {
    const element = document.createElement('script');
    element.type = 'application/ld+json'; element.id = id;
    element.textContent = JSON.stringify(value); document.head.append(element);
  }
  structured('store-identity', organization);
  const id = new URLSearchParams(location.search).get('product');
  const product = window.STORE_PRODUCTS?.find(item => item.id === id);
  const quote = product && window.StorePricing?.quote(product);
  if (product && quote) {
    const url = `${base}/product.html?product=${encodeURIComponent(product.id)}`;
    const canonical = document.createElement('link'); canonical.rel = 'canonical'; canonical.href = url; document.head.append(canonical);
    structured('product-offer', {
      '@context': 'https://schema.org', '@type': 'Product', name: product.name,
      image: (window.PRODUCT_GALLERIES?.[product.id] || [{src:product.image}]).map(photo => `${base}/${photo.src}`), description: window.StoreDescriptions?.describe(product) || product.name,
      sku: product.id, category: product.category, url,
      offers: { '@type': 'Offer', url, price: (quote.finalCents / 100).toFixed(2),
        priceCurrency: config.moeda || 'EUR', itemCondition: 'https://schema.org/NewCondition',
        availability: config.estoqueConfirmado ? 'https://schema.org/InStock' : window.StoreAvailability.isPreorder(product.id) ? 'https://schema.org/PreOrder' : 'https://schema.org/OutOfStock',
        seller: { '@id': `${base}/#store` }, hasMerchantReturnPolicy: returns }
    });
  }
})();
