// Online play. One player hosts: their browser runs the real match (bots fill the empty slots)
// and sends everyone snapshots. Joining players move their own soldier and send what they do;
// a joiner takes over a bot's place, and a bot takes theirs back when they leave.
//
// Finding each other: a "hub" — Supabase realtime channels on nikstil.com (the lobby lists open
// games; each game has a channel for setting up connections), or BroadcastChannel between tabs
// of one browser (?net=local, also used by the tests). Game traffic then goes over a direct
// WebRTC data channel, or through the hub when a direct connection can't be made.

import { Brain } from './bots.js'
import { WEAPONS } from './weapons.js'
import { agentById } from './skins.js'

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }]
const SNAP_HZ = 20
const RELAY_HZ = 8
const uid = () => Math.random().toString(36).slice(2, 10)
export const makeCode = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('')

// ================= Hubs: rooms with presence and broadcast =================
/** Tabs of this browser (BroadcastChannel). Presence is a heartbeat. */
class LocalRoom {
  constructor(name, me, meta, h) {
    this.me = me
    this.meta = meta
    this.h = h
    this.peers = new Map() // id -> { meta, seen }
    this.bc = new BroadcastChannel('strife-net:' + name)
    this.bc.onmessage = (e) => this.recv(e.data)
    this.beat = setInterval(() => this.tick(), 700)
    this.post({ t: 'here', from: me, meta })
    setTimeout(() => h.onStatus?.(true), 0)
  }
  post(m) {
    try {
      this.bc.postMessage(m)
    } catch {}
  }
  tick() {
    this.post({ t: 'here', from: this.me, meta: this.meta })
    const now = Date.now()
    let changed = false
    for (const [id, p] of this.peers)
      if (now - p.seen > 6000) {
        this.peers.delete(id)
        changed = true
      }
    if (changed) this.h.onMembers?.(this.members())
  }
  recv(m) {
    if (m.from === this.me) return
    if (m.t === 'here') {
      const had = this.peers.get(m.from)
      this.peers.set(m.from, { meta: m.meta, seen: Date.now() })
      if (!had || JSON.stringify(had.meta) !== JSON.stringify(m.meta)) this.h.onMembers?.(this.members())
    } else if (m.t === 'bye') {
      this.peers.delete(m.from)
      this.h.onMembers?.(this.members())
    } else if (m.t === 'msg') this.h.onMessage?.(m.ev, m.p)
  }
  members() {
    return [...this.peers].map(([id, p]) => ({ id, ...p.meta }))
  }
  track(meta) {
    this.meta = meta
    this.post({ t: 'here', from: this.me, meta })
  }
  send(ev, p) {
    this.post({ t: 'msg', from: this.me, ev, p })
  }
  leave() {
    clearInterval(this.beat)
    this.post({ t: 'bye', from: this.me })
    this.bc.close()
  }
}

/** Supabase realtime: presence for who's here, broadcast for messages. */
class SupaRoom {
  constructor(client, name, me, meta, h) {
    this.me = me
    this.h = h
    this.client = client
    this.ch = client.channel('strife:' + name, { config: { broadcast: { self: false, ack: false }, presence: { key: me } } })
    this.ch
      .on('presence', { event: 'sync' }, () => h.onMembers?.(this.members()))
      .on('broadcast', { event: 'm' }, ({ payload }) => h.onMessage?.(payload.ev, payload.p))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.ch.track(meta)
          h.onStatus?.(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') h.onStatus?.(false)
      })
  }
  members() {
    const st = this.ch.presenceState()
    const out = []
    for (const [id, metas] of Object.entries(st)) if (id !== this.me && metas[0]) out.push({ id, ...metas[0] })
    return out
  }
  track(meta) {
    this.ch.track(meta)
  }
  send(ev, p) {
    this.ch.send({ type: 'broadcast', event: 'm', payload: { ev, p } })
  }
  leave() {
    this.client.removeChannel(this.ch)
  }
}

/** Which hub to use: tabs of this browser when asked (or when nikstil.com online is off). */
export async function openHub() {
  const q = new URLSearchParams(location.search)
  if (q.get('net') !== 'local') {
    try {
      const on = window.nikstilOnline
      if (on && (await on.configured)) {
        const client = await on.connect()
        return { kind: 'online', join: (name, me, meta, h) => new SupaRoom(client, name, me, meta, h) }
      }
    } catch {}
  }
  return { kind: 'local', join: (name, me, meta, h) => new LocalRoom(name, me, meta, h) }
}

