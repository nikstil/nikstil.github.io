// Zombies, the way Black Ops 2 plays it: you (and up to three others, people or bots) hold out
// against endless rounds of the undead. Every hit and kill earns points; points buy guns off the
// walls, a spin of the Mystery Box, perks from the machines (once someone turns the power on) and,
// right at the far end of the map, the Pack-a-Punch. Now and then a zombie drops a power-up. Go
// down and a teammate can revive you (on your own, only Quick Revive can); when nobody's left
// standing, it's game over.
//
// The zombies are actors like anyone else (on the T side), so moving, getting shot and the online
// game all work as they do in a match; this file is the rules, the zombies' and the bots' brains,
// and where everything on the map goes.

import { WEAPONS, applyDamage } from './weapons.js'
import { MAXS as S } from './maps.js'
import { STEP } from './world.js'
import { Brain } from './bots.js'
import { eyeOf, headOf, chestOf, weaponOf, dirOf } from './game.js'

export const ZOMBIE_SLOTS = 24 // the most on the map at once
export const MAX_PERKS = 4
const HIT = 50 // a zombie's swipe
const BLEED = 30 // seconds down before you bleed out
const REVIVE = 3 // seconds to revive someone (half with Quick Revive)
const SOLO_REVIVE = 8 // on your own with Quick Revive, you get yourself up after this
const BOX = 950
const PAP = 5000
const START_POINTS = 500

export const PERKS = {
  jug: { name: 'Juggernog', price: 2500, color: '#c92a2a', glow: '#ff5a4a', what: 'Takes a lot more to put you down' },
  speed: { name: 'Speed Cola', price: 3000, color: '#2f9e44', glow: '#6cff8a', what: 'Reload twice as fast' },
  tap: { name: 'Double Tap Root Beer', price: 2000, color: '#c77a26', glow: '#ffb15a', what: 'Fire faster, every bullet counts double' },
  revive: { name: 'Quick Revive', price: 1500, color: '#4aa3d8', glow: '#9fe0ff', what: 'Revive faster (on your own: get yourself back up)' },
  stamin: { name: 'Stamin-Up', price: 2000, color: '#e0a526', glow: '#ffe066', what: 'Move faster' },
}
export const PERK_LIST = Object.keys(PERKS)
export const POWERUPS = {
  ammo: { name: 'Max Ammo', what: 'Everyone’s guns refilled' },
  insta: { name: 'Insta-Kill', what: 'One hit kills, for 30 seconds' },
  double: { name: 'Double Points', what: 'Double points, for 30 seconds' },
  nuke: { name: 'Kaboom!', what: 'Every zombie on the map, gone' },
  sale: { name: 'Fire Sale', what: 'The Mystery Box costs 10, for 30 seconds' },
}
// Guns on the walls, cheapest nearest the start; the rest are in the box.
const WALL = [['p250', 500], ['nova', 500], ['mp7', 1000], ['mp5', 1000], ['ump45', 1200], ['m4a4', 1200], ['mag7', 1500], ['galil', 1500]]
const BOX_GUNS = ['raygun', 'raygun', 'deagle', 'r8', 'cz75', 'dualies', 'fiveseven', 'tec9', 'mac10', 'mp9', 'p90', 'bizon', 'xm1014', 'sawedoff', 'm249', 'negev', 'ak47', 'm4a1s', 'sg553', 'aug', 'famas', 'awp', 'ssg08', 'g3sg1', 'scar20']
// Pack-a-Punched names, by kind
const PAP_NAMES = { pistol: ['Mustang & Sally', 'The Krauss Refibrillator', 'Kiparisov'], smg: ['The Mp115 Kollider', 'Vice-Grip', 'Wasp Stinger'], heavy: ['Mesmerizer', 'Typhoid Mary', 'Predictive Death Machine'], rifle: ['Skullcrusher', 'The Afterburner', 'Dystopic Demolisher'], sniper: ['D115 Disassembler', 'Penetrator', 'Wrath of the Ancients'], ray: ['Porter’s X2 Ray Gun'] }
export const papName = (id) => {
  const w = WEAPONS[id]
  const list = PAP_NAMES[id === 'raygun' ? 'ray' : w?.kind] ?? PAP_NAMES.rifle
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return list[h % list.length]
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const angleTo = (from, to) => ({ yaw: Math.atan2(-(to.x - from.x), -(to.z - from.z)), pitch: Math.atan2(to.y - from.y, Math.hypot(to.x - from.x, to.z - from.z)) })
function seeded(str) {
  let s = 2166136261
  for (const ch of str) s = Math.imul(s ^ ch.charCodeAt(0), 16777619) >>> 0
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296)
}
/** How much ammo a gun carries here (more than in a match: the rounds are long). */
export const zReserve = (id, pap = false) => {
  const w = WEAPONS[id]
  return Math.round(Math.max(w.reserve, w.mag * 5) * (pap ? 1.6 : 1))
}
export const zMag = (id, pap = false) => (pap ? Math.round(WEAPONS[id].mag * 1.5) : WEAPONS[id].mag)
const zGun = (id, skin = null, pap = false) => ({ id, clip: zMag(id, pap), reserve: zReserve(id, pap), silenced: !!WEAPONS[id].silenced, burst: false, skin, pap: pap || undefined, mag: pap ? zMag(id, true) : undefined })

/** Zombies in a round (Black Ops' own sums), for this many players. */
export function zombiesIn(round, players) {
  let mult = Math.max(1, round / 5)
  if (round >= 10) mult *= round * 0.15
  let max = 24 + (players === 1 ? Math.floor(3 * mult) : Math.floor((players - 1) * 6 * mult))
  if (round < 6) max = Math.floor(max * [0.25, 0.3, 0.5, 0.7, 0.9][round - 1])
  return Math.max(1, max)
}
/**
 * A zombie's health in a round: Black Ops' (+100 a round, then 10% a round from round 10), scaled
 * to the guns here (CS numbers: about a third of Black Ops' per bullet, and four times on the head).
 */
export function zombieHealth(round) {
  const bo = round < 10 ? 150 + 100 * (round - 1) : 950 * Math.pow(1.1, round - 9)
  return Math.round(bo * 0.65)
}

export class Zombies {
  constructor(g) {
    this.g = g
    this.round = 0
    this.state = 'start' // start (before round 1), round, break (between rounds), over
    this.next = 0
    this.toSpawn = 0
    this.spawnAt = 0
    this.drops = [] // power-ups on the floor: { id, type, x, y, z, until }
    this.timers = { insta: 0, double: 0, sale: 0 }
    this.dropsThisRound = 0
    this.bag = []
    this.power = false
    this.box = { spot: 0, state: 'idle', until: 0, gun: null, by: -1, uses: 0 }
    this.pap = { state: 'idle', by: -1, gun: null, until: 0 }
    this.soloRevives = 0
    this.fieldAt = -1
    this.groanAt = 0
    this.buildGraph()
    this.place()
  }
  get survivors() {
    return this.g.actors.filter((a) => !a.zombie)
  }
  get zombies() {
    return this.g.actors.filter((a) => a.zombie)
  }
  get solo() {
    return this.survivors.length === 1
  }

