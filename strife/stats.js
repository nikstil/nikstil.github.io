// Your COUNTER-STRIFE career, for the achievements: kills by weapon, headshots, aces, clutches,
// plants and defuses, wins on each map. Saved locally; nikstil.com's achievement hub reads it.

import { check, toast } from '../achievements/list.js'

const KEY = 'strife-stats'
let s = load()
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null') ?? {}
  } catch {
    return {}
  }
}
let dirty = false
function bump(k, by = 1) {
  s[k] = (s[k] ?? 0) + by
  dirty = true
}
/** Saves, and pops a toast for any achievement this unlocked. */
export function commit() {
  if (!dirty) return
  dirty = false
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
  try {
    toast(check())
  } catch {}
}

// this round, for aces and clutches
let roundKills = 0
let clutchChance = false

/** Hooks: call from the game's events. `me` is your soldier; `game` the match. */
export const track = {
  roundStart() {
    roundKills = 0
    clutchChance = false
  },
  kill(e, me, game) {
    if (!me) return
    if (e.attacker === me && e.victim.team !== me.team) {
      bump('kills')
      if (e.headshot) bump('headshots')
      s.byWeapon ??= {}
      s.byWeapon[e.weaponId] = (s.byWeapon[e.weaponId] ?? 0) + 1
      const w = e.weaponId
      if ((w === 'awp' || w === 'ssg08' || w === 'g3sg1' || w === 'scar20') && !me.scope) bump('noscopes')
      if (me.flashUntil > game.time) bump('blindKills')
      if (!me.onGround) bump('airKills')
      roundKills++
      if (roundKills === 5 && game.actors.filter((a) => a.team !== me.team).length >= 5) bump('aces')
    }
    // last one standing against two or more?
    if (me.alive) {
      const mates = game.actors.filter((a) => a.team === me.team && a.alive).length
      const foes = game.actors.filter((a) => a.team !== me.team && a.alive).length
      if (mates === 1 && foes >= 2) clutchChance = true
    }
    commit()
  },
  planted(e, me) {
    if (e.a === me) bump('plants'), commit()
  },
  defused(e, me) {
    if (e.a !== me) return
    bump('defuses')
    if (e.left != null && e.left < 1) bump('ninja')
    commit()
  },
  roundEnd(e, me, online) {
    if (!me) return
    const won = e.winner === me.team
    if (e.mvp === me) bump('mvps')
    if (won && clutchChance && me.alive) bump('clutches')
    if (won && online) bump('onlineRounds')
    commit()
  },
  matchOver(won, mapId, difficulty) {
    if (won) {
      s.winsOn ??= {}
      s.winsOn[mapId] = (s.winsOn[mapId] ?? 0) + 1
      if (difficulty >= 3) s.expertWin = true
      dirty = true
    }
    commit()
  },
  hostedWithFriend() {
    if (!s.hostedWithFriend) {
      s.hostedWithFriend = true
      dirty = true
      commit()
    }
  },
  /** inventory changes (cases opened, skins equipped) count too */
  poke() {
    dirty = true
    commit()
  },
}
