// The match: everyone's bodies and guns, rounds, money, the bomb. Pure simulation: drawing and
// sound go through `hooks` (see app.js), so a whole match can also run headless (for tests).

import { World, GRAVITY } from './world.js'
import { WEAPONS, GEAR, ECONOMY, MAX_GRENADES, applyDamage, adsOf } from './weapons.js'
import { Brain, planRound } from './bots.js'
import { Chatter, RADIO } from './radio.js'

export const STAND_H = 1.83
export const CROUCH_H = 1.37
export const EYE = 1.63
export const CROUCH_EYE = 1.17
const JUMP_V = 7.4
const ACCEL = 5.5
const FRICTION = 5.2
const STOP_SPEED = 2.0

export const RULES = { freeze: 7, roundTime: 115, bombTime: 40, plantTime: 3.2, defuseTime: 10, kitTime: 5, buyTime: 25, postRound: 5, roundsToWin: 9 }

/** The ways to play. Respawn modes have no rounds and no bomb. */
export const MODES = {
  competitive: { name: 'Competitive', blurb: 'Bomb defusal, first to the round limit', bomb: true },
  wingman: { name: 'Wingman', blurb: '2v2 on a single bombsite', bomb: true, size: 2, rules: { roundTime: 90, freeze: 6 } },
  retakes: { name: 'Retakes', blurb: 'The bomb is down: Ts hold the site, CTs take it back', bomb: true, retakes: true, rules: { freeze: 3, roundTime: 60, postRound: 4 } },
  deathmatch: { name: 'Deathmatch', blurb: 'Respawns, free guns, first team to 60 kills', respawn: true, rules: { freeze: 3, matchTime: 480, killsToWin: 60 } },
  armsrace: { name: 'Arms Race', blurb: 'Each kill gives you the next gun; win with the golden knife', respawn: true, armsrace: true, rules: { freeze: 3, matchTime: 900 } },
}
export const MODE_LIST = Object.keys(MODES)
/** Arms Race: every kill moves you one gun down the list; a knife kill with the last one wins. */
export const ARMS_LADDER = ['m4a1s', 'ak47', 'famas', 'galil', 'aug', 'sg553', 'p90', 'mp7', 'ump45', 'mac10', 'mag7', 'nova', 'negev', 'awp', 'ssg08', 'deagle', 'fiveseven', 'tec9', 'glock', 'knife']

const T_NAMES = ['Vinnie', 'CryptoKaren', 'xX_N00bSlayer_Xx', 'Grandma1947', 'Gary', 'Kevin (Sales)', 'TheAlgorithm', 'Chad', 'Lil Spreadsheet', 'Mr. Pop-Up']
const CT_NAMES = ['Sir Scratchington', 'Motivational Eagle', 'Doom Daily', 'Brenda (HR)', 'The Founder & CEO', 'Steve', 'Officer Cookie', 'Ad-Block Andy', 'Captain Captcha', 'Dave']

const smooth = (a, b, x) => Math.max(0, Math.min(1, (x - a) / (b - a)))

export function makeActor(id, name, team, isBot) {
  return {
    id,
    name,
    team,
    isBot,
    isPlayer: !isBot,
    pos: { x: 0, y: 0, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    r: 0.4,
    h: STAND_H,
    onGround: true,
    crouch: 0,
    crouching: false,
    walking: false,
    airTuck: false,
    hp: 100,
    armor: 0,
    helmet: false,
    kit: false,
    money: ECONOMY.start,
    alive: true,
    inv: null,
    active: 'pistol',
    lastActive: 'knife',
    nextFire: 0,
    reloadEnd: 0,
    switchEnd: 0,
    recoil: 0,
    lastShot: -9,
    trigger: false,
    scope: 0,
    ads: 0, // 0 (from the hip) to 1 (looking down the sights)
    aiming: false,
    punch: { yaw: 0, pitch: 0 },
    flashUntil: 0,
    flashFull: 0,
    slowUntil: 0,
    stepDist: 0,
    moveSpeed: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    mvps: 0,
    roundKills: 0,
    damageBy: {},
    plant: 0,
    defuse: 0,
    deadAt: 0,
    brain: null,
    spawnSeq: 0,
    remote: false,
    netQueue: [],
  }
}

export const eyeOf = (a) => ({ x: a.pos.x, y: a.pos.y + EYE + (CROUCH_EYE - EYE) * a.crouch, z: a.pos.z })
export const chestOf = (a) => ({ x: a.pos.x, y: a.pos.y + a.h * 0.62, z: a.pos.z })
export const headOf = (a) => ({ x: a.pos.x, y: a.pos.y + a.h - 0.14, z: a.pos.z })
export const dirOf = (yaw, pitch) => ({ x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) })
export const weaponOf = (a) => {
  const s = a.inv[a.active]
  if (a.active === 'grenade') return WEAPONS[a.inv.grenades[0]] ?? null
  if (a.active === 'bomb') return a.inv.bomb ? WEAPONS.bomb : null
  return s ? WEAPONS[s.id] : null
}
const gun = (id, skin = null) => ({ id, clip: WEAPONS[id].mag, reserve: WEAPONS[id].reserve, silenced: !!WEAPONS[id].silenced, burst: false, skin })
const defaultPistol = (team) => gun(team === 'T' ? 'glock' : 'usp')
const DEFAULT_PISTOLS = ['glock', 'usp', 'p2000']

export class Game {
  /**
   * opts: { map, team: 'T'|'CT'|null (null: no human, bots only), size (per team),
   *         difficulty (0-3), rules, seed, hooks }
   */
  constructor(opts) {
    this.opts = opts
    this.mode = MODES[opts.mode] ? opts.mode : 'competitive'
    this.modeDef = MODES[this.mode]
    this.respawns = !!this.modeDef.respawn
    this.rules = { ...RULES, ...(this.modeDef.rules ?? {}), ...(opts.rules ?? {}) }
    this.map = opts.map
    // Wingman plays on one site only (the map can say which; B otherwise).
    const wingSite = opts.map.wingman ?? 'B'
    this.sites = this.mode === 'wingman' ? { [wingSite]: opts.map.sites[wingSite] } : opts.map.sites
    this.world = new World(opts.map)
    this.hooks = opts.hooks ?? {}
    this.skinFor = opts.skinFor ?? null // (actor, weaponId) => skin descriptor or null
    // Online: the host runs the real match; a client only moves its own soldier and draws
    // what the host sends (see net.js).
    this.netRole = opts.netRole ?? null
    this.client = this.netRole === 'client'
    this.difficulty = opts.difficulty ?? 1
    // the bots' radio and chat (the host's, on a client)
    this.chatter = this.client ? null : new Chatter(this)
    this.time = 0
    this.round = 0
    this.score = { T: 0, CT: 0 }
    this.lossStreak = { T: 0, CT: 0 }
    this.phase = 'freeze'
    this.phaseEnd = 0
    this.roundStart = 0
    this.actors = []
    this.nades = []
    this.decoys = []
    this.drops = []
    this.bomb = null
    this.intel = { T: [], CT: [] } // recent sightings: { pos, at, id }
    this.noises = []
    this.winner = null
    this.halftimeDone = false
    this.plan = null
    this.practice = !!opts.practice
    const size = this.practice ? (opts.team ? 1 : 0) : this.modeDef.size ?? opts.size ?? 5
    let id = 0
    const names = { T: [...T_NAMES].sort(() => Math.random() - 0.5), CT: [...CT_NAMES].sort(() => Math.random() - 0.5) }
    if (opts.roster) {
      // an online client: the host's line-up, no brains
      for (const r of opts.roster) {
        const a = makeActor(r.id, r.name, r.team, r.bot)
        a.isPlayer = !r.bot
        a.rankTier = r.rank ?? null
        this.actors.push(a)
      }
      this.player = this.actors.find((a) => a.id === opts.myId) ?? null
    } else if (opts.team) {
      this.player = makeActor(id++, opts.playerName ?? 'You', opts.team, false)
      this.actors.push(this.player)
    }
    for (const team of opts.roster ? [] : ['T', 'CT']) {
      const count = this.practice ? 0 : size - (opts.team === team ? 1 : 0)
      for (let k = 0; k < count; k++) {
        const a = makeActor(id++, names[team][k % names[team].length], team, true)
        a.brain = new Brain(this, a)
        this.actors.push(a)
      }
    }
    for (const a of this.actors) {
      a.inv = { primary: null, pistol: defaultPistol(a.team), knife: { id: 'knife' }, grenades: [], bomb: false }
      this.applySkins(a)
    }
    this.startRound()
    // an online client waits for the host to say where everyone is
    if (this.client) for (const a of this.actors) a.spawnSeq = -1
  }

