// Pure economy selectors. Shared by the store, the UI and the balance simulator
// (scripts/simulate.mjs), so the numbers the player sees are the numbers the sim tests.
import {
  ADS,
  AUDIT,
  BOT_PRICE,
  COMPANY_PRICE,
  EQUIPPABLES,
  FREE_TRIAL_TRANSLATIONS,
  LOANS,
  LOOT_BOXES,
  LOOT_BOX_BY_ID,
  MAX_EQUIPPED,
  PICKAXE_LEVELS,
  PREMIUM_ITEMS,
  STAMINA_LEVELS,
  STAMINA_REGEN_MS,
  TABLE_LIMIT,
} from '../data/gameData'
import { EVENT_BY_ID } from '../data/events'
import { combineMods, ngPlusMods } from '../data/runMods'
import { dailyMods } from '../data/daily'
import { cheatMods } from '../data/cheats'
import { priceTranslation } from './translator'
import { rogueModList } from '../data/rogue'
import { FORGE, NAS, NAS_TIERS } from '../data/expansions'

export const hasSkill = (s, id) => !!s.skills?.[id]
const equippedDefs = (s) => s.equipped.map((uid) => EQUIPPABLES[s.items.find((i) => i.uid === uid)?.itemId]).filter(Boolean)

// The equipped items as a sorted id list (the loadout), cached per `equipped` array: equipping
// always makes a new array, and an item's id never changes.
const loadouts = new WeakMap()
function loadoutKey(s) {
  const eq = s.equipped
  if (!eq?.length) return ''
  let key = loadouts.get(eq)
  if (key == null) {
    key = equippedDefs(s)
      .map((d) => d.id)
      .sort()
      .join(',')
    loadouts.set(eq, key)
  }
  return key
}
/** The equipped items' run modifiers, combined: numbers multiply, autoSwings add up, flags switch on. */
export function itemMods(defs) {
  const out = {}
  for (const d of defs) {
    for (const [k, v] of Object.entries(d.mods ?? {})) {
      if (typeof v !== 'number') out[k] = out[k] || v
      else out[k] = k === 'autoSwings' ? (out[k] ?? 0) + v : (out[k] ?? 1) * v
    }
  }
  return out
}

/**
 * Everything bending the rules right now: New Game+ curses, the Daily Challenge's modifiers, the
 * running limited-time event, any cheats switched on and your equipped items, combined (numbers
 * multiply, flags switch on). Cached per mix.
 */
const modsCache = new Map()
export function activeMods(s) {
  const cheats = s.cheats?.toggles ?? []
  const loadout = loadoutKey(s)
  const rogue = s.mode === 'rogue' ? s.rogue : null
  const key = `${s.event?.id ?? ''}|${s.ngPlus ?? 0}|${s.mode === 'daily' ? (s.daily?.mods ?? []).join(',') : ''}|${cheats.join(',')}|${loadout}|${rogue ? [...rogue.perks, ...rogue.debuffs].join(',') : ''}`
  let mods = modsCache.get(key)
  if (!mods) {
    const event = s.event && EVENT_BY_ID[s.event.id]?.mods
    const items = loadout && itemMods(equippedDefs(s))
    mods = Object.freeze(combineMods(ngPlusMods(s.ngPlus ?? 0), ...(s.mode === 'daily' ? dailyMods(s.daily?.mods) : []), ...rogueModList(rogue), event, ...cheatMods(cheats), items))
    modsCache.set(key, mods)
  }
  return mods
}
/** Kept for the call sites that predate NG+ and dailies: it's all the same modifiers now. */
export const eventMods = activeMods
const priceMult = (s) => activeMods(s).priceMult ?? 1

/** ×5 per Prestige, or ×10 with Transcendence (retroactively). */
export const prestigeBase = (s) => (hasSkill(s, 'transcendence') ? 10 : 5)

export function getMultiplier(s) {
  let m = prestigeBase(s) ** s.prestige
  for (const def of equippedDefs(s)) if (def.multiplier) m *= def.multiplier
  for (const def of PREMIUM_ITEMS) if (def.multiplier && s.premium[def.id]) m *= def.multiplier
  return m
}

export const hasCorrectTranslation = (s) => hasSkill(s, 'fluent') || equippedDefs(s).some((d) => d.translates)
export const isAuditImmune = (s) => equippedDefs(s).some((d) => d.auditImmune)
export const trialTranslationsLeft = (s) => Math.max(0, FREE_TRIAL_TRANSLATIONS - (s.stats.translations ?? 0))

/** A Mystery Box's price × Bulk Discount × Dynamic Pricing™ surge × events, items and curses. */
export const getLootboxPrice = (s, boxId = 'cardboard') =>
  Math.max(
    1,
    Math.round((LOOT_BOX_BY_ID[boxId] ?? LOOT_BOXES[0]).price * (hasSkill(s, 'bulk') ? 0.7 : 1) * (s.surge ?? 1) * (eventMods(s).boxPrice ?? 1) * priceMult(s)),
  )
/** Upgrade prices (New Game+ Inflation doubles them). `level` is the level being bought. */
export const getPickaxeCost = (s, level = s.pickaxeLevel + 1) => (PICKAXE_LEVELS[level - 1]?.cost ?? Infinity) * priceMult(s)
export const getStaminaCost = (s, level = s.staminaLevel + 1) => (STAMINA_LEVELS[level - 1]?.cost ?? Infinity) * priceMult(s)
export const getBotPrice = (s) => BOT_PRICE * priceMult(s)
/** One quintillion dollars (ten, on NG+5's Hostile Board). */
export const getCompanyPrice = (s) => COMPANY_PRICE * (activeMods(s).companyPrice ?? 1)

