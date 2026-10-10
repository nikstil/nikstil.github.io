// COUNTER-STRIFE's maps: the classic bomb-defusal maps (Dust 2, Mirage, Nuke, Inferno, Overpass,
// Vertigo) at life size, traced from their official overviews (and, for the heights, their nav
// meshes); all the art is ours. A map is a grid of 1 m cells. Each cell is a column of solid spans
// (ground, a crate on it, the slab of an upper floor, a roof), with air between; walls are just
// very tall ground. That's enough for tunnels and for Nuke's A site sitting right on top of B.
// Maps are written as carving commands: everything starts solid and the commands dig out rooms,
// ramps (stairs) and crates, and lay floors over floors.
//
// Coordinates: x goes east, z goes south, y up, all in metres from the map's top-left corner.

import DUST2 from './plans/dust2.js'
import MIRAGE from './plans/mirage.js'
import INFERNO from './plans/inferno.js'
import OVERPASS from './plans/overpass.js'
import NUKE from './plans/nuke.js'
import VERTIGO from './plans/vertigo.js'

export const WALL_H = 12
export const INF = 1e6
export const MAXS = 6 // spans per cell at most

/** A blank map and the commands that carve it. */
function carve(w, d, build) {
  const n = w * d
  const cells = Array.from({ length: n }, () => [{ b: -INF, t: WALL_H, m: 0 }])
  const set = (x0, z0, x1, z1, fn) => {
    for (let z = Math.max(0, z0); z < Math.min(d, z1); z++) for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) fn(z * w + x, x, z)
  }
  /** Adds solid from y0 to y1 (merging with what's there; the top keeps the highest top's look). */
  const fill = (i, y0, y1, m) => {
    let b = y0
    let t = y1
    let tm = m
    const keep = []
    for (const sp of cells[i]) {
      if (sp.t < b || sp.b > t) keep.push(sp)
      else {
        if (sp.t > t) tm = sp.m
        b = Math.min(b, sp.b)
        t = Math.max(t, sp.t)
      }
    }
    keep.push({ b, t, m: tm })
    cells[i] = keep.sort((p, q) => p.b - q.b)
  }
  /** Removes solid between y0 and y1; what's left below gets material m on top. */
  const cut = (i, y0, y1, m) => {
    const out = []
    for (const sp of cells[i]) {
      if (sp.t <= y0 || sp.b >= y1) out.push(sp)
      else {
        if (sp.b < y0) out.push({ b: sp.b, t: y0, m })
        if (sp.t > y1) out.push({ b: y1, t: sp.t, m: sp.m })
      }
    }
    cells[i] = out
  }
  const m = {
    /** A flat floor at height h, open to the sky (it replaces whatever was in these cells). */
    room(x0, z0, x1, z1, h, material = 'ground') {
      set(x0, z0, x1, z1, (i) => (cells[i] = [{ b: -INF, t: h, m: MAT[material] }]))
    },
    /** Stairs from h0 (at the x0/z0 edge) to h1 (at the x1/z1 edge), one step per cell. */
    ramp(x0, z0, x1, z1, h0, h1, axis, material = 'step') {
      const n = axis === 'x' ? x1 - x0 : z1 - z0
      set(x0, z0, x1, z1, (i, x, z) => {
        const k = axis === 'x' ? x - x0 : z - z0
        cells[i] = [{ b: -INF, t: h0 + ((h1 - h0) * (k + 0.5)) / n, m: MAT[material] }]
      })
    },
    /** A solid block (crate, car, low wall) whose top is at height h, on the floor below h. */
    box(x0, z0, x1, z1, h, material = 'crate') {
      set(x0, z0, x1, z1, (i) => {
        const under = cells[i].filter((sp) => sp.t <= h + 1e-6).pop()
        const sp = under ?? cells[i][0]
        sp.t = h
        sp.m = MAT[material]
        // it may now touch the span above
        const list = cells[i]
        for (let k = list.length - 1; k > 0; k--) if (list[k - 1].t >= list[k].b) list.splice(k - 1, 2, { b: list[k - 1].b, t: Math.max(list[k - 1].t, list[k].t), m: list[k].t > list[k - 1].t ? list[k].m : list[k - 1].m })
      })
    },
    /** A ceiling at height c over these cells (tunnels, doorways, rooms). */
    roof(x0, z0, x1, z1, c) {
      set(x0, z0, x1, z1, (i) => {
        cut(i, c, INF, cells[i].find((sp) => sp.t > c && sp.b < c)?.m ?? 0)
        fill(i, c, INF, 0)
      })
    },
    /** An upper floor: clears the air from y0 to y1 (the floor's top is y0), keeping what's below. */
    hollow(x0, z0, x1, z1, y0, y1, material = 'ground') {
      set(x0, z0, x1, z1, (i) => cut(i, y0, y1, MAT[material]))
    },
    /** A slab of solid between y0 and y1 over these cells, keeping what's below (bridges, upper floors in the open). */
    slab(x0, z0, x1, z1, y0, y1, material = 'path') {
      set(x0, z0, x1, z1, (i) => fill(i, y0, y1, MAT[material]))
    },
    /** Nothing at all: a drop into thin air (Vertigo's edges). */
    void(x0, z0, x1, z1) {
      set(x0, z0, x1, z1, (i) => (cells[i] = []))
    },
    /** Paint the floor with another material. */
    paint(x0, z0, x1, z1, material) {
      set(x0, z0, x1, z1, (i) => {
        const top = cells[i].filter((sp) => sp.t < WALL_H - 0.01).pop()
        if (top) top.m = MAT[material]
      })
    },
  }
  build(m)
  // Pack the spans into flat arrays.
  const sb = new Float32Array(n * MAXS)
  const st = new Float32Array(n * MAXS)
  const sm = new Uint8Array(n * MAXS)
  const sc = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const list = cells[i].sort((p, q) => p.b - q.b)
    if (list.length > MAXS) throw new Error(`too many spans at ${i % w},${(i / w) | 0}`)
    sc[i] = list.length
    list.forEach((sp, k) => {
      sb[i * MAXS + k] = sp.b
      st[i * MAXS + k] = sp.t
      sm[i * MAXS + k] = sp.m
    })
  }
  return { w, d, sb, st, sm, sc }
}

