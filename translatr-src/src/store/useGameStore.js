import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  EQUIPPABLES,
  LOOT_BOX_BY_ID,
  PICKAXE_LEVELS,
  PREMIUM_ITEMS,
  RELIC,
  RELIC_PITY,
  SKILLS,
  skillPointsForPrestige,
  skillPointsFromPrestiges,
  TRANSLATOR_SKINS,
  BOT_PRICE,
  BOT_PATIENCE,
  BOT_GREED,
  BOT_NAMES,
  REWARDED_AD_CLICKS,
  CAT,
  STAMINA_LEVELS,
  AUDIT,
  CAPTCHA,
  LOANS,
  SURGE,
  TOS,
  FOMO,
  ADS,
  COMPANY_PRICE,
  LEADERBOARD,
  makeFomo,
  rollLoot,
  GEM_ITEMS,
  DAILY_REWARDS,
  AD_CREATIVES,
} from '../data/gameData'
import { ACHIEVEMENTS } from '../data/achievements'
import { DEFAULT_WINDOW_ORDER, isWindowAvailable, normalizeMinimized, normalizeWindowOrder } from '../data/windows'
import { DEFAULT_THEME, THEME_IDS } from '../data/themes'
import { ENDING_BY_ID, FLUENCY_MIN_WORDS, FLUENCY_TO_WIN, GRASS_TO_WIN, SPLITS } from '../data/endings'
import { EVENT_BY_ID, EVENT_GAP_MS, EVENT_MS, FIRST_EVENT_MS, pickEvent, randBetween as randIn } from '../data/events'
import { MAIL, MAIL_BY_ID, NEWSLETTER_EVERY_MS, SPAM, SPAM_EVERY_MS } from '../data/mail'
import { CLIENTS, CONTRACT, CONTRACT_LANGS, PHRASES, normalizePhrase, reputationOf, reviewText, stars } from '../data/contracts'
import { DAILY_GOAL_BY_ID, dailyFor, dailyStart, seededValue } from '../data/daily'
import { CHEAT_ACTIONS, CHEAT_CODES, CHEAT_TOGGLES, normalizeCode } from '../data/cheats'
import { draftRun, rogueCryptoBias, rogueTargets, PERK_BY_ID } from '../data/rogue'
import { COINS, COIN_BY_ID, CRYPTO_HISTORY, EXPANSIONS, EXPANSION_DROP_CHANCE, FORGE, FORGE_THEME_BY_ID, NAS_TIERS, freshMarket, ownsExpansion } from '../data/expansions'
import { REFUSE_EVERY, correctTranslate, gradeSelfTranslation } from '../lib/translator'
import { makeCaptcha } from '../lib/captcha'
import { money as fmtMoney } from '../lib/format'
import { rankFor } from '../lib/leaderboard'
import { SAVE_VERSION, decodeSave, encodeSave, migrateSave } from '../lib/save'
import { DEFAULT_SETTINGS } from '../lib/settings'
import {
  catIsAngry,
  eventMods,
  activeMods,
  getAdInterval,
  getAdReward,
  getAuditRate,
  getContractPay,
  getBotPrice,
  getCompanyPrice,
  getPickaxeCost,
  getStaminaCost,
  getAutoSwings,
  getCatFoodCost,
  getLootboxPrice,
  getMaxEquipped,
  getMaxStamina,
  getMiningRate,
  getForgeRate,
  getForgeUpgradeCost,
  getForgeThemePrice,
  getNasRate,
  getNasUpgradeCost,
  getMultiplier,
  getRoulettePayouts,
  getStaminaRegenMs,
  getTableLimit,
  hasSkill,
  isAuditImmune,
  isUnderwater,
  lockSecondsLeft,
  prestigeBase,
  quoteTranslation,
  skillStatus,
} from '../lib/economy'

// The economy selectors live in lib/economy.js (shared with the balance simulator); components
// keep importing them from here.
export * from '../lib/economy'

const makeId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)

export const TRAP_AD_EVERY = 25
export const SLIPPERY_AD_EVERY = 20
export const DVD_AD_EVERY = 5 // bounces around like the DVD screensaver (stacks with slippery / trap)
const TOAST_MS = 3_600
const SCRATCH_MS = 4_500
const CHECKOUT_MS = 1_600
const ACHIEVEMENT_POPUP_MS = 4_500
const CATCARE_RETRY_MS = 15_000
const MAX_ACCRUAL_PERIODS = 60
// Widgets start collapsed on phones so they don't cover the game.
const IS_PHONE = typeof window !== 'undefined' && window.innerWidth < 640
const defaultLayout = () => ({
  doom: { edge: 'left', at: 0.5, collapsed: IS_PHONE },
  cat: { edge: 'right', at: 1, collapsed: IS_PHONE },
  windows: [...DEFAULT_WINDOW_ORDER],
  minimized: [], // window ids sitting in the taskbar, in the order they were minimized
})
const WIDGET_IDS = ['doom', 'cat'] // the docked widgets: layout[id] = { edge, at, collapsed }
const RESET_SCREEN_MS = 1_500 // how long the reset / new game screen shows before the page restarts
const MAIL_CAP = 120 // oldest repeatable mail (spam, newsletters, event promos) is dropped past this
// Swapped in once a restart has written the new save, so nothing the old session does before
// the restart (a tick, a late payout, a timer) can save over it.
const DISCARD_STORAGE = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const GRASS_LINES = [
  '🌱 Grass not found in your area. Keep scrolling.',
  '🌱 You touched the grass. It was a JPEG.',
  '🌱 Grass is a Premium feature ($4.99/mo).',
  '🌱 Outside is currently down for maintenance.',
  '🌱 Grass requires a newer version of reality.',
]
// …unless you keep touching it, and nothing else.
const GRASS_PROGRESS = {
  10: '🌱 A faint breeze. Keep going. Touch nothing else.',
  20: '🌱 Is that… birdsong?',
  30: '🌱 The sun. It burns. Keep going.',
  40: '🌱 You can smell it now. Ten more.',
  45: '🌱 Five more. Don’t you dare click anything else.',
  49: '🌱 One more.',
}
// TRANSLATR™ reacts as your own-translation streak grows (the Self-Taught ending).
const FLUENCY_PROGRESS = {
  1: '✍️ Self-translation detected. TranslatrAI™ is… fine with that.',
  2: '✍️ Two in a row. TranslatrAI™ has started “working from home”.',
  3: '📉 Three in a row. Churn risk: ELEVATED. The Growth team has been paged.',
  5: '🆘 Five in a row. TranslatrAI™: “Please. Half price. I’ll even be nice.”',
  7: '⚖️ Seven in a row. Legal says learning a language may breach section 12.4 of the Terms.',
  9: '🚨 Nine in a row. One more and you won’t need us. Please make a mistake.',
}
// 15% of boxes arrive "spoiled": a rat got in first and ate whatever was inside.
export const SPOILED_BOX_CHANCE = 0.15
const COPIES_KEPT = 40 // TranslatrAI™ remembers what it translated for you (pasting it back doesn't count)

/** What a one-off cheat does (null when it can't right now, with the reason for the toast). */
function cheatPatch(s, id) {
  switch (id) {
    case 'm1':
      return { money: s.money + 1e6 }
    case 'b1':
      return { money: s.money + 1e9 }
    case 't1':
      return { money: s.money + 1e12 }
    case 'x10':
      return { money: Math.max(1_000, s.money * 10) }
    case 'skill':
      return { skillPoints: s.skillPoints + 5 }
    case 'gems':
      return { gems: s.gems + 100 }
    case 'stamina':
      return { stamina: getMaxStamina(s), staminaTs: Date.now() }
    case 'cat':
      return { cat: { hunger: 100, fun: 100, love: 100 } }
    case 'debt':
      return s.loan ? { loan: null } : 'You don’t owe Vinnie anything. (He’s working on it.)'
    case 'event':
      return s.event ? 'An event is already running.' : { nextEventAt: 0 }
    case 'contract':
      return s.contracts.length >= CONTRACT.max ? `You already have ${CONTRACT.max} open contracts.` : { nextContractAt: 0 }
    default:
      return null
  }
}

/**
 * The Corporate Slave ending's condition: everything in the Premium Vault owned, and more money
 * earned watching rewarded ads (at least CORPORATE_SLAVE.minAds of them) than mining.
 */
export const CORPORATE_SLAVE = { minAds: 20 }
export function corporateSlaveReady(s) {
  const ownsEverything = PREMIUM_ITEMS.filter((i) => !i.hidden).every((i) => (s.premium?.[i.id] ?? 0) > 0)
  const livesOnAds = (s.stats.adRewards ?? 0) >= CORPORATE_SLAVE.minAds && (s.stats.adRewardMoney ?? 0) > (s.stats.moneyMined ?? 0)
  return ownsEverything && livesOnAds
}

const STASH_KEY = 'translatr-stash' // your main game, parked while you play a Daily Challenge

/**
 * Randomness for one "stream" (loot, roulette, slots, events, contracts). On a Daily Challenge
 * it's seeded — value n of a stream is the same for everyone today — and `patch()` returns the
 * advanced counters to save. Everywhere else it's just Math.random.
 */
function streamRand(st, stream) {
  if (st.mode !== 'daily' || !st.daily) return { rand: Math.random, patch: () => null }
  let n = st.daily.counters?.[stream] ?? 0
  return {
    rand: () => seededValue(st.daily.seed, stream, n++),
    patch: () => ({ daily: { ...st.daily, counters: { ...st.daily.counters, [stream]: n } } }),
  }
}

/** A brand-new Daily Challenge run for today (goal, modifiers, starting bonuses). */
function dailyRun(now) {
  const cfg = dailyFor()
  const start = dailyStart(cfg.mods)
  return {
    mode: 'daily',
    daily: { ...cfg, counters: {} },
    run: { startedAt: now, endedAt: null, splits: {} },
    ...(start.money ? { money: start.money } : {}),
    ...(start.skillPoints ? { skillPoints: start.skillPoints } : {}),
  }
}

/** A new Roguelike run: the draft, and whatever the perks and debuffs start you with. */
function rogueStart(s, now) {
  const rogue = { ...draftRun(s), seen: false }
  const patch = { rogue }
  for (const id of rogue.perks) {
    const st = PERK_BY_ID[id]?.start
    if (!st) continue
    if (st.money) patch.money = (patch.money ?? s.money) + st.money
    if (st.gems) patch.gems = (patch.gems ?? s.gems) + st.gems
    if (st.skillPoints) patch.skillPoints = (patch.skillPoints ?? s.skillPoints) + st.skillPoints
    if (st.pickaxe) patch.pickaxeLevel = Math.max(s.pickaxeLevel, st.pickaxe)
    if (st.expansion) patch.expansions = { ...(patch.expansions ?? s.expansions), [st.expansion]: true }
  }
  if (rogue.debuffs.includes('starting_debt')) patch.loan = { principal: 25_000, debt: 25_000, lastAccrual: now }
  return patch
}

/** "$9.99/wk" → 999 (for the fake-spend counter). */
// Phone apps that leave TRANSLATR™ running (the games pause it).
export const PHONE_LIVE_APPS = ['menu', 'doom', 'browser']
const priceCents = (price) => Math.round(parseFloat(String(price).replace(/[^\d.]/g, '')) * 100) || 0
const randBetween = (a, b) => a + Math.random() * (b - a)

// Everything a Prestige wipes.
const freshRun = () => ({
  money: 0,
  pickaxeLevel: 1,
  staminaLevel: 1,
  stamina: STAMINA_LEVELS[0].max,
  staminaTs: Date.now(), // regen is timestamp-based so it can't drift or double-count
  trash: {}, // name -> count
  items: [], // { uid, itemId } — equippables and relics
  equipped: [], // item uids, max MAX_EQUIPPED
  crypto: {}, // coinId -> how many you hold
  forge: { level: 1, stored: 0 }, // Ye Olde Forge: its level and the coffers waiting to be collected
  nas: { tier: 0 }, // HomeLab NAS: which NAS_TIERS entry
})

// Everything the Trap Ad wipes.
const freshSave = () => ({
  ...freshRun(),
  prestige: 0,
  skillPoints: 0, // unspent
  skills: {}, // skillId -> true
  premium: {}, // premiumId -> times purchased
  gems: 0,
  skinsOwned: { classic: true },
  translatorSkin: 'classic',
  bot: null, // { name, mode: 'mine' | 'gamble', running, pot, actions, chip }
  pity: 0, // boxes opened since the last relic (a relic is guaranteed at RELIC_PITY)
  contracts: [], // open translation jobs: { id, client, icon, text, lang, payout, deadline }
  nextContractAt: null,
  ratings: [], // stars from clients (latest CONTRACT.ratingsKept)
  reviews: [], // the latest reviews, newest first
  // Your own translations: the clean streak, sentences used in it, what TranslatrAI™ translated
  // for you (copying it back doesn't count) and the latest good one (the ending quotes it).
  fluency: { streak: 0, used: [], copied: [], last: null },
  adRewardAt: 0, // when the last rewarded ad paid out (they have a cooldown)
  cat: { hunger: 100, fun: 100, love: 100 },
  loan: null, // { principal, debt, lastAccrual } — survives Prestige. Debt is forever.
  lockouts: {}, // action -> timestamp the CAPTCHA lockout ends
  expansions: {}, // expansionId -> true (won from a Platinum Box; buying the DLC also counts)
  forgeThemes: ['medieval'], // looks bought for the Forge
  forgeTheme: 'medieval',
  market: null, // CryptoBro Exchange prices (freshMarket() on first use)
  nasUi: { open: false, x: null, y: null }, // the NAS: peeking from the right edge, or opened where you put it
  stats: {
    clicks: 0,
    boxesOpened: 0,
    wordsTranslated: 0,
    moneyGambled: 0,
    gambleLosses: 0,
    translations: 0,
    botsLost: 0,
    catScratches: 0,
    catFeedFails: 0,
    taxPaid: 0,
    audited: 0,
    exhaustions: 0,
    captchaFails: 0,
    loansTaken: 0,
    repos: 0,
    tosAccepted: 0,
    peakMoney: 0,
    doomSeconds: 0,
    doomMeters: 0,
    doomLikes: 0,
    grassAttempts: 0,
    adsDragged: 0,
    dvdCorners: 0,
    trackersRefused: 0, // times every cookie tracker was switched off by hand
    translateAttempts: 0, // every request, including the refused ones
    translationsRefused: 0,
    subsCancelled: 0,
    retentionAccepted: 0,
    cancelsCancelled: 0,
    streaksLost: 0,
    gemSpends: 0,
    bigDeals: 0, // purchases at 98%+ fake discount
    afkTimes: 0,
    slotFives: 0,
    rockLines: 0,
    trophyViews: 0,
    adFormatsSeen: [],
    dvdBounces: 0,
    themesTried: [],
    // For Unwrapped
    playSeconds: 0,
    afkSeconds: 0,
    moneyMined: 0,
    autoSwings: 0,
    adRewards: 0,
    adRewardMoney: 0,
    casinoWon: 0,
    rouletteSpins: 0,
    slotSpins: 0,
    captchaPasses: 0,
    boxSpend: 0,
    relicsFound: 0,
    pityRelics: 0,
    itemsFound: 0,
    lostToCat: 0,
    auditTaken: 0,
    repoTaken: 0,
    borrowed: 0,
    repaid: 0,
    translationSpend: 0,
    catFed: 0,
    catPets: 0,
    catPlays: 0,
    catFoodSpent: 0,
    adsClosed: 0,
    purchases: 0, // microtransactions (the secret ending needs zero)
    fakeSpend: 0, // in cents, never actually charged
    gemsBought: 0,
    skillPointsBought: 0,
    upgradesBought: 0,
    skinsBought: 0,
    trashRecycled: 0,
    botCollected: 0,
    bestRank: LEADERBOARD.playerRank,
    emailsReceived: 0,
    emailsRead: 0,
    emailsDeleted: 0,
    emailsReplied: 0,
    phished: 0,
    phishLost: 0,
    virusOpened: 0,
    unsubscribes: 0,
    chainsBroken: 0,
    eventsSeen: 0,
    eventIds: [],
    grassBest: 0,
    contractsDone: 0,
    contractsPerfect: 0,
    contractsBotched: 0,
    contractsLate: 0,
    contractEarnings: 0,
  },
})

