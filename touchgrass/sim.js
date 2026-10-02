// TOUCHGRASS.EXE: the game itself, with no drawing and no DOM (draw.js draws it, app.js runs it).
//
// The lawn is `rows` × 9 tiles. x runs from 0 (the house) to 9 (the street) in tiles; a plant in
// column c sits at c + 0.5. Scrollers walk in from x ≈ 10. Time is in seconds.
// createGame(levelId, opts) → game; game.update(dt) runs it; the rest of the game.* functions
// are what the player can do. Things worth a sound or a banner go into game.events.

import { PLANT_BY_ID, ZOMBIE_BY_ID, LEVEL_BY_ID, AREAS, COIN_VALUES } from './data.js'

export const COLS = 9
const BITE = 100 // health a Scroller chews off a plant per second
const PEA_SPEED = 4.2
const STAR_SPEED = 4.2
const SKY_SUN_EVERY = [8, 11]
const SUN_LIFE = 10
const COIN_LIFE = 12
const FIRST_WAVE_AT = 18
const WAVE_GAP = [25, 31]
const HUGE_WARNING = 7
const BOSS_X = 7.4

const LAND_BASIC = new Set(['scroller', 'trend', 'beanie', 'vr'])
const WEIGHTS = {
  scroller: 4000, beanie: 4000, selfie: 2000, vr: 3000, boomer: 1000, bigscreen: 3500, cryptobro: 2000, dancer: 1000,
  floatie: 4000, scuba: 2000, slush: 2000, sled: 1500, jetski: 1500, powerbank: 1000, drone: 2000, miner: 1000, pogo: 1000,
  bungee: 1000, ladderguy: 1000, flinger: 1500, gigachad: 1500, sasquatch: 1,
}

