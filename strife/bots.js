// The bots. Each round the Terrorists pick a site and a way in; the Counter-Terrorists spread out
// over the sites and hold angles. Every bot sees (only what's in front of it, and not through
// walls or smoke), hears gunfire and footsteps, reacts after a human-ish delay, and aims with a
// little error that shrinks as it tracks you. Difficulty changes how fast and how well.

import { eyeOf, chestOf, headOf, dirOf, weaponOf } from './game.js'
import { WEAPONS } from './weapons.js'

export const DIFFICULTY = [
  // err: how far off (metres, at the target) the aim wanders before it settles
  { name: 'Easy', react: 0.75, turn: 3.2, err: 0.6, head: 0.12, control: 0.25, see: 55, fov: 0.42 },
  { name: 'Normal', react: 0.48, turn: 5.5, err: 0.38, head: 0.28, control: 0.5, see: 70, fov: 0.38 },
  { name: 'Hard', react: 0.32, turn: 8.5, err: 0.24, head: 0.42, control: 0.7, see: 85, fov: 0.32 },
  { name: 'Expert', react: 0.22, turn: 12, err: 0.15, head: 0.58, control: 0.85, see: 100, fov: 0.26 },
]

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const angleTo = (from, to) => ({
  yaw: Math.atan2(-(to.x - from.x), -(to.z - from.z)),
  pitch: Math.atan2(to.y - from.y, Math.hypot(to.x - from.x, to.z - from.z)),
})

/** The Terrorists' plan for a round, and where each Counter-Terrorist holds. */
export function planRound(g) {
  const m = g.map
  const one = g.sites && Object.keys(g.sites).length === 1 ? Object.keys(g.sites)[0] : null
  const site = g.bomb?.state === 'planted' && g.bomb.site ? g.bomb.site : one ?? (Math.random() < 0.5 ? 'A' : 'B')
  const other = site === 'A' ? 'B' : 'A'
  const routes = m.routes[site]
  const main = pick(routes)
  // The bomb carrier always goes with the main group.
  const ts = g.actors.filter((a) => a.team === 'T' && a.isBot).sort((p, q) => (q.inv.bomb ? 1 : 0) - (p.inv.bomb ? 1 : 0))
  const assign = {}
  ts.forEach((a, k) => {
    let route = main
    let lurk = false
    if (k === 1 && routes.length > 1 && Math.random() < 0.55) route = pick(routes.filter((r) => r !== main))
    if (k === 2 && !one && Math.random() < 0.3) {
      route = pick(m.routes[other])
      lurk = true
    }
    assign[a.id] = { route, lurk }
  })
  const rush = Math.random() < 0.3
  // CT spots: two on each site, one mid, then extras.
  const spots = one ? m.holds[one].map((h) => ({ ...h, area: one })) : [
    ...m.holds.A.slice(0, 2).map((h) => ({ ...h, area: 'A' })),
    ...m.holds.B.slice(0, 2).map((h) => ({ ...h, area: 'B' })),
    ...m.holds.mid.slice(0, 1).map((h) => ({ ...h, area: 'mid' })),
    ...m.holds.A.slice(2).map((h) => ({ ...h, area: 'A' })),
    ...m.holds.B.slice(2).map((h) => ({ ...h, area: 'B' })),
    ...m.holds.mid.slice(1).map((h) => ({ ...h, area: 'mid' })),
  ]
  const cts = g.actors.filter((a) => a.team === 'CT' && a.isBot).sort(() => Math.random() - 0.5)
  const hold = {}
  cts.forEach((a, k) => (hold[a.id] = spots[k % spots.length]))
  return { site, assign, execAt: rush ? 0 : 14 + Math.random() * 30, hold, rotated: { A: false, B: false } }
}

export class Brain {
  constructor(game, actor) {
    this.g = game
    this.a = actor
    this.newRound()
  }
  get d() {
    return DIFFICULTY[this.g.difficulty] ?? DIFFICULTY[1]
  }
  newRound() {
    this.ord = null
    this.goal = null
    this.path = null
    this.pathGoal = null
    this.pathIdx = 0
    this.wp = 0
    this.plantSpot = null
    this.target = null
    this.seen = {}
    this.reactAt = 0
    this.lookAt = null
    this.lookUntil = 0
    this.errYaw = 0
    this.errPitch = 0
    this.errNext = 0
    this.trackStart = 0
    this.burst = 0
    this.pauseUntil = 0
    this.strafe = 0
    this.strafeNext = 0
    this.nextThink = 0
    this.lastPos = null
    this.stuckT = 0
    this.jumpNext = false
    this.bought = false
    this.buyAt = 0.5 + Math.random() * 2
    this.noiseSeen = this.g.noises.length
    this.rotateAt = 0
    this.area = null
    this.threw = false
    this.holdLook = null
    this.peek = 0
    this.lastHurt = null
    this.aimPart = 'chest'
  }

