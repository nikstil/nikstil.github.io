// LAWN OF THE DEAD's mini-games. Neither uses sun:
// - Conveyor Chaos: plants come down a conveyor belt at random; plant them as they come.
// - Vase Breaker: the lawn is full of vases. Break them: a plant inside becomes a seed for you,
//   a zombie inside climbs out and comes for you.
// Each has 10 levels and a Random mode (a fresh random level every time): on the Random belt you
// get one plant for every zombie that comes; Random vases hold two zombies for every plant.

const times = (n, id) => Array.from({ length: n }, () => id)
const P = (...groups) => groups.flatMap(([n, id]) => times(n, id).map((plant) => ({ plant })))
const Z = (...groups) => groups.flatMap(([n, id]) => times(n, id).map((zombie) => ({ zombie })))

const conveyorLevel = (n, area, opts) => ({
  id: `C${n}`,
  label: `Conveyor ${n}`,
  title: opts.title,
  area,
  special: 'conveyor',
  mini: 'conveyor',
  noSun: true,
  waves: opts.waves ?? 10,
  power: opts.power ?? 1,
  zombies: opts.zombies,
  conveyor: opts.belt,
  beltEvery: opts.every ?? 4.2,
  graves: opts.graves ?? 0,
  lanes: null,
  sod: null,
  sunStart: 0,
  reward: 'money',
})

export const CONVEYOR = [
  conveyorLevel(1, 'day', { title: 'Belt and Braces', waves: 8, power: 0.8, zombies: ['scroller', 'beanie'], belt: ['pea', 'pea', 'double', 'coco', 'pom'] }),
  conveyorLevel(2, 'day', { title: 'Pole Position', zombies: ['scroller', 'beanie', 'selfie'], belt: ['pea', 'double', 'coco', 'mine', 'gulp'] }),
  conveyorLevel(3, 'night', { title: 'Night Shift', zombies: ['scroller', 'beanie', 'boomer'], graves: 4, belt: ['puff', 'stink', 'stink', 'coco', 'swirl', 'pea'] }),
  conveyorLevel(4, 'night', { title: 'Grave Matters', zombies: ['scroller', 'beanie', 'boomer', 'bigscreen'], graves: 6, belt: ['puff', 'stink', 'coco', 'cloud', 'gobbler', 'swirl', 'frostcap'] }),
  conveyorLevel(5, 'pool', { title: 'Deep End', waves: 15, zombies: ['scroller', 'beanie', 'floatie', 'scuba'], belt: ['lily', 'lily', 'pea', 'double', 'kelp', 'zucchini', 'triple', 'coco'] }),
  conveyorLevel(6, 'pool', { title: 'Cold Snap', waves: 15, zombies: ['scroller', 'beanie', 'floatie', 'slush', 'sled'], belt: ['lily', 'lily', 'triple', 'tiki', 'rug', 'ghost', 'cocotower', 'zucchini'] }),
  conveyorLevel(7, 'fog', { title: 'Pea Soup', waves: 15, zombies: ['scroller', 'beanie', 'floatie', 'powerbank', 'drone'], belt: ['lily', 'lily', 'lantern', 'prickly', 'fan', 'back', 'anise', 'bunker'] }),
  conveyorLevel(8, 'fog', { title: 'Underground', waves: 15, power: 0.9, every: 3.8, zombies: ['scroller', 'beanie', 'floatie', 'miner', 'pogo', 'drone'], belt: ['lily', 'lily', 'lantern', 'bunker', 'magnet', 'anise', 'back', 'cocotower', 'prickly'] }),
  conveyorLevel(9, 'roof', { title: 'Shingles', waves: 15, zombies: ['scroller', 'beanie', 'vr', 'bungee', 'ladderguy', 'flinger'], belt: ['pot', 'pot', 'lettuce', 'popcorn', 'melon', 'parasol', 'coco', 'pom'] }),
  conveyorLevel(10, 'roof', { title: 'Heavy Lifting', waves: 20, zombies: ['scroller', 'beanie', 'vr', 'gigachad', 'flinger'], belt: ['pot', 'pot', 'melon', 'popcorn', 'ghost', 'coco', 'cocotower', 'pom', 'lettuce'] }),
]

const vaseLevel = (n, area, opts) => ({
  id: `V${n}`,
  label: `Vases ${n}`,
  title: opts.title,
  area,
  special: 'vase',
  mini: 'vase',
  noSun: true,
  waves: 1,
  zombies: [],
  graves: 0,
  lanes: null,
  sod: null,
  sunStart: 0,
  vases: { cols: opts.cols ?? [4, 8], contents: [...opts.plants, ...opts.zombies], leafChance: opts.leaf ?? 0.35 },
  reward: 'money',
})