  emit(name, data) {
    this.hooks[name]?.(data)
    this.chatter?.on(name, data)
  }
  /** A chat line (teamOnly: just their team sees it). Bots may answer a player. */
  chat(a, text, teamOnly = false) {
    text = String(text ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120)
    if (!a || !text) return
    if (!a.isBot) {
      // a few lines in a row are fine; a flood isn't
      a.chatTimes = (a.chatTimes ?? []).filter((t) => this.time - t < 4)
      if (a.chatTimes.length >= 3) return
      a.chatTimes.push(this.time)
    }
    this.emit('chat', { a, text, team: teamOnly ? a.team : null, dead: !a.alive })
    if (!a.isBot) this.chatter?.heard(a, text, teamOnly)
  }
  /** A radio command: the team hears it, and the bots act on orders. place: where (a callout). */
  radio(a, id, place) {
    if (!a || !RADIO[id] || !a.alive) return
    if (!a.isBot) {
      if (this.time < (a.radioNext ?? 0)) return
      a.radioNext = this.time + 0.8
    }
    if (place === undefined) place = this.world.calloutAt(a.pos.x, a.pos.z, a.pos.y)
    this.emit('radio', { a, id, team: a.team, place: place || '' })
    if (!a.isBot) this.chatter?.order(a, id)
  }
  sound(name, at, opts = {}) {
    this.hooks.sound?.(name, at, opts)
  }
  /** A noise bots can hear. */
  noise(at, team, loud) {
    this.noises.push({ x: at.x, y: at.y, z: at.z, team, loud, at: this.time })
  }

  // ================= Rounds =================
  get roundTimeLeft() {
    return this.phase === 'live' ? Math.max(0, this.phaseEnd - this.time) : this.phase === 'freeze' ? this.rules.roundTime : 0
  }
  get halftimeAt() {
    return this.rules.roundsToWin - 1
  }
  startRound() {
    this.round++
    const w = this.world
    w.smokes.length = 0
    this.nades.length = 0
    this.decoys.length = 0
    w.fires.length = 0
    for (const a of this.actors) a.inv && (a.inv.zeus ??= null)
    for (const d of this.drops) this.emit('dropRemoved', d)
    this.drops.length = 0
    this.intel = { T: [], CT: [] }
    this.noises.length = 0
    const spawnIdx = { T: 0, CT: 0 }
    const order = [...this.actors].sort(() => Math.random() - 0.5)
    for (const a of order) {
      const pts = this.map.spawns[a.team]
      const [sx, sz, sy] = pts[spawnIdx[a.team]++ % pts.length]
      a.pos.x = sx + 0.5
      a.pos.z = sz + 0.5
      a.pos.y = w.floorAt(a.pos.x, a.pos.z, sy == null ? 50 : sy + 1)
      a.spawnSeq = (a.spawnSeq ?? 0) + 1
      a.vel.x = a.vel.y = a.vel.z = 0
      // face the map's middle
      a.yaw = Math.atan2(-(this.map.w / 2 - a.pos.x), -(this.map.d / 2 - a.pos.z))
      a.pitch = 0
      if (!a.alive) {
        a.inv = { primary: null, pistol: defaultPistol(a.team), knife: { id: 'knife' }, grenades: [], bomb: false }
        this.applySkins(a)
        a.armor = 0
        a.helmet = false
        a.kit = false
      }
      a.inv.bomb = false
      a.alive = true
      a.hp = 100
      a.crouch = 0
      a.crouching = false
      a.h = STAND_H
      a.onGround = true
      a.scope = 0
      a.ads = 0
      a.flashUntil = 0
      a.plant = a.defuse = 0
      a.reloadEnd = a.switchEnd = 0
      a.recoil = 0
      a.roundKills = 0
      a.damageBy = {}
      a.active = a.inv.primary ? 'primary' : 'pistol'
      // refill ammo for survivors
      for (const s of ['primary', 'pistol']) if (a.inv[s]) a.inv[s].reserve = Math.max(a.inv[s].reserve, WEAPONS[a.inv[s].id].reserve)
    }
    // The bomb goes to a random Terrorist.
    const ts = this.actors.filter((a) => a.team === 'T')
    const carrier = this.modeDef.bomb && !this.modeDef.retakes ? ts[Math.floor(Math.random() * ts.length)] : null
    if (carrier && !this.practice) carrier.inv.bomb = true
    this.bomb = { state: carrier && !this.practice ? 'carried' : 'none', carrier, pos: null, site: null, explodeAt: 0, nextBeep: 0, defuser: null }
    if (this.modeDef.retakes && !this.practice) this.setupRetake()
    if (this.respawns) for (const a of this.actors) this.respawn(a, true)
    if (this.practice) for (const a of this.actors) a.money = ECONOMY.max
    this.phase = 'freeze'
    this.phaseEnd = this.time + (this.practice ? 0.5 : this.rules.freeze)
    this.roundStart = this.time
    this.plan = planRound(this)
    for (const a of this.actors) a.brain?.newRound()
    this.emit('roundStart', { round: this.round })
  }

  // ================= Modes =================
  /** Retakes: the bomb is already planted on a site, Ts are on it, everyone gets a loadout. */
  setupRetake() {
    const m = this.map
    const site = Math.random() < 0.5 ? 'A' : 'B'
    const spot = m.plant[site][Math.floor(Math.random() * m.plant[site].length)]
    const w = this.world
    const pos = { x: spot[0] + 0.5, y: w.floorAt(spot[0] + 0.5, spot[1] + 0.5, spot[2] == null ? 50 : spot[2] + 1), z: spot[1] + 0.5 }
    this.bomb = { state: 'planted', carrier: null, pos, site, explodeAt: this.time + this.rules.freeze + this.rules.bombTime, nextBeep: 0, defuser: null, planter: null }
    const posts = m.posts[site]
    const card = ['full', 'full', 'force', 'pistol'][Math.floor(Math.random() * 4)]
    this.retakeCard = card
    let k = 0
    for (const a of this.actors) {
      if (a.team === 'T') {
        const p = posts[k++ % posts.length].at
        a.pos.x = p[0] + 0.5 + (Math.random() - 0.5) * 0.6
        a.pos.z = p[1] + 0.5 + (Math.random() - 0.5) * 0.6
        a.pos.y = w.floorAt(a.pos.x, a.pos.z, p[2] == null ? 50 : p[2] + 1)
      }
      // the loadout for this round
      const T = a.team === 'T'
      const pick = (list) => list[Math.floor(Math.random() * list.length)]
      a.inv.primary = card === 'full' ? gun(pick(T ? ['ak47', 'ak47', 'sg553', 'galil'] : ['m4a4', 'm4a1s', 'aug', 'famas']), a.inv.primary?.skin ?? null) : card === 'force' ? gun(pick(T ? ['mac10', 'ump45', 'xm1014', 'galil'] : ['mp9', 'ump45', 'famas', 'mag7'])) : null
      if (a.inv.primary) a.inv.primary.skin = this.skinFor?.(a, a.inv.primary.id) ?? null
      if (card === 'pistol') a.inv.pistol = gun(pick(T ? ['tec9', 'deagle', 'p250'] : ['fiveseven', 'deagle', 'p250']), this.skinFor?.(a, 'deagle') ?? null)
      a.armor = 100
      a.helmet = card !== 'pistol'
      a.kit = !T && Math.random() < 0.6
      a.inv.grenades = card === 'pistol' ? ['flash'] : [pick(['smoke', 'flash', 'he']), T ? 'molotov' : 'incendiary'].slice(0, card === 'full' ? 2 : 1)
      a.active = a.inv.primary ? 'primary' : 'pistol'
    }
    this.emit('planted', { a: null, site, pos, retake: true })
  }
  /** Respawn modes: back in, away from the enemy, with a gun. */
  respawn(a, first = false) {
    const w = this.world
    const m = this.map
    const foes = this.actors.filter((b) => b.alive && b.team !== a.team && b !== a)
    const cands = [...m.spawns.T, ...m.spawns.CT, ...Object.values(m.holds).flat().map((h) => h.at), ...Object.values(m.posts).flat().map((h) => h.at), ...m.plant.A, ...m.plant.B]
    const scored = cands
      .map((p) => {
        const x = p[0] + 0.5
        const z = p[1] + 0.5
        const y = w.floorAt(x, z, p[2] == null ? 50 : p[2] + 1)
        const near = foes.reduce((d, b) => Math.min(d, Math.hypot(b.pos.x - x, b.pos.z - z) + (w.sees({ x, y: y + 1.6, z }, { x: b.pos.x, y: b.pos.y + 1.5, z: b.pos.z }) ? -15 : 0)), 99)
        return { x, y, z, near: near + Math.random() * 6 }
      })
      .sort((p, q) => q.near - p.near)
    const at = first ? scored[Math.floor(Math.random() * Math.min(scored.length, 12))] : scored[Math.floor(Math.random() * Math.max(1, Math.floor(scored.length / 3)))]
    a.pos.x = at.x
    a.pos.y = at.y
    a.pos.z = at.z
    a.vel.x = a.vel.y = a.vel.z = 0
    a.yaw = Math.random() * Math.PI * 2
    a.pitch = 0
    a.spawnSeq = (a.spawnSeq ?? 0) + 1
    a.alive = true
    a.hp = 100
    a.armor = 100
    a.helmet = true
    a.crouch = 0
    a.h = STAND_H
    a.onGround = true
    a.scope = 0
    a.ads = 0
    a.flashUntil = a.flashFull = 0
    a.reloadEnd = a.switchEnd = 0
    a.recoil = 0
    a.damageBy = {}
    a.protectUntil = this.time + (first ? 0 : 1.5)
    a.inv = { primary: null, pistol: defaultPistol(a.team), knife: { id: 'knife' }, grenades: [], bomb: false, zeus: null }
    this.applySkins(a)
    if (this.modeDef.armsrace) this.armsWeapon(a)
    else {
      // Deathmatch: your last pick (or a rifle)
      const pick = a.dmPick ?? (a.isBot ? ['ak47', 'm4a4', 'm4a1s', 'awp', 'p90', 'sg553', 'aug', 'galil', 'famas', 'ssg08', 'xm1014', 'mp9'][(a.id * 7 + this.round) % 12] : a.team === 'T' ? 'ak47' : 'm4a1s')
      a.inv.primary = gun(pick, this.skinFor?.(a, pick) ?? null)
      if (a.dmPistol) a.inv.pistol = gun(a.dmPistol, this.skinFor?.(a, a.dmPistol) ?? null)
      a.active = 'primary'
    }
    a.money = ECONOMY.max
    a.brain?.newRound()
    if (!first) this.emit('respawn', { a })
  }
  /** Arms Race: hand over the gun for this level. */
  armsWeapon(a) {
    a.arLevel ??= 0
    const id = ARMS_LADDER[Math.min(a.arLevel, ARMS_LADDER.length - 1)]
    a.inv.primary = null
    a.inv.pistol = null
    a.inv.grenades = []
    if (id === 'knife') a.active = 'knife'
    else {
      const slot = WEAPONS[id].slot
      a.inv[slot] = gun(id, this.skinFor?.(a, id) ?? null)
      a.active = slot
    }
    a.switchEnd = this.time + 0.3
    this.emit('switch', { a })
  }
  /** Ends a respawn match. */
  endMatch(winner, reason, star = null) {
    if (this.phase === 'over') return
    this.phase = 'over'
    this.winner = winner
    const mvp = star ?? [...this.actors].filter((a) => a.team === winner).sort((a, b) => b.kills - a.kills)[0] ?? null
    if (mvp) mvp.mvps++
    this.emit('roundEnd', { winner, reason, mvp, over: true })
  }
  endRound(winner, reason) {
    if (this.phase !== 'live' && this.phase !== 'freeze') return
    this.phase = 'post'
    this.phaseEnd = this.time + this.rules.postRound
    this.score[winner]++
    const loser = winner === 'T' ? 'CT' : 'T'
    const planted = this.bomb.state === 'planted' || this.bomb.state === 'exploded' || this.bomb.state === 'defused'
    // Money
    const winCash = ECONOMY.win[reason] ?? 3250
    const lossCash = ECONOMY.loss[Math.min(this.lossStreak[loser], ECONOMY.loss.length - 1)]
    this.lossStreak[winner] = Math.max(0, this.lossStreak[winner] - 1)
    this.lossStreak[loser]++
    for (const a of this.actors) {
      if (a.team === winner) this.pay(a, winCash)
      else {
        // In the classics, Ts who survive a lost time-out get nothing.
        if (!(reason === 'time' && a.team === 'T' && a.alive)) this.pay(a, lossCash + (a.team === 'T' && planted ? ECONOMY.plantBonus : 0))
      }
    }
    // MVP: the winner with the most kills this round.
    const mvp = this.actors.filter((a) => a.team === winner).sort((a, b) => b.roundKills - a.roundKills)[0]
    if (mvp && mvp.roundKills) mvp.mvps++
    this.winner = null
    if (this.score[winner] >= this.rules.roundsToWin) {
      this.phase = 'over'
      this.winner = winner
    }
    this.emit('roundEnd', { winner, reason, mvp, over: this.phase === 'over' })
  }
  pay(a, cash) {
    a.money = Math.min(ECONOMY.max, a.money + cash)
  }
  halftime() {
    this.halftimeDone = true
    for (const a of this.actors) {
      a.team = a.team === 'T' ? 'CT' : 'T'
      a.money = ECONOMY.start
      a.alive = false // they all start fresh: default pistols
    }
    this.score = { T: this.score.CT, CT: this.score.T }
    this.lossStreak = { T: 0, CT: 0 }
    this.emit('halftime', {})
  }