  // ================= The zombies' map of the map =================
  /**
   * Every standing place and the moves between them: walk (a step or less), jump up (to 1.3 m),
   * drop down (any height), climb a ladder. Kept both ways round, for the flow field.
   */
  buildGraph() {
    const w = this.g.world
    const m = this.g.map
    const N = w.walk.length
    const id = new Int32Array(N).fill(-1)
    const nodes = []
    for (let i = 0; i < N; i++) if (w.walk[i]) id[i] = nodes.push(i) - 1
    const n = nodes.length
    const out = Array.from({ length: n }, () => [])
    const solidAt = (x, z, y) => {
      if (!w.inside(x, z)) return true
      const c = z * m.w + x
      for (let k = 0; k < m.sc[c]; k++) if (y > m.sb[c * S + k] && y < m.st[c * S + k]) return true
      return false
    }
    for (let u = 0; u < n; u++) {
      const i = nodes[u]
      const c = (i / S) | 0
      const x = c % m.w
      const z = (c / m.w) | 0
      const h = w.navH[i]
      const top = w.navTop[i]
      for (let oz = -1; oz <= 1; oz++)
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oz) continue
          if (!w.inside(x + ox, z + oz)) continue
          const c2 = (z + oz) * m.w + x + ox
          for (let k = 0; k < S; k++) {
            const j = c2 * S + k
            if (!w.walk[j]) continue
            const h2 = w.navH[j]
            const top2 = w.navTop[j]
            const dh = h2 - h
            const diag = ox && oz
            let kind = -1
            let cost = diag ? 1.414 : 1
            if (Math.abs(dh) <= STEP) {
              if (Math.min(top, top2) - Math.max(h, h2) < 1.85) continue
              if (diag && (w.stepTo(i, x + ox, z) < 0 || w.stepTo(i, x, z + oz) < 0)) continue
              kind = 0
              cost += w.cost[j] * 0.5
            } else if (diag) continue
            else if (dh > 0 && dh <= 1.3) {
              if (top - h2 < 1.9 || top2 - h2 < 1.85) continue
              kind = 1
              cost += 2
            } else if (dh < 0) {
              if (top2 < h + 1.0 || solidAt(x + ox, z + oz, h + 0.9)) continue
              kind = 2
              cost += 0.5 + Math.min(4, -dh * 0.2)
            } else continue
            out[u].push(id[j], cost, kind)
          }
        }
      for (const { j, cost } of w.links.get(i) ?? []) if (id[j] >= 0) out[u].push(id[j], cost, 3)
    }
    // packed: forward and reverse edge lists
    const pack = (lists) => {
      const start = new Int32Array(n + 1)
      for (let u = 0; u < n; u++) start[u + 1] = start[u] + lists[u].length / 3
      const to = new Int32Array(start[n])
      const cost = new Float32Array(start[n])
      const kind = new Uint8Array(start[n])
      for (let u = 0; u < n; u++) {
        const l = lists[u]
        for (let e = 0; e < l.length; e += 3) {
          const k = start[u] + e / 3
          to[k] = l[e]
          cost[k] = l[e + 1]
          kind[k] = l[e + 2]
        }
      }
      return { start, to, cost, kind }
    }
    const inn = Array.from({ length: n }, () => [])
    for (let u = 0; u < n; u++) for (let e = 0; e < out[u].length; e += 3) inn[out[u][e]].push(u, out[u][e + 1], out[u][e + 2])
    this.nodes = nodes
    this.idOf = id
    this.fwd = pack(out)
    this.rev = pack(inn)
    this.dist = new Float32Array(n).fill(Infinity)
    this.heap = new Int32Array(Math.max(16, this.fwd.to.length + n))
    this.hkey = new Float32Array(this.heap.length)
  }
  /** The graph node someone's standing on (or nearest), or -1. */
  nodeOf(p) {
    const i = this.g.world.nearestNode(p.x, p.z, p.y + 0.5)
    return i < 0 ? -1 : this.idOf[i]
  }
  nodePos(u) {
    const i = this.nodes[u]
    const c = (i / S) | 0
    return { x: (c % this.g.map.w) + 0.5, y: this.g.world.navH[i], z: ((c / this.g.map.w) | 0) + 0.5 }
  }
  /** Shortest distances from the sources (to them, with rev; from them, with fwd) into `dist`. */
  dijkstra(sources, graph, dist) {
    dist.fill(Infinity)
    const heap = this.heap
    const key = this.hkey
    let size = 0
    const push = (u, d) => {
      let k = size++
      while (k > 0) {
        const p = (k - 1) >> 1
        if (key[p] <= d) break
        heap[k] = heap[p]
        key[k] = key[p]
        k = p
      }
      heap[k] = u
      key[k] = d
    }
    let popped = 0
    const pop = () => {
      const top = heap[0]
      popped = key[0]
      const lu = heap[--size]
      const ld = key[size]
      let k = 0
      for (;;) {
        const l = 2 * k + 1
        if (l >= size) break
        const r = l + 1
        const c = r < size && key[r] < key[l] ? r : l
        if (key[c] >= ld) break
        heap[k] = heap[c]
        key[k] = key[c]
        k = c
      }
      heap[k] = lu
      key[k] = ld
      return top
    }
    for (const u of sources) {
      if (u < 0 || dist[u] === 0) continue
      dist[u] = 0
      push(u, 0)
    }
    while (size) {
      const u = pop()
      const d = popped
      if (d > dist[u]) continue
      for (let e = graph.start[u]; e < graph.start[u + 1]; e++) {
        const v = graph.to[e]
        const nd = d + graph.cost[e]
        if (nd < dist[v] && size < heap.length) {
          dist[v] = nd
          push(v, nd)
        }
      }
    }
    return dist
  }
  /** Where each zombie should head: the way down this field leads to the nearest survivor standing. */
  updateField() {
    const src = []
    for (const a of this.survivors) if (a.alive && !a.down) src.push(this.nodeOf(a.pos))
    this.targets = src
    this.dijkstra(src, this.rev, this.dist)
  }
  /** The best next move from node u: { v, kind } (or null: nowhere better). */
  stepFrom(u) {
    const f = this.fwd
    let best = null
    let bd = Infinity
    const here = this.dist[u]
    for (let e = f.start[u]; e < f.start[u + 1]; e++) {
      const v = f.to[e]
      if (!(this.dist[v] < here)) continue
      const d = f.cost[e] + this.dist[v]
      if (d < bd) {
        bd = d
        best = { v: f.to[e], kind: f.kind[e] }
      }
    }
    return best
  }

  // ================= Where everything goes =================
  /**
   * The same places every time on a map: Quick Revive and the cheap guns near the start, the box
   * a little further, the other perks and better guns further still, the power switch well out,
   * and the Pack-a-Punch about as far as you can get. Each against a wall.
   */
  place() {
    const g = this.g
    const w = g.world
    const m = g.map
    const rand = seeded(m.id ?? m.name ?? 'map')
    const n = this.nodes.length
    const spawnNodes = m.spawns.CT.map((p) => this.idOf[w.nearestNode(p[0] + 0.5, p[1] + 0.5, p[2] == null ? 50 : p[2] + 1)] ?? -1).filter((u) => u >= 0)
    this.spawnNodes = spawnNodes
    const from = this.dijkstra(spawnNodes, this.fwd, new Float32Array(n))
    const back = this.dijkstra(spawnNodes, this.rev, new Float32Array(n))
    this.home = from
    // spots: a standing place with room around it and a wall right behind
    const solidCol = (x, z, y0, y1) => {
      if (!w.inside(x, z)) return true
      const c = z * m.w + x
      for (let k = 0; k < m.sc[c]; k++) if (m.sb[c * S + k] < y0 && m.st[c * S + k] > y1) return true
      return false
    }
    const spots = []
    for (let u = 0; u < n; u++) {
      if (!isFinite(from[u]) || !isFinite(back[u])) continue
      const i = this.nodes[u]
      const c = (i / S) | 0
      const x = c % m.w
      const z = (c / m.w) | 0
      const h = w.navH[i]
      if (w.navTop[i] - h < 2.6 || w.ladderAt({ x: x + 0.5, y: h, z: z + 0.5 }, 0.6)) continue
      // a wall on exactly one side, open on the other three (not in a doorway or a narrow alley)
      const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => solidCol(x + dx, z + dz, h + 0.2, h + 2.4))
      if (sides.length !== 1) continue
      const [dx, dz] = sides[0]
      let open = true
      for (const [ex, ez] of [[-dx, -dz], [dz, dx], [-dz, -dx], [-dx + dz, -dz + dx], [-dx - dz, -dz - dx]]) if (w.stepTo(i, x + ex, z + ez) < 0) open = false
      if (!open) continue
      spots.push({ u, x: x + 0.5, y: h, z: z + 0.5, wall: [dx, dz], d: from[u], yaw: Math.atan2(dx, dz) })
    }
    spots.sort((a, b) => a.d - b.d)
    const far = spots.length ? spots[spots.length - 1].d : 1
    const taken = []
    const take = (q0, q1, gap = 7) => {
      // a spot between those fractions of the way out, not too near anything else
      const lo = q0 * far
      const hi = q1 * far
      const cands = spots.filter((s) => s.d >= lo && s.d <= hi && taken.every((t) => Math.hypot(t.x - s.x, t.z - s.z) > gap || Math.abs(t.y - s.y) > 2.5))
      const pool = cands.length ? cands : spots.filter((s) => taken.every((t) => Math.hypot(t.x - s.x, t.z - s.z) > 3))
      if (!pool.length) return null
      const s = pool[Math.floor(rand() * pool.length)]
      taken.push(s)
      return s
    }
    const st = []
    const add = (kind, s, extra) => s && st.push({ kind, x: s.x, y: s.y, z: s.z, yaw: s.yaw, wall: s.wall, u: s.u, ...extra })
    add('perk', take(0.02, 0.18), { perk: 'revive' })
    WALL.forEach(([gun, price], k) => add('wall', take(0.02 + k * 0.1, 0.16 + k * 0.11), { gun, price }))
    this.boxSpots = []
    for (const [q0, q1] of [[0.08, 0.3], [0.3, 0.55], [0.5, 0.8], [0.7, 1]]) {
      const s = take(q0, q1, 9)
      if (s) this.boxSpots.push({ x: s.x, y: s.y, z: s.z, yaw: s.yaw, wall: s.wall, u: s.u })
    }
    add('perk', take(0.25, 0.5), { perk: 'jug' })
    add('perk', take(0.35, 0.65), { perk: 'speed' })
    add('perk', take(0.45, 0.75), { perk: 'tap' })
    add('perk', take(0.3, 0.7), { perk: 'stamin' })
    add('power', take(0.55, 0.8))
    add('pap', take(0.85, 1, 4))
    st.forEach((s, k) => (s.id = k))
    this.stations = st
    this.box.spot = 0
    // where zombies come up out of the ground: every few metres, anywhere a survivor can get to
    this.risers = []
    for (let u = 0; u < n; u++) {
      if (!isFinite(back[u])) continue
      const p = this.nodePos(u)
      if ((Math.floor(p.x) + Math.floor(p.z) * 7) % 5) continue
      if (w.navTop[this.nodes[u]] - p.y < 2.2) continue
      this.risers.push(u)
    }
  }
  get boxAt() {
    return this.boxSpots[this.box.spot] ?? this.boxSpots[0]
  }
  /**
   * The machines are solid: their footprints, as circles { x, z, y, r } (the box's moves with it).
   * Perk machines and the power switch sit against the wall; the box and the Pack-a-Punch are long.
   */
  solids() {
    const out = []
    const along = (s, back, half, r) => {
      const [dx, dz] = s.wall
      const cx = s.x + dx * back
      const cz = s.z + dz * back
      // (the long side runs along the wall)
      for (const k of half ? [-half, 0, half] : [0]) out.push({ x: cx + dz * k, z: cz - dx * k, y: s.y, r })
    }
    for (const s of this.stations) {
      if (s.kind === 'perk' && !(s.perk === 'revive' && this.solo && this.soloRevives >= 3)) along(s, 0.12, 0, 0.5)
      else if (s.kind === 'pap') along(s, 0.0, 0.55, 0.5)
    }
    const b = this.boxAt
    if (b && this.box.state !== 'away') along(b, 0.15, 0.5, 0.32)
    return out
  }
  /** Keeps a body out of the machines (after it moves). */
  collide(a) {
    for (const c of (this.solidList ??= this.solids())) {
      if (Math.abs(a.pos.y - c.y) > 1.5) continue
      const dx = a.pos.x - c.x
      const dz = a.pos.z - c.z
      const d = Math.hypot(dx, dz)
      const min = c.r + a.r * 0.8
      if (d >= min) continue
      const k = d > 1e-4 ? (min - d) / d : 0
      const nx = a.pos.x + (d > 1e-4 ? dx * k : min)
      const nz = a.pos.z + dz * k
      if (!this.g.world.blocked(nx, a.pos.y, nz, a.r, a.h, 0.55)) {
        a.pos.x = nx
        a.pos.z = nz
      }
    }
  }

  // ================= The game =================
  /** Everyone in at the start, the first round in a few seconds. */
  start() {
    const g = this.g
    const w = g.world
    const spawns = g.map.spawns.CT
    let k = 0
    for (const a of g.actors) {
      a.vel.x = a.vel.y = a.vel.z = 0
      a.pitch = 0
      if (a.zombie) {
        a.alive = false
        a.hp = 0
        a.inv = { primary: null, pistol: null, knife: null, grenades: [], bomb: false, zeus: null }
        a.active = 'knife'
        a.pos.x = a.pos.z = -100
        a.pos.y = -100
        continue
      }
      const [sx, sz, sy] = spawns[k++ % spawns.length]
      a.pos.x = sx + 0.5
      a.pos.z = sz + 0.5
      a.pos.y = w.floorAt(a.pos.x, a.pos.z, sy == null ? 50 : sy + 1)
      a.yaw = Math.atan2(-(g.map.w / 2 - a.pos.x), -(g.map.d / 2 - a.pos.z))
      this.outfit(a, true)
      a.money = START_POINTS
    }
    g.phase = 'freeze'
    g.phaseEnd = g.time + 3
    g.roundStart = g.time
    this.state = 'start'
    this.next = g.time + 3
    this.updateField()
  }
  /** A fresh survivor: the starting pistol, a knife, two grenades, no perks. */
  outfit(a, first = false) {
    const g = this.g
    a.alive = true
    a.down = false
    a.hp = 100
    a.armor = 0
    a.helmet = false
    a.perks = {}
    this.applyPerks(a)
    a.spawnSeq = (a.spawnSeq ?? 0) + 1
    a.inv = { primary: null, pistol: zGun('p2000', g.skinFor?.(a, 'p2000') ?? null), knife: { id: 'knife', skin: g.skinFor?.(a, 'knife') ?? null }, grenades: ['he', 'he'], bomb: false, zeus: null }
    a.active = 'pistol'
    a.reloadEnd = a.switchEnd = a.nextFire = 0
    a.crouch = 0
    a.crouching = false
    if (!first) a.protectUntil = g.time + 2
  }
  applyPerks(a) {
    const p = a.perks ?? {}
    a.maxHp = p.jug ? 250 : 100
    a.reloadMul = p.speed ? 0.5 : 1
    a.rateMul = p.tap ? 1.33 : 1
    a.speedMul = p.stamin ? 1.12 : 1
  }
  startRound() {
    const g = this.g
    this.round++
    this.state = 'round'
    const players = this.survivors.length
    this.toSpawn = zombiesIn(this.round, players)
    this.spawnGap = Math.max(0.35, 2 * Math.pow(0.95, this.round - 1))
    this.spawnAt = g.time + 1.5
    this.dropsThisRound = 0
    g.phase = 'live'
    g.phaseEnd = Infinity
    g.round = this.round
    // anyone who bled out last round is back, with a pistol; everyone gets two more grenades
    for (const a of this.survivors) {
      if (!a.alive) {
        const pts = a.money
        this.outfit(a)
        a.money = pts
        const at = this.survivors.find((b) => b.alive && b !== a) ?? a
        a.pos.x = at.pos.x
        a.pos.y = at.pos.y
        a.pos.z = at.pos.z
        g.emit('respawn', { a })
      } else if (!a.down) while (a.inv.grenades.filter((x) => x === 'he').length < 4 && a.inv.grenades.length < 4) a.inv.grenades.push('he')
    }
    g.emit('zround', { round: this.round })
    g.sound('zroundStart', null, {})
  }
  endRound() {
    const g = this.g
    this.state = 'break'
    this.next = g.time + (this.round === 1 ? 8 : 10)
    g.emit('zroundEnd', { round: this.round })
    g.sound('zroundEnd', null, {})
    for (const a of this.survivors) a.brain?.roundOver?.()
  }
  gameOver() {
    const g = this.g
    if (this.state === 'over') return
    this.state = 'over'
    g.phase = 'over'
    g.winner = 'T'
    g.emit('zover', { round: this.round })
    g.emit('roundEnd', { winner: 'T', reason: 'zombies', mvp: null, over: true })
  }

  // ================= Zombies =================
  spawnZombie() {
    const g = this.g
    const z = this.zombies.find((a) => !a.alive && g.time - (a.deadAt ?? -9) > 1.2)
    if (!z) return false
    const eyes = this.survivors.filter((a) => a.alive).map((a) => eyeOf(a))
    let pick = -1
    for (const [lo, hi] of [[12, 40], [8, 70], [5, 400]]) {
      const cands = this.risers.filter((u) => this.dist[u] >= lo && this.dist[u] <= hi)
      for (let t = 0; t < 14 && cands.length; t++) {
        const u = cands[Math.floor(Math.random() * cands.length)]
        const p = this.nodePos(u)
        const head = { x: p.x, y: p.y + 1.6, z: p.z }
        if (lo < 8 || eyes.every((e) => Math.hypot(e.x - p.x, e.z - p.z) > 9 && !g.world.sees(e, head, false))) {
          pick = u
          break
        }
      }
      if (pick >= 0) break
    }
    if (pick < 0) return false
    const p = this.nodePos(pick)
    z.pos.x = p.x + (Math.random() - 0.5) * 0.4
    z.pos.z = p.z + (Math.random() - 0.5) * 0.4
    z.pos.y = p.y
    z.vel.x = z.vel.y = z.vel.z = 0
    z.alive = true
    z.hp = z.maxHp = zombieHealth(this.round)
    z.yaw = Math.random() * Math.PI * 2
    z.crouch = 0
    z.crouching = false
    z.onGround = true
    z.spawnSeq = (z.spawnSeq ?? 0) + 1
    z.zRise = g.time + 1.1
    z.zSwing = 0
    z.zNextSwing = 0
    z.damageBy = {}
    // walkers early on; runners, then sprinters, as the rounds go up
    const r = this.round
    const pSprint = r <= 3 ? 0 : clamp((r - 3) * 0.1, 0, 0.8)
    const pRun = r <= 1 ? 0 : clamp((r - 1) * 0.25, 0, 1 - pSprint)
    const roll = Math.random()
    z.zSpeed = roll < pSprint ? 4.7 + Math.random() * 0.4 : roll < pSprint + pRun ? 3.0 + Math.random() * 0.5 : 1.4 + Math.random() * 0.4
    z.brain.reset()
    g.emit('zrise', { a: z })
    g.sound('zrise', { x: z.pos.x, y: z.pos.y, z: z.pos.z }, { range: 25 })
    return true
  }
  /** A zombie's swipe lands. */
  swipe(z, t) {
    const g = this.g
    if (!t.alive || t.down || this.state === 'over') return
    if (t.protectUntil > g.time) return
    g.sound('zhit', eyeOf(t), { range: 15, who: t })
    this.hurt(t, HIT, z, 'zombie', chestOf(t), dirOf(z.yaw, 0))
  }
  /** Damage to a survivor: down at zero (or straight out). */
  hurt(a, dmg, by, weaponId, at = null, dir = null) {
    const g = this.g
    if (!a.alive || a.down || this.state === 'over') return
    a.hp -= dmg
    a.zHurtAt = g.time
    a.slowUntil = g.time + 0.25
    a.punch.pitch += 0.05
    g.emit('hit', { victim: a, attacker: by, dmg, part: 'chest', at, dir, weaponId })
    if (a.hp <= 0) this.goDown(a)
  }
  goDown(a) {
    const g = this.g
    a.hp = 0
    a.down = true
    a.downAt = g.time
    a.bleedAt = g.time + BLEED
    a.deaths++
    a.reviving = null
    a.revivedBy = null
    a.reviveProg = 0
    a.money = Math.floor(a.money * 0.95)
    const solo = this.solo
    a.selfRevive = solo && a.perks.revive && this.soloRevives < 3
    a.perks = {}
    this.applyPerks(a)
    // last stand: a pistol out (theirs, or one for the floor)
    a.reloadEnd = 0
    a.ads = 0
    a.scope = 0
    const slot = ['pistol', 'primary'].find((s) => a.inv[s] && WEAPONS[a.inv[s].id]?.kind === 'pistol')
    if (slot) {
      a.active = slot
      const s = a.inv[slot]
      const mag = s.mag ?? WEAPONS[s.id].mag
      if (s.reserve < mag) s.reserve = mag * 2
    } else {
      a.lastStand = a.inv.pistol
      a.inv.pistol = zGun('p2000')
      a.active = 'pistol'
    }
    a.switchEnd = g.time + 0.6
    a.crouching = true
    g.emit('zdown', { a, self: !!a.selfRevive })
    g.sound('zdown', null, { who: a })
    if (!this.survivors.some((b) => b.alive && !b.down) && !a.selfRevive) this.gameOver()
  }
  getUp(a, by = null) {
    const g = this.g
    a.down = false
    a.hp = 100
    a.crouching = false
    a.reviving = null
    a.revivedBy = null
    a.reviveProg = 0
    a.protectUntil = g.time + 1.5
    a.zHurtAt = g.time
    if (a.lastStand !== undefined) {
      a.inv.pistol = a.lastStand
      a.lastStand = undefined
      if (!a.inv.pistol && a.active === 'pistol') a.active = a.inv.primary ? 'primary' : 'knife'
    }
    if (a.selfRevive) {
      this.soloRevives++
      a.selfRevive = false
      this.solidList = null
    }
    if (by) by.assists++
    g.emit('zrevive', { a, by })
    g.sound('zrevive', null, { who: a })
  }
  bleedOut(a) {
    const g = this.g
    a.down = false
    a.alive = false
    a.hp = 0
    a.deadAt = g.time
    a.lastStand = undefined
    g.emit('zdead', { a })
    if (!this.survivors.some((b) => b.alive)) this.gameOver()
  }
  /** Game.damage, when it's this mode: points for hurting zombies; survivors go down. */
  damage(victim, attacker, raw, pen, part, weaponId, at, dir) {
    const g = this.g
    if (!victim.alive) return
    if (!victim.zombie) {
      // their own grenade, a fall, the Ray Gun's splash (no friendly bullets)
      if (attacker && !attacker.zombie && attacker !== victim) return
      if (victim.protectUntil > g.time && weaponId !== 'fall') return
      this.hurt(victim, Math.round(weaponId === 'fall' ? raw : raw * (victim.perks?.jug ? 0.6 : 1)), attacker, weaponId, at, dir)
      return
    }
    if (g.time < (victim.zRise ?? 0) - 0.6) return // still under the ground
    let dmg = applyDamage(victim, raw, pen, part).dmg
    const by = attacker && !attacker.zombie ? attacker : null
    if (by) {
      const s = by.inv[by.active]
      if (weaponId === 'knife') dmg = Math.max(dmg, 150) * (s?.pap ? 2 : 1)
      else if (WEAPONS[weaponId]?.mag) {
        if (s?.pap) dmg *= 2
        if (by.perks?.tap) dmg *= 2
      }
    }
    if (by && g.time < this.timers.insta) dmg = victim.hp
    dmg = Math.round(dmg)
    const kill = dmg >= victim.hp
    victim.hp -= dmg
    if (by) {
      victim.damageBy[by.id] = (victim.damageBy[by.id] ?? 0) + dmg
      if (!kill) this.points(by, 10)
    }
    victim.slowUntil = g.time + 0.2
    g.emit('hit', { victim, attacker, dmg, part, at, dir, weaponId })
    if (at) g.sound('hit', at, { range: 25, who: attacker })
    if (victim.hp <= 0) this.zombieDied(victim, by, weaponId, part === 'head')
  }
  points(a, n) {
    if (!a || a.zombie) return
    const k = this.g.time < this.timers.double ? 2 : 1
    a.money += n * k
    this.g.emit('zpoints', { a, n: n * k })
  }
  zombieDied(z, by, weaponId, headshot, quiet = false) {
    const g = this.g
    z.alive = false
    z.hp = 0
    z.deadAt = g.time
    z.zSwing = 0
    if (by && !quiet) {
      by.kills++
      if (headshot) by.mvps++
      this.points(by, weaponId === 'knife' ? 130 : headshot ? 100 : 60)
    }
    g.emit('zkill', { victim: z, attacker: by, weaponId, headshot })
    if (!quiet) g.sound('zdie', { x: z.pos.x, y: z.pos.y + 1, z: z.pos.z }, { range: 25 })
    // a power-up now and then (four a round at most)
    if (!quiet && this.dropsThisRound < 4 && Math.random() < 0.03) this.dropPowerUp(z.pos)
  }
  dropPowerUp(p) {
    const g = this.g
    if (!this.bag.length) this.bag = Object.keys(POWERUPS).sort(() => Math.random() - 0.5)
    const type = this.bag.pop()
    this.dropsThisRound++
    const y = g.world.groundUnder(p.x, p.z, 0.1, p.y + 0.5)
    this.drops.push({ id: Math.random(), type, x: p.x, y, z: p.z, until: g.time + 26 })
    g.emit('zdrop', { type })
    g.sound('zdrop', { x: p.x, y: y + 1, z: p.z }, { range: 30 })
  }
  powerUp(d, a) {
    const g = this.g
    const now = g.time
    if (d.type === 'ammo') {
      for (const b of this.survivors) {
        if (!b.alive) continue
        for (const s of ['primary', 'pistol']) {
          const sl = b.inv[s]
          if (sl && WEAPONS[sl.id]?.mag) sl.reserve = zReserve(sl.id, sl.pap)
        }
        while (b.inv.grenades.length < 4) b.inv.grenades.push('he')
      }
    } else if (d.type === 'insta') this.timers.insta = now + 30
    else if (d.type === 'double') this.timers.double = now + 30
    else if (d.type === 'sale') this.timers.sale = now + 30
    else if (d.type === 'nuke') {
      for (const z of this.zombies) if (z.alive) this.zombieDied(z, null, 'nuke', false, true)
      for (const b of this.survivors) if (b.alive) this.points(b, 400)
    }
    g.emit('zpowerup', { type: d.type, a })
    g.sound(d.type === 'nuke' ? 'boom' : 'zpowerup', null, {})
  }

  // ================= Using things =================
  /** What's in front of `a` to use (the nearest within reach), or null. */
  usable(a) {
    if (!a.alive) return null
    let best = null
    let bd = 1.9
    const near = (p, r = bd) => {
      const d = Math.hypot(p.x - a.pos.x, p.z - a.pos.z)
      return d < r && Math.abs(p.y - a.pos.y) < 1.6 ? d : null
    }
    // a teammate to revive first
    for (const b of this.survivors) {
      if (b === a || !b.down || !b.alive) continue
      const d = near(b.pos, 1.7)
      if (d != null) return { kind: 'revive', b }
    }
    if (a.down) return null
    for (const s of this.stations) {
      if (s.kind === 'perk' && s.perk === 'revive' && this.solo && this.soloRevives >= 3) continue
      const d = near(s)
      if (d != null && d < bd) {
        bd = d
        best = s
      }
    }
    const bx = this.boxAt
    if (bx && this.box.state !== 'away') {
      const d = near(bx)
      if (d != null && d < bd) best = { kind: 'box', x: bx.x, y: bx.y, z: bx.z }
    }
    return best
  }
  /** What the HUD says about it: "Hold [E] for ..." (null: nothing here). */
  prompt(a) {
    const s = this.usable(a)
    if (!s) return null
    const g = this.g
    const cash = a.money
    if (s.kind === 'revive') return { text: `Hold [E] to revive ${s.b.name}`, ok: true }
    if (s.kind === 'wall') {
      const have = ['primary', 'pistol'].find((k) => a.inv[k]?.id === s.gun)
      const ammo = have ? (a.inv[have].pap ? 4500 : Math.round(s.price / 2)) : 0
      return have ? { text: `Hold [E] for ${WEAPONS[s.gun].name} ammo [Cost: ${ammo}]`, ok: cash >= ammo } : { text: `Hold [E] for ${WEAPONS[s.gun].name} [Cost: ${s.price}]`, ok: cash >= s.price }
    }
    if (s.kind === 'perk') {
      const p = PERKS[s.perk]
      if (s.perk !== 'revive' && !this.power) return { text: 'You must turn on the power first!', ok: false }
      if (a.perks[s.perk]) return { text: `You already have ${p.name}`, ok: false }
      const price = this.perkPrice(s.perk)
      return { text: `Hold [E] for ${p.name} [Cost: ${price}]`, sub: p.what, ok: cash >= price && Object.keys(a.perks).length < MAX_PERKS }
    }
    if (s.kind === 'power') return this.power ? null : { text: 'Hold [E] to turn on the power', ok: true }
    if (s.kind === 'pap') {
      if (!this.power) return { text: 'You must turn on the power first!', ok: false }
      const p = this.pap
      if (p.state === 'ready' && p.by === a.id) return { text: 'Hold [E] to take your weapon', ok: true }
      if (p.state !== 'idle') return { text: 'The Pack-a-Punch is busy', ok: false }
      const sl = a.inv[a.active]
      if (!sl || !WEAPONS[sl.id]?.mag) return { text: 'Hold a gun to Pack-a-Punch it', ok: false }
      if (sl.pap) return { text: 'That one’s already Pack-a-Punched', ok: false }
      return { text: `Hold [E] to Pack-a-Punch [Cost: ${PAP}]`, ok: cash >= PAP }
    }
    if (s.kind === 'box') {
      const b = this.box
      if (b.state === 'offer' && b.by === a.id) return { text: `Hold [E] for ${WEAPONS[b.gun].name}`, ok: true }
      if (b.state !== 'idle') return null
      const price = g.time < this.timers.sale ? 10 : BOX
      return { text: `Hold [E] for a random weapon [Cost: ${price}]`, ok: cash >= price }
    }
    return null
  }
  perkPrice(perk) {
    return perk === 'revive' && this.solo ? 500 : PERKS[perk].price
  }
  /** E: buy, drink, spin, revive (held). */
  use(a, held, dt) {
    const g = this.g
    if (!a.alive) return
    const s = held ? this.usable(a) : null
    // reviving: hold it the whole time
    if (s?.kind === 'revive') {
      const b = s.b
      if (b.revivedBy && b.revivedBy !== a) return
      b.revivedBy = a
      a.reviving = b
      b.reviveProg = (b.reviveProg ?? 0) + dt / (a.perks.revive ? REVIVE / 2 : REVIVE)
      if (b.reviveProg >= 1) {
        a.reviving = null
        this.getUp(b, a)
      }
      return
    }
    if (a.reviving) {
      a.reviving.reviveProg = 0
      a.reviving.revivedBy = null
      a.reviving = null
    }
    if (!held) {
      a.useLatch = false
      return
    }
    if (!s || a.useLatch || a.down) return
    a.useLatch = true // once per press
    const deny = () => g.sound('deny', null, { who: a })
    const pay = (n) => {
      if (a.money < n) {
        deny()
        g.emit('zdeny', { a })
        return false
      }
      a.money -= n
      g.sound('zcash', null, { who: a })
      return true
    }
    if (s.kind === 'wall') {
      const have = ['primary', 'pistol'].find((k) => a.inv[k]?.id === s.gun)
      if (have) {
        const sl = a.inv[have]
        if (sl.reserve >= zReserve(sl.id, sl.pap)) return deny()
        if (pay(sl.pap ? 4500 : Math.round(s.price / 2))) sl.reserve = zReserve(sl.id, sl.pap)
      } else if (pay(s.price)) this.give(a, s.gun)
    } else if (s.kind === 'perk') {
      if ((s.perk !== 'revive' && !this.power) || a.perks[s.perk] || Object.keys(a.perks).length >= MAX_PERKS) return deny()
      if (!pay(this.perkPrice(s.perk))) return
      a.perks[s.perk] = true
      this.applyPerks(a)
      if (s.perk === 'jug') a.hp = Math.max(a.hp, Math.min(a.maxHp, a.hp + 150))
      a.switchEnd = g.time + 1.6 // (drinking it)
      g.emit('zperk', { a, perk: s.perk })
      g.sound('zperk', s, { range: 18 })
    } else if (s.kind === 'power') {
      if (this.power) return
      this.power = true
      g.emit('zpower', { a })
      g.sound('zpower', null, {})
    } else if (s.kind === 'pap') {
      const p = this.pap
      if (!this.power) return deny()
      if (p.state === 'ready' && p.by === a.id) {
        this.give(a, p.gun.id, p.gun, p.slot)
        p.state = 'idle'
        p.gun = null
        p.by = -1
        return
      }
      const sl = a.inv[a.active]
      if (p.state !== 'idle' || !sl || !WEAPONS[sl.id]?.mag || sl.pap) return deny()
      if (!pay(PAP)) return
      p.slot = a.active
      a.inv[a.active] = null
      g.switchTo(a, a.inv.primary ? 'primary' : a.inv.pistol ? 'pistol' : 'knife', true)
      p.state = 'working'
      p.by = a.id
      p.gun = zGun(sl.id, sl.skin, true)
      p.until = g.time + 3.2
      g.emit('zpap', { a, id: sl.id })
      g.sound('zpap', s, { range: 25 })
    } else if (s.kind === 'box') {
      const b = this.box
      if (b.state === 'offer' && b.by === a.id) {
        this.give(a, b.gun)
        b.state = 'idle'
        b.gun = null
        b.by = -1
        return
      }
      if (b.state !== 'idle') return
      const price = g.time < this.timers.sale ? 10 : BOX
      if (!pay(price)) return
      b.paid = price
      b.state = 'spin'
      b.by = a.id
      b.until = g.time + 4
      b.uses++
      const own = new Set(['primary', 'pistol'].map((k) => a.inv[k]?.id))
      const pool = BOX_GUNS.filter((id) => !own.has(id))
      b.gun = pool[Math.floor(Math.random() * pool.length)]
      // the teddy bear: after a few goes it may up and leave (not in a fire sale)
      b.bear = b.uses > 3 && this.boxSpots.length > 1 && g.time >= this.timers.sale && Math.random() < 0.2
      g.emit('zbox', { a })
      g.sound('zbox', this.boxAt, { range: 25 })
    }
  }
  /** Hands `a` a gun: into the slot it came from (`prefer`), an empty one, or in place of the one they're holding. */
  give(a, id, ready = null, prefer = null) {
    const g = this.g
    const sl = ready ?? zGun(id, g.skinFor?.(a, id) ?? null)
    let slot = prefer && !a.inv[prefer] ? prefer : !a.inv.primary ? 'primary' : !a.inv.pistol ? 'pistol' : a.active === 'primary' || a.active === 'pistol' ? a.active : 'primary'
    if (a.inv.primary?.id === id) slot = 'primary'
    else if (a.inv.pistol?.id === id) slot = 'pistol'
    a.inv[slot] = sl
    g.switchTo(a, slot, true)
    g.emit('zgun', { a, id, pap: !!sl.pap })
  }

  // ================= Every tick =================
  update(dt) {
    const g = this.g
    const now = g.time
    if (this.state === 'over') return
    if ((this.state === 'start' || this.state === 'break') && now >= this.next) this.startRound()
    if (now >= this.fieldAt) {
      this.fieldAt = now + 0.35
      this.updateField()
    }
    if (this.state === 'round') {
      let alive = 0
      for (const z of this.zombies) if (z.alive) alive++
      if (this.toSpawn > 0 && alive < ZOMBIE_SLOTS && now >= this.spawnAt) {
        if (this.spawnZombie()) {
          this.toSpawn--
          alive++
          this.spawnAt = now + this.spawnGap * (0.6 + Math.random() * 0.8)
        } else this.spawnAt = now + 0.5
      }
      if (this.toSpawn === 0 && alive === 0) this.endRound()
    }
    // survivors: health comes back; the downed bleed out (or get themselves up)
    for (const a of this.survivors) {
      if (!a.alive) continue
      if (a.down) {
        if (a.selfRevive && now - a.downAt >= SOLO_REVIVE) this.getUp(a)
        else if (!a.selfRevive && now >= a.bleedAt && !a.revivedBy) this.bleedOut(a)
        else if (a.revivedBy && (!a.revivedBy.alive || a.revivedBy.down || a.revivedBy.reviving !== a)) {
          a.revivedBy = null
          a.reviveProg = 0
        }
        continue
      }
      if (now - (a.zHurtAt ?? -9) > 2.5 && a.hp < a.maxHp) a.hp = Math.min(a.maxHp, a.hp + 80 * dt)
      // power-ups: walk over them
      for (let k = this.drops.length - 1; k >= 0; k--) {
        const d = this.drops[k]
        if (Math.hypot(d.x - a.pos.x, d.z - a.pos.z) < 1.3 && Math.abs(d.y - a.pos.y) < 1.6) {
          this.drops.splice(k, 1)
          this.powerUp(d, a)
        }
      }
    }
    for (let k = this.drops.length - 1; k >= 0; k--) if (now > this.drops[k].until) this.drops.splice(k, 1)
    // the box
    const b = this.box
    if (b.state === 'spin' && now >= b.until) {
      if (b.bear) {
        b.state = 'bear'
        b.until = now + 2.5
        const u = g.actors[b.by]
        if (u) u.money += b.paid ?? BOX
        g.emit('zbear', {})
        g.sound('zbear', this.boxAt, { range: 40 })
      } else {
        b.state = 'offer'
        b.until = now + 10
      }
    } else if (b.state === 'offer' && now >= b.until) {
      b.state = 'idle'
      b.gun = null
      b.by = -1
    } else if (b.state === 'bear' && now >= b.until) {
      b.state = 'away'
      b.until = now + 5
      this.solidList = null
    } else if (b.state === 'away' && now >= b.until) {
      const others = this.boxSpots.map((_, k) => k).filter((k) => k !== b.spot)
      b.spot = others[Math.floor(Math.random() * others.length)] ?? 0
      b.state = 'idle'
      b.uses = 0
      b.gun = null
      b.by = -1
      this.solidList = null
      g.emit('zboxMoved', {})
    }
    const p = this.pap
    if (p.state === 'working' && now >= p.until) {
      p.state = 'ready'
      p.until = now + 12
    } else if (p.state === 'ready' && now >= p.until) {
      p.state = 'idle'
      p.gun = null
      p.by = -1
    }
    // the moaning
    if (now >= this.groanAt) {
      this.groanAt = now + 0.8 + Math.random() * 1.4
      const zs = this.zombies.filter((z) => z.alive)
      if (zs.length) {
        const z = zs[Math.floor(Math.random() * zs.length)]
        g.sound(z.zSpeed > 4 ? 'zscream' : 'zgroan', { x: z.pos.x, y: z.pos.y + 1.6, z: z.pos.z }, { range: 28 })
      }
    }
  }

  // ================= Online =================
  /** What a client needs that the actors don't carry. */
  snapshot() {
    const r2 = (v) => Math.round(v * 100) / 100
    return {
      r: this.round,
      st: this.state,
      nx: r2(this.next),
      tm: [r2(this.timers.insta), r2(this.timers.double), r2(this.timers.sale)],
      pw: this.power ? 1 : 0,
      bx: [this.box.spot, this.box.state, r2(this.box.until), this.box.gun, this.box.by],
      pp: [this.pap.state, this.pap.by, this.pap.gun?.id ?? null, r2(this.pap.until)],
      dr: this.drops.map((d) => [d.id, d.type, r2(d.x), r2(d.y), r2(d.z), r2(d.until)]),
      sv: this.survivors.map((a) => [a.id, PERK_LIST.filter((k) => a.perks?.[k]).join(','), a.down ? 1 : 0, r2(a.bleedAt ?? 0), r2(a.reviveProg ?? 0), a.selfRevive ? 1 : 0, Math.round(a.maxHp ?? 100), a.revivedBy?.id ?? -1, r2(a.downAt ?? 0)]),
      sr: this.soloRevives,
    }
  }
  applySnapshot(s) {
    const g = this.g
    this.round = s.r
    this.state = s.st
    this.next = s.nx
    ;[this.timers.insta, this.timers.double, this.timers.sale] = s.tm
    this.power = !!s.pw
    const [spot, state, until, gun, by] = s.bx
    if (spot !== this.box.spot || (state === 'away') !== (this.box.state === 'away')) this.solidList = null
    Object.assign(this.box, { spot, state, until, gun, by })
    const [pst, pby, pgun, puntil] = s.pp
    Object.assign(this.pap, { state: pst, by: pby, gun: pgun ? { id: pgun } : null, until: puntil })
    const old = new Map(this.drops.map((d) => [d.id, d]))
    this.drops = s.dr.map((r) => old.get(r[0]) ?? { id: r[0], type: r[1], x: r[2], y: r[3], z: r[4], until: r[5] })
    for (const [id, perks, down, bleedAt, prog, self, maxHp, by, downAt] of s.sv) {
      const a = g.actors[id]
      if (!a) continue
      a.perks = Object.fromEntries(perks ? perks.split(',').map((k) => [k, true]) : [])
      this.applyPerks(a)
      a.maxHp = maxHp
      a.down = !!down
      a.bleedAt = bleedAt
      a.downAt = downAt
      a.reviveProg = prog
      a.selfRevive = !!self
      a.revivedBy = by >= 0 ? g.actors[by] : null
    }
    for (const a of this.survivors) a.reviving = this.survivors.find((b) => b.revivedBy === a) ?? null
    this.soloRevives = s.sr
  }
}

