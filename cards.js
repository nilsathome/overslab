/* ============================================================
   Designs. New card = one line here + image in img/cards/.
   set: label line 1 (as PSA would print it), code: card number.
   ============================================================ */
const SERIES = ['Duel Monsters','GX',"5D's",'ZEXAL','ARC-V','VRAINS'];
const CARDS = [
  // Duel Monsters
  {slug:'dark-magician',  name:"Dark Magician, the Pharaoh's Servant",          series:'Duel Monsters', set:'2026 YU-GI-OH! MAGNIFICENT MONSTERS', code:'MAMO-EN001', num:'#001', rarity:'1ST EDITION ULTRA RARE', glow:'#6d3fb0'},
  {slug:'blue-eyes',      name:'Blue-Eyes White Dragon, the White Phantom Beast', series:'Duel Monsters', set:'2026 YU-GI-OH! JAPANESE LOCR',    code:'LOCR-JP001', num:'#001', rarity:'ULTRA RARE OVERFRAME',    glow:'#3aa6dc'},
  {slug:'deep-eyes',      name:'Deep-Eyes White Dragon, the Blue Abyss',         series:'Duel Monsters', set:'2026 YU-GI-OH! JAPANESE LOCR',    code:'LOCR-JP002', num:'#002', rarity:'ULTRA RARE OVERFRAME',    glow:'#2b6fd6'},
  {slug:'kuriboh',        name:'Kuriboh - Multiply!',                            series:'Duel Monsters', set:'2026 YU-GI-OH! MAGNIFICENT MONSTERS', code:'MAMO-EN002', num:'#002', rarity:'1ST EDITION ULTRA RARE', glow:'#b0662a'},
  {slug:'dark-dragoon',   name:'Red-Eyes Dark Dragoon',                          series:'Duel Monsters', set:'2026 YU-GI-OH! RARITY COLLECTION 5', code:'RA05-EN141', num:'#141', rarity:'1ST EDITION ULTRA RARE', glow:'#b02a3a'},
  {slug:'black-chaos',    name:'Magician of Dark Chaos - Black Chaos',           series:'Duel Monsters', set:'2026 YU-GI-OH! JAPANESE CORI',    code:'CORI-JP027', num:'#027', rarity:'PRISMATIC SECRET RARE',   glow:'#b8368f'},
  {slug:'black-luster',   name:'Black Luster Soldier - Soldier of Light and Darkness', series:'Duel Monsters', set:'2026 YU-GI-OH! JAPANESE CORI', code:'CORI-JP028', num:'#028', rarity:'PRISMATIC SECRET RARE', glow:'#d6a83a'},
  {slug:'red-eyes-exceed',name:'Red-Eyes Black Dragon Exceed',                   series:'Duel Monsters', set:'2026 YU-GI-OH! JAPANESE BETB',    code:'BETB-JP036', num:'#036', rarity:'PRISMATIC SECRET RARE',   glow:'#c8302a'},
  {slug:'ra',             name:'The Sun God of Darkness - The Winged Dragon of Ra', series:'Duel Monsters', set:'2026 YU-GI-OH! JAPANESE IMPH',  code:'IMPH-JP030', num:'#030', rarity:'PRISMATIC SECRET RARE',   glow:'#e0b83a', soon:'Oct 2026'},
  // GX
  {slug:'flare-wingman',  name:'Favorite HERO Shining Flare Wingman',            series:'GX', set:'2026 YU-GI-OH! MAGNIFICENT MONSTERS', code:'MAMO-EN004', num:'#004', rarity:'1ST EDITION ULTRA RARE', glow:'#3f9f5a'},
  {slug:'winged-kuriboh', name:'Winged Kuriboh Sabatiel LV10',                   series:'GX', set:'2026 YU-GI-OH! MAGNIFICENT MONSTERS', code:'MAMO-EN006', num:'#006', rarity:'1ST EDITION ULTRA RARE', glow:'#d9b45c'},
  {slug:'cyber-end',      name:'Cyber End Dragon, the Final Strike Dragon',      series:'GX', set:'2026 YU-GI-OH! JAPANESE LOCR',    code:'LOCR-JP004', num:'#004', rarity:'ULTRA RARE OVERFRAME',    glow:'#8aa8c8'},
  // 5D's
  {slug:'stardust',       name:'Stardust Dragon - Victim Sanctuary',             series:"5D's", set:'2026 YU-GI-OH! MAGNIFICENT MONSTERS', code:'MAMO-EN007', num:'#007', rarity:'1ST EDITION ULTRA RARE', glow:'#6fb7d9'},
  {slug:'shooting-quasar',name:'Shooting Quasar Dragon',                         series:"5D's", set:'2026 YU-GI-OH! RARITY COLLECTION 5', code:'RA05-EN143', num:'#143', rarity:'1ST EDITION ULTRA RARE', glow:'#5aa0e0'},
  {slug:'crimson-dragon', name:'Crimson Dragon Quetzalcoatl',                    series:"5D's", set:'2026 YU-GI-OH! JAPANESE LOCR',    code:'LOCR-JP007', num:'#007', rarity:'ULTRA RARE OVERFRAME',    glow:'#d8352f'},
  {slug:'red-nova',       name:'Red Nova Dragon - Burning Soul',                 series:"5D's", set:'2026 YU-GI-OH! JAPANESE LOCR',    code:'LOCR-JP008', num:'#008', rarity:'ULTRA RARE OVERFRAME',    glow:'#e04a2a'},
  // ZEXAL
  {slug:'utopia',         name:'Number 39: Utopia, Emissary of Light',           series:'ZEXAL', set:'2026 YU-GI-OH! MAGNIFICENT MONSTERS', code:'MAMO-EN010', num:'#010', rarity:'1ST EDITION ULTRA RARE', glow:'#c9a94f'},
  {slug:'neo-galaxy-eyes',name:'Neo Galaxy-Eyes Photon Dragon - Photon Howling', series:'ZEXAL', set:'2026 YU-GI-OH! JAPANESE LOCR',    code:'LOCR-JP010', num:'#010', rarity:'ULTRA RARE OVERFRAME',    glow:'#4a7fd8'},
  // ARC-V
  {slug:'odd-eyes',       name:'Odd-Eyes Pendulum Dragon, Four Heavenly Dragons', series:'ARC-V', set:'2026 YU-GI-OH! MAGNIFICENT MONSTERS', code:'MAMO-EN013', num:'#013', rarity:'1ST EDITION ULTRA RARE', glow:'#d04a3a'},
  {slug:'starving-venom', name:'Starving Venom Fusion Dragon, Four Heavenly Dragons', series:'ARC-V', set:'2026 YU-GI-OH! JAPANESE LOCR', code:'LOCR-JP013', num:'#013', rarity:'ULTRA RARE OVERFRAME', glow:'#7a3fb0'},
  {slug:'clear-wing',     name:'Clear Wing Synchro Dragon, Four Heavenly Dragons', series:'ARC-V', set:'2026 YU-GI-OH! JAPANESE LOCR',  code:'LOCR-JP014', num:'#014', rarity:'ULTRA RARE OVERFRAME',    glow:'#3fb8c8'},
  {slug:'dark-rebellion', name:'Dark Rebellion Xyz Dragon, Four Heavenly Dragons', series:'ARC-V', set:'2026 YU-GI-OH! JAPANESE LOCR',  code:'LOCR-JP015', num:'#015', rarity:'ULTRA RARE OVERFRAME',    glow:'#6a3fb0'},
  // VRAINS
  {slug:'decode-talker',  name:'Decode Talker Integration',                      series:'VRAINS', set:'2026 YU-GI-OH! MAGNIFICENT MONSTERS', code:'MAMO-EN016', num:'#016', rarity:'1ST EDITION ULTRA RARE', glow:'#3f6fd8'},
  {slug:'firewall',       name:'Firewall Dragon Singularity',                    series:'VRAINS', set:'2026 YU-GI-OH! RARITY COLLECTION 5', code:'RA05-EN146', num:'#146', rarity:'1ST EDITION ULTRA RARE', glow:'#e06a2a'},
  {slug:'borreload',      name:'Borreload Liberator Dragon',                     series:'VRAINS', set:'2026 YU-GI-OH! JAPANESE LOCR',    code:'LOCR-JP016', num:'#016', rarity:'ULTRA RARE OVERFRAME',    glow:'#c8302a'},
];

