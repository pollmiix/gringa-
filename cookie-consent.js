(() => {
  'use strict';
  const storageKey = 'store-cookie-consent-v1';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  function read(value) {
    try {
      const saved = JSON.parse(value);
      if (saved?.version === 1 && typeof saved.analytics === 'boolean' && typeof saved.personalization === 'boolean' && Number.isFinite(saved.expiresAt) && saved.expiresAt > Date.now()) return saved;
    } catch {}
    return null;
  }
  let consent = null;
  try { consent = read(localStorage.getItem(storageKey)); } catch {}
  const banner = document.createElement('section');
  banner.className = 'cookie-banner';
  banner.setAttribute('aria-label', 'Cookie choices');
  banner.innerHTML = `<p>We use essential cookies and local storage to keep your shopping bag working. With your permission, optional cookies can be used for analytics and personalization. <button type="button" class="cookie-learn">Learn more</button></p><div class="cookie-actions"><button type="button" class="cookie-decline">DECLINE</button><button type="button" class="cookie-customize">SET COOKIES</button><button type="button" class="cookie-accept">ACCEPT ALL</button></div>`;
  const dialog = document.createElement('dialog');
  dialog.id = 'cookie-preferences';
  dialog.setAttribute('aria-labelledby', 'cookie-preferences-title');
  dialog.innerHTML = `<button type="button" class="cookie-close" aria-label="Close cookie settings">&times;</button><h2 id="cookie-preferences-title">Cookie settings</h2><p>Essential storage keeps your shopping bag, wishlist and cookie preferences working. Optional categories are off unless you allow them. No analytics or personalization trackers are currently installed in this store.</p><label class="cookie-category"><span>Essential<small>Required for store features. Always enabled.</small></span><input type="checkbox" checked disabled aria-label="Essential storage, always enabled"></label><label class="cookie-category"><span>Analytics<small>Allow optional tools that measure how visitors use the store.</small></span><input type="checkbox" id="cookie-analytics"></label><label class="cookie-category"><span>Personalization<small>Allow optional tools that personalize your experience.</small></span><input type="checkbox" id="cookie-personalization"></label><p>Your choice is stored in this browser for 180 days. You can change it using Cookie settings in the footer. Payments on Stripe are subject to Stripe's own privacy and cookie settings.</p><div class="cookie-actions"><button type="button" class="cookie-save">SAVE CHOICES</button><button type="button" class="cookie-accept">ACCEPT ALL</button></div>`;
  const reopen = document.createElement('button');
  reopen.type = 'button'; reopen.textContent = 'Cookie settings';
  const footer = document.querySelector('.footer-bottom-links') || document.querySelector('.checkout-support-bottom');
  if (!footer) reopen.className = 'cookie-settings-fallback';
  (footer || document.body).append(reopen);
  document.body.append(banner, dialog);
  let trigger = null;
  function current() {
    return consent && consent.expiresAt > Date.now() ? { essential: true, analytics: consent.analytics, personalization: consent.personalization } : { essential: true, analytics: false, personalization: false };
  }
  function update() {
    banner.hidden = Boolean(consent && consent.expiresAt > Date.now());
    dialog.querySelector('#cookie-analytics').checked = current().analytics;
    dialog.querySelector('#cookie-personalization').checked = current().personalization;
  }
  function save(analytics, personalization) {
    consent = { version: 1, analytics, personalization, expiresAt: Date.now() + lifetime };
    try { localStorage.setItem(storageKey, JSON.stringify(consent)); } catch {}
    update();
    if (dialog.open) dialog.close();
    window.dispatchEvent(new CustomEvent('store-consent-change', { detail: current() }));
  }
  function open(event) {
    trigger = event.currentTarget;
    update();
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('cookie-dialog-open');
  }
  banner.querySelector('.cookie-decline').addEventListener('click', () => save(false, false));
  [banner, dialog].forEach(element => element.querySelector('.cookie-accept').addEventListener('click', () => save(true, true)));
  banner.querySelector('.cookie-customize').addEventListener('click', open);
  banner.querySelector('.cookie-learn').addEventListener('click', open);
  reopen.addEventListener('click', open);
  dialog.querySelector('.cookie-close').addEventListener('click', () => dialog.close());
  dialog.querySelector('.cookie-save').addEventListener('click', () => save(dialog.querySelector('#cookie-analytics').checked, dialog.querySelector('#cookie-personalization').checked));
  dialog.addEventListener('close', () => {
    document.body.classList.remove('cookie-dialog-open');
    if (trigger?.isConnected && !trigger.closest('[hidden]')) trigger.focus(); else reopen.focus();
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    consent = read(event.key === null ? null : event.newValue);
    update();
    window.dispatchEvent(new CustomEvent('store-consent-change', { detail: current() }));
  });
  window.StoreConsent = Object.freeze({ get: current, allows: category => current()[category] === true });
  update();
})();
