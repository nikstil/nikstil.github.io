// The world as the game sees it: the map's columns of solid spans, moving bodies through them,
// tracing bullets and sight lines, and finding paths for the bots (on every floor: Nuke's B site
// is right under A). No rendering here (see render.js).

import { WALL_H, INF, MAXS } from './maps.js'

export const GRAVITY = 20
export const STEP = 0.55 // the highest stair you walk up without jumping
const S = MAXS
const CLEAR = 1.85 // headroom a bot needs to walk somewhere

export class World {
  constructor(map) {
    this.map = map
    this.w = map.w
    this.d = map.d
    this.sb = map.sb
    this.st = map.st
    this.sc = map.sc
    this.smokes = [] // { x, y, z, r, until } (set by the game: smoke blocks sight)
    this.fires = [] // { x, y, z, r, until } (molotovs)
    this.buildCallouts()
    this.buildNav()
  }

  inside(ix, iz) {
    return ix >= 0 && iz >= 0 && ix < this.w && iz < this.d
  }
  /** The top of the highest solid at or below y in a cell (what you'd stand on). */
  floorBelow(ix, iz, y) {
    if (!this.inside(ix, iz)) return -INF
    const i = (iz * this.w + ix) * S
    let best = -INF
    for (let k = 0; k < this.sc[iz * this.w + ix]; k++) {
      const t = this.st[i + k]
      if (t <= y && t > best) best = t
    }
    return best
  }
  /** The bottom of the lowest solid at or above y in a cell (the ceiling). */
  ceilAbove(ix, iz, y) {
    if (!this.inside(ix, iz)) return -INF
    const i = (iz * this.w + ix) * S
    let best = INF
    for (let k = 0; k < this.sc[iz * this.w + ix]; k++) {
      const b = this.sb[i + k]
      if (b >= y && b < best) best = b
    }
    return best
  }
  /** The ground at a point: the highest floor at or below y (default: anything you could stand on). */
  floorAt(x, z, y = 50) {
    return this.floorBelow(Math.floor(x), Math.floor(z), y)
  }
  /** The highest floor under a round footprint, reachable from height y. */
  groundUnder(x, z, r, y = 50) {
    let h = -INF
    for (let iz = Math.floor(z - r); iz <= Math.floor(z + r); iz++) for (let ix = Math.floor(x - r); ix <= Math.floor(x + r); ix++) h = Math.max(h, this.floorBelow(ix, iz, y))
    return h
  }
  ceilOver(x, z, r, y) {
    let c = INF
    for (let iz = Math.floor(z - r); iz <= Math.floor(z + r); iz++) for (let ix = Math.floor(x - r); ix <= Math.floor(x + r); ix++) c = Math.min(c, this.ceilAbove(ix, iz, y))
    return c
  }