  // ================= Senses =================
  hurtBy(attacker) {
    this.lastHurt = { by: attacker, at: this.g.time, pos: eyeOf(attacker) }
    if (!this.target) {
      this.lookAt = eyeOf(attacker)
      this.lookUntil = this.g.time + 2
    }
  }
  underFire(from) {
    if (this.target) return
    this.lookAt = { ...from }
    this.lookUntil = this.g.time + 1.5
  }
  flashed() {
    this.reactAt = Math.max(this.reactAt, this.a.flashUntil)
  }
  /** Who can I see? (~10 times a second) */
  perceive() {
    const { g, a } = this
    const d = this.d
    const now = g.time
    const e = eyeOf(a)
    const look = dirOf(a.yaw, 0)
    let best = null
    let bestScore = Infinity
    for (const t of g.actors) {
      if (!t.alive || t.team === a.team) continue
      const c = chestOf(t)
      const dx = c.x - e.x
      const dz = c.z - e.z
      const dist = Math.hypot(dx, dz)
      if (dist > d.see) continue
      const facing = (dx * look.x + dz * look.z) / (dist || 1)
      const recentlyHurt = this.lastHurt?.by === t && now - this.lastHurt.at < 2
      if (facing < d.fov && dist > 3.5 && !recentlyHurt && this.target !== t) continue
      if (now < a.flashFull) continue
      const visible = g.world.sees(e, headOf(t)) || g.world.sees(e, c)
      if (!visible) continue
      this.seen[t.id] = { at: now, pos: c }
      g.intel[a.team].push({ pos: c, at: now, id: t.id })
      const score = dist * (t === this.target ? 0.6 : 1) * (t.active === 'bomb' || t.inv.bomb ? 0.9 : 1)
      if (score < bestScore) {
        bestScore = score
        best = t
      }
    }
    if (g.intel[a.team].length > 40) g.intel[a.team].splice(0, 20)
    if (best && best !== this.target) {
      const lastSeen = this.seen[best.id]?.prev ?? -9
      if (now - lastSeen > 3) g.chatter?.spotted(a, best)
      // A fresh sighting takes a moment to react to; one you've just lost and found again, less.
      const react = d.react * (0.75 + Math.random() * 0.5) * (now - lastSeen < 1.2 ? 0.4 : 1)
      this.reactAt = Math.max(this.reactAt, now + react)
      this.trackStart = now
      this.aimPart = Math.random() < d.head ? 'head' : 'chest'
      this.burst = 0
    }
    if (this.target && best !== this.target && this.seen[this.target.id]) this.seen[this.target.id].prev = this.seen[this.target.id].at
    this.target = best
    // Hearing
    const noises = g.noises
    for (let k = this.noiseSeen; k < noises.length; k++) {
      const n = noises[k]
      if (n.team === a.team) continue
      const dist = Math.hypot(n.x - e.x, n.z - e.z)
      if (dist < n.loud && !this.target) {
        this.lookAt = { x: n.x, y: n.y + 1.2, z: n.z }
        this.lookUntil = now + 1.6
      }
    }
    this.noiseSeen = noises.length
  }