export const VASES = [
  vaseLevel(1, 'night', { title: 'Handle With Care', cols: [6, 8], plants: P([3, 'pea'], [1, 'double'], [1, 'coco'], [1, 'pom']), zombies: Z([6, 'scroller'], [3, 'beanie']), leaf: 0.6 }),
  vaseLevel(2, 'night', { title: 'Fragile', cols: [5, 8], plants: P([2, 'pea'], [2, 'double'], [1, 'coco'], [1, 'pom'], [1, 'frost'], [1, 'mine']), zombies: Z([6, 'scroller'], [4, 'beanie'], [2, 'selfie']), leaf: 0.5 }),
  vaseLevel(3, 'day', { title: 'This Side Up', cols: [5, 8], plants: P([2, 'pea'], [2, 'double'], [1, 'frost'], [1, 'gulp'], [1, 'coco'], [1, 'zucchini'], [1, 'pom']), zombies: Z([6, 'scroller'], [4, 'beanie'], [1, 'selfie']), leaf: 0.5 }),
  vaseLevel(4, 'night', { title: 'Bull in a China Shop', plants: P([2, 'double'], [1, 'frost'], [2, 'gulp'], [1, 'coco'], [1, 'mine'], [1, 'pom'], [2, 'stink']), zombies: Z([6, 'scroller'], [5, 'beanie'], [2, 'boomer'], [1, 'vr']), leaf: 0.45 }),
  vaseLevel(5, 'day', { title: 'Crockery', plants: P([3, 'double'], [2, 'frost'], [2, 'coco'], [1, 'ghost'], [1, 'pom'], [1, 'zucchini'], [1, 'gulp']), zombies: Z([4, 'scroller'], [5, 'beanie'], [2, 'vr'], [2, 'selfie'], [1, 'cryptobro']), leaf: 0.45 }),
  vaseLevel(6, 'night', { title: 'Smash Hit', plants: P([2, 'triple'], [1, 'double'], [1, 'frost'], [1, 'coco'], [1, 'cocotower'], [1, 'pom'], [1, 'ghost'], [1, 'zucchini'], [1, 'mine'], [1, 'gulp']), zombies: Z([4, 'scroller'], [4, 'beanie'], [2, 'vr'], [1, 'bigscreen'], [2, 'boomer'], [1, 'dancer']), leaf: 0.4 }),
  vaseLevel(7, 'day', { title: 'Pottery Class', plants: P([1, 'melon'], [2, 'frost'], [3, 'double'], [1, 'cocotower'], [1, 'ghost'], [1, 'pom'], [1, 'gulp'], [1, 'zucchini']), zombies: Z([3, 'scroller'], [3, 'beanie'], [3, 'vr'], [2, 'cryptobro'], [1, 'pogo'], [2, 'selfie']) }),
  vaseLevel(8, 'night', { title: 'Urn Your Keep', plants: P([3, 'double'], [1, 'frost'], [1, 'magnet'], [1, 'coco'], [1, 'cocotower'], [1, 'ghost'], [1, 'cloud'], [1, 'pom'], [1, 'gulp']), zombies: Z([4, 'beanie'], [3, 'vr'], [2, 'bigscreen'], [1, 'cryptobro'], [2, 'ladderguy'], [2, 'dancer']) }),
  vaseLevel(9, 'day', { title: 'Big Pots', plants: P([2, 'double'], [1, 'tiki'], [2, 'frost'], [2, 'cocotower'], [1, 'ghost'], [1, 'pom'], [1, 'melon'], [1, 'zucchini']), zombies: Z([1, 'scroller'], [4, 'beanie'], [3, 'vr'], [2, 'cryptobro'], [2, 'pogo'], [1, 'ladderguy'], [1, 'gigachad']) }),
  vaseLevel(10, 'night', { title: 'The Last Vase', plants: P([2, 'double'], [2, 'frost'], [2, 'cocotower'], [2, 'ghost'], [1, 'pom'], [1, 'cloud'], [1, 'magnet'], [1, 'melon']), zombies: Z([1, 'beanie'], [4, 'vr'], [2, 'bigscreen'], [3, 'cryptobro'], [1, 'dancer'], [1, 'pogo'], [1, 'gigachad']) }),
]

