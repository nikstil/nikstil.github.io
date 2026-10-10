// Recording a match, and playing it back: the killcam (the last seconds through your killer's
// eyes) and full replays (any match you finished, from any player's view or from above).
//
// A recording is frames (15 a second) of where everyone is and what they hold, the grenades,
// smoke and fire, and the bomb, plus the events that make effects (shots, impacts, explosions,
// kills). Playback drives a "ghost" match that looks enough like the real one for the view and
// HUD to draw it.

import { WEAPONS } from './weapons.js'
import { weaponOf } from './game.js'

const HZ = 15
const r2 = (v) => Math.round(v * 100) / 100

export class Recorder {
  constructor(game, meta = {}) {
    this.game = game
    this.meta = { map: game.map.id, mode: game.mode, date: Date.now(), ...meta }
    this.roster = game.actors.map((a) => ({ id: a.id, name: a.name, team: a.team, bot: !!a.isBot, me: a === game.player }))
    this.frames = []
    this.events = []
    this.acc = 1
  }
  /** Called each tick, after the game updates. */
  tick(dt) {
    this.acc += dt
    if (this.acc < 1 / HZ) return
    this.acc = 0
    const g = this.game
    const f = {
      t: r2(g.time),
      ph: g.phase,
      rd: g.round,
      sc: [g.score.T, g.score.CT],
      pe: g.phaseEnd === Infinity ? -1 : r2(g.phaseEnd),
      a: g.actors.map((a) => {
        const s = a.active === 'grenade' ? { id: a.inv.grenades[0] } : a.active === 'bomb' ? { id: 'bomb' } : a.inv?.[a.active]
        return [r2(a.pos.x), r2(a.pos.y), r2(a.pos.z), r2(a.yaw), r2(a.pitch), r2(a.crouch), r2(a.vel.x), r2(a.vel.z), a.alive ? 1 : 0, a.hp, a.team === 'T' ? 0 : 1, s?.id ?? '', s?.silenced ? 1 : 0, s?.skin ?? null, a.scope ?? 0, a.onGround ? 1 : 0, r2(a.flashUntil - g.time)]
      }),
      n: g.nades.map((n) => [n.id, n.type, n.item, r2(n.pos.x), r2(n.pos.y), r2(n.pos.z)]),
      sm: g.world.smokes.map((s) => [s.id, r2(s.x), r2(s.y), r2(s.z), r2(s.born), r2(s.until)]),
      fi: g.world.fires.map((s) => [s.id, r2(s.x), r2(s.y), r2(s.z), s.max, r2(s.born), r2(s.until)]),
      b: g.bomb ? [g.bomb.state, g.bomb.pos ? [r2(g.bomb.pos.x), r2(g.bomb.pos.y), r2(g.bomb.pos.z)] : null, r2(g.bomb.explodeAt ?? 0)] : null,
    }
    this.frames.push(f)
  }
  /** Game events worth replaying. */
  event(type, data) {
    const t = r2(this.game.time)
    const id = (a) => (a ? a.id : -1)
    if (type === 'tracer') this.events.push({ t, k: 'tracer', a: id(data.a), from: pt(data.from), to: pt(data.to), w: data.w?.id })
    else if (type === 'impact') this.events.push({ t, k: 'impact', at: pt(data.at), n: pt(data.normal), soft: !!data.soft })
    else if (type === 'detonate') this.events.push({ t, k: 'boom', at: pt(data.nade.pos), type: data.nade.type })
    else if (type === 'explode') this.events.push({ t, k: 'boom', at: pt(data.pos), type: 'bomb' })
    else if (type === 'kill') this.events.push({ t, k: 'kill', v: id(data.victim), a: id(data.attacker), w: data.weaponId, hs: !!data.headshot })
    else if (type === 'roundEnd') this.events.push({ t, k: 'round', winner: data.winner, reason: data.reason })
    else if (type === 'hit') this.events.push({ t, k: 'hit', v: id(data.victim), at: data.at ? pt(data.at) : null })
  }
  /** Everything, ready to save. */
  data() {
    return { v: 1, meta: { ...this.meta, rounds: this.game.round, score: { ...this.game.score }, winner: this.game.winner }, roster: this.roster, frames: this.frames, events: this.events }
  }
}
const pt = (p) => (p ? { x: r2(p.x), y: r2(p.y), z: r2(p.z) } : null)

/**
 * Plays a recording back as a ghost match. `rec` is Recorder.data() (or the recorder itself, for
 * the killcam). `fx` gets effects: { tracer(from, to), impact(at, n, soft), explosion(at, type), kill(e) }.
 */