  // ================= Buying =================
  buy() {
    const { g, a } = this
    const team = a.team
    const T = team === 'T'
    const firstRound = g.round === 1 || (g.halftimeDone && g.round === g.halftimeAt + 1)
    const mates = g.actors.filter((b) => b.team === team)
    const teamMoney = mates.reduce((s, b) => s + b.money, 0) / Math.max(1, mates.length)
    const has = a.inv.primary
    const tryBuy = (id) => g.buy(a, id) === ''
    // Each bot has its favourites, so a team doesn't all carry the same thing.
    const taste = this.taste ??= Math.random()
    const choose = (list) => {
      const ok = list.filter(([id, w]) => WEAPONS[id] && (!WEAPONS[id].team || WEAPONS[id].team === team) && a.money >= WEAPONS[id].price + 650 && w > 0)
      if (!ok.length) return null
      const total = ok.reduce((s, [, w]) => s + w, 0)
      let r = ((taste * 7.31 + Math.random() * 0.5) % 1) * total
      for (const [id, w] of ok) if ((r -= w) <= 0) return id
      return ok[ok.length - 1][0]
    }
    if (firstRound) {
      const r = Math.random()
      if (r < 0.35) tryBuy('vest')
      else if (r < 0.55) tryBuy(T ? 'tec9' : 'fiveseven')
      else if (r < 0.7) tryBuy('p250')
      else if (r < 0.8) tryBuy('deagle')
      else if (r < 0.9) tryBuy('flash') && tryBuy('flash')
      else tryBuy(T ? 'flash' : 'kit')
    } else {
      const eco = !has && teamMoney < 2600 && a.money < 3700
      if (!eco) {
        const awpers = mates.filter((b) => b.inv.primary?.id === 'awp').length
        if (!has) {
          let pick = null
          if (!awpers && a.money >= 4750 + 1000 && taste < 0.35) pick = 'awp'
          else if (a.money >= 2700 + 1000) pick = choose(T ? [['ak47', 8], ['sg553', 2], ['ssg08', taste > 0.85 ? 3 : 0.4]] : [['m4a4', 4], ['m4a1s', 4], ['aug', 1.5], ['ssg08', taste > 0.85 ? 3 : 0.4]])
          if (!pick && a.money >= 1800 + 650) pick = choose(T ? [['galil', 4], ['mac10', 1], ['ump45', 1], ['xm1014', 0.6]] : [['famas', 4], ['mp9', 1.5], ['ump45', 1], ['mag7', 0.6]])
          if (!pick) pick = choose(T ? [['mac10', 3], ['ump45', 1.5], ['nova', 0.6], ['sawedoff', 0.4], ['bizon', 0.5]] : [['mp9', 3], ['ump45', 1.5], ['nova', 0.6], ['mag7', 0.4], ['mp5', 0.6]])
          if (pick) tryBuy(pick)
        }
        if (a.armor < 100 || !a.helmet) tryBuy(a.money >= 1000 ? 'vesthelm' : 'vest')
        if (!T && a.money >= 400 && Math.random() < 0.6) tryBuy('kit')
        if (a.money >= 300 && Math.random() < 0.7) tryBuy('smoke')
        if (a.money >= 400 && Math.random() < 0.45) tryBuy(T ? 'molotov' : 'incendiary')
        if (a.money >= 300 && Math.random() < 0.45) tryBuy('he')
        if (a.money >= 200 && Math.random() < 0.4) tryBuy('flash')
        if (a.money >= 1500 && Math.random() < 0.08) tryBuy('zeus')
      } else if (a.money >= 1500 && Math.random() < 0.5) tryBuy(Math.random() < 0.6 ? 'deagle' : T ? 'tec9' : 'fiveseven')
      else if (a.money >= 500 && Math.random() < 0.3) tryBuy('p250')
    }
    if (a.inv.primary) g.switchTo(a, 'primary', true)
  }

