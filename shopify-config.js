/* ============================================================
   Shopify connection. Pick ONE of the two modes below.
   Leave everything empty and the shop runs in DEMO MODE
   (placeholder products, checkout disabled).

   MODE A – Checkout links   (works on EVERY plan, incl. Starter/trial)
     Set `domain` and fill `products` with your variant IDs + prices.
     The cart lives in the browser; "Checkout" sends the customer to
     https://<domain>/cart/<variantId>:<qty>,... and Shopify takes over.
     Variant ID: Shopify admin → Products → product → click the variant;
     the number at the end of the URL (…/variants/48211234567890).

   MODE B – Storefront API    (Basic plan and up, or a Buy Button token)
     Set `domain` and `storefrontToken`. Products, prices and the cart
     then come live from Shopify; `products` below is ignored.
     Product HANDLE must equal the design slug in cards.js.
   ============================================================ */
const SHOPIFY = {
  domain: '',                 // e.g. 'overslab.myshopify.com'
  currency: 'EUR',            // used for Mode A and demo mode

  /* MODE A: one entry per design slug (see cards.js), one line per variant */
  products: {
    // 'dark-magician': [
    //   {variantId: '48211234567890', title: 'Stand',      price: 49},
    //   {variantId: '48211234567891', title: 'Wall mount', price: 49},
    // ],
    // 'blue-eyes': [
    //   {variantId: '48211234567892', title: 'Stand',      price: 49, available: false}, // sold out
    // ],
  },

  /* MODE B */
  storefrontToken: '',        // public Storefront API access token (Headless channel or Buy Button embed code)
  apiVersion: '2026-04',      // see shopify.dev/docs/api/usage/versioning
};