// Materials, by role. Each map picks its own look for each (see LOOKS).
export const MAT_NAMES = ['wall', 'ground', 'path', 'step', 'crate', 'door', 'metal', 'car', 'low', 'tile', 'wood', 'trim']
const MAT = Object.fromEntries(MAT_NAMES.map((n, i) => [n, i]))

/** A rectangle of cells, optionally only between heights y0 and y1 (for floors above floors). */
const r = (x0, z0, x1, z1, y0 = -INF, y1 = INF) => ({ x0, z0, x1, z1, y0, y1 })

// ============================================================================================
// Maps from traced plans (plans/*.js): 1:1 with the real thing. A cell is a metre; the walls and
// crates come from the map's overview, the heights of the floors from its nav mesh.
// ============================================================================================
const unrle = (row) => row.replace(/(\D)(\d*)/g, (_, c, n) => c.repeat(n ? +n : 1))
/**
 * A map from a layered plan (plans/*.js traced from the overview and the map's nav mesh): each
 * cell has its floors (the lowest, then any above it, like Nuke's A over B), maybe a roof, and
 * the crates; the callouts are the nav mesh's place names. build() adds anything else.
 */
function fromLayers(plan, { build, indoor = 'tile', outdoor = 'ground', upper = 'path', floors = {}, blocks = 'metal', rails = 'low' } = {}) {
  const dec = (c) => plan.BASE + plan.H.indexOf(c) * plan.STEP
  const grid = (rows) => rows.map((row) => [...unrle(row)])
  const G = grid(plan.ground)
  const UP = plan.upper.map(grid)
  const R = grid(plan.roof)
  /** Every floor in a cell, lowest first. */
  const floorsAt = (x, z) => {
    const c = G[z]?.[x]
    if (c == null || c === '#' || c === '~') return []
    const out = [dec(c)]
    for (const L of UP) if (L[z][x] !== '.') out.push(dec(L[z][x]))
    return out
  }
  const crateAt = (x, z) => plan.crates.some(([x0, z0, x1, z1]) => x >= x0 && x < x1 && z >= z0 && z < z1)
  // floors[callout] picks a material for the places with that name (water, grass, a roof...)
  const matOf = new Map()
  for (const [name, x0, z0, x1, z1, y0, y1] of plan.callouts) {
    if (!floors[name]) continue
    for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) floorsAt(x, z).forEach((h, k) => h >= y0 && h <= y1 && matOf.set(`${x},${z},${k}`, floors[name]))
  }
  const g = carve(plan.w, plan.d, (m) => {
    for (let z = 0; z < plan.d; z++)
      for (let x = 0; x < plan.w; x++) {
        const c = G[z][x]
        if (c === '#') continue
        if (c === '~') {
          m.void(x, z, x + 1, z + 1)
          continue
        }
        const f = floorsAt(x, z)
        const roofed = R[z][x] !== '.'
        m.room(x, z, x + 1, z + 1, f[0], matOf.get(`${x},${z},0`) ?? (roofed && f.length === 1 ? indoor : outdoor))
        // a floor over a floor: a slab under it (thin enough to stand under)
        for (let k = 1; k < f.length; k++) m.slab(x, z, x + 1, z + 1, f[k] - Math.min(0.4, f[k] - f[k - 1] - 1.9), f[k], matOf.get(`${x},${z},${k}`) ?? upper)
        if (roofed) m.roof(x, z, x + 1, z + 1, dec(R[z][x]))
      }
    for (const [x0, z0, x1, z1, top, kind] of plan.crates) m.box(x0, z0, x1, z1, top, [undefined, blocks, rails][kind ?? 0])
    build?.(m)
  })
  return {
    ...g,
    floorAt: (x, z) => floorsAt(x, z)[0] ?? null,
    floorsAt,
    crateAt,
    callouts: plan.callouts.map(([name, x0, z0, x1, z1, y0, y1]) => [name, r(x0, z0, x1, z1, y0, y1)]),
  }
}
/**
 * Puts every point a plan map's bots and rules use (spawns, plant spots, holds, posts, route
 * waypoints, palms) on open floor: the nearest cell that's floor and not a crate, if it isn't.
 */
