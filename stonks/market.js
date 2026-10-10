// NASDANK: the stock market of the cast. Prices are worked out from the time (the same for
// everyone at the same moment, like a real market), with a few local twists: KEVN trades on your
// own Kevin-gotchi's morale (insider information), and things that happen elsewhere nudge prices
// (a cast member beating you in a SKINSINK.GG case battle pumps their stock for a few hours).

const DAY = 86400000
export const TICKERS = [
  { id: 'KEVN', name: 'Kevin (Sales) Holdings', who: 'Kevin (Sales)', icon: '📈', base: 42, vol: 0.07, trend: 0.25 },
  { id: 'BRND', name: 'Brenda HR Compliance', who: 'Brenda (HR)', icon: '🗂️', base: 87, vol: 0.025, trend: 0.12 },
  { id: 'WOOF', name: 'The CEO Dog Inc.', who: 'The CEO Dog', icon: '🐕', base: 4.2, vol: 0.16, trend: 0.5, meme: true },
  { id: 'ALGO', name: 'TheAlgorithm Corp', who: 'TheAlgorithm', icon: '🤖', base: 310, vol: 0.13, trend: 0.4 },
  { id: 'EGL', name: 'Motivational Eagle Group', who: 'Motivational Eagle', icon: '🦅', base: 64, vol: 0.045, trend: 0.2 },
  { id: 'XLS', name: 'Lil Spreadsheet Partners', who: 'Lil Spreadsheet', icon: '📊', base: 19, vol: 0.06, trend: 0.2 },
  { id: 'SNAIL', name: 'Patient Snail Capital', who: 'Patient Snail', icon: '🐌', base: 1.05, vol: 0.004, trend: 0, slow: true },
  { id: 'CAPT', name: 'Captain Captcha Security', who: 'Captain Captcha', icon: '🧩', base: 23, vol: 0.08, trend: 0.3 },
  { id: 'TRNS', name: 'TRANSLATR™ Ultra+ Pro Max', who: 'The Founder & CEO', icon: '🌐', base: 999, vol: 0.1, trend: 0.35 },
]
export const byId = Object.fromEntries(TICKERS.map((t) => [t.id, t]))
/** Who in the casino is which stock. */
export const TICKER_OF = Object.fromEntries(TICKERS.map((t) => [t.who, t.id]))

