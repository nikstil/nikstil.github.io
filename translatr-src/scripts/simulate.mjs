// Balance simulator: plays TRANSLATR™ with a simple, reasonably smart policy and reports how
// long the milestones take. It loads the game's own economy code (src/lib/economy.js and
// src/data/gameData.js) through Vite, so the numbers it tests are the numbers players get.
//
//   npm run simulate                 # 24 runs of each strategy
//   npm run simulate -- --runs 60    # more runs
//
// The optimal policy (per simulated second): prestige the moment a relic drops, learn skills, buy
// pickaxe/stamina upgrades, watch rewarded ads when they're off cooldown, open ×50 bundles of the
// best Mystery Box it can comfortably afford (relics via pity, items for the loadout), equip the
// items that pay the most, bet at the roulette table when it's +EV (half-Kelly, capped by the table
// limit), otherwise mine. Audits, CAPTCHAs, lockouts, ads, rats and the cat all cost time or money.
//
// The casual policy is a person playing it for the first time: slower clicks, more time lost to
// popups, ×10 boxes instead of CAPTCHA'd ×50 bundles, only half the rewarded ads, a pause to read
// before every Prestige, and flat 15% bets at the table now and then. The target: a casual player
// without microtransactions buys TRANSLATR™ within 90 minutes (the slow ones too: see p80).

import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const RUNS = Number(args[args.indexOf('--runs') + 1]) || 24
const LIMIT_S = 6 * 3600

const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const G = await vite.ssrLoadModule('/src/data/gameData.js')
const E = await vite.ssrLoadModule('/src/lib/economy.js')
const X = await vite.ssrLoadModule('/src/data/expansions.js')
await vite.close()

// How a human spends time (seconds).
const T = {
  click: 0.18, // ~5.5 clicks a second while there's stamina
  ad: 12, // watch + claim
  spin: 3.4,
  bundle: 3.5, // buy ×50 + skim the results
  captcha: 8,
  captchaPass: 0.75,
  lockout: 30,
  upkeep: 0.07, // share of time spent closing ads, feeding/petting the cat, reading popups
}
const PROFILES = {
  optimal: { label: 'Optimal player, no microtransactions', T, bundle: 50, adChance: 1, prestigePause: 2, spinChance: 1, bet: 'kelly', spinFromMult: 2, collectEvery: 30 },
  casual: {
    label: 'Casual player, no microtransactions (the target: under 90 minutes)',
    T: { ...T, click: 0.3, ad: 15, bundle: 4, upkeep: 0.25 },
    bundle: 10,
    adChance: 0.5,
    prestigePause: 25,
    spinChance: 0.35,
    bet: 0.15,
    spinFromMult: 5,
    collectEvery: 120,
  },
}
PROFILES.slow = {
  ...PROFILES.casual,
  label: 'Slow player, no microtransactions (distracted, skips most ads, rarely gambles)',
  T: { ...PROFILES.casual.T, click: 0.4, upkeep: 0.4 },
  adChance: 0.25,
  prestigePause: 60,
  spinChance: 0.15,
  bet: 0.1,
}
PROFILES.whale = { ...PROFILES.optimal, label: 'Whale (Midas Ring, relic packs, skill points)', whale: true }
const RAT_CHANCE = 0.15 // SPOILED_BOX_CHANCE in the store
const SKILL_ORDER = [
  'calloused', 'crit', 'bulk', 'lucky_socks', 'autominer', 'appraiser', 'charm', 'insurance', 'house_friend', 'box_whisperer',
  'high_roller', 'second_wind', 'overclock', 'hoarder', 'card_counter', 'coupon', 'thick_skin', 'fluent', 'motherlode', 'rigged',
  'pity_party', 'polyglot', 'ad_blocker', 'tax_lawyer', 'enlightenment', 'transcendence',
]
const SKILL = Object.fromEntries(G.SKILLS.map((k) => [k.id, k]))
const MILESTONES = [
  ['prestige1', (s) => s.prestige >= 1],
  ['$1M', (s) => s.peak >= 1e6],
  ['$1B', (s) => s.peak >= 1e9],
  ['$1T', (s) => s.peak >= 1e12],
  ['$1Qa', (s) => s.peak >= 1e15],
  ['BUY', (s) => s.money >= G.COMPANY_PRICE],
]

