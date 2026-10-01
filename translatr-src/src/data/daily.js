// The Daily Challenge: one goal and two modifiers, picked from the date, the same for everyone.
// Luck is seeded too: loot boxes, roulette spins, slot pulls, events and contracts come from
// per-stream sequences (seed, stream, counter), so the 1,234th box you open today is the same
// 1,234th box everyone opens today.

const EPOCH = Date.UTC(2026, 0, 1)

/** Local calendar day as 'YYYY-MM-DD'. */
export function dayKey(t = Date.now()) {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fnv(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
/** The n-th value of a seeded stream, in [0, 1). */
export const seededValue = (seed, stream, n) => mulberry32(fnv(`${seed}:${stream}:${n}`))()

const peak = (s) => Math.max(s.money, s.stats.peakMoney ?? 0)
export const DAILY_GOALS = [
  { id: 'money_10m', icon: '💰', label: 'Reach $10M', check: (s) => peak(s) >= 1e7 },
  { id: 'money_50m', icon: '💰', label: 'Reach $50M', check: (s) => peak(s) >= 5e7 },
  { id: 'contracts_3', icon: '📝', label: 'Deliver 3 translation contracts', check: (s) => (s.stats.contractsDone ?? 0) >= 3 },
  { id: 'boxes_500', icon: '🎁', label: 'Open 500 Mystery Boxes', check: (s) => (s.stats.boxesOpened ?? 0) >= 500 },
  { id: 'casino_1m', icon: '🎰', label: 'Win $1M at the casino', check: (s) => (s.stats.casinoWon ?? 0) >= 1e6 },
  { id: 'swings_300', icon: '⛏️', label: 'Swing the pickaxe 300 times', check: (s) => (s.stats.clicks ?? 0) >= 300 },
]
export const DAILY_MODS = [
  { id: 'casino_night', icon: '🎰', label: 'Casino Night all run', mods: { casino: 2, captcha: 2 } },
  { id: 'market_crash', icon: '📉', label: 'Market Crash all run', mods: { boxPrice: 0.3, relic: 3 } },
  { id: 'double_money', icon: '💸', label: 'Double Money all run', mods: { mining: 2, adRate: 2 } },
  { id: 'tax_holiday', icon: '🏖️', label: 'Tax Holiday all run', mods: { noAudits: true, noVowelTax: true } },
  { id: 'feral_cat', icon: '😾', label: 'Feral Cat', mods: { catDecay: 2 } },
  { id: 'inflation', icon: '📈', label: 'Inflation: prices ×2', mods: { priceMult: 2 } },
  { id: 'ad_hell', icon: '📺', label: 'Ad Hell', mods: { adRate: 2 } },
  { id: 'no_rewarded', icon: '🚫', label: 'No rewarded ads', mods: { noRewardedAds: true } },
  { id: 'head_start', icon: '🎓', label: 'Head start: 5 skill points', start: { skillPoints: 5 } },
  { id: 'rich_uncle', icon: '🤑', label: 'Rich uncle: start with $25K', start: { money: 25_000 } },
]
export const DAILY_GOAL_BY_ID = Object.fromEntries(DAILY_GOALS.map((g) => [g.id, g]))
export const DAILY_MOD_BY_ID = Object.fromEntries(DAILY_MODS.map((m) => [m.id, m]))

/** Today's challenge (or any day's): number, seed, goal and two modifiers. */
export function dailyFor(day = dayKey()) {
  const seed = fnv(`translatr-daily:${day}`)
  const rand = mulberry32(seed)
  const goal = DAILY_GOALS[Math.floor(rand() * DAILY_GOALS.length)]
  const pool = [...DAILY_MODS]
  const mods = []
  while (mods.length < 2) mods.push(pool.splice(Math.floor(rand() * pool.length), 1)[0].id)
  const [y, m, d] = day.split('-').map(Number)
  const number = Math.floor((Date.UTC(y, m - 1, d) - EPOCH) / 86_400_000) + 1
  return { day, number, seed, goal: goal.id, mods }
}

/** The modifiers' combined effect, and what the run starts with. */
export const dailyMods = (ids) => (ids?.length ? ids.map((id) => DAILY_MOD_BY_ID[id]?.mods).filter(Boolean) : [])
export const dailyStart = (ids) => Object.assign({}, ...(ids ?? []).map((id) => DAILY_MOD_BY_ID[id]?.start ?? {}))
