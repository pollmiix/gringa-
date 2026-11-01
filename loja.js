'use strict';
const config = window.LOJA_CONFIG || {};
const products = Array.isArray(window.STORE_PRODUCTS) ? window.STORE_PRODUCTS : [];
const $ = selector => document.querySelector(selector);
const brand = config.nome || 'ALOHAS';
if (config.reducaoPrecosPercentual > 0 && config.descontoAdicionalPercentual > 0) {
  $('.announcement').textContent = `Prices reduced by ${config.reducaoPrecosPercentual}% + extra ${config.descontoAdicionalPercentual}% off. Applied automatically.`;
}
document.querySelectorAll('[data-brand]').forEach(el => { el.textContent = brand; });
document.title = `All products | ${brand}`;
$('#year').textContent = new Date().getFullYear();
const productRows = 7;
function productPageSize() {
  const columns = matchMedia('(max-width: 600px)').matches ? 2 : matchMedia('(max-width: 900px)').matches ? 3 : 4;
  return productRows * columns;
}
let pageSize = productPageSize();
let visibleCount = pageSize;
let filtered = [];
const collections = Array.isArray(window.STORE_COLLECTIONS) ? window.STORE_COLLECTIONS : [];
const categories = [...new Set([...collections.map(c => c.name), ...products.map(p => p.category).sort((a,b) => a.localeCompare(b,'en'))])];
const collectionMembers = new Map(collections.map(c => [c.name,new Set(c.productIds)]));
function collectionLink(collection, className) {
  const link = document.createElement('a');
  link.href = `./index.html?collection=${encodeURIComponent(collection.slug)}#colecao`;
  link.dataset.categoryLink = collection.slug;
  if (className) link.className = className;
  return link;
}
if (collections.length) {
  const cards = document.querySelector('.category-cards');
  const nav = document.querySelector('#menu-dialog nav');
  const filters = document.querySelector('.filters');
  cards.replaceChildren();
  nav.querySelectorAll('[data-category-link]:not([data-category-link="all"])').forEach(link => link.remove());
  filters.querySelectorAll('[data-filter]:not([data-filter="all"])').forEach(button => button.remove());
  collections.forEach(collection => {
    const card = collectionLink(collection,'category-card');
    const image = document.createElement('img'); image.src = `./${collection.image}`; image.alt = collection.alt; image.width = 600; image.height = 800; image.loading = 'lazy';
    const label = document.createElement('span'); label.textContent = collection.name;
    card.append(image,label); cards.append(card);
    const navLink = collectionLink(collection); navLink.textContent = collection.name; nav.append(navLink);
    const filter = document.createElement('button'); filter.type = 'button'; filter.dataset.filter = collection.name.toLowerCase(); filter.setAttribute('aria-pressed','false'); filter.textContent = collection.name; filters.append(filter);
  });
}
const categoryTrack = $('#category-track');
function openHeaderDialog(dialog, trigger) {
  dialog.showModal();
  document.body.classList.add('modal-open');
  dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); trigger.focus(); }, {once:true});
}
$('.menu-toggle').addEventListener('click', event => openHeaderDialog($('#menu-dialog'),event.currentTarget));
const headerPanels = {
  profile: {title:'Your profile',copy:'Customer accounts are not available yet.'},
  wishlist: {title:'Your wishlist',copy:'You have no saved items yet.'},
  bag: {title:'Your bag',copy:'Your bag is empty. Online ordering is not available yet.'}
};
document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.panel === 'bag' && window.StoreCart) { window.StoreCart.open(button); return; }
  const panel = headerPanels[button.dataset.panel];
  $('#utility-title').textContent = panel.title; $('#utility-copy').textContent = panel.copy;
  if (button.dataset.panel === 'wishlist') {
    try {
      const saved = JSON.parse(localStorage.getItem('store-wishlist') || '[]');
      const entries = Array.isArray(saved) ? saved.map(id => products.find(product => product.id === id)).filter(Boolean) : [];
      if (entries.length) {
        const list = document.createElement('div'); list.className = 'saved-list';
        entries.forEach(product => { const link = document.createElement('a'); link.href = `./product.html?product=${encodeURIComponent(product.id)}`; const img = document.createElement('img'); img.src = `./${product.image}`; img.alt = ''; link.append(img,document.createTextNode(product.name)); list.append(link); });
        $('#utility-copy').replaceChildren(list);
      }
    } catch {}
  }
  openHeaderDialog($('#utility-dialog'),button);
}));
document.querySelectorAll('#menu-dialog, #utility-dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); }
  });
});
$('#continue-shopping').addEventListener('click', () => $('#utility-dialog').close());
const footerInfo = {
  contact:{title:'Contact customer service',copy:'Customer service contact details will be available here soon.'},
  orders:{title:'Track my order',copy:'Order tracking is not available yet. Please contact customer service for assistance.'},
  returns:{title:'Returns & refunds',copy:'Please contact customer service for information about returns and refunds.'},
  stores:{title:'Our stores',copy:'Store locations and opening hours will be available here soon.'},
  privacy:{title:'Privacy Policy',copy:'Our privacy policy will be available here before newsletter registration and online ordering open.'},
  shipping:{title:'Shipping Policy',copy:'Shipping destinations, delivery times and charges will be available before online ordering opens.'},
  terms:{title:'Terms of Sale',copy:'Our terms of sale will be available here before online ordering opens.'},
  about:{title:'About us',copy:'Explore our collection of shoes, bags, clothing and accessories. Contact customer service to learn more.'},
  feedback:{title:'Share your feedback',copy:'Please contact customer service to share your feedback about your shopping experience.'}
};
document.querySelectorAll('[data-footer-info]').forEach(button => button.addEventListener('click', () => {
  const panel = footerInfo[button.dataset.footerInfo];
  $('#utility-title').textContent = panel.title; $('#utility-copy').textContent = panel.copy;
  const phone = String(config.whatsapp || '').replace(/\D/g,'');
  if (button.dataset.footerInfo === 'contact' && phone) {
    const link = document.createElement('a'); link.href = `https://wa.me/${phone}`; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Contact us on WhatsApp';
    $('#utility-copy').replaceChildren(link);
  }
  openHeaderDialog($('#utility-dialog'),button);
}));
collections.forEach(collection => {
  const link = collectionLink(collection); link.textContent = collection.name; $('#footer-categories').append(link);
});
function updateNewsletterButton() {
  $('#newsletter-join').disabled = !$('#newsletter-email').validity.valid || !$('#newsletter-email').value.trim() || !$('#newsletter-consent').checked;
}
$('#newsletter-email').addEventListener('input',updateNewsletterButton);
$('#newsletter-consent').addEventListener('change',updateNewsletterButton);
$('#newsletter-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  $('#newsletter-status').hidden = false;
  $('#newsletter-status').textContent = 'Newsletter registration is not available yet. Please try again later.';
});
updateNewsletterButton();
const previousCategories = $('#categories-prev');
const nextCategories = $('#categories-next');
function updateCategoryArrows() {
  previousCategories.disabled = categoryTrack.scrollLeft <= 2;
  nextCategories.disabled = categoryTrack.scrollLeft + categoryTrack.clientWidth >= categoryTrack.scrollWidth - 2;
}
function scrollCategories(direction) {
  const firstCard = categoryTrack.querySelector('.category-card');
  const distance = firstCard ? firstCard.getBoundingClientRect().width + (parseFloat(getComputedStyle(categoryTrack).gap) || 0) : categoryTrack.clientWidth;
  categoryTrack.scrollBy({left:direction * distance, behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
}
previousCategories.addEventListener('click', () => scrollCategories(-1));
nextCategories.addEventListener('click', () => scrollCategories(1));
categoryTrack.addEventListener('scroll', updateCategoryArrows, {passive:true});
categoryTrack.addEventListener('keydown', event => {
  if (event.target === categoryTrack && ['ArrowLeft','ArrowRight'].includes(event.key)) {
    event.preventDefault(); scrollCategories(event.key === 'ArrowRight' ? 1 : -1);
  }
});
new ResizeObserver(updateCategoryArrows).observe(categoryTrack);
requestAnimationFrame(updateCategoryArrows);
categories.forEach(category => { const option = document.createElement('option'); option.value = category; option.textContent = category; $('#category').append(option); });
const categorySlug = category => collections.find(c => c.name === category)?.slug || category.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const initialCollection = new URLSearchParams(window.location.search).get('collection');
$('#category').value = categories.find(category => categorySlug(category) === initialCollection) || 'all';
if (new URLSearchParams(location.search).has('search')) {
  $('#search').value = new URLSearchParams(location.search).get('search');
  $('#busca').hidden = false; $('.search-toggle').setAttribute('aria-expanded','true');
}
function updateCollection() {
  const category = $('#category').value;
  const all = category === 'all';
  const slug = all ? 'all' : categorySlug(category);
  $('#collection-title').textContent = all ? 'The full collection' : category;

  const descriptions = { Bags:'Discover everyday bags and statement silhouettes. Find your perfect carry.', 'Ballet Flats':'Explore ballet flats in different colours and finishes. Find your everyday favourite.', Sneakers:'Discover sneakers for your everyday rotation. Choose your next favourite pair.' };
  $('#collection-description').textContent = all ? 'From everyday essentials to statement pieces. Explore every style, in your own way.' : descriptions[category] || `Explore our ${category.toLowerCase()} collection and find your next favourite.`;
  document.title = `${all ? 'All products' : category} | ${brand}`;
  document.querySelectorAll('[data-category-link]').forEach(link => { const active = link.dataset.categoryLink === slug; link.classList.toggle('active',active); if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current'); });
  const url = new URL(window.location.href);
  if (all) url.searchParams.delete('collection'); else url.searchParams.set('collection',slug);
  if (url.href !== window.location.href) { try { window.history.replaceState(null,'',url); } catch { /* Local file previews may restrict history updates. */ } }
}
function numericPrice(product) {
  return window.StorePricing.unitPrice(product);
}
function price(product) {
  const value = numericPrice(product);
  if (value === null) return 'Price on request';
  try { return new Intl.NumberFormat('en-GB', {style:'currency', currency:config.moeda || 'EUR'}).format(value); }
  catch { return 'Price on request'; }
}
function setImage(img, product, detailed = false) {
  img.alt = product.name;
  const fullPhoto = window.PRODUCT_GALLERIES?.[product.id]?.[0];
  img.src = detailed && fullPhoto ? `./${fullPhoto.src}` : product.image ? `./${product.image}` : './product-placeholder.svg';
  img.removeAttribute('srcset');
  if (!detailed && fullPhoto && product.image && fullPhoto.width > 720) {
    img.srcset = `./${product.image} 720w, ./${fullPhoto.src} ${Math.min(1800,fullPhoto.width)}w`;
    img.sizes = '(max-width: 650px) 90vw, (max-width: 900px) 33vw, 25vw';
  }
  img.onerror = () => { img.onerror = null; img.removeAttribute('srcset'); img.src = './product-placeholder.svg'; };
}
function openProduct(product, trigger) {
  const url = `./product.html?product=${encodeURIComponent(product.id)}`;
  window.location.href = window.StoreCart ? window.StoreCart.urlFor(url) : url;
}
function appendCards(items, target = $('#products'), featured = false) {
  const fragment = document.createDocumentFragment();
  items.forEach((product, i) => {
    const card = document.createElement('article'); card.className = featured ? 'card featured-card' : 'card';
    card.dataset.productId = product.id;
    const imageButton = document.createElement('a'); imageButton.className = 'image-button'; imageButton.href = `./product.html?product=${encodeURIComponent(product.id)}`; imageButton.setAttribute('aria-label', `View details: ${product.name}`);
    const img = document.createElement('img'); setImage(img, product); img.loading = !featured && target.childElementCount === 0 && i < 4 ? 'eager' : 'lazy'; img.width = 600; img.height = 800;
    const view = document.createElement('span'); view.className = 'view'; view.textContent = 'View product';
    imageButton.append(img,view);
    if (featured && product.id === 'sue-suede-brown-leather-bag') {
      const badge = document.createElement('span'); badge.className = 'product-badge'; badge.textContent = 'NEW IN'; imageButton.append(badge);
    }
    const info = document.createElement('div'); info.className = 'product-info';
    const name = document.createElement('a'); name.className = 'product-name'; name.href = `./product.html?product=${encodeURIComponent(product.id)}`; name.textContent = product.name;
    const meta = document.createElement('div'); meta.className = 'product-meta';
    const category = document.createElement('span'); category.textContent = product.category;
    const amount = document.createElement('span'); window.StorePricing.render(amount,product);
    if (featured) {
      const headline = document.createElement('div'); headline.className = 'featured-headline';
      const colours = document.createElement('span'); colours.className = 'featured-colours'; colours.textContent = `${featuredColours[product.id]} colours`;
      headline.append(name,colours);
      const bottom = document.createElement('div'); bottom.className = 'featured-bottom';
      const availability = document.createElement('span'); availability.className = 'featured-availability'; availability.textContent = 'Availability on request';
      bottom.append(amount,availability); info.append(headline,bottom);
    } else { meta.append(category,amount); info.append(name,meta); }
    card.append(imageButton,info); fragment.append(card);
  });
  target.append(fragment);
}
const featuredColours = {
  'hilma-vinyl-burgundy-leather-bag':4,
  'aven-black-leather-loafers':10,
  'aven-suede-brown-leather-loafers':10,
  'rosalind-brown-leather-ballet-flats':26,
  'aven-lace-vintage-effect-brown-leather-loafers':10,
  'south-bicolor-black-brown-leather-ankle-boots':3,
  'rosalind-black-leather-ballet-flats':26,
  'aven-vintage-effect-brown-leather-loafers':10,
  'sajan-vintage-effect-dark-brown-leather-boots':5,
  'sue-suede-brown-leather-bag':2
};
const featuredProducts = Object.keys(featuredColours).map(id => products.find(p => p.id === id)).filter(Boolean);
const featuredTrack = $('#featured-track');
appendCards(featuredProducts,featuredTrack,true);
function updateFeaturedArrows() {
  $('#featured-prev').disabled = featuredTrack.scrollLeft <= 2;
  $('#featured-next').disabled = featuredTrack.scrollLeft + featuredTrack.clientWidth >= featuredTrack.scrollWidth - 2;
}
function scrollFeatured(direction) {
  const card = featuredTrack.firstElementChild;
  if (card) featuredTrack.scrollBy({left:direction*(card.getBoundingClientRect().width+2),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
$('#featured-prev').addEventListener('click', () => scrollFeatured(-1));
$('#featured-next').addEventListener('click', () => scrollFeatured(1));
featuredTrack.addEventListener('scroll',updateFeaturedArrows,{passive:true});
featuredTrack.addEventListener('keydown',event => { if (event.target === featuredTrack && ['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); scrollFeatured(event.key === 'ArrowRight'?1:-1); } });
new ResizeObserver(updateFeaturedArrows).observe(featuredTrack);
requestAnimationFrame(updateFeaturedArrows);
const campaignCarousel = $('.campaign-carousel');
const campaignSlides = [...campaignCarousel.querySelectorAll('.campaign-slide')];
const campaignDots = [...campaignCarousel.querySelectorAll('[data-slide]')];
let campaignIndex = 0;
function showCampaign(index) {
  campaignIndex = (index + campaignSlides.length) % campaignSlides.length;
  campaignSlides.forEach((slide,i) => { slide.hidden = i !== campaignIndex; });
  campaignDots.forEach((dot,i) => { if (i === campaignIndex) dot.setAttribute('aria-current','true'); else dot.removeAttribute('aria-current'); });
  campaignCarousel.dataset.theme = campaignIndex === 0 ? 'light' : 'dark';
  $('#campaign-status').textContent = `${campaignIndex + 1} of ${campaignSlides.length}: ${campaignSlides[campaignIndex].querySelector('.campaign-title').textContent}`;
}
$('.campaign-prev').addEventListener('click', () => showCampaign(campaignIndex-1));
$('.campaign-next').addEventListener('click', () => showCampaign(campaignIndex+1));
campaignDots.forEach(dot => dot.addEventListener('click', () => showCampaign(Number(dot.dataset.slide))));
campaignCarousel.addEventListener('keydown', event => {
  if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); showCampaign(campaignIndex + (event.key === 'ArrowRight' ? 1 : -1)); }
});
const topFinds = [
  {id:'south-bicolor-black-brown-leather-ankle-boots',editorial:'focuscarrusel_south.jpg',colours:3},
  {id:'sajan-black-leather-boots',editorial:'focuscarrusel_sajan.jpg',colours:5},
  {id:'aven-lace-vintage-effect-brown-leather-loafers',editorial:'FW26_FOCUSCARRUSEL_HOME_DESKTOP.jpg',colours:10},
  {id:'rosalind-all-studs-cream-leather-ballet-flats',editorial:'ROSALIND_FOCUSCARRUSEL_HOME_DESKTOP.jpg',colours:26},
  {id:'aven-rift-burgundy-leather-loafers',editorial:'MAN_FOCUSCARRUSEL_4_DESKTOP.jpg',colours:10}
].map(item => ({...item,product:products.find(product => product.id === item.id)})).filter(item => item.product);
let topFindIndex = 0;
function showTopFind(index) {
  if (!topFinds.length) return;
  topFindIndex = (index+topFinds.length)%topFinds.length;
  const item = topFinds[topFindIndex];
  $('#top-finds-editorial').src = `./${item.editorial}`;
  $('#top-finds-editorial').alt = `Style inspiration: ${item.product.name}`;
  setImage($('#top-finds-product-image'),item.product,true);
  $('#top-finds-name').textContent = item.product.name;
  window.StorePricing.render($('#top-finds-price'),item.product);
  $('#top-finds-colours').textContent = `+${item.colours} colours`;
  [$('#top-finds-item'),$('#top-finds-model')].forEach(button => button.setAttribute('aria-label',`View details: ${item.product.name}`));
  $('#top-finds-status').textContent = `${topFindIndex+1} of ${topFinds.length}: ${item.product.name}`;
}
$('.top-finds-prev').addEventListener('click', () => showTopFind(topFindIndex-1));
$('.top-finds-next').addEventListener('click', () => showTopFind(topFindIndex+1));
$('.top-finds-layout').addEventListener('keydown', event => {
  if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); showTopFind(topFindIndex+(event.key === 'ArrowRight'?1:-1)); }
});
[$('#top-finds-model'),$('#top-finds-item')].forEach(button => button.addEventListener('click', () => {
  if (topFinds.length) openProduct(topFinds[topFindIndex].product,button);
}));
showTopFind(0);
function updateCount() {
  const shown = Math.min(visibleCount,filtered.length);
  $('#count').textContent = `${filtered.length.toLocaleString('en-GB')} ${filtered.length === 1 ? 'product' : 'products'}`;
  $('#showing').textContent = `Showing ${shown.toLocaleString('en-GB')} of ${filtered.length.toLocaleString('en-GB')} products`;
  $('#load-more').hidden = shown >= filtered.length;
  $('#empty').hidden = filtered.length > 0;
}
function updateChips() {
  const selected = $('#category').value.toLowerCase();
  document.querySelectorAll('[data-filter]').forEach(button => { const active = button.dataset.filter === selected; button.classList.toggle('selected',active); button.setAttribute('aria-pressed',String(active)); });
}
function render() {
  const query = $('#search').value.trim().toLowerCase();
  const category = $('#category').value;
  const colour = $('#colour').value.toLowerCase();
  const members = collectionMembers.get(category);
  filtered = products.filter(p => (category === 'all' || (members ? members.has(p.id) : p.category === category)) && (colour === 'all' || p.name.toLowerCase().includes(colour)) && `${p.name} ${p.category}`.toLowerCase().includes(query));
  if ($('#sort').value === 'featured' && members) {
    const order = new Map(collections.find(c => c.name === category).productIds.map((id,index) => [id,index]));
    filtered.sort((a,b) => order.get(a.id)-order.get(b.id));
  }
  if ($('#sort').value === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name,'en'));
  if ($('#sort').value.startsWith('price-')) {
    const direction = $('#sort').value === 'price-low' ? 1 : -1;
    filtered.sort((a,b) => { const x = numericPrice(a), y = numericPrice(b); if (x === null) return y === null ? 0 : 1; if (y === null) return -1; return (x-y)*direction; });
  }
  pageSize = productPageSize();
  visibleCount = pageSize;
  $('#products').replaceChildren();
  appendCards(filtered.slice(0,visibleCount));
  updateCount(); updateChips(); updateCollection();
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  const value = button.dataset.filter;
  const category = categories.find(c => c.toLowerCase() === value);
  $('#category').value = value === 'all' ? 'all' : category || 'all';
  render();
}));
$('#load-more').addEventListener('click', () => { const start = visibleCount; visibleCount += pageSize; appendCards(filtered.slice(start,visibleCount)); updateCount(); $('#products').children[start]?.querySelector('a, button')?.focus({preventScroll:true}); });
$('#reset').addEventListener('click', () => { $('#category').value = 'all'; $('#colour').value = 'all'; $('#search').value = ''; $('#sort').value = 'featured'; render(); });
$('.search-toggle').addEventListener('click', () => { const bar = $('#busca'); bar.hidden = !bar.hidden; $('.search-toggle').setAttribute('aria-expanded',String(!bar.hidden)); if (!bar.hidden) $('#search').focus(); else { $('#search').value = ''; render(); } });
$('#search').addEventListener('input',render);
['(max-width: 600px)','(max-width: 900px)'].forEach(query => matchMedia(query).addEventListener('change',render));
['#sort','#category','#colour'].forEach(selector => $(selector).addEventListener('change',render));
render();
if (!products.length) { $('#empty').hidden = false; $('#empty').textContent = 'The catalogue could not be loaded. Please reload this page.'; }