  /** Puts the owner's skins on their starting pistol and knife (the app supplies skinFor). */
  applySkins(a) {
    if (!this.skinFor) return
    for (const slot of ['pistol', 'knife']) if (a.inv[slot] && !a.inv[slot].skin) a.inv[slot].skin = this.skinFor(a, a.inv[slot].id)
  }

  // ================= Buying =================
  /** Can `a` buy right now (in spawn, early in the round)? */
  canBuy(a) {
    if (!a.alive) return false
    if (this.practice) return true
    if (this.mode === 'deathmatch') return true // free guns, any time, anywhere
    if (this.modeDef.armsrace || this.modeDef.retakes) return false
    if (this.phase !== 'freeze' && !(this.phase === 'live' && this.time - this.roundStart < this.rules.freeze + this.rules.buyTime)) return false
    return this.world.inRect(this.map.buy[a.team], a.pos.x, a.pos.z, a.pos.y)
  }
  /** Buys an item for `a`. Returns '' or why not. */
  buy(a, id) {
    if (this.client) {
      this.onClientBuy?.(id)
      return ''
    }
    if (!this.canBuy(a)) return 'You can’t buy here.'
    const w = WEAPONS[id]
    const g = GEAR[id]
    const item = w ?? g
    if (!item) return 'Not for sale.'
    if (item.team && item.team !== a.team) return 'Not for your team.'
    if (a.money < item.price) return 'Not enough money.'
    if (g) {
      if (id === 'kit') {
        if (a.kit) return 'You already have one.'
        a.kit = true
      } else if (id === 'vest') {
        if (a.armor >= 100) return 'Your armour is full.'
        a.armor = 100
      } else if (id === 'vesthelm') {
        if (a.armor >= 100 && a.helmet) return 'You already have both.'
        const price = a.armor >= 100 ? 350 : item.price
        if (a.money < price) return 'Not enough money.'
        a.money -= price
        a.armor = 100
        a.helmet = true
        this.sound('buy', null, { who: a })
        return ''
      }
    } else if (w.slot === 'grenade') {
      if (a.inv.grenades.length >= MAX_GRENADES) return 'You can’t carry more grenades.'
      const have = a.inv.grenades.filter((x) => x === id || (w.group && WEAPONS[x].group === w.group)).length
      if (have >= (w.carry ?? 1)) return 'You can’t carry any more of those.'
      a.inv.grenades.push(id)
    } else if (w.slot === 'zeus') {
      if (a.inv.zeus) return 'You already have one.'
      a.inv.zeus = gun(id)
    } else {
      const cur = a.inv[w.slot]
      if (cur?.id === id) return 'You already have it.'
      if (cur && w.slot === 'primary') this.dropWeapon(a, 'primary', true)
      a.inv[w.slot] = gun(id, this.skinFor?.(a, id) ?? null)
      this.switchTo(a, w.slot, true)
    }
    a.money -= item.price
    if (this.practice || this.mode === 'deathmatch') a.money = ECONOMY.max
    if (this.mode === 'deathmatch' && w?.slot === 'primary') a.dmPick = id
    if (this.mode === 'deathmatch' && w?.slot === 'pistol') a.dmPistol = id
    this.sound('buy', null, { who: a })
    return ''
  }