const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

/* Slab/Frame markup from card data */
// opts: frame (bool), raw (neutral OVERSLAB label instead of PSA), empty (no card in the window yet)
function pieceHTML(c, opts = {}){
  const {frame = true, raw = false, empty = false} = typeof opts === 'boolean' ? {frame: opts} : opts;
  const label = raw ? `
      <div class="label neutral">
        <div class="l1">OVERSLAB DISPLAY SLAB</div><div class="r1">RAW</div>
        <div class="l2">${empty ? 'YOUR CARD' : esc(c.name.toUpperCase())}</div><div class="r2">NOT<br>GRADED</div>
        <div class="l3">SWAP FOR PSA HOLDER ANYTIME</div>
        <div class="bar"></div><div class="psa">OVER<b>SLAB</b></div>
      </div>` : `
      <div class="label">
        <div class="l1">${esc(c.set)}</div><div class="r1">${esc(c.num)}</div>
        <div class="l2">${esc(c.name.toUpperCase())}</div><div class="r2">GEM MT<br>10</div>
        <div class="l3">${esc(c.rarity)}</div>
        <div class="bar"></div><div class="psa">P<b>S</b>A</div>
      </div>`;
  return `
    <div class="slab-layer"></div>
    ${frame ? '<div class="frame-layer"><div class="art"></div></div>' : ''}
    <div class="top-layer">
      ${label}
      ${empty ? '<div class="card empty">your card<br>goes here</div>' : '<div class="card"></div>'}
    </div>`;
}
function mountPiece(el, c, opts = {}){
  el.style.setProperty('--art', `url('img/cards/${c.slug}.jpg')`);
  el.style.setProperty('--glow', c.glow);
  el.innerHTML = pieceHTML(c, opts);
}
const bySlug = s => CARDS.find(c => c.slug === s);

/* Placeholder pricing for demo mode (EUR). Real prices come from Shopify. */
const DEMO_PRICE = {frame: 49, frameSlab: 59};