  // ================= Moving =================
  /** Steer toward the goal along a path. Returns the wish direction. */
  steer(dt) {
    const { g, a } = this
    if (!this.goal) return { fx: 0, fz: 0, arrived: true }
    const gx = this.goal.x
    const gz = this.goal.z
    const gy = this.goal.y
    const sameFloor = gy == null || Math.abs(g.world.floorAt(gx, gz, gy + 1) - a.pos.y) < 1.6
    if (sameFloor && Math.hypot(gx - a.pos.x, gz - a.pos.z) < (this.goal.r ?? 0.8)) return { fx: 0, fz: 0, arrived: true }
    if (!this.path || !this.pathGoal || this.pathGoal.y !== gy || Math.hypot(this.pathGoal.x - gx, this.pathGoal.z - gz) > 1.5) {
      this.path = g.world.path(a.pos.x, a.pos.z, a.pos.y + 0.5, gx, gz, gy == null ? 50 : gy + 1)
      this.pathGoal = { x: gx, z: gz, y: gy }
      this.pathIdx = 1
      if (!this.path) return { fx: 0, fz: 0, arrived: true }
    }
    while (this.pathIdx < this.path.length - 1 && Math.hypot(this.path[this.pathIdx][0] - a.pos.x, this.path[this.pathIdx][1] - a.pos.z) < 0.7 && Math.abs((this.path[this.pathIdx][2] ?? a.pos.y) - a.pos.y) < 1.6) this.pathIdx++
    const [tx, tz] = this.path[Math.min(this.pathIdx, this.path.length - 1)]
    let fx = tx - a.pos.x
    let fz = tz - a.pos.z
    const l = Math.hypot(fx, fz) || 1
    fx /= l
    fz /= l
    // keep a little apart from teammates
    for (const b of g.actors) {
      if (b === a || !b.alive || b.team !== a.team) continue
      const dx = a.pos.x - b.pos.x
      const dz = a.pos.z - b.pos.z
      const dd = Math.hypot(dx, dz)
      if (dd < 1.1 && dd > 0.01) {
        fx += (dx / dd) * 0.6
        fz += (dz / dd) * 0.6
      }
    }
    // stuck? jump, then find another way
    this.stuckT += dt
    if (this.stuckT > 1.2) {
      const moved = this.lastPos ? Math.hypot(a.pos.x - this.lastPos.x, a.pos.z - this.lastPos.z) : 9
      this.lastPos = { ...a.pos }
      this.stuckT = 0
      if (moved < 0.4) {
        this.jumpNext = true
        this.path = null
        this.pathGoal = null
      }
    }
    return { fx, fz, arrived: false, ahead: { x: tx, z: tz } }
  }
  setGoal(x, z, r = 0.8, y = null) {
    if (this.goal && this.goal.y === y && Math.hypot(this.goal.x - x, this.goal.z - z) < 0.3) return
    this.goal = { x, z, r, y }
  }
  /** Go to a map point [x, z, y?] (cell coordinates). */
  goTo(p, r = 0.8) {
    this.setGoal(p[0] + 0.5, p[1] + 0.5, r, p[2] ?? null)
  }

  // ================= Orders on the radio =================
  /** A teammate's order: follow / regroup / backup (go to them), hold (stay here), fallback. */
  order(kind, from, slot = 0) {
    const dur = { follow: 30, regroup: 12, backup: 18, hold: 25, fallback: 14 }[kind] ?? 15
    this.ord = { kind, from, slot, until: this.g.time + dur, at: { ...this.a.pos }, yaw: from.yaw, nearSince: null }
  }
  clearOrder() {
    this.ord = null
  }
  /** A teammate called an enemy: look that way. */
  heardCall(p) {
    if (this.target) return
    this.lookAt = { x: p.x, y: p.y + 1.2, z: p.z }
    this.lookUntil = this.g.time + 3
  }
  /** Carry out the order, if there is one. True when it chose where to go. */
  orders() {
    const { g, a } = this
    const o = this.ord
    const now = g.time
    if (!o) return false
    const f = o.from
    if (now > o.until || !f.alive || (g.bomb && g.bomb.state === 'planted')) {
      this.ord = null
      return false
    }
    const fwd = (yaw, d) => ({ x: -Math.sin(yaw) * d, z: -Math.cos(yaw) * d })
    if (o.kind === 'hold') {
      this.setGoal(o.at.x, o.at.z, 1, o.at.y)
      const l = fwd(o.yaw, 12)
      this.holdLook = { x: o.at.x + l.x, y: a.pos.y + 1.5, z: o.at.z + l.z }
      return true
    }
    if (o.kind === 'fallback') {
      const sp = g.map.spawns[a.team]
      this.goTo(sp[a.id % sp.length], 2)
      this.holdLook = null
      return true
    }
    // follow, regroup, backup: a step behind them, off to one side
    const side = (o.slot % 2 ? 1 : -1) * (0.55 + Math.floor(o.slot / 2) * 0.35)
    const back = fwd(f.yaw + side, o.kind === 'backup' ? -1.6 : -2.4)
    this.setGoal(f.pos.x + back.x, f.pos.z + back.z, 1.3, f.pos.y)
    const close = Math.hypot(f.pos.x - a.pos.x, f.pos.z - a.pos.z) < 4.5
    if (close) {
      o.nearSince ??= now
      const l = fwd(f.yaw, 12)
      this.holdLook = { x: f.pos.x + l.x, y: a.pos.y + 1.5, z: f.pos.z + l.z }
    } else {
      o.nearSince = null
      this.holdLook = null
    }
    // regrouped / backed up: back to the plan after a few seconds together
    if ((o.kind === 'regroup' || o.kind === 'backup') && o.nearSince != null && now - o.nearSince > (o.kind === 'regroup' ? 3 : 6)) this.ord = null
    return true
  }

