// COUNTER-STRIFE's maps: recreations of classic bomb-defusal layouts (Dust 2, Mirage, Nuke),
// built from scratch (all the art is ours). A map is a grid of 1 m cells. Each cell is a column
// of solid spans (ground, a crate on it, the slab of an upper floor, a roof), with air between;
// walls are just very tall ground. That's enough for tunnels and for Nuke's A site sitting right
// on top of B. Maps are written as carving commands: everything starts solid and the commands
// dig out rooms, ramps (stairs) and crates, and lay floors over floors.
//
// Coordinates: x goes east, z goes south, y up, all in metres from the map's top-left corner.

export const WALL_H = 7
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
// Dust 2: T spawn at the bottom, CT spawn at the top. A is top right (long A up the east side,
// short A over catwalk from mid), B is top left (through the tunnels, or B doors from CT).
// ============================================================================================
function dust2() {
  const g = carve(96, 100, (m) => {
    // T spawn and the ramp down to top mid ("suicide")
    m.room(40, 84, 62, 97, 1.5)
    m.room(40, 72, 56, 80, 0)
    m.ramp(44, 80, 52, 86, 0, 1.5, 'z')
    // Mid, xbox, mid doors, CT mid
    m.room(43, 28, 51, 72, 0, 'path')
    m.box(45, 60, 47, 62, 1.1)
    m.room(44, 24, 50, 28, 0, 'path')
    m.roof(44, 24, 50, 28, 3.6)
    m.room(38, 10, 54, 24, 0)
    // CT spawn (up a ramp from CT mid) and its way onto A
    m.ramp(54, 12, 60, 22, 0, 1.5, 'x')
    m.room(60, 4, 74, 22, 1.5)
    m.room(74, 8, 76, 16, 1.75, 'path')
    // A site, goose, the default boxes, A car
    m.room(76, 4, 94, 30, 2.0, 'path')
    m.room(91, 1, 95, 4, 2.0, 'path')
    m.box(84, 12, 87, 15, 3.1)
    m.box(85, 13, 86, 14, 4.0)
    m.box(79, 20, 81, 24, 3.4, 'car')
    m.box(91, 22, 94, 24, 3.0, 'low')
    // A ramp, long A (with blue), the bottom of long, pit, long doors, outside long
    m.ramp(80, 30, 94, 36, 2.0, 1.0, 'z')
    m.room(82, 36, 94, 60, 1.0)
    m.box(84, 54, 87, 59, 3.6, 'metal')
    m.room(74, 60, 94, 68, 1.0)
    m.ramp(88, 60, 94, 64, 1.0, -0.5, 'z')
    m.room(88, 64, 94, 76, -0.5)
    m.room(74, 68, 80, 76, 1.0, 'path')
    m.roof(74, 70, 80, 74, 3.8)
    m.room(68, 76, 80, 84, 1.0)
    m.ramp(62, 84, 72, 92, 1.5, 1.0, 'x')
    // Catwalk (with the low wall you see mid over), its stairs, short A
    m.room(53, 26, 60, 46, 2.0, 'path')
    m.box(51, 28, 53, 46, 3.0, 'low')
    m.ramp(51, 46, 60, 50, 0, 2.0, 'x')
    m.room(60, 26, 76, 32, 2.0, 'path')
    m.box(66, 26, 68, 28, 3.1)
    // Lower tunnels, the tunnel stairs, upper tunnels, outside tunnels
    m.room(30, 38, 43, 44, 0, 'path')
    m.roof(30, 38, 43, 44, 3.2)
    m.ramp(30, 44, 36, 52, 0, 1.0, 'z')
    m.roof(30, 44, 36, 52, 4.2)
    m.room(10, 52, 36, 62, 1.0, 'path')
    m.roof(10, 52, 36, 62, 4.4)
    m.room(22, 62, 34, 78, 1.0)
    m.room(26, 78, 36, 90, 1.0)
    m.ramp(36, 84, 42, 92, 1.0, 1.5, 'x')
    m.box(24, 66, 26, 69, 2.1)
    // B tunnels out onto B site
    m.room(10, 36, 18, 52, 1.0, 'path')
    m.roof(10, 36, 18, 52, 4.4)
    m.ramp(10, 30, 18, 36, 0, 1.0, 'z')
    m.roof(10, 32, 18, 36, 4.0)
    // B site: platform, car, the big boxes by the tunnel, B doors to CT mid
    m.room(4, 4, 34, 30, 0)
    m.room(6, 4, 20, 9, 1.0, 'step')
    m.ramp(6, 9, 20, 11, 1.0, 0, 'z')
    m.box(26, 6, 30, 10, 1.4, 'car')
    m.box(19, 22, 22, 25, 1.7)
    m.box(19, 22, 20, 23, 2.6)
    m.box(5, 24, 7, 27, 1.1)
    m.room(34, 14, 38, 20, 0, 'path')
    m.roof(34, 14, 38, 20, 3.6)
  })
  return {
    id: 'dust2',
    name: 'Dust 2',
    blurb: 'Long A, catwalk, the tunnels. Sand in everything.',
    ...g,
    look: 'dust',
    spawns: {
      T: [[44, 90], [48, 92], [52, 90], [56, 92], [50, 95], [46, 94], [54, 94], [58, 89], [42, 88], [60, 94]],
      CT: [[64, 8], [68, 10], [64, 14], [70, 16], [66, 18], [72, 6], [62, 12], [70, 12], [66, 6], [72, 20]],
    },
    buy: { T: r(36, 80, 64, 98), CT: r(54, 3, 76, 23) },
    sites: { A: r(78, 4, 94, 30), B: r(5, 5, 33, 29) },
    plant: { A: [[86, 18], [82, 10], [90, 24], [88, 8]], B: [[12, 14], [24, 13], [15, 22], [10, 19]] },
    callouts: [
      ['Goose', r(90, 1, 95, 6)],
      ['A Site', r(76, 4, 94, 30)],
      ['A Ramp', r(80, 30, 94, 36)],
      ['Pit', r(88, 60, 94, 76)],
      ['Long A', r(82, 36, 94, 60)],
      ['Long Doors', r(74, 60, 88, 76)],
      ['Outside Long', r(62, 76, 80, 92)],
      ['Short A', r(60, 26, 76, 32)],
      ['Catwalk', r(51, 26, 60, 50)],
      ['Mid Doors', r(44, 24, 50, 28)],
      ['CT Mid', r(38, 10, 54, 24)],
      ['CT Spawn', r(54, 3, 76, 23)],
      ['B Doors', r(34, 14, 38, 20)],
      ['B Platform', r(4, 4, 20, 11)],
      ['B Site', r(4, 4, 34, 30)],
      ['B Tunnels', r(10, 30, 18, 52)],
      ['Upper Tunnels', r(10, 52, 36, 62)],
      ['Lower Tunnels', r(30, 38, 43, 52)],
      ['Outside Tunnels', r(22, 62, 42, 92)],
      ['Xbox', r(43, 56, 51, 64)],
      ['Top Mid', r(40, 64, 56, 80)],
      ['Mid', r(43, 28, 51, 72)],
      ['T Spawn', r(36, 80, 64, 98)],
    ],
    // How the Terrorists can go at each site (waypoints, from spawn).
    routes: {
      A: [
        { name: 'Long', path: [[56, 88], [66, 88], [72, 80], [77, 72], [82, 64], [88, 50], [88, 38], [86, 22]] },
        { name: 'Short', path: [[48, 84], [48, 74], [47, 62], [48, 50], [56, 48], [57, 38], [57, 29], [68, 29], [80, 26]] },
      ],
      B: [
        { name: 'Tunnels', path: [[44, 90], [34, 86], [30, 76], [28, 66], [22, 57], [14, 48], [14, 38], [14, 30], [16, 18]] },
        { name: 'Mid to B', path: [[48, 84], [47, 66], [47, 48], [44, 41], [34, 41], [33, 50], [22, 57], [14, 46], [14, 32], [18, 18]] },
      ],
    },
    // Where the Counter-Terrorists hold, and what they watch.
    holds: {
      A: [{ at: [86, 31], look: [88, 50] }, { at: [78, 27], look: [64, 29] }, { at: [92, 6], look: [86, 34] }, { at: [72, 13], look: [82, 26] }],
      B: [{ at: [12, 20], look: [14, 34] }, { at: [24, 6], look: [14, 30] }, { at: [32, 24], look: [14, 32] }, { at: [8, 7], look: [16, 28] }],
      mid: [{ at: [47, 18], look: [47, 50] }, { at: [57, 34], look: [47, 64] }],
    },
    // Where the Terrorists sit after planting, and what they watch.
    posts: {
      A: [{ at: [88, 33], look: [86, 12] }, { at: [70, 29], look: [80, 18] }, { at: [92, 26], look: [74, 12] }],
      B: [{ at: [14, 34], look: [16, 16] }, { at: [22, 26], look: [36, 17] }, { at: [8, 12], look: [34, 17] }],
    },
    // Decorations: open double doors (x, z, width, axis the doorway runs along, height of its floor),
    // palms and awnings.
    props: [
      { type: 'doors', x: 74, z: 72, w: 6, axis: 'x', y: 1.0, h: 2.8 },
      { type: 'doors', x: 44, z: 26, w: 6, axis: 'x', y: 0, h: 2.8 },
      { type: 'doors', x: 36, z: 14, w: 6, axis: 'z', y: 0, h: 2.8 },
      { type: 'palm', x: 41, z: 95, y: 1.5 },
      { type: 'palm', x: 61, z: 85, y: 1.5 },
      { type: 'palm', x: 93, z: 29, y: 2.0 },
      { type: 'palm', x: 5, z: 29, y: 0 },
    ],
    sky: { top: '#6a9bd8', bottom: '#e2d6ba', fog: '#ddd2b8', sun: '#fff1d6', ground: '#b0956c' },
  }
}

