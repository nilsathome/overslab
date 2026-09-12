#!/usr/bin/env node
/* ============================================================
   OVERSLAB → Shopify product sync (Admin GraphQL API)

   Creates or updates one Shopify product per design in cards.js
   (handle = slug, option "Mount" with the variants below, card
   image, price), publishes them to your sales channels, then
   writes the variant IDs into shopify-config.js so the shop's
   checkout-links mode is ready to go.

   Setup (once):
     1. Dev Dashboard (dev.shopify.com/dashboard) → Create app →
        API access: scopes  write_products, read_products,
        write_publications, read_publications  → release version.
     2. Install the app on your store (Dev Dashboard → Test on store).
     3. Copy .env.example to .env and fill in store + client id/secret.

   Usage:
     node scripts/shopify-sync.js --dry-run     # show what would happen
     node scripts/shopify-sync.js               # create / update everything
     node scripts/shopify-sync.js --only blue-eyes,ra
     node scripts/shopify-sync.js --no-publish  # skip sales-channel publishing

   Needs Node 18+ (built-in fetch). No dependencies.
   ============================================================ */
'use strict';
let canPublish = false;
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ---------- Catalog: what gets created in Shopify ---------- */
const CATALOG = {
  mounts: [                     // one variant per mount option
    {name: 'Stand',      price: 49},
    {name: 'Wall mount', price: 49},
  ],
  overrides: {                  // per-design price, e.g. 'blue-eyes': {price: 59}
  },
  vendor: 'OVERSLAB',
  productType: 'Display frame',
  tags: ['overframe', 'psa', 'yugioh'],
  description: (c) => `<p>Extended-art display frame for a PSA-graded <strong>${c.name}</strong> (${c.code}). ` +
    `Black acrylic, direct UV print of the card's Overframe illustration, milled to the exact PSA holder size. ` +
    `Empty display slab included – use it before your card is graded and swap in the PSA slab later. ` +
    `Slab slides in from the top, no glue, no tools.</p>`,
  // Card images must be reachable by Shopify over HTTPS. Default: the GitHub repo.
  imageBase: process.env.IMAGE_BASE_URL || 'https://raw.githubusercontent.com/nilsathome/overslab/main/img/cards/',
};

/* ---------- CLI + env ---------- */
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const NO_PUBLISH = args.includes('--no-publish');
const ONLY = args.includes('--only') ? (args[args.indexOf('--only') + 1] || '').split(',').filter(Boolean) : [];
if (args.includes('--only') && !ONLY.length) die('--only needs a comma-separated list of slugs');

const ROOT = path.resolve(__dirname, '..');
loadEnv(path.join(ROOT, '.env'));
const STORE = (process.env.SHOPIFY_STORE || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID, CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-04';
if (!STORE || !CLIENT_ID || !CLIENT_SECRET) die('Missing SHOPIFY_STORE / SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET – see .env.example');
if (typeof fetch !== 'function') die('Node 18 or newer is required');

/* ---------- Designs from cards.js (browser script → evaluate in a sandbox) ---------- */
let cards = vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'cards.js'), 'utf8') + '\n;CARDS', {});
if (ONLY.length) {
  const missing = ONLY.filter(s => !cards.some(c => c.slug === s));
  if (missing.length) die(`Unknown slug(s): ${missing.join(', ')}`);
  cards = cards.filter(c => ONLY.includes(c.slug));
}