function freshState(whale) {
  return {
    t: 0,
    money: 0,
    peak: 0,
    pickaxeLevel: 1,
    staminaLevel: 1,
    stamina: G.STAMINA_LEVELS[0].max,
    regenAcc: 0,
    prestige: 0,
    skillPoints: whale ? 9 : 0, // the whale buys Skill Issue Fix™ ×3 on day one
    skills: {},
    items: [],
    equipped: [],
    premium: whale ? { midas: 1 } : {},
    surge: 1.2,
    event: null,
    pity: 0,
    adReadyAt: 0,
    lockedUntil: 0,
    auditAt: 10,
    catFoodAt: 80,
    stats: { clicks: 0, translations: 0, loansTaken: 0, repos: 0 },
    boxes: {},
    loan: null,
    relics: 0,
    seq: 0,
    whale,
    whaleRelicsLeft: whale ? 4 : 0,
    expansions: {},
    forge: { level: 1, stored: 0 },
    nas: { tier: 0 },
    collectAt: 0,
  }
}

const uid = (s) => `i${s.seq++}`
const has = (s, id) => !!s.skills[id]

/** Roughly how much an item multiplies income, for picking the loadout. */
function itemValue(d) {
  const m = d.mods ?? {}
  let v = (d.multiplier ?? 1) * (m.mining ?? 1)
  if (m.autoSwings) v *= 1 + m.autoSwings * 0.25 // vs ~4 swings a second by hand
  if (d.auditImmune) v *= 1.15
  if (m.auditChance) v *= 1.05
  if (m.casino) v *= 1 + (m.casino - 1) * 0.2
  if (m.stamina || m.regen) v *= 1.1
  if (m.adReward) v *= 1.1
  if (m.luck || m.relic || m.pity) v *= 1.05
  return v
}

function equipBest(s) {
  const slots = E.getMaxEquipped(s)
  const want = s.items
    .filter((i) => G.EQUIPPABLES[i.itemId] && itemValue(G.EQUIPPABLES[i.itemId]) > 1)
    .sort((a, b) => itemValue(G.EQUIPPABLES[b.itemId]) - itemValue(G.EQUIPPABLES[a.itemId]))
    .slice(0, slots)
  s.equipped = want.map((i) => i.uid)
}

/**
 * Which box to open a ×50 bundle of (null: none yet). Cardboard is the cheap way to fill the pity
 * counter and find commons; the pricier boxes are for rarer items once a bundle is pocket change
 * (Platinum at a quarter of the wallet, Golden at a fortieth).
 */
function pickBox(s, n = 50) {
  const bundle = (id) => n * E.getLootboxPrice(s, id)
  if (s.money >= bundle('platinum') * 4) return 'platinum'
  if (s.money >= bundle('golden') * 40) return 'golden'
  if (s.money >= bundle('cardboard') * 4) return 'cardboard'
  return null
}

function prestige(s) {
  s.items = s.items.filter((i) => i.itemId !== G.RELIC.id)
  s.prestige += 1
  s.skillPoints += G.skillPointsForPrestige(s.prestige)
  Object.assign(s, { money: 0, pickaxeLevel: 1, staminaLevel: 1, stamina: G.STAMINA_LEVELS[0].max, items: [], equipped: [], forge: { level: 1, stored: 0 }, nas: { tier: 0 } })
}

function learnSkills(s) {
  for (const id of SKILL_ORDER) {
    const k = SKILL[id]
    if (!k || s.skills[id]) continue
    if (E.skillStatus(s, k) === 'available') {
      s.skillPoints -= k.cost
      s.skills[id] = true
    } else if (E.skillStatus(s, k) === 'poor') return // save up for the next one in order
  }
}

function openBundle(s, boxId, n = 50) {
  const cost = n * E.getLootboxPrice(s, boxId)
  if (s.money < cost) return false
  s.money -= cost
  s.boxes[boxId] = (s.boxes[boxId] ?? 0) + n
  const mods = E.activeMods(s)
  const charm = has(s, 'charm')
  const luck = { relicMult: (charm ? 10 : 1) * (mods.relic ?? 1), equipMult: (charm ? 2 : 1) * (mods.luck ?? 1) }
  const step = G.LOOT_BOX_BY_ID[boxId].pity * (has(s, 'pity_party') ? 2 : 1) * (mods.pity ?? 1)
  for (let i = 0; i < n; i++) {
    let loot = G.rollLoot(boxId, luck)
    s.pity += step
    const missing = boxId === 'platinum' ? Object.keys(X.EXPANSIONS).filter((id) => !s.expansions[id]) : []
    if (missing.length && Math.random() < X.EXPANSION_DROP_CHANCE) {
      s.expansions[missing[Math.floor(Math.random() * missing.length)]] = true
      continue
    }
    if (Math.random() < RAT_CHANCE && !(loot.kind !== 'relic' && s.pity >= G.RELIC_PITY)) continue
    if (loot.kind !== 'relic' && s.pity >= G.RELIC_PITY) loot = { kind: 'relic', id: G.RELIC.id }
    if (loot.kind === 'relic') s.pity = 0
    if (loot.kind !== 'trash') s.items.push({ uid: uid(s), itemId: loot.id })
  }
  equipBest(s)
  return true
}

