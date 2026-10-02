// TOUCHPHONE.EXE: the puzzles. Each garden is planted already (five rows, one letter per square,
// from the left); you place Scrollers right of the red line and need to get one to the Wi-Fi
// router at the end of every row. Sun Daisies they eat drop sun, which buys more Scrollers.

/** What each Scroller costs to send. */
export const COST = {
  scroller: 50,
  ipadkid: 50,
  beanie: 75,
  selfie: 75,
  boomer: 100,
  vr: 125,
  miner: 125,
  bungee: 125,
  ladderguy: 150,
  bigscreen: 150,
  cryptobro: 175,
  pogo: 200,
  gigachad: 300,
  dancer: 350,
}

/** Garden letters → plants (see touchgrass/data.js). */
export const LETTERS = {
  s: 'sun',
  p: 'pea',
  d: 'double',
  f: 'frost',
  w: 'coco',
  c: 'cocotower',
  g: 'gulp',
  m: 'mine',
  z: 'zucchini',
  t: 'tiki',
  l: 'lettuce',
  x: 'melon',
  y: 'prickly',
  n: 'anise',
  r: 'rug',
  b: 'back',
  o: 'onion',
  u: 'puff',
  k: 'stink',
  h: 'swirl',
  a: 'magnet',
  e: 'shy',
}

const P = (id, area, name, sun, scrollers, rows, extra = {}) => ({ id, area, name, sunStart: sun, scrollers, rows, line: 5, ...extra })

export const PUZZLES = [
  P(1, 'day', 'Logging On', 150, ['scroller', 'beanie'], [
    'ssp..',
    's.pp.',
    'sp...',
    's.p.s',
    'spp..',
  ], { tip: 'Pick a Scroller at the top, then a square right of the red line. Eaten Sun Daisies drop sun: click it.' }),
  P(2, 'day', 'Selfie Position', 150, ['scroller', 'beanie', 'selfie'], [
    's.pw.',
    'spd..',
    's.p.w',
    'sdp..',
    's.wp.',
  ], { tip: 'A Selfie-Stick Scroller vaults over the first plant it meets.' }),
  P(3, 'day', 'Headgear', 150, ['scroller', 'beanie', 'selfie', 'vr'], [
    'sfg..',
    'sp.ms',
    'sgf..',
    's.pm.',
    'sfg.s',
  ], { tip: 'Gulp Traps swallow one Scroller whole, then chew for a while. Send a cheap one first.' }),
  P(4, 'night', 'Night Shift', 150, ['scroller', 'beanie', 'miner', 'vr'], [
    'suk..',
    'sp.h.',
    's.ku.',
    'sh.p.',
    'suk..',
  ], { tip: 'Crypto Miners dig under everything and pop up at the far end, then eat from behind.' }),
  P(5, 'day', 'Up and Over', 200, ['scroller', 'beanie', 'selfie', 'ladderguy'], [
    'sdzw.',
    'sd.ws',
    'spzw.',
    'sd.w.',
    'sdzws',
  ], { tip: 'Ladder Guy leans his ladder on the first wall, and everyone behind him climbs over it.' }),
  P(6, 'night', 'Bungee Jumping', 200, ['scroller', 'beanie', 'bungee', 'vr'], [
    'skhu.',
    'sg.ks',
    'sk.h.',
    'sgk.s',
    'skhu.',
  ], { tip: 'A Bungee Thief can drop anywhere, even behind the line, and steals the plant there.' }),
  P(7, 'day', 'Fast Lane', 200, ['scroller', 'beanie', 'vr', 'cryptobro'], [
    'sdtf.',
    'sg.ds',
    'sftd.',
    'sdm.s',
    'sdtf.',
  ], { tip: 'Crypto Bros are fast and wear a helmet. Turnip Mines are armed and waiting.' }),
  P(8, 'night', 'Dance Floor', 300, ['ipadkid', 'scroller', 'vr', 'miner', 'dancer'], [
    'skua.',
    'shk.s',
    'sau.k',
    'sk.hs',
    'skua.',
  ], { tip: 'A Trend Dancer calls Backup Dancers into the rows next to it. Magnet Morels steal metal hats.' }),
  P(9, 'day', 'Big Mood', 550, ['scroller', 'beanie', 'vr', 'pogo', 'cryptobro', 'gigachad'], [
    'sdwgs',
    'stdwz',
    'sfdws',
    'stdwz',
    'sdwgs',
  ], { tip: 'Gigachad flattens whatever he reaches and throws his iPad Kid when he’s hurt.' }),
]

// ================= Phone Addiction (endless) =================
// Random gardens that get harder; your sun carries over from one to the next.
function mulberry(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const ENDLESS_DAY = ['p', 'p', 'd', 'f', 'w', 'g', 'm', 'z', 't', 'l', 'y', 'n', 'r', 'b', 'c', 'x']
const ENDLESS_NIGHT = ['u', 'k', 'k', 'h', 'a', 'e', 'p', 'w', 'g', 'm', 'z']
export function endless(streak, seed = 1) {
  const rand = mulberry(seed * 9973 + streak * 131)
  const night = streak % 3 === 2
  // Harder plants (and more of them) as the streak goes up.
  const pool = (night ? ENDLESS_NIGHT : ENDLESS_DAY).slice(0, Math.min(night ? 11 : 16, 4 + streak))
  const fill = Math.min(0.9, 0.45 + streak * 0.04)
  const rows = Array.from({ length: 5 }, () => {
    let row = 's'
    for (let c = 1; c < 5; c++) row += rand() < fill ? pool[Math.floor(rand() * pool.length)] : rand() < 0.2 ? 's' : '.'
    return row
  })
  const scrollers = night ? ['scroller', 'beanie', 'vr', 'miner', 'bungee', 'dancer'] : ['scroller', 'beanie', 'selfie', 'vr', 'ladderguy', 'cryptobro', 'pogo', 'gigachad']
  return P(`E${streak + 1}`, night ? 'night' : 'day', `Phone Addiction · garden ${streak + 1}`, 0, scrollers, rows)
}

/** A puzzle as a level for touchgrass/sim.js (special: 'reverse'). */
export function asLevel(p) {
  const garden = {}
  p.rows.forEach((row, r) => [...row].forEach((ch, c) => ch !== '.' && LETTERS[ch] && (garden[`${r},${c}`] = LETTERS[ch])))
  return {
    id: String(p.id),
    label: typeof p.id === 'number' ? `Puzzle ${p.id}` : p.name,
    title: p.name,
    area: p.area,
    special: 'reverse',
    waves: 0,
    zombies: [],
    sunStart: p.sunStart,
    graves: 0,
    line: p.line,
    garden,
    scrollers: p.scrollers.map((id) => ({ id, cost: COST[id] })),
  }
}
