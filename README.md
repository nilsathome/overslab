# OVERSLAB

Website + shop for extended-art frames around PSA-graded Yu-Gi-Oh! Overframe cards. Static site, no build step – works on GitHub Pages.

## Files

| File | Purpose |
|---|---|
| `index.html` | Landing page |
| `shop.html` | Shop (product grid, product sheet, cart) |
| `styles.css` | Shared styles for both pages |
| `cards.js` | The designs (`CARDS`), series list, slab/frame renderer |
| `shopify-config.js` | Shopify connection – **the only file you need to edit to go live** |
| `shop.js` | Storefront API client + shop UI (demo fallback when not connected) |
| `img/cards/` | One image per design, `<slug>.jpg` |

Preview locally:

```bash
python3 -m http.server 8765
```

## Adding a design

1. Put the card image at `img/cards/<slug>.jpg` (extended-art scan, portrait).
2. Add one line to the `CARDS` array in `cards.js` (slug, name, series, set, code, rarity, glow colour; `soon: 'Oct 2026'` for unreleased cards).
3. In Shopify, create a product whose **handle equals the slug** (see below).

## Connecting Shopify

The shop is headless: this static site talks to the **Shopify Storefront API** directly from the browser and hands the customer to Shopify's hosted checkout. Until it is connected, the shop runs in **demo mode** (placeholder products/prices, checkout disabled, banner at the top).

### 1. Create the store and the Storefront token

1. Create a Shopify store (any plan; Basic is enough).
2. In the admin go to **Sales channels → add the "Headless" channel** (Shopify's official channel for custom storefronts).
3. Inside Headless, **create a storefront** and copy the **public access token**. Public tokens are meant to be shipped to the browser – that is the one you need. (Never put a *private* token in this repo.)
4. Make sure the storefront has at least these permissions: *unauthenticated_read_product_listings*, *unauthenticated_write_checkouts*, *unauthenticated_read_checkouts*. These are on by default.

### 2. Create the products

One product per design. The shop matches products to designs by **handle**:

| Shopify field | Value |
|---|---|
| Title | e.g. `Blue-Eyes White Dragon, the White Phantom Beast` |
| Handle (URL) | must equal the slug in `cards.js`, e.g. `blue-eyes` |
| Option | `Mount` with values `Stand` and `Wall mount` (or whatever you offer) |
| Price | per variant |
| Description | optional – shown in the product sheet; a default text is used when empty |
| Image | optional – the site renders the frame preview itself from `img/cards/` |

Products whose handle has no matching design still appear (with their Shopify image), so you can sell accessories too.

Publish every product to the **Headless** sales channel, otherwise the Storefront API will not return it.

### 3. Fill in `shopify-config.js`

```js
const SHOPIFY = {
  domain: 'your-store.myshopify.com',
  storefrontToken: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  apiVersion: '2026-04',
  currency: 'EUR',
};
```

Commit, push, done. The demo banner disappears, products and prices come from Shopify, the cart is a real Shopify cart (persisted in `localStorage`) and **Checkout** opens Shopify's checkout with your payment providers, shipping rates and taxes.

### Going further

- **Custom domain for checkout:** set your domain in Shopify so the checkout URL shows `shop.yourdomain.com` instead of `*.myshopify.com`.
- **Analytics / pixels:** add them in Shopify's checkout settings; for the site itself add the snippet to both HTML files.
- **Inventory:** sold-out variants are disabled automatically (`availableForSale`).

## Legal

Image sources: Yugipedia card scans and own photos. Yu-Gi-Oh! and all artwork are the property of Konami; PSA is a trademark of Collectors Universe. OVERSLAB is not affiliated with either.