  // ================= Weapons =================
  switchTo(a, slot, force = false) {
    if (slot === a.active && !force) return
    if (slot === 'grenade' && !a.inv.grenades.length) return
    if (slot === 'bomb' && !a.inv.bomb) return
    if (slot !== 'grenade' && slot !== 'bomb' && !a.inv[slot]) return
    if (slot !== a.active) a.lastActive = a.active
    a.active = slot
    a.scope = 0
    a.ads = 0
    a.reloadEnd = 0
    a.switchEnd = this.time + (slot === 'knife' ? 0.35 : 0.6)
    a.recoil = 0
    a.burstLeft = 0
    this.emit('switch', { a })
  }
  cycleGrenade(a) {
    if (a.active === 'grenade' && a.inv.grenades.length > 1) {
      a.inv.grenades.push(a.inv.grenades.shift())
      a.switchEnd = this.time + 0.4
      this.emit('switch', { a })
    } else this.switchTo(a, 'grenade')
  }
  reload(a) {
    const s = a.inv[a.active]
    if (!s || !WEAPONS[s.id].mag || this.time < a.reloadEnd) return
    const w = WEAPONS[s.id]
    if (s.clip >= w.mag || s.reserve <= 0) return
    a.reloadEnd = this.time + w.reload
    a.scope = 0
    this.sound('reload', eyeOf(a), { who: a, range: 12 })
    this.emit('reload', { a })
  }
  finishReload(a) {
    const s = a.inv[a.active]
    if (!s) return
    const w = WEAPONS[s.id]
    const need = w.mag - s.clip
    const take = Math.min(need, s.reserve)
    s.clip += take
    s.reserve -= take
  }
  /** Right mouse: scope (AWP), the knife's heavy stab, or an underhand throw. (Other guns aim down the sights.) */
  alt(a) {
    const w = weaponOf(a)
    if (!w) return
    if (w.zoom && this.time >= a.reloadEnd) {
      a.scope = (a.scope + 1) % (w.zoom.length + 1)
      this.sound('click', null, { who: a })
    }
    if (w.kind === 'knife' && this.time >= a.nextFire) this.knife(a, true)
    if (w.kind === 'grenade' && this.time >= a.nextFire && this.time >= a.switchEnd) this.throwNade(a, true)
  }
  /** F (or middle mouse): burst fire on or off (Glock, FAMAS), or the silencer (USP-S, M4A1-S). */
  fireMode(a) {
    const w = weaponOf(a)
    const s = a.inv[a.active]
    if (!w || !s) return
    if (w.modes === 'burst') {
      s.burst = !s.burst
      this.emit('mode', { a, text: s.burst ? 'Switched to burst-fire mode' : w.kind === 'pistol' ? 'Switched to semi-automatic' : 'Switched to automatic' })
      this.sound('click', null, { who: a })
    }
    if (w.modes === 'silencer' && this.time >= a.reloadEnd && this.time >= a.switchEnd) {
      s.silenced = !s.silenced
      a.switchEnd = this.time + 1.3 // screwing it on or off
      this.emit('mode', { a, text: s.silenced ? 'Silencer on' : 'Silencer off', silencer: true })
    }
  }
  /** Pull the trigger (held = still holding it from before). */
  fire(a, held) {
    const now = this.time
    const w = weaponOf(a)
    if (!w || !a.alive || this.phase === 'freeze') return
    if (now < a.switchEnd) return
    if (w.kind === 'knife') {
      if (now >= a.nextFire) this.knife(a, false)
      return
    }
    if (w.kind === 'grenade') {
      if (!held && now >= a.nextFire) this.throwNade(a, false)
      return
    }
    if (w.kind === 'bomb') return
    const s = a.inv[a.active]
    if (now < a.reloadEnd) return
    if ((!w.auto || s.burst) && held) return
    if (now < a.nextFire) return
    if (s.clip <= 0) {
      if (!held) this.sound('click', eyeOf(a), { who: a, range: 6 })
      a.nextFire = now + 0.25
      if (s.reserve > 0) this.reload(a)
      return
    }
    a.nextFire = now + 1 / w.rate
    if (s.burst) {
      // three rounds, quickly, then a pause
      const gap = w.kind === 'pistol' ? 0.05 : 0.075
      a.burstLeft = Math.min(2, s.clip - 1)
      a.burstNext = now + gap
      a.nextFire = now + gap * 3 + (w.kind === 'pistol' ? 0.45 : 0.3)
    }
    this.fireRound(a, w, s)
  }
  /** One round (or one load of pellets) out of the barrel. */
  fireRound(a, w, s) {
    const now = this.time
    s.clip--
    // How inaccurate: base, moving, in the air, crouched, scoped.
    const hs = Math.hypot(a.vel.x, a.vel.z)
    const ads = a.ads ?? 0
    let spread = w.zoom ? (a.scope ? w.scopedSpread : w.spread) : w.spread
    if (s.burst) spread *= w.kind === 'pistol' ? 1.6 : 0.8
    if (w.modes === 'silencer' && !s.silenced) spread *= 1.35
    if (w.settles) spread *= Math.max(0.2, 1 - a.recoil / 14)
    spread *= 1 - 0.4 * ads // down the sights: tighter
    spread += w.moveSpread * smooth(0.34, 1, hs / w.speed) * (1 - 0.3 * ads)
    if (!a.onGround) spread += w.airSpread
    if (a.crouch > 0.5 && a.onGround) spread *= 0.72
    if (now - a.lastShot > Math.max(0.35, 2 / w.rate)) a.recoil = 0
    const k = Math.min(Math.floor(a.recoil), w.recoil.length - 1)
    const rk = 1 - 0.2 * ads // and a little easier to hold down
    const ry = w.recoil[k][0] * rk
    const rp = w.recoil[k][1] * rk
    a.recoil += 1
    a.lastShot = now
    // The view kicks up with the spray (aim punch), half as much as the bullets climb.
    a.punch.pitch += w.kind === 'sniper' ? 0.03 : rp * 0.5 - (a.punch.pitch > rp * 0.5 ? (a.punch.pitch - rp * 0.5) * 0.5 : 0) + 0.004
    a.punch.yaw += ry * 0.5 - a.punch.yaw * 0.2
    const eye = eyeOf(a)
    // A shotgun's pellets share one aim point, each with its own scatter.
    const ang0 = Math.random() * Math.PI * 2
    const pellet = w.spread * (1 - 0.25 * ads)
    const mag0 = w.pellets > 1 ? Math.sqrt(Math.random()) * Math.max(0, spread - pellet) : 0
    for (let p = 0; p < w.pellets; p++) {
      const ang = Math.random() * Math.PI * 2
      const mag = w.pellets > 1 ? Math.sqrt(Math.random()) * pellet : Math.sqrt(Math.random()) * spread
      const yaw = a.yaw + ry + Math.cos(ang) * mag + Math.cos(ang0) * mag0
      const pitch = a.pitch + rp + Math.sin(ang) * mag + Math.sin(ang0) * mag0
      this.shoot(a, eye, dirOf(yaw, pitch), w, p > 0)
    }
    if (w.bolt && a.scope) a.scope = 0 // bolt action: you come out of the scope
    const loud = !s.silenced && w.kind !== 'taser'
    const sound = s.silenced ? 'silenced' : w.sound
    this.sound(sound, eye, { who: a, range: loud ? (w.kind === 'sniper' ? 120 : 75) : 18 })
    this.noise(eye, a.team, loud ? 45 : 12)
    this.emit('shot', { a, w, silenced: !loud })
    if (s.clip === 0 && s.reserve > 0) a.autoReload = now + 0.3
    if (w.kind === 'taser' && s.clip === 0) {
      // one charge: the Zeus is spent
      a.inv.zeus = null
      a.burstLeft = 0
      this.switchTo(a, a.inv.primary ? 'primary' : a.inv.pistol ? 'pistol' : 'knife', true)
      a.switchEnd = now + 0.8
    }
  }
  /** A bullet: the nearest body or wall along the ray. */
  shoot(a, eye, dir, w, quiet = false) {
    const max = w.reach ?? 200
    const wall = this.world.trace(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, max)
    let tMax = wall ? wall.t : max
    let victim = null
    let part = null
    for (const b of this.actors) {
      if (b === a || !b.alive || b.team === a.team) continue
      const hit = this.hitBody(b, eye, dir, tMax)
      if (hit) {
        tMax = hit.t
        victim = b
        part = hit.part
      }
    }
    const end = { x: eye.x + dir.x * tMax, y: eye.y + dir.y * tMax, z: eye.z + dir.z * tMax }
    if (!quiet || Math.random() < 0.35) this.emit('tracer', { a, from: eye, to: end, w })
    if (victim) {
      const dist = tMax
      const raw = w.dmg * Math.pow(w.range, dist / 12.7)
      this.damage(victim, a, raw, w.pen, part, w.id, end, dir)
    } else if (wall && (!quiet || Math.random() < 0.5)) {
      this.emit('impact', { at: end, normal: { x: wall.nx, y: wall.ny, z: wall.nz }, a })
      if (Math.random() < 0.08) this.sound('ricochet', end, { range: 20 })
    }
    // Bullets whizzing past are heard.
    if (!quiet) for (const b of this.actors) if (b !== victim && b.team !== a.team && b.alive) this.passBy(b, eye, dir, tMax)
  }
  passBy(b, eye, dir, t) {
    const c = chestOf(b)
    const vx = c.x - eye.x
    const vy = c.y - eye.y
    const vz = c.z - eye.z
    const s = vx * dir.x + vy * dir.y + vz * dir.z
    if (s < 0 || s > t) return
    const dx = vx - dir.x * s
    const dy = vy - dir.y * s
    const dz = vz - dir.z * s
    if (dx * dx + dy * dy + dz * dz < 4) b.brain?.underFire(eye)
  }
  /** Ray against a body: a sphere for the head, a box for the rest. */
  hitBody(b, o, d, tMax) {
    const h = b.h
    const hc = headOf(b)
    // head sphere
    const r = 0.17
    const ox = o.x - hc.x
    const oy = o.y - hc.y
    const oz = o.z - hc.z
    const bq = ox * d.x + oy * d.y + oz * d.z
    const cq = ox * ox + oy * oy + oz * oz - r * r
    const disc = bq * bq - cq
    let best = null
    if (disc >= 0) {
      const t = -bq - Math.sqrt(disc)
      if (t > 0 && t < tMax) best = { t, part: 'head' }
    }
    // body box
    const half = 0.26
    const y0 = b.pos.y
    const y1 = b.pos.y + h - 0.28
    let tmin = 0
    let tmax = best ? best.t : tMax
    for (const [oc, dc, lo, hi] of [[o.x, d.x, b.pos.x - half, b.pos.x + half], [o.y, d.y, y0, y1], [o.z, d.z, b.pos.z - half, b.pos.z + half]]) {
      if (Math.abs(dc) < 1e-9) {
        if (oc < lo || oc > hi) return best
        continue
      }
      let t1 = (lo - oc) / dc
      let t2 = (hi - oc) / dc
      if (t1 > t2) [t1, t2] = [t2, t1]
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
      if (tmin > tmax) return best
    }
    const hy = o.y + d.y * tmin - b.pos.y
    const part = hy < h * 0.42 ? 'legs' : hy < h * 0.56 ? 'stomach' : 'chest'
    return { t: tmin, part }
  }
  damage(victim, attacker, raw, pen, part, weaponId, at, dir) {
    if (this.client) return
    if (victim.protectUntil > this.time && attacker) return
    if (!victim.alive || (this.phase === 'over' && weaponId !== 'bomb')) return
    const { dmg, armorLoss } = applyDamage(victim, raw, pen, part)
    const taken = Math.min(victim.hp, dmg)
    victim.hp -= dmg
    victim.armor = Math.max(0, victim.armor - armorLoss)
    if (attacker && attacker !== victim) victim.damageBy[attacker.id] = (victim.damageBy[attacker.id] ?? 0) + taken
    victim.slowUntil = this.time + 0.35
    if (attacker) {
      victim.punch.pitch += part === 'head' ? 0.06 : 0.025
      victim.brain?.hurtBy(attacker)
    }
    this.emit('hit', { victim, attacker, dmg: taken, part, at, dir, weaponId })
    if (at) this.sound(part === 'head' && victim.helmet ? 'dink' : 'hit', at, { range: 25, who: attacker })
    if (victim.hp <= 0) this.kill(victim, attacker, weaponId, part === 'head')
  }
  kill(victim, attacker, weaponId, headshot) {
    victim.alive = false
    victim.hp = 0
    victim.deaths++
    victim.deadAt = this.time
    victim.plant = victim.defuse = 0
    if (this.bomb.defuser === victim) this.bomb.defuser = null
    if (attacker && attacker !== victim) {
      if (attacker.team !== victim.team) {
        attacker.kills++
        attacker.roundKills++
        const reward = weaponId === 'knife' ? 1500 : WEAPONS[weaponId]?.reward ?? 300
        this.pay(attacker, reward)
      }
      // assists: anyone else who did 41+ damage
      for (const [id, dmg] of Object.entries(victim.damageBy)) {
        const b = this.actors[id]
        if (b && b !== attacker && dmg >= 41 && b.team !== victim.team) b.assists++
      }
    }
    if (this.respawns) {
      victim.respawnAt = this.time + 2.5
      victim.inv.grenades = []
      this.emit('kill', { victim, attacker, weaponId, headshot })
      if (attacker && attacker !== victim && attacker.team !== victim.team) {
        this.score[attacker.team]++
        if (this.modeDef.armsrace) {
          if (weaponId === 'knife' && victim.arLevel > 0) victim.arLevel--
          attacker.arLevel = (attacker.arLevel ?? 0) + 1
          if (attacker.arLevel >= ARMS_LADDER.length) return this.endMatch(attacker.team, 'armsrace', attacker)
          if (attacker.alive) this.armsWeapon(attacker)
          this.emit('levelUp', { a: attacker, level: attacker.arLevel })
        } else if (this.score[attacker.team] >= this.rules.killsToWin) return this.endMatch(attacker.team, 'kills')
      }
      return
    }
    // Drop the best gun, and the bomb.
    if (victim.inv.primary) this.dropWeapon(victim, 'primary')
    else if (victim.inv.pistol && !DEFAULT_PISTOLS.includes(victim.inv.pistol.id)) this.dropWeapon(victim, 'pistol')
    if (victim.inv.bomb) {
      victim.inv.bomb = false
      this.bomb.state = 'dropped'
      this.bomb.carrier = null
      this.bomb.pos = { x: victim.pos.x, y: this.world.groundUnder(victim.pos.x, victim.pos.z, 0.1, victim.pos.y + 0.5), z: victim.pos.z }
      this.emit('bombDropped', { pos: this.bomb.pos })
    }
    victim.inv.grenades = []
    victim.armor = 0
    victim.helmet = false
    victim.kit = false
    this.emit('kill', { victim, attacker, weaponId, headshot })
    this.checkWin()
  }
  dropWeapon(a, slot, thrown = false) {
    const s = a.inv[slot]
    if (!s || slot === 'knife') return
    a.inv[slot] = null
    const d = dirOf(a.yaw, 0)
    const off = thrown ? 1.4 : 0.2
    const x = a.pos.x + d.x * off
    const z = a.pos.z + d.z * off
    const drop = { uid: Math.random(), id: s.id, clip: s.clip, reserve: s.reserve, silenced: s.silenced, burst: s.burst, skin: s.skin, pos: { x, y: this.world.groundUnder(x, z, 0.1, a.pos.y + 0.5), z }, yaw: Math.random() * 6.28, at: this.time }
    this.drops.push(drop)
    this.emit('drop', drop)
    if (a.active === slot) this.switchTo(a, a.inv.primary ? 'primary' : a.inv.pistol ? 'pistol' : 'knife', true)
  }
  pickUp(a, drop) {
    const w = WEAPONS[drop.id]
    if (a.inv[w.slot]) this.dropWeapon(a, w.slot, true)
    a.inv[w.slot] = { id: drop.id, clip: drop.clip, reserve: drop.reserve, silenced: drop.silenced ?? !!w.silenced, burst: !!drop.burst, skin: drop.skin ?? null }
    this.drops.splice(this.drops.indexOf(drop), 1)
    this.emit('dropRemoved', drop)
    this.switchTo(a, w.slot, true)
    this.sound('click', a.pos, { who: a, range: 6 })
  }
  knife(a, heavy) {
    a.nextFire = this.time + (heavy ? 1.0 : 0.45)
    const eye = eyeOf(a)
    const dir = dirOf(a.yaw, a.pitch)
    this.sound('swish', eye, { who: a, range: 10 })
    this.emit('knife', { a, heavy })
    let best = null
    for (const b of this.actors) {
      if (b === a || !b.alive || b.team === a.team) continue
      const hit = this.hitBody(b, eye, dir, WEAPONS.knife.range)
      if (hit && (!best || hit.t < best.t)) best = { b, ...hit }
    }
    if (best) {
      // From behind it's a lot worse.
      const behind = Math.cos(best.b.yaw - a.yaw) > 0.5
      const dmg = heavy ? (behind ? 180 : 65) : behind ? 90 : 40
      this.damage(best.b, a, dmg, 0.85, 'chest', 'knife', eyeOf(best.b), dir)
      this.sound('stab', eye, { range: 10 })
    } else {
      const wall = this.world.trace(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, WEAPONS.knife.range)
      if (wall) this.emit('impact', { at: { x: eye.x + dir.x * wall.t, y: eye.y + dir.y * wall.t, z: eye.z + dir.z * wall.t }, normal: { x: wall.nx, y: wall.ny, z: wall.nz }, soft: true, a })
    }
  }