// ================= A link between host and one player =================
/**
 * WebRTC when it connects; until then (or if it never does) messages go through the room.
 * The host side starts the connection (initiator).
 */
class Link {
  constructor(room, me, peer, initiator, onMsg, forceRelay = false) {
    this.room = room
    this.me = me
    this.peer = peer
    this.onMsg = onMsg
    this.mode = 'connecting'
    this.closed = false
    this.queue = []
    this.pendingIce = []
    this.forceRelay = forceRelay
    if (forceRelay || typeof RTCPeerConnection === 'undefined') {
      this.mode = 'relay'
      return
    }
    this.pc = new RTCPeerConnection({ iceServers: ICE })
    this.pc.onicecandidate = (e) => e.candidate && this.signal({ ice: e.candidate.toJSON() })
    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'failed') this.toRelay()
    }
    if (initiator) {
      this.attach(this.pc.createDataChannel('g', { ordered: true }))
      this.pc
        .createOffer()
        .then((o) => this.pc.setLocalDescription(o))
        .then(() => this.signal({ sdp: this.pc.localDescription.toJSON() }))
        .catch(() => this.toRelay())
    } else this.pc.ondatachannel = (e) => this.attach(e.channel)
    this.giveUp = setTimeout(() => this.mode === 'connecting' && this.toRelay(), 7000)
  }
  attach(dc) {
    this.dc = dc
    dc.onopen = () => {
      this.mode = 'p2p'
      clearTimeout(this.giveUp)
      for (const m of this.queue.splice(0)) dc.send(m)
    }
    dc.onmessage = (e) => this.recv(e.data)
    dc.onclose = () => {
      if (this.mode === 'p2p') this.toRelay()
    }
  }
  toRelay() {
    if (this.closed || this.mode === 'relay') return
    this.mode = 'relay'
    clearTimeout(this.giveUp)
    for (const m of this.queue.splice(0)) this.room.send('relay', { to: this.peer, from: this.me, d: m })
  }
  signal(data) {
    this.room.send('sig', { to: this.peer, from: this.me, ...data })
  }
  /** A setup message from the other side (offer/answer/ICE). */
  async onSignal(m) {
    if (!this.pc || this.closed) return
    try {
      if (m.sdp) {
        await this.pc.setRemoteDescription(m.sdp)
        if (m.sdp.type === 'offer') {
          await this.pc.setLocalDescription(await this.pc.createAnswer())
          this.signal({ sdp: this.pc.localDescription.toJSON() })
        }
        for (const c of this.pendingIce.splice(0)) await this.pc.addIceCandidate(c).catch(() => {})
      } else if (m.ice) {
        if (this.pc.remoteDescription) await this.pc.addIceCandidate(m.ice).catch(() => {})
        else this.pendingIce.push(m.ice)
      }
    } catch {
      this.toRelay()
    }
  }
  recv(raw) {
    let m
    try {
      m = JSON.parse(raw)
    } catch {
      return
    }
    this.onMsg(m)
  }
  send(obj) {
    if (this.closed) return
    const s = JSON.stringify(obj)
    if (this.mode === 'p2p' && this.dc?.readyState === 'open') this.dc.send(s)
    else if (this.mode === 'relay') this.room.send('relay', { to: this.peer, from: this.me, d: s })
    else this.queue.push(s)
  }
  get live() {
    return this.mode === 'p2p' || this.mode === 'relay'
  }
  close() {
    this.closed = true
    clearTimeout(this.giveUp)
    try {
      this.dc?.close()
      this.pc?.close()
    } catch {}
  }
}

// ================= Turning game objects into messages and back =================
const r2 = (v) => Math.round(v * 100) / 100
const r3 = (v) => Math.round(v * 1000) / 1000
/** Swap actor objects for { $a: id } (and drops/nades for plain data) so events can travel. */
function pack(v, depth = 0) {
  if (v == null || typeof v !== 'object') return v
  if (depth > 4) return null
  if (v.inv && v.pos && typeof v.id === 'number') return { $a: v.id }
  if (v.recoil && typeof v.id === 'string' && WEAPONS[v.id]) return { $w: v.id }
  if (Array.isArray(v)) return v.map((x) => pack(x, depth + 1))
  const o = {}
  for (const [k, x] of Object.entries(v)) {
    if (k === 'owner' || k === 'brain' || typeof x === 'function') {
      if (k === 'owner' && x?.id != null) o.owner = { $a: x.id }
      continue
    }
    o[k] = pack(x, depth + 1)
  }
  return o
}
function unpack(v, game) {
  if (v == null || typeof v !== 'object') return v
  if (v.$a != null) return game.actors[v.$a] ?? null
  if (v.$w != null) return WEAPONS[v.$w] ?? null
  if (Array.isArray(v)) return v.map((x) => unpack(x, game))
  const o = {}
  for (const [k, x] of Object.entries(v)) o[k] = unpack(x, game)
  return o
}

