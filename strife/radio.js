// Radio commands and chat: what the soldiers say to each other, and how the bots listen and talk
// back. The Chatter lives with the match (on the host, or offline) and only ever speaks through
// game.chat() and game.radio(), so everything it says reaches online players like any other event.

/** Every radio line. place: the line says where (yours, or the enemy's for "spotted"). */
export const RADIO = {
  // Z: commands
  go: { text: 'Go, go, go!', order: 'go' },
  fallback: { text: 'Fall back!', order: 'fallback' },
  regroup: { text: 'Regroup, team.', order: 'regroup' },
  follow: { text: 'Follow me.', order: 'follow' },
  hold: { text: 'Hold this position.', order: 'hold', place: true },
  cover: { text: 'Cover me!', order: 'follow' },
  // X: team talk
  affirm: { text: 'Affirmative.' },
  negative: { text: 'Negative.' },
  spotted: { text: 'Enemy spotted', place: true, order: 'spotted' },
  backup: { text: 'Need backup!', place: true, order: 'backup' },
  clear: { text: 'Sector clear', place: true },
  inpos: { text: 'I’m in position', place: true },
  thanks: { text: 'Thanks!' },
  // C: reports
  roger: { text: 'Roger that.' },
  down: { text: 'Enemy down.' },
  drop: { text: 'I need a drop!' },
  lastone: { text: 'I’m the last one.' },
  planting: { text: 'Planting the bomb', place: true },
  blow: { text: 'Get out of there, it’s gonna blow!' },
  nice: { text: 'Nice shot!' },
}
/** The three radio menus (Z, X, C), in key order 1-7. */
export const RADIO_MENUS = {
  z: { name: 'Commands', ids: ['go', 'fallback', 'regroup', 'follow', 'hold', 'cover'] },
  x: { name: 'Team', ids: ['affirm', 'negative', 'spotted', 'backup', 'clear', 'inpos', 'thanks'] },
  c: { name: 'Reports', ids: ['roger', 'down', 'drop', 'lastone', 'planting', 'blow', 'nice'] },
}
/** A radio line as it reads in the chat. */
export function radioText(id, place) {
  const r = RADIO[id]
  if (!r) return ''
  if (!r.place || !place) return /[.!?]$/.test(r.text) ? r.text : r.text + '.'
  return `${r.text.replace(/[.!?]$/, '')} ${id === 'spotted' || id === 'backup' ? 'at' : 'in'} ${place}.`
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z)
const chance = (p) => Math.random() < p

// What bots say back to a player's chat line (first match wins).
const REPLIES = [
  [/^\s*g+\s*g+(\s*w+\s*p+)?\b|^ggs?\b/i, ['gg', 'gg wp', 'ggs', 'gg!', 'gg ez... jk, gg']],
  [/\b(hi|hello|hey|yo|sup|hiya)\b/i, ['hey', 'hi :)', 'o/', 'sup', 'hello there']],
  [/\b(ns|nice shot|nice one|wp|well played|good shot)\b/i, ['ty', 'thanks!', 'ty ty', ':)']],
  [/\b(sorry|my bad|mb|oops)\b/i, ['np', 'all good', 'it happens', 'np np']],
  [/\b(ez|noob|trash|bad|bots?)\b/i, ['ok buddy', 'who asked', 'I’m not a bot, YOU’RE a bot', 'say that after the round', 'beep boop']],
  [/\b(lol|lmao|haha|xd)\b/i, ['lol', 'haha', 'xD']],
  [/\b(nt|nice try)\b/i, ['ty', 'next one', 'unlucky']],
]
const DEATH_LINES = ['nice shot', 'lucky', 'how??', 'bruh', 'ok that was clean', 'my mouse slipped', 'lag']
const HEADSHOT_LINES = ['what a shot', 'one tap?!', 'headshot machine', 'aimbot??']
const KNIFE_LINES = ['bruh', 'KNIFED', 'the disrespect', 'I’m uninstalling']
const TEAM_DEATH_LINES = ['nt', 'nt nt', 'unlucky', 'we got this']
const GG_LINES = ['gg', 'gg wp', 'ggs', 'gg!', 'good game', 'gg, again?']
const RUSH_LINES = { A: ['A it is', 'rushing A', 'ok A', 'say less, A'], B: ['rush B, no stop', 'B it is', 'ok B', 'say less, B'] }

