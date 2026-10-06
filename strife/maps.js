// COUNTER-STRIFE's maps: recreations of two classic bomb-defusal layouts, Dust 2 and Mirage,
// built from scratch (all the art is ours). A map is a grid of 1 m cells. Each cell has a floor
// height (walls are just very tall floors), an optional ceiling (tunnels and indoor rooms), and a
// material. Maps are written as a list of carving commands: everything starts solid and the
// commands dig out rooms, ramps (stairs) and crates.
//
// Coordinates: x goes east, z goes south, both in metres from the map's top-left corner.

export const WALL_H = 7

/** A blank map and the commands that carve it. */
function carve(w, d, build) {
  const n = w * d
  const floor = new Float32Array(n).fill(WALL_H)
  const ceil = new Float32Array(n).fill(Infinity)
  const mat = new Uint8Array(n) // index into MATS
  const set = (x0, z0, x1, z1, fn) => {
    for (let z = Math.max(0, z0); z < Math.min(d, z1); z++) for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) fn(z * w + x, x, z)
  }
  const m = {
    /** A flat floor at height h. */
    room(x0, z0, x1, z1, h, material = 'ground') {
      set(x0, z0, x1, z1, (i) => ((floor[i] = h), (ceil[i] = Infinity), (mat[i] = MAT[material])))
    },
    /** Stairs from h0 (at the x0/z0 edge) to h1 (at the x1/z1 edge), one step per cell. */
    ramp(x0, z0, x1, z1, h0, h1, axis, material = 'step') {
      const n = axis === 'x' ? x1 - x0 : z1 - z0
      set(x0, z0, x1, z1, (i, x, z) => {
        const k = axis === 'x' ? x - x0 : z - z0
        floor[i] = h0 + ((h1 - h0) * (k + 0.5)) / n
        ceil[i] = Infinity
        mat[i] = MAT[material]
      })
    },
    /** A solid block (crate, car, low wall) whose top is at height h. */
    box(x0, z0, x1, z1, h, material = 'crate') {
      set(x0, z0, x1, z1, (i) => ((floor[i] = h), (mat[i] = MAT[material])))
    },
    /** A ceiling at height c over the cells already carved here (tunnels, doorways, rooms). */
    roof(x0, z0, x1, z1, c) {
      set(x0, z0, x1, z1, (i) => (ceil[i] = c))
    },
    /** Paint the floor with another material. */
    paint(x0, z0, x1, z1, material) {
      set(x0, z0, x1, z1, (i) => (mat[i] = MAT[material]))
    },
  }
  build(m)
  return { w, d, floor, ceil, mat }
}

// Materials, by role. Each map picks its own look for each (see LOOKS).
export const MAT_NAMES = ['wall', 'ground', 'path', 'step', 'crate', 'door', 'metal', 'car', 'low', 'tile', 'wood', 'trim']
const MAT = Object.fromEntries(MAT_NAMES.map((n, i) => [n, i]))

const r = (x0, z0, x1, z1) => ({ x0, z0, x1, z1 })

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

export const MAPS = { dust2: dust2(), mirage: mirage() }
export const MAP_LIST = ['dust2', 'mirage']