function spin(s, flat) {
  const limit = E.getTableLimit(s)
  const M = E.getMultiplier(s)
  const pay = E.getRoulettePayouts(s).red
  const pWin = 17 / 36 + (has(s, 'rigged') ? (19 / 36) * 0.2 : 0)
  const casino = E.activeMods(s).casino ?? 1
  const b = pay * M * casino - 1
  const kelly = (pWin * (b + 1) - 1) / b
  if (!(kelly > 0)) return false
  const bet = Math.floor(Math.min(limit, s.money * (flat ?? kelly * 0.5)))
  if (bet < 1) return false
  s.money -= bet
  if (Math.random() < pWin) s.money += Math.round(bet * pay * M * casino)
  else if (has(s, 'insurance')) s.money += Math.floor(bet * 0.25)
  return true
}

/** One simulated player, until they can buy the company (or give up after LIMIT_S). */
function play(P) {
  const T = P.T
  const whale = !!P.whale
  const s = freshState(whale)
  let relicSince = null
  const hit = {}
  let busyUntil = 0
  let spinCaptchaUntil = 0
  while (s.t < LIMIT_S) {
    const dt = 1
    s.t += dt
    // passive income + stamina
    const auto = E.getAutoSwings(s)
    if (auto) s.money += auto * E.getMiningRate(s) * (has(s, 'crit') ? 1.9 : 1)
    if (s.prestige >= 1 && s.t > 60) s.money += E.getMiningRate(s) * 0.6 // the bot (mine mode), collected now and then
    if (s.expansions.nas) s.money += E.getNasRate(s)
    if (s.expansions.forge) s.forge.stored += E.getForgeRate(s)
    s.regenAcc += dt * 1000
    const regen = E.getStaminaRegenMs(s)
    while (s.regenAcc >= regen) {
      s.regenAcc -= regen
      s.stamina = Math.min(E.getMaxStamina(s), s.stamina + 1)
    }
    // costs
    if (s.t >= s.auditAt) {
      s.auditAt = s.t + 10
      if (s.money > G.AUDIT.threshold && !E.isAuditImmune(s) && Math.random() < G.AUDIT.chance * (E.activeMods(s).auditChance ?? 1)) s.money -= Math.floor(s.money * E.getAuditRate(s))
    }
    if (s.t >= s.catFoodAt) {
      s.catFoodAt = s.t + 80
      s.money -= E.getCatFoodCost(s)
      if (s.money < 0) s.money = 0
    }
    s.peak = Math.max(s.peak, s.money)
    for (const [name, check] of MILESTONES) if (hit[name] == null && check(s)) hit[name] = s.t
    if (hit.BUY != null) break

    // decisions (a human does one thing at a time)
    if (s.t < busyUntil) continue
    let spent = 0
    if (s.whale && s.whaleRelicsLeft > 0 && s.prestige < 4 && !s.items.some((i) => i.itemId === G.RELIC.id)) {
      s.whaleRelicsLeft -= 1 // Prestige Relic Starter Pack
      s.items.push({ uid: uid(s), itemId: G.RELIC.id })
    }
    if (s.items.some((i) => i.itemId === G.RELIC.id)) {
      relicSince ??= s.t
      if (s.t - relicSince >= P.prestigePause) {
        prestige(s)
        relicSince = null
        spent = 2
      }
    }
    if (!spent && s.expansions.forge && s.t >= s.collectAt) {
      s.money += Math.floor(s.forge.stored)
      s.forge.stored = 0
      s.collectAt = s.t + P.collectEvery
      spent = 1
    }
    for (const [has, level, max, cost, up] of [
      [s.expansions.forge, s.forge.level, X.FORGE.maxLevel, () => E.getForgeUpgradeCost(s), () => (s.forge.level += 1)],
      [s.expansions.nas, s.nas.tier + 1, X.NAS_TIERS.length, () => E.getNasUpgradeCost(s), () => (s.nas.tier += 1)],
    ]) {
      if (!spent && has && level < max && cost() < s.money * 0.25) {
        s.money -= cost()
        up()
        spent = 0.5
      }
    }
    learnSkills(s)
    const nextPick = G.PICKAXE_LEVELS[s.pickaxeLevel]
    const nextSta = G.STAMINA_LEVELS[s.staminaLevel]
    const boxId = pickBox(s, P.bundle)
    if (!spent && nextPick && s.money >= nextPick.cost) {
      s.money -= nextPick.cost
      s.pickaxeLevel += 1
      spent = 0.5
    } else if (!spent && nextSta && s.money >= nextSta.cost && nextSta.cost < s.money * 0.1) {
      s.money -= nextSta.cost
      s.staminaLevel += 1
      s.stamina += 10
      spent = 0.5
    } else if (!spent && s.t >= s.adReadyAt) {
      if (Math.random() < P.adChance) {
        s.money += E.getAdReward(s, G.REWARDED_AD_CLICKS)
        s.adReadyAt = s.t + T.ad + G.REWARDED_AD_COOLDOWN_MS / 1000
        spent = T.ad
      } else s.adReadyAt = s.t + G.REWARDED_AD_COOLDOWN_MS / 1000
    } else if (!spent && boxId && (!nextPick || nextPick.cost > s.money * 4)) {
      if (P.bundle < 50 || has(s, 'box_whisperer')) {
        openBundle(s, boxId, P.bundle)
        spent = T.bundle
      } else if (s.t >= s.lockedUntil) {
        spent = T.bundle + T.captcha
        if (Math.random() < T.captchaPass) openBundle(s, boxId)
        else s.lockedUntil = s.t + T.lockout
      }
    }
    if (!spent && E.getMultiplier(s) >= P.spinFromMult && s.t >= spinCaptchaUntil && Math.random() < P.spinChance && spin(s, P.bet === 'kelly' ? undefined : P.bet)) {
      spent = T.spin
      if (Math.random() < G.CAPTCHA.rouletteChance) {
        spent += T.captcha
        if (Math.random() > T.captchaPass) spinCaptchaUntil = s.t + T.lockout
      }
    }
    if (!spent && s.stamina > 0) {
      const clicks = Math.min(s.stamina, Math.floor(1 / T.click))
      const rate = E.getMiningRate(s) * (has(s, 'crit') ? 1.9 : 1) * (has(s, 'motherlode') ? 1 + 99 / 25 : 1)
      s.money += clicks * rate
      s.stamina -= clicks
      s.stats.clicks += clicks
      spent = clicks * T.click
    }
    busyUntil = s.t + spent * (1 + T.upkeep)
  }
  return { hit, expansions: Object.keys(s.expansions), prestige: s.prestige, skills: Object.keys(s.skills).length, boxes: s.boxes, loadout: s.equipped.map((u) => s.items.find((i) => i.uid === u)?.itemId) }
}