export class Chatter {
  constructor(game) {
    this.g = game
    this.queue = [] // { at, fn }
    this.next = { T: 0, CT: 0, all: 0 } // so bots don't talk over each other
    this.spottedAt = {} // enemy id -> time a teammate last called them
  }
  later(delay, fn) {
    this.queue.push({ at: this.g.time + delay, fn })
  }
  update() {
    const now = this.g.time
    for (let k = 0; k < this.queue.length; k++) {
      if (now < this.queue[k].at) continue
      const q = this.queue.splice(k--, 1)[0]
      q.fn()
    }
  }
  /** May this team's bots (or all chat: 'all') say something now? Claims the slot if so. */
  free(key, gap = 2.5) {
    if (this.g.time < this.next[key]) return false
    this.next[key] = this.g.time + gap
    return true
  }
  bots(team) {
    return this.g.actors.filter((x) => x.isBot && x.alive && x.brain && (!team || x.team === team))
  }
  say(b, text, team = false) {
    this.g.chat(b, text, team)
  }
  radio(b, id, place, at) {
    if (b.alive) this.g.radio(b, id, place, at)
  }

  // ---------------- Players talking to the bots
  /** A player gave a radio order: the closest bots do it, and one or two answer. */
  order(from, id) {
    const g = this.g
    const r = RADIO[id]
    if (!r?.order) return
    const near = this.bots(from.team).sort((p, q) => dist(p.pos, from.pos) - dist(q.pos, from.pos))
    if (!near.length) return
    let doers = []
    if (r.order === 'go') {
      if (from.team === 'T') this.goNow()
      for (const b of near) b.brain.clearOrder?.()
      doers = near
    } else if (r.order === 'spotted') {
      const p = aimPoint(g, from)
      if (p) {
        g.intel[from.team].push({ pos: p, at: g.time, id: -1 })
        for (const b of near.slice(0, 3)) b.brain.heardCall?.(p)
      }
      return
    } else {
      doers = r.order === 'follow' ? near.slice(0, 2) : r.order === 'backup' ? near.slice(0, 2) : near
      doers.forEach((b, k) => b.brain.order?.(r.order, from, k))
    }
    const busy = (b) => !!b.brain.target
    doers.slice(0, chance(0.4) ? 2 : 1).forEach((b, k) => this.later(0.5 + k * 0.8 + Math.random() * 0.5, () => this.radio(b, busy(b) ? 'negative' : pick(['roger', 'affirm']))))
  }
  /** The Terrorists stop waiting and go for the site now. */
  goNow() {
    const g = this.g
    if (!g.plan || g.respawns) return
    g.plan.execAt = 0
  }
  /** A new target site for the Terrorist bots ("rush B"): each picks the route closest to them. */
  goSite(site) {
    const g = this.g
    const m = g.map
    if (!g.plan || g.respawns || !m.routes[site] || !(site in g.sites) || g.bomb?.state === 'planted') return false
    g.plan.site = site
    g.plan.execAt = 0
    for (const b of this.bots('T')) {
      b.brain.clearOrder?.()
      // the nearest point of the nearest route to the new site: carry on from there
      let best = null
      for (const route of m.routes[site]) {
        route.path.forEach(([x, z, y], k) => {
          const d = Math.hypot(x + 0.5 - b.pos.x, z + 0.5 - b.pos.z) + (y != null ? Math.abs(y - b.pos.y) * 2 : 0)
          if (!best || d < best.d) best = { d, route, k }
        })
      }
      if (!best) continue
      g.plan.assign[b.id] = { route: best.route, lurk: false }
      b.brain.wp = best.k
      b.brain.plantSpot = null
    }
    return true
  }
  /** A player's chat line: maybe a bot answers, and "rush B" is an order. */
  heard(from, text, teamOnly) {
    const g = this.g
    const rush = text.match(/\b(?:rush|go|push|hit)\s+([ab])\b/i)
    if (rush && from.team === 'T') {
      const site = rush[1].toUpperCase()
      if (this.goSite(site)) {
        const b = this.bots('T')[0]
        if (b) this.later(0.8 + Math.random() * 0.6, () => this.say(b, pick(RUSH_LINES[site]), true))
        return
      }
    }
    for (const [re, lines] of REPLIES) {
      if (!re.test(text)) continue
      const pool = this.bots(teamOnly ? from.team : null).filter((b) => b !== from)
      if (!pool.length) return
      const b = pick(pool)
      this.later(0.9 + Math.random() * 1.4, () => this.say(b, pick(lines), teamOnly))
      return
    }
  }

