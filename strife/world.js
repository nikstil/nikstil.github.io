// The world as the game sees it: the map's height grid, moving bodies through it, tracing
// bullets and sight lines, and finding paths for the bots. No rendering here (see render.js).

import { WALL_H } from './maps.js'

export const GRAVITY = 20
export const STEP = 0.55 // the highest stair you walk up without jumping
const SOLID = 1e6

export class World {
  constructor(map) {
    this.map = map
    this.w = map.w
    this.d = map.d
    this.floor = map.floor
    this.ceil = map.ceil
    this.smokes = [] // { x, y, z, r, until } (set by the game: smoke blocks sight)
    this.buildCallouts()
    this.buildNav()
  }

  /** Floor height of a cell (outside the map is solid). */
  fl(ix, iz) {
    if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.d) return SOLID
    return this.floor[iz * this.w + ix]
  }
  cl(ix, iz) {
    if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.d) return -SOLID
    return this.ceil[iz * this.w + ix]
  }
  floorAt(x, z) {
    return this.fl(Math.floor(x), Math.floor(z))
  }
  /** The highest floor under a round footprint (what you stand on). */
  groundUnder(x, z, r) {
    let h = -SOLID
    for (let iz = Math.floor(z - r); iz <= Math.floor(z + r); iz++) for (let ix = Math.floor(x - r); ix <= Math.floor(x + r); ix++) h = Math.max(h, this.fl(ix, iz))
    return h
  }
  ceilOver(x, z, r) {
    let c = SOLID
    for (let iz = Math.floor(z - r); iz <= Math.floor(z + r); iz++) for (let ix = Math.floor(x - r); ix <= Math.floor(x + r); ix++) c = Math.min(c, this.cl(ix, iz))
    return c
  }

  /** Would a body (feet at y, radius r, height h) overlap a wall, a too-high step, or a ceiling? */
  blocked(x, y, z, r, h, step) {
    for (let iz = Math.floor(z - r); iz <= Math.floor(z + r); iz++)
      for (let ix = Math.floor(x - r); ix <= Math.floor(x + r); ix++) {
        if (this.fl(ix, iz) > y + step + 1e-4) return true
        if (this.cl(ix, iz) < y + h - 1e-4) return true
      }
    return false
  }

  /**
   * Moves a body { pos, vel, r, h, onGround } by its velocity for dt seconds: walls stop it
   * (it slides along them), stairs lift it, ledges drop it, gravity pulls it. Returns the speed
   * it hit the ground at when it lands (for fall damage and landing sounds), else 0.
   */
  move(b, dt) {
    const p = b.pos
    const v = b.vel
    const step = b.onGround ? STEP : 0
    // Horizontal, one axis at a time, in short hops (nothing tunnels through a wall).
    const hops = Math.max(1, Math.ceil((Math.max(Math.abs(v.x), Math.abs(v.z)) * dt) / 0.25))
    for (let k = 0; k < hops; k++) {
      const dx = (v.x * dt) / hops
      const dz = (v.z * dt) / hops
      if (dx) {
        const nx = p.x + dx
        if (!this.blocked(nx, p.y, p.z, b.r, b.h, step)) p.x = nx
        else {
          const edge = dx > 0 ? Math.floor(nx + b.r) - b.r - 0.001 : Math.floor(nx - b.r) + 1 + b.r + 0.001
          if ((dx > 0 && edge > p.x) || (dx < 0 && edge < p.x)) if (!this.blocked(edge, p.y, p.z, b.r, b.h, step)) p.x = edge
          v.x = 0
        }
      }
      if (dz) {
        const nz = p.z + dz
        if (!this.blocked(p.x, p.y, nz, b.r, b.h, step)) p.z = nz
        else {
          const edge = dz > 0 ? Math.floor(nz + b.r) - b.r - 0.001 : Math.floor(nz - b.r) + 1 + b.r + 0.001
          if ((dz > 0 && edge > p.z) || (dz < 0 && edge < p.z)) if (!this.blocked(p.x, p.y, edge, b.r, b.h, step)) p.z = edge
          v.z = 0
        }
      }
    }
    // Vertical: walk up and down stairs, fall off ledges, land.
    const ground = this.groundUnder(p.x, p.z, b.r)
    let landed = 0
    if (b.onGround && v.y <= 0 && ground >= p.y - 0.6 && ground <= p.y + STEP + 0.01) {
      p.y = ground
      v.y = 0
    } else {
      v.y -= GRAVITY * dt
      p.y += v.y * dt
      if (p.y <= ground) {
        if (!b.onGround) landed = -v.y
        p.y = ground
        v.y = 0
        b.onGround = true
      } else b.onGround = false
    }
    const top = this.ceilOver(p.x, p.z, b.r)
    if (p.y + b.h > top) {
      p.y = Math.max(ground, top - b.h)
      if (v.y > 0) v.y = 0
    }
    return landed
  }

  /**
   * Casts a ray (unit direction) through the grid. Returns the first surface it hits within
   * maxT: { t, nx, ny, nz } (the surface normal), or null.
   */
  trace(ox, oy, oz, dx, dy, dz, maxT) {
    let ix = Math.floor(ox)
    let iz = Math.floor(oz)
    const sx = dx > 0 ? 1 : -1
    const sz = dz > 0 ? 1 : -1
    const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity
    const tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity
    let tmx = dx !== 0 ? (dx > 0 ? ix + 1 - ox : ox - ix) * tdx : Infinity
    let tmz = dz !== 0 ? (dz > 0 ? iz + 1 - oz : oz - iz) * tdz : Infinity
    let t0 = 0
    let axis = -1
    for (let guard = 0; guard < 600; guard++) {
      const t1 = Math.min(tmx, tmz, maxT)
      const f = this.fl(ix, iz)
      const c = this.cl(ix, iz)
      const y0 = oy + dy * t0
      const y1 = oy + dy * t1
      if (t0 > 0 && (y0 < f || y0 > c)) return axis === 0 ? { t: t0, nx: -sx, ny: 0, nz: 0 } : { t: t0, nx: 0, ny: 0, nz: -sz }
      if (dy < 0 && y1 < f) {
        const t = (f - oy) / dy
        if (t >= t0 - 1e-6) return { t: Math.max(t, t0), nx: 0, ny: 1, nz: 0 }
      }
      if (dy > 0 && y1 > c) {
        const t = (c - oy) / dy
        if (t >= t0 - 1e-6) return { t: Math.max(t, t0), nx: 0, ny: -1, nz: 0 }
      }
      if (t1 >= maxT) return null
      if (tmx < tmz) {
        ix += sx
        t0 = tmx
        tmx += tdx
        axis = 0
      } else {
        iz += sz
        t0 = tmz
        tmz += tdz
        axis = 1
      }
    }
    return null
  }

  /** Is there a clear line between two points (walls, and smoke if `smoke`)? */
  sees(a, b, smoke = true) {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dz = b.z - a.z
    const len = Math.hypot(dx, dy, dz)
    if (len < 1e-3) return true
    const hit = this.trace(a.x, a.y, a.z, dx / len, dy / len, dz / len, len)
    if (hit) return false
    return !(smoke && this.smokeBetween(a, b))
  }
  /** Does a line pass through a smoke cloud? */
  smokeBetween(a, b) {
    for (const s of this.smokes) {
      if (s.r <= 0) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dz = b.z - a.z
      const l2 = dx * dx + dy * dy + dz * dz
      let t = l2 ? ((s.x - a.x) * dx + (s.y - a.y) * dy + (s.z - a.z) * dz) / l2 : 0
      t = Math.max(0, Math.min(1, t))
      const px = a.x + dx * t - s.x
      const py = a.y + dy * t - s.y
      const pz = a.z + dz * t - s.z
      if (px * px + py * py * 1.6 + pz * pz < s.r * s.r) return true
    }
    return false
  }

  // ================= Places =================
  buildCallouts() {
    const { w, d } = this
    this.callout = new Int16Array(w * d).fill(-1)
    this.map.callouts.forEach(([, rr], k) => {
      for (let z = rr.z0; z < rr.z1; z++) for (let x = rr.x0; x < rr.x1; x++) if (x >= 0 && z >= 0 && x < w && z < d && this.callout[z * w + x] < 0) this.callout[z * w + x] = k
    })
  }
  calloutAt(x, z) {
    const ix = Math.floor(x)
    const iz = Math.floor(z)
    if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.d) return ''
    const k = this.callout[iz * this.w + ix]
    return k >= 0 ? this.map.callouts[k][0] : ''
  }
  inRect(rr, x, z) {
    return x >= rr.x0 && x < rr.x1 && z >= rr.z0 && z < rr.z1
  }

  // ================= Navigation =================
  buildNav() {
    const { w, d } = this
    const n = w * d
    this.walk = new Uint8Array(n)
    this.cost = new Float32Array(n)
    for (let i = 0; i < n; i++) this.walk[i] = this.floor[i] < WALL_H - 0.1 && this.ceil[i] - this.floor[i] >= 1.9 ? 1 : 0
    // Cells beside a wall or a drop cost more, so paths keep off the walls.
    for (let z = 0; z < d; z++)
      for (let x = 0; x < w; x++) {
        const i = z * w + x
        if (!this.walk[i]) continue
        let near = 0
        for (let oz = -1; oz <= 1; oz++)
          for (let ox = -1; ox <= 1; ox++) {
            const j = this.idx(x + ox, z + oz)
            if (j < 0 || !this.walk[j] || Math.abs(this.floor[j] - this.floor[i]) > STEP) near++
          }
        this.cost[i] = near ? 1.6 : 0
      }
    const g = new Float32Array(n)
    const f = new Float32Array(n)
    const from = new Int32Array(n)
    const mark = new Uint32Array(n)
    const closed = new Uint32Array(n)
    this.astar = { g, f, from, mark, closed, gen: 0, heap: new Int32Array(n * 4), size: 0 }
  }
  idx(x, z) {
    return x < 0 || z < 0 || x >= this.w || z >= this.d ? -1 : z * this.w + x
  }
  canStep(i, j) {
    return j >= 0 && this.walk[j] && Math.abs(this.floor[j] - this.floor[i]) <= STEP
  }
  /** The walkable cell nearest a point. */
  nearestCell(x, z) {
    const cx = Math.floor(x)
    const cz = Math.floor(z)
    for (let rad = 0; rad < 12; rad++)
      for (let oz = -rad; oz <= rad; oz++)
        for (let ox = -rad; ox <= rad; ox++) {
          if (Math.max(Math.abs(ox), Math.abs(oz)) !== rad) continue
          const j = this.idx(cx + ox, cz + oz)
          if (j >= 0 && this.walk[j]) return j
        }
    return -1
  }
  /** A walking route between two points: a list of [x, z] corners (smoothed), or null. */
  path(sx, sz, tx, tz) {
    const { w } = this
    const start = this.nearestCell(sx, sz)
    const goal = this.nearestCell(tx, tz)
    if (start < 0 || goal < 0) return null
    const A = this.astar
    const gen = ++A.gen
    const gx = goal % w
    const gz = (goal / w) | 0
    const hfun = (i) => {
      const dx = Math.abs((i % w) - gx)
      const dz = Math.abs(((i / w) | 0) - gz)
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz)
    }
    A.size = 0
    const push = (i) => {
      let k = A.size++
      A.heap[k] = i
      while (k > 0) {
        const p = (k - 1) >> 1
        if (A.f[A.heap[p]] <= A.f[i]) break
        A.heap[k] = A.heap[p]
        A.heap[p] = i
        k = p
      }
    }
    const pop = () => {
      const top = A.heap[0]
      const last = A.heap[--A.size]
      let k = 0
      for (;;) {
        const l = 2 * k + 1
        if (l >= A.size) break
        const rr = l + 1
        const c = rr < A.size && A.f[A.heap[rr]] < A.f[A.heap[l]] ? rr : l
        if (A.f[A.heap[c]] >= A.f[last]) break
        A.heap[k] = A.heap[c]
        k = c
      }
      A.heap[k] = last
      return top
    }
    A.g[start] = 0
    A.f[start] = hfun(start)
    A.mark[start] = gen
    A.from[start] = -1
    push(start)
    let found = false
    let iters = 0
    while (A.size && iters++ < 20000) {
      const i = pop()
      if (A.closed[i] === gen) continue
      A.closed[i] = gen
      if (i === goal) {
        found = true
        break
      }
      const x = i % w
      const z = (i / w) | 0
      for (let oz = -1; oz <= 1; oz++)
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oz) continue
          const j = this.idx(x + ox, z + oz)
          if (!this.canStep(i, j) || A.closed[j] === gen) continue
          if (ox && oz && (!this.canStep(i, this.idx(x + ox, z)) || !this.canStep(i, this.idx(x, z + oz)))) continue
          const ng = A.g[i] + (ox && oz ? 1.414 : 1) + this.cost[j]
          if (A.mark[j] === gen && ng >= A.g[j]) continue
          A.mark[j] = gen
          A.g[j] = ng
          A.f[j] = ng + hfun(j)
          A.from[j] = i
          push(j)
        }
    }
    if (!found) return null
    const cells = []
    for (let i = goal; i >= 0; i = A.from[i]) cells.push(i)
    cells.reverse()
    // Smooth: from each corner, skip ahead to the farthest cell that can be walked to directly.
    const pts = cells.map((i) => [(i % w) + 0.5, ((i / w) | 0) + 0.5])
    const out = [pts[0]]
    let k = 0
    while (k < pts.length - 1) {
      let best = k + 1
      for (let j = Math.min(pts.length - 1, k + 24); j > k + 1; j--)
        if (this.walkLine(pts[k], pts[j])) {
          best = j
          break
        }
      out.push(pts[best])
      k = best
    }
    out[out.length - 1] = [tx, tz]
    return out
  }
  /** Can a bot walk straight from a to b (no wall, no big step, room for its shoulders)? */
  walkLine(a, b) {
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const len = Math.hypot(dx, dz)
    const n = Math.ceil(len / 0.3)
    const px = (-dz / (len || 1)) * 0.38
    const pz = (dx / (len || 1)) * 0.38
    let prev = this.floorAt(a[0], a[1])
    for (let k = 1; k <= n; k++) {
      const x = a[0] + (dx * k) / n
      const z = a[1] + (dz * k) / n
      for (const s of [0, 1, -1]) {
        const j = this.idx(Math.floor(x + px * s), Math.floor(z + pz * s))
        if (j < 0 || !this.walk[j]) return false
      }
      const h = this.floorAt(x, z)
      if (Math.abs(h - prev) > STEP) return false
      prev = h
    }
    return true
  }
}