function onFloor(def) {
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  // where floors are stacked, a point without a height is on the one nearest the map's usual
  // level (def.pointY; the top one by default)
  const nearest = (f, want) => f.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a))
  const level = (p) => {
    const f = def.floorsAt?.(p[0], p[1]) ?? []
    return p.length > 2 || f.length < 2 ? p : [p[0], p[1], nearest(f, def.pointY ?? 50)]
  }
  // open floor: not a crate, and (on a stacked map) joined to a floor beside it, so not the top of a wall
  const ok = def.floorsAt
    ? (x, z, y) => {
        const f = def.floorsAt(x, z)
        if (!f.length || def.crateAt(x, z)) return false
        const h = nearest(f, y ?? def.pointY ?? 50)
        if (y == null && def.pointY != null && Math.abs(h - def.pointY) > 3) return false
        return N4.some(([dx, dz]) => def.floorsAt(x + dx, z + dz).some((g) => Math.abs(g - h) <= 0.6))
      }
    : (x, z) => def.floorAt(x, z) != null && !def.crateAt(x, z) && N4.some(([dx, dz]) => def.floorAt(x + dx, z + dz) != null)
  const snap = (p) => {
    if (ok(p[0], p[1], p[2])) return level(p)
    for (let rr = 1; rr < 8; rr++)
      for (let dz = -rr; dz <= rr; dz++)
        for (let dx = -rr; dx <= rr; dx++) if (Math.max(Math.abs(dx), Math.abs(dz)) === rr && ok(p[0] + dx, p[1] + dz, p[2])) return level([p[0] + dx, p[1] + dz, ...p.slice(2)])
    return level(p)
  }
  for (const t of ['T', 'CT']) def.spawns[t] = def.spawns[t].map(snap)
  for (const s of ['A', 'B']) def.plant[s] = def.plant[s].map(snap)
  for (const list of [...Object.values(def.holds), ...Object.values(def.posts)]) for (const h of list) h.at = snap(h.at)
  for (const list of Object.values(def.routes)) for (const rt of list) rt.path = rt.path.map(snap)
  for (const p of def.props ?? []) {
    if (p.type !== 'palm') continue
    ;[p.x, p.z] = snap([p.x, p.z])
    p.y = def.floorAt(p.x, p.z)
  }
  return def
}