// ================= Random =================
const AREA_PLANTS = {
  // what can actually be planted (and works) in each area without sun or coffee
  day: ['pea', 'double', 'frost', 'coco', 'cocotower', 'pom', 'mine', 'gulp', 'zucchini', 'ghost', 'triple', 'tiki', 'rug', 'prickly', 'anise', 'back', 'melon', 'lettuce', 'popcorn', 'onion', 'bunker'],
  night: ['pea', 'double', 'puff', 'stink', 'swirl', 'shy', 'frostcap', 'cloud', 'coco', 'cocotower', 'pom', 'gulp', 'magnet', 'gobbler', 'mine', 'ghost', 'bunker'],
  pool: ['lily', 'lily', 'lily', 'pea', 'double', 'frost', 'triple', 'kelp', 'zucchini', 'tiki', 'coco', 'cocotower', 'ghost', 'pom', 'rug', 'melon'],
  fog: ['lily', 'lily', 'lily', 'lantern', 'fan', 'prickly', 'puff', 'stink', 'magnet', 'anise', 'back', 'bunker', 'cocotower', 'kelp', 'cloud'],
  roof: ['pot', 'pot', 'pot', 'pot', 'lettuce', 'popcorn', 'melon', 'parasol', 'coco', 'cocotower', 'pom', 'ghost', 'onion'],
}
const AREA_ZOMBIES = {
  day: ['scroller', 'beanie', 'selfie', 'vr', 'boomer', 'bigscreen', 'cryptobro', 'dancer', 'pogo', 'ladderguy', 'powerbank', 'gigachad'],
  night: ['scroller', 'beanie', 'selfie', 'vr', 'boomer', 'bigscreen', 'cryptobro', 'dancer', 'miner', 'pogo'],
  pool: ['scroller', 'beanie', 'vr', 'floatie', 'scuba', 'jetski', 'slush', 'sled', 'cryptobro', 'powerbank'],
  fog: ['scroller', 'beanie', 'floatie', 'scuba', 'jetski', 'drone', 'miner', 'pogo', 'powerbank'],
  roof: ['scroller', 'beanie', 'vr', 'bungee', 'ladderguy', 'flinger', 'gigachad', 'cryptobro'],
}
const VASE_PLANTS = ['pea', 'double', 'frost', 'coco', 'cocotower', 'pom', 'mine', 'gulp', 'zucchini', 'ghost', 'triple', 'melon', 'tiki', 'anise', 'stink', 'magnet', 'cloud']
const VASE_ZOMBIES = ['scroller', 'scroller', 'beanie', 'beanie', 'selfie', 'vr', 'boomer', 'bigscreen', 'cryptobro', 'dancer', 'pogo', 'ladderguy', 'gigachad']

function shuffle(list, rand) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const pickN = (list, n, rand) => Array.from({ length: n }, () => list[Math.floor(rand() * list.length)])

/** A brand-new random Conveyor level: random area, zombies and belt, one plant per zombie. */
export function randomConveyor(rand = Math.random) {
  const area = ['day', 'night', 'pool', 'fog', 'roof'][Math.floor(rand() * 5)]
  const zombies = shuffle(AREA_ZOMBIES[area], rand).slice(0, 3 + Math.floor(rand() * 3))
  // keep the basics in, so every wave has something to spend its points on
  if (!zombies.includes('scroller')) zombies.push('scroller')
  if ((area === 'pool' || area === 'fog') && !zombies.includes('floatie')) zombies.push('floatie')
  const plants = AREA_PLANTS[area]
  const belt = [...plants.filter((p) => p === 'lily' || p === 'pot'), ...shuffle(plants.filter((p) => p !== 'lily' && p !== 'pot'), rand).slice(0, 6)]
  return {
    ...conveyorLevel('?', area, { title: 'Random', waves: 10 + Math.floor(rand() * 2) * 5, zombies, belt, graves: area === 'night' ? 4 : 0 }),
    id: 'C?',
    label: 'Random Conveyor',
    beltPerZombie: true,
  }
}

/** A brand-new random Vase level: two zombies for every plant, all mixed up. */
export function randomVases(rand = Math.random) {
  const plants = 8
  return {
    ...vaseLevel('?', rand() < 0.5 ? 'day' : 'night', {
      title: 'Random',
      plants: pickN(VASE_PLANTS, plants, rand).map((plant) => ({ plant })),
      zombies: pickN(VASE_ZOMBIES, plants * 2, rand).map((zombie) => ({ zombie })),
    }),
    id: 'V?',
    label: 'Random Vases',
  }
}

export const MODES = [
  { id: 'conveyor', name: 'Conveyor Chaos', blurb: 'No sun. Plants arrive on a conveyor belt: plant them as they come.', levels: CONVEYOR, random: randomConveyor, randomBlurb: 'A random lawn, one plant on the belt for every zombie.' },
  { id: 'vase', name: 'Vase Breaker', blurb: 'No sun. Break the vases: plants become seeds, zombies climb out.', levels: VASES, random: randomVases, randomBlurb: 'Random vases, two zombies for every plant.' },
]
