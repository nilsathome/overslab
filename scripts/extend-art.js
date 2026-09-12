#!/usr/bin/env node
/* ============================================================
   Extend the card illustration beyond the card (AI outpainting)
   so the frame shows unique artwork that continues seamlessly
   from the card window – instead of a zoomed copy of the scan.

   Uses Stability AI "Stable Image Outpaint" (≈4 credits ≈ $0.04 per
   image) and optionally "Fast Upscale" (1 credit) afterwards.
   Key: STABILITY_API_KEY in .env  (platform.stability.ai → API keys)

   Output: img/art/<slug>.jpg + img/art/manifest.js, which the site
   uses automatically (frame layer switches from zoom to extended art).

   Usage:
     node scripts/extend-art.js --dry-run              # geometry only, no API calls
     node scripts/extend-art.js --only blue-eyes       # one design (recommended first)
     node scripts/extend-art.js                        # all designs that have no img/art yet
     node scripts/extend-art.js --force --only ra      # regenerate (new random result)
     node scripts/extend-art.js --creativity 0.35      # 0–1, lower = closer to the original
     node scripts/extend-art.js --upscale              # 4× fast upscale after outpainting

   Geometry (must match styles.css):
     frame art area = piece inset 3.5 %; card window = top 26 %, sides 13.5 %, bottom 8 %.
     → card occupies 78.5 % of the art width and 71 % of its height,
       offset 10.75 % from the left and 24.2 % from the top.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {execFileSync} = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = (n, d) => args.includes(n) ? args[args.indexOf(n) + 1] : d;
const DRY = flag('--dry-run'), FORCE = flag('--force'), UPSCALE = flag('--upscale');
const CREATIVITY = +opt('--creativity', 0.4);
const ONLY = flag('--only') ? (opt('--only', '') || '').split(',').filter(Boolean) : [];

loadEnv(path.join(ROOT, '.env'));
const KEY = process.env.STABILITY_API_KEY;
if (!DRY && !KEY) die('Missing STABILITY_API_KEY in .env (platform.stability.ai → API keys)');

const CARD = {w: 0.785, h: 0.71, left: 0.1075, top: 0.242};   // card inside the art area, see header
const PROMPT = c => `Seamlessly continue the illustration of the Yu-Gi-Oh! trading card "${c.name}" beyond its edges: ` +
  `extend the background scenery, energy effects and lighting in exactly the same anime illustration style, colours and brush work. ` +
  `No text, no letters, no card border, no frame, no logo, no duplicate character.`;

const OUT = path.join(ROOT, 'img', 'art');
fs.mkdirSync(OUT, {recursive: true});
let cards = vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'cards.js'), 'utf8') + '\n;CARDS', {});
if (ONLY.length) {
  const missing = ONLY.filter(s => !cards.some(c => c.slug === s)); if (missing.length) die(`Unknown slug(s): ${missing.join(', ')}`);
  cards = cards.filter(c => ONLY.includes(c.slug));
}

(async () => {
  let done = 0, skipped = 0, failed = 0;
  for (const c of cards) {
    const src = path.join(ROOT, 'img', 'cards', c.slug + '.jpg');
    const dst = path.join(OUT, c.slug + '.jpg');
    if (!fs.existsSync(src)) { warn(`${c.slug}: no scan at img/cards`); failed++; continue; }
    if (fs.existsSync(dst) && !FORCE && !ONLY.length) { skipped++; continue; }

    const [w, h] = size(src);
    // pixels to add on each side so the card lands at CARD.left/top with CARD.w/h of the canvas
    const ext = {
      left:  Math.round(w * CARD.left / CARD.w),
      right: Math.round(w * (1 - CARD.left - CARD.w) / CARD.w),
      up:    Math.round(h * CARD.top / CARD.h),
      down:  Math.round(h * (1 - CARD.top - CARD.h) / CARD.h),
    };
    const cw = w + ext.left + ext.right, ch = h + ext.up + ext.down;
    log(`  ${c.slug.padEnd(18)} ${w}×${h} → ${cw}×${ch}  (+${ext.left} l, +${ext.right} r, +${ext.up} u, +${ext.down} d)${DRY ? '' : ' …'}`);
    if (DRY) continue;

    try {
      let img = await outpaint(src, ext, PROMPT(c));
      if (UPSCALE) img = await upscale(img);
      fs.writeFileSync(dst, img);
      done++;
    } catch (e) { warn(`${c.slug}: ${e.message}`); failed++; }
  }
  if (DRY) { log('Dry run – nothing generated.'); return; }
  writeManifest();
  log(`Done: ${done} generated, ${skipped} skipped (exists – use --force), ${failed} failed. Review img/art/, then commit & push.`);
})().catch(e => die(e.message || e));

/* ---------- Stability AI ---------- */
async function outpaint(file, ext, prompt){
  const fd = new FormData();
  fd.append('image', new Blob([fs.readFileSync(file)], {type: 'image/jpeg'}), path.basename(file));
  for (const k of ['left', 'right', 'up', 'down']) fd.append(k, String(ext[k]));
  fd.append('prompt', prompt);
  fd.append('creativity', String(CREATIVITY));
  fd.append('output_format', 'jpeg');
  return call('https://api.stability.ai/v2beta/stable-image/edit/outpaint', fd);
}
async function upscale(buf){
  const fd = new FormData();
  fd.append('image', new Blob([buf], {type: 'image/jpeg'}), 'in.jpg');
  fd.append('output_format', 'jpeg');
  return call('https://api.stability.ai/v2beta/stable-image/upscale/fast', fd);
}
async function call(url, fd){
  const res = await fetch(url, {method: 'POST', headers: {Authorization: `Bearer ${KEY}`, Accept: 'image/*'}, body: fd});
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

/* ---------- misc ---------- */
function size(file){
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]).toString();
  return [+out.match(/pixelWidth: (\d+)/)[1], +out.match(/pixelHeight: (\d+)/)[1]];
}
function writeManifest(){
  const have = fs.readdirSync(OUT).filter(f => f.endsWith('.jpg')).map(f => f.replace(/\.jpg$/, '')).sort();
  fs.writeFileSync(path.join(OUT, 'manifest.js'),
    `/* GENERATED by scripts/extend-art.js – designs that have extended artwork in img/art/ */\nconst EXT_ART = ${JSON.stringify(have)};\n`);
}
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