// ============================================================================================
// Dust 2, 1:1: T spawn at the bottom, CT spawn at the top. A is top right (long A up the east
// side, short A over catwalk from mid), B is top left (through the tunnels, or B doors from CT mid).
// ============================================================================================
function dust2() {
  const g = fromLayers(DUST2, { outdoor: 'ground', floors: { 'Mid Doors': 'path', 'CT Spawn': 'path', 'B Site': 'path', 'A Site': 'path', 'Short Stairs': 'step', 'Tunnel Stairs': 'step' } })
  return onFloor({
    id: 'dust2',
    name: 'Dust 2',
    blurb: 'Long A, catwalk, the tunnels. Sand in everything. Life size.',
    ...g,
    look: 'dust',
    spawns: {
      T: [[30, 100], [34, 100], [38, 100], [42, 100], [46, 100], [32, 104], [36, 104], [40, 104], [44, 104], [48, 104]],
      CT: [[62, 19], [65, 19], [68, 19], [62, 23], [65, 23], [68, 23], [62, 27], [65, 27], [68, 27], [70, 21]],
    },
    buy: { T: r(20, 92, 56, 112), CT: r(56, 14, 76, 32) },
    sites: { A: r(82, 14, 92, 24), B: r(13, 8, 25, 20) },
    plant: { A: [[87, 15], [90, 20], [84, 22], [89, 22]], B: [[16, 11], [20, 14], [17, 17], [22, 12]] },
    // How the Terrorists can go at each site (waypoints, from spawn).
    routes: {
      A: [
        { name: 'Long', path: [[44, 100], [55, 100], [62, 92], [70, 82], [76, 70], [86, 64], [94, 50], [92, 35], [87, 20]] },
        { name: 'Short', path: [[40, 100], [47, 90], [48, 72], [48, 58], [49, 50], [56, 46], [60, 46], [67, 42], [68, 32], [78, 24], [86, 20]] },
      ],
      B: [
        { name: 'Tunnels', path: [[34, 100], [22, 92], [16, 80], [15, 66], [15, 53], [9, 46], [9, 38], [12, 28], [18, 14]] },
        { name: 'Mid to B', path: [[40, 100], [47, 88], [48, 64], [46, 47], [36, 46], [29, 50], [15, 53], [9, 42], [14, 26], [18, 14]] },
      ],
    },
    // Where the Counter-Terrorists hold, and what they watch.
    holds: {
      A: [{ at: [92, 30], look: [94, 50] }, { at: [76, 28], look: [68, 36] }, { at: [96, 8], look: [90, 32] }, { at: [74, 20], look: [86, 24] }],
      B: [{ at: [18, 22], look: [9, 40] }, { at: [8, 8], look: [10, 36] }, { at: [22, 28], look: [9, 42] }, { at: [27, 18], look: [16, 30] }],
      mid: [{ at: [47, 22], look: [48, 55] }, { at: [66, 44], look: [50, 60] }],
    },
    // Where the Terrorists sit after planting, and what they watch.
    posts: {
      A: [{ at: [92, 32], look: [86, 18] }, { at: [70, 34], look: [82, 20] }, { at: [98, 24], look: [74, 20] }],
      B: [{ at: [9, 40], look: [18, 14] }, { at: [26, 24], look: [34, 20] }, { at: [6, 12], look: [28, 20] }],
    },
    props: [
      { type: 'palm', x: 4, z: 100, y: g.floorAt(4, 100) },
      { type: 'palm', x: 60, z: 108, y: g.floorAt(60, 108) },
      { type: 'palm', x: 99, z: 26, y: g.floorAt(99, 26) },
      { type: 'palm', x: 5, z: 30, y: g.floorAt(5, 30) },
    ],
    sky: { top: '#6a9bd8', bottom: '#e2d6ba', fog: '#ddd2b8', sun: '#fff1d6', ground: '#b0956c' },
  })
}