// Sounds a player's own browser already makes for them (so the host doesn't send them back).
const OWN_SOUNDS = new Set(['silenced', 'click', 'reload', 'swish', 'land', ...new Set(Object.values(WEAPONS).map((w) => w.sound).filter(Boolean))])
// Events a player's own browser already shows for them.
const OWN_EVENTS = new Set(['tracer', 'impact', 'shot', 'knife', 'mode', 'switch', 'reload'])
// Events everyone needs.
const EVENTS = ['chat', 'radio', 'respawn', 'levelUp', 'kill', 'hit', 'roundStart', 'live', 'roundEnd', 'planted', 'defused', 'explode', 'bombDropped', 'bombPicked', 'halftime', 'drop', 'dropRemoved', 'detonate', 'tracer', 'impact', 'knife', 'throw', 'plantStart', 'mode', 'shot', 'decoyEnd']
const ownerOf = (name, d) => d?.a ?? (name === 'tracer' || name === 'shot' ? d?.a : null) ?? d?.by ?? null

// ================= The host =================
export class NetHost {
  /**
   * hub: from openHub(). game: the running match. info: { code, name, map, size, onPeople(list) }.
   */
  constructor(hub, game, info) {
    this.hub = hub
    this.game = game
    this.info = info
    this.id = uid()
    this.code = info.code
    this.peers = new Map() // peer id -> { link, actor, out: [], name }
    this.acc = 0
    this.forceRelay = new URLSearchParams(location.search).get('relay') === '1'
    this.room = hub.join(this.code, this.id, { role: 'host', name: info.name }, {
      onMessage: (ev, p) => this.onRoom(ev, p),
      onMembers: (list) => this.onMembers(list),
    })
    this.lobby = hub.join('lobby', this.id, this.lobbyMeta(), {})
    this.wrapHooks()
  }
  lobbyMeta() {
    const g = this.game
    return { role: 'host', code: this.code, name: this.info.name, map: g.map.name, humans: 1 + this.peers.size, max: g.actors.length, round: g.round }
  }
  /** Every event the game emits also goes to the players, packed. */
  wrapHooks() {
    const g = this.game
    const orig = g.hooks
    const hooks = { ...orig }
    for (const name of EVENTS) {
      hooks[name] = (d) => {
        orig[name]?.(d)
        const who = ownerOf(name, d)
        let packed = null
        for (const p of this.peers.values()) {
          if (!p.actor) continue
          if (who && who === p.actor && OWN_EVENTS.has(name)) continue
          if (name === 'mode' && d.a !== p.actor) continue
          // team chat and the radio: that team only
          if ((name === 'chat' || name === 'radio') && d.team && d.team !== p.actor.team) continue
          packed ??= pack(d)
          p.out.push(['e', name, packed])
        }
      }
    }
    hooks.sound = (name, at, o = {}) => {
      orig.sound?.(name, at, o)
      for (const p of this.peers.values()) {
        if (!p.actor) continue
        if (o.who === p.actor && (OWN_SOUNDS.has(name) || name.startsWith('step'))) continue
        if (!at && o.who && o.who !== p.actor) continue
        p.out.push(['s', name, at ? { x: r2(at.x), y: r2(at.y), z: r2(at.z) } : null, { range: o.range, gain: o.gain, who: o.who ? o.who.id : undefined }])
      }
    }
    g.hooks = hooks
  }
  onMembers(list) {
    // someone gone from the room without saying bye: let a bot take over
    const here = new Set(list.map((m) => m.id))
    for (const [id, p] of this.peers) if (!here.has(id) && Date.now() - p.since > 8000) this.drop(id, 'left')
  }
  onRoom(ev, p) {
    if (!p || (p.to && p.to !== this.id)) return
    if (ev === 'hello') this.welcome(p)
    else if (ev === 'sig') this.peers.get(p.from)?.link.onSignal(p)
    else if (ev === 'relay') this.peers.get(p.from)?.link.recv(p.d)
    else if (ev === 'bye') this.drop(p.from, 'left')
  }
  /** A rematch: the same players, seated again in the new match. */
  setGame(game) {
    this.game = game
    this.wrapHooks()
    for (const p of this.peers.values()) {
      const actor = this.seat(p.team ?? p.actor.team, p.name, p.skins)
      if (!actor) continue
      p.actor = actor
      p.out.length = 0
      p.out.push(['w', this.welcomeData(actor)])
    }
    this.rosterChanged()
  }
  /** Turns a bot on `want`'s team (or the other) into a remote player. */
  seat(want, name, skins) {
    const g = this.game
    const pick = (t) => g.actors.find((a) => a.team === t && a.isBot)
    const actor = pick(want) ?? pick(want === 'T' ? 'CT' : 'T')
    if (!actor) return null
    actor.isBot = false
    actor.brain = null
    actor.remote = true
    actor.isPlayer = true
    actor.botName ??= actor.name
    actor.botRank ??= actor.rankTier ?? null
    actor.name = String(name || 'Player').slice(0, 20)
    actor.netSkins = skins && typeof skins === 'object' ? skins : {}
    // who they play as (their agents; anything unknown is the standard look)
    const ag = (id, team) => (agentById[id]?.team === team ? id : null)
    actor.agents = { T: ag(actor.netSkins.agentT, 'T'), CT: ag(actor.netSkins.agentCT, 'CT') }
    actor.netQueue = []
    for (const s of ['primary', 'pistol', 'knife']) if (actor.inv[s]) actor.inv[s].skin = actor.netSkins[actor.inv[s].id] ?? null
    return actor
  }
  /** A player knocks: find them a slot (a bot's), and connect. */
  welcome(p) {
    if (this.peers.has(p.from)) return
    const g = this.game
    const humans = (t) => g.actors.filter((a) => a.team === t && !a.isBot).length
    const want = p.team === 'T' || p.team === 'CT' ? p.team : humans('T') <= humans('CT') ? 'T' : 'CT'
    const actor = this.seat(want, p.name, p.skins)
    if (!actor) {
      this.room.send('full', { to: p.from })
      return
    }
    // the rank they show (on the scoreboard): a skill group 0-17, or none
    actor.rankTier = Number.isInteger(p.rank) && p.rank >= 0 && p.rank <= 17 ? p.rank : null
    const peer = { actor, out: [], name: actor.name, since: Date.now(), team: p.team, skins: actor.netSkins }
    peer.link = new Link(this.room, this.id, p.from, true, (m) => this.onLink(p.from, m), this.forceRelay)
    this.peers.set(p.from, peer)
    peer.out.push(['w', this.welcomeData(actor)])
    this.rosterChanged()
    this.info.onPeople?.(this.people())
    this.say(`${actor.name} joined the ${actor.team === 'T' ? 'Terrorists' : 'Counter-Terrorists'}`)
  }
  welcomeData(me) {
    const g = this.game
    return { me: me.id, map: this.info.mapId, mode: g.mode, rules: g.rules, roster: this.roster(), code: this.code, host: this.info.name }
  }
  roster() {
    return this.game.actors.map((a) => ({ id: a.id, name: a.name, team: a.team, bot: a.isBot, human: !a.isBot, rank: a.rankTier ?? null, ag: a.agents ?? null }))
  }
  rosterChanged() {
    const r = this.roster()
    for (const p of this.peers.values()) p.out.push(['r', r])
    this.lobby.track(this.lobbyMeta())
  }
  people() {
    return [...this.peers.values()].map((p) => ({ name: p.actor.name, team: p.actor.team, mode: p.link.mode }))
  }
  say(text) {
    for (const p of this.peers.values()) p.out.push(['m', text])
    this.info.onSay?.(text)
  }
  onLink(from, m) {
    const p = this.peers.get(from)
    if (!p) return
    if (m.k === 't' && typeof m.to === 'number') {
      // a trade message: for the host's player, or passed on to another player
      const me = this.game.player
      if (me && m.to === me.id) this.info.onTrade?.({ id: p.actor.id, name: p.actor.name }, m.m)
      else for (const q of this.peers.values()) if (q.actor.id === m.to) q.out.push(['t', p.actor.id, p.actor.name, m.m])
      return
    }
    if (m.k === 'say' && typeof m.text === 'string') return this.game.chat(p.actor, m.text.slice(0, 200), !!m.team)
    if (m.k === 'radio' && typeof m.id === 'string') return this.game.radio(p.actor, m.id)
    if (m.k === 'c' && Array.isArray(m.c)) {
      for (const c of m.c.slice(0, 20)) p.actor.netQueue.push(sanitize(c))
    } else if (m.k === 'bye') this.drop(from, 'left')
  }
  drop(id, why) {
    const p = this.peers.get(id)
    if (!p) return
    this.peers.delete(id)
    p.link.close()
    const a = p.actor
    a.remote = false
    a.isBot = true
    a.isPlayer = false
    a.netQueue = []
    this.say(`${a.name} ${why === 'left' ? 'left' : 'disconnected'}: a bot takes over`)
    a.name = a.botName ?? a.name
    a.rankTier = a.botRank ?? null
    a.brain = new Brain(this.game, a)
    this.rosterChanged()
    this.info.onPeople?.(this.people())
  }
  /** A trade message from the host's player to another player. */
  sendTrade(toId, m) {
    const me = this.game.player
    for (const q of this.peers.values()) if (q.actor.id === toId) q.out.push(['t', me?.id ?? -1, me?.name ?? 'Host', m])
  }
  /** Called every frame after game.update: sends snapshots at a steady rate. */
  tick(dt) {
    this.acc += dt
    const relayOnly = [...this.peers.values()].every((p) => p.link.mode === 'relay')
    const every = 1 / (relayOnly && this.peers.size ? RELAY_HZ : SNAP_HZ)
    if (this.acc < every) return
    this.acc = 0
    for (const p of this.peers.values()) {
      if (!p.link.live && p.out.length < 400) continue
      if (p.link.mode === 'relay' && (p.relayAcc = (p.relayAcc ?? 0) + 1) % Math.round(SNAP_HZ / RELAY_HZ) && !relayOnly) continue
      const out = p.out.splice(0)
      // in relay mode, footsteps are left out to save the hub
      const ev = p.link.mode === 'relay' ? out.filter((e) => !(e[0] === 's' && e[1].startsWith('step'))) : out
      p.link.send({ k: 's', s: snapshot(this.game, p.actor), ev })
    }
    if ((this.lobbyAcc = (this.lobbyAcc ?? 0) + 1) % (SNAP_HZ * 10) === 0) this.lobby.track(this.lobbyMeta())
  }
  close() {
    for (const p of this.peers.values()) {
      p.link.send({ k: 'end' })
      p.link.close()
    }
    this.room.send('end', {})
    setTimeout(() => {
      this.room.leave()
      this.lobby.leave()
    }, 200)
  }
}
/** Only the fields we expect, of the types we expect. */
function sanitize(c) {
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
  const o = { yaw: n(c.yaw), pitch: n(c.pitch), fire: !!c.fire, use: !!c.use, crouch: !!c.crouch, walk: !!c.walk, jump: !!c.jump, reload: !!c.reload, alt: !!c.alt, mode: !!c.mode, aim: !!c.aim, drop: !!c.drop, pickup: !!c.pickup, fx: 0, fz: 0 }
  if (typeof c.slot === 'string' && /^(primary|pistol|knife|grenade|bomb|last|zeus)$/.test(c.slot)) o.slot = c.slot
  if (typeof c.buy === 'string' && (WEAPONS[c.buy] || /^(vest|vesthelm|kit)$/.test(c.buy))) o.buy = c.buy
  const s = c.st
  if (s && [s.x, s.y, s.z, s.vx, s.vy, s.vz, s.c, s.h].every((v) => typeof v === 'number' && Number.isFinite(v)))
    o.st = { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz, c: Math.max(0, Math.min(1, s.c)), h: Math.max(1, Math.min(2, s.h)), g: !!s.g, seq: s.seq | 0 }
  return o
}
function gunOf(a) {
  const s = a.active === 'grenade' ? { id: a.inv.grenades[0] } : a.active === 'bomb' ? { id: 'bomb' } : a.inv[a.active]
  return s ? [s.id, s.silenced ? 1 : 0, s.skin ?? null] : null
}
/** What one player needs to see this moment of the match. */
function snapshot(g, me) {
  const b = g.bomb
  return {
    t: r3(g.time),
    ph: g.phase,
    pe: g.phaseEnd === Infinity ? -1 : r3(g.phaseEnd),
    rs: r3(g.roundStart),
    rd: g.round,
    sc: [g.score.T, g.score.CT],
    ht: g.halftimeDone,
    w: g.winner,
    b: { s: b.state, p: b.pos, si: b.site, x: b.explodeAt, c: b.carrier?.id ?? -1, d: b.defuser?.id ?? -1, de: b.defuseEnd ?? 0 },
    a: g.actors.map((a) => [
      a.id, a.team, a.alive ? 1 : 0, r3(a.pos.x), r3(a.pos.y), r3(a.pos.z), r3(a.yaw), r3(a.pitch), r2(a.crouch), r2(a.vel.x), r2(a.vel.y), r2(a.vel.z),
      a.hp, a.armor, a.helmet ? 1 : 0, a.kit ? 1 : 0, a.money, a.kills, a.deaths, a.assists, a.mvps, a.active, gunOf(a), r2(a.plant), r2(a.defuse), a.inv.bomb ? 1 : 0, a.arLevel ?? 0,
    ]),
    rc: g.retakeCard ?? null,
    you: { ra: me.respawnAt ?? 0, inv: a2inv(me.inv), seq: me.spawnSeq, x: me.pos.x, y: me.pos.y, z: me.pos.z, fu: me.flashUntil, ff: me.flashFull, rk: me.roundKills },
    n: g.nades.map((n) => [n.id, n.type, n.item, r2(n.pos.x), r2(n.pos.y), r2(n.pos.z)]),
    sm: g.world.smokes.map((s) => [s.id, r2(s.x), r2(s.y), r2(s.z), r3(s.born), r3(s.until)]),
    f: g.world.fires.map((f) => [f.id, r2(f.x), r2(f.y), r2(f.z), f.max, r3(f.born), r3(f.until), f.owner?.id ?? -1]),
    dc: g.decoys.map((d) => [d.id, r2(d.pos.x), r2(d.pos.y), r2(d.pos.z)]),
  }
}
const a2inv = (inv) => ({ primary: inv.primary, pistol: inv.pistol, knife: inv.knife, zeus: inv.zeus ?? null, grenades: inv.grenades, bomb: inv.bomb })