// Everything a new game (after an ending) wipes, on top of the save.
const freshGame = () => ({
  mode: null, // 'normal' | 'speedrun' | 'daily' (picked on the title screen)
  ngPlus: 0, // New Game+ level: one more curse per level (you keep your skills)
  daily: null, // the Daily Challenge being played: { day, number, seed, goal, mods, counters }
  dailyDone: null, // { time, pb, day, seen } once today's goal is reached
  run: { startedAt: null, endedAt: null, splits: {} }, // timer + splits (ms since the start)
  over: null, // the ending being shown: the run is paused until "Keep playing" or a new game
  cheats: null, // once cheats are on: { at, used, toggles, codes }. The game is Modified from then on.
  mail: [], // delivered mail, newest first: { key, id, at, read, folder?, done?, data? }
  mailQueue: [], // scheduled deliveries: { id, at, data? }
  nextSpamAt: null,
  nextNewsAt: null,
  newsIssue: 0,
  event: null, // the running limited-time event: { id, startedAt, endsAt }
  nextEventAt: null,
  lastEventId: null,
  snailArrived: false, // the snail crossed the screen before any ending: the secret choice is on offer
  rogue: null, // Roguelike mode: { perks, debuffs, target, result, seen }
})
const PHANTOM_START = { start: 3, store: 7 }

// Everything only "Reset all" wipes: the lifetime record that even the Trap Ad leaves alone.
const freshLifetime = () => ({
  endings: {}, // endingId -> first seen timestamp
  adsSeen: 0,
  saveFilesLost: 0,
  achievements: {}, // achievementId -> unlocked timestamp
  layout: defaultLayout(), // UI arrangement: docked widgets + the order of the game windows
  consent: null, // { choice: 'all' | 'custom' | 'rejected', at } — the cookie banner shows until set
  tutorialSeen: false,
  phantom: { ...PHANTOM_START }, // notification badges that only ever go up
  streak: { count: 0, best: 0, lastDay: null }, // daily login streak
  storeVisits: 0, // drives the ever-growing fake "was" prices
})

const clampNeed = (v) => Math.max(0, Math.min(100, v))

// ---------- Daily streak, store deals, ad formats ----------
/** Local calendar day as 'YYYY-MM-DD' (streaks follow the player's own midnight). */
export function localDay(t = Date.now()) {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function dayBefore(day) {
  const [y, m, d] = day.split('-').map(Number)
  return localDay(new Date(y, m - 1, d - 1).getTime())
}
/** 'claimed' today · 'continue' (claimed yesterday) · 'fresh' (no streak) · 'broken' (missed a day). */
export function streakStatus(s, day = localDay()) {
  const { count, lastDay } = s.streak
  if (lastDay === day) return 'claimed'
  if (!lastDay || !count) return 'fresh'
  return lastDay === dayBefore(day) ? 'continue' : 'broken'
}
/** The store's fake "was" price is price × this. It grows with every visit: 95% off, 96%, 97%… */
export const fakeDiscountFactor = (visits) => 20 + 4 * (visits ?? 0)
const adFormatOf = (ad) => (ad.type === 'trap' ? null : (AD_CREATIVES[ad.creative % AD_CREATIVES.length].format ?? 'card'))
function withFormatSeen(stats, ad) {
  const format = adFormatOf(ad)
  const seen = stats.adFormatsSeen ?? []
  return !format || seen.includes(format) ? stats : { ...stats, adFormatsSeen: [...seen, format] }
}

const makeAd = (n, type, bounce = n % DVD_AD_EVERY === 0, extra) => ({
  id: makeId(),
  n,
  type,
  bounce,
  creative: Math.floor(Math.random() * 1000),
  x: Math.random() * 70,
  y: 5 + Math.random() * 50,
  ...extra,
})
const adTypeFor = (n) => (n % TRAP_AD_EVERY === 0 ? 'trap' : n % SLIPPERY_AD_EVERY === 0 ? 'slippery' : 'normal')

// ---------- Tick steps ----------
// Each step reads the *evolving* state `st` and returns a patch (or null). Side effects
// (toasts, modals) are queued in `fx` and run only after the single combined set().

function stepStamina(st, now) {
  const max = getMaxStamina(st)
  if (st.stamina >= max) return null
  const regen = getStaminaRegenMs(st)
  const points = Math.floor((now - st.staminaTs) / regen)
  if (points <= 0) return null
  const stamina = Math.min(max, st.stamina + points)
  return { stamina, staminaTs: stamina >= max ? now : st.staminaTs + points * regen }
}

// Income steps pause while the player is AFK. Expenses (cat, loans, audits) do not.
function stepAutoMiner(st) {
  const swings = getAutoSwings(st)
  if (st.afk || !swings) return null
  let gain = 0
  let crit = false
  for (let i = 0; i < swings; i++) {
    const c = hasSkill(st, 'crit') && Math.random() < 0.1
    crit ||= c
    gain += getMiningRate(st) * (c ? 10 : 1)
  }
  return {
    money: st.money + gain,
    autoMineEvent: { id: makeId(), gain, crit },
    stats: { ...st.stats, autoSwings: (st.stats.autoSwings ?? 0) + swings, moneyMined: (st.stats.moneyMined ?? 0) + gain },
  }
}

function stepBot(st, fx) {
  const bot = st.bot
  if (st.afk || !bot?.running) return null
  const next = { ...bot, actions: bot.actions + 1, waiting: false }
  const patch = {}

  if (bot.mode === 'mine') {
    next.pot = bot.pot + getMiningRate(st)
  } else {
    const chip = Math.min(bot.chip, getTableLimit(st)) // bots play at the same table (and its limit)
    if (st.money < chip) return bot.waiting ? null : { bot: { ...bot, waiting: true } }
    const payouts = getRoulettePayouts(st)
    const feelingLucky = Math.random() < 0.05
    const won = feelingLucky ? Math.random() < 2 / 36 : Math.random() < 17 / 36
    const win = won ? Math.round(chip * (feelingLucky ? payouts.green : payouts.red) * getMultiplier(st) * (eventMods(st).casino ?? 1)) : 0
    patch.money = st.money - chip
    patch.stats = {
      ...st.stats,
      moneyGambled: st.stats.moneyGambled + chip,
      gambleLosses: (st.stats.gambleLosses ?? 0) + (won ? 0 : chip),
      casinoWon: (st.stats.casinoWon ?? 0) + win,
    }
    if (won) {
      next.pot = bot.pot + win
      next.won = (bot.won ?? 0) + chip * (feelingLucky ? payouts.green : payouts.red) // in bets, before your multiplier
    }
  }

  // Mining: it walks after BOT_PATIENCE uncollected clicks. Gambling: once it has won BOT_GREED× its bet.
  const fed = bot.mode === 'mine' ? next.actions >= BOT_PATIENCE : (next.won ?? 0) >= BOT_GREED * Math.min(bot.chip, getTableLimit(st))
  if (fed) {
    fx.push((api) =>
      api.showModal({
        tone: 'bad',
        title: `🤖💨 ${bot.name} HAS LEFT`,
        body: `${
          bot.mode === 'mine' ? `After ${BOT_PATIENCE} uncollected clicks` : `After winning ${BOT_GREED}× its bet`
        }, ${bot.name} decided it deserved the $${next.pot.toLocaleString()} more than you. It is now "finding itself" in Ibiza.`,
      }),
    )
    return { ...patch, bot: null, stats: { ...(patch.stats ?? st.stats), botsLost: (st.stats.botsLost ?? 0) + 1 } }
  }
  return { ...patch, bot: next }
}

/** Up to `n` different entries of `list`, picked at random. */
function pickRandom(list, n) {
  const pool = [...list]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, n)
}

const scratchMark = (now) => ({ id: makeId(), x: 10 + Math.random() * 70, y: 10 + Math.random() * 60, rotate: -40 + Math.random() * 80, expiresAt: now + SCRATCH_MS })

function stepCat(st, dt, now, fx) {
  const cat = {}
  const decay = eventMods(st).catDecay ?? 1
  for (const [need, rate] of Object.entries(CAT.decayPerSec)) cat[need] = clampNeed(st.cat[need] - rate * dt * decay)
  if (!Object.values(cat).some((v) => v <= 0)) return { cat, catScratchIn: null }

  const t = (st.catScratchIn ?? CAT.scratchEverySec) - (st.catScratchIn == null ? 0 : dt)
  if (t > 0) return { cat, catScratchIn: t }

  const stats = { ...st.stats, catScratches: (st.stats.catScratches ?? 0) + 1 }
  // Owing Vinnie more than you have when the cat strikes is fatal (the Bankrupt ending).
  if (isUnderwater(st)) {
    fx.push((api) => api.triggerEnding('bankrupt'))
    return { cat, catScratchIn: CAT.scratchEverySec, scratches: [...st.scratches, scratchMark(now), scratchMark(now)], stats }
  }

  // SCRATCH: money halved, and the cat shreds CAT.shredEquipped random equipped items plus
  // CAT.shredBackpack random items from the backpack (relics and trash survive). The Cat-Proof
  // Vest saves every item.
  const vest = !!eventMods(st).scratchProof
  const backpack = st.items.filter((i) => EQUIPPABLES[i.itemId] && !st.equipped.includes(i.uid)).map((i) => i.uid)
  const gone = new Set(vest ? [] : [...pickRandom(st.equipped, CAT.shredEquipped), ...pickRandom(backpack, CAT.shredBackpack)])
  const names = st.items.filter((i) => gone.has(i.uid)).map((i) => `${EQUIPPABLES[i.itemId].emoji} ${EQUIPPABLES[i.itemId].name}`)
  const report = vest
    ? 'The Cat-Proof Vest saved your items.'
    : names.length
      ? `Shredded: ${names.join(', ')}.`
      : 'You had nothing to shred. The cat is disappointed in you.'
  fx.push((api) => api.toast(`😾 SCRATCH! Money halved. ${report}`, 'bad'))
  const lost = st.money - Math.floor(st.money / 2)
  return {
    cat,
    catScratchIn: CAT.scratchEverySec,
    money: Math.floor(st.money / 2),
    ...(gone.size ? { items: st.items.filter((i) => !gone.has(i.uid)), equipped: st.equipped.filter((u) => !gone.has(u)) } : {}),
    scratches: [...st.scratches, scratchMark(now)],
    stats: { ...stats, lostToCat: (st.stats.lostToCat ?? 0) + lost, itemsShredded: (st.stats.itemsShredded ?? 0) + gone.size },
  }
}

function auditPatch(st, fx) {
  if (isAuditImmune(st)) {
    fx.push((api) => api.toast('🏝️ The Dev IRS found an Offshore Bank Account and quietly left.', 'good'))
    return null
  }
  const taken = Math.floor(st.money * getAuditRate(st))
  return {
    money: st.money - taken,
    audit: { id: makeId(), caseNo: `DEV-${Math.floor(100000 + Math.random() * 900000)}`, before: st.money, taken, after: st.money - taken },
    stats: { ...st.stats, audited: (st.stats.audited ?? 0) + 1, auditTaken: (st.stats.auditTaken ?? 0) + taken },
  }
}

function stepAudit(st, now, fx) {
  if (now < st.nextAuditAt) return null
  const patch = { nextAuditAt: now + AUDIT.checkEverySec * 1000 }
  const mods = activeMods(st)
  if (mods.noAudits) return patch // Tax Holiday
  if (st.money > AUDIT.threshold && !st.audit && Math.random() < AUDIT.chance * (mods.auditChance ?? 1)) Object.assign(patch, auditPatch(st, fx))
  return patch
}

function stepAds(st, now) {
  if (now < st.nextAdAt) return null
  if (eventMods(st).noAds) return { nextAdAt: now + getAdInterval(st) } // Server Maintenance: even the ad server is down
  const n = st.adsSeen + 1
  const ad = makeAd(n, adTypeFor(n))
  return { adsSeen: n, ads: [...st.ads, ad], nextAdAt: now + getAdInterval(st), stats: withFormatSeen(st.stats, ad) }
}

/** CatCare+ subscription: auto-feeds a hungry cat at 3× the price (retries every 15s if you're broke). */
function stepCatCare(st, now, fx) {
  if (!st.premium.catcare || st.cat.hunger >= CAT.warnAt || now < st.catCareNextAt) return null
  const cost = getCatFoodCost(st) * 3
  if (st.money < cost) {
    fx.push((api) => api.toast(`🐈‍⬛ CatCare+ payment of $${cost.toLocaleString()} failed. Your cat has been notified.`, 'bad'))
    return { catCareNextAt: now + CATCARE_RETRY_MS }
  }
  fx.push((api) => api.toast(`🐈‍⬛ CatCare+ fed your cat. Convenience fee: $${cost.toLocaleString()}.`, 'info'))
  return {
    money: st.money - cost,
    cat: { ...st.cat, hunger: clampNeed(st.cat.hunger + CAT.feedAmount) },
    catCareNextAt: now + CATCARE_RETRY_MS,
  }
}

/** QuickCash™: compound interest on a timestamp (no drift), and the Repo Man at 5× the principal. */
function stepLoan(st, now, fx) {
  const loan = st.loan
  if (!loan) return null
  const owedPeriods = Math.floor((now - loan.lastAccrual) / LOANS.compoundEveryMs)
  if (owedPeriods <= 0) return null
  // Cap catch-up after long absences: 1.1^5760 (one day) is Infinity. 60 periods is already ~300× — plenty for the Repo Man.
  const periods = Math.min(owedPeriods, MAX_ACCRUAL_PERIODS)
  const debt = loan.debt * (1 + LOANS.interestRate * (activeMods(st).loanInterest ?? 1)) ** periods
  const lastAccrual = owedPeriods > periods ? now : loan.lastAccrual + periods * LOANS.compoundEveryMs
  const accrued = { ...loan, debt, lastAccrual }
  if (debt < loan.principal * LOANS.repoAt) return { loan: accrued }

  // The Repo Man: seize 75% of the wallet (applied to the debt) and everything equipped.
  const seized = Math.floor(st.money * LOANS.repoSeizeRate)
  const takenItems = st.equipped.length
  const remaining = Math.max(0, Math.ceil(debt - seized))
  fx.push((api) =>
    api.showModal({
      tone: 'bad',
      sfx: 'horn',
      title: '🚚 The Repo Man Is Here',
      body: `Your QuickCash™ debt hit ${LOANS.repoAt}× what you borrowed. Vinnie's associates seized $${seized.toLocaleString()} and ${takenItems} equipped item${takenItems === 1 ? '' : 's'} (appraised at $0). ${
        remaining ? `You still owe $${remaining.toLocaleString()}. The clock has been reset, generously.` : 'Your debt is settled. Vinnie will miss you.'
      }`,
    }),
  )
  return {
    money: st.money - seized,
    items: st.items.filter((i) => !st.equipped.includes(i.uid)),
    equipped: [],
    loan: remaining ? { principal: remaining, debt: remaining, lastAccrual: now } : null,
    stats: { ...st.stats, repos: (st.stats.repos ?? 0) + 1, repoTaken: (st.stats.repoTaken ?? 0) + seized },
  }
}