// ============================================================================================
// Mirage, 1:1: T spawn on the east, CT spawn bottom left. A is bottom middle (A ramp from the T
// side, palace, jungle and connector from mid, ticket booth and CT); B is top left (apartments
// from the T side, short and market); mid runs across the middle under window.
// ============================================================================================
function mirage() {
  const g = fromLayers(MIRAGE, { outdoor: 'path', floors: { 'A Site': 'tile', 'B Site': 'tile', 'T Spawn': 'ground', 'CT Spawn': 'ground' } })
  return onFloor({
    id: 'mirage',
    name: 'Mirage',
    blurb: 'Palace, jungle, window, apartments. Life size.',
    ...g,
    look: 'mirage',
    spawns: {
      T: [[100, 23], [103, 23], [106, 24], [100, 27], [103, 27], [106, 28], [100, 31], [103, 31], [105, 33], [101, 34]],
      CT: [[21, 66], [24, 66], [27, 66], [21, 70], [24, 70], [27, 70], [21, 74], [24, 74], [27, 74], [30, 70]],
    },
    buy: { T: r(96, 16, 109, 42), CT: r(16, 60, 36, 82) },
    sites: { A: r(52, 75, 66, 89), B: r(12, 12, 25, 24) },
    plant: { A: [[56, 80], [61, 84], [58, 86], [63, 79]], B: [[14, 15], [20, 20], [22, 15], [16, 21]] },
    routes: {
      A: [
        { name: 'Ramp', path: [[102, 28], [102, 50], [94, 53], [85, 62], [75, 68], [62, 80]] },
        { name: 'Palace', path: [[102, 30], [102, 56], [100, 66], [95, 78], [82, 82], [70, 80], [60, 82]] },
      ],
      B: [
        { name: 'Apartments', path: [[101, 24], [92, 12], [75, 8], [55, 6], [35, 6], [22, 10], [18, 16]] },
        { name: 'Short', path: [[100, 30], [86, 34], [72, 42], [55, 40], [44, 34], [34, 26], [24, 20]] },
      ],
    },
    holds: {
      A: [{ at: [58, 76], look: [80, 62] }, { at: [52, 86], look: [80, 82] }, { at: [44, 68], look: [70, 80] }, { at: [64, 88], look: [76, 64] }],
      B: [{ at: [16, 22], look: [30, 8] }, { at: [24, 26], look: [36, 30] }, { at: [12, 14], look: [30, 22] }],
      mid: [{ at: [44, 42], look: [70, 42] }, { at: [42, 56], look: [44, 40] }],
    },
    posts: {
      A: [{ at: [80, 64], look: [60, 82] }, { at: [76, 80], look: [56, 80] }, { at: [44, 64], look: [58, 82] }],
      B: [{ at: [30, 8], look: [16, 20] }, { at: [32, 30], look: [18, 18] }, { at: [26, 40], look: [18, 20] }],
    },
    props: [
      { type: 'palm', x: 104, z: 40, y: g.floorAt(104, 40) },
      { type: 'palm', x: 22, z: 78, y: g.floorAt(22, 78) },
      { type: 'palm', x: 10, z: 28, y: g.floorAt(10, 28) },
    ],
    sky: { top: '#76a6dc', bottom: '#f2e0c6', fog: '#efdec6', sun: '#ffe9c8', ground: '#b3936d' },
  })
}