  // ---------------- The bots' own chatter (every event the match emits comes through here)
  on(name, d) {
    const g = this.g
    if (name === 'kill') this.onKill(d)
    else if (name === 'plantStart' && d.a?.isBot && chance(0.6) && this.free(d.a.team)) this.radio(d.a, 'planting', g.world.calloutAt(d.a.pos.x, d.a.pos.z, d.a.pos.y))
    else if (name === 'hit' && d.victim?.isBot && d.victim.alive && d.victim.hp < 40 && !d.victim.calledBackup) {
      d.victim.calledBackup = true
      if (chance(0.5) && this.free(d.victim.team)) this.radio(d.victim, 'backup', g.world.calloutAt(d.victim.pos.x, d.victim.pos.z, d.victim.pos.y))
    } else if (name === 'roundStart') {
      for (const a of g.actors) a.calledBackup = false
      this.spottedAt = {}
    } else if (name === 'roundEnd' && d.over) {
      // the match is over: a few bots say gg
      const pool = this.bots().sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2))
      pool.forEach((b, k) => this.later(1.2 + k * 1.1 + Math.random(), () => this.say(b, pick(GG_LINES))))
    }
  }
  onKill({ victim, attacker, weaponId, headshot }) {
    const g = this.g
    if (!victim) return
    // the killer calls it
    if (attacker?.isBot && attacker.team !== victim.team && chance(0.3) && this.free(attacker.team)) this.later(0.4, () => this.radio(attacker, 'down'))
    // shot by a human: the bot has something to say about it (dead chat, everyone sees it)
    if (victim.isBot && attacker && !attacker.isBot && attacker.team !== victim.team && chance(weaponId === 'knife' ? 0.6 : headshot ? 0.25 : 0.1) && this.free('all', 7)) {
      const lines = weaponId === 'knife' ? KNIFE_LINES : headshot ? HEADSHOT_LINES : DEATH_LINES
      this.later(1 + Math.random() * 1.5, () => this.say(victim, pick(lines)))
    }
    // a human down on a team with bots: a teammate cheers them up
    if (!victim.isBot && !g.respawns && chance(0.25) && this.free(victim.team, 5)) {
      const b = pick(this.bots(victim.team))
      if (b) this.later(1.5 + Math.random() * 2, () => this.say(b, pick(TEAM_DEATH_LINES), true))
    }
    // the last one standing says so
    if (!g.respawns) {
      const left = g.actors.filter((x) => x.alive && x.team === victim.team)
      const enemies = g.actors.filter((x) => x.alive && x.team !== victim.team)
      if (left.length === 1 && left[0].isBot && enemies.length > 1 && chance(0.6) && this.free(victim.team)) this.later(0.8, () => this.radio(left[0], 'lastone'))
    }
  }
  /** A bot just saw an enemy: now and then it tells the team where. */
  spotted(b, enemy) {
    const g = this.g
    if (!b.isBot || g.time - (this.spottedAt[enemy.id] ?? -99) < 8) return
    this.spottedAt[enemy.id] = g.time
    if (!chance(0.45) || !this.free(b.team, 3)) return
    this.radio(b, 'spotted', g.world.calloutAt(enemy.pos.x, enemy.pos.z, enemy.pos.y), enemy.pos)
  }
}

/** Where a soldier is looking: the first wall along their aim (up to 60 m), or 25 m out. */
export function aimPoint(g, a) {
  const e = { x: a.pos.x, y: a.pos.y + 1.6, z: a.pos.z }
  const d = { x: -Math.sin(a.yaw) * Math.cos(a.pitch), y: Math.sin(a.pitch), z: -Math.cos(a.yaw) * Math.cos(a.pitch) }
  const hit = g.world.trace(e.x, e.y, e.z, d.x, d.y, d.z, 60)
  const t = hit ? Math.max(0, hit.t - 0.5) : 25
  return { x: e.x + d.x * t, y: Math.max(a.pos.y, e.y + d.y * t - 1.2), z: e.z + d.z * t }
}
