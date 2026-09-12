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
| `scripts/shopify-sync.js` | Creates/updates the Shopify products from `cards.js` and fills `shopify-config.js` |
| `img/cards/` | One image per design, `<slug>.jpg` |

Preview locally:

```bash
python3 -m http.server 8765
```

## Adding a design

1. Put the card image at `img/cards/<slug>.jpg` (extended-art scan, portrait).
2. Add one line to the `CARDS` array in `cards.js` (slug, name, series, set, code, rarity, glow colour; `soon: 'Oct 2026'` for unreleased cards).
3. Run `node scripts/shopify-sync.js` – it creates the Shopify product and updates `shopify-config.js` (see below).

## Connecting Shopify

The site is static; Shopify only handles checkout, payment and orders. Until a store is configured the shop runs in **demo mode** (placeholder products/prices, checkout disabled, banner at the top). Everything is configured in **`shopify-config.js`** – pick one of two modes.

### Mode A – Checkout links (works on every plan, including Starter and trial)

The shop page needs no API. The cart lives in the browser; **Checkout** sends the customer to a Shopify *cart permalink* (`https://your-store.myshopify.com/cart/VARIANT:QTY,VARIANT:QTY`) and Shopify's hosted checkout takes over with your payment providers, shipping and taxes.

The products themselves are created for you by `scripts/shopify-sync.js` through the **Admin API** (available on every plan):

**One-time setup**

1. Create the store. Any plan works – this is exactly what the Starter plan is built for.
2. Create a free developer account and open the [Dev Dashboard](https://dev.shopify.com/dashboard). *Create app* → any name → **API access** → add the scopes `write_products`, `read_products`, `write_publications`, `read_publications` → *Release* the version.
3. Install the app on your store (*Test on store* / *Install*). The store must belong to the same organization as the app.
4. Copy the app's **Client ID** and **Client secret** into a local `.env` (copy `.env.example`; `.env` is git-ignored and must never be committed).

**Every time designs or prices change**

```bash
node scripts/shopify-sync.js --dry-run   # preview
node scripts/shopify-sync.js             # create / update all products, write shopify-config.js
node scripts/shopify-sync.js --only blue-eyes,ra
```

For each design in `cards.js` the script creates (or updates, matched by handle) a product with the title, description, card image (loaded from this repo on GitHub, so push first), the **Mount** option (`Stand` / `Wall mount` – edit `CATALOG` at the top of the script to change variants or prices), publishes it to all your sales channels and writes the variant IDs into `shopify-config.js`. Unreleased designs (`soon:` in `cards.js`) are created as drafts. Commit and push the updated config and the shop is live.

Prefer to do it by hand? Create the products in the admin, read each variant ID from its URL (`…/variants/48211234567890`) and fill the map yourself:

```js
const SHOPIFY = {
  domain: 'your-store.myshopify.com',
  currency: 'EUR',
  products: {
    'dark-magician': [
      {variantId: '48211234567890', title: 'Stand',      price: 49},
      {variantId: '48211234567891', title: 'Wall mount', price: 49},
    ],
    'blue-eyes': [ /* … */ ],
  },
  storefrontToken: '',
};
```

Designs without an entry show as "Not in the shop yet". Prices in the config are only for display – Shopify always charges its own price, so keep them in sync.

### Mode B – Storefront API (Basic plan and up)

Products, prices, stock and the cart come live from Shopify; nothing to keep in sync.

1. **Token.** In the admin add the **Headless** sales channel, create a storefront and copy the **public** access token. On plans without Headless you can also install the free **Buy Button** channel, generate any button, and copy `domain` and `storefrontAccessToken` out of the embed code – it is the same kind of public token. Never put a *private* token in this repo.
2. **Products.** One per design; the product **handle** must equal the slug in `cards.js` (e.g. `blue-eyes`). Add the mount option as variants. Publish each product to the channel the token belongs to (Headless or Buy Button).
3. Set `domain` and `storefrontToken` in `shopify-config.js`; the `products` map is then ignored.

### Which one?

| | Checkout links | Storefront API |
|---|---|---|
| Plan | any | Basic+ (or Buy Button token) |
| Prices / stock | maintained in config | live from Shopify |
| Cart | browser | Shopify cart, survives devices |
| Effort to go live | 10 min | 20 min |

Start with links; switching to the API later is a config change only.

### Going further

- **Custom domain:** set it in Shopify so checkout shows your domain instead of `*.myshopify.com`.
- **Analytics / pixels:** add them in Shopify's checkout settings; for the site itself add the snippet to both HTML files.

## Legal

Image sources: Yugipedia card scans and own photos. Yu-Gi-Oh! and all artwork are the property of Konami; PSA is a trademark of Collectors Universe. OVERSLAB is not affiliated with either.
