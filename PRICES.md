# Store prices

The catalogue stores the original EUR values. loja-config.js applies these
steps to every valid product price, including custom price overrides:

1. Reduce the original price by 30%, rounded to cents.
2. Apply another 10% discount to that reduced price, rounded to cents.

Example: EUR 100 -> EUR 70 -> EUR 63. This is a 37% total reduction,
not a 40% reduction. EUR 295 -> EUR 206.50 -> EUR 185.85.

The storefront shows the reduced price crossed out, the final price and a
10% OFF label. The cart and Stripe charge the final price; no coupon is needed.
The additional discount must not be applied again at payment.

StorePricing in loja-config.js is shared by the storefront, cart and server.
Original catalogue prices remain available as the source for future changes;
reloading the page never applies the reduction a second time.
