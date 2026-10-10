// COUNTER-STRIFE's maps: recreations of classic bomb-defusal layouts (Dust 2, Mirage, Nuke),
// built from scratch (all the art is ours). A map is a grid of 1 m cells. Each cell is a column
// of solid spans (ground, a crate on it, the slab of an upper floor, a roof), with air between;
// walls are just very tall ground. That's enough for tunnels and for Nuke's A site sitting right
// on top of B. Maps are written as carving commands: everything starts solid and the commands
// dig out rooms, ramps (stairs) and crates, and lay floors over floors.
//
// Coordinates: x goes east, z goes south, y up, all in metres from the map's top-left corner.

import DUST2 from './plans/dust2.js'
import MIRAGE from './plans/mirage.js'
import INFERNO from './plans/inferno.js'

export const WALL_H = 12
export const INF = 1e6
export const MAXS = 4 // spans per cell at most

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
// Maps from traced floor plans (plans/*.js): 1:1 with the real thing (a cell is a metre; heights
// come from the overview's colour ramp). The plan gives every cell's floor and the crates; build()
// adds what an overview can't show, like the roofs over tunnels.
// ============================================================================================
const PLAN_ALPHA = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const unrle = (row) => row.replace(/(\D)(\d*)/g, (_, c, n) => c.repeat(n ? +n : 1))
function fromPlan(plan, { fix, build } = {}) {
  const H = plan.rows.map((row) => [...unrle(row)].map((c) => (c === '#' ? null : PLAN_ALPHA.indexOf(c) * 0.2)))
  const at = (x, z) => H[z]?.[x] ?? null
  // Fixes for what an overview can't say: a flight of stairs is drawn as a sudden change of
  // colour, so it traces as a cliff (ramp() makes it a slope again), and markings make a few
  // bumps (flat() levels an area).
  const shape = {
    /** A slope across the rectangle along axis, from the floor at its first row to the floor at its last. */
    ramp(x0, z0, x1, z1, axis) {
      const n = axis === 'x' ? x1 - x0 : z1 - z0
      for (let z = z0; z < z1; z++)
        for (let x = x0; x < x1; x++) {
          if (at(x, z) == null) continue
          // the ends of this line of the ramp (the first and last open cells along it)
          let a = null
          let b = null
          for (let k = 0; k < n && a == null; k++) a = axis === 'x' ? at(x0 + k, z) : at(x, z0 + k)
          for (let k = n - 1; k >= 0 && b == null; k--) b = axis === 'x' ? at(x0 + k, z) : at(x, z0 + k)
          const t = ((axis === 'x' ? x - x0 : z - z0) + 0.5) / n
          H[z][x] = Math.round((a + (b - a) * t) * 20) / 20
        }
    },
    /**
     * Steps that are really stairs: inside the rectangle, any drop of up to `most` metres becomes a
     * slope you can walk (the low side rises to meet it, half a metre a cell). Taller drops stay
     * ledges.
     */
    ease(x0, z0, x1, z1, most = 1.8) {
      const orig = H.map((row) => [...row])
      for (let pass = 0; pass < 12; pass++) {
        let changed = false
        for (let z = z0; z < z1; z++)
          for (let x = x0; x < x1; x++) {
            const h = at(x, z)
            if (h == null) continue
            for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = x + dx
              const nz = z + dz
              if (nx < x0 || nz < z0 || nx >= x1 || nz >= z1) continue
              const n = at(nx, nz)
              if (n == null || n - h <= 0.5) continue
              // a ledge as it was traced (not one this has already eased) taller than `most` stays
              if ((orig[nz][nx] ?? 0) - (orig[z][x] ?? 0) > most) continue
              H[z][x] = Math.round((n - 0.5) * 20) / 20
              changed = true
            }
          }
        if (!changed) break
      }
    },
    /** Levels a rectangle (at height h, or the middle height of what's there). */
    flat(x0, z0, x1, z1, h = null) {
      const hs = []
      for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) if (at(x, z) != null) hs.push(at(x, z))
      hs.sort((p, q) => p - q)
      const v = h ?? hs[hs.length >> 1]
      for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) if (at(x, z) != null) H[z][x] = v
    },
  }
  fix?.(shape)
  /** The highest floor in a rectangle (for roofs over a tunnel that slopes, and crates). */
  const top = (x0, z0, x1, z1) => {
    let h = 0
    for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) h = Math.max(h, at(x, z) ?? 0)
    return h
  }
  const g = carve(plan.w, plan.d, (m) => {
    for (let z = 0; z < plan.d; z++)
      for (let x = 0; x < plan.w; x++) {
        const h = at(x, z)
        if (h != null) m.room(x, z, x + 1, z + 1, h, h < 1.8 ? 'path' : 'ground')
      }
    // crates: one high on their own, stacked a bit higher in bigger piles
    for (const [x0, z0, x1, z1] of plan.crates) m.box(x0, z0, x1, z1, top(x0, z0, x1, z1) + ((x1 - x0) * (z1 - z0) >= 4 ? 1.6 : 1.1))
    build?.(m, top)
  })
  return { ...g, floorAt: at, crateAt: (x, z) => plan.crates.some(([x0, z0, x1, z1]) => x >= x0 && x < x1 && z >= z0 && z < z1) }
}
/**
 * Puts every point a plan map's bots and rules use (spawns, plant spots, holds, posts, route
 * waypoints, palms) on open floor: the nearest cell that's floor and not a crate, if it isn't.
 */
