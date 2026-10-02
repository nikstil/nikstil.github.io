// BRAINS FIRST's mini-games. Neither uses sun (and the gardens have no Sun Daisies):
// - Conveyor Chaos: zombies come down a conveyor belt at random; send them in as they come.
// - Vase Breaker: vases stand on your side of the red line. A zombie inside climbs out and goes
//   for the brains; a plant inside takes root right where the vase stood.
// Each has 10 levels and a Random mode: a random garden with one zombie on the belt for every
// plant in it, or random vases with two zombies for every plant.

import { LETTERS } from './levels.js'

const times = (n, id) => Array.from({ length: n }, () => id)
const P = (...groups) => groups.flatMap(([n, id]) => times(n, id).map((plant) => ({ plant })))
const Z = (...groups) => groups.flatMap(([n, id]) => times(n, id).map((zombie) => ({ zombie })))

/** A garden from five rows of letters (see LETTERS in levels.js). */
function garden(rows) {
  const out = {}
  rows.forEach((row, r) => [...row].forEach((ch, c) => ch !== '.' && LETTERS[ch] && (out[`${r},${c}`] = LETTERS[ch])))
  return out
}
const base = (id, label, title, area, rows) => ({
  id,
  label,
  title,
  area,
  special: 'reverse',
  noSun: true,
  waves: 0,
  zombies: [],
  sunStart: 0,
  graves: 0,
  line: 5,
  garden: garden(rows),
  scrollers: [],
})

const conveyor = (n, area, title, rows, zbelt, total, every = 2.8) => ({ ...base(`C${n}`, `Conveyor ${n}`, title, area, rows), mini: 'conveyor', zbelt, zbeltTotal: total, beltEvery: every })
export const CONVEYOR = [
  conveyor(1, 'day', 'Rolling In', ['.p...', 'p....', '..p..', '.p...', 'p.p..'], ['scroller', 'scroller', 'beanie'], 50, 2.8),
  conveyor(2, 'day', 'Pole Position', ['pw...', '.pd..', 'p.w..', 'dp...', '.wp..'], ['scroller', 'beanie', 'selfie'], 44, 2.8),
  conveyor(3, 'day', 'Headgear', ['fg...', 'p.m..', 'gf...', '.pm..', 'fg...'], ['scroller', 'beanie', 'vr', 'selfie'], 46, 2.8),
  conveyor(4, 'night', 'Night Shift', ['uk...', 'p.h..', '.ku..', 'h.p..', 'uk...'], ['scroller', 'beanie', 'miner', 'vr'], 50, 2.8),
  conveyor(5, 'day', 'Up and Over', ['dzw..', 'd.w..', 'pzw..', 'd.w..', 'dzw..'], ['beanie', 'selfie', 'ladderguy', 'scroller'], 40, 2.8),
  conveyor(6, 'night', 'Bungee Jumping', ['khu..', 'g.k..', 'k.h..', 'gk...', 'khu..'], ['scroller', 'beanie', 'bungee', 'vr'], 46, 2.8),
  conveyor(7, 'day', 'Fast Lane', ['dtf..', 'g.d..', 'ftd..', 'dm...', 'dtf..'], ['beanie', 'vr', 'cryptobro', 'scroller'], 48, 2.8),
  conveyor(8, 'night', 'Dance Floor', ['kua..', 'hk.m.', 'au.k.', 'k.hm.', 'kua..'], ['ipadkid', 'scroller', 'vr', 'miner', 'dancer'], 30, 2.8),
  conveyor(9, 'day', 'Big Mood', ['dwgm.', 'tdwz.', 'fdwm.', 'tdwz.', 'dwgm.'], ['beanie', 'vr', 'pogo', 'cryptobro', 'gigachad'], 34, 2.8),
  conveyor(10, 'night', 'Graveyard Shift', ['kahw.', 'hkcam', 'aukhc', 'khcam', 'kahw.'], ['vr', 'cryptobro', 'dancer', 'miner', 'gigachad', 'bungee'], 32, 2.8),
]

