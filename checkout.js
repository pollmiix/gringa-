(() => {
  'use strict';
  const config = window.LOJA_CONFIG || {};
  const cart = window.StoreCart;
  const products = new Map((window.STORE_PRODUCTS || []).map(product => [product.id,product]));
  const metadata = window.PRODUCT_DETAILS || {};
  const find = selector => document.querySelector(selector);
  const brand = config.nome && config.nome !== 'YOUR STORE' ? config.nome : 'ALOHAS';
  document.title = `Checkout | ${brand}`;
  if (brand !== 'ALOHAS') { find('#checkout-brand').textContent = brand; find('#checkout-brand').style.cssText = 'font-size:32px;font-weight:bold'; }
  find('#checkout-bag').addEventListener('click',event => cart.open(event.currentTarget));
  const node = (tag,className,text) => { const element=document.createElement(tag); if(className) element.className=className; if(text!==undefined) element.textContent=text; return element; };
  function render() {
    const items=cart.getItems();
    find('#checkout-main').hidden=!items.length;
    find('#checkout-empty').hidden=Boolean(items.length);
    find('#checkout-pay').disabled=!items.length || cart.subtotal()===null;
    const compact=document.createDocumentFragment();
    const detailed=document.createDocumentFragment();
    items.forEach(item => {
      const product=products.get(item.id);
      const value=cart.unitPrice(product);
      const status=metadata[item.id]?.preorder?'Pre-order':'Availability on request';
      const url=cart.urlFor(`./product.html?product=${encodeURIComponent(item.id)}`);
      const row=node('article','checkout-summary-item');
      const photo=node('a','checkout-summary-photo');photo.href=url;photo.setAttribute('aria-label',product.name);
      const img=node('img');img.src=`./${product.image}`;img.alt=product.name;
      photo.append(img,node('span','checkout-quantity',item.quantity));
      const copy=node('div','checkout-item-copy');const title=node('a','',product.name);title.href=url;
      copy.append(title,node('p','',`Size: ${item.size}`),node('p','',status));
      row.append(photo,copy,node('span','checkout-line-price',cart.money(value===null?null:value*item.quantity)));compact.append(row);
      const detail=node('article','checkout-detail');const full=node('img');full.src=`./${window.PRODUCT_GALLERIES?.[item.id]?.[0]?.src || product.image}`;full.alt=product.name;
      const facts=node('div');facts.append(node('p','',product.name),node('p','',`Size: ${item.size}`),node('p','',`Quantity: ${item.quantity}`),node('p','',status),node('p','',cart.money(value===null?null:value*item.quantity)));detail.append(full,facts);detailed.append(detail);
    });
    find('#checkout-products').replaceChildren(compact);find('#checkout-product-details').replaceChildren(detailed);
    const count=items.reduce((sum,item)=>sum+item.quantity,0);
    find('#checkout-delivery-count').textContent=`${count} ${count===1?'PRODUCT':'PRODUCTS'} · DELIVERY TO BE CONFIRMED`;
    find('#checkout-availability').textContent=items.some(item=>metadata[item.id]?.preorder)?'PRE-ORDER — Your bag contains pre-order items. Stock and shipping dates must be confirmed before payment.':'Stock and delivery options must be confirmed before payment.';
    find('#checkout-summary-toggle').textContent = `Order summary · ${cart.money(cart.subtotal())}  ⌄`;
    find('#checkout-subtotal').textContent=cart.money(cart.subtotal());find('#checkout-total').textContent=cart.money(cart.subtotal());
    find('#checkout-shipping-total').textContent=config.freteGratis===true?'Free':'To be confirmed';
    find('#checkout-shipping-label').textContent=config.freteGratis===true ? config.freteDescricao || 'Free shipping' : 'Shipping options and costs will be confirmed before payment.';
    find('#checkout-shipping-price').textContent=config.freteGratis===true?'FREE':'To be confirmed';
  }
  find('#checkout-discount').addEventListener('submit',event=>{event.preventDefault();find('#discount-feedback').hidden=false;find('#discount-feedback').textContent=find('#discount-code').value.trim()?'Discount codes and gift cards will be available after checkout setup is complete.':'Enter a discount code or gift card.';});
  find('#checkout-form').addEventListener('submit',event=>{
    event.preventDefault();
    if(!event.currentTarget.reportValidity())return;
    // Integrate a server-created payment session here. The server must validate
    // product IDs, sizes, quantities, prices, shipping and taxes independently.
    // Keep provider secrets on the server; use provider-hosted payment fields.
    find('#checkout-feedback').hidden=false;
    find('#checkout-feedback').textContent='Payment setup is not complete yet. No order has been placed and you have not been charged.';
  });
  // Contact and address values stay only in this page. They are not persisted,
  // added to URLs, or sent anywhere while the payment service is disconnected.
  find('#checkout-summary-toggle').addEventListener('click',event=>{
    const expanded=event.currentTarget.getAttribute('aria-expanded')==='true';
    event.currentTarget.setAttribute('aria-expanded',String(!expanded));
    find('.checkout-summary').classList.toggle('is-expanded',!expanded);
  });
  function updatePaymentMethod() {
    document.querySelectorAll('.payment-method').forEach(row=>{
      const radio=row.querySelector('input[name="paymentMethod"]');
      row.classList.toggle('is-selected',radio.checked);
      row.querySelector('.payment-method-panel').hidden=!radio.checked;
    });
    find('#checkout-feedback').hidden=true;
  }
  document.querySelectorAll('input[name="paymentMethod"]').forEach(radio=>radio.addEventListener('change',updatePaymentMethod));
  function updateBillingAddress() {
    const different=find('input[name="billingAddress"][value="different"]').checked;
    find('#billing-fields').hidden=!different;
    find('#billing-fields').disabled=!different;
    document.querySelectorAll('.billing-option').forEach(row=>row.classList.toggle('is-selected',row.querySelector('input').checked));
  }
  document.querySelectorAll('input[name="billingAddress"]').forEach(radio=>radio.addEventListener('change',updateBillingAddress));
  find('#save-checkout-info').addEventListener('change',event=>{
    find('#checkout-save-feedback').hidden=!event.currentTarget.checked;
    find('#checkout-save-feedback').textContent='Saving checkout information is not connected yet. Your details have not been saved.';
  });
  find('#checkout-save-not-now').addEventListener('click',()=>{
    find('#save-checkout-info').checked=false;
    find('#checkout-save-feedback').hidden=false;
    find('#checkout-save-feedback').textContent='Your checkout information will not be saved.';
  });
  document.querySelectorAll('.payment-privacy-link').forEach(button=>button.addEventListener('click',()=>{
    const dialog=find('#checkout-privacy-dialog');dialog.showModal();document.body.classList.add('modal-open');
    dialog.addEventListener('close',()=>button.focus(),{once:true});
  }));
  updatePaymentMethod();updateBillingAddress();
  find('#checkout-copyright').textContent=`Copyright © ${new Date().getFullYear()} ${brand} All Rights Reserved.`;
  find('#checkout-chat').addEventListener('click',()=>{
    const phone=String(config.whatsapp || '').replace(/\D/g,'');
    if(phone){window.open(`https://wa.me/${phone}`,'_blank','noopener,noreferrer');return;}
    find('#checkout-chat-feedback').hidden=false;
    find('#checkout-chat-feedback').textContent='Customer service chat is not available yet. Contact details will be available here soon.';
  });
  const privacy=find('#checkout-privacy-dialog');
  find('#checkout-privacy-open').addEventListener('click',()=>{privacy.showModal();document.body.classList.add('modal-open');});
  find('#checkout-privacy-close').addEventListener('click',()=>privacy.close());
  privacy.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('modal-open');find('#checkout-privacy-open').focus();});
  privacy.addEventListener('click',event=>{if(event.target!==privacy)return;const rect=privacy.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)privacy.close();});
  window.addEventListener('store-cart-change',render);
  window.addEventListener('storage',event=>{if(event.key==='store-cart-v1')render();});
  render();
})();
