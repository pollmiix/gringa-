'use strict';
const config = window.LOJA_CONFIG || {};
const products = window.STORE_PRODUCTS || [];
const metadata = window.PRODUCT_DETAILS || {};
const collections = window.STORE_COLLECTIONS || [];
const $ = selector => document.querySelector(selector);
const productURL = product => `./product.html?product=${encodeURIComponent(product.id)}`;
const brand = config.nome || 'YOUR STORE';
document.querySelectorAll('[data-brand]').forEach(el => { el.textContent = brand; });
$('#year').textContent = new Date().getFullYear();
function price(product) {
  const amount = window.StorePricing.unitPrice(product);
  if (!(amount > 0)) return 'Price on request';
  try { return new Intl.NumberFormat('en-GB',{style:'currency',currency:config.moeda || 'EUR'}).format(amount); } catch { return 'Price on request'; }
}
function openDialog(dialog,trigger) {
  dialog.showModal(); document.body.classList.add('modal-open');
  dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); trigger?.focus(); },{once:true});
}
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click',event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));
$('.menu-toggle').addEventListener('click',event => openDialog($('#menu-dialog'),event.currentTarget));
$('#menu-dialog .dialog-close').addEventListener('click',() => $('#menu-dialog').close());
$('#utility-dialog .dialog-close').addEventListener('click',() => $('#utility-dialog').close());
$('#continue-shopping').addEventListener('click',() => $('#utility-dialog').close());
collections.forEach(collection => {
  [$('#menu-dialog nav'),$('#footer-categories')].forEach(nav => {
    const link = document.createElement('a'); link.href = `./index.html?collection=${encodeURIComponent(collection.slug)}#colecao`; link.textContent = collection.name; nav.append(link);
  });
});
function showInfo(title,copy,trigger) {
  $('#utility-title').textContent = title; $('#utility-copy').textContent = copy;
  openDialog($('#utility-dialog'),trigger);
}
let wishlist = [];
try { const saved = JSON.parse(localStorage.getItem('store-wishlist') || '[]'); if (Array.isArray(saved)) wishlist = saved.filter(id => typeof id === 'string' && products.some(p => p.id === id)); } catch {}
function renderWishlist(trigger) {
  $('#utility-title').textContent = 'Your wishlist';
  $('#utility-copy').replaceChildren();
  const list = document.createElement('div'); list.className = 'saved-list';
  if (!wishlist.length) list.textContent = 'You have no saved items yet.';
  wishlist.forEach(id => { const product = products.find(p => p.id === id); if (!product) return; const link = document.createElement('a'); link.href = productURL(product); const img = document.createElement('img'); img.src = `./${product.image}`; img.alt = ''; link.append(img,document.createTextNode(product.name)); list.append(link); });
  $('#utility-copy').append(list); openDialog($('#utility-dialog'),trigger);
}
document.querySelectorAll('[data-panel]').forEach(button => button.addEventListener('click',() => {
  if (button.dataset.panel === 'bag' && window.StoreCart) { window.StoreCart.open(button); return; }
  if (button.dataset.panel === 'wishlist') { renderWishlist(button); return; }
  showInfo(button.dataset.panel === 'profile' ? 'Your profile' : 'Your bag',button.dataset.panel === 'profile' ? 'Customer accounts are not available yet.' : 'Your bag is empty. Online ordering is not available yet.',button);
}));
$('.search-toggle').addEventListener('click',event => {
  $('#utility-title').textContent = 'Search'; $('#utility-copy').replaceChildren();
  const form = document.createElement('form'); form.className = 'search-bar';
  const input = document.createElement('input'); input.type = 'search'; input.placeholder = 'Search the collection'; input.setAttribute('aria-label','Search the collection');
  const button = document.createElement('button'); button.type = 'submit'; button.textContent = 'Search'; form.append(input,button);
  form.addEventListener('submit',submit => { submit.preventDefault(); const url = `./index.html?search=${encodeURIComponent(input.value)}#colecao`; location.href = window.StoreCart ? window.StoreCart.urlFor(url) : url; });
  $('#utility-copy').append(form); openDialog($('#utility-dialog'),event.currentTarget); input.focus();
});
const infoPanels = {
  contact:['Contact customer service','Customer service contact details will be available here soon.'],
  privacy:['Privacy Policy','Our privacy policy will be available before newsletter registration and online ordering open.'],
  stores:['Our stores','Store locations and opening hours will be available here soon.'],
  orders:['Track my order','Order tracking is not available yet. Please contact customer service for assistance.'],
  returns:['Returns & refunds','Contact customer service to confirm return conditions before ordering.'],
  shipping:['Shipping Policy','Contact customer service to confirm delivery options and costs before ordering.'],
  terms:['Terms of Sale','Our terms of sale will be available before online ordering opens.'],
  about:['About us','Explore our collection of shoes, bags, clothing and accessories.'],
  feedback:['Share your feedback','Contact customer service to share your feedback about your shopping experience.']
};
document.querySelectorAll('[data-footer-info]').forEach(button => button.addEventListener('click',() => {
  const panel = infoPanels[button.dataset.footerInfo]; showInfo(panel[0],panel[1],button);
  const phone = String(config.whatsapp || '').replace(/\D/g,'');
  if (button.dataset.footerInfo === 'contact' && phone) { const link = document.createElement('a'); link.href = `https://wa.me/${phone}`; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Contact us on WhatsApp'; $('#utility-copy').replaceChildren(link); }
}));
function updateNewsletter() { $('#newsletter-join').disabled = !$('#newsletter-email').value.trim() || !$('#newsletter-email').validity.valid || !$('#newsletter-consent').checked; }
$('#newsletter-email').addEventListener('input',updateNewsletter); $('#newsletter-consent').addEventListener('change',updateNewsletter);
$('#newsletter-form').addEventListener('submit',event => { event.preventDefault(); if (!event.currentTarget.reportValidity()) return; $('#newsletter-status').hidden = false; $('#newsletter-status').textContent = 'Newsletter registration is not available yet. Please try again later.'; });
updateNewsletter();
const product = products.find(p => p.id === new URLSearchParams(location.search).get('product'));
const details = product ? metadata[product.id] || {} : {};
let selectedSize = '';
let photoIndex = 0;
const photos = product ? window.PRODUCT_GALLERIES?.[product.id] || [{src:product.image}] : [];
function updateSaved() {
  const saved = product && wishlist.includes(product.id);
  $('#pdp-save').setAttribute('aria-pressed',String(Boolean(saved)));
  $('#pdp-save').setAttribute('aria-label',saved ? 'Remove from wishlist' : 'Save to wishlist');
}
function showZoom(index) {
  photoIndex = (index+photos.length)%photos.length;
  $('#pdp-zoom-image').src = `./${photos[photoIndex].src}`; $('#pdp-zoom-image').alt = `${product.name} — photo ${photoIndex+1}`;
  $('#pdp-original').href = `./${photos[photoIndex].src}`;
}
$('#pdp-close-zoom').addEventListener('click',() => $('#pdp-zoom').close());
$('#pdp-zoom-prev').addEventListener('click',() => showZoom(photoIndex-1));
$('#pdp-zoom-next').addEventListener('click',() => showZoom(photoIndex+1));
$('#pdp-zoom').addEventListener('keydown',event => { if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); showZoom(photoIndex+(event.key === 'ArrowRight'?1:-1)); } });
$('#pdp-close-size').addEventListener('click',() => $('#pdp-size-dialog').close());
if (!product) {
  $('#pdp-missing').hidden = false; document.title = `Product not found | ${brand}`;
} else {
  $('#product-main').hidden = false; document.title = `${product.name} | ${brand}`;
  const sameStyle = products.filter(p => metadata[p.id]?.family === details.family && p.category === product.category);
  const colourVariants = sameStyle.length ? sameStyle : [product];
  $('#pdp-title').textContent = product.name;
  window.StorePricing.render($('#pdp-price'),product);
  $('#pdp-colour-count').textContent = `${colourVariants.length} ${colourVariants.length === 1 ? 'COLOUR' : 'COLOURS'}`;
  $('#pdp-status').textContent = details.preorder ? 'PRE-ORDER' : 'AVAILABILITY ON REQUEST';
  $('#pdp-colour-label').textContent = `Colour: ${details.colour ? details.colour.charAt(0).toUpperCase()+details.colour.slice(1) : product.name}`;
  $('#pdp-description').textContent = `${product.name}. Explore every angle in the photo gallery and choose your preferred size.`;
  const facts = {Category:product.category,Colour:details.colour,Material:details.material,'Heel height':details.heel && details.heel !== '0' ? `${details.heel} cm` : '',Origin:details.origin};
  Object.entries(facts).filter(([,value]) => value).forEach(([key,value]) => { const row = document.createElement('div'); const term = document.createElement('dt'); term.textContent = key; const definition = document.createElement('dd'); definition.textContent = String(value).charAt(0).toUpperCase()+String(value).slice(1); row.append(term,definition); $('#pdp-specifications').append(row); });
  $('#pdp-fit').textContent = details.fit ? `Fit guidance: ${details.fit}.` : 'Contact customer service for help choosing your size.';
  const sizes = product.sizes?.length ? product.sizes : ['One size'];
  if (product.category === 'Bags') {
    selectedSize = sizes[0];
    $('#pdp-select-size').textContent = 'ADD TO BAG';
    $('#pdp-description').textContent = `${product.name}. Explore every angle in the photo gallery.`;
  }
  $('#pdp-size-options').style.setProperty('--size-count',sizes.length);
  $('#pdp-sizes-copy').textContent = `Listed sizes: ${sizes.join(' · ')}. Please confirm availability.`;
  photos.forEach((photo,i) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'pdp-photo'; button.setAttribute('aria-label',`Enlarge product photo ${i+1}`); const img = document.createElement('img'); img.src = `./${photo.src}`; img.alt = `${product.name} — photo ${i+1}`; img.loading = i < 2 ? 'eager' : 'lazy'; if (photo.width && photo.height) { img.width = photo.width; img.height = photo.height; } button.append(img); button.addEventListener('click',() => { showZoom(i); openDialog($('#pdp-zoom'),button); }); $('#pdp-gallery').append(button); });
  colourVariants.forEach(item => { const link = document.createElement('a'); link.href = productURL(item); link.setAttribute('aria-label',item.name); if (item.id === product.id) link.setAttribute('aria-current','page'); const img = document.createElement('img'); img.src = `./${item.image}`; img.alt = metadata[item.id]?.colour || item.name; img.loading = 'lazy'; link.append(img); $('#pdp-colours').append(link); });
  $('#pdp-size-image').src = `./${photos[0].src}`;
  $('#pdp-size-image').alt = product.name;
  $('#pdp-size-product-name').textContent = product.name;
  sizes.forEach(size => { const button = document.createElement('button'); button.type = 'button';
    button.className = 'size-option';
    const label = document.createElement('span'); label.className = 'size-option-label'; label.textContent = size;
    const amount = document.createElement('span'); amount.className = 'size-option-price'; amount.textContent = price(product);
    const shipping = document.createElement('span'); shipping.className = 'size-option-shipping'; shipping.textContent = details.preorder ? 'Pre-order · Shipping date on request' : 'Availability on request';
    button.append(label,amount,shipping); button.setAttribute('aria-pressed','false'); button.addEventListener('click',() => { selectedSize = size; $('#pdp-size-options').querySelectorAll('button').forEach(el => el.setAttribute('aria-pressed',String(el === button))); $('#pdp-select-size').textContent = 'ADD TO BAG'; $('#pdp-selection').hidden = false; $('#pdp-selection').textContent = `Selected size: ${size}. Availability is subject to confirmation.`; $('#pdp-change-size').hidden = false; $('#pdp-enquire').hidden = false; $('#pdp-size-dialog').close(); }); $('#pdp-size-options').append(button); });
  $('#pdp-select-size').addEventListener('click',event => {
    if (!selectedSize) { openDialog($('#pdp-size-dialog'),event.currentTarget); return; }
    if (window.StoreCart?.add(product.id,selectedSize)) window.StoreCart.open(event.currentTarget);
  });
  $('#pdp-change-size').addEventListener('click',event => openDialog($('#pdp-size-dialog'),event.currentTarget));
  $('#pdp-save').addEventListener('click',() => { wishlist = wishlist.includes(product.id) ? wishlist.filter(id => id !== product.id) : [...wishlist,product.id]; try { localStorage.setItem('store-wishlist',JSON.stringify(wishlist)); } catch {} updateSaved(); });
  $('#pdp-enquire').addEventListener('click',event => { const phone = String(config.whatsapp || '').replace(/\D/g,''); if (phone) { const url = `https://wa.me/${phone}?text=${encodeURIComponent(`Hello! I would like to enquire about ${product.name}, size ${selectedSize}.`)}`; window.open(url,'_blank','noopener,noreferrer'); } else showInfo('Product enquiry','Online ordering is not available yet. Customer service contact details will be available here soon.',event.currentTarget); });
  updateSaved();
}
function recommendedProducts(current) {
  const featured = ['south-bicolor-black-brown-leather-ankle-boots','sue-suede-brown-leather-bag','hilma-vinyl-burgundy-leather-bag','aven-black-leather-loafers','aven-suede-brown-leather-loafers','rosalind-brown-leather-ballet-flats','aven-rift-burgundy-leather-loafers','aven-lace-vintage-effect-brown-leather-loafers','rosalind-black-leather-ballet-flats','aven-vintage-effect-brown-leather-loafers'];
  const suggestions = [...featured.map(id => products.find(p => p.id === id)),...products.filter(p => p.category === current.category),...products];
  const seen = new Set([current.id]);
  return suggestions.filter(item => { if (!item || seen.has(item.id)) return false; seen.add(item.id); return true; }).slice(0,12);
}
if (product) {
  const track = $('#recommendations-track');
  const fragment = document.createDocumentFragment();
  recommendedProducts(product).forEach(item => {
    const article = document.createElement('article'); article.className = 'recommendation-card'; article.dataset.productId = item.id;
    const photo = document.createElement('a'); photo.className = 'recommendation-photo'; photo.href = productURL(item); photo.setAttribute('aria-label',`View details: ${item.name}`);
    const image = document.createElement('img'); image.src = `./${item.image}`; image.alt = item.name; image.loading = 'lazy'; image.width = 600; image.height = 800;
    const full = window.PRODUCT_GALLERIES?.[item.id]?.[0];
    if (full?.width > 720) { image.srcset = `./${item.image} 720w, ./${full.src} ${Math.min(1800,full.width)}w`; image.sizes = '(max-width: 650px) 90vw, (max-width: 1000px) 33vw, 25vw'; }
    photo.append(image);
    if (item.id === 'sue-suede-brown-leather-bag') { const badge = document.createElement('span'); badge.className = 'product-badge'; badge.textContent = 'NEW IN'; photo.append(badge); }
    const info = document.createElement('div'); info.className = 'recommendation-info';
    const top = document.createElement('div'); top.className = 'recommendation-line';
    const name = document.createElement('a'); name.href = productURL(item); name.className = 'recommendation-name'; name.textContent = item.name; name.title = item.name;
    const colours = document.createElement('span'); colours.className = 'recommendation-colours';
    const count = products.filter(p => metadata[p.id]?.family === metadata[item.id]?.family && p.category === item.category).length || 1;
    colours.textContent = `${count} ${count === 1 ? 'colour' : 'colours'}`; top.append(name,colours);
    const bottom = document.createElement('div'); bottom.className = 'recommendation-line';
    const amount = document.createElement('span'); window.StorePricing.render(amount,item);
    const availability = document.createElement('span'); availability.className = 'recommendation-availability'; availability.textContent = metadata[item.id]?.preorder ? 'Pre-order' : 'Availability on request';
    bottom.append(amount,availability); info.append(top,bottom); article.append(photo,info); fragment.append(article);
  });
  track.append(fragment); $('#pdp-recommendations').hidden = false;
  function updateRecommendationArrows() {
    $('#recommendations-prev').disabled = track.scrollLeft <= 2;
    $('#recommendations-next').disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth-2;
  }
  function scrollRecommendations(direction) {
    const card = track.firstElementChild;
    if (card) track.scrollBy({left:direction*(card.getBoundingClientRect().width+2),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  $('#recommendations-prev').addEventListener('click',() => scrollRecommendations(-1));
  $('#recommendations-next').addEventListener('click',() => scrollRecommendations(1));
  track.addEventListener('scroll',updateRecommendationArrows,{passive:true});
  track.addEventListener('keydown',event => { if (event.target === track && ['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); scrollRecommendations(event.key === 'ArrowRight'?1:-1); } });
  new ResizeObserver(updateRecommendationArrows).observe(track); requestAnimationFrame(updateRecommendationArrows);
}