// ================= Brains =================
/**
 * A zombie: up out of the ground, then the shortest way to the nearest survivor standing (the flow
 * field, so two dozen of them cost one search a few times a second), and a swipe when it's close.
 */
export class ZombieBrain {
  constructor(game, actor) {
    this.g = game
    this.a = actor
    this.reset()
  }
  reset() {
    this.next = null
    this.nextAt = 0
    this.lastPos = null
    this.stuckT = 0
    this.target = null
    this.targetAt = 0
  }
  newRound() {}
  hurtBy() {}
  underFire() {}
  flashed() {}
  update(dt) {
    const g = this.g
    const z = g.z
    const a = this.a
    const now = g.time
    const cmd = { yaw: a.yaw, pitch: 0 }
    if (now < (a.zRise ?? 0) || z.state === 'over') return cmd
    // who's nearest (rechecked twice a second)
    if (now >= this.targetAt) {
      this.targetAt = now + 0.4 + Math.random() * 0.2
      let best = null
      let bd = Infinity
      for (const b of z.survivors) {
        if (!b.alive || b.down) continue
        const d = Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) + Math.abs(b.pos.y - a.pos.y) * 2
        if (d < bd) {
          bd = d
          best = b
        }
      }
      this.target = best
    }
    const t = this.target
    if (!t || !t.alive || t.down) {
      // nobody to chase: shuffle about
      return cmd
    }
    const dx = t.pos.x - a.pos.x
    const dz = t.pos.z - a.pos.z
    const dist = Math.hypot(dx, dz)
    const dy = t.pos.y - a.pos.y
    // the swipe: wind up, then it lands if they're still in reach
    if (a.zSwing) {
      cmd.yaw = a.yaw + wrap(Math.atan2(-dx, -dz) - a.yaw) * Math.min(1, dt * 8)
      if (now >= a.zSwing) {
        a.zSwing = 0
        a.zNextSwing = now + 0.75
        if (dist < 1.55 && Math.abs(dy) < 1.4) z.swipe(a, t)
      }
      cmd.fx = (dx / (dist || 1)) * 0.15
      cmd.fz = (dz / (dist || 1)) * 0.15
      return cmd
    }
    if (dist < 1.15 && Math.abs(dy) < 1.3 && now >= (a.zNextSwing ?? 0)) {
      a.zSwing = now + 0.42
      g.emit('zswing', { a })
      g.sound('zswing', { x: a.pos.x, y: a.pos.y + 1.5, z: a.pos.z }, { range: 14 })
      return cmd
    }
    // where to: straight at them when it's clear, else down the flow field
    let goal = null
    let jump = false
    let climb = 0
    const w = g.world
    if (dist < 7 && Math.abs(dy) < 0.6 && w.walkLine([a.pos.x, a.pos.z, a.pos.y], [t.pos.x, t.pos.z, t.pos.y])) goal = t.pos
    else {
      if (now >= this.nextAt || !this.next) {
        this.nextAt = now + 0.2 + Math.random() * 0.1
        const u = z.nodeOf(a.pos)
        this.next = null
        if (u >= 0) {
          // follow the field a few steps, and head for the farthest one in a straight line
          let cur = u
          let step = z.stepFrom(cur)
          const first = step
          let far = step ? z.nodePos(step.v) : null
          for (let k = 0; k < (now < (this.careful ?? 0) ? 0 : 6) && step && step.kind === 0; k++) {
            const p = z.nodePos(step.v)
            if (k > 0 && !w.walkLine([a.pos.x, a.pos.z, a.pos.y], [p.x, p.z, p.y])) break
            far = p
            cur = step.v
            step = z.stepFrom(cur)
          }
          if (first) this.next = { p: first.kind === 0 ? far : z.nodePos(first.v), kind: first.kind, from: z.nodePos(u) }
        }
      }
      if (this.next) {
        goal = this.next.p
        if (this.next.kind === 1 && Math.hypot(goal.x - a.pos.x, goal.z - a.pos.z) < 1.4 && a.onGround) jump = true
        if (this.next.kind === 3) climb = Math.sign(goal.y - a.pos.y)
      } else goal = t.pos
    }
    let fx = goal.x - a.pos.x
    let fz = goal.z - a.pos.z
    const l = Math.hypot(fx, fz) || 1
    fx /= l
    fz /= l
    // don't all pile into one spot
    for (const b of g.actors) {
      if (b === a || !b.alive || !b.zombie) continue
      const ex = a.pos.x - b.pos.x
      const ez = a.pos.z - b.pos.z
      const dd = Math.hypot(ex, ez)
      if (dd < 0.9 && dd > 0.01) {
        fx += (ex / dd) * 0.35
        fz += (ez / dd) * 0.35
      }
    }
    // stuck (on a corner, in a crowd): one cell at a time for a bit, a hop, and if none of that
    // does it (and nobody's looking), come up somewhere else
    this.stuckT += dt
    if (this.stuckT > 0.8) {
      const moved = this.lastPos ? Math.hypot(a.pos.x - this.lastPos.x, a.pos.z - this.lastPos.z) + Math.abs(a.pos.y - this.lastPos.y) : 9
      this.lastPos = { ...a.pos }
      this.stuckT = 0
      if (moved < a.zSpeed * 0.15) {
        this.careful = now + 2.5
        if (this.stuck) jump = true
        this.stuck = (this.stuck ?? 0) + 1
        this.was = this.next
        this.next = null
        if (this.stuck >= 7 && !z.survivors.some((b) => b.alive && g.world.sees(eyeOf(b), headOf(a), false))) {
          this.stuck = 0
          z.zombieDied(a, null, 'stuck', false, true)
          z.toSpawn++
          return cmd
        }
      } else this.stuck = 0
    }
    const want = Math.atan2(-fx, -fz)
    cmd.yaw = a.yaw + wrap(want - a.yaw) * Math.min(1, dt * 7)
    cmd.fx = fx
    cmd.fz = fz
    if (jump) cmd.jump = true
    if (climb) cmd.climb = climb
    return cmd
  }
}