// ============================================================================================
// Nuke, 1:1: T spawn on the west, CT spawn on the east, the yard outside to the south. A is in
// the plant's big hall (through lobby, then hut or squeaky; from the yard into hell); B is right
// under it, nine metres down: down the ramp from lobby, through secret from the yard, down decon
// from CT, or drop down the vents from A.
// ============================================================================================
function nuke() {
  const g = fromLayers(NUKE, { floors: { Roof: 'metal', 'Hut Roof': 'metal', Silo: 'metal', Rafters: 'metal', Heaven: 'metal', Catwalk: 'metal', Crane: 'metal' } })
  return onFloor({
    id: 'nuke',
    name: 'Nuke',
    blurb: 'A on top, B nine metres underneath. Life size.',
    ...g,
    look: 'nuke',
    pointY: 0, // the ground floor (not B below, nor the roofs)
    radarSplit: -2, // below this you're downstairs (B), and the radar shows that floor
    spawns: {
      T: [[22, 52], [25, 52], [28, 52], [31, 52], [22, 55], [25, 55], [28, 55], [31, 55], [34, 55], [25, 58]],
      CT: [[134, 37], [137, 37], [140, 37], [143, 37], [146, 37], [134, 40], [137, 40], [140, 40], [143, 40], [146, 40]],
    },
    buy: { T: r(14, 44, 42, 64), CT: r(128, 30, 156, 48) },
    sites: { A: r(91, 40, 102, 52, -1, 4), B: r(89, 44, 102, 59, -10, -4) },
    plant: { A: [[94, 43, 0], [98, 49, 0], [93, 49, 0], [99, 42, 0]], B: [[92, 48, -9], [97, 52, -9], [92, 56, -9], [99, 56, -9]] },
    routes: {
      A: [
        { name: 'Hut', path: [[25, 53], [45, 52], [60, 52], [72, 48], [80, 50], [88, 52], [95, 47, 0]] },
        { name: 'Squeaky', path: [[25, 53], [45, 52], [62, 56], [76, 56], [82, 59], [90, 58], [96, 50, 0]] },
      ],
      B: [
        { name: 'Ramp', path: [[25, 53], [45, 52], [72, 46], [80, 40], [92, 30, -5.6], [95, 40, -7.6], [94, 50, -9]] },
        { name: 'Secret', path: [[25, 53], [45, 60], [70, 75], [100, 82], [117, 86, -4], [114, 75, -5.6], [107, 68, -5.6], [96, 54, -9]] },
      ],
    },
    holds: {
      A: [{ at: [99, 44, 0], look: [86, 52] }, { at: [94, 50, 0], look: [82, 58] }, { at: [108, 38, 0], look: [94, 46] }],
      B: [{ at: [96, 46, -9], look: [94, 30] }, { at: [92, 56, -9], look: [104, 66] }, { at: [99, 50, -9], look: [90, 40] }],
      mid: [{ at: [130, 60], look: [100, 75] }, { at: [118, 46], look: [100, 60] }],
    },
    posts: {
      A: [{ at: [86, 52, 0], look: [96, 46] }, { at: [82, 58, 0], look: [96, 48] }, { at: [104, 56, 0], look: [94, 44] }],
      B: [{ at: [94, 36, -6], look: [94, 50] }, { at: [104, 62, -5], look: [96, 54] }, { at: [90, 60, -9], look: [96, 46] }],
    },
    props: [],
    sky: { top: '#7f9fbf', bottom: '#d9dde0', fog: '#cfd5da', sun: '#fff6e8', ground: '#8f9396' },
  })
}

