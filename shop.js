/* ============================================================
   OVERSLAB shop — Shopify Storefront API client + UI.
   Requires cards.js and shopify-config.js to be loaded first.
   ============================================================ */
(function(){
  /* Modes:
     storefront – domain + storefrontToken set: products & cart via Storefront API (Basic plan and up, or a Buy Button token)
     links      – domain + products map set:   products from config, local cart, checkout via Shopify cart permalink (works on every plan)
     demo       – nothing configured:          placeholder products, checkout disabled */
  const MODE = SHOPIFY.domain && SHOPIFY.storefrontToken ? 'storefront'
             : SHOPIFY.domain && SHOPIFY.products && Object.keys(SHOPIFY.products).length ? 'links'
             : 'demo';
  const DEMO = MODE === 'demo', LOCAL = MODE !== 'storefront';
  const $ = id => document.getElementById(id);
  const money = (amount, currency) => new Intl.NumberFormat('en', {style:'currency', currency}).format(amount);

  /* ---------- Storefront API ---------- */
  async function gql(query, variables = {}){
    const res = await fetch(`https://${SHOPIFY.domain}/api/${SHOPIFY.apiVersion}/graphql.json`, {
      method:'POST',
      headers:{'Content-Type':'application/json', 'X-Shopify-Storefront-Access-Token': SHOPIFY.storefrontToken},
      body: JSON.stringify({query, variables}),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors.map(e => e.message).join('; '));
    return json.data;
  }
  const CART_FIELDS = `
    id checkoutUrl totalQuantity
    cost { subtotalAmount { amount currencyCode } }
    lines(first: 100) { edges { node {
      id quantity
      merchandise { ... on ProductVariant {
        id title price { amount currencyCode }
        product { handle title }
      } }
    } } }`;

  /* ---------- Products ---------- */
  // Normalized product: {id, handle, title, description, image, card, variants:[{id,title,price,currency,available}]}
  function demoProduct(c){
    const variants = [];
    for (const mount of ['Stand', 'Wall mount']) for (const slab of ['Frame only', 'With display slab'])
      variants.push({id:`demo:${c.slug}:${mount}:${slab}`, title:`${mount} / ${slab}`, price: DEMO_PRICE.frame + (slab === 'Frame only' ? 0 : DEMO_PRICE.slab), currency: SHOPIFY.currency, available: !c.soon});
    return {id:`demo:${c.slug}`, handle:c.slug, title:c.name, description:'', image:null, card:c, variants};
  }
  // links mode: variants come from SHOPIFY.products[slug] = [{variantId, title, price}]
  function linksProduct(c){
    const conf = SHOPIFY.products[c.slug] || [];
    return {id:`links:${c.slug}`, handle:c.slug, title:c.name, description:'', image:null, card:c,
      variants: conf.map(v => ({id: String(v.variantId), title: v.title, price: +v.price, currency: SHOPIFY.currency, available: !c.soon && v.available !== false}))};
  }
  async function loadProducts(){
    if (DEMO) return CARDS.map(demoProduct);
    if (MODE === 'links') return CARDS.map(linksProduct);
    const data = await gql(`{
      products(first: 100, sortKey: TITLE) { edges { node {
        id handle title description featuredImage { url }
        variants(first: 20) { edges { node { id title availableForSale price { amount currencyCode } } } }
      } } }
    }`);
    return data.products.edges.map(({node}) => ({
      id: node.id, handle: node.handle, title: node.title, description: node.description,
      image: node.featuredImage && node.featuredImage.url, card: bySlug(node.handle),
      variants: node.variants.edges.map(({node: v}) => ({id: v.id, title: v.title, price: +v.price.amount, currency: v.price.currencyCode, available: v.availableForSale})),
    }));
  }

  /* ---------- Cart ---------- */
  // Normalized cart: {id, checkoutUrl, count, subtotal, currency, lines:[{id, qty, variantId, title, variantTitle, price, currency, handle}]}
  const CART_KEY = 'overslab.cart.' + MODE + '.' + (SHOPIFY.domain || 'demo');
  const emptyCart = () => ({id:null, checkoutUrl:null, count:0, subtotal:0, currency:SHOPIFY.currency, lines:[]});
  let cart = emptyCart();

  function normalizeCart(c){
    const lines = c.lines.edges.map(({node}) => ({
      id: node.id, qty: node.quantity, variantId: node.merchandise.id,
      title: node.merchandise.product.title, handle: node.merchandise.product.handle,
      variantTitle: node.merchandise.title, price: +node.merchandise.price.amount, currency: node.merchandise.price.currencyCode,
    }));
    return {id:c.id, checkoutUrl:c.checkoutUrl, count:c.totalQuantity, subtotal:+c.cost.subtotalAmount.amount, currency:c.cost.subtotalAmount.currencyCode, lines};
  }
  function recalcDemo(){
    cart.count = cart.lines.reduce((n,l) => n + l.qty, 0);
    cart.subtotal = cart.lines.reduce((n,l) => n + l.qty * l.price, 0);
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch(e){}
  }
  async function cartLoad(){
    try {
      if (LOCAL) { const saved = localStorage.getItem(CART_KEY); if (saved) cart = JSON.parse(saved); return; }
      const id = localStorage.getItem(CART_KEY);
      if (!id) return;
      const data = await gql(`query($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`, {id});
      if (data.cart) cart = normalizeCart(data.cart); else localStorage.removeItem(CART_KEY);
    } catch(e){ console.warn('cart load failed', e); }
  }
  async function cartAdd(product, variant, qty){
    if (LOCAL) {
      const line = cart.lines.find(l => l.variantId === variant.id);
      if (line) line.qty += qty;
      else cart.lines.push({id: variant.id, qty, variantId: variant.id, title: product.title, handle: product.handle, variantTitle: variant.title, price: variant.price, currency: variant.currency});
      recalcDemo(); return;
    }
    const lines = [{merchandiseId: variant.id, quantity: qty}];
    let data;
    if (cart.id) {
      data = await gql(`mutation($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }`, {cartId: cart.id, lines});
      data = data.cartLinesAdd;
    } else {
      data = await gql(`mutation($lines: [CartLineInput!]) { cartCreate(input: {lines: $lines}) { cart { ${CART_FIELDS} } userErrors { message } } }`, {lines});
      data = data.cartCreate;
    }
    if (data.userErrors.length) throw new Error(data.userErrors[0].message);
    cart = normalizeCart(data.cart);
    localStorage.setItem(CART_KEY, cart.id);
  }
  async function cartSetQty(lineId, qty){
    if (LOCAL) {
      cart.lines = qty > 0 ? cart.lines.map(l => l.id === lineId ? {...l, qty} : l) : cart.lines.filter(l => l.id !== lineId);
      recalcDemo(); return;
    }
    const data = qty > 0
      ? (await gql(`mutation($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }`, {cartId: cart.id, lines:[{id: lineId, quantity: qty}]})).cartLinesUpdate
      : (await gql(`mutation($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART_FIELDS} } userErrors { message } } }`, {cartId: cart.id, lineIds:[lineId]})).cartLinesRemove;
    if (data.userErrors.length) throw new Error(data.userErrors[0].message);
    cart = normalizeCart(data.cart);
  }

  /* ---------- UI: product grid ---------- */
  let products = [];
  const grid = $('products');
  function previewHTML(p, cls = 'piece'){
    if (p.card) return `<div class="${cls}" aria-hidden="true" style="--art:url('img/cards/${p.card.slug}.jpg');--glow:${p.card.glow}">${pieceHTML(p.card)}</div>`;
    if (p.image) return `<img class="product-img" src="${esc(p.image)}" alt="">`;
    return `<div class="${cls} placeholder" aria-hidden="true"></div>`;
  }
  function priceLabel(p){
    if (!p.variants.length) return 'Coming soon';
    const prices = p.variants.map(v => v.price);
    const min = Math.min(...prices), max = Math.max(...prices), cur = p.variants[0]?.currency || SHOPIFY.currency;
    return min === max ? money(min, cur) : `from ${money(min, cur)}`;
  }
  function renderGrid(){
    grid.innerHTML = products.map(p => {
      const c = p.card, soldOut = p.variants.length && !p.variants.some(v => v.available);
      return `
      <button class="tile product" type="button" data-handle="${esc(p.handle)}" data-series="${esc(c ? c.series : 'Other')}" style="--glow:${c ? c.glow : '#6d3fb0'}" aria-label="${esc(p.title)}, ${esc(priceLabel(p))}">
        <div class="tglow"></div>
        ${c && c.soon ? `<span class="soon">${esc(c.soon)}</span>` : soldOut ? '<span class="soon">Sold out</span>' : ''}
        ${previewHTML(p)}
        <div class="tile-meta"><h3>${esc(p.title)}</h3></div>
        <div class="tile-sub"><span>${esc(c ? c.series : '')}</span><span class="price">${esc(priceLabel(p))}</span></div>
        <div class="glare"></div>
      </button>`;
    }).join('');
  }

  /* Filters */
  const filters = $('filters');
  function renderFilters(){
    const present = new Set(products.map(p => p.card ? p.card.series : 'Other'));
    const all = [{label:'All', key:'*'}, ...SERIES.filter(s => present.has(s)).map(s => ({label:s, key:s}))];
    if (present.has('Other')) all.push({label:'Other', key:'Other'});
    filters.innerHTML = all.map((f,i) => `<button class="chip" type="button" data-key="${esc(f.key)}" aria-pressed="${i===0}">${esc(f.label)}</button>`).join('') + `<span class="count" id="count"></span>`;
  }
  function applyFilter(key){
    let n = 0;
    grid.querySelectorAll('.product').forEach(t => { const show = key === '*' || t.dataset.series === key; t.hidden = !show; if (show) n++; });
    $('count').textContent = `${n} ${n === 1 ? 'design' : 'designs'}`;
    filters.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.key === key));
  }
  filters.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) applyFilter(b.dataset.key); });

  /* ---------- UI: drawers ---------- */
  const backdrop = $('backdrop');
  let openDrawer = null;
  function open(el){
    if (openDrawer && openDrawer !== el) openDrawer.classList.remove('open');
    openDrawer = el; el.classList.add('open'); el.removeAttribute('aria-hidden'); backdrop.classList.add('show');
    document.body.style.overflow = 'hidden';
    const f = el.querySelector('[autofocus], button, [href], input'); if (f) f.focus({preventScroll:true});
  }
  function closeAll(){
    if (openDrawer) { openDrawer.classList.remove('open'); openDrawer.setAttribute('aria-hidden','true'); }
    openDrawer = null; backdrop.classList.remove('show'); document.body.style.overflow = '';
    if (history.state && history.state.design) history.replaceState({}, '', location.pathname);
  }
  backdrop.addEventListener('click', closeAll);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeAll));

  /* Product sheet */
  const sheet = $('sheet');
  let current = null, currentVariant = null, qty = 1;
  function openProduct(handle){
    const p = products.find(x => x.handle === handle); if (!p) return;
    current = p; currentVariant = p.variants.find(v => v.available) || p.variants[0] || null; qty = 1;
    const c = p.card;
    $('sheetVisual').innerHTML = previewHTML(p, 'piece big');
    $('sheetVisual').style.setProperty('--glow', c ? c.glow : '#6d3fb0');
    $('sheetTitle').textContent = p.title;
    $('sheetMeta').textContent = c ? `${c.series} · ${c.code}` : '';
    $('sheetDesc').textContent = p.description || `Extended-art frame for a PSA-graded ${p.title}. Add an empty display slab to use it before the card is graded. Black acrylic, direct UV print, slab slides in from the top.`;
    renderVariants(); renderQty();
    history.replaceState({design: handle}, '', `?design=${encodeURIComponent(handle)}`);
    open(sheet);
  }
  // Variant titles are "Value1 / Value2" (one value per option) → render one chip group per option
  const parts = v => v.title.split(' / ');
  function renderVariants(){
    const p = current, sel = currentVariant ? parts(currentVariant) : [];
    const nOpts = p.variants.length ? parts(p.variants[0]).length : 0;
    const names = (typeof OPTION_NAMES !== 'undefined' ? OPTION_NAMES : []);
    $('sheetVariants').innerHTML = Array.from({length: nOpts}, (_, i) => {
      const values = [...new Set(p.variants.map(v => parts(v)[i]))];
      return `<div class="opt"><span class="opt-label">${esc(names[i] || 'Option ' + (i + 1))}</span><div class="opt-chips">` + values.map(val => {
        // the variant this chip would select: current selection with option i swapped
        const want = sel.map((s, j) => j === i ? val : s);
        const target = p.variants.find(v => parts(v).every((x, j) => x === want[j])) || p.variants.find(v => parts(v)[i] === val);
        const diff = target && currentVariant && i > 0 ? target.price - p.variants.find(v => parts(v)[0] === parts(target)[0] && parts(v)[i] === values[0]).price : 0;
        return `<button class="chip variant" type="button" data-id="${esc(target ? target.id : '')}" aria-pressed="${sel[i] === val}" ${target && target.available ? '' : 'disabled'}>${esc(val)}${diff > 0 ? ` <span class="plus">+${money(diff, target.currency)}</span>` : ''}</button>`;
      }).join('') + `</div></div>`;
    }).join('');
    const c = p.card, can = !!currentVariant && currentVariant.available && !(c && c.soon);
    $('sheetPrice').textContent = currentVariant ? money(currentVariant.price * qty, currentVariant.currency) : '';
    $('addBtn').disabled = !can;
    $('addBtn').textContent = c && c.soon ? `Available ${c.soon}` : !currentVariant ? 'Not in the shop yet' : can ? 'Add to cart' : 'Sold out';
  }
  function renderQty(){ $('qtyVal').textContent = qty; if (currentVariant) $('sheetPrice').textContent = money(currentVariant.price * qty, currentVariant.currency); }
  $('sheetVariants').addEventListener('click', e => {
    const b = e.target.closest('.variant'); if (!b) return;
    currentVariant = current.variants.find(v => v.id === b.dataset.id); renderVariants();
  });
  $('qtyMinus').addEventListener('click', () => { qty = Math.max(1, qty - 1); renderQty(); });
  $('qtyPlus').addEventListener('click',  () => { qty = Math.min(10, qty + 1); renderQty(); });
  $('addBtn').addEventListener('click', async () => {
    const btn = $('addBtn'); btn.disabled = true; btn.textContent = 'Adding…';
    try { await cartAdd(current, currentVariant, qty); renderCart(); openCart(); }
    catch(e){ toast(e.message || 'Could not add to cart.'); }
    finally { btn.disabled = false; btn.textContent = 'Add to cart'; }
  });
  grid.addEventListener('click', e => { const t = e.target.closest('.product'); if (t) openProduct(t.dataset.handle); });

  /* Cart drawer */
  const cartEl = $('cart');
  function openCart(){ renderCart(); open(cartEl); }
  document.querySelectorAll('[data-open-cart]').forEach(b => b.addEventListener('click', openCart));
  function renderCart(){
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = cart.count; el.hidden = cart.count === 0; });
    const list = $('cartLines');
    if (!cart.lines.length) {
      list.innerHTML = `<p class="cart-empty">Your cart is empty.</p>`;
    } else {
      list.innerHTML = cart.lines.map(l => {
        const c = bySlug(l.handle);
        return `
        <div class="line" data-id="${esc(l.id)}">
          <div class="line-visual">${c ? `<div class="piece" aria-hidden="true" style="--art:url('img/cards/${c.slug}.jpg')">${pieceHTML(c)}</div>` : ''}</div>
          <div class="line-body">
            <div class="line-title">${esc(l.title)}</div>
            <div class="line-sub">${esc(l.variantTitle)}</div>
            <div class="line-row">
              <div class="qty"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button><span>${l.qty}</span><button type="button" data-qty="1" aria-label="Increase quantity">+</button></div>
              <div class="line-price">${money(l.price * l.qty, l.currency)}</div>
            </div>
          </div>
          <button class="line-remove" type="button" data-remove aria-label="Remove ${esc(l.title)}">×</button>
        </div>`;
      }).join('');
    }
    $('cartSubtotal').textContent = money(cart.subtotal, cart.currency);
    $('checkoutBtn').disabled = !cart.lines.length;
  }
  $('cartLines').addEventListener('click', async e => {
    const line = e.target.closest('.line'); if (!line) return;
    const l = cart.lines.find(x => x.id === line.dataset.id); if (!l) return;
    const q = e.target.closest('[data-qty]'), rm = e.target.closest('[data-remove]');
    if (!q && !rm) return;
    try { await cartSetQty(l.id, rm ? 0 : l.qty + (+q.dataset.qty)); renderCart(); }
    catch(err){ toast(err.message || 'Could not update the cart.'); }
  });
  $('checkoutBtn').addEventListener('click', () => {
    if (DEMO) { toast('Demo mode – connect your Shopify store in shopify-config.js to enable checkout.'); return; }
    if (MODE === 'links') {
      // Shopify cart permalink: /cart/<variantId>:<qty>,<variantId>:<qty> → straight into checkout
      const items = cart.lines.map(l => `${l.variantId}:${l.qty}`).join(',');
      location.href = `https://${SHOPIFY.domain}/cart/${items}`;
      return;
    }
    location.href = cart.checkoutUrl;
  });

  /* Toast */
  let toastTimer;
  function toast(msg){ const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4200); }

  /* Nav */
  const nav = $('nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  /* 3D tilt (hover devices only) */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(hover:hover)').matches) {
    grid.addEventListener('pointermove', e => {
      const tile = e.target.closest('.tile'); if (!tile) return;
      const r = tile.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      tile.style.transform = `perspective(1600px) rotateY(${(px-.5)*14}deg) rotateX(${(.5-py)*14}deg)`;
      tile.style.setProperty('--gx', px*100+'%'); tile.style.setProperty('--gy', py*100+'%');
    });
    grid.addEventListener('pointerout', e => { const tile = e.target.closest('.tile'); if (tile && !tile.contains(e.relatedTarget)) tile.style.transform = ''; });
  }

  /* ---------- Boot ---------- */
  (async () => {
    $('demoBanner').hidden = !DEMO;
    try {
      [products] = await Promise.all([loadProducts(), cartLoad()]);
    } catch(e) {
      grid.innerHTML = `<p class="shop-error">Could not load products from Shopify: ${esc(e.message)}. Check <code>shopify-config.js</code>.</p>`;
      return;
    }
    renderFilters(); renderGrid(); applyFilter('*'); renderCart();
    const design = new URLSearchParams(location.search).get('design');
    if (design) openProduct(design);
  })();
})();