// ---------------- Smooth, repeatable randomness
function hash(i, salt) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(salt | 0, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function noise(t, scale, salt) {
  const x = t / scale
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  return (hash(i, salt) * (1 - u) + hash(i + 1, salt) * u) * 2 - 1
}
const saltOf = (id) => [...id].reduce((s, c) => s * 31 + c.charCodeAt(0), 17)

/** The market price (before your local twists) at time t (ms). */
export function marketPrice(id, t = Date.now()) {
  const k = byId[id]
  const s = saltOf(id)
  if (k.slow) return k.base * Math.exp(((t - Date.UTC(2026, 0, 1)) / DAY) * 0.0006 + k.vol * noise(t, 3600000, s))
  let lp = Math.log(k.base)
  lp += k.trend * noise(t, 21 * DAY, s + 1) // the long run
  lp += k.vol * (1.2 * noise(t, 0.5 * DAY, s + 2) + 0.7 * noise(t, 2 * 3600000, s + 3) + 0.4 * noise(t, 20 * 60000, s + 4) + 0.15 * noise(t, 2 * 60000, s + 5))
  if (k.meme) {
    const pump = noise(t, 3 * 3600000, s + 6)
    if (pump > 0.6) lp += (pump - 0.6) * 2.2 // to the moon (briefly)
  }
  return Math.exp(lp)
}

// ---------------- The local twists
const NUDGES = 'nasdank-nudges'
function nudges() {
  try {
    return JSON.parse(localStorage.getItem(NUDGES)) ?? []
  } catch {
    return []
  }
}
/** Something happened: moves a stock by pct (0.05 = +5%) for the next few hours. */
export function nudge(id, pct, why = '') {
  if (!byId[id]) return
  const list = nudges().filter((n) => Date.now() - n.at < 6 * 3600000)
  list.push({ id, pct, why, at: Date.now() })
  try {
    localStorage.setItem(NUDGES, JSON.stringify(list.slice(-30)))
  } catch {}
}
export const recentNudges = () => nudges().filter((n) => Date.now() - n.at < 6 * 3600000)
function kevinFactor() {
  try {
    const k = JSON.parse(localStorage.getItem('kevin-gotchi'))
    if (!k) return 1
    if (k.quit) return 0.55
    return 0.75 + 0.5 * (k.morale / 100) + (k.ceo ? 0.4 : 0)
  } catch {
    return 1
  }
}
/** The price you see: the market's, with your local twists. */
export function price(id, t = Date.now()) {
  let p = marketPrice(id, t)
  if (id === 'KEVN') p *= kevinFactor()
  for (const n of nudges()) {
    if (n.id !== id || n.at > t) continue
    const left = 1 - (t - n.at) / (6 * 3600000)
    if (left > 0) p *= 1 + n.pct * left
  }
  return p
}
/** Prices over a window (for charts): n points ending now. */
export function series(id, span, n = 60, end = Date.now()) {
  return Array.from({ length: n }, (_, i) => price(id, end - span + (span * i) / (n - 1)))
}
export const change = (id, span) => {
  const a = price(id, Date.now() - span)
  return (price(id) - a) / a
}

// ---------------- Headlines
const WHY_UP = {
  KEVN: ['Kevin closes a deal (with himself)', 'Kevin learns pivot tables', 'Kevin replies-all with good news for once'],
  BRND: ['a strongly worded email', 'the new compliance training (mandatory)'],
  WOOF: ['the CEO Dog fetches a stick', 'a viral video of the CEO Dog sneezing', 'nobody knows why'],
  ALGO: ['TheAlgorithm rewrites itself', 'engagement is up (yours)', 'it learned a new trick'],
  EGL: ['a new poster: “SOAR”', 'the eagle is very motivated today'],
  XLS: ['a merged cell that finally worked', 'a VLOOKUP that came back'],
  SNAIL: ['slow and steady', 'patience'],
  CAPT: ['a captcha with nine traffic lights', 'proving you’re not a robot (it is)'],
  TRNS: ['a new subscription tier', 'TRANSLATR™ now translates silence'],
}
const WHY_DOWN = {
  KEVN: ['Kevin replies-all', 'Kevin is “circling back” again', 'Kevin forgot the meeting'],
  BRND: ['an investigation into the investigation', 'HR is in a meeting'],
  WOOF: ['the CEO Dog naps through earnings', 'a squirrel'],
  ALGO: ['users touched grass', 'a bug in the bug'],
  EGL: ['the eagle needs a day off'],
  XLS: ['a circular reference', '#REF!'],
  SNAIL: ['a bit of salt'],
  CAPT: ['a robot passed the captcha'],
  TRNS: ['the free trial ended (for everyone)', 'the Founder’s yacht tax'],
}
export function headlines() {
  const out = []
  for (const k of TICKERS) {
    const c = change(k.id, 3600000)
    if (Math.abs(c) < 0.015) continue
    const why = (c > 0 ? WHY_UP : WHY_DOWN)[k.id]
    const pick = why[Math.floor(Date.now() / 600000 + k.id.length) % why.length]
    out.push({ id: k.id, c, text: `${k.id} ${c > 0 ? 'soars' : 'slides'} ${(Math.abs(c) * 100).toFixed(1)}% after ${pick}` })
  }
  for (const n of recentNudges()) out.push({ id: n.id, c: n.pct, text: `${n.id} ${n.pct > 0 ? 'jumps' : 'drops'} on news: ${n.why}` })
  return out.sort((a, b) => Math.abs(b.c) - Math.abs(a.c))
}