// ============================================================================================
// Inferno, 1:1: T spawn bottom left, CT spawn on the right. B is at the top, up banana; A is on
// the right, through apartments and the balcony or up mid; pit, library and arch round it.
// ============================================================================================
function inferno() {
  const g = fromLayers(INFERNO, { outdoor: 'ground', floors: { 'A Site': 'path', 'B Site': 'path', Banana: 'path', Pit: 'path' } })
  return onFloor({
    id: 'inferno',
    name: 'Inferno',
    blurb: 'Banana, Apartments, the Balcony, Coffins. Hold Banana or lose B. Life size.',
    ...g,
    look: 'inferno',
    spawns: {
      T: [[4, 74], [7, 74], [4, 77], [7, 77], [4, 80], [7, 80], [4, 83], [7, 83], [9, 76], [9, 80]],
      CT: [[104, 31], [107, 31], [104, 35], [107, 35], [104, 39], [107, 39], [104, 43], [107, 43], [105, 46], [101, 37]],
    },
    buy: { T: r(0, 68, 14, 90), CT: r(98, 26, 112, 50) },
    sites: { A: r(91, 72, 102, 88), B: r(47, 12, 61, 29) },
    plant: { A: [[93, 76], [97, 80], [95, 85], [99, 76]], B: [[50, 16], [55, 20], [52, 25], [58, 15]] },
    routes: {
      A: [
        { name: 'Apartments', path: [[6, 78], [20, 90], [38, 96], [55, 100], [70, 102], [82, 96], [94, 82]] },
        { name: 'Mid', path: [[6, 78], [25, 76], [45, 77], [60, 77], [75, 75], [86, 72], [95, 78]] },
      ],
      B: [
        { name: 'Banana', path: [[6, 76], [25, 72], [40, 70], [48, 60], [50, 46], [53, 34], [54, 22]] },
        { name: 'Banana car', path: [[8, 74], [30, 70], [46, 64], [47, 50], [49, 38], [50, 26], [56, 18]] },
      ],
    },
    holds: {
      A: [{ at: [96, 74], look: [80, 76] }, { at: [92, 86], look: [80, 100] }, { at: [100, 70], look: [84, 64] }, { at: [104, 84], look: [90, 96] }],
      B: [{ at: [52, 28], look: [50, 46] }, { at: [58, 18], look: [52, 40] }, { at: [48, 14], look: [50, 40] }],
      mid: [{ at: [86, 70], look: [60, 77] }, { at: [80, 60], look: [70, 76] }],
    },
    posts: {
      A: [{ at: [82, 76], look: [96, 78] }, { at: [80, 98], look: [94, 82] }, { at: [104, 98], look: [96, 80] }],
      B: [{ at: [52, 40], look: [54, 20] }, { at: [66, 20], look: [52, 18] }, { at: [62, 8], look: [52, 22] }],
    },
    props: [
      { type: 'palm', x: 12, z: 88, y: 0 },
      { type: 'palm', x: 100, z: 50, y: 0 },
    ],
    sky: { top: '#6f9fd6', bottom: '#f0d8b0', fog: '#ecd6b4', sun: '#ffe2b8', ground: '#a07a58' },
  })
}

// ============================================================================================
// Overpass, 1:1: a city park over a canal. T spawn is bottom right, down by the canal; CTs spawn on
// A, up in the park at the top. B is in the canal on the right, under the road bridge (Monster up
// the alleys, or along the water and through construction); A through the parks or the restrooms.
// ============================================================================================
function overpass() {
  const g = fromLayers(OVERPASS, {
    outdoor: 'path',
    floors: { Canal: 'tile', Water: 'tile', Pipe: 'tile', 'Upper Park': 'ground', 'Lower Park': 'ground', Fountain: 'ground', Playground: 'ground' },
  })
  return onFloor({
    id: 'overpass',
    name: 'Overpass',
    blurb: 'A in the park, B down in the canal. Life size.',
    ...g,
    look: 'overpass',
    wingman: 'B',
    spawns: {
      T: [[66, 126], [68, 124], [70, 122], [72, 124], [70, 128], [68, 130], [72, 127], [74, 125], [66, 129], [70, 131]],
      CT: [[42, 22], [44, 22], [46, 22], [42, 25], [44, 25], [46, 25], [48, 25], [42, 28], [44, 28], [46, 28]],
    },
    buy: { T: r(58, 114, 82, 138), CT: r(36, 14, 58, 34) },
    sites: { A: r(37, 19, 60, 36), B: r(70, 38, 81, 49) },
    plant: { A: [[42, 25], [46, 30], [51, 31], [40, 29]], B: [[74, 41], [78, 45], [73, 46], [79, 41]] },
    routes: {
      A: [
        { name: 'Upper Park', path: [[70, 126], [64, 106], [50, 104], [36, 106], [16, 96], [10, 70], [18, 50], [30, 34], [42, 26]] },
        { name: 'Restroom', path: [[70, 126], [64, 106], [50, 104], [40, 92], [34, 72], [42, 56], [40, 40], [44, 30]] },
      ],
      B: [
        { name: 'Alley', path: [[70, 126], [80, 110], [86, 96], [90, 84], [94, 70], [92, 54], [80, 44]] },
        { name: 'Water', path: [[70, 126], [64, 106], [61, 92], [58, 78], [62, 66], [72, 58], [76, 46]] },
      ],
    },
    holds: {
      A: [{ at: [36, 30], look: [24, 44] }, { at: [52, 26], look: [44, 44] }, { at: [44, 18], look: [30, 36] }],
      B: [{ at: [78, 40], look: [90, 70] }, { at: [72, 48], look: [62, 64] }, { at: [84, 44], look: [92, 64] }],
      mid: [{ at: [54, 29], look: [74, 44] }, { at: [52, 40], look: [54, 70] }],
    },
    posts: {
      A: [{ at: [32, 36], look: [44, 26] }, { at: [44, 42], look: [44, 28] }, { at: [54, 34], look: [42, 26] }],
      B: [{ at: [92, 60], look: [78, 44] }, { at: [68, 58], look: [76, 44] }, { at: [80, 54], look: [76, 42] }],
    },
    props: [],
    sky: { top: '#7aa6d8', bottom: '#dfe6e0', fog: '#d6ded8', sun: '#fff4e0', ground: '#7d876a' },
  })
}