  /** Would a body (feet at y, radius r, height h) overlap something solid it can't step onto? */
  blocked(x, y, z, r, h, step) {
    for (let iz = Math.floor(z - r); iz <= Math.floor(z + r); iz++)
      for (let ix = Math.floor(x - r); ix <= Math.floor(x + r); ix++) {
        if (!this.inside(ix, iz)) return true
        const c = iz * this.w + ix
        const i = c * S
        for (let k = 0; k < this.sc[c]; k++) if (this.st[i + k] > y + step + 1e-4 && this.sb[i + k] < y + h - 1e-4) return true
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
    const ground = this.groundUnder(p.x, p.z, b.r, p.y + (b.onGround ? STEP + 0.01 : 0.02))
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
    const top = this.ceilOver(p.x, p.z, b.r, p.y + 0.05)
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
    for (let guard = 0; guard < 800; guard++) {
      const t1 = Math.min(tmx, tmz, maxT)
      const side = () => (axis === 0 ? { t: t0, nx: -sx, ny: 0, nz: 0 } : { t: t0, nx: 0, ny: 0, nz: -sz })
      if (!this.inside(ix, iz)) return t0 > 0 ? side() : null
      const y0 = oy + dy * t0
      const y1 = oy + dy * t1
      const c = iz * this.w + ix
      const base = c * S
      let hit = null
      for (let k = 0; k < this.sc[c]; k++) {
        const b = this.sb[base + k]
        const t = this.st[base + k]
        if (t0 > 0 && y0 > b && y0 < t) return side()
        if (dy < 0 && y0 >= t && y1 < t) {
          const th = (t - oy) / dy
          if (th >= t0 - 1e-6 && (!hit || th < hit.t)) hit = { t: Math.max(th, t0), nx: 0, ny: 1, nz: 0 }
        }
        if (dy > 0 && y0 <= b && y1 > b) {
          const th = (b - oy) / dy
          if (th >= t0 - 1e-6 && (!hit || th < hit.t)) hit = { t: Math.max(th, t0), nx: 0, ny: -1, nz: 0 }
        }
      }
      if (hit) return hit
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
    this.callouts = this.map.callouts
  }
  calloutAt(x, z, y = 0) {
    for (const [name, rr] of this.callouts) if (this.inRect(rr, x, z, y)) return name
    // on top of a crate or a railing, say: the place beside it
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]])
      for (const [name, rr] of this.callouts) if (this.inRect(rr, x + dx, z + dz, y)) return name
    return ''
  }
  inRect(rr, x, z, y = 0) {
    return x >= rr.x0 && x < rr.x1 && z >= rr.z0 && z < rr.z1 && y >= (rr.y0 ?? -INF) && y <= (rr.y1 ?? INF)
  }

  // ================= Navigation =================
  // A node is a place to stand: a cell and one of its spans' tops (with headroom above it).
  buildNav() {
    const { w, d } = this
    const n = w * d * S
    this.walk = new Uint8Array(n)
    this.navH = new Float32Array(n)
    this.navTop = new Float32Array(n) // how high the air goes above it
    this.cost = new Float32Array(n)
    for (let c = 0; c < w * d; c++) {
      for (let k = 0; k < this.sc[c]; k++) {
        const t = this.st[c * S + k]
        if (t >= WALL_H - 0.1) continue
        const above = k + 1 < this.sc[c] ? this.sb[c * S + k + 1] : INF
        if (above - t < CLEAR) continue
        this.walk[c * S + k] = 1
        this.navH[c * S + k] = t
        this.navTop[c * S + k] = above
      }
    }
    // Places beside a wall or a drop cost more, so paths keep off the walls.
    for (let c = 0; c < w * d; c++)
      for (let k = 0; k < S; k++) {
        const node = c * S + k
        if (!this.walk[node]) continue
        const x = c % w
        const z = (c / w) | 0
        let near = 0
        for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) if ((ox || oz) && this.stepTo(node, x + ox, z + oz) < 0) near++
        this.cost[node] = near ? 1.6 : 0
      }
    this.astar = { g: new Float32Array(n), f: new Float32Array(n), from: new Int32Array(n), mark: new Uint32Array(n), closed: new Uint32Array(n), gen: 0, heap: new Int32Array(n * 4), size: 0 }
  }
  /** The node in cell (x, z) you can walk to from `node` (same floor, within a step), or -1. */
  stepTo(node, x, z) {
    if (!this.inside(x, z)) return -1
    const h = this.navH[node]
    const top = this.navTop[node]
    const c = z * this.w + x
    for (let k = 0; k < S; k++) {
      const j = c * S + k
      if (!this.walk[j]) continue
      const h2 = this.navH[j]
      if (Math.abs(h2 - h) > STEP) continue
      if (Math.min(top, this.navTop[j]) - Math.max(h, h2) < CLEAR) continue
      return j
    }
    return -1
  }
  /** The standing place nearest a point (on the floor closest to height y). */
  nearestNode(x, z, y = 50) {
    const cx = Math.floor(x)
    const cz = Math.floor(z)
    for (let rad = 0; rad < 12; rad++) {
      let best = -1
      let bd = Infinity
      for (let oz = -rad; oz <= rad; oz++)
        for (let ox = -rad; ox <= rad; ox++) {
          if (Math.max(Math.abs(ox), Math.abs(oz)) !== rad || !this.inside(cx + ox, cz + oz)) continue
          const c = (cz + oz) * this.w + cx + ox
          for (let k = 0; k < S; k++) {
            const j = c * S + k
            if (!this.walk[j]) continue
            // prefer the floor you're on (at or just under y), then the nearest
            const h = this.navH[j]
            const dy = h <= y + STEP ? y - h : (h - y) * 3
            const dd = dy + (Math.abs(ox) + Math.abs(oz)) * 0.5
            if (dd < bd) {
              bd = dd
              best = j
            }
          }
        }
      if (best >= 0) return best
    }
    return -1
  }
  /** A walking route between two points: a list of [x, z, y] corners (smoothed), or null. */
  path(sx, sz, sy, tx, tz, ty) {
    const { w } = this
    const start = this.nearestNode(sx, sz, sy)
    const goal = this.nearestNode(tx, tz, ty)
    if (start < 0 || goal < 0) return null
    const A = this.astar
    const gen = ++A.gen
    const gc = (goal / S) | 0
    const gx = gc % w
    const gz = (gc / w) | 0
    const gh = this.navH[goal]
    const hfun = (i) => {
      const c = (i / S) | 0
      const dx = Math.abs((c % w) - gx)
      const dz = Math.abs(((c / w) | 0) - gz)
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz) + Math.abs(this.navH[i] - gh) * 0.5
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
    while (A.size && iters++ < 30000) {
      const i = pop()
      if (A.closed[i] === gen) continue
      A.closed[i] = gen
      if (i === goal) {
        found = true
        break
      }
      const c = (i / S) | 0
      const x = c % w
      const z = (c / w) | 0
      for (let oz = -1; oz <= 1; oz++)
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oz) continue
          const j = this.stepTo(i, x + ox, z + oz)
          if (j < 0 || A.closed[j] === gen) continue
          if (ox && oz && (this.stepTo(i, x + ox, z) < 0 || this.stepTo(i, x, z + oz) < 0)) continue
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
    const nodes = []
    for (let i = goal; i >= 0; i = A.from[i]) nodes.push(i)
    nodes.reverse()
    const pts = nodes.map((i) => {
      const c = (i / S) | 0
      return [(c % w) + 0.5, ((c / w) | 0) + 0.5, this.navH[i]]
    })
    // Smooth: from each corner, skip ahead to the farthest point that can be walked to directly.
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
    out[out.length - 1] = [tx, tz, pts[pts.length - 1][2]]
    return out
  }
  /** Can a bot walk straight from a to b (no wall, no big step or drop, room for its shoulders)? */
  walkLine(a, b) {
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const len = Math.hypot(dx, dz)
    const n = Math.ceil(len / 0.3)
    const px = (-dz / (len || 1)) * 0.38
    const pz = (dx / (len || 1)) * 0.38
    let y = a[2]
    for (let k = 1; k <= n; k++) {
      const x = a[0] + (dx * k) / n
      const z = a[1] + (dz * k) / n
      let h = -INF
      for (const s of [0, 1, -1]) {
        const ix = Math.floor(x + px * s)
        const iz = Math.floor(z + pz * s)
        const f = this.floorBelow(ix, iz, y + STEP)
        if (y - f > STEP || this.ceilAbove(ix, iz, f + 0.01) - f < CLEAR || f >= WALL_H - 0.1) return false
        if (s === 0) h = f
      }
      y = h
    }
    return Math.abs(y - b[2]) <= STEP
  }
}
