// Ranks: a rating (Elo) that ranked matches move up and down, shown as the 18 classic skill groups
// from Silver I to Global Elite. Beating harder bots is worth more. Signed in to nikstil.com, the
// server keeps the rating instead (supabase/schema.sql: strife_finish works it out the same way)
// and puts you on the online leaderboard.

export const RANKS = [
  'Silver I', 'Silver II', 'Silver III', 'Silver IV', 'Silver Elite', 'Silver Elite Master',
  'Gold Nova I', 'Gold Nova II', 'Gold Nova III', 'Gold Nova Master',
  'Master Guardian I', 'Master Guardian II', 'Master Guardian Elite', 'Distinguished Master Guardian',
  'Legendary Eagle', 'Legendary Eagle Master', 'Supreme Master First Class', 'The Global Elite',
]
/** The rating each skill group starts at. */
export const RANK_AT = [0, 750, 850, 950, 1050, 1150, 1250, 1350, 1450, 1550, 1650, 1750, 1850, 1950, 2050, 2150, 2250, 2350]
/** How good each bot difficulty counts as (Easy, Normal, Hard, Expert). */
export const BOT_RATING = [800, 1200, 1600, 2000]
export const START_RATING = 1000
export const PLACEMENT = 3 // matches before you're shown a rank
export const RANKED_MODES = ['competitive', 'wingman']

export const tierOf = (rating) => {
  let t = 0
  while (t + 1 < RANK_AT.length && rating >= RANK_AT[t + 1]) t++
  return t
}
export const rankName = (tier) => RANKS[Math.max(0, Math.min(RANKS.length - 1, tier))]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/**
 * How much a match moves your rating. (The server's strife_finish does exactly this sum.)
 * m: { won, difficulty, roundsToWin, rounds, kills, deaths }; matches: ranked matches played before.
 */
export function ratingChange(rating, matches, m) {
  const opp = BOT_RATING[clamp(m.difficulty | 0, 0, 3)]
  const k = (matches < PLACEMENT ? 48 : 32) * clamp((m.roundsToWin | 0) / 9, 0.5, 1)
  const expected = 1 / (1 + Math.pow(10, (opp - rating) / 400))
  const perf = clamp(((m.kills | 0) - (m.deaths | 0)) / Math.max(1, m.rounds | 0), -1, 1) * 4
  const d = Math.round(k * ((m.won ? 1 : 0) - expected) + perf)
  return m.won ? Math.max(d, 3) : Math.min(d, -3)
}

// ---------------- Your rank on this device
const KEY = 'strife-rank'
const ONLINE_KEY = 'strife-rank-online'
const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k))
  } catch {
    return null
  }
}
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {}
}
export function loadRank() {
  const r = read(KEY) ?? {}
  return { rating: START_RATING, matches: 0, wins: 0, losses: 0, best: 0, history: [], ...r }
}
/** A ranked match on this device: returns { before, after, delta, tierBefore, tierAfter, placed }. */
export function recordMatch(m) {
  const r = loadRank()
  const before = r.rating
  const delta = ratingChange(before, r.matches, m)
  r.rating = clamp(before + delta, 0, 4000)
  r.matches++
  m.won ? r.wins++ : r.losses++
  if (r.matches >= PLACEMENT) r.best = Math.max(r.best, tierOf(r.rating))
  r.history = [{ at: Date.now(), delta, rating: r.rating, won: !!m.won, map: m.map, mode: m.mode }, ...r.history].slice(0, 20)
  write(KEY, r)
  return { before, after: r.rating, delta, tierBefore: tierOf(before), tierAfter: tierOf(r.rating), placed: r.matches >= PLACEMENT, justPlaced: r.matches === PLACEMENT, matches: r.matches }
}
/** The rating the server last gave this account (signed in), cached for the menu. */
export const onlineRank = () => read(ONLINE_KEY)
export const setOnlineRank = (v) => write(ONLINE_KEY, v ? { ...v, at: Date.now() } : null)
/** The rank to show: the online one when signed in (and known), else this device's. */
export function shownRank(signedIn) {
  const o = signedIn ? onlineRank() : null
  if (o && o.rating != null) return { rating: o.rating, matches: o.matches ?? 0, wins: o.wins ?? 0, losses: o.losses ?? 0, online: true, user: o.user }
  const r = loadRank()
  return { rating: r.rating, matches: r.matches, wins: r.wins, losses: r.losses, best: r.best, online: false }
}
/** What a bot's rank looks like on the scoreboard (from its difficulty, a little different each). */
export const botTier = (difficulty, id) => tierOf(BOT_RATING[clamp(difficulty | 0, 0, 3)] + ((id * 97) % 300) - 150)