// ============================================================================================
// Vertigo, 1:1: the top of an unfinished skyscraper. T spawn is a floor down (bottom left); both
// sites, mid and CT spawn (top) are up on the top floor: A on the right (up the A ramp from the
// bridge, or through mid), B top left (up the stairs from the pit, or through mid). Past the
// railings there's nothing but air.
// ============================================================================================
function vertigo() {
  const g = fromLayers(VERTIGO, { outdoor: 'path', floors: { Scaffolding: 'wood', 'B Platform': 'wood', 'A Platform': 'wood', Crane: 'metal' } })
  const T = -7.31 // the floor below
  return onFloor({
    id: 'vertigo',
    name: 'Vertigo',
    blurb: 'Fifty floors up, two of them yours. Mind the railings. Life size.',
    ...g,
    look: 'vertigo',
    pointY: 0, // the top floor
    wingman: 'A',
    radarSplit: -2,
    killY: -12,
    skyline: true,
    spawns: {
      T: [[24, 59, T], [27, 59, T], [30, 59, T], [33, 59, T], [36, 59, T], [24, 63, T], [27, 63, T], [30, 63, T], [33, 63, T], [36, 63, T]],
      CT: [[43, 8], [46, 8], [49, 8], [43, 11], [46, 11], [49, 11], [43, 14], [46, 14], [49, 14], [51, 11]],
    },
    buy: { T: r(20, 55, 40, 71), CT: r(40, 4, 55, 18) },
    sites: { A: r(56, 43, 69, 51, -2, 3), B: r(8, 6, 17, 16, -2, 3) },
    plant: { A: [[59, 46], [63, 47], [66, 46], [60, 49]], B: [[10, 9], [13, 12], [11, 13], [14, 8]] },
    routes: {
      A: [
        { name: 'A Ramp', path: [[28, 62, T], [44, 38, T], [52, 60], [62, 48]] },
        { name: 'Mid', path: [[28, 62, T], [30, 38], [42, 25], [52, 25], [62, 30], [62, 46]] },
      ],
      B: [
        { name: 'Pit', path: [[28, 62, T], [10, 32], [12, 20], [13, 12]] },
        { name: 'Mid', path: [[28, 62, T], [30, 38], [25, 26], [14, 12]] },
      ],
    },
    holds: {
      A: [{ at: [62, 46], look: [54, 66] }, { at: [66, 40], look: [52, 30] }, { at: [58, 52], look: [52, 62] }],
      B: [{ at: [12, 12], look: [10, 32] }, { at: [16, 14], look: [26, 26] }, { at: [10, 8], look: [24, 22] }],
      mid: [{ at: [43, 20], look: [30, 36] }, { at: [52, 25], look: [40, 25] }],
    },
    posts: {
      A: [{ at: [54, 66], look: [62, 48] }, { at: [52, 40], look: [62, 47] }, { at: [62, 30], look: [62, 47] }],
      B: [{ at: [12, 24], look: [12, 10] }, { at: [24, 24], look: [12, 12] }, { at: [26, 10], look: [12, 10] }],
    },
    props: [],
    sky: { top: '#5c8fd0', bottom: '#cfdcea', fog: '#c9d6e4', sun: '#fff8ea', ground: '#7d8590' },
  })
}

export const MAPS = { dust2: dust2(), mirage: mirage(), nuke: nuke(), inferno: inferno(), overpass: overpass(), vertigo: vertigo() }
export const MAP_LIST = ['dust2', 'mirage', 'nuke', 'inferno', 'overpass', 'vertigo']