// ================= A joining player =================
export class NetClient {
  /**
   * info: { code, name, team, skins, onWelcome(data), onEnd(why), onSay(text) }
   */
  constructor(hub, info) {
    this.hub = hub
    this.info = info
    this.id = uid()
    this.game = null
    this.hostId = null
    this.sent = []
    this.acc = 0
    this.link = null
    this.lastHeard = Date.now()
    this.forceRelay = new URLSearchParams(location.search).get('relay') === '1'
    this.room = hub.join(info.code, this.id, { role: 'client', name: info.name }, {
      onMessage: (ev, p) => this.onRoom(ev, p),
      onMembers: (list) => this.onMembers(list),
      onStatus: (ok) => !ok && this.end('Couldn’t reach the game.'),
    })
    this.knockTimer = setInterval(() => this.knock(), 1200)
    this.giveUp = setTimeout(() => !this.game && this.end('No game with that code is running.'), 12000)
  }
  onMembers(list) {
    const host = list.find((m) => m.role === 'host')
    if (host && !this.hostId) {
      this.hostId = host.id
      this.knock()
    }
    if (this.hostId && this.game && !list.some((m) => m.id === this.hostId)) this.end('The host left the game.')
  }
  knock() {
    if (!this.hostId || this.link) return
    this.room.send('hello', { to: this.hostId, from: this.id, name: this.info.name, team: this.info.team, skins: this.info.skins, rank: this.info.rank ?? null })
    this.link = new Link(this.room, this.id, this.hostId, false, (m) => this.onLink(m), this.forceRelay)
    clearInterval(this.knockTimer)
  }
  onRoom(ev, p) {
    if (!p) return
    if (ev === 'end') return this.end('The host ended the game.')
    if (p.to && p.to !== this.id) return
    if (ev === 'sig' && p.from === this.hostId) this.link?.onSignal(p)
    else if (ev === 'relay' && p.from === this.hostId) {
      if (this.link && this.link.mode === 'connecting') this.link.toRelay()
      this.link?.recv(p.d)
    } else if (ev === 'full') this.end('That game is full.')
  }
  onLink(m) {
    this.lastHeard = Date.now()
    if (m.k === 'end') return this.end('The host ended the game.')
    if (m.k !== 's') return
    // events first (a welcome comes this way), then the snapshot
    for (const e of m.ev ?? []) {
      if (e[0] === 'w') {
        clearTimeout(this.giveUp)
        this.game = this.info.onWelcome(e[1])
        this.game.onClientBuy = (id) => (this.pendingBuy = id)
      }
    }
    if (!this.game) return
    applySnapshot(this.game, m.s)
    for (const e of m.ev ?? []) {
      if (e[0] === 'e') {
        let d = unpack(e[2], this.game)
        // dropped guns: keep our own list, and hand the view the same object back when it goes
        if (e[1] === 'drop') this.game.drops.push(d)
        else if (e[1] === 'dropRemoved') {
          const i = this.game.drops.findIndex((x) => x.uid === d.uid)
          if (i < 0) continue
          d = this.game.drops.splice(i, 1)[0]
        }
        this.game.emit(e[1], d)
      }
      else if (e[0] === 's') {
        const o = e[3] ?? {}
        this.game.sound(e[1], e[2], { range: o.range, gain: o.gain, who: o.who != null ? this.game.actors[o.who] : undefined })
      } else if (e[0] === 't') this.info.onTrade?.({ id: e[1], name: e[2] }, e[3])
      else if (e[0] === 'r') applyRoster(this.game, e[1])
      else if (e[0] === 'm') this.info.onSay?.(e[1])
    }
  }
  sendTrade(toId, m) {
    this.link?.send({ k: 't', to: toId, m })
  }
  /** Chat and radio go to the host, who sends them on to everyone (it's the host's bots that answer). */
  sendChat(text, team) {
    this.link?.send({ k: 'say', text, team: !!team })
  }
  sendRadio(id) {
    this.link?.send({ k: 'radio', id })
  }
  /** Called every frame after game.update with the input used: batches it for the host. */
  tick(dt, input) {
    const g = this.game
    if (!g || !g.player) return
    const a = g.player
    const c = { ...input, fx: undefined, fz: undefined }
    if (this.pendingBuy) {
      c.buy = this.pendingBuy
      this.pendingBuy = null
    }
    c.st = { x: a.pos.x, y: a.pos.y, z: a.pos.z, vx: a.vel.x, vy: a.vel.y, vz: a.vel.z, c: a.crouch, h: a.h, g: a.onGround, seq: a.spawnSeq }
    this.sent.push(c)
    this.acc += dt
    const every = this.link?.mode === 'relay' ? 1 / 10 : 1 / 30
    if (this.acc >= every && this.link?.live) {
      this.acc = 0
      // in relay mode, merge the batch into fewer commands (edges kept)
      let batch = this.sent.splice(0)
      if (this.link.mode === 'relay' && batch.length > 3) batch = squash(batch)
      this.link.send({ k: 'c', c: batch })
    }
    if (this.game && Date.now() - this.lastHeard > 10000) this.end('Lost the connection to the host.')
  }
  get mode() {
    return this.link?.mode ?? 'connecting'
  }
  end(why) {
    if (this.ended) return
    this.ended = true
    clearInterval(this.knockTimer)
    clearTimeout(this.giveUp)
    this.info.onEnd?.(why)
    this.close()
  }
  close() {
    try {
      this.link?.send({ k: 'bye' })
      this.room.send('bye', { from: this.id, to: this.hostId })
    } catch {}
    setTimeout(() => {
      this.link?.close()
      this.room.leave()
    }, 150)
  }
}
/** Merge many commands into three, keeping one-off presses. */
function squash(batch) {
  const last = batch[batch.length - 1]
  const edge = {}
  for (const c of batch) for (const k of ['reload', 'alt', 'mode', 'drop', 'pickup', 'jump']) if (c[k]) edge[k] = true
  const slot = batch.findLast((c) => c.slot)?.slot
  const buy = batch.find((c) => c.buy)?.buy
  const fired = batch.some((c) => c.fire)
  return [{ ...batch[0], fire: fired }, { ...batch[Math.floor(batch.length / 2)], fire: fired }, { ...last, ...edge, slot, buy, fire: last.fire }]
}