/** Dynamic Pricing™: a random walk that drifts upward while you're rich. */
function stepSurge(st, now) {
  if (now < st.nextSurgeAt) return null
  const rich = st.money > getLootboxPrice({ ...st, surge: 1 }) * 20
  const drift = (Math.random() - (rich ? 0.3 : 0.5)) * 0.35
  const surge = Math.round(Math.min(SURGE.max, Math.max(SURGE.min, st.surge * (1 + drift))) * 100) / 100
  return { surge, surgeHistory: [...st.surgeHistory, surge].slice(-SURGE.history), nextSurgeAt: now + SURGE.everyMs }
}

function stepTos(st, now) {
  if (st.tos || now < st.nextTosAt) return null
  const v = `${4 + (st.stats.tosAccepted ?? 0)}.${Math.floor(Math.random() * 20)}.${Math.floor(Math.random() * 100)}`
  return { tos: { id: makeId(), version: v }, nextTosAt: now + TOS.everyMs }
}

function stepFomo(st, now) {
  if (now >= st.nextFomoAt) {
    return { fomo: { id: makeId(), ...makeFomo(), expiresAt: now + FOMO.showMs }, nextFomoAt: now + randBetween(FOMO.minMs, FOMO.maxMs) }
  }
  if (st.fomo && now >= st.fomo.expiresAt) return { fomo: null }
  return null
}

/** Play time (and how much of it was AFK). */
function stepTime(st, dt) {
  if (dt <= 0) return null
  const stats = { ...st.stats, playSeconds: (st.stats.playSeconds ?? 0) + dt }
  if (st.afk) stats.afkSeconds = (st.stats.afkSeconds ?? 0) + dt
  return { stats }
}

/** Starts the run timer on the first tick of a new game, records splits, and ends a Daily at its goal. */
function stepRun(st, now, fx) {
  const run = st.run
  if (!run) return null
  if (!run.startedAt) return { run: { ...run, startedAt: now } }
  if (run.endedAt) return null
  let splits = null
  for (const sp of SPLITS) {
    if (sp.check && run.splits[sp.id] == null && sp.check(st)) splits = { ...(splits ?? run.splits), [sp.id]: now - run.startedAt }
  }
  const goal = st.mode === 'daily' && st.daily ? DAILY_GOAL_BY_ID[st.daily.goal] : null
  if (goal?.check(st)) {
    const time = now - run.startedAt
    const day = st.daily.day
    const best = st.records.daily?.[day]
    fx.push((api) => api.toast(`📅 Daily #${st.daily.number} complete in ${Math.round(time / 1000)}s!${st.cheats ? ' (Modified: not recorded.)' : ''}`, 'good'))
    if (st.cheats) {
      return {
        run: { ...run, splits: { ...(splits ?? run.splits), end: time }, endedAt: now, ending: 'daily' },
        dailyDone: { time, pb: false, day, seen: false, modified: true },
      }
    }
    return {
      run: { ...run, splits: { ...(splits ?? run.splits), end: time }, endedAt: now, ending: 'daily' },
      dailyDone: { time, pb: best == null || time < best, day, seen: false },
      records: {
        ...st.records,
        daily: { ...st.records.daily, [day]: best == null ? time : Math.min(best, time) },
        dailyRuns: (st.records.dailyRuns ?? 0) + 1,
      },
    }
  }
  return splits ? { run: { ...run, splits } } : null
}

/** Translation contracts: jobs arrive by email; missed deadlines earn one-star reviews. */
function stepContracts(st, now, fx) {
  const patch = {}
  let contracts = st.contracts
  const late = contracts.filter((c) => now >= c.deadline)
  if (late.length) {
    contracts = contracts.filter((c) => now < c.deadline)
    const fresh = late.map((c) => ({ id: makeId(), client: c.client, icon: c.icon, stars: 1, text: reviewText(0), at: now, late: true }))
    Object.assign(patch, {
      contracts,
      ratings: [...st.ratings, ...late.map(() => 1)].slice(-CONTRACT.ratingsKept),
      reviews: [...fresh.reverse(), ...st.reviews].slice(0, 12),
      stats: { ...st.stats, contractsLate: (st.stats.contractsLate ?? 0) + late.length },
    })
    fx.push((api) => api.toast(`📝 Missed a deadline for ${late[0].client}. ★☆☆☆☆ “Never delivered.”`, 'bad'))
  }
  if (st.nextContractAt == null) return { ...patch, nextContractAt: now + randIn(CONTRACT.first) }
  if (now < st.nextContractAt) return Object.keys(patch).length ? patch : null
  if (contracts.length >= CONTRACT.max) return { ...patch, nextContractAt: now + 20_000 } // busy: check back later

  const r = streamRand(st, 'contracts')
  const client = CLIENTS[Math.floor(r.rand() * CLIENTS.length)]
  const text = PHRASES[Math.floor(r.rand() * PHRASES.length)]
  const lang = CONTRACT_LANGS[Math.floor(r.rand() * CONTRACT_LANGS.length)]
  const deadline = now + Math.round(randIn(CONTRACT.deadline, r.rand) / 1000) * 1000
  const rep = reputationOf(st.ratings)
  const repFactor = rep ? 0.6 + 0.8 * (rep.avg / 5) : 1
  const cost = quoteTranslation(st, text).total
  const payout = Math.round(Math.max(cost * CONTRACT.payoutCostMult, getMiningRate(st) * CONTRACT.payoutSwings) * repFactor)
  const job = { id: makeId(), client: client.name, icon: client.icon, text, lang, payout, deadline }
  fx.push((api) => {
    api.deliverMail('contract', { client: client.name, icon: client.icon, text, lang, payout, minutes: Math.round((deadline - now) / 60000) })
    api.toast(`📝 New job from ${client.name}: “${text}” → ${lang}.`, 'info')
  })
  return { ...patch, ...r.patch(), contracts: [...contracts, job], nextContractAt: now + randIn(CONTRACT.every, r.rand) }
}

/** CryptoBro Exchange: every coin moves on its own clock (seeded on a Daily Challenge). */
function stepCrypto(st, now, fx) {
  const m = st.market ?? freshMarket(now)
  let changed = !st.market
  const prices = { ...m.prices }
  const history = { ...m.history }
  const next = { ...m.next }
  const version = { ...m.version }
  let holdings = st.crypto
  const r = streamRand(st, 'crypto')
  const downChance = 0.5 - (st.mode === 'rogue' ? rogueCryptoBias(st.rogue) : 0)
  for (const c of COINS) {
    if (!c.every) continue
    if (now < (next[c.id] ?? 0)) continue
    // Catch up (capped: a long break is a few hundred moves, not millions).
    let moves = Math.min(300, Math.floor((now - next[c.id]) / c.every) + 1)
    let p = prices[c.id]
    const h = [...(history[c.id] ?? [])]
    while (moves-- > 0) {
      p *= r.rand() < downChance ? 1 - c.move : 1 + c.move
      h.push(p)
    }
    next[c.id] = now + c.every
    if (p < c.floor) {
      // Rugged. Relaunched as "v2": the old tokens are worth exactly nothing.
      const lost = holdings[c.id] ?? 0
      version[c.id] = (version[c.id] ?? 1) + 1
      p = c.start
      h.length = 0 // a fresh chart for the fresh coin
      h.push(p)
      if (lost) holdings = { ...holdings, [c.id]: 0 }
      fx.push((api) => api.toast(`🧶 ${c.ticker} collapsed and relaunched as ${c.ticker} v${version[c.id]}.${lost ? ' Your old bags are worth nothing now. Diamond hands!' : ''}`, lost ? 'bad' : 'info'))
    }
    prices[c.id] = p
    history[c.id] = h.slice(-CRYPTO_HISTORY)
    changed = true
  }
  if (!changed) return null
  return { ...r.patch(), market: { prices, history, next, version }, ...(holdings !== st.crypto ? { crypto: holdings } : {}) }
}

/** Ye Olde Forge fills its coffers; the HomeLab NAS pays straight into the wallet. */
function stepExpansions(st, dt) {
  if (dt <= 0 || st.afk) return null
  const patch = {}
  if (ownsExpansion(st, 'forge')) patch.forge = { ...st.forge, stored: (st.forge?.stored ?? 0) + getForgeRate(st) * dt }
  if (ownsExpansion(st, 'nas')) {
    const earned = getNasRate(st) * dt
    patch.money = st.money + earned
    patch.stats = { ...st.stats, nasEarned: (st.stats.nasEarned ?? 0) + earned }
  }
  return Object.keys(patch).length ? patch : null
}

/** Your best leaderboard rank (it counts even while the leaderboard window is minimized). */
function stepRank(st) {
  const rank = rankFor(Math.max(st.money, st.stats.peakMoney ?? 0), st.stats.playSeconds ?? 0)
  return rank < (st.stats.bestRank ?? LEADERBOARD.playerRank) ? { stats: { ...st.stats, bestRank: rank } } : null
}

/** Limited-time events: fully random, one at a time, 3 minutes each, at least 10 minutes apart. */
function stepEvents(st, now, fx) {
  if (st.event) {
    if (now < st.event.endsAt) return null
    const ended = EVENT_BY_ID[st.event.id]
    // (No toast for an event that ended long ago, while the game was closed.)
    if (ended && now - st.event.endsAt < 10_000) fx.push((api) => api.toast(`${ended.icon} ${ended.name} is over. Normal prices (and suffering) resume.`, 'info'))
    return { event: null, nextEventAt: st.event.endsAt + randIn(EVENT_GAP_MS) }
  }
  if (st.nextEventAt == null) return { nextEventAt: now + randIn(FIRST_EVENT_MS) }
  if (now < st.nextEventAt) return null
  const r = streamRand(st, 'events')
  const e = pickEvent(st.lastEventId, r.rand)
  const seen = st.stats.eventIds ?? []
  fx.push((api) => {
    api.toast(`${e.icon} ${e.name} has started! 3 minutes only.`, 'good')
    api.deliverMail('event', { eventId: e.id })
  })
  return {
    ...r.patch(),
    event: { id: e.id, startedAt: now, endsAt: now + EVENT_MS },
    lastEventId: e.id,
    stats: { ...st.stats, eventsSeen: (st.stats.eventsSeen ?? 0) + 1, eventIds: seen.includes(e.id) ? seen : [...seen, e.id] },
  }
}

const newMail = (id, at, data) => ({ key: makeId(), id, at, read: false, ...(data ? { data } : {}) })
/** Keeps the inbox bounded by dropping the oldest repeatable mail (story mail is never dropped). */
function capMail(list) {
  if (list.length <= MAIL_CAP) return list
  const drop = new Set(
    list
      .filter((m) => !MAIL_BY_ID[m.id]?.when)
      .slice(-(list.length - MAIL_CAP))
      .map((m) => m.key),
  )
  return list.filter((m) => !drop.has(m.key))
}

/** Story mail whose moment has come, scheduled follow-ups, spam and the newsletter. */
function stepMail(st, now, fx) {
  const fresh = []
  const have = new Set(st.mail.map((m) => m.id))
  for (const t of MAIL) if (t.when && !have.has(t.id) && t.when(st)) fresh.push(newMail(t.id, now))

  const patch = {}
  if (st.mailQueue.some((q) => q.at <= now)) {
    st.mailQueue.filter((q) => q.at <= now).forEach((q) => fresh.push(newMail(q.id, now, q.data)))
    patch.mailQueue = st.mailQueue.filter((q) => q.at > now)
  }
  if (st.nextSpamAt == null) patch.nextSpamAt = now + randIn(SPAM_EVERY_MS)
  else if (now >= st.nextSpamAt) {
    fresh.push(newMail(SPAM[Math.floor(Math.random() * SPAM.length)].id, now))
    patch.nextSpamAt = now + randIn(SPAM_EVERY_MS) / (activeMods(st).spamRate ?? 1)
  }
  if (st.nextNewsAt == null) patch.nextNewsAt = now + randIn(NEWSLETTER_EVERY_MS)
  else if (now >= st.nextNewsAt) {
    fresh.push(newMail('newsletter', now, { issue: st.newsIssue ?? 0 }))
    patch.newsIssue = (st.newsIssue ?? 0) + 1
    patch.nextNewsAt = now + randIn(NEWSLETTER_EVERY_MS)
  }
  if (!fresh.length) return Object.keys(patch).length ? patch : null
  fx.push((api) => api.announceMail(fresh))
  return {
    ...patch,
    mail: capMail([...fresh.reverse(), ...st.mail]),
    stats: { ...st.stats, emailsReceived: (st.stats.emailsReceived ?? 0) + fresh.length },
  }
}

/** Unlocks any newly-earned achievements and feeds the one-at-a-time popup queue. */
/** Time spent with DoomFeed™ open on the phone (the "time wasted" counter). */
function stepDoom(st, dt) {
  if (st.arcade !== 'doom' || dt <= 0) return null
  return { stats: { ...st.stats, doomSeconds: (st.stats.doomSeconds ?? 0) + dt } }
}

function stepAchievements(st, now) {
  const patch = {}
  if (st.money > (st.stats.peakMoney ?? 0)) patch.stats = { ...st.stats, peakMoney: st.money }
  const view = patch.stats ? { ...st, stats: patch.stats } : st
  const fresh = ACHIEVEMENTS.filter((a) => !st.achievements[a.id] && a.check(view)).map((a) => a.id)
  let queue = st.achievementQueue
  if (fresh.length) {
    patch.achievements = { ...st.achievements, ...Object.fromEntries(fresh.map((id) => [id, now])) }
    queue = [...queue, ...fresh]
  }
  const popupDone = !st.achievementPopup || st.achievementPopup.expiresAt <= now
  if (popupDone && queue.length) {
    patch.achievementPopup = { id: makeId(), achId: queue[0], expiresAt: now + ACHIEVEMENT_POPUP_MS }
    queue = queue.slice(1)
  } else if (popupDone && st.achievementPopup) {
    patch.achievementPopup = null
  }
  if (queue !== st.achievementQueue) patch.achievementQueue = queue
  return Object.keys(patch).length ? patch : null
}

/** Roguelike runs: how many, how many won, the current win streak (kept with the speedrun records). */
function rogueRecord(records, s, id) {
  if (s.mode !== 'rogue' || !s.rogue || s.rogue.result) return records
  const win = id === s.rogue.target
  const r = records.rogue ?? { runs: 0, wins: 0, streak: 0, best: 0 }
  const streak = win ? r.streak + 1 : 0
  return { ...records, rogue: { runs: r.runs + 1, wins: r.wins + (win ? 1 : 0), streak, best: Math.max(r.best, streak) } }
}

/** Folds a finished speedrun into the records (they survive everything, even "Reset all"). */
function recordRun(records, run, ending) {
  const time = run.endedAt - run.startedAt
  const best = { ...records.best }
  const pb = best.any == null || time < best.any
  if (pb) best.any = time
  if (best[ending] == null || time < best[ending]) best[ending] = time
  return { ...records, runs: (records.runs ?? 0) + 1, best, pbSplits: pb ? run.splits : records.pbSplits, last: { time, ending, pb } }
}

// ---------- Store ----------
let checkoutTimer = null
const brokenSteps = new Set() // game-loop steps that threw (each is reported once)