const quantile = (xs, q) => {
  const v = xs.map((x) => x ?? Infinity).sort((a, b) => a - b)
  const x = v[Math.min(v.length - 1, Math.floor(v.length * q))]
  return Number.isFinite(x) ? x : null
}
const median = (xs) => quantile(xs, 0.5)
const fmt = (sec) => (sec == null ? '  —   ' : `${String(Math.floor(sec / 60)).padStart(3)}m${String(Math.floor(sec % 60)).padStart(2, '0')}s`)

const only = args.includes('--profile') ? [args[args.indexOf('--profile') + 1]] : Object.keys(PROFILES)
for (const key of only) {
  const P = PROFILES[key]
  const runs = Array.from({ length: RUNS }, () => play(P))
  console.log(`\n${P.label} · ${RUNS} runs · median (and slowest-20%) time to each milestone`)
  for (const [name] of MILESTONES) {
    const times = runs.map((r) => r.hit[name])
    const done = times.filter((x) => x != null).length
    console.log(`  ${name.padEnd(10)} ${fmt(median(times))}  p80 ${fmt(quantile(times, 0.8))}   (${done}/${RUNS} within ${LIMIT_S / 3600}h)`)
  }
  console.log(`  expansions dropped: forge ${runs.filter((r) => r.expansions.includes('forge')).length}/${RUNS} · nas ${runs.filter((r) => r.expansions.includes('nas')).length}/${RUNS}`)
  console.log(`  prestiges at the end: median ${median(runs.map((r) => r.prestige))} · skills learned: median ${median(runs.map((r) => r.skills))}`)
  const boxes = Object.fromEntries(G.LOOT_BOXES.map((b) => [b.id, median(runs.map((r) => r.boxes[b.id] ?? 0))]))
  console.log(`  boxes opened (median): ${G.LOOT_BOXES.map((b) => `${b.emoji} ${boxes[b.id].toLocaleString()}`).join(' · ')}`)
  console.log(`  a final loadout: ${runs[0].loadout.join(', ') || '(nothing)'}`)
}