  // ================= Grenades =================
  throwNade(a, lob) {
    if (this.client) {
      a.nextFire = this.time + 0.9
      return
    }
    const id = a.inv.grenades.shift()
    if (!id) return
    const w = WEAPONS[id]
    const eye = eyeOf(a)
    const pitch = a.pitch + 0.12
    const d = dirOf(a.yaw, pitch)
    const speed = lob ? 9 : 17
    const nade = {
      type: w.nade,
      item: id,
      pos: { x: eye.x + d.x * 0.5, y: eye.y + d.y * 0.5 - 0.1, z: eye.z + d.z * 0.5 },
      vel: { x: d.x * speed + a.vel.x * 0.8, y: d.y * speed + (lob ? 2 : 2.5) + Math.max(0, a.vel.y) * 0.5, z: d.z * speed + a.vel.z * 0.8 },
      owner: a,
      fuse: this.time + w.fuse,
      still: 0,
      id: Math.random(),
    }
    this.nades.push(nade)
    a.nextFire = this.time + 0.9
    this.sound('pin', eye, { who: a, range: 8 })
    this.emit('throw', { a, nade })
    if (!a.inv.grenades.length) this.switchTo(a, a.lastActive !== 'grenade' && (a.lastActive === 'knife' || a.inv[a.lastActive]) ? a.lastActive : a.inv.primary ? 'primary' : 'pistol', true)
    else a.switchEnd = this.time + 0.5
  }
  stepNades(dt) {
    const w = this.world
    for (let k = this.nades.length - 1; k >= 0; k--) {
      const n = this.nades[k]
      // fly, bounce off walls, floors and ceilings
      const sub = 4
      for (let s = 0; s < sub; s++) {
        const h = dt / sub
        n.vel.y -= GRAVITY * h
        const sp = Math.hypot(n.vel.x, n.vel.y, n.vel.z)
        if (sp > 1e-4) {
          const dx = n.vel.x / sp
          const dy = n.vel.y / sp
          const dz = n.vel.z / sp
          const dist = sp * h
          const hit = w.trace(n.pos.x, n.pos.y, n.pos.z, dx, dy, dz, dist + 0.06)
          if (hit) {
            const t = Math.max(0, hit.t - 0.06)
            n.pos.x += dx * t
            n.pos.y += dy * t
            n.pos.z += dz * t
            const vn = n.vel.x * hit.nx + n.vel.y * hit.ny + n.vel.z * hit.nz
            n.vel.x = (n.vel.x - 2 * vn * hit.nx) * 0.55
            n.vel.y = (n.vel.y - 2 * vn * hit.ny) * 0.45
            n.vel.z = (n.vel.z - 2 * vn * hit.nz) * 0.55
            if (hit.ny > 0.5) {
              n.vel.x *= 0.7
              n.vel.z *= 0.7
              n.landed = true
            }
            if (Math.abs(vn) > 2.5) this.sound('bounce', n.pos, { range: 20 })
          } else {
            n.pos.x += dx * dist
            n.pos.y += dy * dist
            n.pos.z += dz * dist
          }
        }
      }
      const resting = Math.hypot(n.vel.x, n.vel.y, n.vel.z) < 0.6
      n.still = resting ? n.still + dt : 0
      const settles = n.type === 'smoke' || n.type === 'decoy'
      const due = settles ? (n.still > 0.4 && this.time > n.fuse) || this.time > n.fuse + 2.5 : n.type === 'fire' ? n.landed || this.time > n.fuse : this.time > n.fuse
      if (due) {
        this.nades.splice(k, 1)
        this.detonate(n)
      }
    }
  }
  /** Molotov fires burn whoever stands in them; decoys fake gunfire. */
  stepFires(dt) {
    const now = this.time
    const fires = this.world.fires
    for (let k = fires.length - 1; k >= 0; k--) {
      const f = fires[k]
      const age = now - f.born
      f.r = Math.min(f.max, f.max * (0.35 + age / 0.8))
      if (now > f.until) {
        fires.splice(k, 1)
        continue
      }
      if (now >= (f.crackle ?? 0)) {
        f.crackle = now + 0.45
        this.sound('burn', f, { range: 22 })
      }
      for (const b of this.actors) {
        if (!b.alive || (b.team === f.owner.team && b !== f.owner)) continue
        if (Math.hypot(b.pos.x - f.x, b.pos.z - f.z) > f.r + b.r || Math.abs(b.pos.y - f.y) > 1.2) continue
        b.burn = (b.burn ?? 0) + dt * 40
        if (b.burn >= 8) {
          this.damage(b, f.owner, b.burn, 1, 'chest', f.owner.team === 'T' ? 'molotov' : 'incendiary', null, null)
          b.burn = 0
        }
      }
    }
    for (let k = this.decoys.length - 1; k >= 0; k--) {
      const d = this.decoys[k]
      if (now > d.until) {
        this.decoys.splice(k, 1)
        this.sound('pop', d.pos, { range: 30 })
        this.emit('decoyEnd', { decoy: d })
        continue
      }
      if (now < d.next) continue
      // a short burst, then a pause, like someone shooting
      const w = d.w
      if (d.left <= 0) d.left = w.auto ? 2 + Math.floor(Math.random() * 5) : 1 + Math.floor(Math.random() * 2)
      d.left--
      this.sound(w.silenced ? 'silenced' : w.sound, d.pos, { range: 75 })
      this.noise(d.pos, d.owner.team, 45)
      d.next = now + (d.left > 0 ? 1 / w.rate : 0.6 + Math.random() * 1.6)
    }
  }
  detonate(n) {
    const at = n.pos
    this.emit('detonate', { nade: n })
    if (n.type === 'he') {
      this.sound('he', at, { range: 90 })
      this.noise(at, n.owner.team, 50)
      for (const b of this.actors) {
        if (!b.alive) continue
        const c = chestOf(b)
        const d = Math.hypot(c.x - at.x, c.y - at.y, c.z - at.z)
        if (d > 8.5 || !this.world.sees({ x: at.x, y: at.y + 0.2, z: at.z }, c, false)) continue
        if (b.team === n.owner.team && b !== n.owner) continue
        const raw = 98 * Math.pow(1 - d / 8.5, 1.4)
        if (raw >= 1) this.damage(b, n.owner, raw, 0.5, 'chest', 'he', null, null)
      }
    } else if (n.type === 'flash') {
      this.sound('flash', at, { range: 70 })
      for (const b of this.actors) {
        if (!b.alive) continue
        const e = eyeOf(b)
        const d = Math.hypot(e.x - at.x, e.y - at.y, e.z - at.z)
        if (d > 32 || !this.world.sees({ x: at.x, y: at.y + 0.1, z: at.z }, e)) continue
        const look = dirOf(b.yaw, b.pitch)
        const dot = ((at.x - e.x) * look.x + (at.y - e.y) * look.y + (at.z - e.z) * look.z) / (d || 1)
        const facing = dot > 0.5 ? 1 : dot > -0.2 ? 0.45 : 0.15
        const dur = facing * (4.2 - d * 0.1)
        if (dur <= 0.25) continue
        b.flashFull = Math.max(b.flashFull, this.time + dur * 0.45)
        b.flashUntil = Math.max(b.flashUntil, this.time + dur)
        if (b.isPlayer) this.sound('ring', null, { who: b, gain: Math.min(1, dur / 3) })
        b.brain?.flashed(dur)
      }
    } else if (n.type === 'smoke') {
      this.sound('hiss', at, { range: 30 })
      this.world.smokes.push({ id: Math.random(), x: at.x, y: at.y + 1.4, z: at.z, r: 0, until: this.time + 18, born: this.time })
      // a smoke puts out any fire it lands in
      const fires = this.world.fires
      for (let k = fires.length - 1; k >= 0; k--) {
        const f = fires[k]
        if (Math.hypot(f.x - at.x, f.z - at.z) < 4.6 + f.r * 0.5 && Math.abs(f.y - at.y) < 3) {
          fires.splice(k, 1)
          this.sound('hiss', f, { range: 25 })
        }
      }
    } else if (n.type === 'fire') {
      // Only bursts into flames on a floor, and not inside a smoke.
      const floor = this.world.groundUnder(at.x, at.z, 0.1, at.y + 0.3)
      const inSmoke = this.world.smokes.some((sm) => Math.hypot(sm.x - at.x, sm.z - at.z) < sm.r + 0.5 && Math.abs(sm.y - at.y) < 3)
      if (at.y - floor > 1.2 || inSmoke) {
        this.sound('pop', at, { range: 30 })
      } else {
        this.sound('molotov', at, { range: 60 })
        this.noise(at, n.owner.team, 30)
        this.world.fires.push({ x: at.x, y: floor, z: at.z, r: 0, max: 3.1, born: this.time, until: this.time + 7, owner: n.owner, id: Math.random() })
      }
    } else if (n.type === 'decoy') {
      const w = WEAPONS[n.owner.inv.primary?.id ?? n.owner.inv.pistol?.id ?? 'glock']
      this.decoys.push({ id: Math.random(), pos: { ...at }, owner: n.owner, until: this.time + 15, next: this.time + 0.3, left: 0, w })
    }
  }