export function createGame(levelId, opts = {}) {
  const level = LEVEL_BY_ID[levelId]
  if (!level) throw new Error(`No level ${levelId}`)
  const area = AREAS[level.area]
  const rand = opts.rand ?? Math.random
  const pick = (list) => list[Math.floor(rand() * list.length)]
  const between = ([a, b]) => a + rand() * (b - a)
  const owned = new Set(opts.owned ?? []) // shop purchases: 'poolbot', 'roofbot', 'rake', 'plant:quad', …
  const special = level.special ?? null
  const R = area.rows

  let nextId = 1
  const g = {
    level,
    area,
    rows: R,
    cols: COLS,
    special,
    t: 0,
    phase: 'intro', // 'intro' → 'play' → 'won' | 'lost'
    introLeft: opts.skipIntro ? 0 : 2.6,
    sun: special === 'conveyor' || special === 'bowling' || special === 'tiny' || special === 'vase' || special === 'bungeeblitz' || special === 'boss' ? 0 : (opts.sun ?? level.sunStart),
    plants: [],
    zombies: [],
    shots: [],
    drops: [], // sun, coins, the reward
    fx: [], // short visual effects: explosions, fumes, splats…
    events: [],
    mowers: [],
    graves: [],
    craters: [],
    vases: [],
    belt: null, // conveyor belt: { items: [{ id, x }], timer }
    seeds: [],
    boss: null,
    ice: Array.from({ length: R }, () => ({ start: Infinity, fadeAt: Infinity })),
    ladders: new Set(), // "r,c" cells with a ladder leaning on them
    fogClearUntil: 0,
    stats: { killed: 0, planted: 0, sunCollected: 0, coins: 0 },
    coinsEarned: 0,
    lastKill: null,
    rakes: [],
  }
  g.isWater = (r) => area.water.includes(r)
  g.rowOk = (r) => r >= 0 && r < R
  const lanesFor = level.lanes ?? Array.from({ length: R }, (_, i) => i)
  g.lanes = lanesFor
  g.sod = level.sod ?? null // the first levels only have some rows of lawn
  g.cells = Array.from({ length: R }, () => Array.from({ length: COLS }, () => ({ base: null, main: null, shell: null, coffee: null })))
  const cell = (r, c) => (g.rowOk(r) && c >= 0 && c < COLS ? g.cells[r][c] : null)
  g.cell = cell

  const event = (type, data = {}) => g.events.push({ type, ...data })
  const sfx = (name) => event('sfx', { name })
  const banner = (text, kind = 'info', time = 2.5) => event('banner', { text, kind, time })

  // ================= Setup =================
  // Robo-mowers on land (and pool/roof robots if bought from Gary).
  for (let r = 0; r < R; r++) {
    const water = g.isWater(r)
    const kind = area.roof ? (owned.has('roofbot') ? 'roof' : null) : water ? (owned.has('poolbot') ? 'pool' : null) : 'mower'
    const allowed = !g.sod || g.sod.includes(r)
    if (kind && allowed && special !== 'bowling' && special !== 'whack') g.mowers.push({ row: r, x: -0.45, state: 'ready', kind })
  }
  if (owned.has('rake') && !special) {
    const r = pick(lanesFor.filter((l) => !g.isWater(l)))
    if (r != null) g.rakes.push({ row: r, x: 6.3, used: false })
    g.usedRake = true
  }
  // Night: gravestones on the right of the lawn.
  for (let i = 0; i < (level.graves ?? 0); i++) {
    for (let tries = 0; tries < 40; tries++) {
      const r = pick(lanesFor)
      const c = 4 + Math.floor(rand() * 5)
      if (g.isWater(r) || g.graves.some((gr) => gr.row === r && gr.col === c)) continue
      g.graves.push({ row: r, col: c, id: nextId++ })
      break
    }
  }
  // The roof: Clay Pots already in the first three columns.
  if (area.roof && special !== 'boss') {
    for (let r = 0; r < R; r++) for (let c = 0; c < (level.pots ?? 3); c++) addPlant('pot', r, c, { free: true })
  }
  if (special === 'boss') for (let r = 0; r < R; r++) for (let c = 0; c < 3; c++) addPlant('pot', r, c, { free: true })
  // Conveyor-belt levels.
  if (level.conveyor || special === 'bowling' || special === 'vase') g.belt = { items: [], timer: 1.5, cap: 10 }
  // Vase Smasher: a wall of vases to break, half plants, half Scrollers.
  if (special === 'vase') {
    const plants = ['pea', 'double', 'frost', 'pom', 'coco', 'gulp', 'mine', 'ghost', 'zucchini', 'pea', 'double', 'pom']
    const zs = ['scroller', 'scroller', 'beanie', 'beanie', 'vr', 'cryptobro', 'selfie', 'scroller', 'beanie', 'vr', 'scroller', 'beanie', 'selfie']
    const contents = [...plants.map((id) => ({ plant: id })), ...zs.map((id) => ({ zombie: id }))].sort(() => rand() - 0.5)
    let i = 0
    for (let c = 4; c < 9; c++) for (let r = 0; r < R; r++) g.vases.push({ row: r, col: c, ...contents[i++ % contents.length], leaf: false })
    for (const v of g.vases) v.leaf = !!v.plant && rand() < 0.35 // some vases show a leaf: a plant's inside
  }
  // Seeds: what you picked (or, on conveyor levels, nothing: the belt brings them).
  if (!g.belt && special !== 'whack' && special !== 'vase') {
    for (const s of opts.seeds ?? level.plants ?? ['pea']) {
      const id = typeof s === 'string' ? s : s.id
      const imitated = typeof s === 'object' && !!s.imitated
      const def = PLANT_BY_ID[id]
      if (!def) continue
      g.seeds.push({ id, imitated, readyAt: def.start, total: def.start || def.recharge })
    }
  }
  if (special === 'whack') g.seeds = ['pom', 'mine'].map((id) => ({ id, imitated: false, readyAt: 0, total: PLANT_BY_ID[id].recharge }))

  // ================= Plants =================
  function addPlant(id, r, c, { imitated = false, free = false } = {}) {
    const def = PLANT_BY_ID[id]
    const layer = def.base ? 'base' : def.shell ? 'shell' : def.kind === 'coffee' ? 'coffee' : 'main'
    const p = {
      id: nextId++,
      type: id,
      def,
      row: r,
      col: c,
      hp: def.hp,
      maxHp: def.hp,
      layer,
      born: g.t,
      timer: 0,
      shotAt: -9,
      imitated,
      asleep: !!def.mushroom && !area.night,
      waking: imitated ? 1.2 : 0, // a Copycat Sprout takes a moment to become the copy
    }
    if (def.kind === 'shooter' || def.kind === 'fume' || def.kind === 'gloom' || def.kind === 'star' || def.kind === 'lobber' || def.kind === 'cattail') p.timer = 0.2 + rand() * 0.6
    if (def.kind === 'sun' || def.kind === 'marigold') p.timer = between(def.first)
    if (def.kind === 'bomb' || def.kind === 'freeze') p.timer = def.fuse
    if (def.kind === 'mine') p.timer = def.arm
    if (def.kind === 'gravebuster') p.timer = def.eat
    if (def.kind === 'blower') p.timer = 1.2
    if (def.kind === 'coffee') p.timer = 1
    if (def.kind === 'cob') p.timer = def.reload
    if (def.kind === 'spikes') p.uses = def.durability
    if (def.kind === 'magnet') p.timer = 0
    if (def.kind === 'lantern') p.light = def.light
    const ce = cell(r, c)
    ce[layer] = p
    if (def.wide) cell(r, c + 1)[layer] = p
    g.plants.push(p)
    if (!free) {
      g.stats.planted++
      sfx(g.isWater(r) && !ce.base ? 'plop' : 'plant')
    }
    return p
  }

  function removePlant(p, how = 'eaten') {
    if (p.gone) return
    p.gone = true
    for (const row of g.cells) for (const ce of row) for (const k of ['base', 'main', 'shell', 'coffee']) if (ce[k] === p) ce[k] = null
    g.plants = g.plants.filter((x) => x !== p)
    if (how === 'eaten') sfx('gulp')
    if (how === 'smashed') g.fx.push({ kind: 'smash', x: p.col + 0.5, y: p.row, t: g.t, life: 0.6 })
  }

  function damagePlant(p, amount, how) {
    if (p.gone) return
    p.hp -= amount
    p.hitAt = g.t
    if (p.hp <= 0) removePlant(p, how ?? 'eaten')
  }

  /** The plant a Scroller at this cell chews on first: the shell, then the plant, then what it stands on. */
  function eatable(r, c) {
    const ce = cell(r, c)
    if (!ce) return null
    if (ce.shell) return ce.shell
    if (ce.main && !ce.main.def.ground) return ce.main
    if (ce.coffee) return ce.coffee
    if (ce.base && !(ce.main && ce.main.def.ground)) return ce.base
    return null
  }
  const anyPlant = (r, c) => {
    const ce = cell(r, c)
    return ce && (ce.shell || ce.main || ce.base || ce.coffee)
  }
  const protectedByParasol = (r, c) => g.plants.some((p) => p.def.kind === 'umbrella' && !p.asleep && Math.abs(p.row - r) <= 1 && Math.abs(p.col - c) <= 1)

  // ================= Placing =================
  /** Why a seed can't go here (or null if it can). */
  g.whyNot = (id, r, c) => {
    const def = PLANT_BY_ID[id]
    const ce = cell(r, c)
    if (!def || !ce) return 'off'
    if (g.sod && !g.sod.includes(r)) return 'nolawn'
    if (special === 'bowling') return c <= 2 && !ce.main ? null : 'line'
    if (g.graves.some((gr) => gr.row === r && gr.col === c)) return def.kind === 'gravebuster' && !ce.main ? null : 'grave'
    if (def.kind === 'gravebuster') return 'needgrave'
    if (g.craters.some((cr) => cr.row === r && cr.col === c && cr.until > g.t)) return 'crater'
    if (c >= g.ice[r].start - 0.5) return 'ice'
    if (g.vases.some((v) => v.row === r && v.col === c)) return 'vase'
    if (special === 'boss' && c >= 7) return 'boss'
    const water = g.isWater(r)
    if (def.upgrade) {
      if (def.wide) {
        const a = ce.main
        const b = cell(r, c + 1)?.main
        return a?.type === def.upgrade && b?.type === def.upgrade && a !== b ? null : 'upgrade'
      }
      return ce.main?.type === def.upgrade ? null : 'upgrade'
    }
    if (def.kind === 'coffee') return ce.main?.asleep && !ce.coffee ? null : 'coffee'
    if (def.shell) {
      if (ce.shell) return 'taken'
      if (water && !ce.base) return 'water'
      if (area.roof && !ce.base) return 'pot'
      return null
    }
    if (def.base) {
      if (ce.base || ce.main) return 'taken'
      if (def.base === 'water') return water ? null : 'land'
      return water ? 'water' : null // a Clay Pot goes on land or the roof
    }
    if (ce.main) return 'taken'
    if (def.aquatic) return water && !ce.base ? null : 'land'
    if (water && !ce.base) return 'water'
    if (area.roof && !ce.base) return 'pot'
    if (def.ground && (ce.base || area.roof)) return 'ground'
    return null
  }

  function seedReady(s) {
    return g.t >= s.readyAt
  }
  /** Plants seed `i` (from the seed bank) at row r, column c. */
  g.plantSeed = (i, r, c) => {
    const s = g.seeds[i]
    if (!s || g.phase !== 'play') return false
    const def = PLANT_BY_ID[s.id]
    const cost = s.imitated ? def.cost : def.cost
    if (!seedReady(s) || g.sun < cost || g.whyNot(s.id, r, c)) return false
    g.sun -= cost
    placeFromSeed(s.id, r, c, s.imitated)
    s.readyAt = g.t + def.recharge
    s.total = def.recharge
    return true
  }
  /** Plants item `i` from the conveyor belt. */
  g.plantBelt = (i, r, c) => {
    const item = g.belt?.items[i]
    if (!item || g.phase !== 'play') return false
    if (item.id.startsWith('bowl')) {
      if (c > 2 || g.sod && !g.sod.includes(r)) return false
      g.belt.items.splice(i, 1)
      g.shots.push({ kind: 'roll', big: item.id === 'bowlBig', boom: item.id === 'bowlBoom', row: r, y: r, x: c + 0.5, vy: 0, hits: 0, last: null, targetRow: r })
      sfx('bowl')
      return true
    }
    if (g.whyNot(item.id, r, c)) return false
    g.belt.items.splice(i, 1)
    const p = placeFromSeed(item.id, r, c, false)
    // Mushrooms off the belt come ready to work, even in daylight.
    if (p) p.asleep = false
    return true
  }
  function placeFromSeed(id, r, c, imitated) {
    const def = PLANT_BY_ID[id]
    const ce = cell(r, c)
    if (def.upgrade) {
      const old = ce.main
      const wasAsleep = old?.asleep
      removePlant(old, 'quiet')
      if (def.wide) removePlant(cell(r, c + 1).main, 'quiet')
      const p = addPlant(id, r, c, { imitated })
      if (wasAsleep && def.mushroom) p.asleep = true
      return p
    }
    return addPlant(id, r, c, { imitated })
  }
  /** Digs up the top plant at r, c. */
  g.shovel = (r, c) => {
    const ce = cell(r, c)
    if (!ce || g.phase !== 'play') return false
    const p = ce.coffee ?? ce.main ?? ce.shell ?? ce.base
    if (!p) return false
    removePlant(p, 'quiet')
    sfx('shovel')
    return true
  }

  // ================= Drops: sun, coins, the reward =================
  function dropSun(x, y, value, from = 'plant') {
    const d = { id: nextId++, kind: 'sun', value, x, y: from === 'sky' ? -1.2 : y - 0.2, to: from === 'sky' ? 0.3 + rand() * (R - 1) : y + 0.15, vy: from === 'sky' ? 0.9 : -1.4, landed: false, t: g.t, life: SUN_LIFE, from, small: value < 25 }
    if (from === 'plant') d.vx = (rand() - 0.5) * 0.6
    g.drops.push(d)
  }
  function dropCoin(x, y, kind) {
    g.drops.push({ id: nextId++, kind: 'coin', coin: kind, value: COIN_VALUES[kind], x, y: y - 0.3, to: y + 0.2, vy: -1.6, vx: (rand() - 0.5) * 0.8, landed: false, t: g.t, life: COIN_LIFE })
  }
  /** Picks up whatever is at (x, y) (tiles). Returns what was collected, if anything. */
  g.collectAt = (x, y, radius = 0.45) => {
    let best = null
    let bd = radius
    for (const d of g.drops) {
      if (d.collected) continue
      const dist = Math.hypot(d.x - x, (d.y - y) * 0.9)
      if (dist < bd + (d.kind === 'reward' ? 0.3 : 0)) {
        bd = dist
        best = d
      }
    }
    if (best) collect(best)
    return best
  }
  function collect(d) {
    d.collected = true
    d.collectedAt = g.t
    if (d.kind === 'sun') {
      g.sun = Math.min(9990, g.sun + d.value)
      g.stats.sunCollected += d.value
      sfx('sun')
    } else if (d.kind === 'coin') {
      g.coinsEarned += d.value
      g.stats.coins += d.value
      sfx(d.coin === 'diamond' ? 'diamond' : 'coin')
    } else if (d.kind === 'reward') {
      g.phase = 'won'
      sfx('win')
      event('won', { reward: level.reward ?? (level.unlock ? 'plant' : 'money'), unlock: level.unlock ?? null })
    }
  }

  // ================= Scrollers =================
  function spawn(type, row, x, extra = {}) {
    const def = ZOMBIE_BY_ID[type]
    const tiny = special === 'tiny'
    const variance = 0.88 + rand() * 0.24
    const z = {
      id: nextId++,
      type,
      def,
      row,
      x,
      y: row,
      hp: def.hp * (tiny ? 0.5 : 1),
      maxHp: def.hp * (tiny ? 0.5 : 1),
      helmet: def.helmet ? { ...def.helmet, max: def.helmet.hp } : null,
      shield: def.shield ? { ...def.shield, max: def.shield.hp } : null,
      speed: def.speed * variance * (tiny ? 1.15 : 1),
      dir: -1,
      state: 'walk',
      born: g.t,
      slowUntil: 0,
      frozenUntil: 0,
      stunUntil: 0,
      hypno: false,
      tiny,
      water: g.isWater(row),
      eating: null,
      ...extra,
    }
    if (z.water && LAND_BASIC.has(type)) z.floatie = true
    if (def.vaults) z.state = 'run'
    if (def.flies) z.balloon = def.balloon
    if (def.digger) {
      z.state = 'dig'
      z.underground = true
      z.pickaxe = true
    }
    if (def.pogo) z.pogo = true
    if (def.jack) {
      z.box = true
      z.boomAt = null
    }
    if (def.ladder) z.state = 'walk'
    if (def.catapult) z.ammo = def.ammo
    if (def.gargantuar) z.imp = true
    if (def.submerged) z.under = true
    if (def.dancer) {
      z.state = 'moonwalk'
      z.summonAt = 0
      z.backups = []
    }
    if (def.vehicle === 'slush') z.vehicle = true
    if (def.catapult) z.vehicle = true
    g.zombies.push(z)
    return z
  }

  /** How much of a Scroller is left, armour included (waves move on when it drops low). */
  const totalHp = (z) => Math.max(0, z.hp) + (z.helmet?.hp ?? 0) + (z.shield?.hp ?? 0)

  function kill(z, cause = 'shot') {
    if (z.dying || z.gone) return
    z.dying = cause
    z.diedAt = g.t
    z.state = 'dead'
    g.stats.killed++
    g.lastKill = { x: Math.min(8.5, Math.max(0.5, z.x)), y: z.row }
    if (cause === 'ash') sfx('ash')
    // Coins: now and then a silver one, rarely gold, very rarely a diamond (Sasquatches: always).
    if (!z.hypno && !z.summoned && special !== 'whack') {
      const r = rand()
      if (z.type === 'sasquatch') dropCoin(z.x, z.row, 'diamond')
      else if (r < 0.005) dropCoin(z.x, z.row, 'diamond')
      else if (r < 0.025) dropCoin(z.x, z.row, 'gold')
      else if (r < 0.065) dropCoin(z.x, z.row, 'silver')
    }
    if (z.backups) for (const b of z.backups) b.leader = null
  }
  const gone = (z) => z.dying || z.gone

  /**
   * Damage to a Scroller. how: 'front' (a shot from the front: the shield takes it), 'back',
   * 'lob' (over the shield), 'fume' (through the shield), 'boom' (an explosion: everything, in
   * order), 'pure'.
   */
  function hurt(z, amount, how = 'front') {
    if (gone(z) || amount <= 0) return
    z.hitAt = g.t
    if (z.boss) return hurtBoss(amount)
    if (how === 'boom' || how === 'pure') {
      let left = amount
      for (const part of ['shield', 'helmet']) {
        if (!z[part] || left <= 0) continue
        const take = Math.min(left, z[part].hp)
        z[part].hp -= take
        left -= take
        if (z[part].hp <= 0) loseItem(z, part)
      }
      z.hp -= left
      if (z.hp <= 0) kill(z, how === 'boom' ? 'ash' : 'shot')
      return
    }
    if (how === 'front' && z.shield) {
      z.shield.hp -= amount
      if (z.shield.hp <= 0) loseItem(z, 'shield')
      return
    }
    // A helmet takes the hit first; what's left over goes through to the Scroller.
    if (z.helmet) {
      const take = Math.min(amount, z.helmet.hp)
      z.helmet.hp -= take
      amount -= take
      if (z.helmet.hp <= 0) loseItem(z, 'helmet')
      if (amount <= 0) return
    }
    z.hp -= amount
    if (z.hp <= 0) kill(z)
  }
  function loseItem(z, part) {
    const item = z[part]
    z[part] = null
    g.fx.push({ kind: 'drop', item: item?.name, x: z.x, y: z.row, t: g.t, life: 0.9 })
    if (z.type === 'boomer' && part === 'shield') {
      z.state = 'shocked'
      z.shockedUntil = g.t + 1.4
      sfx('angry')
    }
    if (z.type === 'ladderguy' && part === 'shield') z.speed = 0.21 * (z.speed / z.def.speed)
  }
  function slow(z, seconds) {
    if (z.boss) return
    if (g.t >= z.slowUntil) sfx('frozen')
    z.slowUntil = Math.max(z.slowUntil, g.t + seconds)
  }
  const factor = (z) => (g.t < z.slowUntil ? 0.5 : 1)
  const stuck = (z) => g.t < z.frozenUntil || g.t < z.stunUntil

  /** Scrollers plants can aim at in a row. */
  function targetable(z, { flying = false, under = false } = {}) {
    if (gone(z) || z.hypno || z.boss) return false
    if (z.underground && !under) return false
    if (z.under && !z.surfaced && !under) return false
    if (z.balloon > 0 && !flying) return false
    if (z.state === 'vault' || z.state === 'hop' || z.state === 'thrown' || z.state === 'rising') return false
    if (z.bungee && z.bungee !== 'down') return false
    return z.x < 9.35
  }

  // ================= Waves =================
  const W = special === 'vase' || special === 'boss' ? 0 : level.waves
  g.waves = { total: W, index: 0, nextAt: special === 'whack' ? 6 : FIRST_WAVE_AT, hugeAt: null, current: [], currentHp: 1, finalSpawned: W === 0, flags: [] }
  for (let n = 10; n <= W; n += 10) g.waves.flags.push(n)
  if (W && W < 10) g.waves.flags.push(W)
  const isHuge = (n) => n % 10 === 0 || n === W
  const recentLanes = []
  function laneFor(type) {
    const def = ZOMBIE_BY_ID[type]
    let lanes = lanesFor.filter((r) => {
      if (def.water) return g.isWater(r)
      if (type === 'sled') return g.ice[r].start < 9
      if (def.land && !LAND_BASIC.has(type)) return !g.isWater(r)
      return true
    })
    if (!lanes.length) return null
    // Spread them out: lanes used recently are less likely.
    const w = lanes.map((r) => 1 / (1 + recentLanes.filter((x) => x === r).length * 1.5))
    let roll = rand() * w.reduce((a, b) => a + b, 0)
    for (let i = 0; i < lanes.length; i++) if ((roll -= w[i]) <= 0) return lanes[i]
    return lanes[lanes.length - 1]
  }
  function pointsFor(n) {
    const base = Math.floor(n * 0.8) + 1
    return Math.max(1, Math.round(base * Math.min(1, level.power ?? 1) * (isHuge(n) ? 2.5 : 1)))
  }
  function composeWave(n) {
    let budget = pointsFor(n)
    const out = []
    if (isHuge(n) && W >= 10) out.push('trend')
    const pool = level.zombies.filter((t) => t !== 'trend' && t !== 'backup' && t !== 'ipadkid')
    if (level.intro && n <= 2 && !out.includes(level.intro)) {
      out.push(level.intro)
      budget -= Math.min(budget - 1, ZOMBIE_BY_ID[level.intro].points)
    }
    let guard = 0
    while (budget > 0 && guard++ < 200) {
      const fits = pool.filter((t) => ZOMBIE_BY_ID[t].points <= budget && (t !== 'sled' || g.ice.some((ic) => ic.start < 9)))
      if (!fits.length) break
      const total = fits.reduce((a, t) => a + (WEIGHTS[t] ?? 1000), 0)
      let roll = rand() * total
      let chosen = fits[0]
      for (const t of fits) if ((roll -= WEIGHTS[t] ?? 1000) <= 0) {
        chosen = t
        break
      }
      out.push(chosen)
      budget -= ZOMBIE_BY_ID[chosen].points
    }
    if (!out.length) out.push(pool[0] ?? 'scroller')
    return out
  }
  function startWave() {
    const w = g.waves
    w.index++
    const n = w.index
    const types = composeWave(n)
    const spawned = []
    types.forEach((type, i) => {
      if (type === 'bungee') {
        const z = dropBungee('steal')
        if (z) spawned.push(z)
        return
      }
      const row = laneFor(type)
      if (row == null) return
      recentLanes.push(row)
      if (recentLanes.length > 6) recentLanes.shift()
      const x = 9.7 + (i % 4) * 0.22 + rand() * 0.6
      if (special === 'bungeeblitz' && type !== 'trend') {
        const z = dropBungee('deliver', type)
        if (z) spawned.push(z)
        return
      }
      if (special === 'whack') {
        spawned.push(riseFromGrave(type))
        return
      }
      if (type === 'sled') {
        spawned.push(...spawnSled(row, x))
        return
      }
      spawned.push(spawn(type, row, x))
    })
    // The final wave: every gravestone lets a Scroller out.
    if (n === W) {
      for (const gr of g.graves) {
        const type = pick(level.zombies.filter((t) => LAND_BASIC.has(t) || t === 'boomer'))
        if (type) spawned.push(spawn(type, gr.row, gr.col + 0.6, { state: 'rising', risingUntil: g.t + 1.5 }))
      }
      w.finalSpawned = true
    }
    w.current = spawned
    w.currentHp = spawned.reduce((a, z) => a + totalHp(z), 0) || 1
    w.startedAt = g.t
    w.nextAt = n >= W ? Infinity : g.t + between(WAVE_GAP)
    if (n === 1) sfx('groan')
    if (isHuge(n)) sfx('siren')
  }
  function stepWaves() {
    const w = g.waves
    if (w.index >= W) return
    const next = w.index + 1
    // A huge wave gets a warning first.
    if (isHuge(next) && w.hugeAt == null) {
      const due = g.t >= w.nextAt || (w.index > 0 && waveWeak())
      if (due) {
        w.hugeAt = g.t + HUGE_WARNING
        banner(next === W ? 'A huge wave of Scrollers is approaching! (final wave)' : 'A huge wave of Scrollers is approaching!', 'huge', 4)
        sfx('warning')
      }
      return
    }
    if (w.hugeAt != null) {
      if (g.t >= w.hugeAt) {
        w.hugeAt = null
        if (next === W) banner('FINAL WAVE', 'final', 2.5)
        startWave()
      }
      return
    }
    if (g.t >= w.nextAt || (w.index > 0 && waveWeak())) startWave()
  }
  /** The current wave is mostly dealt with: bring the next one forward. */
  function waveWeak() {
    const w = g.waves
    if (g.t - w.startedAt < 4.5) return false
    const left = w.current.filter((z) => !gone(z)).reduce((a, z) => a + totalHp(z), 0)
    return left < w.currentHp * 0.5
  }
  g.progress = () => (W ? Math.min(1, g.waves.index / W) : g.vases.length ? 1 - g.vases.length / 25 : g.boss ? 1 - g.boss.hp / g.boss.maxHp : 0)

  // Whack-a-Scroller: Scrollers climb out of gravestones that pop up all over the lawn.
  function riseFromGrave(type) {
    let gr = g.graves.length && rand() < 0.6 ? pick(g.graves) : null
    if (!gr) {
      for (let tries = 0; tries < 30 && !gr; tries++) {
        const r = pick(lanesFor)
        const c = 3 + Math.floor(rand() * 6)
        if (!g.graves.some((x) => x.row === r && x.col === c)) {
          gr = { row: r, col: c, id: nextId++ }
          g.graves.push(gr)
        }
      }
    }
    gr ??= g.graves[0]
    return spawn(type, gr.row, gr.col + 0.6, { state: 'rising', risingUntil: g.t + 1.2 })
  }
  /** Hit what's under the mallet (Whack-a-Scroller). */
  g.whack = (x, y) => {
    if (special !== 'whack' || g.phase !== 'play') return null
    const z = g.zombies.find((z) => !gone(z) && Math.round(y) === z.row && Math.abs(z.x - x) < 0.45)
    sfx('whack')
    g.fx.push({ kind: 'whack', x, y, t: g.t, life: 0.35 })
    if (z) {
      hurt(z, 450, 'pure')
      if (gone(z)) dropSun(z.x, z.row, 25, 'plant')
    }
    return z ?? null
  }
  // Vase Smasher.
  g.breakVase = (r, c) => {
    const i = g.vases.findIndex((v) => v.row === r && v.col === c)
    if (i < 0 || g.phase !== 'play') return null
    const [v] = g.vases.splice(i, 1)
    sfx('vase')
    g.fx.push({ kind: 'shards', x: c + 0.5, y: r, t: g.t, life: 0.7 })
    if (v.plant) g.belt.items.push({ id: v.plant, x: 99 })
    if (v.zombie) spawn(v.zombie, r, c + 0.7, { state: 'walk' })
    return v
  }

  // ================= Sleds, bungees and the boss =================
  function spawnSled(row, x) {
    const riders = []
    for (let i = 0; i < 4; i++) riders.push(spawn('sled', row, x + i * 0.32, { riding: true }))
    for (const rd of riders) rd.riders = riders
    return riders
  }
  /** A Bungee Thief drops in: 'steal' takes a plant, 'deliver' drops off a Scroller. */
  function dropBungee(mode, cargo = null, at = null) {
    let row
    let col
    if (at) {
      row = at[0]
      col = at[1]
    } else if (mode === 'steal') {
      const victims = g.plants.filter((p) => p.layer !== 'coffee' && !(p.def.base && cell(p.row, p.col).main))
      const p = victims.length ? pick(victims) : null
      row = p ? p.row : pick(lanesFor)
      col = p ? p.col : 3 + Math.floor(rand() * 6)
    } else {
      row = pick(lanesFor.filter((r) => !g.isWater(r)).length ? lanesFor.filter((r) => !g.isWater(r)) : lanesFor)
      col = 4 + Math.floor(rand() * 5)
    }
    return spawn('bungee', row, col + 0.5, { bungee: 'aim', bungeeMode: mode, cargo, col, aimUntil: g.t + 3, state: 'bungee' })
  }
  if (special === 'boss') g.boss = { hp: 40000, maxHp: 40000, state: 'enter', timer: 4, next: 0, head: false, ball: null, cycle: 0 }
  function hurtBoss(amount) {
    const b = g.boss
    if (!b || b.hp <= 0) return
    b.hp -= amount * (b.head ? 1.5 : 1)
    b.hitAt = g.t
    if (b.hp <= 0) {
      b.hp = 0
      b.state = 'dying'
      b.timer = 3
      sfx('bigboom')
      for (const z of g.zombies) if (!gone(z)) kill(z, 'ash')
    }
  }
  function stepBoss(dt) {
    const b = g.boss
    if (!b) return
    b.timer -= dt
    if (b.state === 'dying') {
      if (b.timer <= 0 && !g.drops.some((d) => d.kind === 'reward')) {
        g.boss = { ...b, state: 'gone' }
        g.drops.push({ id: nextId++, kind: 'reward', x: 6.5, y: 2, to: 2.2, vy: -1, landed: false, t: g.t, life: Infinity })
      }
      return
    }
    if (b.state === 'gone') return
    const fast = b.hp < b.maxHp / 2 ? 0.7 : 1
    if (b.ball) {
      const ball = b.ball
      ball.x -= 0.9 * dt
      for (let c = 0; c < COLS; c++) {
        if (Math.abs(c + 0.5 - ball.x) < 0.5) for (const p of [cell(ball.row, c).shell, cell(ball.row, c).main, cell(ball.row, c).base]) if (p) removePlant(p, 'smashed')
      }
      if (ball.x < -1) {
        b.ball = null
        b.head = false
        b.state = 'idle'
        b.timer = 4 * fast
      }
      return
    }
    if (b.timer > 0) return
    switch (b.state) {
      case 'enter':
        banner('The Algorithm has entered the chat.', 'huge', 3)
        b.state = 'idle'
        b.timer = 3
        break
      case 'idle': {
        b.cycle++
        const moves = ['summon', 'summon', 'van', 'stomp', b.cycle % 3 === 0 ? 'ball' : 'summon']
        b.state = pick(moves)
        b.timer = b.state === 'ball' ? 2.5 : 1.5
        if (b.state === 'ball') {
          b.head = true
          b.ballKind = rand() < 0.5 ? 'fire' : 'ice'
          b.ballRow = pick(lanesFor)
          banner(b.ballKind === 'fire' ? 'The Algorithm is overheating… (a Frostcap would put that out)' : 'The Algorithm is going cold… (a Ghost Pepper would melt that)', 'info', 3)
        }
        break
      }
      case 'summon': {
        const n = 2 + Math.floor(rand() * 3)
        for (let i = 0; i < n; i++) dropBungee('deliver', pick(['scroller', 'beanie', 'vr', 'beanie', 'ladderguy', 'cryptobro']), [pick(lanesFor), 5 + Math.floor(rand() * 2)])
        b.state = 'idle'
        b.timer = 9 * fast
        break
      }
      case 'van': {
        const row = pick(lanesFor)
        g.shots.push({ kind: 'van', row, x: 6.8, y: row, vx: -2.2 })
        sfx('van')
        b.state = 'idle'
        b.timer = 8 * fast
        break
      }
      case 'stomp': {
        const rows = [pick(lanesFor), pick(lanesFor)]
        for (const r of rows) for (const c of [5, 6]) for (const p of [cell(r, c)?.shell, cell(r, c)?.main, cell(r, c)?.base]) if (p) removePlant(p, 'smashed')
        g.fx.push({ kind: 'stomp', rows, t: g.t, life: 0.8 })
        sfx('stomp')
        b.state = 'idle'
        b.timer = 7 * fast
        break
      }
      case 'ball':
        b.ball = { kind: b.ballKind, row: b.ballRow, x: 6.6 }
        sfx(b.ballKind === 'fire' ? 'fireball' : 'iceball')
        break
    }
  }

  // ================= Player tools =================
  /** Fires a ready Kernel Cannon at (x, row). */
  g.fireCannon = (p, x, row) => {
    if (!p || p.def.kind !== 'cob' || p.timer > 0 || g.phase !== 'play') return false
    p.timer = p.def.reload
    p.shotAt = g.t
    g.shots.push({ kind: 'cob', from: { x: p.col + 1, y: p.row }, tx: x, ty: row, t0: g.t, dur: 2.2, y: row })
    sfx('launch')
    return true
  }
  g.cannonReady = (p) => p?.def.kind === 'cob' && p.timer <= 0

  // ================= The loop =================
  g.update = (dt) => {
    if (g.phase === 'won' || g.phase === 'lost') {
      stepDrops(dt)
      return
    }
    if (g.phase === 'intro') {
      g.introLeft -= dt
      if (g.introLeft <= 0) {
        g.phase = 'play'
        if (!opts.skipIntro) banner('PLANT!', 'go', 0.9)
      }
      return
    }
    g.t += dt
    stepSky()
    stepBelt(dt)
    if (W) stepWaves()
    stepBoss(dt)
    stepSeeds()
    for (const p of [...g.plants]) if (!p.gone) stepPlant(p, dt)
    stepShots(dt)
    for (const z of [...g.zombies]) if (!z.gone) stepZombie(z, dt)
    stepMowers(dt)
    stepDrops(dt)
    stepIce()
    g.fx = g.fx.filter((f) => g.t - f.t < f.life)
    g.zombies = g.zombies.filter((z) => !(z.dying && g.t - z.diedAt > 1.4) && !z.gone)
    checkEnd()
  }

  // Sun falls from the sky in the daytime (not at night, and not on the special levels).
  function stepSky() {
    if (area.night || special) return
    g.skyAt ??= g.t + 4
    if (g.t >= g.skyAt) {
      dropSun(1 + rand() * 7, 0, 25, 'sky')
      g.skyAt = g.t + between(SKY_SUN_EVERY)
    }
  }
  function stepBelt(dt) {
    const b = g.belt
    if (!b) return
    // Items slide left until they bunch up.
    b.items.forEach((it, i) => {
      const slot = i * 1.0
      if (it.x > slot) it.x = Math.max(slot, it.x - dt * 1.4)
    })
    if (special === 'vase') return
    b.timer -= dt
    if (b.timer <= 0 && b.items.length < b.cap) {
      let id
      if (special === 'bowling') id = rand() < 0.1 ? 'bowlBoom' : rand() < 0.06 ? 'bowlBig' : 'bowl'
      else {
        const list = level.conveyor
        // Don't flood the belt with one plant: re-roll a repeat once.
        id = pick(list)
        if (b.items.at(-1)?.id === id) id = pick(list)
      }
      b.items.push({ id, x: 10.5 })
      b.timer = special === 'bowling' ? 3.2 : special === 'boss' ? 3 : 4.2
    }
  }
  function stepSeeds() {
    // (Recharge is measured against g.t: nothing to do but keep conveyor-free levels honest.)
  }

  // ---------- Plants ----------
  function zombiesInRow(r) {
    return g.zombies.filter((z) => z.row === r && !gone(z))
  }
  function firstAhead(r, x0, { maxDist = Infinity, flying = false, behind = false } = {}) {
    let best = null
    for (const z of g.zombies) {
      if (z.row !== r || !targetable(z, { flying })) continue
      const d = behind ? x0 - z.x : z.x - x0
      if (d < -0.15 || d > maxDist) continue
      if (!best || (behind ? z.x > best.x : z.x < best.x)) best = z
    }
    return best
  }
  function shoot(p, spec) {
    const back = !!spec.back
    const row = p.row + (spec.lane ?? 0)
    if (!g.rowOk(row)) return
    const kind = spec.shot
    const s = {
      kind,
      row,
      y: p.row,
      targetY: row,
      x: p.col + (back ? 0.2 : 0.8),
      vx: back ? -PEA_SPEED : PEA_SPEED,
      dmg: 20,
      frost: kind === 'frost',
      fire: false,
      maxX: p.def.range ? p.col + 0.5 + p.def.range + 0.3 : 10.5,
      roofStop: area.roof && !back && p.col < 5 ? 5.0 : null,
      torchCol: null,
      hitsFlying: kind === 'spike',
    }
    g.shots.push(s)
  }
  function fire(p) {
    p.shotAt = g.t
    for (const spec of p.def.shots) {
      if (spec.delay) setTimeoutGame(spec.delay, () => !p.gone && shoot(p, spec))
      else shoot(p, spec)
    }
    sfx(p.def.shots[0].shot === 'spore' ? 'puff' : 'shoot')
  }
  const later = []
  function setTimeoutGame(delay, fn) {
    later.push({ at: g.t + delay, fn })
  }

  function stepPlant(p, dt) {
    const def = p.def
    if (p.waking > 0) {
      p.waking -= dt
      return
    }
    if (p.asleep) return
    const r = p.row
    const c = p.col
    const cx = c + 0.5
    switch (def.kind) {
      case 'shooter': {
        p.timer -= dt
        if (def.scared) {
          const near = g.zombies.some((z) => !gone(z) && !z.hypno && Math.abs(z.row - r) <= 1 && z.x - cx > -0.6 && z.x - cx < 1.7 && !z.underground && !(z.balloon > 0))
          p.hiding = near
          if (near) return
        }
        if (p.timer > 0) return
        let target = null
        if (def.lanes) target = def.lanes.some((d) => firstAhead(r + d, cx, { flying: false }))
        else if (def.id === 'back') target = firstAhead(r, cx) || firstAhead(r, cx, { behind: true })
        else target = firstAhead(r, cx, { maxDist: def.range ? def.range + 0.4 : Infinity, flying: !!def.popsBalloons })
        if (!target) return
        if (def.id === 'back') {
          const ahead = firstAhead(r, cx)
          const behind = firstAhead(r, cx, { behind: true })
          p.shotAt = g.t
          if (ahead) shoot(p, def.shots[0])
          if (behind) {
            shoot(p, def.shots[1])
            setTimeoutGame(0.15, () => !p.gone && shoot(p, def.shots[2]))
          }
          sfx('shoot')
        } else fire(p)
        p.timer = def.rate
        return
      }
      case 'sun': {
        p.timer -= dt
        if (p.timer > 0) return
        const grown = def.grow && g.t - p.born >= def.grow
        const amount = def.grow ? (grown ? def.grown : def.amount) : def.amount
        for (let i = 0; i < (def.count ?? 1); i++) dropSun(cx + (i ? 0.25 : 0), r, amount, 'plant')
        p.glowAt = g.t
        p.timer = def.every
        return
      }
      case 'marigold': {
        p.timer -= dt
        if (p.timer > 0) return
        dropCoin(cx, r, rand() < 0.1 ? 'gold' : 'silver')
        p.timer = def.every
        return
      }
      case 'bomb': {
        p.timer -= dt
        if (p.timer > 0) return
        explodePlant(p)
        return
      }
      case 'freeze': {
        p.timer -= dt
        if (p.timer > 0) return
        for (const z of g.zombies) {
          if (gone(z) || z.hypno || z.x > 9.6) continue
          if (z.boss) continue
          hurt(z, def.damage, 'pure')
          z.frozenUntil = g.t + def.freeze
          z.slowUntil = g.t + def.freeze + def.slow
        }
        if (g.boss?.ball?.kind === 'fire') {
          g.boss.ball = null
          g.boss.state = 'idle'
          g.boss.timer = 10
          banner('Fireball: put out. The Algorithm is stunned!', 'go', 2)
          g.boss.head = true
          setTimeoutGame(6, () => g.boss && (g.boss.head = false))
        }
        g.fx.push({ kind: 'freeze', t: g.t, life: 1 })
        sfx('freeze')
        removePlant(p, 'quiet')
        return
      }
      case 'mine': {
        if (p.timer > 0) {
          p.timer -= dt
          if (p.timer <= 0) {
            p.armed = true
            sfx('armed')
          }
          return
        }
        const z = g.zombies.find((z) => z.row === r && !gone(z) && !z.hypno && !z.bungee && !(z.balloon > 0) && Math.abs(z.x - (cx + 0.3)) < 0.55)
        if (z) {
          for (const v of g.zombies) if (v.row === r && !gone(v) && Math.abs(v.x - (cx + 0.3)) < 0.75 && !(v.balloon > 0)) hurt(v, def.damage, 'boom')
          g.fx.push({ kind: 'mine', x: cx, y: r, t: g.t, life: 1.2 })
          sfx('mine')
          removePlant(p, 'quiet')
        }
        return
      }
      case 'chomper': {
        if (p.chewing) {
          p.timer -= dt
          if (p.timer <= 0) p.chewing = false
          return
        }
        if (p.biting) {
          p.timer -= dt
          if (p.timer > 0) return
          p.biting = false
          const z = p.biting_target
          if (z && !gone(z) && z.row === r && z.x - cx < 1.6 && z.x - cx > -0.4) {
            if (z.def.gargantuar || z.vehicle || z.boss) hurt(z, 40, 'pure')
            else {
              kill(z, 'eaten')
              z.gone = true
              p.chewing = true
              p.timer = def.chew
              sfx('chomp')
            }
          }
          return
        }
        const z = g.zombies.find((z) => z.row === r && targetable(z) && z.x - cx < 1.45 && z.x - cx > -0.3)
        if (z) {
          p.biting = true
          p.biting_target = z
          p.timer = 0.7
          p.shotAt = g.t
        }
        return
      }
      case 'squash': {
        if (p.jumping) {
          p.timer -= dt
          if (p.timer > 0) return
          const x = p.jumpX
          for (const z of g.zombies) if (z.row === r && !gone(z) && !z.hypno && !z.underground && !(z.balloon > 0) && Math.abs(z.x - x) < 0.6) hurt(z, def.damage, 'boom')
          g.fx.push({ kind: 'squash', x, y: r, t: g.t, life: 0.5 })
          sfx('squash')
          removePlant(p, 'quiet')
          return
        }
        const z = g.zombies.find((z) => z.row === r && targetable(z) && z.x - cx < 1.6 && z.x - cx > -0.9)
        if (z) {
          p.jumping = true
          p.jumpX = z.x
          p.timer = 0.75
          p.shotAt = g.t
          sfx('hmm')
        }
        return
      }
      case 'tangle': {
        if (p.grabbing) {
          p.timer -= dt
          if (p.timer <= 0) {
            const z = p.grabbing
            if (!gone(z)) {
              kill(z, 'drowned')
              z.gone = true
            }
            removePlant(p, 'quiet')
            sfx('splash')
          }
          return
        }
        const z = g.zombies.find((z) => z.row === r && !gone(z) && !z.hypno && z.water && !z.boss && Math.abs(z.x - (cx + 0.4)) < 0.55)
        if (z) {
          p.grabbing = z
          z.grabbed = true
          p.timer = 1
        }
        return
      }
      case 'spikes': {
        p.timer -= dt
        // Vehicles that touch it pop (and wear it down).
        for (const z of g.zombies) {
          if (z.row !== r || gone(z) || !z.vehicle || Math.abs(z.x - (cx + 0.3)) > 0.5) continue
          kill(z, 'popped')
          sfx('pop')
          p.uses -= 1
          if (p.uses <= 0) return removePlant(p, 'smashed')
        }
        if (p.timer > 0) return
        p.timer = def.every
        let hit = false
        for (const z of g.zombies) {
          if (z.row !== r || gone(z) || z.hypno || z.underground || z.balloon > 0 || z.state === 'vault' || z.state === 'hop' || z.bungee) continue
          if (z.x < c - 0.1 || z.x > c + 1.2) continue
          hurt(z, def.damage, 'pure')
          hit = true
        }
        if (hit) p.shotAt = g.t
        return
      }
      case 'fume': {
        p.timer -= dt
        if (p.timer > 0) return
        const reach = def.reach + 0.5
        const hits = g.zombies.filter((z) => z.row === r && targetable(z) && z.x > cx - 0.2 && z.x < cx + reach)
        if (!hits.length) return
        for (const z of hits) hurt(z, def.damage, 'fume')
        g.fx.push({ kind: 'fume', x: cx, y: r, len: reach, t: g.t, life: 0.5 })
        p.shotAt = g.t
        p.timer = def.rate
        sfx('fume')
        return
      }
      case 'gloom': {
        p.timer -= dt
        if (p.timer > 0) return
        const hits = () => g.zombies.filter((z) => Math.abs(z.row - r) <= 1 && targetable(z) && z.x > c - 0.5 && z.x < c + 1.6)
        if (!hits().length) return
        for (let i = 0; i < 4; i++) setTimeoutGame(i * 0.15, () => !p.gone && hits().forEach((z) => hurt(z, def.damage, 'fume')))
        g.fx.push({ kind: 'gloom', x: cx, y: r, t: g.t, life: 0.7 })
        p.shotAt = g.t
        p.timer = def.rate
        sfx('fume')
        return
      }
      case 'star': {
        p.timer -= dt
        if (p.timer > 0) return
        // Any Scroller on a line it can shoot along?
        const any = g.zombies.some((z) => targetable(z) && (z.row === r || (z.x > cx && Math.abs(z.x - cx) * 0.577 + 0.6 > Math.abs(z.row - r)) || Math.abs(z.x - cx) < 0.6))
        if (!any) return
        const dirs = [
          [-1, 0],
          [0, -1],
          [0, 1],
          [0.866, -0.5],
          [0.866, 0.5],
        ]
        for (const [vx, vy] of dirs) g.shots.push({ kind: 'star', x: cx, y: r, vx: vx * STAR_SPEED, vy: vy * STAR_SPEED * 0.85, dmg: def.damage, free: true })
        p.shotAt = g.t
        p.timer = def.rate
        sfx('shoot')
        return
      }
      case 'lobber': {
        p.timer -= dt
        if (p.timer > 0) return
        let target = null
        for (const z of g.zombies) {
          if (z.row !== r || !targetable(z) || z.x < cx - 0.1) continue
          if (!target || z.x < target.x) target = z
        }
        if (!target && g.boss && g.boss.state !== 'gone' && g.boss.state !== 'dying') target = 'boss'
        if (!target) return
        const kernel = def.shot === 'kernel'
        const butter = kernel && rand() < 0.25
        const tx = target === 'boss' ? BOSS_X - 0.3 : target.x
        g.shots.push({
          kind: def.shot === 'kernel' ? (butter ? 'butter' : 'kernel') : def.shot,
          lob: true,
          row: r,
          from: { x: cx, y: r },
          target,
          tx,
          t0: g.t,
          dur: 0.85 + Math.abs(tx - cx) * 0.06,
          dmg: def.shot === 'lettuce' ? 40 : def.shot === 'kernel' ? (butter ? 40 : 20) : 80,
          splash: def.shot === 'melon' || def.shot === 'frostmelon',
          frost: def.shot === 'frostmelon',
          butter,
          y: r,
          x: cx,
        })
        p.shotAt = g.t
        p.timer = def.rate
        sfx('lob')
        return
      }
      case 'cattail': {
        p.timer -= dt
        if (p.timer > 0) return
        const t = g.zombies.filter((z) => !gone(z) && !z.hypno && !z.underground && !z.under && !z.boss && z.x < 9.35 && z.state !== 'vault' && z.state !== 'hop')
        if (!t.length) return
        const target = t.find((z) => z.balloon > 0) ?? t.reduce((a, z) => (Math.hypot(z.x - cx, z.row - r) < Math.hypot(a.x - cx, a.row - r) ? z : a))
        for (let i = 0; i < 2; i++) setTimeoutGame(i * 0.2, () => !p.gone && g.shots.push({ kind: 'homing', x: cx, y: r, target, dmg: 20, speed: 4.5 }))
        p.shotAt = g.t
        p.timer = def.rate
        sfx('shoot')
        return
      }
      case 'gravebuster': {
        p.timer -= dt
        if (p.timer > 0) return
        g.graves = g.graves.filter((gr) => !(gr.row === r && gr.col === c))
        removePlant(p, 'quiet')
        sfx('crunch')
        return
      }
      case 'blower': {
        p.timer -= dt
        if (p.timer > 0.9) {
          if (!p.blew) {
            p.blew = true
            for (const z of g.zombies) if (!gone(z) && z.balloon > 0) {
              z.blownAway = true
              z.state = 'blown'
            }
            g.fogClearUntil = g.t + def.fogClear
            sfx('wind')
          }
          return
        }
        if (p.timer <= 0) removePlant(p, 'quiet')
        return
      }
      case 'magnet':
      case 'goldmagnet': {
        if (def.kind === 'goldmagnet') {
          p.timer -= dt
          if (p.timer > 0) return
          const coin = g.drops.find((d) => d.kind === 'coin' && !d.collected && d.landed)
          if (coin) {
            collect(coin)
            p.shotAt = g.t
          }
          p.timer = 1.5
          return
        }
        if (p.timer > 0) {
          p.timer -= dt
          return
        }
        const reach = def.reach
        let best = null
        for (const z of g.zombies) {
          if (gone(z) || z.hypno) continue
          const d = Math.hypot(z.x - cx, z.row - r)
          if (d > reach) continue
          const metal = (z.helmet?.metal && 'helmet') || (z.shield?.metal && 'shield') || (z.pickaxe && 'pickaxe') || (z.pogo && 'pogo') || (z.box && 'box')
          if (!metal) continue
          if (!best || d < best.d) best = { z, d, metal }
        }
        // Ladders leaning on walls count too.
        if (!best) {
          for (const key of g.ladders) {
            const [lr, lc] = key.split(',').map(Number)
            if (Math.hypot(lc + 0.5 - cx, lr - r) <= reach) {
              g.ladders.delete(key)
              p.holding = 'Ladder'
              p.timer = def.reload
              sfx('magnet')
              return
            }
          }
          return
        }
        const { z, metal } = best
        if (metal === 'helmet') {
          p.holding = z.helmet.name
          z.helmet = null
        } else if (metal === 'shield') {
          p.holding = z.shield.name
          z.shield = null
          if (z.type === 'ladderguy') z.speed = 0.21
        } else if (metal === 'pickaxe') {
          p.holding = 'Pickaxe'
          z.pickaxe = false
          if (z.underground) {
            z.underground = false
            z.state = 'walk'
            z.dir = -1
            z.speed = 0.21
          }
        } else if (metal === 'pogo') {
          p.holding = 'Pogo stick'
          z.pogo = false
          z.speed = 0.21
          if (z.state === 'hop') z.state = 'walk'
        } else if (metal === 'box') {
          p.holding = 'Power bank'
          z.box = false
        }
        p.timer = def.reload
        p.shotAt = g.t
        sfx('magnet')
        return
      }
      case 'coffee': {
        p.timer -= dt
        if (p.timer > 0) return
        const m = cell(r, c).main
        if (m) m.asleep = false
        removePlant(p, 'quiet')
        sfx('slurp')
        return
      }
      case 'cob': {
        if (p.timer > 0) p.timer -= dt
        return
      }
      default:
        return
    }
  }

  function explodePlant(p) {
    const def = p.def
    const r = p.row
    const cx = p.col + 0.5
    const hits = g.zombies.filter((z) => {
      if (gone(z) || z.boss) return false
      if (def.area === 'lane') return z.row === r
      if (def.area === 'square') return Math.abs(z.row - r) <= 1 && Math.abs(z.x - cx) <= 1.55
      return Math.hypot(z.x - cx, (z.row - r) * 1) <= def.radius
    })
    for (const z of hits) hurt(z, def.damage, 'boom')
    // The boss is big enough to be in range of most things near the right.
    if (g.boss && g.boss.state !== 'gone' && (def.area === 'lane' || cx > 5.4)) hurtBoss(def.damage)
    if (def.area === 'lane') {
      g.ice[r] = { start: Infinity, fadeAt: Infinity }
      if (g.boss?.ball?.kind === 'ice' && g.boss.ball.row === r) {
        g.boss.ball = null
        g.boss.state = 'idle'
        g.boss.timer = 10
        g.boss.head = true
        banner('Iceball: melted. The Algorithm is stunned!', 'go', 2)
        setTimeoutGame(6, () => g.boss && (g.boss.head = false))
      }
    }
    if (def.crater) g.craters.push({ row: r, col: p.col, until: g.t + def.crater })
    g.fx.push({ kind: def.area === 'lane' ? 'fireline' : def.crater ? 'cloud' : 'boom', x: cx, y: r, radius: def.radius ?? 1.5, t: g.t, life: def.crater ? 1.6 : 1 })
    sfx(def.crater ? 'bigboom' : def.area === 'lane' ? 'whoosh' : 'boom')
    removePlant(p, 'quiet')
  }

  // ---------- Shots ----------
  function stepShots(dt) {
    for (const f of later.filter((l) => g.t >= l.at)) {
      later.splice(later.indexOf(f), 1)
      f.fn()
    }
    for (const s of [...g.shots]) {
      if (s.done) continue
      if (s.lob) stepLob(s)
      else if (s.kind === 'cob') stepCob(s)
      else if (s.kind === 'roll') stepRoll(s, dt)
      else if (s.kind === 'van') stepVan(s, dt)
      else if (s.kind === 'phone') stepPhone(s)
      else if (s.kind === 'homing') stepHoming(s, dt)
      else if (s.kind === 'star') stepStar(s, dt)
      else stepStraight(s, dt)
    }
    g.shots = g.shots.filter((s) => !s.done)
  }
  function stepStraight(s, dt) {
    // Triple Spitter peas drift into their lane.
    if (s.y !== s.targetY) {
      const dy = s.targetY - s.y
      s.y += Math.sign(dy) * Math.min(Math.abs(dy), dt * 3)
    }
    const prev = s.x
    s.x += s.vx * dt
    if (s.x > s.maxX || s.x < -0.8 || s.x > 10.4) return (s.done = true)
    if (s.roofStop && s.x >= s.roofStop) {
      g.fx.push({ kind: 'splat', x: s.x, y: s.row, t: g.t, life: 0.3, color: s.fire ? 'fire' : s.frost ? 'frost' : 'pea' })
      return (s.done = true)
    }
    // Through a Tiki Torch: peas catch fire, frozen peas thaw.
    if (s.kind === 'pea' || s.kind === 'frost') {
      const col = Math.floor(s.x)
      const t = cell(s.row, col)?.main
      if (t && t.def.kind === 'torch' && Math.abs(s.x - (col + 0.5)) < 0.25 && s.torchCol !== col) {
        s.torchCol = col
        if (s.frost) {
          s.frost = false
          s.kind = 'pea'
        } else if (!s.fire) {
          s.fire = true
          s.dmg = 40
        }
      }
    }
    // Hit the first Scroller it reaches.
    let hit = null
    for (const z of g.zombies) {
      if (z.row !== s.row) continue
      if (!targetable(z, { flying: s.hitsFlying })) {
        if (!(s.hitsFlying && z.balloon > 0 && !gone(z))) continue
      }
      const lo = Math.min(prev, s.x) - 0.28
      const hi = Math.max(prev, s.x) + 0.28
      if (z.x < lo || z.x > hi) continue
      if (!hit || (s.vx > 0 ? z.x < hit.x : z.x > hit.x)) hit = z
    }
    if (g.boss && g.boss.state !== 'gone' && g.boss.state !== 'dying' && s.vx > 0 && s.x > BOSS_X - 0.5 && !hit) {
      hurtBoss(s.dmg)
      return (s.done = true)
    }
    if (!hit) return
    s.done = true
    if (s.hitsFlying && hit.balloon > 0) {
      popBalloon(hit)
      return
    }
    hurt(hit, s.dmg, s.vx > 0 ? 'front' : 'back')
    if (s.frost) slow(hit, 10)
    if (s.fire) {
      hit.slowUntil = 0
      for (const z of g.zombies) if (z !== hit && z.row === s.row && !gone(z) && !z.hypno && Math.abs(z.x - hit.x) < 0.9 && targetable(z)) hurt(z, 13, 'pure')
    }
    g.fx.push({ kind: 'splat', x: hit.x - 0.2 * Math.sign(s.vx), y: s.row, t: g.t, life: 0.25, color: s.fire ? 'fire' : s.frost ? 'frost' : s.kind === 'spore' ? 'spore' : 'pea' })
    sfx(s.fire ? 'sizzle' : 'splat')
  }
  function popBalloon(z) {
    z.balloon = 0
    z.speed = 0.21
    z.state = 'falling'
    z.fallUntil = g.t + 0.8
    sfx('pop')
  }
  function stepStar(s, dt) {
    s.x += s.vx * dt
    s.y += s.vy * dt
    if (s.x < -0.6 || s.x > 10 || s.y < -0.7 || s.y > R - 0.3) return (s.done = true)
    for (const z of g.zombies) {
      if (!targetable(z) || Math.abs(z.row - s.y) > 0.42 || Math.abs(z.x - s.x) > 0.32) continue
      s.done = true
      hurt(z, s.dmg, s.vx >= 0 ? 'front' : 'back')
      g.fx.push({ kind: 'splat', x: s.x, y: z.row, t: g.t, life: 0.25, color: 'star' })
      sfx('splat')
      return
    }
  }
  function stepHoming(s, dt) {
    let t = s.target
    if (!t || gone(t) || t.underground) {
      t = g.zombies.find((z) => !gone(z) && !z.hypno && !z.underground && !z.under && !z.boss && z.x < 9.4)
      s.target = t
      if (!t) return (s.done = true)
    }
    const dx = t.x - s.x
    const dy = t.row - s.y
    const d = Math.hypot(dx, dy)
    if (d < 0.3) {
      s.done = true
      if (t.balloon > 0) popBalloon(t)
      else hurt(t, s.dmg, 'lob')
      return
    }
    s.x += (dx / d) * s.speed * dt
    s.y += (dy / d) * s.speed * dt
  }
  function stepLob(s) {
    const k = (g.t - s.t0) / s.dur
    const t = s.target
    if (t && t !== 'boss' && !gone(t)) s.tx = t.x
    s.x = s.from.x + (s.tx - s.from.x) * Math.min(1, k)
    s.y = s.row
    s.h = Math.sin(Math.min(1, k) * Math.PI) * 1.4
    if (k < 1) return
    s.done = true
    let hit = null
    if (t === 'boss') {
      hurtBoss(s.dmg)
      hit = 'boss'
    } else if (t && !gone(t) && Math.abs(t.x - s.tx) < 0.5) hit = t
    else hit = g.zombies.find((z) => z.row === s.row && targetable(z) && Math.abs(z.x - s.tx) < 0.45)
    if (hit && hit !== 'boss') {
      hurt(hit, s.dmg, 'lob')
      if (s.butter) {
        hit.stunUntil = g.t + 4
        hit.buttered = g.t + 4
      }
      if (s.frost) slow(hit, 10)
    }
    if (s.splash) {
      const cx = hit && hit !== 'boss' ? hit.x : s.tx
      for (const z of g.zombies) {
        if (z === hit || gone(z) || z.hypno || z.boss) continue
        if (Math.abs(z.row - s.row) <= 1 && Math.abs(z.x - cx) <= 1.1 && !z.underground) {
          hurt(z, 26, 'lob')
          if (s.frost) slow(z, 10)
        }
      }
    }
    g.fx.push({ kind: 'splat', x: s.tx, y: s.row, t: g.t, life: 0.35, color: s.kind })
    sfx(s.kind === 'melon' || s.kind === 'frostmelon' ? 'thud' : 'splat')
  }
  function stepCob(s) {
    const k = (g.t - s.t0) / s.dur
    s.k = k
    if (k < 1) return
    s.done = true
    for (const z of g.zombies) if (!gone(z) && !z.hypno && Math.abs(z.row - s.ty) <= 1 && Math.abs(z.x - s.tx) <= 1.55) hurt(z, 1800, 'boom')
    if (g.boss && Math.abs(s.tx - BOSS_X) < 2.2) hurtBoss(1800)
    g.fx.push({ kind: 'boom', x: s.tx, y: s.ty, radius: 1.5, t: g.t, life: 1 })
    sfx('boom')
  }
  function stepRoll(s, dt) {
    s.x += (s.big ? 2.1 : 2.4) * dt
    if (s.y !== s.targetRow) {
      const dy = s.targetRow - s.y
      s.y += Math.sign(dy) * Math.min(Math.abs(dy), dt * 2.2)
      if (Math.abs(s.targetRow - s.y) < 0.02) s.y = s.targetRow
    }
    s.row = Math.round(s.y)
    s.spin = (s.spin ?? 0) + dt * 8
    if (s.x > 10.2) return (s.done = true)
    for (const z of g.zombies) {
      if (gone(z) || z.row !== s.row || Math.abs(z.x - s.x) > 0.42 || z === s.last) continue
      if (s.boom) {
        for (const v of g.zombies) if (!gone(v) && Math.abs(v.row - s.row) <= 1 && Math.abs(v.x - s.x) <= 1.55) hurt(v, 1800, 'boom')
        g.fx.push({ kind: 'boom', x: s.x, y: s.row, radius: 1.5, t: g.t, life: 1 })
        sfx('boom')
        return (s.done = true)
      }
      if (s.big) {
        hurt(z, 1800, 'boom')
        sfx('bowlhit')
        continue
      }
      hurt(z, 450, 'pure')
      s.hits++
      s.last = z
      sfx('bowlhit')
      if (s.hits >= 2) {
        dropCoin(z.x, z.row, 'silver')
        if (s.hits >= 3) banner(`${s.hits}× COMBO`, 'go', 0.9)
      }
      // Bounce off into the next lane over.
      const options = [s.row - 1, s.row + 1].filter((r) => g.rowOk(r) && (!g.sod || g.sod.includes(r)))
      s.targetRow = s.row === 0 ? 1 : s.row === R - 1 ? R - 2 : options.length ? pick(options) : s.row
      if (!g.rowOk(s.targetRow)) s.targetRow = s.row
      return
    }
  }
  function stepVan(s, dt) {
    s.x += s.vx * dt
    const c = Math.floor(s.x)
    for (const p of [cell(s.row, c)?.shell, cell(s.row, c)?.main, cell(s.row, c)?.base]) if (p) removePlant(p, 'smashed')
    if (s.x < -1) s.done = true
  }
  function stepPhone(s) {
    const k = (g.t - s.t0) / s.dur
    s.x = s.from + (s.tx - s.from) * Math.min(1, k)
    s.h = Math.sin(Math.min(1, k) * Math.PI) * 1.6
    if (k < 1) return
    s.done = true
    if (protectedByParasol(s.row, s.tc)) {
      g.fx.push({ kind: 'bounce', x: s.tx, y: s.row, t: g.t, life: 0.5 })
      sfx('bounce')
      return
    }
    const p = eatable(s.row, s.tc)
    if (p) damagePlant(p, 75, 'smashed')
    sfx('thud')
  }

  // ---------- Scrollers ----------
  function stepZombie(z, dt) {
    if (z.dying) return
    if (z.boss) return
    // Rising out of a grave, falling off a drone, flying away on one.
    if (z.state === 'rising') {
      if (g.t >= z.risingUntil) z.state = z.def.vaults ? 'run' : z.def.dancer ? 'moonwalk' : 'walk'
      return
    }
    if (z.state === 'blown') {
      z.x += dt * 4
      if (z.x > 10.5) {
        kill(z, 'blown')
        z.gone = true
      }
      return
    }
    if (z.state === 'falling') {
      if (g.t >= z.fallUntil) z.state = 'walk'
      return
    }
    if (z.grabbed) return
    if (z.bungee) return stepBungee(z, dt)
    if (z.state === 'shocked') {
      if (g.t >= z.shockedUntil) {
        z.state = 'walk'
        z.speed = z.def.angrySpeed
        z.angry = true
      }
      return
    }
    if (stuck(z)) return
    const f = factor(z)
    // A swelling power bank goes off sooner or later.
    if (z.box) {
      if (z.boomAt == null && z.x < 9.2) z.boomAt = g.t + 6 + rand() * 18
      if (z.boomAt != null && g.t >= z.boomAt) {
        explodeAt(z.row, z.x)
        kill(z, 'ash')
        return
      }
    }
    // Gigachad throws its iPad Kid once it's hurting.
    if (z.imp && z.hp < z.maxHp / 2 && z.state !== 'smash' && z.x > 3) {
      z.imp = false
      z.state = 'throw'
      z.throwUntil = g.t + 1
      return
    }
    if (z.state === 'throw') {
      if (g.t >= z.throwUntil) {
        const land = Math.max(1.2, z.x - 4.6)
        spawn('ipadkid', z.row, land, { state: 'rising', risingUntil: g.t + 0.6, thrown: true })
        z.state = 'walk'
        sfx('throw')
      }
      return
    }
    if (z.state === 'smash') {
      if (g.t >= z.smashAt) {
        const c = z.smashCol
        for (const p of [cell(z.row, c)?.shell, cell(z.row, c)?.main, cell(z.row, c)?.base, cell(z.row, c)?.coffee]) if (p) removePlant(p, 'smashed')
        sfx('stomp')
        z.state = 'walk'
      }
      return
    }
    // The catapult stops to fling phones while it has plants to aim at.
    if (z.def.catapult && z.ammo > 0 && z.x <= 7.2) {
      const targets = []
      for (let c = 0; c < Math.floor(z.x); c++) if (eatable(z.row, c)) targets.push(c)
      if (targets.length) {
        z.state = 'fling'
        z.flingAt ??= g.t + 1
        if (g.t >= z.flingAt) {
          const tc = targets[0]
          g.shots.push({ kind: 'phone', row: z.row, y: z.row, from: z.x - 0.4, tx: tc + 0.5, tc, t0: g.t, dur: 1.1, x: z.x })
          z.ammo--
          z.flingAt = g.t + 3
          sfx('throw')
        }
        return
      }
    }
    if (z.state === 'fling') z.state = 'walk'

    // Vaulting and hopping take a moment.
    if (z.state === 'vault' || z.state === 'hop' || z.state === 'climb') {
      const k = (g.t - z.moveStart) / z.moveDur
      z.x = z.moveFrom + (z.moveTo - z.moveFrom) * Math.min(1, k)
      if (k >= 1) {
        z.state = z.state === 'hop' && z.pogo ? 'walk' : 'walk'
        if (z.afterMove) z.afterMove()
        z.afterMove = null
      }
      return
    }

    // Underground: a Crypto Miner tunnels to the far end, then comes up behind your plants.
    if (z.underground) {
      z.x -= z.speed * f * dt
      // An armed Turnip Mine still gets it.
      if (z.x <= 0.35) {
        z.underground = false
        z.state = 'dizzy'
        z.dizzyUntil = g.t + 1.2
        z.dir = 1
        z.speed = 0.21
        z.x = 0.35
        sfx('dig')
      }
      return
    }
    if (z.state === 'dizzy') {
      if (g.t >= z.dizzyUntil) z.state = 'walk'
      return
    }

    // Moonwalking in: a Trend Dancer stops to call its backup dancers.
    if (z.def.dancer && z.state === 'moonwalk') {
      z.x -= 0.6 * f * dt
      if (z.x <= 7.6) {
        z.state = 'walk'
        summonBackups(z)
      }
      return
    }
    if (z.def.dancer && g.t >= z.summonAt && z.backups.some((b) => gone(b))) summonBackups(z)

    // Sleds glide on slush and stop where it ends.
    if (z.riding) {
      const ice = g.ice[z.row].start
      const lead = z.riders?.[0]
      if (z.x > ice - 0.2 && !(lead && gone(lead) && z.riders.every((r) => gone(r)))) {
        z.x -= 0.65 * f * dt
        return
      }
      z.riding = false
      z.speed = 0.21
    }

    // ---- What's in front: a plant, a hypnotised Scroller, or the house ----
    const dir = z.hypno ? 1 : z.dir
    if (z.hypno) {
      const foe = g.zombies.find((o) => o !== z && !gone(o) && !o.hypno && o.row === z.row && o.x >= z.x - 0.1 && o.x - z.x < 0.7 && !o.underground && !(o.balloon > 0) && !o.bungee)
      if (foe) {
        z.state = 'eat'
        hurt(foe, BITE * f * dt, 'pure')
        return
      }
      z.state = 'walk'
      z.x += z.speed * f * dt
      if (z.x > 10.5) {
        z.gone = true
        kill(z, 'left')
      }
      return
    }
    const foe = g.zombies.find((o) => o !== z && o.hypno && !gone(o) && o.row === z.row && z.x - o.x >= -0.1 && z.x - o.x < 0.7)
    if (foe && dir < 0) {
      z.state = 'eat'
      foe.hp -= BITE * f * dt
      if (foe.hp <= 0) kill(foe)
      return
    }

    // Flying: just drifts over everything towards the house.
    if (z.balloon > 0) {
      z.x -= z.speed * f * dt
      return reachHouse(z)
    }

    const biteX = z.x + (dir < 0 ? -0.35 : 0.35)
    const c = Math.floor(biteX)
    const target = c >= 0 && c < COLS ? eatable(z.row, c) : null

    // Rakes on the lawn.
    for (const rk of g.rakes) {
      if (!rk.used && rk.row === z.row && Math.abs(z.x - rk.x) < 0.3) {
        rk.used = true
        kill(z, 'rake')
        sfx('bonk')
        return
      }
    }

    // Vehicles flatten what they touch and leave slush behind.
    if (z.vehicle && (z.def.vehicle === 'slush' || z.ammo === 0 || z.state === 'walk')) {
      if (target && (z.def.vehicle === 'slush' || z.def.catapult)) {
        for (const p of [cell(z.row, c).shell, cell(z.row, c).main, cell(z.row, c).base, cell(z.row, c).coffee]) if (p && !p.def.ground) removePlant(p, 'smashed')
      }
      if (z.def.vehicle === 'slush') {
        const ic = g.ice[z.row]
        ic.start = Math.min(ic.start, z.x)
        ic.fadeAt = Infinity
      }
      z.state = 'walk'
      z.x -= z.speed * f * dt
      return reachHouse(z)
    }

    if (target) {
      // Jumpers go over the first plant they meet (not over a Coco-Tower).
      if ((z.state === 'run' && z.def.vaults) || z.pogo) {
        const tall = target.def.tall || cell(z.row, c).main?.def.tall
        if (tall) {
          g.fx.push({ kind: 'bonk', x: z.x - 0.3, y: z.row, t: g.t, life: 0.6 })
          sfx('bonk')
          z.state = 'walk'
          z.pogo = false
          z.speed = 0.21
          z.lostStick = true
          return
        }
        startMove(z, z.pogo ? 'hop' : 'vault', z.x - 1.25, z.pogo ? 0.75 : 1.0, () => {
          if (!z.pogo) {
            z.state = 'walk'
            z.speed = 0.21 * (z.speed / z.def.speed)
            z.lostStick = true
          }
        })
        sfx(z.pogo ? 'boing' : 'vault')
        return
      }
      // Ladder Guy leans its ladder on walls, and anyone can climb a laddered wall.
      const wallish = target.def.wall || target.def.shell
      const key = `${z.row},${c}`
      if (wallish && z.shield && z.def.ladder && dir < 0) {
        z.shield = null
        g.ladders.add(key)
        z.speed = 0.21
        sfx('ladder')
        startMove(z, 'climb', z.x - 1.3, 1.2)
        return
      }
      if (wallish && g.ladders.has(key) && dir < 0 && !z.def.gargantuar) {
        startMove(z, 'climb', z.x - 1.3, 1.2)
        return
      }
      // Gigachad smashes rather than chews.
      if (z.def.gargantuar) {
        z.state = 'smash'
        z.smashAt = g.t + 1.3
        z.smashCol = c
        return
      }
      // Scuba comes up for air (and a snack).
      if (z.under) z.surfaced = true
      // Stinky Onion: one bite, and it's off to another lane.
      if (target.def.kind === 'garlic') {
        damagePlant(target, 40)
        divert(z)
        return
      }
      // Swirlcap: whoever bites it switches sides.
      if (target.def.kind === 'hypno' && !target.asleep) {
        removePlant(target, 'quiet')
        z.hypno = true
        z.dir = 1
        z.shield = null
        sfx('hypno')
        return
      }
      if (target.def.kind === 'mine' && target.armed) return
      z.state = 'eat'
      z.eating = target
      if (Math.floor(g.t * 4) !== Math.floor((g.t - dt) * 4)) sfx('chomp-soft')
      damagePlant(target, BITE * f * (z.angry ? 2 : 1) * dt)
      return
    }
    if (z.under) z.surfaced = false
    if (z.state === 'eat') z.state = z.def.vaults && !z.lostStick ? 'run' : 'walk'
    z.eating = null
    // Gigachad also flattens Thorn Rugs it reaches (they don't stop anyone else).
    if (z.def.gargantuar && c >= 0 && c < COLS) {
      const rug = cell(z.row, c).main
      if (rug?.def.ground) {
        z.state = 'smash'
        z.smashAt = g.t + 1.3
        z.smashCol = c
        return
      }
    }
    z.x += dir * z.speed * f * dt
    if (dir > 0 && z.x > 10.5) {
      z.gone = true
      kill(z, 'left')
      return
    }
    reachHouse(z)
  }
  function startMove(z, state, to, dur, after) {
    z.state = state
    z.moveFrom = z.x
    z.moveTo = to
    z.moveStart = g.t
    z.moveDur = dur
    z.afterMove = after ?? null
  }
  function divert(z) {
    const options = [z.row - 1, z.row + 1].filter((r) => g.rowOk(r) && lanesFor.includes(r) && g.isWater(r) === g.isWater(z.row))
    if (!options.length) return
    const to = pick(options)
    z.row = to
    z.x += 0.15
    z.state = 'walk'
    sfx('cry')
  }
  function summonBackups(z) {
    z.summonAt = g.t + 10
    const spots = [
      [z.row - 1, z.x],
      [z.row + 1, z.x],
      [z.row, z.x - 1],
      [z.row, z.x + 1],
    ]
    z.backups = z.backups.filter((b) => !gone(b))
    for (const [r, x] of spots) {
      if (!g.rowOk(r) || g.isWater(r) || z.backups.length >= 4) continue
      if (z.backups.some((b) => b.row === r && Math.abs(b.x - x) < 0.3)) continue
      const b = spawn('backup', r, x, { state: 'rising', risingUntil: g.t + 1, summoned: true, leader: z })
      z.backups.push(b)
    }
    sfx('dance')
  }
  function explodeAt(r, x) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const c = Math.floor(x) + dc
        const ce = cell(r + dr, c)
        if (!ce) continue
        for (const p of [ce.shell, ce.main, ce.base, ce.coffee]) if (p) removePlant(p, 'smashed')
      }
    }
    g.fx.push({ kind: 'boom', x, y: r, radius: 1.5, t: g.t, life: 1, enemy: true })
    sfx('boom')
  }
  function stepBungee(z, dt) {
    if (z.bungee === 'aim') {
      if (g.t < z.aimUntil) return
      z.bungee = 'down'
      z.downAt = g.t
      sfx('bungee')
      return
    }
    if (z.bungee === 'down') {
      if (g.t - z.downAt < 1.4) return
      const c = z.col
      if (z.bungeeMode === 'steal') {
        if (protectedByParasol(z.row, c)) {
          z.bungee = 'up'
          z.upAt = g.t
          g.fx.push({ kind: 'bounce', x: c + 0.5, y: z.row, t: g.t, life: 0.5 })
          sfx('bounce')
          return
        }
        const ce = cell(z.row, c)
        const p = ce && (ce.main ?? ce.shell ?? ce.base)
        if (p) {
          z.carrying = p.type
          removePlant(p, 'quiet')
        }
      } else if (z.cargo) {
        spawn(z.cargo, z.row, c + 0.6, { state: 'rising', risingUntil: g.t + 0.4 })
      }
      z.bungee = 'up'
      z.upAt = g.t
      return
    }
    if (z.bungee === 'up' && g.t - z.upAt > 1) {
      z.gone = true
      z.dying = 'left'
      z.diedAt = g.t
    }
  }
  function reachHouse(z) {
    if (z.x > 0.15 || z.hypno || z.dir > 0) return
    const m = g.mowers.find((m) => m.row === z.row && m.state === 'ready')
    if (m && !(z.balloon > 0)) {
      m.state = 'running'
      sfx('mower')
      return
    }
    if (z.x < -0.75) {
      g.phase = 'lost'
      g.lostTo = z
      sfx('lose')
      event('lost', { zombie: z.type })
    }
  }
  function stepMowers(dt) {
    for (const m of g.mowers) {
      if (m.state !== 'running') continue
      m.x += 3.4 * dt
      for (const z of g.zombies) if (z.row === m.row && !gone(z) && !(z.balloon > 0) && !z.underground && Math.abs(z.x - m.x) < 0.45) {
        kill(z, 'mowed')
        z.mowed = true
      }
      if (m.x > 10.5) m.state = 'used'
    }
  }
  function stepDrops(dt) {
    for (const d of g.drops) {
      if (d.collected) continue
      if (!d.landed) {
        if (d.vx) d.x += d.vx * dt
        if (d.from === 'sky') {
          d.y += d.vy * dt
          if (d.y >= d.to) {
            d.y = d.to
            d.landed = true
            d.landedAt = g.t
          }
        } else {
          d.vy += 5 * dt
          d.y += d.vy * dt
          if (d.vy > 0 && d.y >= d.to) {
            d.y = d.to
            d.landed = true
            d.landedAt = g.t
          }
        }
        continue
      }
      if (d.life !== Infinity && g.t - d.landedAt > d.life) d.collected = 'expired'
    }
    g.drops = g.drops.filter((d) => !d.collected || (d.collected !== 'expired' && g.t - d.collectedAt < 0.8))
  }
  function stepIce() {
    for (let r = 0; r < R; r++) {
      const ic = g.ice[r]
      if (ic.start === Infinity) continue
      const slushHere = g.zombies.some((z) => z.row === r && z.def.vehicle === 'slush' && !gone(z))
      if (slushHere) continue
      if (ic.fadeAt === Infinity) ic.fadeAt = g.t + 30
      else if (g.t >= ic.fadeAt) g.ice[r] = { start: Infinity, fadeAt: Infinity }
    }
  }
  function checkEnd() {
    if (g.phase !== 'play') return
    if (g.drops.some((d) => d.kind === 'reward')) return
    const alive = g.zombies.filter((z) => !gone(z) && !z.hypno)
    let done = false
    if (special === 'vase') done = g.vases.length === 0 && alive.length === 0 && !g.belt.items.length
    else if (special === 'boss') done = false
    else done = g.waves.finalSpawned && g.waves.index >= W && alive.length === 0
    if (!done) return
    const at = g.lastKill ?? { x: 5, y: Math.floor(R / 2) }
    g.drops.push({ id: nextId++, kind: 'reward', x: at.x, y: at.y - 0.3, to: at.y + 0.1, vy: -1.4, landed: false, t: g.t, life: Infinity, reward: level.reward ?? (level.unlock ? 'plant' : 'money'), unlock: level.unlock ?? null })
    sfx('reward')
  }

  // ================= What's visible in the fog =================
  g.fogged = (r, c) => {
    if (!area.fog || g.t < g.fogClearUntil) return false
    if (c < COLS - area.fog) return false
    return !g.plants.some((p) => p.def.kind === 'lantern' && !p.asleep && Math.hypot(p.col - c, (p.row - r) * 1.05) <= p.def.light)
  }

  // ================= Debugging and tests =================
  g._spawn = spawn
  g._addPlant = addPlant
  g._hurt = hurt
  g._startWave = startWave
  g._dropBungee = dropBungee
  g._kill = kill
  return g
}