// ============================================================================================
// Mirage: T spawn on the east, CT spawn on the west. A is bottom left (ramp, palace, jungle),
// B is top left (apartments, short, market), and mid runs across the middle up to window.
// ============================================================================================
function mirage() {
  const g = carve(100, 92, (m) => {
    // T spawn, top mid, mid
    m.room(80, 34, 97, 62, 1.0)
    m.ramp(70, 40, 80, 48, 0, 1.0, 'x')
    m.room(31, 38, 70, 48, 0, 'path')
    m.box(56, 38, 58, 40, 1.1)
    m.box(46, 46, 49, 48, 1.1)
    // Window (the sniper's nest, with a sill you can crouch-jump through) and its stairs
    m.room(22, 36, 30, 46, 2.5, 'tile')
    m.roof(22, 36, 30, 46, 5.5)
    m.box(30, 39, 31, 45, 3.5, 'low')
    m.roof(30, 39, 31, 45, 5.0)
    m.ramp(16, 40, 22, 44, 0, 2.5, 'x', 'wood')
    m.roof(16, 40, 22, 44, 5.5)
    // Connector and jungle, down to A
    m.room(36, 48, 42, 60, 0, 'tile')
    m.roof(36, 48, 42, 60, 3.6)
    m.room(30, 60, 42, 66, 0, 'path')
    m.box(30, 60, 32, 62, 1.1)
    // A site: triple, firebox, default, sandwich; the ticket booth on the CT side
    m.room(16, 66, 46, 88, 0, 'path')
    m.room(4, 62, 16, 88, 0)
    m.box(6, 70, 11, 76, 3.0, 'trim')
    m.box(30, 72, 33, 75, 1.7)
    m.box(31, 73, 33, 75, 2.6)
    m.box(22, 80, 24, 82, 1.1)
    m.box(28, 76, 30, 78, 1.1)
    m.box(26, 84, 30, 85, 1.0, 'low')
    // A ramp, tetris, T ramp
    m.ramp(46, 70, 54, 80, 0, 1.0, 'x')
    m.room(54, 66, 66, 80, 1.0, 'step')
    m.box(58, 68, 61, 71, 2.1)
    m.room(66, 62, 84, 70, 1.0)
    // Palace: courtyard, stairs, the hall, and its exit stairs down onto A
    m.room(86, 62, 94, 74, 1.0)
    m.ramp(86, 74, 94, 81, 1.0, 2.5, 'z', 'wood')
    m.room(60, 81, 94, 88, 2.5, 'tile')
    m.roof(60, 81, 94, 88, 5.8)
    m.room(46, 81, 60, 88, 2.5, 'tile')
    m.roof(50, 81, 60, 88, 5.8)
    m.ramp(38, 81, 46, 88, 0, 2.5, 'x', 'wood')
    // CT spawn, the way up to B ("arch"), market
    m.room(4, 40, 16, 62, 0)
    m.room(6, 28, 14, 40, 0, 'path')
    m.room(16, 28, 24, 38, 0, 'tile')
    m.roof(16, 28, 24, 38, 3.4)
    m.room(14, 38, 18, 41, 0, 'tile')
    m.roof(14, 38, 18, 41, 3.4)
    // B site: van, bench, boxes
    m.room(6, 6, 30, 28, 0)
    m.box(20, 10, 25, 13, 1.8, 'car')
    m.box(12, 22, 15, 23, 0.6, 'wood')
    m.box(14, 10, 16, 12, 1.1)
    m.box(7, 7, 9, 9, 1.1)
    // Short (the catwalk from mid to B)
    m.ramp(31, 30, 37, 38, 1.0, 0, 'z')
    m.room(31, 22, 37, 30, 1.0, 'step')
    m.ramp(28, 22, 31, 28, 0, 1.0, 'x')
    // B apartments: in from T spawn, up the stairs, along the hall, down onto B
    m.room(76, 30, 84, 34, 1.0, 'wood')
    m.roof(76, 30, 84, 34, 4.6)
    m.ramp(76, 18, 84, 30, 3.0, 1.0, 'z', 'wood')
    m.roof(76, 18, 84, 30, 6.0)
    m.room(37, 10, 84, 18, 3.0, 'wood')
    m.roof(37, 10, 84, 18, 6.2)
    m.ramp(30, 10, 37, 18, 0, 3.0, 'x', 'wood')
    m.roof(31, 10, 37, 18, 6.2)
  })
  return {
    id: 'mirage',
    name: 'Mirage',
    blurb: 'Palace, ramp, window, apartments. Bring a smoke for window.',
    ...g,
    look: 'mirage',
    spawns: {
      T: [[86, 44], [90, 48], [86, 52], [92, 56], [88, 40], [94, 44], [90, 38], [84, 58], [94, 52], [88, 56]],
      CT: [[8, 46], [12, 50], [8, 54], [12, 44], [10, 58], [6, 50], [14, 56], [6, 42], [14, 48], [8, 60]],
    },
    buy: { T: r(78, 32, 98, 64), CT: r(3, 38, 17, 63) },
    sites: { A: r(17, 67, 45, 88), B: r(7, 7, 30, 27) },
    plant: { A: [[30, 80], [24, 76], [36, 76], [20, 84]], B: [[16, 16], [25, 18], [12, 12], [10, 20]] },
    callouts: [
      ['Window', r(16, 36, 31, 46)],
      ['Top Mid', r(70, 38, 80, 48)],
      ['Mid', r(31, 38, 70, 48)],
      ['Connector', r(36, 48, 42, 60)],
      ['Jungle', r(30, 60, 42, 66)],
      ['Ticket Booth', r(4, 62, 16, 88)],
      ['A Ramp', r(46, 66, 54, 80)],
      ['Tetris', r(54, 66, 66, 80)],
      ['T Ramp', r(66, 62, 86, 70)],
      ['Palace', r(38, 74, 94, 88)],
      ['A Site', r(16, 66, 46, 88)],
      ['Short', r(28, 22, 37, 38)],
      ['Market', r(14, 28, 24, 41)],
      ['B Apartments', r(30, 10, 84, 34)],
      ['B Site', r(6, 6, 30, 28)],
      ['CT Spawn', r(4, 28, 16, 62)],
      ['T Spawn', r(80, 32, 98, 64)],
    ],
    routes: {
      A: [
        { name: 'Ramp', path: [[86, 52], [82, 64], [72, 66], [60, 73], [50, 75], [36, 78]] },
        { name: 'Palace', path: [[90, 58], [90, 70], [90, 78], [80, 84], [56, 84], [42, 84], [30, 80]] },
        { name: 'Connector', path: [[84, 44], [74, 44], [56, 43], [39, 44], [39, 54], [36, 63], [28, 70]] },
      ],
      B: [
        { name: 'Apartments', path: [[84, 40], [80, 32], [80, 22], [70, 14], [50, 14], [34, 14], [20, 16]] },
        { name: 'Short', path: [[84, 44], [74, 44], [50, 43], [34, 40], [34, 32], [34, 26], [22, 20]] },
      ],
    },
    holds: {
      A: [{ at: [24, 72], look: [52, 74] }, { at: [34, 82], look: [50, 84] }, { at: [38, 68], look: [38, 52] }, { at: [18, 78], look: [46, 76] }],
      B: [{ at: [12, 10], look: [34, 14] }, { at: [22, 25], look: [34, 30] }, { at: [8, 20], look: [32, 14] }],
      mid: [{ at: [26, 41], look: [60, 43] }, { at: [39, 57], look: [39, 46] }],
    },
    posts: {
      A: [{ at: [44, 76], look: [20, 70] }, { at: [38, 64], look: [24, 78] }, { at: [52, 84], look: [16, 72] }],
      B: [{ at: [34, 14], look: [10, 30] }, { at: [34, 26], look: [12, 18] }, { at: [26, 8], look: [10, 34] }],
    },
    props: [
      { type: 'awning', x: 31, z: 47.6, w: 8, axis: 'x', y: 2.6, color: '#2f8f83' },
      { type: 'awning', x: 52, z: 38.4, w: 10, axis: 'x', y: 2.8, color: '#b8452f', flip: true },
      { type: 'awning', x: 6, z: 27.6, w: 6, axis: 'x', y: 2.4, color: '#c9a227' },
      { type: 'awning', x: 46, z: 87.6, w: 6, axis: 'x', y: 2.6, color: '#2f5f9f' },
      { type: 'palm', x: 95, z: 35, y: 1.0 },
      { type: 'palm', x: 5, z: 87, y: 0 },
      { type: 'palm', x: 29, z: 7, y: 0 },
    ],
    sky: { top: '#76a6dc', bottom: '#f2e0c6', fog: '#efdec6', sun: '#ffe9c8', ground: '#b3936d' },
  }
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
// Inferno: a hill town. T spawn at the bottom; B (with Construction and Coffins) up Banana to the
// north-west; A to the east, reached through the Apartments (upstairs, out on the Balcony),
// through Mid and Short, or the Arch and Library. CT spawn at the top.
// ============================================================================================
function inferno() {
  const g = carve(100, 100, (m) => {
    // T spawn, Second Oranges, T Mid
    m.room(30, 84, 56, 98, 0)
    m.room(44, 70, 52, 84, 0, 'path')
    // Banana: the bottom, the long curving climb, the car, the sandbags, the mouth onto B
    m.room(16, 78, 30, 86, 0, 'path')
    m.ramp(16, 56, 24, 78, 1.0, 0, 'z')
    m.room(14, 36, 26, 56, 1.0, 'path')
    m.box(18, 44, 20, 48, 2.3, 'car')
    m.box(22, 38, 26, 40, 1.9, 'low')
    m.room(16, 30, 26, 36, 1.25, 'path')
    // B site: Construction (roofed), Coffins, New Box, the fountain, Dark
    m.room(8, 6, 36, 30, 1.5)
    m.roof(8, 6, 16, 14, 4.4)
    m.box(24, 10, 28, 12, 2.5, 'wood')
    m.box(18, 22, 20, 24, 2.6)
    m.box(28, 20, 31, 23, 2.1, 'low')
    // CT: the long road from CT spawn to B
    m.room(36, 10, 60, 18, 1.5, 'path')
    // Mid, Top Mid, Short, the Arch and Library
    m.room(42, 48, 58, 70, 0.5, 'path')
    m.box(48, 58, 50, 61, 1.6)
    m.room(46, 36, 56, 48, 0.75, 'path')
    m.room(56, 44, 66, 50, 1.0, 'path')
    m.room(56, 36, 64, 44, 1.0, 'path')
    m.roof(56, 36, 64, 44, 3.8)
    m.room(60, 34, 64, 36, 1.25, 'path')
    m.roof(60, 34, 64, 36, 4.0)
    m.room(60, 24, 66, 34, 1.5, 'tile')
    m.roof(60, 24, 66, 34, 4.4)
    // Apartments: up the stairs from T spawn, along the upstairs halls, out on the Balcony
    m.room(56, 88, 60, 92, 0, 'path')
    m.roof(56, 88, 60, 92, 3.2)
    m.ramp(60, 84, 68, 92, 0, 3.5, 'x')
    m.roof(60, 84, 68, 92, 6.6)
    m.room(68, 80, 78, 92, 3.5, 'tile')
    m.roof(68, 80, 78, 92, 6.6)
    m.room(70, 60, 78, 80, 3.5, 'tile')
    m.roof(70, 60, 78, 80, 6.6)
    m.room(72, 52, 80, 60, 3.5, 'wood')
    m.ramp(80, 52, 84, 60, 1.5, 3.5, 'z')
    // A site: the truck, Graveyard, the default box, Pit
    m.room(66, 24, 94, 52, 1.5, 'path')
    m.box(70, 28, 74, 34, 3.2, 'car')
    m.box(88, 30, 92, 34, 2.4, 'low')
    m.box(80, 38, 82, 40, 2.5)
    m.ramp(88, 52, 94, 56, 1.5, -0.5, 'z')
    m.room(86, 56, 96, 64, -0.5)
    // CT spawn, and CT side down to A
    m.room(60, 4, 92, 20, 1.5)
    m.room(72, 20, 90, 24, 1.5, 'path')
  })
  return {
    id: 'inferno',
    name: 'Inferno',
    blurb: 'Banana, Apartments, the Balcony, Coffins. Hold Banana or lose B.',
    ...g,
    look: 'inferno',
    wingman: 'B',
    spawns: {
      T: [[34, 90], [38, 92], [42, 90], [46, 92], [50, 90], [36, 95], [40, 96], [44, 95], [48, 96], [52, 94]],
      CT: [[64, 8], [68, 10], [72, 8], [76, 12], [80, 8], [84, 12], [66, 16], [70, 14], [78, 16], [86, 16]],
    },
    buy: { T: r(30, 78, 56, 98), CT: r(58, 3, 93, 21) },
    sites: { A: r(66, 24, 94, 52), B: r(8, 6, 36, 30) },
    plant: { A: [[80, 34], [76, 44], [86, 28], [90, 46]], B: [[20, 16], [14, 26], [32, 14], [24, 18]] },
    callouts: [
      ['Construction', r(8, 6, 16, 14)],
      ['Coffins', r(22, 8, 30, 14)],
      ['B Site', r(8, 6, 36, 30)],
      ['Banana', r(14, 30, 26, 78)],
      ['CT', r(36, 10, 60, 18)],
      ['Library', r(60, 24, 66, 36)],
      ['Arch', r(56, 36, 64, 44)],
      ['Short', r(56, 44, 66, 50)],
      ['Pit', r(86, 52, 96, 64)],
      ['Truck', r(68, 26, 76, 36)],
      ['Graveyard', r(86, 28, 94, 36)],
      ['A Site', r(66, 24, 94, 52)],
      ['Balcony', r(72, 52, 84, 60)],
      ['Apartments', r(56, 60, 78, 92, 2.5, 10)],
      ['Top Mid', r(46, 36, 56, 48)],
      ['Mid', r(42, 48, 58, 70)],
      ['T Mid', r(44, 70, 52, 84)],
      ['T Ramp', r(16, 78, 30, 86)],
      ['CT Spawn', r(60, 4, 92, 24)],
      ['T Spawn', r(30, 84, 56, 98)],
    ],
    routes: {
      A: [
        { name: 'Apartments', path: [[52, 90], [58, 90], [64, 88], [70, 86, 3.5], [74, 70, 3.5], [76, 56, 3.5], [82, 54], [80, 44]] },
        { name: 'Mid', path: [[46, 88], [48, 76], [50, 66], [52, 46], [60, 47], [70, 46], [76, 42]] },
        { name: 'Arch', path: [[48, 86], [47, 64], [50, 42], [60, 40], [62, 35], [63, 30], [72, 36]] },
      ],
      B: [
        { name: 'Banana', path: [[34, 90], [24, 82], [20, 66], [20, 50], [21, 40], [21, 32], [20, 18]] },
        { name: 'Banana car', path: [[36, 92], [24, 82], [20, 62], [16, 46], [24, 34], [28, 24]] },
      ],
    },
    holds: {
      A: [{ at: [76, 46], look: [78, 58] }, { at: [70, 38], look: [60, 46] }, { at: [90, 38], look: [80, 56] }, { at: [84, 26], look: [62, 30] }],
      B: [{ at: [14, 22], look: [20, 42] }, { at: [30, 12], look: [21, 38] }, { at: [24, 8], look: [21, 36] }],
      mid: [{ at: [62, 40], look: [50, 62] }, { at: [52, 40], look: [48, 72] }],
    },
    posts: {
      A: [{ at: [68, 46], look: [80, 30] }, { at: [76, 56, 3.5], look: [80, 36] }, { at: [86, 48], look: [78, 24] }],
      B: [{ at: [21, 38], look: [20, 14] }, { at: [16, 26], look: [34, 14] }, { at: [34, 24], look: [12, 10] }],
    },
    props: [
      { type: 'doors', x: 56, z: 88, w: 4, axis: 'z', y: 0, h: 2.8 },
      { type: 'palm', x: 31, z: 97, y: 0 },
      { type: 'palm', x: 9, z: 29, y: 1.5 },
      { type: 'awning', x: 44, z: 70, w: 8, y: 2.6, color: '#8a3b2a' },
    ],
    sky: { top: '#6f9fd6', bottom: '#f0d8b0', fog: '#ecd6b4', sun: '#ffe2b8', ground: '#a07a58' },
  }
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