/** Client: the host's word on the state of the match. */
export function applySnapshot(g, s) {
  const lag = s.t - g.time
  if (Math.abs(lag) > 0.3) g.time = s.t
  else g.time += lag * 0.2
  g.phase = s.ph
  g.phaseEnd = s.pe < 0 ? Infinity : s.pe
  g.roundStart = s.rs
  if (s.rd !== g.round) g.round = s.rd
  g.score.T = s.sc[0]
  g.score.CT = s.sc[1]
  g.halftimeDone = s.ht
  g.winner = s.w
  const b = g.bomb
  b.state = s.b.s
  b.pos = s.b.p
  b.site = s.b.si
  b.explodeAt = s.b.x
  b.carrier = s.b.c >= 0 ? g.actors[s.b.c] : null
  b.defuser = s.b.d >= 0 ? g.actors[s.b.d] : null
  b.defuseEnd = s.b.de
  const me = g.player
  for (const r of s.a) {
    const a = g.actors[r[0]]
    if (!a) continue
    const wasAlive = a.alive
    a.team = r[1]
    a.alive = !!r[2]
    a.hp = r[12]
    a.armor = r[13]
    a.helmet = !!r[14]
    a.kit = !!r[15]
    a.money = r[16]
    a.kills = r[17]
    a.deaths = r[18]
    a.assists = r[19]
    a.mvps = r[20]
    a.plant = r[23]
    a.arLevel = r[26] ?? 0
    a.defuse = r[24]
    if (!a.alive && wasAlive) a.deadAt = g.time
    if (a === me) continue
    a.net = { x: r[3], y: r[4], z: r[5], yaw: r[6], pitch: r[7], crouch: r[8], vx: r[9], vy: r[10], vz: r[11], at: g.time }
    if (!wasAlive && a.alive) {
      a.pos.x = r[3]
      a.pos.y = r[4]
      a.pos.z = r[5]
      a.yaw = r[6]
    }
    a.active = r[21]
    // what they're holding (for the model in their hands)
    const gun = r[22]
    if (gun) {
      const [id, sil, skin] = gun
      const slot = a.active
      if (slot === 'grenade') a.inv.grenades = [id]
      else if (slot === 'bomb') a.inv.bomb = true
      else a.inv[slot] = { id, clip: 1, reserve: 0, silenced: !!sil, skin }
    }
    a.inv.bomb = !!r[25]
  }
  if (me) {
    const y = s.you
    // a gun we just bought or picked up goes straight into our hands
    const got = ['primary', 'pistol'].find((k) => y.inv[k] && y.inv[k].id !== me.inv[k]?.id)
    me.inv.primary = y.inv.primary
    me.inv.pistol = y.inv.pistol
    me.inv.knife = y.inv.knife
    me.inv.zeus = y.inv.zeus
    me.inv.grenades = y.inv.grenades
    me.inv.bomb = y.inv.bomb
    me.flashUntil = y.fu
    me.flashFull = y.ff
    me.roundKills = y.rk
    me.respawnAt = y.ra
    g.retakeCard = s.rc
    // a new round (or the host moved us): go where the host says
    if (y.seq !== me.spawnSeq) {
      me.spawnSeq = y.seq
      me.pos.x = y.x
      me.pos.y = y.y
      me.pos.z = y.z
      me.vel.x = me.vel.y = me.vel.z = 0
      me.yaw = Math.atan2(-(g.map.w / 2 - me.pos.x), -(g.map.d / 2 - me.pos.z))
      me.netTeleport = true
    }
    if (got && me.alive) g.switchTo(me, got, true)
    // holding something we no longer have? take out the best thing we do have
    const slot = me.active
    const has = slot === 'grenade' ? me.inv.grenades.length : slot === 'bomb' ? me.inv.bomb : !!me.inv[slot]
    if (!has) g.switchTo(me, me.inv.primary ? 'primary' : me.inv.pistol ? 'pistol' : 'knife', true)
  }
  // grenades in the air, smoke, fire, decoys: keep the same objects (the view tracks them)
  g.nades = syncList(g.nades, s.n, (r) => ({ id: r[0], type: r[1], item: r[2], pos: { x: r[3], y: r[4], z: r[5] }, vel: { x: 0, y: 0, z: 0 } }), (o, r) => {
    o.pos.x = r[3]
    o.pos.y = r[4]
    o.pos.z = r[5]
  })
  g.world.smokes = syncList(g.world.smokes, s.sm, (r) => ({ id: r[0], x: r[1], y: r[2], z: r[3], born: r[4], until: r[5], r: 0 }))
  g.world.fires = syncList(g.world.fires, s.f, (r) => ({ id: r[0], x: r[1], y: r[2], z: r[3], max: r[4], born: r[5], until: r[6], r: 0, owner: g.actors[r[7]] ?? { team: '' } }))
  g.decoys = syncList(g.decoys, s.dc, (r) => ({ id: r[0], pos: { x: r[1], y: r[2], z: r[3] } }))
}
function syncList(old, rows, make, update) {
  const byId = new Map(old.map((o) => [o.id, o]))
  return rows.map((r) => {
    const o = byId.get(r[0])
    if (!o) return make(r)
    update?.(o, r)
    return o
  })
}
export function applyRoster(g, roster) {
  for (const r of roster) {
    const a = g.actors[r.id]
    if (!a) continue
    a.name = r.name
    a.team = r.team
    a.isBot = r.bot
    a.isPlayer = !r.bot
    a.rankTier = r.rank ?? null
    a.agents = r.ag ?? null
  }
}