const vases = (n, area, title, rows, contents) => ({ ...base(`V${n}`, `Vases ${n}`, title, area, rows), mini: 'vase', vases: { cols: [5, 8], contents, leafChance: 0.3 } })
export const VASES = [
  vases(1, 'day', 'Handle With Care', ['.....', 'p....', '.....', '.....', '.....'], [...Z([8, 'scroller'], [4, 'beanie']), ...P([4, 'pea'])]),
  vases(2, 'day', 'Fragile', ['p....', '.....', '.....', '..w..', '.....'], [...Z([6, 'scroller'], [5, 'beanie'], [3, 'selfie']), ...P([3, 'pea'], [2, 'coco'], [1, 'mine'])]),
  vases(3, 'day', 'This Side Up', ['f....', '.....', '.p...', '.....', '.....'], [...Z([2, 'scroller'], [6, 'beanie'], [3, 'vr'], [3, 'selfie']), ...P([2, 'pea'], [1, 'coco'], [1, 'gulp'], [1, 'mine'], [1, 'frost'])]),
  vases(4, 'night', 'Night Shift', ['u....', '.k...', '..h..', '.....', 'k....'], [...Z([4, 'scroller'], [5, 'beanie'], [3, 'vr'], [2, 'boomer']), ...P([2, 'puff'], [2, 'stink'], [1, 'swirl'], [1, 'coco'])]),
  vases(5, 'day', 'Up and Over', ['d....', '.....', '.z...', '..w..', '.....'], [...Z([6, 'beanie'], [4, 'vr'], [2, 'ladderguy'], [2, 'selfie']), ...P([1, 'double'], [2, 'coco'], [1, 'zucchini'], [1, 'pom'], [1, 'pea'])]),
  vases(6, 'night', 'Smash Hit', ['k.u..', 'g....', '..h..', '.k...', 'u.k..'], [...Z([5, 'beanie'], [4, 'vr'], [2, 'bigscreen'], [2, 'boomer'], [1, 'dancer']), ...P([2, 'stink'], [1, 'gulp'], [1, 'coco'], [1, 'magnet'], [1, 'pom'])]),
  vases(7, 'day', 'Fast Lane', ['d....', '.....', '.t.d.', '.....', '..f..'], [...Z([5, 'vr'], [3, 'cryptobro'], [4, 'beanie'], [2, 'selfie']), ...P([1, 'double'], [1, 'frost'], [1, 'gulp'], [1, 'coco'], [1, 'pom'], [1, 'mine'])]),
  vases(8, 'night', 'Dance Floor', ['k.a..', 'h.k..', '.u...', 'k..m.', 'a.k..'], [...Z([4, 'vr'], [2, 'cryptobro'], [2, 'dancer'], [4, 'beanie'], [2, 'ladderguy']), ...P([2, 'stink'], [1, 'magnet'], [1, 'coco'], [1, 'cloud'], [1, 'swirl'])]),
  vases(9, 'day', 'Big Pots', ['d.w..', '.....', '.f...', 'd....', '..z..'], [...Z([4, 'vr'], [3, 'cryptobro'], [2, 'pogo'], [1, 'gigachad'], [4, 'beanie']), ...P([2, 'double'], [1, 'cocotower'], [1, 'ghost'], [1, 'pom'], [1, 'frost'])]),
  vases(10, 'night', 'The Last Vase', ['ka.w.', 'h.c..', '.uk..', 'k.c.m', 'a.h..'], [...Z([2, 'gigachad'], [3, 'cryptobro'], [4, 'vr'], [2, 'dancer'], [1, 'ladderguy'], [2, 'beanie']), ...P([2, 'stink'], [1, 'magnet'], [1, 'cocotower'], [1, 'cloud'], [1, 'pom'])]),
]

// ================= Random =================
const DAY = ['p', 'd', 'f', 'w', 'c', 'g', 'm', 'z', 't', 'l', 'y', 'n', 'r', 'b', 'x']
const NIGHT = ['u', 'k', 'h', 'a', 'e', 'p', 'w', 'c', 'g', 'm', 'z', 'u']
const ZOMBIES_DAY = ['scroller', 'scroller', 'beanie', 'beanie', 'selfie', 'vr', 'ladderguy', 'cryptobro', 'pogo', 'gigachad', 'bungee']
const ZOMBIES_NIGHT = ['scroller', 'scroller', 'beanie', 'beanie', 'vr', 'miner', 'dancer', 'boomer', 'bigscreen', 'bungee']
// one zombie per plant is a tight budget: the random belt brings the tough ones
const TOUGH_DAY = ['beanie', 'vr', 'vr', 'cryptobro', 'cryptobro', 'ladderguy', 'pogo', 'gigachad', 'bungee']
const TOUGH_NIGHT = ['beanie', 'vr', 'vr', 'cryptobro', 'bigscreen', 'miner', 'dancer', 'gigachad', 'bungee']
const VASE_PLANTS = ['pea', 'double', 'frost', 'coco', 'gulp', 'mine', 'pom', 'zucchini', 'stink', 'magnet', 'cocotower']
const pick = (list, rand) => list[Math.floor(rand() * list.length)]

function randomGarden(night, rand, fill) {
  const pool = night ? NIGHT : DAY
  return Array.from({ length: 5 }, () => {
    let row = ''
    for (let c = 0; c < 5; c++) row += rand() < fill ? pick(pool, rand) : '.'
    return row
  })
}
const plantCount = (rows) => rows.join('').replace(/\./g, '').length

/** A random garden; the belt brings one zombie for every plant in it. */
export function randomConveyor(rand = Math.random) {
  const night = rand() < 0.5
  const rows = randomGarden(night, rand, 0.25 + rand() * 0.15)
  const n = plantCount(rows)
  return { ...conveyor('?', night ? 'night' : 'day', 'Random', rows, night ? TOUGH_NIGHT : TOUGH_DAY, n), id: 'C?', label: 'Random Conveyor' }
}
/** A random garden and random vases: two zombies for every plant. */
export function randomVases(rand = Math.random) {
  const night = rand() < 0.5
  const rows = randomGarden(night, rand, 0.15 + rand() * 0.15)
  const plants = 6
  const contents = [...Array.from({ length: plants * 2 }, () => ({ zombie: pick(night ? ZOMBIES_NIGHT.filter((z) => z !== 'bungee') : ZOMBIES_DAY.filter((z) => z !== 'bungee'), rand) })), ...Array.from({ length: plants }, () => ({ plant: pick(VASE_PLANTS, rand) }))]
  return { ...vases('?', night ? 'night' : 'day', 'Random', rows, contents), id: 'V?', label: 'Random Vases' }
}

export const MODES = [
  { id: 'conveyor', name: 'Conveyor Chaos', blurb: 'No sun. Zombies arrive on a conveyor belt: send them in as they come.', levels: CONVEYOR, random: randomConveyor, randomBlurb: 'A random garden, one zombie on the belt for every plant.' },
  { id: 'vase', name: 'Vase Breaker', blurb: 'No sun. Break the vases on your side: zombies climb out, plants take root.', levels: VASES, random: randomVases, randomBlurb: 'A random garden and vases, two zombies for every plant.' },
]