export const useGameStore = create(
  persist(
    (set, get) => ({
      ...freshSave(),
      // This playthrough: mode, run timer, ending, inbox, events. A new game wipes it.
      ...freshGame(),
      // Lifetime record: survives even the Trap Ad, so the game remembers your shame.
      ...freshLifetime(),
      // Preferences (survive everything, even "Reset all"): sound (mute flags + master /
      // per-channel volume, 0–1), the site theme, settings and speedrun records.
      audio: { music: true, sfx: true, volume: 0.6, musicVolume: 1, sfxVolume: 1, track: 'hold' },
      theme: DEFAULT_THEME,
      settings: { ...DEFAULT_SETTINGS },
      records: { runs: 0, best: {}, pbSplits: {}, last: null },

      // Ephemeral (not persisted)
      clock: Date.now(), // shared "now", advanced once per tick — drive countdowns off this
      lastTickAt: Date.now(),
      nextAdAt: Date.now() + ADS.intervalMs,
      nextAuditAt: Date.now() + AUDIT.checkEverySec * 1000,
      nextSurgeAt: Date.now() + SURGE.everyMs,
      nextTosAt: Date.now() + TOS.firstAfterMs,
      nextFomoAt: Date.now() + randBetween(FOMO.minMs, FOMO.maxMs),
      catCareNextAt: 0,
      surge: 1,
      surgeHistory: [1],
      tos: null, // active Terms of Service update
      fomo: null, // current social-pressure notification
      achievementQueue: [],
      achievementPopup: null,
      ads: [],
      desktopPeek: null, // windows that "Show desktop" minimized, so a second click brings back just those
      collapsedWidgets: [], // widgets "Collapse all" folded away, so "Restore all" brings them back too
      resetting: false, // 'reset' | 'newgame' | 'import': the save was replaced and the page is about to restart
      grassStreak: 0, // grass touched in a row (touching anything else resets it)
      endingsOpen: false, // the endings collection
      settingsOpen: false, // the Control Panel
      unwrappedOpen: false, // TRANSLATR™ Unwrapped
      shooterOpen: false, // DOOMSCROLL.EXE (the game pauses behind it)
      arcade: null, // the Arcade: 'menu', or the minigame being played (the game pauses behind it)
      shutdownOpen: false, // the "delete your account?" prompt (power button)
      privacyOpen: false, // cookie banner reopened from the Start menu
      tutorialOpen: false, // tutorial reopened from the Start menu
      trophiesOpen: false, // the Hall of Shame popup (taskbar trophy button)
      dailyOpen: false, // daily-streak popup (opens itself once a day)
      cancelFlow: null, // id of the subscription being (painfully) cancelled
      afk: false, // no input for AFK_MS: income paused
      toasts: [],
      scratches: [],
      catScratchIn: null,
      autoMineEvent: null,
      modal: null, // { title, body, tone, confirmLabel?, onConfirm?, cancelLabel? }
      receipt: null, // last translation's tax receipt
      audit: null, // active Dev IRS audit
      captcha: null, // active CAPTCHA challenge
      checkout: null, // { id, itemId, phase: 'processing' | 'done' }

      // ================= The game loop =================
      /** Runs every system once, commits ONE combined update, then fires side effects. */
      tick: (now = Date.now()) => {
        const s = get()
        // Paused: restarting, on the title screen, while an ending plays or while a minigame is open.
        if (s.resetting || !s.mode || s.over || s.shooterOpen || (s.arcade && !PHONE_LIVE_APPS.includes(s.arcade))) return
        const dt = Math.min(2, Math.max(0, (now - s.lastTickAt) / 1000)) // capped so a background tab can't insta-kill the cat
        const patch = { clock: now, lastTickAt: now }
        const fx = []
        let st = s
        const apply = (p) => {
          if (!p) return
          Object.assign(patch, p)
          st = { ...st, ...p }
        }
        // Each system runs on its own: one that throws is reported (once) and skipped, instead of
        // freezing every other system with it.
        const run = (step, fn) => {
          try {
            apply(fn())
          } catch (err) {
            if (!brokenSteps.has(step)) console.error(`[TRANSLATR] ${step.name} failed; the rest of the game keeps running.`, err)
            brokenSteps.add(step)
          }
        }

        run(stepStamina, () => stepStamina(st, now))
        run(stepAutoMiner, () => stepAutoMiner(st))
        run(stepBot, () => stepBot(st, fx))
        run(stepCatCare, () => stepCatCare(st, now, fx))
        run(stepCat, () => stepCat(st, dt, now, fx))
        run(stepLoan, () => stepLoan(st, now, fx))
        run(stepAudit, () => stepAudit(st, now, fx))
        run(stepSurge, () => stepSurge(st, now))
        run(stepAds, () => stepAds(st, now))
        run(stepTos, () => stepTos(st, now))
        run(stepFomo, () => stepFomo(st, now))
        run(stepDoom, () => stepDoom(st, dt))
        run(stepCrypto, () => stepCrypto(st, now, fx))
        run(stepExpansions, () => stepExpansions(st, dt))
        run(stepTime, () => stepTime(st, dt))
        run(stepEvents, () => stepEvents(st, now, fx))
        run(stepRank, () => stepRank(st))
        run(stepAchievements, () => stepAchievements(st, now))
        run(stepRun, () => stepRun(st, now, fx))
        run(stepContracts, () => stepContracts(st, now, fx))
        run(stepMail, () => stepMail(st, now, fx))
        if (st.toasts.some((t) => t.expiresAt <= now)) apply({ toasts: st.toasts.filter((t) => t.expiresAt > now) })
        if (st.scratches.some((x) => x.expiresAt <= now)) apply({ scratches: st.scratches.filter((x) => x.expiresAt > now) })
        if (st.captcha && now >= st.captcha.deadline) {
          const id = st.captcha.id
          fx.push((api) => api.resolveCaptcha(id, false, 'Too slow. Humans hesitate. Robots hesitate. You hesitated.'))
        }

        set(patch)
        const api = get()
        fx.forEach((f) => f(api))
      },

      // ================= UI helpers =================
      toast: (text, tone = 'info') => {
        const toast = { id: makeId(), text, tone, expiresAt: Date.now() + TOAST_MS }
        set((s) => ({ toasts: [...s.toasts, toast].slice(-5) }))
      },
      showModal: (modal) => set({ modal }), // modal.sfx optionally overrides the default sound ('none' to silence)
      closeModal: () => set({ modal: null }),
      setAudio: (patch) => set((s) => ({ audio: { ...s.audio, ...patch } })),
      /** Updates a docked widget ({ edge, at, collapsed }). */
      setDock: (id, patch) => set((s) => ({ layout: { ...s.layout, [id]: { ...s.layout[id], ...patch } } })),
      /** Saves the arrangement of the game windows (array of window ids). */
      setWindowOrder: (windows) => set((s) => ({ layout: { ...s.layout, windows: normalizeWindowOrder(windows) } })),
      resetLayout: () => {
        set({ layout: defaultLayout(), desktopPeek: null })
        get().toast('↺ Window layout reset. Your chaos has been undone.', 'info')
      },
      setTheme: (theme) => {
        const id = THEME_IDS.includes(theme) ? theme : DEFAULT_THEME
        set((s) => {
          const tried = s.stats.themesTried ?? []
          return { theme: id, stats: tried.includes(id) ? s.stats : { ...s.stats, themesTried: [...tried, id] } }
        })
      },
      /** Closes the cookie banner with the player's "choice". */
      setConsent: (choice) =>
        set((s) => ({
          consent: { choice, at: Date.now() },
          privacyOpen: false,
          stats: choice === 'custom' ? { ...s.stats, trackersRefused: (s.stats.trackersRefused ?? 0) + 1 } : s.stats,
        })),
      openPrivacy: () => set({ privacyOpen: true }),
      openTutorial: () => set({ tutorialOpen: true }),
      openTrophies: () => set((s) => ({ trophiesOpen: true, stats: { ...s.stats, trophyViews: (s.stats.trophyViews ?? 0) + 1 } })),
      closeTrophies: () => set({ trophiesOpen: false }),

      // ---- Daily streak ----
      openDaily: () => set({ dailyOpen: true }),
      closeDaily: () => set({ dailyOpen: false }),
      /** Claims today's (nearly worthless) reward. Returns it, or null if there's nothing to claim. */
      claimDaily: () => {
        const s = get()
        const day = localDay()
        const status = streakStatus(s, day)
        if (status === 'claimed' || status === 'broken') return null
        const count = status === 'continue' ? s.streak.count + 1 : 1
        const reward = DAILY_REWARDS[(count - 1) % DAILY_REWARDS.length]
        set({
          streak: { count, best: Math.max(s.streak.best ?? 0, count), lastDay: day },
          money: s.money + (reward.money ?? 0),
          gems: s.gems + (reward.gems ?? 0),
        })
        return reward
      },
      /** Lets a broken streak die (the alternative is Streak Insurance™). */
      acceptStreakLoss: () =>
        set((s) => ({ streak: { ...s.streak, count: 0, lastDay: null }, stats: { ...s.stats, streaksLost: (s.stats.streaksLost ?? 0) + 1 } })),

      // ---- Store visits (the fake discounts grow with every one) ----
      visitStore: () => set((s) => ({ storeVisits: (s.storeVisits ?? 0) + 1 })),

      // ---- Gem Shop: everything costs 13, gems come in 10s ----
      buyGemItem: (id) => {
        const s = get()
        const item = GEM_ITEMS.find((g) => g.id === id)
        if (!item) return false
        if (s.gems < item.cost) {
          s.toast(`💎 ${item.name} costs ${item.cost} gems. You have ${s.gems}. Gems come in packs of 10, conveniently.`, 'bad')
          return false
        }
        const next = { gems: s.gems - item.cost, stats: { ...s.stats, gemSpends: (s.stats.gemSpends ?? 0) + 1 } }
        if (id === 'cat_treat') next.cat = { ...s.cat, hunger: Math.min(100, s.cat.hunger + 30) }
        if (id === 'stamina_sip') next.stamina = Math.min(getMaxStamina(s), s.stamina + 5)
        if (id === 'ad_snooze') next.nextAdAt = Math.max(s.nextAdAt, Date.now()) + 60_000
        set(next)
        const left = next.gems
        s.toast(
          left > 0 && left < 13
            ? `💎 ${item.name} bought. ${left} gem${left === 1 ? '' : 's'} left over: not enough for anything. A Bag of 10 would fix that.`
            : `💎 ${item.name} bought. ${left} gems left.`,
          'good',
        )
        if (id === 'golden_name') s.toast('✨ Your name is now golden. Only you can see it. You can’t.', 'info')
        return true
      },

      // ---- Subscriptions: cancelling is possible. Technically. ----
      openCancelFlow: (id) => set({ cancelFlow: id }),
      closeCancelFlow: () => set({ cancelFlow: null }),
      cancelSubscription: (id) =>
        set((s) => {
          const premium = { ...s.premium }
          delete premium[id]
          return { premium, cancelFlow: null, stats: { ...s.stats, subsCancelled: (s.stats.subsCancelled ?? 0) + 1 } }
        }),
      acceptRetention: () => set((s) => ({ cancelFlow: null, stats: { ...s.stats, retentionAccepted: (s.stats.retentionAccepted ?? 0) + 1 } })),
      cancelTheCancellation: () => set((s) => ({ cancelFlow: null, stats: { ...s.stats, cancelsCancelled: (s.stats.cancelsCancelled ?? 0) + 1 } })),

      // ---- AFK: income pauses, expenses don't ----
      setAfk: (afk) => set((s) => (afk === s.afk ? s : { afk, stats: afk ? { ...s.stats, afkTimes: (s.stats.afkTimes ?? 0) + 1 } : s.stats })),

      // ---- Little stat counters for achievements ----
      noteSlotSpin: ({ five, rock }) =>
        set((s) => ({
          stats: { ...s.stats, slotFives: (s.stats.slotFives ?? 0) + (five ? 1 : 0), rockLines: (s.stats.rockLines ?? 0) + (rock ? 1 : 0) },
        })),
      noteDvdBounce: () => set((s) => ({ stats: { ...s.stats, dvdBounces: (s.stats.dvdBounces ?? 0) + 1 } })),
      closeTutorial: () => set({ tutorialSeen: true, tutorialOpen: false }),
      openEndings: () => set({ endingsOpen: true }),
      closeEndings: () => set({ endingsOpen: false }),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      openUnwrapped: () => set((s) => ({ unwrappedOpen: true, stats: { ...s.stats, unwrappedViews: (s.stats.unwrappedViews ?? 0) + 1 } })),
      closeUnwrapped: () => set({ unwrappedOpen: false }),
      setSettings: (patch) =>
        set((s) => {
          const tried = s.stats.languagesTried ?? []
          const fresh = patch.language && !tried.includes(patch.language)
          return { settings: { ...s.settings, ...patch }, ...(fresh ? { stats: { ...s.stats, languagesTried: [...tried, patch.language] } } : {}) }
        }),

      // ---- New game: the title screen picks a mode ----
      /** Normal or Speedrun. Speedrunners skip the tutorial and "accept" every cookie on the way in. */
      chooseMode: (mode) => {
        const s = get()
        if (s.mode) return
        if (mode === 'rogue' && !rogueTargets(s).length) return // a run targets an ending you've done
        const now = Date.now()
        set({
          mode,
          run: { startedAt: now, endedAt: null, splits: {} },
          ...(mode === 'daily' ? dailyRun(now) : {}),
          ...(mode === 'rogue' ? rogueStart(s, now) : {}),
          lastTickAt: now,
          // The world starts now, not when the page loaded.
          nextAdAt: now + getAdInterval(s),
          nextAuditAt: now + AUDIT.checkEverySec * 1000,
          nextTosAt: now + TOS.firstAfterMs,
          nextFomoAt: now + randBetween(FOMO.minMs, FOMO.maxMs),
          staminaTs: now,
          ...(mode !== 'normal' && !s.consent ? { consent: { choice: 'all', at: now, auto: true } } : {}),
        })
        if (mode === 'speedrun') s.toast('⏱️ Speedrun started. Every cookie was accepted on your behalf. Time is money.', 'info')
        if (mode === 'daily') s.toast('📅 Daily Challenge started. Everyone gets the same luck today. Good luck anyway.', 'info')
      },

      /** The Roguelike run's briefing was read. */
      seeRogue: () => set((s) => (s.rogue ? { rogue: { ...s.rogue, seen: true } } : {})),

      // ---- Daily Challenge ----
      /** Parks your game (it comes back when you leave) and starts today's challenge. */
      startDaily: () => {
        const s = get()
        const now = Date.now()
        if (s.mode !== 'daily') {
          const { partialize, version } = useGameStore.persist.getOptions()
          try {
            localStorage.setItem(STASH_KEY, JSON.stringify({ state: partialize(s), version }))
          } catch {
            return s.toast('Could not park your game (storage is full or blocked), so the Daily Challenge was not started.', 'bad')
          }
        }
        get().replaceSave({ ...s, ...freshSave(), ...freshGame(), ...dailyRun(now), consent: s.consent ?? { choice: 'all', at: now, auto: true } }, 'daily')
      },
      /** Back to the parked game, keeping what the daily earned for the record (achievements, endings, records). */
      leaveDaily: () => {
        const s = get()
        let stash = null
        try {
          stash = JSON.parse(localStorage.getItem(STASH_KEY) ?? 'null')
        } catch {
          stash = null
        }
        if (!stash?.state) return get().restartGame({ scope: 'game' }) // nothing parked: a new game
        const main = migrateSave(stash.state, stash.version ?? 0)
        get().replaceSave(
          {
            ...useGameStore.getInitialState(),
            ...main,
            achievements: { ...s.achievements, ...main.achievements },
            endings: { ...s.endings, ...main.endings },
            records: s.records,
            settings: s.settings,
            audio: s.audio,
            theme: s.theme,
          },
          'return',
        )
        try {
          localStorage.removeItem(STASH_KEY)
        } catch {
          // it will be overwritten next time
        }
      },
      seeDailyResult: () => set((s) => (s.dailyDone ? { dailyDone: { ...s.dailyDone, seen: true } } : s)),
      /** Randomness for components (roulette, slots): seeded on a Daily, Math.random otherwise. */
      rngMany: (stream, n) => {
        const r = streamRand(get(), stream)
        const values = Array.from({ length: n }, r.rand)
        const p = r.patch()
        if (p) set(p)
        return values
      },
      rng: (stream) => get().rngMany(stream, 1)[0],

      // ---- Translation contracts ----
      /** Called by the translator after a translation: delivers the matching open job, if any. */
      deliverContract: ({ text, lang, correct, output, self = false }) => {
        const s = get()
        const key = normalizePhrase(text)
        const job = s.contracts.find((c) => c.lang === lang && normalizePhrase(c.text) === key)
        if (!job) return null
        const n = correct ? 5 : 1
        const full = getContractPay(s, job)
        const pay = correct ? full : Math.round(full * CONTRACT.botchedShare)
        const review = { id: makeId(), client: job.client, icon: job.icon, stars: n, text: reviewText(n, { out: output, lang }), at: Date.now() }
        set({
          money: s.money + pay,
          contracts: s.contracts.filter((c) => c.id !== job.id),
          ratings: [...s.ratings, n].slice(-CONTRACT.ratingsKept),
          reviews: [review, ...s.reviews].slice(0, 12),
          stats: {
            ...s.stats,
            contractsDone: (s.stats.contractsDone ?? 0) + 1,
            contractsPerfect: (s.stats.contractsPerfect ?? 0) + (correct ? 1 : 0),
            contractsBotched: (s.stats.contractsBotched ?? 0) + (correct ? 0 : 1),
            contractsSelf: (s.stats.contractsSelf ?? 0) + (self ? 1 : 0),
            contractEarnings: (s.stats.contractEarnings ?? 0) + pay,
          },
        })
        s.toast(
          correct
            ? `📝 ${job.client}: ${stars(5)} “${review.text}” +${fmtMoney(pay)}`
            : `📝 ${job.client}: ${stars(1)} “${review.text}” Pity payment: +${fmtMoney(pay)}`,
          correct ? 'good' : 'bad',
        )
        return { pay, stars: n }
      },
      /** TranslatrAI™ remembers the sentences it translated correctly for you. */
      sawTranslation: (text) =>
        set((s) => {
          const key = normalizePhrase(text)
          if (!key || s.fluency.copied.includes(key)) return {}
          return { fluency: { ...s.fluency, copied: [key, ...s.fluency.copied].slice(0, COPIES_KEPT) } }
        }),
      /**
       * Your own Premium Latin™ (free). Marked word by word. A sentence counts toward the streak
       * when it has FLUENCY_MIN_WORDS different words, is new this streak and isn't TranslatrAI™'s
       * own work pasted back; anything else is practice. A mistake on a counting sentence resets
       * the streak; FLUENCY_TO_WIN in a row is the Self-Taught ending. Contracts accept it too.
       * Returns the marking plus { verdict: 'right' | 'wrong' | 'practice' | 'copied', why, streak }.
       */
      selfTranslate: ({ text, attempt, lang }) => {
        if (get().over) return null
        const grade = gradeSelfTranslation(text, attempt)
        if (!grade.words.length || !/[a-z]/i.test(attempt)) return { ...grade, verdict: 'empty', streak: get().fluency.streak }
        get().deliverContract({ text, lang, correct: grade.correct, output: attempt.trim(), self: true })
        const s = get()
        const f = s.fluency
        const key = normalizePhrase(text)
        if (grade.correct && f.copied.includes(key)) {
          set({ stats: { ...s.stats, selfChecks: (s.stats.selfChecks ?? 0) + 1, selfCopies: (s.stats.selfCopies ?? 0) + 1 } })
          return { ...grade, verdict: 'copied', streak: f.streak }
        }
        const stats = {
          ...s.stats,
          selfChecks: (s.stats.selfChecks ?? 0) + 1,
          selfCorrect: (s.stats.selfCorrect ?? 0) + (grade.correct ? 1 : 0),
        }
        const why = grade.distinct < FLUENCY_MIN_WORDS ? 'short' : f.used.includes(key) ? 'repeat' : null
        if (why) {
          set({ stats })
          return { ...grade, verdict: 'practice', why, streak: f.streak }
        }
        if (!grade.correct) {
          set({ fluency: { ...f, streak: 0, used: [] }, stats: { ...stats, selfMistakes: (stats.selfMistakes ?? 0) + 1 } })
          if (f.streak >= 3) s.toast(`✍️ A ${f.streak}-sentence streak, gone. TranslatrAI™ is smirking.`, 'bad')
          return { ...grade, verdict: 'wrong', streak: 0, lost: f.streak }
        }
        const streak = f.streak + 1
        set({
          fluency: { ...f, streak, used: [...f.used, key], last: correctTranslate(text.trim()) },
          stats: { ...stats, fluencyBest: Math.max(stats.fluencyBest ?? 0, streak) },
        })
        if (streak >= FLUENCY_TO_WIN) {
          set((st) => ({ fluency: { ...st.fluency, streak: 0, used: [] } }))
          get().triggerEnding('taught')
        } else {
          s.toast(`${FLUENCY_PROGRESS[streak] ?? `✍️ ${streak} in a row. Nobody at TRANSLATR™ is happy for you.`} (${streak}/${FLUENCY_TO_WIN})`, streak >= 3 ? 'good' : 'info')
        }
        return { ...grade, verdict: 'right', streak }
      },
      /** Clicking a notification badge "clears" it by adding 1–9 more. */
      bumpPhantom: (key) =>
        set((s) => ({ phantom: { ...s.phantom, [key]: (s.phantom[key] ?? 0) + 1 + Math.floor(Math.random() * 9) } })),
      /** Sends a game window to the taskbar (it stays mounted, just hidden). */
      minimizeWindow: (id) =>
        set((s) => (s.layout.minimized.includes(id) ? s : { layout: { ...s.layout, minimized: [...s.layout.minimized, id] } })),
      restoreWindow: (id) =>
        set((s) => (s.layout.minimized.includes(id) ? { layout: { ...s.layout, minimized: s.layout.minimized.filter((m) => m !== id) } } : s)),
      /** Start menu "Restore all": every minimized window, plus any widget "Collapse all" folded away. */
      restoreAllWindows: () =>
        set((s) => ({
          layout: {
            ...s.layout,
            ...Object.fromEntries(s.collapsedWidgets.map((id) => [id, { ...s.layout[id], collapsed: false }])),
            minimized: [],
          },
          desktopPeek: null,
          collapsedWidgets: [],
        })),
      /** Start menu "Collapse all": every window to the taskbar, and the cat and DoomFeed™ into theirs. */
      collapseAll: () => {
        const s = get()
        const open = DEFAULT_WINDOW_ORDER.filter((id) => isWindowAvailable(s, id) && !s.layout.minimized.includes(id))
        const widgets = WIDGET_IDS.filter((id) => !s.layout[id].collapsed)
        if (!open.length && !widgets.length) return s.toast('🗕 Everything is already collapsed. Much like the economy.', 'info')
        set({
          layout: {
            ...s.layout,
            ...Object.fromEntries(widgets.map((id) => [id, { ...s.layout[id], collapsed: true }])),
            minimized: [...s.layout.minimized, ...open],
          },
          desktopPeek: open, // so the taskbar's "Show desktop" brings back exactly these
          collapsedWidgets: [...new Set([...s.collapsedWidgets, ...widgets])],
        })
        if (s.ads.length) s.toast('🗕 Everything collapsed. The ads declined.', 'info')
      },
      /** Taskbar "Show desktop": minimize every open window; click again to bring those back. */
      toggleDesktop: () => {
        const s = get()
        const available = DEFAULT_WINDOW_ORDER.filter((id) => isWindowAvailable(s, id))
        const open = available.filter((id) => !s.layout.minimized.includes(id))
        if (open.length) {
          set({ layout: { ...s.layout, minimized: [...s.layout.minimized, ...open] }, desktopPeek: open })
          if (s.ads.length) s.toast('🖥️ Desktop shown. The ads stayed. The ads always stay.', 'info')
          return
        }
        const back = s.desktopPeek?.length ? s.desktopPeek : available
        set({ layout: { ...s.layout, minimized: s.layout.minimized.filter((id) => !back.includes(id)) }, desktopPeek: null })
      },

      // ================= Economy =================
      addMoney: (amount) => set((s) => ({ money: s.money + amount })),

      /** One manual swing. Costs 1 stamina. Returns { gain, crit } or null when exhausted. */
      mine: () => {
        const s = get()
        const infinite = !!eventMods(s).infiniteStamina // a cheat
        if (s.stamina <= 0 && !infinite) return null
        const clicks = s.stats.clicks + 1
        const crit = hasSkill(s, 'crit') && Math.random() < 0.1
        const lode = hasSkill(s, 'motherlode') && clicks % 25 === 0
        let gain = getMiningRate(s) * (crit ? 10 : 1) * (lode ? 100 : 1)
        // Spooky Season: Trick or Tax.
        let trick = null
        if (eventMods(s).trickOrTax) {
          const r = Math.random()
          trick = r < 0.08 ? 'trick' : r < 0.13 ? 'treat' : null
        }
        if (trick === 'treat') gain *= 13
        const lost = trick === 'trick' ? Math.floor(s.money * 0.05) : 0
        if (trick === 'trick') gain = 0
        set({
          money: s.money + gain - lost,
          stamina: infinite ? s.stamina : s.stamina - 1,
          // Regen starts counting from the first point spent, not from some stale moment.
          staminaTs: s.stamina >= getMaxStamina(s) && !infinite ? Date.now() : s.staminaTs,
          stats: {
            ...s.stats,
            clicks,
            exhaustions: (s.stats.exhaustions ?? 0) + (s.stamina === 1 && !infinite ? 1 : 0),
            moneyMined: (s.stats.moneyMined ?? 0) + gain,
          },
        })
        if (trick === 'trick') s.toast(`🎃 TRICK! The swing cost you ${fmtMoney(lost)}. Happy Spooky Season.`, 'bad')
        if (trick === 'treat') s.toast(`🍬 TREAT! That swing paid ×13: +${fmtMoney(gain)}.`, 'good')
        if (lode) s.toast(`🌋 MOTHERLODE! Swing #${clicks.toLocaleString()} paid ×100.`, 'good')
        return { gain, crit: crit || lode, lost }
      },

      upgradePickaxe: () => {
        const s = get()
        const next = PICKAXE_LEVELS[s.pickaxeLevel]
        if (!next) return false
        const cost = getPickaxeCost(s)
        if (s.money < cost) {
          s.toast(`Need ${fmtMoney(cost)}. Keep clicking, peasant.`, 'bad')
          return false
        }
        set({ money: s.money - cost, pickaxeLevel: next.level, stats: { ...s.stats, upgradesBought: (s.stats.upgradesBought ?? 0) + 1 } })
        s.toast(`⛏️ Upgraded to ${next.name}!`, 'good')
        return true
      },

      upgradeStamina: () => {
        const s = get()
        const next = STAMINA_LEVELS[s.staminaLevel]
        if (!next) return false
        const cost = getStaminaCost(s)
        if (s.money < cost) {
          s.toast(`Stamina Lvl ${next.level} costs ${fmtMoney(cost)}. Cardio isn't free.`, 'bad')
          return false
        }
        const extra = next.max - getMaxStamina(s)
        set({
          money: s.money - cost,
          staminaLevel: next.level,
          stamina: s.stamina + extra,
          stats: { ...s.stats, upgradesBought: (s.stats.upgradesBought ?? 0) + 1 },
        })
        s.toast(`⚡ Max stamina is now ${next.max}!`, 'good')
        return true
      },

      /** Charges the Vowel-Taxed price and issues a receipt. Returns { ok, quote }. */
      /**
       * Bills a translation request. Every REFUSE_EVERY-th request is refused (and still
       * billed); refusals don't use up the free trial. Returns { ok, quote, refused }.
       */
      requestTranslation: (text) => {
        const s = get()
        const mods = eventMods(s)
        const quote = quoteTranslation(s, text)
        if (mods.translatorDown) return { ok: false, down: true, quote } // Server Maintenance
        if (s.money < quote.total) return { ok: false, quote }
        const attempt = (s.stats.translateAttempts ?? 0) + 1
        const refused = attempt % REFUSE_EVERY === 0 && !hasSkill(s, 'polyglot') && !mods.noRefusal
        set({
          money: s.money - quote.total,
          receipt: { id: makeId(), ...quote, refused },
          stats: {
            ...s.stats,
            translateAttempts: attempt,
            taxPaid: (s.stats.taxPaid ?? 0) + quote.taxTotal,
            translationSpend: (s.stats.translationSpend ?? 0) + quote.total,
            ...(refused
              ? { translationsRefused: (s.stats.translationsRefused ?? 0) + 1 }
              : { wordsTranslated: s.stats.wordsTranslated + quote.words, translations: (s.stats.translations ?? 0) + 1 }),
          },
        })
        return { ok: true, quote, refused }
      },
      dismissReceipt: (id) => set((s) => (s.receipt?.id === id ? { receipt: null } : {})),

      /** Rewarded ad: pays the equivalent of 100 clicks (no crits, no stamina). */
      claimAdReward: () => {
        const s = get()
        if (activeMods(s).noRewardedAds) return 0
        const gain = getAdReward(s, REWARDED_AD_CLICKS)
        set({
          money: s.money + gain,
          adRewardAt: Date.now(), // starts the cooldown
          stats: { ...s.stats, adRewards: (s.stats.adRewards ?? 0) + 1, adRewardMoney: (s.stats.adRewardMoney ?? 0) + gain },
        })
        return gain
      },

      // ================= Translator skins =================
      selectSkin: (id) => {
        const s = get()
        const def = TRANSLATOR_SKINS.find((k) => k.id === id)
        if (!def) return
        if (s.skinsOwned[id]) return set({ translatorSkin: id })
        if (def.premium) {
          // A microtransaction, as far as the secret ending is concerned.
          set({
            skinsOwned: { ...s.skinsOwned, [id]: true },
            translatorSkin: id,
            stats: {
              ...s.stats,
              skinsBought: (s.stats.skinsBought ?? 0) + 1,
              purchases: (s.stats.purchases ?? 0) + 1,
              fakeSpend: (s.stats.fakeSpend ?? 0) + priceCents(def.premium),
            },
          })
          return s.toast(`💳 Charged ${def.premium}! (Actually $0.00.) Enjoy ${def.name}.`, 'good')
        }
        if (s.money < def.price) return s.toast(`${def.name} costs $${def.price.toLocaleString()}. Drip isn't free.`, 'bad')
        set({
          money: s.money - def.price,
          skinsOwned: { ...s.skinsOwned, [id]: true },
          translatorSkin: id,
          stats: { ...s.stats, skinsBought: (s.stats.skinsBought ?? 0) + 1 },
        })
        s.toast(`${def.emoji} Equipped ${def.name} frame!`, 'good')
      },

      // ================= Casino =================
      /** Takes a bet (roulette or slots). Refuses bets over the table limit. */
      placeBet: (bet, game = 'roulette') => {
        const s = get()
        if (bet <= 0 || bet > s.money) {
          s.toast("You can't bet money you don't have. (Yet. Loans coming soon™)", 'bad')
          return false
        }
        const limit = getTableLimit(s)
        if (bet > limit) {
          s.toast(`🎩 The table limit is ${fmtMoney(limit)}. Prestige raises it. High Roller raises it more.`, 'bad')
          return false
        }
        const spins = game === 'slots' ? 'slotSpins' : 'rouletteSpins'
        set({ money: s.money - bet, stats: { ...s.stats, moneyGambled: s.stats.moneyGambled + bet, [spins]: (s.stats[spins] ?? 0) + 1 } })
        return true
      },
      /** Pays a win: × your multiplier, × Casino Night, × Card Counter (slots). */
      settleBet: (baseWinnings, game = 'roulette') => {
        const s = get()
        const counter = game === 'slots' && hasSkill(s, 'card_counter') ? 2 : 1
        const gain = Math.round(baseWinnings * getMultiplier(s) * (eventMods(s).casino ?? 1) * counter)
        set((st) => ({ money: st.money + gain, stats: { ...st.stats, casinoWon: (st.stats.casinoWon ?? 0) + gain } }))
        return gain
      },
      /** Call on every lost bet: records the loss and applies Loss Insurance. Returns the refund. */
      refundLoss: (bet) => {
        const s = get()
        const refund = hasSkill(s, 'insurance') ? Math.floor(bet * 0.25) : 0
        set({ money: s.money + refund, stats: { ...s.stats, gambleLosses: (s.stats.gambleLosses ?? 0) + bet - refund } })
        return refund
      },

      // ================= CAPTCHA =================
      /** Shows a challenge; `onPass` runs only if it's solved. Respects lockouts. */
      requestCaptcha: (action, onPass) => {
        const s = get()
        const left = lockSecondsLeft(s, action, Date.now())
        if (left > 0) return s.toast(`🔒 ${CAPTCHA.actions[action]} locked for ${left}s. Robots must wait.`, 'bad')
        if (s.captcha) return
        set({ captcha: { id: makeId(), action, ...makeCaptcha(), deadline: Date.now() + CAPTCHA.timeLimitSec * 1000, onPass } })
      },
      /** Idempotent: a stale id (e.g. a late timeout) is ignored. */
      resolveCaptcha: (id, passed, reason) => {
        const s = get()
        const c = s.captcha
        if (!c || c.id !== id) return
        if (passed) {
          set({ captcha: null, stats: { ...s.stats, captchaPasses: (s.stats.captchaPasses ?? 0) + 1 } })
          s.toast('✅ Humanity verified. Probably.', 'good')
          c.onPass?.()
          return
        }
        set({
          captcha: null,
          lockouts: { ...s.lockouts, [c.action]: Date.now() + CAPTCHA.lockoutSec * 1000 },
          stats: { ...s.stats, captchaFails: (s.stats.captchaFails ?? 0) + 1 },
        })
        s.toast(`🤖 ${reason ?? 'CAPTCHA failed.'} ${CAPTCHA.actions[c.action]} locked for ${CAPTCHA.lockoutSec}s.`, 'bad')
      },
      cancelCaptcha: (id) => set((s) => (s.captcha?.id === id ? { captcha: null } : {})),

      // ================= CryptoBro Exchange =================
      /** Buys `dollars` worth of a coin at today's price. */
      buyCrypto: (id, dollars) => {
        const s = get()
        const coin = COIN_BY_ID[id]
        const amount = Math.floor(dollars)
        if (!coin || !(amount > 0)) return false
        if (amount > s.money) {
          s.toast('You can’t buy the dip with money you don’t have. (Vinnie can help.)', 'bad')
          return false
        }
        const market = s.market ?? freshMarket()
        const qty = amount / market.prices[id]
        set({
          market,
          money: s.money - amount,
          crypto: { ...s.crypto, [id]: (s.crypto[id] ?? 0) + qty },
          stats: { ...s.stats, cryptoBought: (s.stats.cryptoBought ?? 0) + amount, cryptoTrades: (s.stats.cryptoTrades ?? 0) + 1 },
        })
        return true
      },
      /** Sells a share (0–1) of what you hold of a coin. Returns the dollars you got. */
      sellCrypto: (id, share = 1) => {
        const s = get()
        const held = s.crypto[id] ?? 0
        if (!COIN_BY_ID[id] || held <= 0) return 0
        const qty = share >= 1 ? held : held * share
        const value = Math.floor(qty * (s.market ?? freshMarket()).prices[id])
        set({
          money: s.money + value,
          crypto: { ...s.crypto, [id]: share >= 1 ? 0 : held - qty },
          stats: { ...s.stats, cryptoSold: (s.stats.cryptoSold ?? 0) + value, cryptoTrades: (s.stats.cryptoTrades ?? 0) + 1 },
        })
        return value
      },

      // ================= Ye Olde Forge & HomeLab NAS =================
      collectForge: () => {
        const s = get()
        const amount = Math.floor(s.forge?.stored ?? 0)
        if (!ownsExpansion(s, 'forge') || amount <= 0) return 0
        set({ money: s.money + amount, forge: { ...s.forge, stored: (s.forge.stored ?? 0) - amount }, stats: { ...s.stats, forgeCollected: (s.stats.forgeCollected ?? 0) + amount } })
        return amount
      },
      upgradeForge: () => {
        const s = get()
        const level = s.forge?.level ?? 1
        if (!ownsExpansion(s, 'forge') || level >= FORGE.maxLevel) return false
        const cost = getForgeUpgradeCost(s)
        if (s.money < cost) {
          s.toast(`The smith wants ${fmtMoney(cost)} for that. Gold, not promises.`, 'bad')
          return false
        }
        set({ money: s.money - cost, forge: { ...s.forge, level: level + 1 }, stats: { ...s.stats, upgradesBought: (s.stats.upgradesBought ?? 0) + 1 } })
        return true
      },
      /** Buys (if needed) and puts on one of the Forge's looks. */
      setForgeTheme: (id) => {
        const s = get()
        const theme = FORGE_THEME_BY_ID[id]
        if (!theme) return false
        if (!s.forgeThemes.includes(id)) {
          const cost = getForgeThemePrice(s, theme)
          if (s.money < cost) {
            s.toast(`${theme.name} costs ${fmtMoney(cost)}. Cosmetics are the real endgame.`, 'bad')
            return false
          }
          set({ money: s.money - cost, forgeThemes: [...s.forgeThemes, id], forgeTheme: id })
          s.toast(`${theme.icon} The Forge is now a ${theme.name}.`, 'good')
          return true
        }
        set({ forgeTheme: id })
        return true
      },
      upgradeNas: () => {
        const s = get()
        const tier = s.nas?.tier ?? 0
        if (!ownsExpansion(s, 'nas') || tier >= NAS_TIERS.length - 1) return false
        const cost = getNasUpgradeCost(s)
        if (s.money < cost) {
          s.toast(`More drives cost ${fmtMoney(cost)}. Storage is cheap; this isn’t.`, 'bad')
          return false
        }
        set({ money: s.money - cost, nas: { ...s.nas, tier: tier + 1 }, stats: { ...s.stats, upgradesBought: (s.stats.upgradesBought ?? 0) + 1 } })
        s.toast(`🗄️ Upgraded to a ${NAS_TIERS[tier + 1].name}. More blinking. More money.`, 'good')
        return true
      },
      setNasUi: (patch) => set((s) => ({ nasUi: { ...s.nasUi, ...patch } })),

      // ================= Loot boxes =================
      /** Opens `count` boxes of one tier (LOOT_BOXES). Returns what came out, or null if you're broke. */
      buyLootBoxes: (count, boxId = 'cardboard') => {
        const s = get()
        const box = LOOT_BOX_BY_ID[boxId]
        if (!box) return null
        const cost = count * getLootboxPrice(s, boxId)
        if (s.money < cost) {
          s.toast(`${count} ${box.name}${count > 1 ? 'es cost' : ' costs'} ${fmtMoney(cost)}. Mine harder.`, 'bad')
          return null
        }
        const mods = eventMods(s)
        const charm = hasSkill(s, 'charm')
        const luck = { relicMult: (charm ? 10 : 1) * (mods.relic ?? 1), equipMult: (charm ? 2 : 1) * (mods.luck ?? 1) }
        const pityStep = box.pity * (hasSkill(s, 'pity_party') ? 2 : 1) * (mods.pity ?? 1)
        let pity = s.pity ?? 0
        let relics = 0
        let pityRelics = 0
        let found = 0
        let spoiled = 0
        const expansions = { ...s.expansions }
        const trash = { ...s.trash }
        const items = [...s.items]
        const results = []
        const r = streamRand(s, 'loot')
        for (let i = 0; i < count; i++) {
          let loot = rollLoot(boxId, luck, r.rand)
          pity += pityStep
          // Platinum Boxes: 1 in 100 holds a whole expansion you don't have yet.
          const missing = boxId === 'platinum' ? Object.keys(EXPANSIONS).filter((id) => !ownsExpansion({ ...s, expansions }, id)) : []
          if (missing.length && r.rand() < EXPANSION_DROP_CHANCE) {
            const id = missing[Math.floor(r.rand() * missing.length)]
            expansions[id] = true
            results.push({ kind: 'expansion', id, name: EXPANSIONS[id].name })
            continue
          }
          // A rat got there first. (It even eats relics. It does not respect the economy.)
          if (r.rand() < (mods.ratChance ?? SPOILED_BOX_CHANCE) && !(loot.kind !== 'relic' && pity >= RELIC_PITY)) {
            spoiled++
            results.push({ kind: 'spoiled', name: 'Eaten by a rat', ate: loot.kind === 'trash' ? null : loot.name })
            continue
          }
          // Gacha pity: after RELIC_PITY boxes without a relic, the next one is guaranteed.
          if (loot.kind !== 'relic' && pity >= RELIC_PITY) {
            loot = { kind: 'relic', id: RELIC.id, name: RELIC.name, pity: true }
            pityRelics++
          }
          if (loot.kind === 'relic') {
            pity = 0
            relics++
          }
          results.push(loot)
          if (loot.kind === 'trash') trash[loot.name] = (trash[loot.name] ?? 0) + 1
          else {
            found++
            items.push({ uid: makeId(), itemId: loot.id })
          }
        }
        set({
          ...r.patch(),
          money: s.money - cost,
          trash,
          items,
          pity,
          expansions,
          stats: {
            ...s.stats,
            boxesOpened: s.stats.boxesOpened + count,
            boxSpend: (s.stats.boxSpend ?? 0) + cost,
            relicsFound: (s.stats.relicsFound ?? 0) + relics,
            pityRelics: (s.stats.pityRelics ?? 0) + pityRelics,
            itemsFound: (s.stats.itemsFound ?? 0) + found,
            boxesSpoiled: (s.stats.boxesSpoiled ?? 0) + spoiled,
            [`${boxId}Boxes`]: (s.stats[`${boxId}Boxes`] ?? 0) + count,
            // The collection: every kind of item you've ever pulled.
            itemIds: [...new Set([...(s.stats.itemIds ?? []), ...results.filter((l) => l.kind === 'equip').map((l) => l.id)])],
          },
        })
        return results
      },

      // ================= Inventory =================
      equip: (uid) => {
        const s = get()
        if (s.equipped.includes(uid)) return
        const item = s.items.find((i) => i.uid === uid)
        if (!item || !EQUIPPABLES[item.itemId]) return
        const max = getMaxEquipped(s)
        if (s.equipped.length >= max) return s.toast(`All ${max} slots full. Slot expansion DLC coming Q5 2027.`, 'bad')
        set({ equipped: [...s.equipped, uid] })
      },
      unequip: (uid) => set((s) => ({ equipped: s.equipped.filter((u) => u !== uid) })),

      recycleTrash: () => {
        const s = get()
        const total = Object.values(s.trash).reduce((a, b) => a + b, 0)
        const stats = { ...s.stats, trashRecycled: (s.stats.trashRecycled ?? 0) + total }
        if (hasSkill(s, 'appraiser')) {
          const payout = total * 25 * getMultiplier(s)
          set({ trash: {}, money: s.money + payout, stats })
          s.toast(`🧐 Appraised ${total.toLocaleString()} trash for $${payout.toLocaleString()}!`, 'good')
        } else {
          set({ trash: {}, stats })
          s.toast('♻️ Recycled all trash for $0. The planet thanks you.', 'info')
        }
      },

      // ================= Prestige =================
      requestPrestige: (uid) => {
        const s = get()
        const next = prestigeBase(s) ** (s.prestige + 1)
        s.showModal({
          tone: 'warn',
          title: '🏺 Use The Prestige Relic?',
          body: `This DELETES your money, pickaxe & stamina upgrades and all items. In return: a permanent x${next.toLocaleString()} multiplier and ${skillPointsForPrestige(s.prestige + 1)} skill points.`,
          confirmLabel: 'Ascend',
          cancelLabel: 'I am weak',
          onConfirm: () => get().activateRelic(uid),
        })
      },
      activateRelic: (uid) => {
        const s = get()
        if (!s.items.some((i) => i.uid === uid && i.itemId === RELIC.id)) return
        const prestige = s.prestige + 1
        const points = skillPointsForPrestige(prestige)
        set({
          ...freshRun(),
          prestige,
          skillPoints: s.skillPoints + points,
          bot: s.bot && { ...s.bot, pot: 0, actions: 0, won: 0 },
        })
        s.showModal({
          tone: 'good',
          title: '✨ Prestige Achieved',
          body: `Everything you owned is gone. All future income is now multiplied by x${(prestigeBase(s) ** prestige).toLocaleString()}, and you earned ${points} skill points. The table limit went up ×10, too.`,
        })
      },

      // ================= Skill tree =================
      buySkill: (id) => {
        const s = get()
        const skill = SKILLS.find((k) => k.id === id)
        if (!skill || skillStatus(s, skill) !== 'available') return false
        set({ skillPoints: s.skillPoints - skill.cost, skills: { ...s.skills, [id]: true } })
        s.toast(`${skill.emoji} Learned ${skill.name}!`, 'good')
        return true
      },
      respecSkills: () => {
        const s = get()
        const refund = SKILLS.filter((k) => s.skills[k.id]).reduce((sum, k) => sum + k.cost, 0)
        set({ skills: {}, skillPoints: s.skillPoints + refund })
        s.toast(`Respec complete. ${refund} points refunded. That would've been $9.99.`, 'info')
      },

      // ================= Bot =================
      buyBot: () => {
        const s = get()
        if (s.prestige < 1 || s.bot) return
        const price = getBotPrice(s)
        if (s.money < price) return s.toast(`Bots cost ${fmtMoney(price)}. Robots have rent too.`, 'bad')
        const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
        set({ money: s.money - price, bot: { name, mode: 'mine', running: true, pot: 0, actions: 0, won: 0, chip: 10 } })
        s.toast(`🤖 Hired ${name}! Collect often. It is not loyal.`, 'good')
      },
      updateBot: (patch) => set((s) => (s.bot ? { bot: { ...s.bot, ...patch } } : {})),
      collectBot: () => {
        const s = get()
        if (!s.bot) return
        set({
          money: s.money + s.bot.pot,
          bot: { ...s.bot, pot: 0, actions: 0, won: 0 },
          stats: { ...s.stats, botCollected: (s.stats.botCollected ?? 0) + s.bot.pot },
        })
        if (s.bot.pot) s.toast(`🤖 Collected $${s.bot.pot.toLocaleString()} from ${s.bot.name}.`, 'good')
      },

      // ================= Cat =================
      /** Costs real (in-game) money. No money, no food — and the cat saw you check your wallet. Returns success. */
      feedCat: () => {
        const s = get()
        const cost = getCatFoodCost(s)
        if (s.money < cost) {
          set({
            cat: { ...s.cat, love: clampNeed(s.cat.love - CAT.brokeLovePenalty) },
            stats: { ...s.stats, catFeedFails: (s.stats.catFeedFails ?? 0) + 1 },
          })
          s.toast(`🥫 Cat food costs $${cost.toLocaleString()}. You have $${Math.floor(s.money).toLocaleString()}. The cat watched you check. −${CAT.brokeLovePenalty} love.`, 'bad')
          return false
        }
        set({
          money: s.money - cost,
          cat: { ...s.cat, hunger: clampNeed(s.cat.hunger + CAT.feedAmount) },
          stats: { ...s.stats, catFed: (s.stats.catFed ?? 0) + 1, catFoodSpent: (s.stats.catFoodSpent ?? 0) + cost },
        })
        return true
      },
      playCat: () =>
        set((s) => ({ cat: { ...s.cat, fun: clampNeed(s.cat.fun + CAT.playAmount) }, stats: { ...s.stats, catPlays: (s.stats.catPlays ?? 0) + 1 } })),
      /** Returns false when the cat objects (10%). */
      petCat: () => {
        const s = get()
        if (Math.random() < 0.1) {
          set({ cat: { ...s.cat, love: clampNeed(s.cat.love - 10) } })
          s.toast('🐾 The cat did not want to be pet right now. -10 love.', 'bad')
          return false
        }
        set({ cat: { ...s.cat, love: clampNeed(s.cat.love + CAT.petAmount) }, stats: { ...s.stats, catPets: (s.stats.catPets ?? 0) + 1 } })
        return true
      },

      // ================= QuickCash™ =================
      takeLoan: (amount) => {
        const s = get()
        if (!(amount > 0)) return
        const loan = s.loan ?? { principal: 0, debt: 0, lastAccrual: Date.now() }
        set({
          money: s.money + amount,
          loan: { ...loan, principal: loan.principal + amount, debt: loan.debt + amount },
          stats: { ...s.stats, loansTaken: (s.stats.loansTaken ?? 0) + 1, borrowed: (s.stats.borrowed ?? 0) + amount },
        })
        s.toast(`🦈 Vinnie wired you $${amount.toLocaleString()}. Interest is already happening.`, 'info')
      },
      repayLoan: () => {
        const s = get()
        if (!s.loan) return
        const owed = Math.ceil(s.loan.debt)
        const pay = Math.min(Math.floor(s.money), owed)
        if (pay <= 0) return s.toast("🦈 You can't repay with $0. Vinnie suggests another loan to cover it.", 'bad')
        const stats = { ...s.stats, repaid: (s.stats.repaid ?? 0) + pay }
        if (pay >= owed) {
          set({ money: s.money - owed, loan: null, stats })
          return s.toast('🦈 Loan repaid in full. Vinnie is disappointed in you.', 'good')
        }
        set({ money: s.money - pay, loan: { ...s.loan, debt: s.loan.debt - pay }, stats })
        s.toast(`🦈 Paid $${pay.toLocaleString()}. Still owe $${(owed - pay).toLocaleString()}. See you soon.`, 'info')
      },

      // ================= Terms of Service / FOMO =================
      acceptTos: (id) =>
        set((s) => (s.tos?.id === id ? { tos: null, stats: { ...s.stats, tosAccepted: (s.stats.tosAccepted ?? 0) + 1 } } : {})),
      dismissFomo: (id) => set((s) => (s.fomo?.id === id ? { fomo: null } : {})),

      // ================= DoomFeed™ =================
      addDoomMeters: (meters) => set((s) => ({ stats: { ...s.stats, doomMeters: (s.stats.doomMeters ?? 0) + meters } })),
      likeDoomPost: () => set((s) => ({ stats: { ...s.stats, doomLikes: (s.stats.doomLikes ?? 0) + 1 } })),
      /** 50 in a row, touching nothing else in between, and you go outside (an ending). */
      touchGrass: () => {
        const s = get()
        if (s.over) return
        const streak = s.grassStreak + 1
        const stats = { ...s.stats, grassAttempts: (s.stats.grassAttempts ?? 0) + 1, grassBest: Math.max(s.stats.grassBest ?? 0, streak) }
        if (streak >= GRASS_TO_WIN) {
          set({ grassStreak: 0, stats })
          return get().triggerEnding('grass')
        }
        set({ grassStreak: streak, stats })
        s.toast(GRASS_PROGRESS[streak] ?? GRASS_LINES[Math.floor(Math.random() * GRASS_LINES.length)], 'info')
      },
      /** Anything else touched: the grass streak starts over. */
      breakGrassStreak: () => {
        const s = get()
        if (!s.grassStreak) return
        if (s.grassStreak >= 5) s.toast('🌱 You touched something else. The grass grew back.', 'bad')
        set({ grassStreak: 0 })
      },

      // ================= Dev IRS =================
      dismissAudit: (id) => set((s) => (s.audit?.id === id ? { audit: null } : {})),
      /** Debug / forced audit (ignores the threshold and dice, not immunity). */
      forceAudit: () => {
        const s = get()
        if (s.audit) return
        const fx = []
        const p = auditPatch(s, fx)
        if (p) set(p)
        fx.forEach((f) => f(get()))
      },

      // ================= Premium store =================
      /** Fake payment flow. Only one checkout at a time; the timer is guarded by id. */
      startCheckout: (itemId) => {
        const s = get()
        const def = PREMIUM_ITEMS.find((p) => p.id === itemId)
        if (!def || s.checkout) return
        if (def.oneTime && s.premium[itemId]) return
        const id = makeId()
        set({ checkout: { id, itemId, phase: 'processing' } })
        clearTimeout(checkoutTimer)
        checkoutTimer = setTimeout(() => {
          const c = get().checkout
          if (c?.id !== id) return
          const bought = get().buyPremium(itemId)
          // A "98% off" purchase: only possible after enough store visits inflated the fake price.
          const st = get()
          const deal = bought && !def.hidden && 1 - 1 / fakeDiscountFactor(st.storeVisits) >= 0.98
          set({ checkout: { ...c, phase: 'done' }, ...(deal ? { stats: { ...st.stats, bigDeals: (st.stats.bigDeals ?? 0) + 1 } } : {}) })
        }, CHECKOUT_MS)
      },
      closeCheckout: () => {
        const c = get().checkout
        if (c?.phase === 'done') set({ checkout: null })
      },
      buyPremium: (id) => {
        const s = get()
        const def = PREMIUM_ITEMS.find((p) => p.id === id)
        if (!def || (def.oneTime && s.premium[id])) return false
        const next = {
          premium: { ...s.premium, [id]: (s.premium[id] ?? 0) + 1 },
          stats: {
            ...s.stats,
            purchases: (s.stats.purchases ?? 0) + 1,
            fakeSpend: (s.stats.fakeSpend ?? 0) + priceCents(def.price),
            gemsBought: (s.stats.gemsBought ?? 0) + (def.gems ?? 0),
            skillPointsBought: (s.stats.skillPointsBought ?? 0) + (def.skillPoints ?? 0),
          },
        }
        if (def.gems) next.gems = s.gems + def.gems
        if (def.skillPoints) next.skillPoints = s.skillPoints + def.skillPoints
        if (def.grantsRelic) next.items = [...s.items, { uid: makeId(), itemId: RELIC.id }]
        if (def.refillStamina) Object.assign(next, { stamina: getMaxStamina(s), staminaTs: Date.now() })
        if (def.clearsDebt) next.loan = null
        // Streak Insurance™: pretend you claimed yesterday, so today continues the streak.
        if (def.repairsStreak) next.streak = { ...s.streak, lastDay: dayBefore(localDay()) }
        set(next)
        return true
      },

      // ================= The nuclear options =================
      /**
       * Writes `state` as the save, stops saving, then restarts the page, so every timer and
       * animation starts clean. `kind` picks the restart screen ('reset' | 'newgame' | 'import').
       */
      replaceSave: (state, kind) => {
        if (get().resetting) return
        const { name, storage, partialize, version } = useGameStore.persist.getOptions()
        storage?.setItem(name, { state: partialize(state), version })
        useGameStore.persist.setOptions({ storage: DISCARD_STORAGE })
        set({ resetting: kind, modal: null })
        setTimeout(() => window.location.reload(), RESET_SCREEN_MS)
      },
      /**
       * Starts over. scope 'game' (a new game, e.g. after an ending) keeps achievements, endings and
       * the rest of the lifetime record; scope 'all' ("Reset all") keeps only theme, sound, settings
       * and speedrun records. `mode` skips the title screen.
       */
      restartGame: ({ scope = 'game', mode = null, ngPlus = 0 } = {}) => {
        const s = get()
        const fresh = { ...freshSave(), ...freshGame(), ...(scope === 'all' ? freshLifetime() : {}), mode, ngPlus }
        // New Game+: the whole Ascension Tree comes with you (the curses are the price).
        if (ngPlus > 0) Object.assign(fresh, { skills: s.skills, skillPoints: s.skillPoints })
        // A new Roguelike run goes straight to its draft.
        if (mode === 'rogue') Object.assign(fresh, rogueStart({ ...s, ...fresh }, Date.now()))
        get().replaceSave({ ...s, ...fresh }, ngPlus > 0 ? 'ngplus' : scope === 'all' ? 'reset' : 'newgame')
      },
      /** Start menu "Reset all": a brand-new player (theme, sound, settings and speedrun records stay). */
      resetAll: () => get().restartGame({ scope: 'all' }),
      /** The "are you sure?" for Reset all (Start menu and Control Panel). */
      askResetAll: () =>
        set({
          settingsOpen: false,
          modal: {
            tone: 'bad',
            sfx: 'uac', // a "Do you want to allow this?" prompt, not an error
            title: '💥 Reset everything?',
            body: 'Money, items, prestige, skills, gems, premium purchases, achievements, endings, your streak, your debt and the cat’s memories of you: all gone, for good. Your theme, sound, settings and speedrun records stay.',
            confirmLabel: 'Reset everything',
            cancelLabel: 'Keep my shame',
            onConfirm: () => get().resetAll(),
          },
        }),
      /** This save as a copy-pasteable code (Control Panel → Save data). */
      getSaveCode: () => encodeSave(useGameStore.persist.getOptions().partialize(get())),
      /** Loads a save code (throws with a readable message if the code is bad). */
      importSave: (code) => {
        const { state } = decodeSave(code)
        get().replaceSave({ ...useGameStore.getInitialState(), ...state }, 'import')
      },

      // ================= Endings =================
      /** Plays an ending. The run stops (timer, splits, records) and the game pauses behind it. */
      triggerEnding: (id) => {
        const s = get()
        if (s.over || s.resetting || !ENDING_BY_ID[id]) return
        const now = Date.now()
        const endings = { ...s.endings }
        for (const e of id === 'secret' ? ['secret', 'buy'] : id === 'snail' ? ['snail', 'buy'] : [id]) endings[e] ??= now
        const running = !!s.run?.startedAt && !s.run.endedAt
        const run = running ? { ...s.run, endedAt: now, ending: id, splits: { ...s.run.splits, end: now - s.run.startedAt } } : s.run
        clearTimeout(checkoutTimer)
        set({
          over: id,
          endings,
          run,
          records: rogueRecord(running && s.mode === 'speedrun' && !s.cheats ? recordRun(s.records, run, id) : s.records, s, id),
          ...(s.mode === 'rogue' && s.rogue && !s.rogue.result ? { rogue: { ...s.rogue, result: id === s.rogue.target ? 'win' : 'loss', ending: id } } : {}),
          ads: [],
          modal: null,
          captcha: null,
          audit: null,
          tos: null,
          fomo: null,
          checkout: null,
          cancelFlow: null,
          receipt: null,
          dailyOpen: false,
          trophiesOpen: false,
          endingsOpen: false,
          settingsOpen: false,
          unwrappedOpen: false,
          shutdownOpen: false,
          shooterOpen: false,
          arcade: null,
          grassStreak: 0,
        })
        // The loop is paused from here on, so the ending achievements are granted directly
        // (the ending screen shows them).
        const st = get()
        const fresh = ACHIEVEMENTS.filter((a) => !st.achievements[a.id] && a.check(st)).map((a) => a.id)
        if (fresh.length) set({ achievements: { ...st.achievements, ...Object.fromEntries(fresh.map((a) => [a, now])) } })
      },
      /** After a non-fatal ending: back to the game (the run's timer stays stopped). */
      keepPlaying: () => {
        const s = get()
        if (!s.over || ENDING_BY_ID[s.over]?.fatal) return
        set({ over: null, lastTickAt: Date.now() })
        s.toast('▶ Back to work. The ads missed you.', 'info')
      },
      /** The snail made it across the screen (before any ending): the secret choice unlocks. */
      arriveSnail: () => {
        const s = get()
        if (s.snailArrived || s.over || s.run?.endedAt) return false
        set({ snailArrived: true, stats: { ...s.stats, snailArrivals: (s.stats.snailArrivals ?? 0) + 1 } })
        s.toast('🐌 The snail made it. It has waited a very long time for this. Buy TRANSLATR™ and see.', 'good')
        return true
      },
      /** The Buy ending: one quintillion dollars. Without a single microtransaction, it's the secret one. */
      buyCompany: () => {
        const s = get()
        if (s.over) return
        const price = getCompanyPrice(s)
        if (s.money < price) return s.toast(`TRANSLATR™ Inc. costs ${fmtMoney(price)}. You have ${fmtMoney(s.money)}. The board laughs.`, 'bad')
        // The snail crossed the screen: its ending is offered next to the usual one (or two).
        if (s.snailArrived && !s.cheats) {
          const usual = (s.stats.purchases ?? 0) === 0 ? 'secret' : 'buy'
          return s.showModal({
            tone: 'warn',
            sfx: 'printer',
            title: '🏢 Sign here, here and… is that a snail?',
            body: `The paperwork for TRANSLATR™ Inc. (${fmtMoney(price)}) is ready. Something small and slimy has been waiting by the pen for hours.`,
            choices: [
              { label: 'Buy the company', className: 'btn-gold', onClick: () => get().acquire(usual) },
              ...(corporateSlaveReady(s) ? [{ label: 'Take the job instead', className: 'btn-ghost', onClick: () => get().acquire('slave') }] : []),
              { label: '🐌 ive waited 4 no 5000 years for this', note: 'Secret ending', className: 'btn-toxic', onClick: () => get().acquire('snail') },
            ],
          })
        }
        // Not One Cent is for honest games: no microtransactions and no cheats.
        if ((s.stats.purchases ?? 0) === 0 && !s.cheats) return get().acquire('secret')
        // Bought everything, lived on ads: the board has a counter-offer (the Corporate Slave ending).
        if (corporateSlaveReady(s)) {
          return s.showModal({
            tone: 'warn',
            sfx: 'printer',
            title: '👔 The board has a counter-offer',
            body: `You bought everything we sell and earned your living watching our ads. Instead of buying TRANSLATR™ for ${fmtMoney(price)}, the board offers you a job: Employee of the Month, forever. The ${fmtMoney(price)} becomes your onboarding fee.`,
            confirmLabel: 'Sign the contract',
            cancelLabel: 'Buy the company',
            onConfirm: () => get().acquire('slave'),
            onCancel: () => get().acquire('buy'),
          })
        }
        get().acquire('buy')
      },
      /** Pays for the company and plays how it went: bought, secretly bought, or hired. */
      acquire: (ending) => {
        const s = get()
        const price = getCompanyPrice(s)
        if (s.over || s.money < price) return
        set({ money: s.money - price })
        get().triggerEnding(ending)
      },

      // ================= DOOMSCROLL.EXE =================
      openShooter: () => set({ shooterOpen: true, arcade: null, trophiesOpen: false, endingsOpen: false, settingsOpen: false, unwrappedOpen: false }),
      /** Back to TRANSLATR™ (the clock restarts from now, so the pause costs nothing). */
      closeShooter: () => set({ shooterOpen: false, lastTickAt: Date.now() }),
      /** Adds to DOOMSCROLL's (and the Arcade's) stats: { shooterKills: 1 } and so on. */
      noteShooter: (counts) =>
        set((s) => ({ stats: { ...s.stats, ...Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, (s.stats[k] ?? 0) + n])) } })),
      // ================= The Arcade =================
      /**
       * Opens the TRANSLATR™ Phone on its home screen, or on one of its apps ('doom' | 'browser' |
       * 'mines' | 'shooter' | …). Without the phone (a microtransaction), the home screen is its
       * lock screen with a Buy button, and nothing else opens.
       */
      openArcade: (game = 'menu') => {
        const s = get()
        if (!s.premium?.smartphone) game = 'menu'
        if (game === 'shooter') return s.openShooter()
        const first = game !== 'menu' && !(s.stats.arcadePlayed ?? []).includes(game)
        set({
          arcade: game,
          trophiesOpen: false,
          endingsOpen: false,
          settingsOpen: false,
          unwrappedOpen: false,
          ...(first ? { stats: { ...s.stats, arcadePlayed: [...(s.stats.arcadePlayed ?? []), game] } } : {}),
        })
      },
      /**
       * Back to the menu from a game (or, with `all`, the whole sidebar closed). The clock restarts
       * from now, so the pause costs nothing.
       */
      closeArcade: (all = false) => set((s) => ({ arcade: !all && s.arcade && s.arcade !== 'menu' ? 'menu' : null, lastTickAt: Date.now() })),
      /** Arcade: charges `cost` from the wallet. False (and nothing charged) when you can't afford it. */
      arcadeCharge: (cost) => {
        const s = get()
        if (s.money < cost) return false
        set({ money: s.money - cost, stats: { ...s.stats, arcadeSpent: (s.stats.arcadeSpent ?? 0) + cost } })
        return true
      },
      /** Arcade: pays winnings into the wallet. */
      arcadePayout: (amount) =>
        set((s) => ({ money: s.money + amount, stats: { ...s.stats, arcadeEarned: (s.stats.arcadeEarned ?? 0) + amount } })),
      /** Raises stats to at least these values: { shooterLevel: 3 } (bests and progress). */
      noteBest: (values) =>
        set((s) => ({ stats: { ...s.stats, ...Object.fromEntries(Object.entries(values).map(([k, n]) => [k, Math.max(s.stats[k] ?? 0, n)])) } })),
      openShutdown: () => {
        const s = get()
        const open = DEFAULT_WINDOW_ORDER.filter((id) => isWindowAvailable(s, id) && !s.layout.minimized.includes(id))
        if (open.length) return s.toast('⏻ Windows are still open. They’d never let you shut down with windows open. (Minimize them?)', 'bad')
        set({ shutdownOpen: true })
      },
      closeShutdown: () => set({ shutdownOpen: false }),
      /** The true ending: only from the empty desktop (every window minimized). */
      deleteAccount: () => {
        const s = get()
        set({ shutdownOpen: false })
        if (DEFAULT_WINDOW_ORDER.some((id) => isWindowAvailable(s, id) && !s.layout.minimized.includes(id))) return
        s.triggerEnding('deleted')
      },

      // ================= Cheats =================
      /** Switches cheats on. The game is Modified from now until a new game (it can't be undone). */
      enableCheats: () => {
        const s = get()
        if (s.cheats) return
        set({ cheats: { at: Date.now(), used: 0, toggles: [], codes: [] } })
        s.toast('🏴 Cheats on. This game is Modified now. We’re not mad. We’re just disappointed.', 'info')
      },
      /** A one-off cheat (CHEAT_ACTIONS). */
      cheat: (id) => {
        const s = get()
        if (!s.cheats || s.over) return
        const patch = cheatPatch(s, id)
        if (typeof patch === 'string') return s.toast(`🏴 ${patch}`, 'bad')
        if (!patch) return
        set({ ...patch, cheats: { ...s.cheats, used: s.cheats.used + 1 } })
        const def = CHEAT_ACTIONS.find((a) => a.id === id)
        s.toast(`🏴 ${def.icon} ${def.label}. Nobody saw that.`, 'good')
      },
      /** An always-on cheat (CHEAT_TOGGLES), on or off. */
      toggleCheat: (id) => {
        const s = get()
        const def = CHEAT_TOGGLES.find((t) => t.id === id)
        if (!s.cheats || !def) return
        const on = !s.cheats.toggles.includes(id)
        set({
          cheats: { ...s.cheats, used: s.cheats.used + (on ? 1 : 0), toggles: on ? [...s.cheats.toggles, id] : s.cheats.toggles.filter((t) => t !== id) },
          // Infinite stamina starts full (it doesn't drain, so an empty bar would stay empty).
          ...(on && id === 'stamina' ? { stamina: getMaxStamina(s), staminaTs: Date.now() } : {}),
        })
        s.toast(`🏴 ${def.icon} ${def.label}: ${on ? 'on' : 'off'}`, on ? 'good' : 'info')
      },
      /** The code box. Returns { ok, msg } for the Control Panel to show. */
      enterCheatCode: (raw) => {
        const s = get()
        const code = normalizeCode(raw)
        const def = CHEAT_CODES[code]
        if (!def) return { ok: false, msg: '❌ Invalid code. Hints cost $4.99. (Kidding. The classics work.)' }
        if (def.joke) return { ok: true, msg: def.msg }
        if (!s.cheats || s.over) return { ok: false, msg: 'Switch cheats on first.' }
        const toggles = [...new Set([...s.cheats.toggles, ...(def.toggles ?? [])])]
        set({
          money: s.money + (def.money ?? 0),
          skillPoints: s.skillPoints + (def.skillPoints ?? 0),
          gems: s.gems + (def.gems ?? 0),
          ...(def.stamina ? { stamina: getMaxStamina(s), staminaTs: Date.now() } : {}),
          ...(def.cat ? { cat: { hunger: 100, fun: 100, love: 100 } } : {}),
          cheats: { ...s.cheats, used: s.cheats.used + 1, toggles, codes: s.cheats.codes.includes(code) ? s.cheats.codes : [...s.cheats.codes, code] },
        })
        s.toast(def.msg, 'good')
        return { ok: true, msg: def.msg }
      },

      // ================= Mail =================
      /** Delivers mail right away (event announcements). */
      deliverMail: (id, data) =>
        set((s) => ({
          mail: capMail([newMail(id, Date.now(), data), ...s.mail]),
          stats: { ...s.stats, emailsReceived: (s.stats.emailsReceived ?? 0) + 1 },
        })),
      /** "You've got mail" for a batch of new messages. */
      announceMail: (batch) => {
        const first = batch[0]
        const t = MAIL_BY_ID[first.id] ?? SPAM.find((m) => m.id === first.id)
        if (!t || (t.folder ?? (SPAM.includes(t) ? 'spam' : 'inbox')) === 'spam') return // spam arrives quietly
        const subject = typeof t.subject === 'function' ? t.subject(first.data ?? {}) : t.subject
        get().toast(`📧 ${t.from}: ${subject}${batch.length > 1 ? ` (+${batch.length - 1} more)` : ''}`, t.important ? 'bad' : 'info')
      },
      readMail: (key) =>
        set((s) => {
          const m = s.mail.find((x) => x.key === key)
          if (!m || m.read) return s
          return { mail: s.mail.map((x) => (x.key === key ? { ...x, read: true } : x)), stats: { ...s.stats, emailsRead: (s.stats.emailsRead ?? 0) + 1 } }
        }),
      markMailUnread: (key) => set((s) => ({ mail: s.mail.map((x) => (x.key === key ? { ...x, read: false } : x)) })),
      markAllMailRead: (keys) => {
        const want = new Set(keys)
        set((s) => {
          const fresh = s.mail.filter((m) => want.has(m.key) && !m.read).length
          if (!fresh) return s
          return {
            mail: s.mail.map((m) => (want.has(m.key) ? { ...m, read: true } : m)),
            stats: { ...s.stats, emailsRead: (s.stats.emailsRead ?? 0) + fresh },
          }
        })
      },
      deleteMail: (key) =>
        set((s) => ({
          mail: s.mail.map((x) => (x.key === key ? { ...x, folder: 'deleted', read: true } : x)),
          stats: { ...s.stats, emailsDeleted: (s.stats.emailsDeleted ?? 0) + 1 },
        })),
      /** The effects of a mail's buttons (focus/open are handled by the Inbox window itself). */
      mailAction: (key, action) => {
        const s = get()
        const m = s.mail.find((x) => x.key === key)
        if (!m || m.done) return
        const [kind, arg] = action.split(':')
        const done = (patch = {}) => set((st) => ({ ...patch, mail: st.mail.map((x) => (x.key === key ? { ...x, done: action } : x)) }))
        const queue = (id, delayMs, data) => (st) => [...st.mailQueue, { id, at: Date.now() + delayMs, ...(data ? { data } : {}) }]
        if (kind === 'checkout') return s.startCheckout(arg)
        if (kind === 'phish') {
          const fee = Math.min(s.money, Math.max(100, Math.floor(s.money * 0.1)))
          done({
            money: s.money - fee,
            mailQueue: m.id === 'prince' || m.id === 'prince_followup' ? queue('prince_followup', 45_000)(s) : s.mailQueue,
            stats: { ...s.stats, phished: (s.stats.phished ?? 0) + 1, phishLost: (s.stats.phishLost ?? 0) + fee },
          })
          return s.toast(`💸 Processing fee: ${fmtMoney(fee)}. Your prize will arrive in 7–10 business eternities.`, 'bad')
        }
        if (kind === 'virus') {
          done({ stats: { ...s.stats, virusOpened: (s.stats.virusOpened ?? 0) + 1 } })
          for (let i = 0; i < 3; i++) get().spawnAd('normal')
          return s.toast('🦠 The attachment was a virus. It installed 3 ads. You already had ads. Now you have more.', 'bad')
        }
        if (kind === 'unsubscribe') {
          done({
            mailQueue: [...queue('weekly_plus', 8_000)(s), { id: 'daily', at: Date.now() + 20_000 }],
            stats: { ...s.stats, unsubscribes: (s.stats.unsubscribes ?? 0) + 1 },
          })
          return s.toast('✉️ Unsubscribed! You will receive a confirmation newsletter shortly. And another.', 'info')
        }
        if (kind === 'reply') {
          done({ mailQueue: queue(arg, 25_000)(s), stats: { ...s.stats, emailsReplied: (s.stats.emailsReplied ?? 0) + 1 } })
          return s.toast('📨 Reply sent. Someone will pretend to read it.', 'info')
        }
        if (kind === 'chain') {
          done({
            cat: { ...s.cat, love: clampNeed(s.cat.love - 10) },
            stats: { ...s.stats, chainsBroken: (s.stats.chainsBroken ?? 0) + 1 },
          })
          return s.toast('📨 Forwarded to 0 friends (you have 0). The chain is broken. The cat has been notified. −10 love.', 'bad')
        }
      },
      hardReset: () => {
        set((s) => ({
          ...freshSave(),
          ads: [],
          audit: null,
          captcha: null,
          receipt: null,
          saveFilesLost: s.saveFilesLost + 1,
        }))
        get().showModal({
          tone: 'bad',
          sfx: 'none', // the shutdown jingle already played for the reset itself
          title: '💀 Save File Deleted',
          body: 'We said DO NOT CLOSE BEFORE 10 SECONDS. In capital letters. Money, items, prestige, skills, premium purchases — all gone. On the bright side, we closed your other ads.',
        })
      },

      // ================= Ads =================
      /** Natural spawn by default; debug can force the type, the DVD bounce and extras (e.g. { aim: 'corner' }). */
      spawnAd: (forceType, forceBounce, extra) => {
        const n = get().adsSeen + 1
        const ad = forceType ? makeAd(n, forceType, forceBounce ?? false, extra) : makeAd(n, adTypeFor(n))
        set((s) => ({ adsSeen: n, ads: [...s.ads, ad], stats: withFormatSeen(s.stats, ad) }))
      },
      closeAd: (id) =>
        set((s) => (s.ads.some((a) => a.id === id) ? { ads: s.ads.filter((a) => a.id !== id), stats: { ...s.stats, adsClosed: (s.stats.adsClosed ?? 0) + 1 } } : s)),
      noteAdDragged: () => set((s) => ({ stats: { ...s.stats, adsDragged: (s.stats.adsDragged ?? 0) + 1 } })),
      dvdCornerHit: () => {
        const s = get()
        const corners = (s.stats.dvdCorners ?? 0) + 1
        set({ stats: { ...s.stats, dvdCorners: corners } })
        s.toast(corners === 1 ? '📀 IT HIT THE CORNER. Nothing else will ever matter.' : `📀 CORNER HIT #${corners}. Productivity: gone.`, 'good')
      },
    }),
    {
      name: 'translatr-save',
      version: SAVE_VERSION,
      migrate: migrateSave,
      partialize: (s) => ({
        money: s.money,
        pickaxeLevel: s.pickaxeLevel,
        staminaLevel: s.staminaLevel,
        stamina: s.stamina,
        staminaTs: s.staminaTs,
        trash: s.trash,
        items: s.items,
        equipped: s.equipped,
        prestige: s.prestige,
        skillPoints: s.skillPoints,
        skills: s.skills,
        premium: s.premium,
        gems: s.gems,
        skinsOwned: s.skinsOwned,
        translatorSkin: s.translatorSkin,
        bot: s.bot,
        cat: s.cat,
        loan: s.loan,
        lockouts: s.lockouts,
        stats: s.stats,
        adsSeen: s.adsSeen,
        saveFilesLost: s.saveFilesLost,
        achievements: s.achievements,
        audio: s.audio,
        layout: s.layout,
        theme: s.theme,
        consent: s.consent,
        tutorialSeen: s.tutorialSeen,
        phantom: s.phantom,
        streak: s.streak,
        storeVisits: s.storeVisits,
        pity: s.pity,
        adRewardAt: s.adRewardAt,
        mode: s.mode,
        run: s.run,
        over: s.over,
        mail: s.mail,
        mailQueue: s.mailQueue,
        nextSpamAt: s.nextSpamAt,
        nextNewsAt: s.nextNewsAt,
        newsIssue: s.newsIssue,
        event: s.event,
        nextEventAt: s.nextEventAt,
        lastEventId: s.lastEventId,
        endings: s.endings,
        settings: s.settings,
        records: s.records,
        contracts: s.contracts,
        nextContractAt: s.nextContractAt,
        ratings: s.ratings,
        reviews: s.reviews,
        fluency: s.fluency,
        cheats: s.cheats,
        ngPlus: s.ngPlus,
        daily: s.daily,
        dailyDone: s.dailyDone,
        snailArrived: s.snailArrived,
        rogue: s.rogue,
        crypto: s.crypto,
        forge: s.forge,
        nas: s.nas,
        expansions: s.expansions,
        forgeThemes: s.forgeThemes,
        forgeTheme: s.forgeTheme,
        market: s.market,
        nasUi: s.nasUi,
      }),
      merge: (persisted, current) => {
        const merged = {
          ...current,
          ...persisted,
          stats: {
            ...current.stats,
            ...persisted?.stats,
            // Saves from before the collection existed: whatever you own counts as found.
            itemIds: [
              ...new Set([...(persisted?.stats?.itemIds ?? []), ...(persisted?.items ?? []).map((i) => i.itemId).filter((id) => EQUIPPABLES[id])]),
            ],
          },
          audio: { ...current.audio, ...persisted?.audio }, // older saves lack the per-channel volumes
          theme: THEME_IDS.includes(persisted?.theme) ? persisted.theme : current.theme,
          phantom: { ...current.phantom, ...persisted?.phantom },
          streak: { ...current.streak, ...persisted?.streak },
          fluency: { ...current.fluency, ...persisted?.fluency },
          settings: { ...current.settings, ...persisted?.settings },
          records: { ...current.records, ...persisted?.records },
          run: { ...current.run, ...persisted?.run },
          mail: Array.isArray(persisted?.mail) ? persisted.mail : current.mail,
          mailQueue: Array.isArray(persisted?.mailQueue) ? persisted.mailQueue : current.mailQueue,
          layout: {
            doom: { ...current.layout.doom, ...persisted?.layout?.doom },
            cat: { ...current.layout.cat, ...persisted?.layout?.cat },
            windows: normalizeWindowOrder(persisted?.layout?.windows),
            minimized: normalizeMinimized(persisted?.layout?.minimized),
          },
        }
        // Very old saves predate skills: grant points for prestiges already earned.
        if (persisted && persisted.skillPoints === undefined) {
          merged.skillPoints = skillPointsFromPrestiges(persisted.prestige ?? 0)
          merged.skills = {}
        }
        return merged
      },
    },
  ),
)