// ---------------- The emblems
const GROUPS = [
  // [first tier, gradient from, to, ink]
  [0, '#e8edf2', '#8e9aa6', '#2c3540'],
  [6, '#ffe7a0', '#c08a26', '#4a2f08'],
  [10, '#cfe0f0', '#5f7d9c', '#16263a'],
  [14, '#f3dcc0', '#9a6a3a', '#3b230c'],
  [16, '#e4d8ff', '#6f58b8', '#1d1240'],
  [17, '#bfe6ff', '#2a71c4', '#071d3a'],
]
const star = (cx, cy, r) => {
  let d = ''
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5
    const rr = k % 2 ? r * 0.45 : r
    d += (k ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1)
  }
  return `<path d="${d}Z"/>`
}
const chevron = (x, y) => `<path d="M${x - 5} ${y + 3}L${x} ${y - 2}L${x + 5} ${y + 3}" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`
const wings = (cx, cy) => `<path d="M${cx - 3} ${cy}C${cx - 10} ${cy - 8} ${cx - 20} ${cy - 6} ${cx - 25} ${cy - 2}C${cx - 19} ${cy - 1} ${cx - 14} ${cy + 1} ${cx - 12} ${cy + 4}C${cx - 9} ${cy + 3} ${cx - 5} ${cy + 3} ${cx - 3} ${cy + 1}ZM${cx + 3} ${cy}C${cx + 10} ${cy - 8} ${cx + 20} ${cy - 6} ${cx + 25} ${cy - 2}C${cx + 19} ${cy - 1} ${cx + 14} ${cy + 1} ${cx + 12} ${cy + 4}C${cx + 9} ${cy + 3} ${cx + 5} ${cy + 3} ${cx + 3} ${cy + 1}Z"/>`
const wreath = (cx, cy) => `<path d="M${cx - 9} ${cy - 7}C${cx - 15} ${cy - 1} ${cx - 12} ${cy + 7} ${cx - 3} ${cy + 9}M${cx + 9} ${cy - 7}C${cx + 15} ${cy - 1} ${cx + 12} ${cy + 7} ${cx + 3} ${cy + 9}" fill="none" stroke-width="2.4" stroke-linecap="round"/>`
const rifles = (cx, cy) => `<path d="M${cx - 9} ${cy + 6}L${cx + 8} ${cy - 7}M${cx + 9} ${cy + 6}L${cx - 8} ${cy - 7}" fill="none" stroke-width="2.6" stroke-linecap="round"/>`
const globe = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-width="2"/><ellipse cx="${cx}" cy="${cy}" rx="${r * 0.45}" ry="${r}" fill="none" stroke-width="1.5"/><path d="M${cx - r} ${cy}H${cx + r}M${cx - r * 0.85} ${cy - r * 0.5}H${cx + r * 0.85}M${cx - r * 0.85} ${cy + r * 0.5}H${cx + r * 0.85}" fill="none" stroke-width="1.3"/>`

let badgeSeq = 0
/** An emblem as an SVG string (64×32). tier null: unranked. */
export function rankBadge(tier, { title = true } = {}) {
  if (tier == null) {
    return `<svg class="rank-badge unranked" viewBox="0 0 64 32" width="64" height="32" role="img" aria-label="Unranked">${title ? '<title>Unranked</title>' : ''}<rect x="1" y="1" width="62" height="30" rx="5" fill="#2a3038" stroke="#6b7682" stroke-dasharray="3 2"/><text x="32" y="21" text-anchor="middle" font-size="14" font-weight="700" fill="#9aa6b2" font-family="system-ui,sans-serif">?</text></svg>`
  }
  const t = Math.max(0, Math.min(17, tier))
  const g = [...GROUPS].reverse().find((x) => t >= x[0])
  const [, c1, c2, ink] = g
  // (every emblem its own gradient id: one in a hidden menu would blank the others in Chrome)
  const id = 'rb' + t + '-' + ++badgeSeq
  let art = ''
  const cx = 32
  const cy = 16
  if (t <= 5) {
    // Silver: chevrons (and stars for the elites)
    const n = Math.min(4, t + 1)
    for (let k = 0; k < n; k++) art += chevron(cx - (n - 1) * 6 + k * 12, cy)
    if (t === 4) art += star(cx, cy - 9, 3.5)
    if (t === 5) art += star(cx - 6, cy - 9, 3.5) + star(cx + 6, cy - 9, 3.5)
  } else if (t <= 9) {
    // Gold Nova: stars
    const n = t - 5
    for (let k = 0; k < n; k++) art += star(cx - (n - 1) * 7 + k * 14, cy + (n === 4 && (k === 0 || k === 3) ? 2 : 0), 6)
  } else if (t <= 13) {
    // Master Guardians: crossed rifles, a wreath
    art += rifles(cx, cy)
    if (t === 10) art += star(cx + 18, cy, 4.5)
    if (t === 11) art += star(cx - 18, cy, 4.5) + star(cx + 18, cy, 4.5)
    if (t >= 12) art += wreath(cx, cy)
    if (t === 13) art += star(cx - 21, cy, 4) + star(cx + 21, cy, 4)
  } else if (t <= 15) {
    // Eagles
    art += wings(cx, cy) + `<circle cx="${cx}" cy="${cy - 1}" r="3.4"/>`
    if (t === 15) art += star(cx, cy - 9, 3.5)
  } else if (t === 16) {
    art += wings(cx, cy + 1) + star(cx, cy, 7)
  } else {
    art += wings(cx, cy + 1) + globe(cx, cy, 9)
  }
  const name = rankName(t)
  return `<svg class="rank-badge" viewBox="0 0 64 32" width="64" height="32" role="img" aria-label="${name}">${title ? `<title>${name}</title>` : ''}<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect x="1" y="1" width="62" height="30" rx="5" fill="url(#${id})" stroke="${ink}" stroke-opacity="0.55"/><rect x="3" y="3" width="58" height="12" rx="4" fill="#fff" opacity="0.18"/><g fill="${ink}" stroke="${ink}">${art}</g></svg>`
}
