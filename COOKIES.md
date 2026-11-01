# Cookie choices

The shared cookie banner runs on the storefront, product pages, checkout and
payment result page. It does not load third-party scripts or analytics tools.

- Decline: keep essential storage only.
- Set cookies / Learn more: open category preferences.
- Accept all: allow both optional categories.
- Footer Cookie settings: reopen and change preferences.

Choices expire after 180 days in the same browser. Invalid or expired records
prompt again. Essential shopping bag and wishlist storage remains available.
If localStorage is unavailable, the choice lasts only for the current page.

Future optional scripts must check StoreConsent.allows('analytics') or
StoreConsent.allows('personalization') before loading. They must also handle
the store-consent-change event, including withdrawal of a previous choice.
The banner alone does not block scripts added elsewhere in the future.

Hosted Stripe pages handle their own cookies and payment data.
