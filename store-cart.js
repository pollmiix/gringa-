(() => {
  'use strict';
  const config = window.LOJA_CONFIG || {};
  const catalogue = window.STORE_PRODUCTS || [];
  const metadata = window.PRODUCT_DETAILS || {};
  const storageKey = 'store-cart-v1';
  const byId = new Map(catalogue.map(product => [product.id,product]));
  function validItems(value) {
    if (!Array.isArray(value)) return [];
    const merged = new Map();
    value.slice(0,100).forEach(entry => {
      if (!entry || typeof entry.id !== 'string' || typeof entry.size !== 'string') return;
      const product = byId.get(entry.id);
      const sizes = product?.sizes?.length ? product.sizes : ['One size'];
      if (!product || !sizes.includes(entry.size) || !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > 99) return;
      const key = `${entry.id}|${entry.size}`;
      const previous = merged.get(key);
      merged.set(key,{id:entry.id,size:entry.size,quantity:Math.min(99,entry.quantity+(previous?.quantity || 0))});
    });
    return [...merged.values()];
  }
  let items = [];
  try { items = validItems(JSON.parse(localStorage.getItem(storageKey) || '[]')); } catch {}
  // File previews have separate storage areas in some browsers. Carry only the
  // non-sensitive cart selections between this storefront's local HTML pages.
  if (location.protocol === 'file:') {
    const incoming = new URLSearchParams(location.search).get('bag');
    if (incoming !== null) { try { items = validItems(JSON.parse(incoming)); } catch {} }
  }
  const drawer = document.createElement('dialog'); drawer.className = 'cart-drawer'; drawer.id = 'cart-drawer'; drawer.setAttribute('aria-labelledby','cart-title');
  drawer.innerHTML = `<div class="cart-drawer-layout"><header class="cart-heading"><h2 id="cart-title">YOUR BAG <span id="cart-count"></span></h2><button class="cart-close" id="cart-close" type="button" aria-label="Close shopping bag">×</button></header><div class="cart-scroll"><div id="cart-items" aria-label="Shopping bag items"></div><p class="cart-empty" id="cart-empty">Your bag is empty.<br><a href="./index.html#colecao">Explore the collection</a></p><section class="cart-recommendations" aria-labelledby="cart-recommendations-title"><div class="cart-recommendations-heading"><h3 id="cart-recommendations-title">RECOMMENDED FOR YOU</h3><div class="category-arrows"><button type="button" id="cart-rec-prev" aria-label="Previous recommendations" aria-controls="cart-rec-track" disabled>‹</button><button type="button" id="cart-rec-next" aria-label="Next recommendations" aria-controls="cart-rec-track">›</button></div></div><div class="cart-rec-track" id="cart-rec-track" tabindex="0" role="region" aria-label="Recommended products"></div></section></div><div class="cart-totals"><p class="cart-shipping" id="cart-shipping"></p><div class="cart-checkout"><div class="cart-subtotal"><span>Subtotal</span><strong id="cart-subtotal"></strong></div><p class="cart-checkout-note">Taxes, shipping and discounts confirmed at checkout.</p><button class="cart-checkout-button" id="cart-checkout" type="button">Check Out</button><p class="cart-checkout-status" id="cart-checkout-status" role="status" hidden></p></div></div></div>`;
  document.body.append(drawer);
  if (config.descontoAdicionalPercentual > 0) {
    drawer.querySelector('.cart-checkout-note').textContent = `Extra ${config.descontoAdicionalPercentual}% discount already included. Taxes and shipping confirmed at checkout.`;
  }
  const find = selector => drawer.querySelector(selector);
  let lastTrigger = null;
  function unitPrice(product) {
    return window.StorePricing.unitPrice(product);
  }
  function money(value) {
    if (value === null) return 'Price on request';
    try { return new Intl.NumberFormat('en-GB',{style:'currency',currency:config.moeda || 'EUR'}).format(value); } catch { return 'Price on request'; }
  }
  function urlFor(relative) {
    const url = new URL(relative,location.href);
    if (location.protocol === 'file:' && url.protocol === 'file:') url.searchParams.set('bag',JSON.stringify(items));
    return url.href;
  }
  function persist() {
    try { localStorage.setItem(storageKey,JSON.stringify(items)); } catch {}
    window.dispatchEvent(new Event('store-cart-change'));
    if (location.protocol === 'file:') {
      const url = new URL(location.href); url.searchParams.set('bag',JSON.stringify(items));
      try { history.replaceState(null,'',url); } catch {}
    }
  }
  function renderBadge() {
    const count = items.reduce((total,item) => total+item.quantity,0);
    document.querySelectorAll('[data-panel="bag"]').forEach(button => {
      let badge = button.querySelector('.cart-badge');
      if (!badge) { badge = document.createElement('span'); badge.className = 'cart-badge'; button.append(badge); }
      badge.textContent = String(count); badge.hidden = !count;
      button.setAttribute('aria-label',`Shopping bag, ${count} ${count === 1 ? 'item' : 'items'}`);
    });
  }
  function actionButton(label,text,handler) {
    const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label',label); button.textContent = text; button.addEventListener('click',handler); return button;
  }
  function updateQuantity(index,amount,focusLabel) {
    if (!items[index]) return;
    items[index].quantity = Math.max(1,Math.min(99,items[index].quantity+amount));
    persist(); render();
    if (focusLabel) [...find('#cart-items').querySelectorAll('button')].find(button => button.getAttribute('aria-label') === focusLabel)?.focus({preventScroll:true});
  }
  function renderItems() {
    const fragment = document.createDocumentFragment();
    items.forEach((item,index) => {
      const product = byId.get(item.id);
      const article = document.createElement('article'); article.className = 'cart-item';
      const photo = document.createElement('a'); photo.href = urlFor(`./product.html?product=${encodeURIComponent(product.id)}`); photo.className = 'cart-item-photo';
      const image = document.createElement('img');
      const detailedPhoto = window.PRODUCT_GALLERIES?.[product.id]?.[0];
      image.src = `./${detailedPhoto?.src || product.image}`; image.alt = product.name; photo.append(image);
      const info = document.createElement('div'); info.className = 'cart-item-information';
      const title = document.createElement('a'); title.href = photo.href; title.className = 'cart-item-name'; title.textContent = product.name;
      const size = document.createElement('p'); size.className = 'cart-item-size'; size.textContent = `Size: ${item.size}${metadata[item.id]?.colour ? ` · ${metadata[item.id].colour}` : ''}`;
      const amount = document.createElement('span'); amount.className = 'cart-item-price'; const value = unitPrice(product); amount.textContent = money(value === null ? null : value*item.quantity);
      const controls = document.createElement('div'); controls.className = 'cart-item-controls';
      const quantity = document.createElement('div'); quantity.className = 'cart-quantity';
      const lessLabel = `Decrease quantity of ${product.name}, size ${item.size}`;
      const moreLabel = `Increase quantity of ${product.name}, size ${item.size}`;
      const less = actionButton(lessLabel,'−',() => updateQuantity(index,-1,lessLabel)); less.disabled = item.quantity <= 1;
      const count = document.createElement('span'); count.textContent = String(item.quantity); count.setAttribute('aria-label','Quantity');
      const more = actionButton(moreLabel,'+',() => updateQuantity(index,1,moreLabel)); more.disabled = item.quantity >= 99;
      quantity.append(less,count,more);
      const remove = actionButton(`Remove ${product.name}, size ${item.size}`,'×',() => { items.splice(index,1); persist(); render(); find('#cart-title').focus({preventScroll:true}); }); remove.className = 'cart-remove'; remove.title = 'Remove product';
      controls.append(quantity,remove); info.append(title,size,amount,controls); article.append(photo,info); fragment.append(article);
    });
    find('#cart-items').replaceChildren(fragment); find('#cart-empty').hidden = items.length > 0;
  }
  function renderRecommendations() {
    const inBag = new Set(items.map(item => item.id));
    const seeds = ['sage-black-leather-loafers','sage-rift-burgundy-leather-loafers','south-bicolor-black-brown-leather-ankle-boots','sue-suede-brown-leather-bag','hilma-vinyl-burgundy-leather-bag','aven-black-leather-loafers'];
    const selected = new Set(inBag);
    const suggestions = [...seeds.map(id => byId.get(id)),...catalogue].filter(product => { if (!product || selected.has(product.id)) return false; selected.add(product.id); return true; }).slice(0,8);
    const fragment = document.createDocumentFragment();
    suggestions.forEach(product => {
      const card = document.createElement('article'); card.className = 'cart-rec-card';
      const photo = document.createElement('a'); photo.className = 'cart-rec-photo'; photo.href = urlFor(`./product.html?product=${encodeURIComponent(product.id)}`);
      const img = document.createElement('img'); img.src = `./${product.image}`; img.alt = product.name; img.loading = 'lazy'; photo.append(img);
      const top = document.createElement('div'); top.className = 'cart-rec-line';
      const name = document.createElement('a'); name.href = photo.href; name.className = 'cart-rec-name'; name.textContent = product.name; name.title = product.name;
      const family = metadata[product.id]?.family;
      const count = family ? catalogue.filter(item => metadata[item.id]?.family === family && item.category === product.category).length : 0;
      const colours = document.createElement('span'); colours.textContent = count ? `${count} ${count === 1 ? 'colour' : 'colours'}` : '';
      top.append(name,colours);
      const bottom = document.createElement('div'); bottom.className = 'cart-rec-line';
      const amount = document.createElement('span'); amount.textContent = money(unitPrice(product));
      const status = document.createElement('span'); status.textContent = metadata[product.id]?.preorder ? 'Pre-order' : 'On request';
      bottom.append(amount,status); card.append(photo,top,bottom); fragment.append(card);
    });
    const track = find('#cart-rec-track'); track.replaceChildren(fragment); track.scrollLeft = 0;
    requestAnimationFrame(updateRecommendationArrows);
  }
  function updateRecommendationArrows() {
    const track = find('#cart-rec-track');
    find('#cart-rec-prev').disabled = track.scrollLeft <= 2;
    find('#cart-rec-next').disabled = track.scrollLeft+track.clientWidth >= track.scrollWidth-2;
  }
  function scrollRecommendations(direction) {
    const track = find('#cart-rec-track'); const card = track.firstElementChild;
    if (card) track.scrollBy({left:direction*(card.getBoundingClientRect().width+2),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function subtotal() {
    if (items.some(item => unitPrice(byId.get(item.id)) === null)) return null;
    return items.reduce((sum,item) => sum+unitPrice(byId.get(item.id))*item.quantity,0);
  }
  function render() {
    find('#cart-count').textContent = `(${items.reduce((sum,item) => sum+item.quantity,0)})`;
    find('#cart-title').tabIndex = -1;
    renderItems(); renderRecommendations(); renderBadge();
    find('#cart-subtotal').textContent = money(subtotal());
    find('#cart-shipping').textContent = config.freteGratis === true ? 'Free shipping included' : 'Shipping calculated at checkout';
    find('#cart-checkout').disabled = !items.length || subtotal() === null;
    find('#cart-checkout-status').hidden = true;
  }
  function open(trigger) {
    render(); lastTrigger = trigger || document.activeElement;
    if (!drawer.open) drawer.showModal();
    document.body.classList.add('modal-open');
    updateRecommendationArrows();
    requestAnimationFrame(updateRecommendationArrows);
  }
  function add(id,size) {
    const product = byId.get(id); const sizes = product?.sizes?.length ? product.sizes : ['One size'];
    if (!product || !sizes.includes(size)) return false;
    const item = items.find(entry => entry.id === id && entry.size === size);
    if (item) item.quantity = Math.min(99,item.quantity+1); else if (items.length < 100) items.push({id,size,quantity:1}); else return false;
    persist(); render(); return true;
  }
  find('#cart-close').addEventListener('click',() => drawer.close());
  drawer.addEventListener('close',() => { if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open'); if (lastTrigger?.isConnected) lastTrigger.focus(); });
  drawer.addEventListener('click',event => { if (event.target !== drawer) return; const rect = drawer.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) drawer.close(); });
  find('#cart-rec-prev').addEventListener('click',() => scrollRecommendations(-1));
  find('#cart-rec-next').addEventListener('click',() => scrollRecommendations(1));
  find('#cart-rec-track').addEventListener('scroll',updateRecommendationArrows,{passive:true});
  find('#cart-rec-track').addEventListener('keydown',event => { if (event.target.id === 'cart-rec-track' && ['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); scrollRecommendations(event.key === 'ArrowRight'?1:-1); } });
  new ResizeObserver(updateRecommendationArrows).observe(find('#cart-rec-track'));
  find('#cart-checkout').addEventListener('click',() => { if (items.length && subtotal() !== null) location.href = urlFor('./checkout.html'); });
  window.addEventListener('storage',event => { if (event.key !== storageKey) return; try { items = validItems(JSON.parse(event.newValue || '[]')); render(); } catch {} });
  document.addEventListener('click',event => {
    if (location.protocol !== 'file:') return;
    const link = event.target.closest('a[href]'); if (!link) return;
    const url = new URL(link.href,location.href);
    if (url.protocol === 'file:' && /\/(index|product|checkout)\.html$/.test(url.pathname) && url.pathname.slice(0,url.pathname.lastIndexOf('/')) === location.pathname.slice(0,location.pathname.lastIndexOf('/'))) link.href = urlFor(url.href);
  },true);
  window.StoreCart = {open,add,getItems:() => items.map(item => ({...item})),subtotal,urlFor,unitPrice,money};
  persist(); renderBadge();
})();