/**
 * A bot on your side: keeps near the people, shoots what's coming (heads, mostly), backs off when
 * it's close, picks up anyone who goes down, and spends its points between rounds.
 */
export class SurvivorBrain {
  constructor(game, actor) {
    this.g = game
    this.a = actor
    this.nav = new Brain(game, actor) // (for its path-following)
    this.lookAt = null
    this.target = null
    this.seeAt = 0
    this.errAt = 0
    this.err = { yaw: 0, pitch: 0 }
    this.reactAt = 0
  }
  newRound() {}
  hurtBy() {}
  underFire() {}
  flashed() {}
  /** Between rounds: a better gun off the wall list, a perk or two (it doesn't walk there). */
  roundOver() {
    const { g, a } = this
    const z = g.z
    if (!a.alive || a.down) return
    const tier = WALL.filter(([, price]) => price <= a.money - 300).pop()
    if (tier && (!a.inv.primary || WALL.findIndex(([id]) => id === a.inv.primary.id) < WALL.findIndex(([id]) => id === tier[0])) && !a.inv.primary?.pap && !BOX_GUNS.includes(a.inv.primary?.id)) {
      a.money -= tier[1]
      a.inv.primary = zGun(tier[0], g.skinFor?.(a, tier[0]) ?? null)
      g.switchTo(a, 'primary', true)
    }
    for (const k of ['jug', 'tap', 'speed', 'stamin']) {
      if (!z.power || a.perks[k] || Object.keys(a.perks).length >= MAX_PERKS || a.money < PERKS[k].price + 500) continue
      a.money -= PERKS[k].price
      a.perks[k] = true
      z.applyPerks(a)
    }
    for (const s of ['primary', 'pistol']) if (a.inv[s] && WEAPONS[a.inv[s].id]?.mag && a.money > 1500) a.inv[s].reserve = zReserve(a.inv[s].id, a.inv[s].pap)
  }
  update(dt) {
    const { g, a } = this
    const z = g.z
    const now = g.time
    const cmd = { yaw: a.yaw, pitch: a.pitch }
    const w = weaponOf(a)
    const slot = a.inv[a.active]
    const eye = eyeOf(a)
    // what's the nearest zombie I can see?
    if (now >= this.seeAt) {
      this.seeAt = now + 0.15
      let best = null
      let bd = 30
      for (const b of g.actors) {
        if (!b.zombie || !b.alive || now < (b.zRise ?? 0) - 0.4) continue
        const d = Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z)
        if (d < bd && g.world.sees(eye, headOf(b), false)) {
          bd = d
          best = b
        }
      }
      if (best && best !== this.target) this.reactAt = now + 0.25
      this.target = best
    }
    const t = this.target?.alive ? this.target : null
    // keep a loaded gun out
    if (!a.down && (a.active === 'knife' || a.active === 'grenade' || (slot && slot.clip === 0 && slot.reserve === 0))) {
      for (const s of ['primary', 'pistol']) if (a.inv[s] && a.active !== s && (a.inv[s].clip > 0 || a.inv[s].reserve > 0)) cmd.slot = s
    }
    let fx = 0
    let fz = 0
    // the nearest zombie (seen or not), and anyone down
    let near = null
    let nd = Infinity
    for (const b of g.actors) {
      if (!b.zombie || !b.alive || now < (b.zRise ?? 0) - 0.3 || Math.abs(b.pos.y - a.pos.y) > 2.5) continue
      const d = Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z)
      if (d < nd) {
        nd = d
        near = b
      }
    }
    const downed = a.down ? null : z.survivors.find((b) => b !== a && b.alive && b.down && (!b.revivedBy || b.revivedBy === a))
    const helping = downed && nd > 2.2
    if (t) {
      const aim = Math.random() < 0.65 ? headOf(t) : chestOf(t)
      if (now >= this.errAt) {
        this.errAt = now + 0.3
        const e = 0.5 / Math.max(2, Math.hypot(aim.x - eye.x, aim.z - eye.z))
        this.err = { yaw: (Math.random() - 0.5) * e, pitch: (Math.random() - 0.5) * e * 0.6 }
      }
      const want = angleTo(eye, aim)
      const turn = 8 * dt
      const dyw = wrap(want.yaw + this.err.yaw - a.yaw)
      cmd.yaw = a.yaw + clamp(dyw * Math.min(1, dt * 14), -turn, turn)
      cmd.pitch = a.pitch + clamp((want.pitch + this.err.pitch - a.pitch) * Math.min(1, dt * 14), -turn, turn)
      const off = Math.abs(wrap(want.yaw - cmd.yaw))
      const dist = Math.hypot(t.pos.x - a.pos.x, t.pos.z - a.pos.z)
      if (w?.kind === 'knife') cmd.fire = dist < 1.8
      else if (slot && slot.clip === 0) cmd.reload = true
      else if (now >= this.reactAt && off < Math.max(0.05, 0.5 / Math.max(1, dist))) cmd.fire = !a.trigger || !!w?.auto
    } else if (!a.down && slot && WEAPONS[slot.id]?.mag && slot.clip < (slot.mag ?? WEAPONS[slot.id].mag) * 0.6 && slot.reserve > 0 && nd > 8) cmd.reload = true
    if (!a.down) {
      if (near && nd < 6.5 && !helping) {
        // back off: whichever way is open and leads away from them
        let best = null
        let bs = -Infinity
        for (let k = 0; k < 12; k++) {
          const ang = (k / 12) * Math.PI * 2
          const dx = Math.sin(ang)
          const dz = Math.cos(ang)
          const to = [a.pos.x + dx * 2.2, a.pos.z + dz * 2.2, a.pos.y]
          if (!g.world.walkLine([a.pos.x, a.pos.z, a.pos.y], to)) continue
          let score = 0
          for (const b of g.actors) {
            if (!b.zombie || !b.alive) continue
            const d = Math.hypot(b.pos.x - to[0], b.pos.z - to[1])
            if (d < 10) score -= 1 / Math.max(0.5, d)
          }
          if (score > bs) {
            bs = score
            best = [dx, dz]
          }
        }
        if (best) {
          fx = best[0]
          fz = best[1]
        }
      } else {
        // nothing close: help anyone down, otherwise stay with the people
        const lead = downed ?? z.survivors.find((b) => b !== a && b.alive && !b.down && !b.isBot) ?? z.survivors.find((b) => b !== a && b.alive && !b.down)
        if (lead) {
          const d = Math.hypot(lead.pos.x - a.pos.x, lead.pos.z - a.pos.z)
          if (downed && d < 1.4) cmd.use = true
          else if (d > (downed ? 1 : 4.5)) {
            this.nav.setGoal(lead.pos.x, lead.pos.z, downed ? 1 : 3, lead.pos.y)
            const st = this.nav.steer(dt)
            fx = st.fx
            fz = st.fz
            if (st.climb) cmd.climb = st.climb
            if (this.nav.jumpNext) {
              cmd.jump = true
              this.nav.jumpNext = false
            }
            if (st.ahead && !t) {
              const ang = angleTo(eye, { x: st.ahead.x, y: a.pos.y + 1.6, z: st.ahead.z })
              cmd.yaw = a.yaw + wrap(ang.yaw - a.yaw) * Math.min(1, dt * 5)
              cmd.pitch = a.pitch * (1 - Math.min(1, dt * 4))
            }
          }
        }
      }
      // nothing in sight but one close by (behind us): turn round
      if (!t && near && nd < 8) {
        const ang = angleTo(eye, headOf(near))
        cmd.yaw = a.yaw + wrap(ang.yaw - a.yaw) * Math.min(1, dt * 8)
      }
    }
    if (a.down) {
      fx = fz = 0
    }
    cmd.fx = fx
    cmd.fz = fz
    return cmd
  }
}