export class Player {
  constructor(rec, map, fx = {}) {
    this.rec = rec
    this.fx = fx
    this.frames = rec.frames
    this.events = rec.events
    this.t0 = this.frames[0]?.t ?? 0
    this.t1 = this.frames[this.frames.length - 1]?.t ?? 0
    this.time = this.t0
    this.ev = 0
    this.speed = 1
    this.playing = true
    // the ghost: just enough of a Game for the view and the HUD
    const roster = rec.roster ?? []
    this.ghost = {
      map,
      time: this.t0,
      phase: 'live',
      round: 1,
      score: { T: 0, CT: 0 },
      phaseEnd: 0,
      nades: [],
      decoys: [],
      drops: [],
      bomb: { state: 'none', pos: null },
      world: { smokes: [], fires: [] },
      actors: roster.map((r) => ({
        id: r.id,
        name: r.name,
        team: r.team,
        isBot: r.bot,
        isPlayer: !r.bot,
        alive: true,
        hp: 100,
        pos: { x: 0, y: 0, z: 0 },
        vel: { x: 0, y: 0, z: 0 },
        yaw: 0,
        pitch: 0,
        crouch: 0,
        onGround: true,
        inv: { primary: null, pistol: null, knife: { id: 'knife' }, grenades: [], bomb: false },
        active: 'knife',
        scope: 0,
        reloadEnd: 0,
        switchEnd: 0,
        punch: { yaw: 0, pitch: 0 },
        flashUntil: 0,
        h: 1.83,
        r: 0.4,
      })),
    }
    this.seek(this.t0)
  }
  get duration() {
    return this.t1 - this.t0
  }
  /** Rounds: [{ round, t }] for jumping. */
  rounds() {
    const out = []
    let last = -1
    for (const f of this.frames)
      if (f.rd !== last) {
        out.push({ round: f.rd, t: f.t })
        last = f.rd
      }
    return out
  }
  seek(t) {
    this.time = Math.max(this.t0, Math.min(this.t1, t))
    this.ev = this.events.findIndex((e) => e.t >= this.time)
    if (this.ev < 0) this.ev = this.events.length
    this.apply(false)
  }
  /** Advances by dt (scaled by speed), firing effects for the events passed. */
  step(dt) {
    if (!this.playing) return this.apply(false)
    const t = Math.min(this.t1, this.time + dt * this.speed)
    while (this.ev < this.events.length && this.events[this.ev].t <= t) this.fire(this.events[this.ev++])
    this.time = t
    if (t >= this.t1) this.playing = false
    this.apply(true)
  }
  fire(e) {
    const fx = this.fx
    const g = this.ghost
    if (e.k === 'tracer') {
      fx.tracer?.(e.from, e.to, g.actors[e.a])
      fx.sound?.(WEAPONS[e.w]?.sound ?? 'pistol', e.from)
    } else if (e.k === 'impact') fx.impact?.(e.at, e.n, e.soft)
    else if (e.k === 'boom') fx.explosion?.(e.at, e.type)
    else if (e.k === 'kill') fx.kill?.({ victim: g.actors[e.v], attacker: g.actors[e.a] ?? null, weaponId: e.w, headshot: e.hs })
    else if (e.k === 'hit' && e.at) fx.blood?.(e.at)
    else if (e.k === 'round') fx.round?.(e)
  }
  /** Puts the ghost where the recording says, between frames. */
  apply() {
    const fr = this.frames
    if (!fr.length) return
    let lo = 0
    let hi = fr.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (fr[mid].t <= this.time) lo = mid
      else hi = mid
    }
    const A = fr[lo]
    const B = fr[hi]
    const k = B.t > A.t ? Math.max(0, Math.min(1, (this.time - A.t) / (B.t - A.t))) : 0
    const g = this.ghost
    g.time = this.time
    g.phase = A.ph
    g.round = A.rd
    g.score.T = A.sc[0]
    g.score.CT = A.sc[1]
    g.phaseEnd = A.pe < 0 ? Infinity : A.pe
    const lerp = (p, q) => p + (q - p) * k
    const lerpAng = (p, q) => p + Math.atan2(Math.sin(q - p), Math.cos(q - p)) * k
    A.a.forEach((ra, i) => {
      const a = g.actors[i]
      if (!a) return
      const rb = B.a[i] ?? ra
      const jump = Math.hypot(rb[0] - ra[0], rb[2] - ra[2]) > 4 // a respawn: don't slide across the map
      const kk = jump ? 0 : k
      a.pos.x = ra[0] + (rb[0] - ra[0]) * kk
      a.pos.y = ra[1] + (rb[1] - ra[1]) * kk
      a.pos.z = ra[2] + (rb[2] - ra[2]) * kk
      a.yaw = jump ? ra[3] : lerpAng(ra[3], rb[3])
      a.pitch = lerp(ra[4], rb[4])
      a.crouch = lerp(ra[5], rb[5])
      a.vel.x = ra[6]
      a.vel.z = ra[7]
      a.alive = !!ra[8]
      a.hp = ra[9]
      a.team = ra[10] ? 'CT' : 'T'
      const id = ra[11]
      a.scope = ra[14]
      a.onGround = !!ra[15]
      a.flashUntil = g.time + ra[16]
      if (id) {
        const w = WEAPONS[id]
        const slot = w?.slot === 'grenade' ? 'grenade' : id === 'bomb' ? 'bomb' : w?.slot ?? 'knife'
        a.active = slot
        if (slot === 'grenade') a.inv.grenades = [id]
        else if (slot === 'bomb') a.inv.bomb = true
        else a.inv[slot] = { id, clip: 1, reserve: 0, silenced: !!ra[12], skin: ra[13] }
      }
    })
    // grenades, smoke, fire, the bomb: keep the same objects between frames (the view tracks them)
    const keep = (old, rows, make, upd) => {
      const by = new Map(old.map((o) => [o.id, o]))
      return rows.map((r) => {
        const o = by.get(r[0]) ?? make(r)
        upd?.(o, r)
        return o
      })
    }
    g.nades = keep(g.nades, A.n, (r) => ({ id: r[0], type: r[1], item: r[2], pos: { x: r[3], y: r[4], z: r[5] } }), (o, r) => Object.assign(o.pos, { x: r[3], y: r[4], z: r[5] }))
    g.world.smokes = keep(g.world.smokes, A.sm, (r) => ({ id: r[0], x: r[1], y: r[2], z: r[3], born: r[4], until: r[5], r: 0 }))
    for (const s of g.world.smokes) {
      const age = g.time - s.born
      s.r = age < 1.5 ? 4.6 * (age / 1.5) : g.time > s.until - 2 ? 4.6 * Math.max(0, (s.until - g.time) / 2) : 4.6
    }
    g.world.fires = keep(g.world.fires, A.fi, (r) => ({ id: r[0], x: r[1], y: r[2], z: r[3], max: r[4], born: r[5], until: r[6], r: 0 }))
    for (const f of g.world.fires) f.r = Math.min(f.max, f.max * (0.35 + (g.time - f.born) / 0.8))
    if (A.b) {
      g.bomb.state = A.b[0]
      g.bomb.pos = A.b[1] ? { x: A.b[1][0], y: A.b[1][1], z: A.b[1][2] } : null
      g.bomb.explodeAt = A.b[2]
    }
  }
}

