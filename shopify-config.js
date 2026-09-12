/* ============================================================
   Shopify connection (Storefront API, headless).
   Leave `domain` or `storefrontToken` empty and the shop runs in
   DEMO MODE: the 25 designs appear as placeholder products with
   placeholder prices, and checkout is disabled.

   How to connect (see README.md for the full walkthrough):
   1. In Shopify admin install the "Headless" sales channel and
      create a storefront → copy the PUBLIC access token.
   2. Create one product per design. The product HANDLE must equal
      the design slug in cards.js (e.g. "dark-magician") so the shop
      can render the frame preview. Add variants for the mount
      option (e.g. "Stand" / "Wall mount").
   3. Fill in domain + token below and publish.
   ============================================================ */
const SHOPIFY = {
  domain: '',                 // e.g. 'overslab.myshopify.com'
  storefrontToken: '',        // public Storefront API access token — safe to ship to the browser
  apiVersion: '2026-04',      // Storefront API version, see shopify.dev/docs/api/usage/versioning
  currency: 'EUR',            // demo mode only; live prices come from Shopify
};