  // ================= What to do =================
  objective() {
    const { g, a } = this
    if (this.ord && this.orders()) return {}
    if (g.respawns) return this.roam()
    const m = g.map
    const plan = g.plan
    const now = g.time
    const b = g.bomb
    const liveFor = now - (g.roundStart + g.rules.freeze)
    if (a.team === 'T') {
      // Nobody wants to be next to it when it goes.
      if (b.state === 'planted' && b.explodeAt - now < 7) {
        const away = this.escape(b.pos)
        this.setGoal(away.x, away.z, 1.5, away.y)
        this.holdLook = null
        return {}
      }
      if (b.state === 'planted') {
        const posts = m.posts[b.site]
        const k = g.actors.filter((x) => x.team === 'T').indexOf(a) % posts.length
        const p = posts[k]
        this.goTo(p.at)
        this.holdLook = { x: p.look[0], y: a.pos.y + 1.5, z: p.look[1] }
        return {}
      }
      if (b.state === 'dropped') {
        const ts = g.actors.filter((x) => x.team === 'T' && x.alive)
        const nearest = ts.sort((p, q) => dist2(p.pos, b.pos) - dist2(q.pos, b.pos))[0]
        if (nearest === a) {
          this.setGoal(b.pos.x, b.pos.z, 0.3, b.pos.y)
          this.holdLook = null
          return {}
        }
      }
      const as = plan.assign[a.id] ?? { route: m.routes[plan.site][0] }
      const pts = as.route.path
      const late = g.roundTimeLeft < 30
      const stage = Math.max(0, pts.length - 3)
      if (this.wp < pts.length) {
        const [x, z, wy] = pts[this.wp]
        if (Math.hypot(x + 0.5 - a.pos.x, z + 0.5 - a.pos.z) < 2.2 && (wy == null || Math.abs(a.pos.y - wy) < 1.6)) {
          if (this.wp === stage && liveFor < plan.execAt && !late && !as.lurk) {
            // wait for the go
            this.goTo(pts[this.wp], 1.2)
            const [nx, nz] = pts[Math.min(pts.length - 1, this.wp + 1)]
            this.holdLook = { x: nx, y: a.pos.y + 1.5, z: nz }
            return {}
          }
          if (this.wp === stage && !this.threw && a.inv.grenades.includes('smoke') && Math.random() < 0.6) {
            this.threw = true
            const [px, pz] = pts[pts.length - 1]
            return { throwAt: { x: px, z: pz, nade: 'smoke' } }
          }
          this.wp++
        }
        this.goTo(pts[Math.min(this.wp, pts.length - 1)], 1.6)
        this.holdLook = null
        return {}
      }
      // On the site
      const site = as.lurk ? (plan.site === 'A' ? 'B' : 'A') : plan.site
      if (a.inv.bomb) {
        // (a spot on the site this round is going for: the plan can change, and the bomb change hands)
        if (!this.plantSpot || this.plantSite !== site) {
          this.plantSpot = pick(m.plant[site])
          this.plantSite = site
        }
        this.goTo(this.plantSpot, 0.5)
        if (g.inSite(a) && Math.hypot(this.plantSpot[0] + 0.5 - a.pos.x, this.plantSpot[1] + 0.5 - a.pos.z) < 1.2) return { use: true }
        return {}
      }
      const posts = m.posts[site]
      const k = g.actors.filter((x) => x.team === 'T').indexOf(a) % posts.length
      const p = posts[k]
      this.goTo(p.at)
      this.holdLook = { x: p.look[0], y: a.pos.y + 1.5, z: p.look[1] }
      return {}
    }
    // Counter-Terrorist
    if (b.state === 'planted') {
      const left = b.explodeAt - now
      const dist = Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z)
      // Too late to make it (and not already on it): save yourself.
      if (b.defuser !== a && left < (a.kit ? 5.2 : 10.2) + dist / 6) {
        const away = this.escape(b.pos)
        this.setGoal(away.x, away.z, 1.5, away.y)
        this.holdLook = null
        return {}
      }
      this.setGoal(b.pos.x, b.pos.z, 0.6, b.pos.y)
      this.holdLook = null
      const near = Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 1.5 && Math.abs(b.pos.y - a.pos.y) < 1.5
      const clear = !this.target && Object.values(this.seen).every((s) => now - s.at > 2.5)
      const timeLeft = b.explodeAt - now
      if (near && (clear || timeLeft < (a.kit ? 6 : 11))) return { use: true, crouch: true }
      return {}
    }
    const spot = this.area ? null : plan.hold[a.id]
    if (spot) {
      this.goTo(spot.at)
      this.holdLook = { x: spot.look[0] + 0.5, y: a.pos.y + 1.5, z: spot.look[1] + 0.5 }
    }
    // Rotate when the Terrorists show up somewhere else.
    const hot = this.hotSite()
    if (hot && plan.hold[a.id]?.area !== hot) {
      if (!this.rotateAt) this.rotateAt = now + 1.5 + Math.random() * 4
      if (now > this.rotateAt) {
        this.area = hot
        const spots = m.holds[hot]
        const s = spots[a.id % spots.length]
        this.goTo(s.at)
        this.holdLook = { x: s.look[0] + 0.5, y: a.pos.y + 1.5, z: s.look[1] + 0.5 }
      }
    }
    return {}
  }
  /** Respawn modes: hunt. Head for where the enemy was last heard or seen, else wander the map's hot spots. */
  roam() {
    const { g, a } = this
    const now = g.time
    const m = g.map
    let lead = null
    for (let k = g.noises.length - 1; k >= 0 && !lead; k--) {
      const n = g.noises[k]
      if (n.team !== a.team && now - n.at < 6 && Math.hypot(n.x - a.pos.x, n.z - a.pos.z) < 55) lead = n
    }
    if (lead && (!this.goal || now > (this.roamUntil ?? 0) - 6)) {
      this.setGoal(lead.x, lead.z, 2, lead.y)
      this.roamUntil = now + 8
    } else if (!this.goal || this.steerArrived || now > (this.roamUntil ?? 0)) {
      const spots = [...Object.values(m.holds).flat().map((h) => h.at), ...Object.values(m.posts).flat().map((h) => h.at), ...Object.values(m.routes).flat().flatMap((r) => r.path)]
      const p = spots[Math.floor(Math.random() * spots.length)]
      this.goTo(p, 1.5)
      this.roamUntil = now + 10 + Math.random() * 10
    }
    this.holdLook = null
    return {}
  }
  /** Somewhere well away from the bomb: whichever spawn point is farthest from it. */
  escape(from) {
    const pts = [...this.g.map.spawns.T, ...this.g.map.spawns.CT]
    let best = pts[0]
    let bd = -1
    for (const p of pts) {
      const d = Math.hypot(p[0] - from.x, p[1] - from.z) - Math.hypot(p[0] - this.a.pos.x, p[1] - this.a.pos.z) * 0.5
      if (d > bd) {
        bd = d
        best = p
      }
    }
    return { x: best[0] + 0.5, z: best[1] + 0.5, y: best[2] ?? null }
  }
  /** A site the Terrorists have been seen at in the last few seconds (by any teammate). */
  hotSite() {
    const { g } = this
    const now = g.time
    const count = { A: 0, B: 0 }
    for (const s of g.intel.CT) {
      if (now - s.at > 6) continue
      for (const [k, rr] of Object.entries(g.map.sites)) {
        if (s.pos.x > rr.x0 - 12 && s.pos.x < rr.x1 + 12 && s.pos.z > rr.z0 - 12 && s.pos.z < rr.z1 + 12) count[k]++
      }
    }
    if (count.A >= 2 && count.A >= count.B) return 'A'
    if (count.B >= 2) return 'B'
    return null
  }

  // ================= The tick =================
  update(dt) {
    const { g, a } = this
    const d = this.d
    const now = g.time
    const cmd = { yaw: a.yaw, pitch: a.pitch }
    if (g.phase === 'freeze') {
      if (!this.bought && now - g.roundStart > this.buyAt) {
        this.bought = true
        this.buy()
      }
      return cmd
    }
    if (now >= this.nextThink) {
      this.nextThink = now + 0.1 + Math.random() * 0.04
      this.perceive()
    }
    const w = weaponOf(a)
    const slot = a.inv[a.active]
    // Keep a loaded gun out.
    if (a.active === 'knife' || a.active === 'grenade' || a.active === 'bomb' || (slot && slot.clip === 0 && slot.reserve === 0)) {
      if (a.inv.primary && (a.inv.primary.clip > 0 || a.inv.primary.reserve > 0) && a.active !== 'primary' && !this.throwing) cmd.slot = 'primary'
      else if (a.inv.pistol && a.active !== 'pistol' && !this.throwing && (a.inv.pistol.clip > 0 || a.inv.pistol.reserve > 0)) cmd.slot = 'pistol'
    }
    let t = this.target
    if (t && w) {
      const range = w.type === 'shotgun' ? 16 : w.type === 'mg' ? 50 : w.kind === 'taser' ? 3.4 : { rifle: 60, smg: 32, pistol: 30, sniper: 140, knife: 12 }[w.kind] ?? 45
      const far = Math.hypot(t.pos.x - a.pos.x, t.pos.z - a.pos.z) > range
      const shotAt = this.lastHurt && now - this.lastHurt.at < 2
      if (far && !shotAt) t = null
    }
    let wish = { fx: 0, fz: 0 }
    const obj = this.objective()
    if (t && t.alive) {
      // ---- Fight ----
      const e = eyeOf(a)
      const aim = this.aimPart === 'head' ? headOf(t) : chestOf(t)
      const dist = Math.hypot(aim.x - e.x, aim.z - e.z)
      // lead a little and wobble
      if (now > this.errNext) {
        this.errNext = now + 0.3 + Math.random() * 0.2
        const tracking = Math.min(1, (now - this.trackStart) / 1.5)
        const scale = (d.err * (1.6 - tracking) * (now < a.flashUntil ? 4 : 1)) / Math.max(2, dist)
        this.errYaw = (Math.random() - 0.5) * 2 * scale
        this.errPitch = (Math.random() - 0.5) * scale
      }
      const want = angleTo(e, aim)
      want.yaw += this.errYaw
      want.pitch += this.errPitch
      // control the spray (aim down against the climb)
      if (w?.recoil && a.recoil > 0 && now - a.lastShot < 0.4) {
        const k = Math.min(Math.floor(a.recoil), w.recoil.length - 1)
        want.pitch -= w.recoil[k][1] * d.control
        want.yaw -= w.recoil[k][0] * d.control
      }
      const dy = wrap(want.yaw - a.yaw)
      const dp = want.pitch - a.pitch
      const turn = d.turn * dt
      cmd.yaw = a.yaw + Math.max(-turn, Math.min(turn, dy * Math.min(1, dt * 14)))
      cmd.pitch = a.pitch + Math.max(-turn, Math.min(turn, dp * Math.min(1, dt * 14)))
      const off = Math.hypot(wrap(want.yaw - cmd.yaw), want.pitch - cmd.pitch)
      const tol = Math.max(0.012, Math.atan(0.3 / Math.max(1, dist)))
      // Snipers scope in first.
      if (w?.zoom && !a.scope && now > this.reactAt - 0.25 && (w.kind === 'sniper' || dist > 20)) cmd.alt = true
      // Movement while fighting: stop to shoot (rifles, the AWP), strafe with pistols and SMGs.
      if (w && (w.kind === 'pistol' || w.kind === 'smg') && dist < 20) {
        if (now > this.strafeNext) {
          this.strafeNext = now + 0.4 + Math.random() * 0.6
          this.strafe = Math.random() < 0.5 ? -1 : 1
        }
        const r = dirOf(a.yaw + Math.PI / 2, 0)
        wish = { fx: r.x * this.strafe, fz: r.z * this.strafe }
      } else if (w?.kind === 'knife' || w?.kind === 'taser') {
        wish = { fx: (t.pos.x - a.pos.x) / (dist || 1), fz: (t.pos.z - a.pos.z) / (dist || 1) }
      }
      if (dist > 25 && d.control > 0.6 && w?.kind === 'rifle') cmd.crouch = Math.random() < 0.02 ? !this.crouched : this.crouched
      this.crouched = cmd.crouch
      const ready = now >= this.reactAt && now >= this.pauseUntil && off < tol * (w?.kind === 'sniper' ? 1 : 2.2)
      if (ready && w && w.kind !== 'grenade' && w.kind !== 'bomb') {
        if (w.kind === 'knife') cmd.fire = dist < 1.8
        else if (w.kind === 'taser') cmd.fire = dist < 3.2
        else if (slot && slot.clip === 0) cmd.reload = true
        else {
          cmd.fire = true
          this.burst++
          const maxBurst = (w.kind === 'rifle' || w.kind === 'smg' || w.type === 'mg') && !slot?.burst ? (dist > 28 ? 1 + Math.floor(Math.random() * 2) : dist > 14 ? 3 + Math.floor(Math.random() * 3) : 30) : 1
          if (this.burst >= maxBurst) {
            this.burst = 0
            this.pauseUntil = now + (w.kind === 'pistol' ? 0.18 + Math.random() * 0.2 : dist > 14 ? 0.28 + Math.random() * 0.25 : 0.05)
          }
        }
      }
      if (!w || (w.kind !== 'pistol' && w.kind !== 'smg' && w.kind !== 'knife' && w.kind !== 'taser')) wish = { fx: 0, fz: 0 } // counter-strafe
      if (obj.use && a.team === 'T') cmd.use = false
    } else {
      // ---- Go about the plan ----
      this.burst = 0
      const s = this.steer(dt)
      this.steerArrived = s.arrived
      wish = { fx: s.fx, fz: s.fz }
      if (this.jumpNext) {
        cmd.jump = true
        this.jumpNext = false
      }
      // reload when nothing's around
      if (slot && WEAPONS[slot.id]?.mag && slot.clip < WEAPONS[slot.id].mag * 0.5 && slot.reserve > 0 && now > a.reloadEnd) cmd.reload = true
      if (a.scope) cmd.alt = true // AWPers unscope to move (it takes two clicks to back out)
      // where to look
      let look = null
      if (this.lookAt && now < this.lookUntil) look = this.lookAt
      else if (s.arrived && this.holdLook) {
        // hold the angle, with a little scan
        this.peek += dt
        const yawOff = Math.sin(this.peek * 0.7) * 0.25
        const base = angleTo(eyeOf(a), this.holdLook)
        look = null
        this.turnTo(cmd, base.yaw + yawOff, 0, dt)
      } else if (s.ahead) look = { x: s.ahead.x, y: a.pos.y + 1.6, z: s.ahead.z }
      if (look) {
        const ang = angleTo(eyeOf(a), look)
        this.turnTo(cmd, ang.yaw, Math.max(-0.4, Math.min(0.4, ang.pitch)), dt)
      }
      if (obj.use) {
        cmd.use = true
        cmd.crouch = !!obj.crouch
        wish = { fx: 0, fz: 0 }
      }
      if (obj.throwAt) this.throwAt(cmd, obj.throwAt)
      // walk quietly when holding still nearby the enemy... and when retaking with the bomb ticking, run.
      cmd.walk = false
    }
    if (this.throwing) {
      const nade = this.throwing
      if (a.active !== 'grenade') cmd.slot = 'grenade'
      else if (a.inv.grenades[0] !== nade.nade) cmd.slot = 'grenade'
      else if (now > a.switchEnd) {
        const ang = angleTo(eyeOf(a), { x: nade.x, y: a.pos.y + 1.6, z: nade.z })
        cmd.yaw = ang.yaw
        cmd.pitch = 0.32
        cmd.fire = true
        this.throwing = null
      }
      if (now > (this.throwGiveUp ?? 0)) this.throwing = null
    }
    cmd.fx = wish.fx
    cmd.fz = wish.fz
    return cmd
  }
  turnTo(cmd, yaw, pitch, dt) {
    const a = this.a
    const turn = this.d.turn * 0.6 * dt
    const dy = wrap(yaw - a.yaw)
    cmd.yaw = a.yaw + Math.max(-turn, Math.min(turn, dy * Math.min(1, dt * 6)))
    cmd.pitch = a.pitch + Math.max(-turn, Math.min(turn, (pitch - a.pitch) * Math.min(1, dt * 6)))
  }
  throwAt(cmd, t) {
    if (!this.a.inv.grenades.includes(t.nade)) return
    this.throwing = t
    this.throwGiveUp = this.g.time + 2
  }
}