  // ================= The bomb =================
  inSite(a) {
    for (const [k, rr] of Object.entries(this.sites)) if (this.world.inRect(rr, a.pos.x, a.pos.z, a.pos.y)) return k
    return null
  }
  /** Hold to plant (Ts with the bomb, on a site) or to defuse (CTs at the bomb). */
  use(a, held, dt) {
    if (!a.alive || this.phase !== 'live') return
    const b = this.bomb
    if (a.team === 'T' && a.inv.bomb && b.state === 'carried') {
      const site = this.inSite(a)
      if (held && site && a.onGround) {
        if (a.plant === 0) {
          this.emit('plantStart', { a })
          this.noise(a.pos, 'T', 16)
        }
        a.plant += dt
        if (a.plant >= this.rules.plantTime) this.plantBomb(a, site)
      } else a.plant = 0
      return
    }
    if (a.team === 'CT' && b.state === 'planted') {
      const near = Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) < 1.8 && Math.abs(a.pos.y - b.pos.y) < 1.5
      if (held && near && (!b.defuser || b.defuser === a)) {
        if (!b.defuser) {
          b.defuser = a
          a.defuse = 0
          this.sound('click', b.pos, { range: 14 })
          this.noise(b.pos, 'CT', 18)
          this.emit('defuseStart', { a })
        }
        a.defuse += dt
        if (a.defuse >= (a.kit ? this.rules.kitTime : this.rules.defuseTime)) this.defuseBomb(a)
      } else if (b.defuser === a) {
        b.defuser = null
        a.defuse = 0
      }
    }
  }
  plantBomb(a, site) {
    const b = this.bomb
    a.inv.bomb = false
    a.plant = 0
    if (a.active === 'bomb') this.switchTo(a, a.inv.primary ? 'primary' : 'pistol', true)
    b.state = 'planted'
    b.carrier = null
    b.site = site
    b.pos = { x: a.pos.x, y: a.pos.y, z: a.pos.z }
    b.explodeAt = this.time + this.rules.bombTime
    b.nextBeep = this.time
    this.pay(a, ECONOMY.plant)
    // The round clock is replaced by the bomb's.
    this.phaseEnd = b.explodeAt
    this.sound('planted', null, {})
    this.emit('planted', { a, site, pos: b.pos })
  }
  defuseBomb(a) {
    const b = this.bomb
    b.state = 'defused'
    b.defuser = null
    a.defuse = 0
    this.pay(a, ECONOMY.defuse)
    a.roundKills += 1 // counts toward MVP
    this.emit('defused', { a, left: this.bomb.explodeAt - this.time })
    this.endRound('CT', 'defuse')
  }
  stepBomb() {
    const b = this.bomb
    if (b.state === 'dropped') {
      for (const a of this.actors) {
        if (!a.alive || a.team !== 'T') continue
        if (Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) < 1.0 && Math.abs(a.pos.y - b.pos.y) < 1.4) {
          a.inv.bomb = true
          b.state = 'carried'
          b.carrier = a
          b.pos = null
          this.emit('bombPicked', { a })
          break
        }
      }
    }
    if (b.state === 'planted') {
      const left = b.explodeAt - this.time
      if (this.time >= b.nextBeep) {
        this.sound('beep', { x: b.pos.x, y: b.pos.y + 0.2, z: b.pos.z }, { range: 45 })
        this.emit('beep', {})
        b.nextBeep = this.time + Math.max(0.12, Math.min(1.0, left / 25))
      }
      if (left <= 0) {
        b.state = 'exploded'
        this.sound('boom', b.pos, { range: 200, gain: 1.4 })
        this.emit('explode', { pos: b.pos })
        this.endRound('T', 'bomb')
        for (const a of this.actors) {
          if (!a.alive) continue
          const d = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y, a.pos.z - b.pos.z)
          const raw = 500 * Math.exp(-(d * d) / (2 * 11 * 11))
          if (raw > 1) this.damage(a, null, raw, 1, 'chest', 'bomb', null, null)
        }
      }
    }
  }
  checkWin() {
    if (this.phase !== 'live' || this.practice || this.respawns) return
    const alive = (t) => this.actors.some((a) => a.alive && a.team === t)
    if (!alive('CT')) return this.endRound('T', 'elimination')
    if (!alive('T') && this.bomb.state !== 'planted') return this.endRound('CT', 'elimination')
  }

  // ================= Moving =================
  /**
   * Moves a body for one tick. `cmd` is what it wants: { fx, fz (wish direction, world space,
   * length 0-1), jump, crouch, walk }.
   */
  moveActor(a, cmd, dt) {
    const w = this.world
    const frozen = this.phase === 'freeze' || a.plant > 0 || (a.defuse > 0 && this.bomb.defuser === a)
    // Crouching (you can't stand up under something low)
    const wantCrouch = !!cmd.crouch
    if (wantCrouch !== a.crouching) {
      if (wantCrouch) {
        a.crouching = true
        if (!a.onGround && !a.airTuck) {
          // crouch-jump: tuck the legs up
          if (!w.blocked(a.pos.x, a.pos.y + (STAND_H - CROUCH_H), a.pos.z, a.r, CROUCH_H, 0)) {
            a.pos.y += STAND_H - CROUCH_H
            a.airTuck = true
          }
        }
      } else if (!w.blocked(a.pos.x, a.pos.y, a.pos.z, a.r, STAND_H, 0)) {
        a.crouching = false
        if (a.airTuck && !a.onGround && !w.blocked(a.pos.x, a.pos.y - (STAND_H - CROUCH_H), a.pos.z, a.r, STAND_H, 0)) a.pos.y -= STAND_H - CROUCH_H
        a.airTuck = false
      }
    }
    a.crouch += ((a.crouching ? 1 : 0) - a.crouch) * Math.min(1, dt * (a.onGround ? 12 : 30))
    a.h = STAND_H + (CROUCH_H - STAND_H) * (a.crouching ? 1 : 0)
    const wpn = weaponOf(a)
    let max = wpn?.speed ?? 6.1
    if (wpn?.zoom && a.scope) max = wpn.scopedSpeed
    if (a.ads) max *= 1 - 0.3 * a.ads
    if (a.crouching && a.onGround) max *= 0.34
    else if (cmd.walk) max *= 0.52
    if (this.time < a.slowUntil) max *= 0.55
    if (frozen) max = 0
    a.walking = !!cmd.walk
    const v = a.vel
    let wx = cmd.fx || 0
    let wz = cmd.fz || 0
    const wl = Math.hypot(wx, wz)
    if (wl > 1) {
      wx /= wl
      wz /= wl
    }
    const wishSpeed = max * Math.min(1, wl)
    if (a.onGround) {
      const sp = Math.hypot(v.x, v.z)
      if (sp > 0) {
        const drop = Math.max(sp, STOP_SPEED) * FRICTION * dt
        const ns = Math.max(0, sp - drop)
        v.x *= ns / sp
        v.z *= ns / sp
      }
      if (wl > 0) {
        const cur = v.x * (wx / (wl || 1)) + v.z * (wz / (wl || 1))
        const add = wishSpeed - cur
        if (add > 0) {
          const acc = Math.min(add, ACCEL * max * dt * 1.8)
          v.x += (wx / Math.max(wl, 1e-6)) * acc
          v.z += (wz / Math.max(wl, 1e-6)) * acc
        }
      }
      if (cmd.jump && !frozen && !a.crouching) {
        v.y = JUMP_V
        a.onGround = false
        this.sound('land', a.pos, { who: a, range: 14, gain: 0.5 })
      } else if (cmd.jump && !frozen && a.crouching) {
        v.y = JUMP_V * 0.92
        a.onGround = false
      }
    } else if (wl > 0) {
      // air strafing, a little
      const cur = v.x * wx + v.z * wz
      const add = Math.min(0.9, wishSpeed) - cur
      if (add > 0) {
        const acc = Math.min(add, 10 * max * dt)
        v.x += wx * acc
        v.z += wz * acc
      }
    }
    const before = a.onGround
    const landed = w.move(a, dt)
    // off the edge of a skyscraper
    if (this.map.killY != null && a.pos.y < this.map.killY) {
      if (a.alive && !this.client) this.damage(a, null, 999, 1, 'chest', 'fall', null, null)
      a.pos.y = Math.max(a.pos.y, this.map.killY - 6)
      a.vel.y = Math.max(a.vel.y, -4)
    }
    if (a.onGround) a.airTuck = false
    if (landed) {
      if (landed > 6) this.sound('land', a.pos, { who: a, range: 18 })
      if (landed > 14.5) this.damage(a, null, (landed - 14.5) * 9, 1, 'legs', 'fall', null, null)
    }
    // Footsteps: running makes noise, walking and crouching don't.
    const hs = Math.hypot(v.x, v.z)
    a.moveSpeed = hs
    if (a.onGround && before && hs > 3.4 && !a.walking && !a.crouching) {
      a.stepDist += hs * dt
      if (a.stepDist > 1.9) {
        a.stepDist = 0
        this.sound('step' + Math.floor(Math.random() * 4), a.pos, { who: a, range: 22, gain: a.isPlayer ? 0.35 : 0.8 })
        this.noise(a.pos, a.team, 18)
      }
    }
    // The view kick settles.
    const decay = Math.min(1, dt * 6)
    a.punch.pitch -= a.punch.pitch * decay
    a.punch.yaw -= a.punch.yaw * decay
  }

  // ================= The tick =================
  /** Advances the match. `input` is the human's commands (or null). */
  update(dt, input) {
    if (this.client) return this.clientUpdate(dt, input)
    this.time += dt
    const now = this.time
    this.chatter?.update()
    // Phases
    if (this.phase === 'freeze' && now >= this.phaseEnd) {
      this.phase = 'live'
      this.phaseEnd = this.practice ? Infinity : now + (this.respawns ? this.rules.matchTime : this.rules.roundTime)
      this.emit('live', {})
      this.sound('roundStart', null, {})
    } else if (this.phase === 'live' && now >= this.phaseEnd && this.respawns) {
      this.endMatch(this.score.T > this.score.CT ? 'T' : 'CT', 'time')
    } else if (this.phase === 'live' && now >= this.phaseEnd && this.bomb.state !== 'planted') {
      this.endRound('CT', 'time')
    } else if (this.phase === 'post' && now >= this.phaseEnd) {
      if (!this.halftimeDone && this.round === this.halftimeAt) this.halftime()
      this.startRound()
    }
    if (this.practice && this.player && !this.player.alive && now - this.player.deadAt > 2) this.startRound()
    if (this.respawns && this.phase === 'live') for (const a of this.actors) if (!a.alive && now >= (a.respawnAt ?? 0)) this.respawn(a)
    if (this.phase === 'over') {
      for (const a of this.actors) if (a.alive) this.moveActor(a, {}, dt)
      return
    }
    // Everyone moves and acts
    for (const a of this.actors) {
      if (!a.alive) continue
      const cmd = a.isBot ? a.brain.update(dt) : a === this.player ? input ?? {} : a.remote ? this.remoteCmd(a) : {}
      this.act(a, cmd, dt)
    }
    this.separate()
    this.stepNades(dt)
    this.stepFires(dt)
    this.stepBomb()
    // Smoke clouds grow, linger and thin out.
    const smokes = this.world.smokes
    for (let k = smokes.length - 1; k >= 0; k--) {
      const s = smokes[k]
      const age = now - s.born
      s.r = age < 1.5 ? 4.6 * (age / 1.5) : now > s.until - 2 ? 4.6 * Math.max(0, (s.until - now) / 2) : 4.6
      if (now > s.until) smokes.splice(k, 1)
    }
    // Pick up guns you walk over (when you have nothing in that slot).
    for (const a of this.actors) {
      if (!a.alive) continue
      for (const d of this.drops) {
        if (now - d.at < 0.8) continue
        const slot = WEAPONS[d.id].slot
        if (a.inv[slot]) continue
        if (Math.hypot(a.pos.x - d.pos.x, a.pos.z - d.pos.z) < 0.9 && Math.abs(a.pos.y - d.pos.y) < 1.2) {
          this.pickUp(a, d)
          break
        }
      }
    }
    // Old noises fade.
    if (this.noises.length > 60) this.noises.splice(0, this.noises.length - 60)
  }
  /** Bodies don't overlap: anyone standing inside someone else gets nudged apart. */
  separate() {
    const list = this.actors.filter((a) => a.alive)
    const min = 0.72
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const b = list[j]
        if (Math.abs(a.pos.y - b.pos.y) > 1.6) continue
        let dx = b.pos.x - a.pos.x
        let dz = b.pos.z - a.pos.z
        const d = Math.hypot(dx, dz)
        if (d >= min) continue
        if (d < 1e-4) {
          dx = Math.random() - 0.5
          dz = Math.random() - 0.5
        }
        const l = Math.hypot(dx, dz)
        const push = (min - d) / 2
        for (const [o, k] of [[a, -1], [b, 1]]) {
          const nx = o.pos.x + (dx / l) * push * k
          const nz = o.pos.z + (dz / l) * push * k
          if (!this.world.blocked(nx, o.pos.y, nz, o.r, o.h, 0.55)) {
            o.pos.x = nx
            o.pos.z = nz
          }
        }
      }
  }
  /** One body's tick: move, look, shoot, reload, use. */
  act(a, cmd, dt) {
    if (cmd.yaw !== undefined) a.yaw = cmd.yaw
    if (cmd.pitch !== undefined) a.pitch = Math.max(-1.5, Math.min(1.5, cmd.pitch))
    if (cmd.slot) {
      if (cmd.slot === 'grenade') this.cycleGrenade(a)
      else if (cmd.slot === 'last') this.switchTo(a, a.lastActive)
      else if (cmd.slot === 'knife' && a.active === 'knife' && a.inv.zeus) this.switchTo(a, 'zeus')
      else if (cmd.slot === 'knife' && a.active === 'zeus') this.switchTo(a, 'knife')
      else this.switchTo(a, cmd.slot)
    }
    if (cmd.reload) this.reload(a)
    if (a.reloadEnd && this.time >= a.reloadEnd) {
      this.finishReload(a)
      a.reloadEnd = 0
    }
    if (a.autoReload && this.time >= a.autoReload) {
      a.autoReload = 0
      this.reload(a)
    }
    if (cmd.alt) this.alt(a)
    if (cmd.mode) this.fireMode(a)
    // aiming down the sights: held, and not while reloading, drawing, planting or defusing
    const ads = adsOf(weaponOf(a))
    a.aiming = !!cmd.aim && !!ads && this.time >= a.reloadEnd && this.time >= a.switchEnd && a.plant === 0 && this.bomb.defuser !== a
    a.ads = ads ? Math.max(0, Math.min(1, a.ads + (a.aiming ? dt : -dt) / ads.time)) : 0
    if (a.burstLeft > 0 && this.time >= a.burstNext) {
      const sl = a.inv[a.active]
      const w = weaponOf(a)
      if (sl?.burst && sl.clip > 0 && this.time >= a.reloadEnd) {
        this.fireRound(a, w, sl)
        a.burstLeft--
        a.burstNext += w.kind === 'pistol' ? 0.05 : 0.075
      } else a.burstLeft = 0
    }
    const busy = a.plant > 0 || this.bomb.defuser === a
    const firing = !!cmd.fire && !busy
    if (firing) this.fire(a, a.trigger)
    a.trigger = !!cmd.fire
    if (this.client) {
      // what the host decides (planting, dropping, picking up) waits for the host
      if (!busy) this.moveActor(a, cmd, dt)
      return
    }
    this.use(a, !!cmd.use || (!!cmd.fire && a.active === 'bomb'), dt)
    if (cmd.drop) {
      if (a.active === 'bomb' && a.inv.bomb && this.phase !== 'freeze') {
        a.inv.bomb = false
        const d = dirOf(a.yaw, 0)
        this.bomb.state = 'dropped'
        this.bomb.carrier = null
        const x = a.pos.x + d.x * 1.3
        const z = a.pos.z + d.z * 1.3
        this.bomb.pos = { x, y: this.world.groundUnder(x, z, 0.1, a.pos.y + 0.5), z }
        this.bomb.dropAt = this.time
        this.emit('bombDropped', { pos: this.bomb.pos })
        this.switchTo(a, a.inv.primary ? 'primary' : 'pistol', true)
      } else if (a.active === 'primary' || a.active === 'pistol') this.dropWeapon(a, a.active, true)
    }
    if (cmd.pickup) {
      const d = this.drops.find((d) => Math.hypot(a.pos.x - d.pos.x, a.pos.z - d.pos.z) < 1.6 && Math.abs(a.pos.y - d.pos.y) < 1.5)
      if (d) this.pickUp(a, d)
    }
    if (cmd.buy) this.buy(a, cmd.buy)
    if (a.remote) this.remoteMove(a, cmd, dt)
    else this.moveActor(a, cmd, dt)
  }

  // ================= Online =================
  /** Host: the next command a remote player sent (one per tick; the last one again if none came). */
  remoteCmd(a) {
    const q = a.netQueue
    if (q.length > 8) q.splice(0, q.length - 4)
    const c = q.shift()
    if (c) {
      a.netLast = c
      return c
    }
    const l = a.netLast ?? {}
    return { yaw: l.yaw, pitch: l.pitch, fire: l.fire, use: l.use, st: l.st, crouch: l.crouch, walk: l.walk, aim: l.aim }
  }
  /** Host: a remote player moves themselves; we take their word for it (within reason). */
  remoteMove(a, cmd, dt) {
    const st = cmd.st
    if (st && st.seq === a.spawnSeq && a.plant === 0 && this.bomb.defuser !== a) {
      const jump = Math.hypot(st.x - a.pos.x, st.z - a.pos.z)
      if (jump < 4 && !this.world.blocked(st.x, st.y + 0.05, st.z, a.r * 0.8, 1.0, 0)) {
        a.pos.x = st.x
        a.pos.y = st.y
        a.pos.z = st.z
      }
      a.vel.x = st.vx
      a.vel.y = st.vy
      a.vel.z = st.vz
      a.crouch = st.c
      a.h = st.h
      a.onGround = st.g
      a.walking = !!cmd.walk
      if (a.onGround && !a.walking && Math.hypot(st.vx, st.vz) > 3) {
        a.stepDist += Math.hypot(st.vx, st.vz) * dt
        if (a.stepDist > 1.9) {
          a.stepDist = 0
          this.sound('step' + Math.floor(Math.random() * 4), a.pos, { who: a, range: 22, gain: 0.8 })
        }
      }
    } else if (!st || st.seq !== a.spawnSeq) this.moveActor(a, {}, dt)
  }
  /** Client: move yourself, and ease everyone else toward where the host last said they were. */
  clientUpdate(dt, input) {
    this.time += dt
    const me = this.player
    if (me?.alive) this.act(me, input ?? {}, dt)
    for (const a of this.actors) {
      if (a === me || !a.net) continue
      const n = a.net
      const k = Math.min(1, dt * 14)
      // extrapolate a little with their velocity, then ease toward it
      const tx = n.x + n.vx * Math.min(0.1, this.time - n.at)
      const tz = n.z + n.vz * Math.min(0.1, this.time - n.at)
      if (Math.hypot(tx - a.pos.x, tz - a.pos.z) > 3) {
        a.pos.x = tx
        a.pos.z = tz
        a.pos.y = n.y
      } else {
        a.pos.x += (tx - a.pos.x) * k
        a.pos.z += (tz - a.pos.z) * k
        a.pos.y += (n.y - a.pos.y) * k
      }
      a.vel.x = n.vx
      a.vel.z = n.vz
      const dy = Math.atan2(Math.sin(n.yaw - a.yaw), Math.cos(n.yaw - a.yaw))
      a.yaw += dy * k
      a.pitch += (n.pitch - a.pitch) * k
      a.crouch += (n.crouch - a.crouch) * k
    }
    // smoke clouds grow and fade here too
    const now = this.time
    for (const s of this.world.smokes) {
      const age = now - s.born
      s.r = age < 1.5 ? 4.6 * (age / 1.5) : now > s.until - 2 ? 4.6 * Math.max(0, (s.until - now) / 2) : 4.6
    }
    for (const f of this.world.fires) f.r = Math.min(f.max, f.max * (0.35 + (now - f.born) / 0.8))
  }

  // ================= For the HUD =================
  teamAlive(t) {
    return this.actors.filter((a) => a.team === t && a.alive).length
  }
}