function onFloor(def) {
  const ok = (x, z) => def.floorAt(x, z) != null && !def.crateAt(x, z) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => def.floorAt(x + dx, z + dz) != null)
  const snap = (p) => {
    if (ok(p[0], p[1])) return p
    for (let rr = 1; rr < 8; rr++)
      for (let dz = -rr; dz <= rr; dz++)
        for (let dx = -rr; dx <= rr; dx++) if (Math.max(Math.abs(dx), Math.abs(dz)) === rr && ok(p[0] + dx, p[1] + dz)) return [p[0] + dx, p[1] + dz, ...p.slice(2)]
    return p
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
  const g = fromPlan(DUST2, {
    fix(s) {
      s.flat(30, 99, 51, 108) // T spawn
      s.ramp(44, 92, 58, 102, 'z') // down from T spawn towards top mid
      s.ramp(12, 81, 25, 91, 'z') // T spawn down to outside tunnels
      s.ramp(5, 65, 26, 73, 'z') // outside tunnels up to upper tunnels
      s.ramp(24, 47, 34, 57, 'x') // the stairs down to lower tunnels
      s.ramp(64, 33, 73, 42, 'z') // short A stairs
      s.ramp(62, 17, 73, 31, 'x') // CT spawn up to A
      s.flat(82, 14, 93, 24) // A site
      s.flat(14, 9, 27, 21) // B site
      s.ramp(3, 17, 26, 24, 'z') // up from the front of B onto the site
    },
    build(m, top) {
      // the tunnels have roofs: upper tunnels, the way down to lower tunnels, and B tunnels
      m.roof(0, 48, 24, 57, top(0, 48, 24, 57) + 3.4)
      m.roof(28, 43, 44, 50, top(28, 43, 44, 50) + 3.2)
      m.roof(5, 36, 12, 48, top(5, 36, 12, 48) + 3.4)
    },
  })
  return {
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
    callouts: [
      ['Goose', r(92, 4, 101, 12)],
      ['A Site', r(72, 4, 101, 30)],
      ['Pit', r(90, 62, 104, 80)],
      ['A Ramp', r(84, 30, 104, 40)],
      ['Long Doors', r(70, 60, 90, 80)],
      ['Long A', r(72, 30, 104, 62)],
      ['Outside Long', r(56, 80, 80, 100)],
      ['Short A', r(64, 28, 72, 40)],
      ['Catwalk', r(53, 40, 72, 50)],
      ['CT Spawn', r(56, 14, 74, 31)],
      ['Xbox', r(48, 42, 54, 50)],
      ['Mid Doors', r(42, 28, 53, 34)],
      ['CT Mid', r(31, 14, 56, 31)],
      ['B Doors', r(24, 10, 31, 31)],
      ['B Site', r(2, 2, 25, 34)],
      ['B Tunnels', r(4, 34, 14, 48)],
      ['Lower Tunnels', r(27, 42, 46, 50)],
      ['Upper Tunnels', r(0, 48, 30, 58)],
      ['Mid', r(42, 33, 54, 64)],
      ['Outside Tunnels', r(2, 58, 30, 90)],
      ['Top Mid', r(38, 62, 58, 82)],
      ['T Ramp', r(50, 92, 72, 113)],
      ['T Spawn', r(0, 82, 52, 113)],
    ],
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
  }
}