export const getMiningRate = (s) =>
  Math.round(PICKAXE_LEVELS[s.pickaxeLevel - 1].perClick * getMultiplier(s) * (hasSkill(s, 'calloused') ? 1.5 : 1) * (eventMods(s).mining ?? 1))

export const getLoanOffers = (s) => LOANS.offersInSwings.map((n) => n * Math.max(1, getMiningRate(s)))
export const getCreditScore = (s) => Math.max(300, Math.min(850, 850 - 40 * (s.stats.loansTaken ?? 0) - 120 * (s.stats.repos ?? 0)))

/** Translation bill: Vowel Tax (unless it's a Tax Holiday), Word Coupon, AI Hype pricing. */
export function quoteTranslation(s, text) {
  const mods = eventMods(s)
  return priceTranslation(text, { coupon: hasSkill(s, 'coupon'), vowelTax: !mods.noVowelTax, factor: (mods.translatePrice ?? 1) * (mods.priceMult ?? 1) })
}

export const getRoulettePayouts = (s) => ({
  red: hasSkill(s, 'lucky_socks') ? 2.5 : 2,
  black: hasSkill(s, 'lucky_socks') ? 2.5 : 2,
  green: hasSkill(s, 'house_friend') ? 50 : 35,
})

/** The most you can bet on one spin. ×10 per Prestige, ×100 more with High Roller, ×10 with a Velvet Rope. */
export const getTableLimit = (s) =>
  TABLE_LIMIT.base * TABLE_LIMIT.perPrestige ** s.prestige * (hasSkill(s, 'high_roller') ? TABLE_LIMIT.highRoller : 1) * (activeMods(s).tableLimit ?? 1)

export const getMaxStamina = (s) => Math.round(STAMINA_LEVELS[s.staminaLevel - 1].max * (activeMods(s).stamina ?? 1))
export const getStaminaRegenMs = (s) => STAMINA_REGEN_MS / (hasSkill(s, 'second_wind') ? 2 : 1) / (activeMods(s).regen ?? 1)
export const getMaxEquipped = (s) => MAX_EQUIPPED + (hasSkill(s, 'hoarder') ? 2 : 0)
export const getAuditRate = (s) => (hasSkill(s, 'tax_lawyer') ? 0.1 : AUDIT.rate)
/** Swings per second nobody has to click: the Auto-Miner skill plus hamsters, interns and geese. */
export const getAutoSwings = (s) => (hasSkill(s, 'autominer') ? (hasSkill(s, 'overclock') ? 3 : 1) : 0) + (activeMods(s).autoSwings ?? 0)
/** What a "click" is worth in the Arcade: $10, ×5 per Prestige. (Not your pickaxe: upgrading it doesn't make the Arcade dearer.) */
export const ARCADE_CLICK = 10
/** Arcade prices and prizes are quoted in clicks. */
export const getArcadePrice = (s, clicks) => Math.max(1, Math.round(ARCADE_CLICK * prestigeBase(s) ** s.prestige * clicks))

/** Ye Olde Forge and the HomeLab NAS earn in swings of your pickaxe; their upgrades cost fixed dollars. */
export const getForgeRate = (s, level = s.forge?.level ?? 1) => FORGE.swingsPerSecond(level) * Math.max(1, getMiningRate(s))
export const getForgeUpgradeCost = (s, level = s.forge?.level ?? 1) => FORGE.upgradeCost(level) * priceMult(s)
export const getForgeThemePrice = (s, theme) => theme.price * priceMult(s)
export const getNasRate = (s, tier = s.nas?.tier ?? 0) => NAS_TIERS[tier].bays * NAS.swingsPerSecondPerBay * Math.max(1, getMiningRate(s))
export const getNasUpgradeCost = (s, tier = s.nas?.tier ?? 0) => NAS.upgradeCost(tier) * priceMult(s)
/** What one rewarded ad pays (Ad Enjoyer Goggles triple it). */
export const getAdReward = (s, clicks) => getMiningRate(s) * clicks * (activeMods(s).adReward ?? 1)
/** What a translation contract pays on delivery (Business Cards double it). */
export const getContractPay = (s, job) => Math.round(job.payout * (activeMods(s).contract ?? 1))

/** Milliseconds between ads (skills stretch it; Double Money Hour halves it). */
export function getAdInterval(s) {
  const base = hasSkill(s, 'ad_blocker') ? ADS.adBlockerMs : hasSkill(s, 'thick_skin') ? ADS.thickSkinMs : ADS.intervalMs
  return base / (eventMods(s).adRate ?? 1)
}

/** Whole seconds left on a CAPTCHA lockout, measured against the shared clock. */
export const lockSecondsLeft = (s, action, now = s.clock) => Math.max(0, Math.ceil(((s.lockouts[action] ?? 0) - now) / 1000))
export const catIsAngry = (s) => Object.values(s.cat).some((v) => v <= 0)
/** Inflation scales with your wealth. Free on Cat Appreciation Day. */
export const getCatFoodCost = (s) => (eventMods(s).freeFood ? 0 : Math.max(5, Math.floor(s.money * 0.01)) * priceMult(s))
/** You owe Vinnie more than you have. One scratch now is fatal. */
export const isUnderwater = (s) => !!s.loan && s.loan.debt > s.money

export function skillStatus(s, skill) {
  if (hasSkill(s, skill.id)) return 'owned'
  if (!skill.requires.every((r) => hasSkill(s, r))) return 'locked'
  return s.skillPoints >= skill.cost ? 'available' : 'poor'
}