/** The last seconds before `time`, from a live recorder: a small recording for the killcam. */
export function clip(rec, from, to) {
  return { roster: rec.roster, frames: rec.frames.filter((f) => f.t >= from && f.t <= to), events: rec.events.filter((e) => e.t >= from && e.t <= to) }
}

// ---------------- Keeping the last few matches (IndexedDB)
const DB = 'strife-replays'
function db() {
  return new Promise((res, rej) => {
    const q = indexedDB.open(DB, 1)
    q.onupgradeneeded = () => q.result.createObjectStore('r', { keyPath: 'id' })
    q.onsuccess = () => res(q.result)
    q.onerror = () => rej(q.error)
  })
}
export async function saveReplay(data) {
  try {
    const d = await db()
    const id = data.meta.date
    await new Promise((res) => {
      const tx = d.transaction('r', 'readwrite')
      tx.objectStore('r').put({ id, meta: data.meta, json: JSON.stringify(data) })
      tx.oncomplete = res
      tx.onerror = res
    })
    // keep the five newest
    const all = await listReplays()
    for (const old of all.slice(5)) await deleteReplay(old.id)
  } catch {}
}
export async function listReplays() {
  try {
    const d = await db()
    return await new Promise((res) => {
      const out = []
      const tx = d.transaction('r', 'readonly')
      const cur = tx.objectStore('r').openCursor()
      cur.onsuccess = () => {
        const c = cur.result
        if (!c) return res(out.sort((a, b) => b.id - a.id))
        out.push({ id: c.value.id, meta: c.value.meta })
        c.continue()
      }
      cur.onerror = () => res(out)
    })
  } catch {
    return []
  }
}
export async function loadReplay(id) {
  const d = await db()
  return await new Promise((res, rej) => {
    const q = d.transaction('r', 'readonly').objectStore('r').get(id)
    q.onsuccess = () => res(q.result ? JSON.parse(q.result.json) : null)
    q.onerror = () => rej(q.error)
  })
}
export async function deleteReplay(id) {
  const d = await db()
  await new Promise((res) => {
    const tx = d.transaction('r', 'readwrite')
    tx.objectStore('r').delete(id)
    tx.oncomplete = res
    tx.onerror = res
  })
}
export { weaponOf }