// ============================================================================================
// Mirage, 1:1: T spawn on the east, CT spawn bottom left. A is bottom middle (A ramp from the T
// side, palace, jungle and connector from mid, ticket booth and CT); B is top left (apartments
// from the T side, short and market); mid runs across the middle under window.
// ============================================================================================
function mirage() {
  const g = fromPlan(MIRAGE, {
    fix(s) {
      s.ease(84, 44, 108, 72, 3.5) // T ramp: the stairs down from the T side to A ramp
      s.ease(0, 0, MIRAGE.w, MIRAGE.d)
    },
  })
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
    callouts: [
      ['T Spawn', r(97, 18, 109, 42)],
      ['T Apartments', r(62, 1, 97, 17)],
      ['B Apartments', r(9, 1, 62, 12)],
      ['B Site', r(9, 12, 30, 30)],
      ['Market', r(8, 30, 30, 46)],
      ['Window', r(38, 20, 46, 38)],
      ['Short B', r(30, 12, 46, 40)],
      ['Top Mid', r(71, 18, 98, 48)],
      ['Mid', r(43, 37, 75, 48)],
      ['Underpass', r(48, 47, 60, 60)],
      ['Connector', r(38, 46, 50, 60)],
      ['Jungle', r(38, 60, 52, 72)],
      ['CT Spawn', r(16, 60, 38, 84)],
      ['Ticket Booth', r(36, 80, 52, 94)],
      ['A Site', r(50, 66, 72, 94)],
      ['Palace', r(70, 70, 100, 90)],
      ['A Ramp', r(76, 48, 98, 70)],
      ['T Ramp', r(96, 42, 109, 70)],
    ],
    routes: {
      A: [
        { name: 'Ramp', path: [[102, 28], [102, 50], [95, 58], [85, 62], [75, 68], [62, 80]] },
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
// Nuke: T spawn on the west, CT spawn on the east, a big yard outside to the north. Inside the
// plant, A site is on the ground floor (through lobby, hut and squeaky) and B site is in the
// basement right under it: down the ramp, through secret from the yard, down decon from CT, or
// drop through the vent in A's floor.
// ============================================================================================
function nuke() {
  const g = carve(100, 78, (m) => {
    // The yard, the silo, containers; the T and CT spawns
    m.room(14, 4, 70, 28, 0)
    m.room(70, 4, 84, 8, 0)
    m.room(2, 26, 18, 62, 0, 'path')
    m.room(82, 4, 98, 62, 0, 'path')
    m.box(40, 12, 46, 18, 6.8, 'metal')
    m.box(56, 16, 60, 22, 2.6, 'metal')
    m.box(52, 18, 56, 22, 1.7)
    m.box(26, 12, 29, 15, 1.1)
    m.box(62, 22, 66, 26, 1.7, 'metal')
    m.box(88, 20, 91, 23, 1.1)
    // T main into lobby; hut and squeaky off lobby onto A
    m.room(18, 42, 30, 50, 0, 'path')
    m.roof(18, 42, 30, 50, 4)
    m.room(30, 36, 40, 56, 0, 'tile')
    m.roof(30, 36, 40, 56, 4.5)
    m.room(40, 32, 48, 38, 0, 'wood')
    m.roof(40, 32, 48, 38, 3.4)
    m.room(40, 46, 48, 50, 0, 'path')
    m.roof(40, 46, 48, 50, 3.4)
    // B site, in the basement (A's floor is its ceiling)
    m.room(56, 44, 76, 70, -5, 'tile')
    m.roof(56, 44, 76, 70, -1)
    m.box(62, 56, 65, 59, -3.3)
    m.box(63, 57, 64, 58, -2.4)
    m.box(69, 49, 71, 51, -3.9)
    m.box(58, 64, 60, 66, -3.9)
    // A site: the big hall, its floor a slab over B where they overlap
    m.room(48, 32, 56, 52, 0, 'path')
    m.roof(48, 32, 56, 52, 8)
    m.room(56, 32, 66, 44, 0, 'path')
    m.roof(56, 32, 66, 44, 8)
    m.hollow(56, 44, 66, 52, 0, 8, 'path')
    m.box(52, 38, 55, 41, 1.7)
    m.box(52, 38, 53, 39, 2.6)
    m.box(59, 46, 61, 48, 1.1)
    // the vent: a hole in A's floor, down into B
    m.hollow(62, 49, 64, 51, -6, 0, 'tile')
    m.room(62, 49, 64, 51, -5, 'tile')
    m.roof(62, 49, 64, 51, 8)
    // Heaven (the balcony over A) and its stairs up from the CT hall
    m.box(56, 32, 64, 35, 3.0, 'metal')
    m.ramp(64, 32, 72, 36, 3.0, 0, 'x', 'metal')
    m.roof(64, 32, 72, 36, 8)
    // Ramp: from lobby down to B
    m.room(30, 56, 36, 70, 0, 'path')
    m.roof(30, 56, 36, 70, 4)
    m.ramp(36, 62, 56, 70, 0, -5, 'x')
    m.roof(36, 62, 46, 70, 3.5)
    m.roof(46, 62, 56, 70, 0.5)
    // Secret: from the yard down to B, under the CT hall
    m.ramp(72, 8, 76, 28, 0, -5, 'z')
    m.roof(72, 8, 76, 16, 3.5)
    m.roof(72, 16, 76, 22, 1.5)
    m.roof(72, 22, 76, 28, -0.5)
    m.room(72, 28, 76, 44, -5, 'path')
    m.roof(72, 28, 76, 44, -1)
    // The CT hall from CT spawn to A, over secret
    m.hollow(66, 36, 82, 44, 0, 4, 'path')
    // Decon: from CT spawn down to B
    m.ramp(74, 56, 84, 62, -5, 0, 'x')
    m.roof(74, 56, 84, 62, 3.5)
  })
  return {
    id: 'nuke',
    name: 'Nuke',
    blurb: 'A on top, B underneath. Ramp, secret, vents, heaven.',
    ...g,
    look: 'nuke',
    radarSplit: -2, // below this you're downstairs (B), and the radar shows that floor
    spawns: {
      T: [[6, 32], [10, 36], [6, 40], [12, 44], [8, 48], [14, 52], [6, 56], [12, 30], [10, 58], [14, 38]],
      CT: [[86, 12], [90, 16], [94, 20], [86, 26], [92, 30], [88, 34], [94, 40], [86, 46], [92, 50], [88, 56]],
    },
    buy: { T: r(2, 26, 18, 62), CT: r(82, 4, 98, 62) },
    sites: { A: r(48, 32, 66, 52, -0.5, 10), B: r(56, 44, 76, 70, -6, -1) },
    plant: { A: [[54, 44, 0], [60, 39, 0], [57, 49, 0], [50, 34, 0]], B: [[64, 61, -5], [70, 47, -5], [60, 52, -5], [72, 66, -5]] },
    callouts: [
      ['Heaven', r(56, 32, 72, 35, 1.5, 10)],
      ['Vent', r(62, 49, 64, 51, -6, 1)],
      ['A Site', r(48, 32, 66, 52, -0.5, 10)],
      ['Hut', r(40, 32, 48, 38)],
      ['Squeaky', r(40, 46, 48, 50)],
      ['CT Hall', r(66, 36, 82, 44, -0.5, 6)],
      ['Secret', r(72, 8, 76, 44, -6, -0.1)],
      ['Decon', r(74, 56, 84, 62)],
      ['B Site', r(56, 44, 76, 70, -6, -0.5)],
      ['Ramp', r(30, 56, 56, 70)],
      ['Lobby', r(30, 36, 40, 56)],
      ['T Main', r(18, 42, 30, 50)],
      ['Silo', r(34, 8, 52, 22)],
      ['Outside', r(14, 4, 84, 28)],
      ['CT Spawn', r(82, 4, 98, 62)],
      ['T Spawn', r(2, 26, 18, 62)],
    ],
    routes: {
      A: [
        { name: 'Hut', path: [[10, 46], [24, 46], [34, 42], [44, 35], [52, 36]] },
        { name: 'Squeaky', path: [[10, 48], [24, 46], [35, 48], [44, 48], [54, 48]] },
        { name: 'Outside to Heaven', path: [[12, 30], [30, 20], [60, 8], [78, 6], [86, 22], [84, 40], [70, 40], [68, 33], [60, 33]] },
      ],
      B: [
        { name: 'Ramp', path: [[10, 50], [24, 46], [33, 52], [33, 64], [46, 66, -2.5], [60, 62, -5]] },
        { name: 'Secret', path: [[12, 30], [40, 24], [66, 6], [74, 9], [74, 24, -4], [74, 36, -5], [68, 50, -5]] },
      ],
    },
    holds: {
      A: [{ at: [60, 36], look: [46, 35] }, { at: [58, 50, 0], look: [44, 48] }, { at: [60, 33, 3], look: [50, 46] }, { at: [64, 42], look: [52, 36] }],
      B: [{ at: [66, 48, -5], look: [56, 66, -5] }, { at: [70, 64, -5], look: [74, 44, -5] }, { at: [62, 67, -5], look: [48, 66, -3] }],
      mid: [{ at: [80, 6], look: [50, 14] }, { at: [88, 26], look: [60, 12] }],
    },
    posts: {
      A: [{ at: [50, 36], look: [66, 40] }, { at: [46, 48], look: [60, 44] }, { at: [54, 50], look: [66, 38] }],
      B: [{ at: [58, 67, -5], look: [74, 58, -5] }, { at: [66, 46, -5], look: [74, 40, -5] }, { at: [44, 66, -2], look: [62, 60, -5] }],
    },
    props: [],
    sky: { top: '#7f9fbf', bottom: '#d9dde0', fog: '#cfd5da', sun: '#fff6e8', ground: '#8f9396' },
  }
}

// ============================================================================================
// Inferno, 1:1: T spawn bottom left, CT spawn on the right. B is at the top, up banana; A is on
// the right, through apartments and the balcony or up mid; pit, library and arch round it.
// ============================================================================================
function inferno() {
  const g = fromPlan(INFERNO, {
    fix(s) {
      s.ease(0, 0, INFERNO.w, INFERNO.d)
    },
  })
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
    callouts: [
      ['T Spawn', r(0, 66, 16, 92)],
      ['B Site', r(44, 8, 64, 32)],
      ['Coffins', r(56, 2, 74, 14)],
      ['CT', r(64, 14, 92, 30)],
      ['Banana', r(42, 32, 58, 70)],
      ['Second Mid', r(16, 68, 44, 90)],
      ['Mid', r(44, 70, 80, 82)],
      ['Apartments', r(30, 82, 80, 112)],
      ['Arch', r(76, 56, 92, 72)],
      ['Library', r(100, 88, 117, 112)],
      ['Pit', r(96, 88, 117, 112)],
      ['A Site', r(88, 64, 110, 90)],
      ['Long', r(80, 28, 98, 64)],
      ['CT Spawn', r(96, 24, 117, 52)],
    ],
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
// Overpass: a city park and a canal. A is up in the park (Long A, Bathrooms, Truck); B is down in
// the canal under the road bridge, reached through Monster or along the Water. Connector runs
// between the sites; CTs drop to B past Heaven.
// ============================================================================================
function overpass() {
  const g = carve(96, 100, (m) => {
    // T spawn, the lower park and its fountain
    m.room(4, 82, 26, 98, 0)
    m.room(8, 60, 30, 82, 0.5)
    m.box(16, 68, 20, 72, 1.3, 'low')
    // Long A and up onto A
    m.room(10, 34, 22, 60, 1.0, 'path')
    m.ramp(10, 26, 22, 34, 2.0, 1.0, 'z')
    // Bathrooms, Short A
    m.room(30, 64, 40, 74, 0.5, 'tile')
    m.roof(30, 64, 40, 74, 3.4)
    m.room(32, 44, 40, 64, 1.0, 'tile')
    m.roof(32, 44, 40, 64, 3.4)
    m.room(32, 34, 42, 44, 1.5, 'path')
    m.ramp(32, 26, 42, 34, 2.0, 1.5, 'z')
    // A site: the truck, Bank
    m.room(8, 4, 40, 26, 2.0, 'path')
    m.box(24, 14, 30, 18, 3.6, 'car')
    m.box(12, 8, 16, 10, 3.0, 'low')
    m.box(34, 6, 37, 9, 3.1)
    // Divider over to CT spawn; Connector down to B
    m.room(40, 4, 70, 10, 2.0, 'path')
    m.room(40, 12, 50, 18, 2.0, 'path')
    m.roof(40, 12, 50, 18, 4.6)
    m.ramp(50, 12, 62, 18, 2.0, -3.0, 'x')
    m.roof(50, 12, 62, 18, 6.0)
    m.room(62, 12, 68, 30, -3.0, 'path')
    m.roof(62, 12, 68, 30, 0.4)
    // B site in the canal: the pillar under the bridge, barrels, the toxic barrels, the bench
    m.room(58, 30, 90, 74, -3.0)
    m.box(70, 50, 72, 54, 7, 'wall')
    m.box(64, 36, 66, 38, -1.9, 'metal')
    m.box(76, 60, 80, 64, -1.4, 'car')
    m.box(62, 66, 64, 70, -2.2, 'low')
    // the road bridge overhead
    m.slab(56, 50, 92, 54, 4.5, 5.2, 'metal')
    // CT spawn; the stairs down to B; Heaven over B
    m.room(70, 4, 94, 26, 2.0)
    m.ramp(82, 26, 90, 40, 2.0, -3.0, 'z')
    m.room(74, 26, 82, 34, 1.0, 'path')
    // Monster: from T spawn, down through the tunnel, up into B
    m.ramp(26, 88, 34, 96, 0, -1.5, 'x')
    m.room(34, 88, 58, 96, -1.5, 'path')
    m.roof(34, 88, 58, 96, 1.4)
    m.room(58, 88, 66, 96, -1.5, 'path')
    m.roof(58, 88, 66, 96, 1.4)
    m.ramp(58, 74, 66, 88, -3.0, -1.5, 'z')
    m.roof(58, 78, 66, 88, 1.0)
    // The Water: down the steps from the park and along the canal
    m.ramp(30, 74, 40, 80, 0.5, -3.0, 'x')
    m.room(40, 74, 58, 80, -3.0, 'tile')
  })
  return {
    id: 'overpass',
    name: 'Overpass',
    blurb: 'A in the park, B in the canal under the bridge. Monster, Water, Connector.',
    ...g,
    look: 'overpass',
    wingman: 'B',
    radarSplit: -1,
    spawns: {
      T: [[8, 90], [12, 92], [16, 90], [20, 92], [10, 95], [14, 96], [18, 95], [22, 88], [6, 86], [24, 95]],
      CT: [[74, 8], [78, 10], [82, 8], [86, 12], [90, 8], [76, 16], [80, 18], [84, 20], [88, 16], [92, 22]],
    },
    buy: { T: r(4, 82, 26, 98), CT: r(70, 4, 94, 26) },
    sites: { A: r(8, 4, 40, 26), B: r(58, 30, 90, 74, -6, 0) },
    plant: { A: [[18, 12], [34, 20], [14, 20], [26, 8]], B: [[66, 44], [78, 46], [66, 62], [84, 56]] },
    callouts: [
      ['Truck', r(22, 12, 32, 20)],
      ['Bank', r(10, 6, 18, 12)],
      ['A Site', r(8, 4, 40, 26)],
      ['Long A', r(10, 26, 22, 60)],
      ['Short A', r(32, 26, 42, 44)],
      ['Bathrooms', r(30, 44, 40, 74)],
      ['Fountain', r(8, 60, 30, 82)],
      ['Divider', r(40, 4, 70, 10)],
      ['Connector', r(40, 10, 68, 30)],
      ['Heaven', r(74, 26, 82, 34)],
      ['Pillar', r(66, 46, 76, 58, -6, 0)],
      ['B Site', r(58, 30, 90, 74, -6, 0)],
      ['Monster', r(26, 74, 66, 98, -6, 0)],
      ['Water', r(30, 74, 58, 80, -6, 0.6)],
      ['CT Spawn', r(70, 4, 94, 26)],
      ['T Spawn', r(4, 82, 26, 98)],
    ],
    routes: {
      A: [
        { name: 'Long', path: [[14, 88], [18, 74], [16, 58], [16, 44], [16, 32], [20, 20]] },
        { name: 'Bathrooms', path: [[20, 86], [26, 70], [35, 68], [36, 56], [36, 46], [37, 38], [36, 28], [30, 22]] },
      ],
      B: [
        { name: 'Monster', path: [[20, 92], [30, 92], [46, 92], [60, 92], [62, 82], [62, 74], [66, 60]] },
        { name: 'Water', path: [[22, 86], [24, 76], [34, 77], [50, 77], [60, 72], [66, 64], [74, 56]] },
      ],
    },
    holds: {
      A: [{ at: [22, 6], look: [16, 34] }, { at: [34, 12], look: [37, 40] }, { at: [28, 22], look: [16, 40] }],
      B: [{ at: [78, 30, 1.0], look: [62, 70] }, { at: [86, 66], look: [62, 78] }, { at: [68, 40], look: [62, 80] }],
      mid: [{ at: [46, 14], look: [64, 15] }, { at: [56, 6], look: [20, 6] }],
    },
    posts: {
      A: [{ at: [12, 24], look: [30, 8] }, { at: [36, 30], look: [20, 10] }, { at: [18, 30], look: [30, 10] }],
      B: [{ at: [62, 72], look: [80, 40] }, { at: [52, 77], look: [74, 40] }, { at: [67, 40], look: [84, 34] }],
    },
    props: [
      { type: 'palm', x: 9, z: 61, y: 0.5 },
      { type: 'palm', x: 28, z: 80, y: 0.5 },
      { type: 'awning', x: 32, z: 64, w: 8, y: 3.0, color: '#4a6b8a' },
    ],
    sky: { top: '#7aa6d8', bottom: '#dfe6e0', fog: '#d6ded8', sun: '#fff4e0', ground: '#7d876a' },
  }
}

// ============================================================================================
// Vertigo: the top of an unfinished skyscraper. T spawn and Mid are a floor down; both sites,
// CT spawn and Mid Upper are up top. Mind the edges: there's nothing past them but air.
// ============================================================================================
function vertigo() {
  const g = carve(90, 90, (m) => {
    // T spawn (a floor down), T Mid
    m.room(6, 60, 30, 84, 0, 'path')
    m.room(24, 52, 32, 62, 0, 'path')
    // Mid (lower), with Mid Upper on a slab over half of it
    m.room(30, 36, 48, 60, 0, 'path')
    m.slab(30, 36, 48, 46, 3.5, 4.0, 'path')
    m.room(48, 36, 62, 46, 4.0, 'tile')
    m.roof(48, 36, 62, 46, 6.6)
    // A: up the A ramp from T, or the side stairs from Mid, onto the scaffolding
    m.room(30, 64, 40, 72, 0, 'path')
    m.ramp(40, 62, 56, 72, 0, 4.0, 'x')
    m.ramp(48, 50, 56, 58, 0, 4.0, 'x')
    m.room(56, 44, 80, 72, 4.0, 'path')
    m.box(62, 50, 66, 54, 5.6, 'wood')
    m.box(70, 58, 74, 62, 5.2)
    m.box(60, 64, 64, 66, 5.0, 'low')
    m.void(80, 40, 90, 74)
    // B: up the B ramp from Mid, or the Ladders from T spawn
    m.room(8, 6, 38, 30, 4.0, 'path')
    m.box(16, 12, 20, 16, 5.4)
    m.box(26, 20, 30, 23, 5.2, 'metal')
    m.void(0, 6, 8, 30)
    m.ramp(36, 24, 46, 36, 4.0, 0, 'z')
    m.room(10, 48, 18, 60, 0, 'path')
    m.roof(10, 48, 18, 60, 3.4)
    m.ramp(10, 30, 18, 48, 4.0, 0, 'z')
    m.roof(10, 34, 18, 48, 6.4)
    // CT spawn and its ways to the sites
    m.room(40, 4, 70, 22, 4.0)
    m.room(38, 8, 40, 20, 4.0, 'path')
    m.room(62, 22, 72, 44, 4.0, 'path')
    m.void(40, 0, 70, 4)
  })
  return {
    id: 'vertigo',
    name: 'Vertigo',
    blurb: 'Fifty floors up. Two sites, two levels, and long drops off the edges.',
    ...g,
    look: 'vertigo',
    wingman: 'A',
    radarSplit: 2,
    killY: -14,
    skyline: true,
    spawns: {
      T: [[8, 64], [12, 66], [16, 64], [20, 66], [24, 64], [10, 72], [14, 74], [18, 72], [22, 74], [26, 70]],
      CT: [[44, 8], [48, 10], [52, 8], [56, 10], [60, 8], [64, 10], [46, 16], [50, 18], [58, 16], [66, 18]],
    },
    buy: { T: r(6, 60, 30, 84), CT: r(40, 4, 70, 22) },
    sites: { A: r(56, 44, 80, 72, 2, 10), B: r(8, 6, 38, 30, 2, 10) },
    plant: { A: [[60, 48], [68, 52], [76, 66], [60, 60]], B: [[12, 10], [24, 12], [14, 24], [32, 20]] },
    callouts: [
      ['Scaffolding', r(60, 48, 76, 64, 3, 10)],
      ['A Site', r(56, 44, 80, 72, 2, 10)],
      ['A Ramp', r(30, 62, 56, 72)],
      ['Side Stairs', r(48, 50, 56, 58)],
      ['Elevators', r(48, 36, 62, 46, 2, 10)],
      ['Mid Upper', r(30, 36, 48, 46, 2, 10)],
      ['Mid', r(30, 36, 48, 60, -1, 2)],
      ['B Site', r(8, 6, 38, 30, 2, 10)],
      ['B Ramp', r(36, 24, 46, 36)],
      ['Ladders', r(10, 30, 18, 60)],
      ['CT to A', r(62, 22, 72, 44)],
      ['CT Spawn', r(38, 4, 70, 22)],
      ['T Mid', r(24, 52, 32, 62)],
      ['T Spawn', r(6, 60, 30, 84)],
    ],
    routes: {
      A: [
        { name: 'A Ramp', path: [[16, 70], [28, 68], [35, 68], [44, 67], [52, 67], [60, 66]] },
        { name: 'Side Stairs', path: [[20, 64], [28, 56], [38, 54, 0], [46, 54, 0], [52, 54], [60, 54]] },
      ],
      B: [
        { name: 'B Ramp', path: [[20, 62], [28, 56], [40, 50, 0], [41, 40, 0], [41, 30], [30, 20]] },
        { name: 'Ladders', path: [[10, 66], [14, 56], [14, 48], [14, 40], [14, 32], [16, 22]] },
      ],
    },
    holds: {
      A: [{ at: [64, 46], look: [50, 66] }, { at: [76, 50], look: [52, 54] }, { at: [66, 70], look: [44, 67] }],
      B: [{ at: [30, 10], look: [41, 32] }, { at: [14, 10], look: [14, 40] }, { at: [24, 26], look: [40, 34] }],
      mid: [{ at: [40, 44, 4], look: [40, 58] }, { at: [66, 30], look: [66, 46] }],
    },
    posts: {
      A: [{ at: [52, 67], look: [66, 50] }, { at: [58, 70], look: [66, 46] }, { at: [70, 48], look: [66, 30] }],
      B: [{ at: [36, 26], look: [16, 12] }, { at: [14, 28], look: [30, 10] }, { at: [28, 8], look: [14, 26] }],
    },
    props: [],
    sky: { top: '#5c8fd0', bottom: '#cfdcea', fog: '#c9d6e4', sun: '#fff8ea', ground: '#7d8590' },
  }
}

export const MAPS = { dust2: dust2(), mirage: mirage(), nuke: nuke(), inferno: inferno(), overpass: overpass(), vertigo: vertigo() }
export const MAP_LIST = ['dust2', 'mirage', 'nuke', 'inferno', 'overpass', 'vertigo']