/* ---------- Main ---------- */
(async () => {
  log(`${DRY ? '[DRY RUN] ' : ''}Syncing ${cards.length} design(s) to ${STORE} (API ${API_VERSION})`);
  const token = DRY ? null : await getToken();
  const api = token ? makeApi(token) : null;

  const publications = (!DRY && !NO_PUBLISH && canPublish) ? await listPublications(api) : [];
  if (publications.length) log(`Sales channels: ${publications.map(p => p.name).join(', ')}`);

  const result = {};      // slug → [{variantId, title, price, available}]
  let created = 0, updated = 0;

  for (const c of cards) {
    const input = buildInput(c);
    const existing = DRY ? null : await findByHandle(api, c.slug);
    const action = existing ? 'update' : 'create';
    if (DRY) { log(`  ${c.slug.padEnd(18)} would create/update  ${input.variants.map(v => `${v.optionValues[0].name} ${v.price}`).join(' · ')}${c.soon ? '  (draft – ' + c.soon + ')' : ''}`); continue; }

    if (existing) { input.id = existing.id; delete input.files; }   // never re-upload images on update
    const product = await productSet(api, input);
    if (existing) updated++; else created++;

    if (publications.length) await publish(api, product.id, publications);

    result[c.slug] = product.variants.nodes.map(v => ({
      variantId: v.id.replace(/^gid:\/\/shopify\/ProductVariant\//, ''),
      title: v.title, price: +v.price, available: !c.soon,
    }));
    log(`  ${c.slug.padEnd(18)} ${action.padEnd(6)} ${product.id.replace('gid://shopify/Product/', '#')}  ${result[c.slug].map(v => `${v.title} → ${v.variantId}`).join(' · ')}`);
  }

  if (DRY) { log('Nothing written.'); return; }
  writeConfig(result);
  log(`Done: ${created} created, ${updated} updated. shopify-config.js updated → commit & push to go live.`);
})().catch(e => die(e.message || e));

/* ---------- Shopify helpers ---------- */
async function getToken(){
  const res = await fetch(`https://${STORE}/admin/oauth/access_token`, {
    method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET}),
  });
  if (!res.ok) die(`Token request failed (${res.status}): ${await res.text()}\nIs the app installed on ${STORE} and does the store belong to the same organization as the app?`);
  const json = await res.json();
  const have = (json.scope || '').split(',');
  if (!have.includes('write_products')) die(`App is missing the write_products scope (has: ${json.scope}). Add it in the Dev Dashboard and release a new version.`);
  canPublish = have.includes('write_publications');
  if (!canPublish) warn('no write_publications scope – products will not be published to sales channels (do it in the admin, or add the scope and re-run)');
  return json.access_token;
}
function makeApi(token){
  return async function gql(query, variables = {}){
    const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      method: 'POST', headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': token},
      body: JSON.stringify({query, variables}),
    });
    const json = await res.json();
    if (json.errors) throw new Error('GraphQL: ' + json.errors.map(e => e.message).join('; '));
    return json.data;
  };
}
async function findByHandle(api, handle){
  const d = await api(`query($id: ProductIdentifierInput!) { productByIdentifier(identifier: $id) { id handle } }`, {id: {handle}});
  return d.productByIdentifier;
}
async function productSet(api, input){
  const d = await api(`mutation($input: ProductSetInput!) {
    productSet(input: $input, synchronous: true) {
      product { id handle status variants(first: 20) { nodes { id title price } } }
      userErrors { field message }
    }
  }`, {input});
  const r = d.productSet;
  if (r.userErrors.length) throw new Error(`${input.handle}: ${r.userErrors.map(e => `${(e.field || []).join('.')} ${e.message}`).join('; ')}`);
  return r.product;
}
async function listPublications(api){
  const d = await api(`{ publications(first: 25) { nodes { id name } } }`);
  return d.publications.nodes;
}
async function publish(api, productId, publications){
  const d = await api(`mutation($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) { userErrors { field message } }
  }`, {id: productId, input: publications.map(p => ({publicationId: p.id}))});
  const errs = d.publishablePublish.userErrors.filter(e => !/already published/i.test(e.message));
  if (errs.length) warn(`publish ${productId}: ${errs.map(e => e.message).join('; ')}`);
}

/* ---------- Build the ProductSetInput for one design ---------- */
function buildInput(c){
  const price = (CATALOG.overrides[c.slug] || {}).price;
  return {
    title: c.name,
    handle: c.slug,
    descriptionHtml: CATALOG.description(c),
    vendor: CATALOG.vendor,
    productType: CATALOG.productType,
    tags: [...CATALOG.tags, c.series.toLowerCase().replace(/[^a-z0-9]+/g, '-')],
    status: c.soon ? 'DRAFT' : 'ACTIVE',
    productOptions: [{name: 'Mount', position: 1, values: CATALOG.mounts.map(m => ({name: m.name}))}],
    variants: CATALOG.mounts.map(m => ({
      optionValues: [{optionName: 'Mount', name: m.name}],
      price: String((price ?? m.price).toFixed(2)),
      inventoryPolicy: 'CONTINUE',            // made to order – never "sold out" by stock
      inventoryItem: {tracked: false},
    })),
    files: [{originalSource: CATALOG.imageBase + c.slug + '.jpg', contentType: 'IMAGE', alt: c.name}],
  };
}

/* ---------- Write shopify-config.js ---------- */
function writeConfig(synced){
  const file = path.join(ROOT, 'shopify-config.js');
  // Merge: keep existing entries (and token/currency) for designs not synced in this run
  let old = {};
  try { old = vm.runInNewContext(fs.readFileSync(file, 'utf8') + '\n;SHOPIFY', {}) || {}; } catch(e) { warn('could not parse existing shopify-config.js – starting fresh'); }
  const keep = (key, fallback) => (old[key] != null && old[key] !== '') ? old[key] : fallback;
  const products = {...(old.products || {}), ...synced};
  const lines = Object.entries(products).map(([slug, vs]) =>
    `    '${slug}': [\n` + vs.map(v => `      {variantId: '${v.variantId}', title: ${JSON.stringify(v.title)}, price: ${v.price}${v.available ? '' : ', available: false'}},`).join('\n') + '\n    ],');
  const out = `/* ============================================================
   Shopify connection – GENERATED by scripts/shopify-sync.js on ${new Date().toISOString().slice(0,10)}.
   Re-run the script after changing designs or prices; edit only
   storefrontToken / apiVersion by hand.

   Mode A (checkout links, every plan): domain + products below.
   Mode B (Storefront API, Basic+):     additionally set storefrontToken.
   ============================================================ */
const SHOPIFY = {
  domain: '${STORE}',
  currency: '${keep('currency', 'EUR')}',

  /* Mode A: variant IDs per design slug (see cards.js) */
  products: {
${lines.join('\n')}
  },

  /* Mode B */
  storefrontToken: '${keep('storefrontToken', '')}',
  apiVersion: '${keep('apiVersion', '2026-04')}',
};
`;
  fs.writeFileSync(file, out);
}

/* ---------- misc ---------- */
function loadEnv(file){
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (!m || line.trim().startsWith('#')) continue;
    if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
function log(s){ console.log(s); }
function warn(s){ console.warn('  ! ' + s); }
function die(s){ console.error('Error: ' + s); process.exit(1); }
