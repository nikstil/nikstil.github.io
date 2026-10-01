// Run modifiers: the curses New Game+ stacks on (one more per NG+ level) and the pieces a Daily
// Challenge is built from. They use the same keys as event mods (src/data/events.js) and are
// combined with them by activeMods() in src/lib/economy.js. Numbers multiply; flags switch on.
//   priceMult    every in-game price (upgrades, boxes, translations, cat food, the bot)
//   adRate       ads arrive this many times as often      catDecay   the cat's needs drain faster
//   auditChance  audits this many times as likely          loanInterest  QuickCash™ interest ×
//   companyPrice TRANSLATR™ costs this many times more     noRewardedAds rewarded ads are gone
//   + every event mod (mining, casino, captcha, boxPrice, relic, noAudits, noVowelTax, …)

/** Numbers multiply, flags OR. */
export function combineMods(...list) {
  const out = {}
  for (const mods of list) {
    if (!mods) continue
    for (const [k, v] of Object.entries(mods)) out[k] = typeof v === 'number' ? (out[k] ?? 1) * v : out[k] || v
  }
  return out
}

// ---- New Game+ ----
// NG+ n applies the first n curses. In return you keep your whole Ascension Tree.
export const NG_CURSES = [
  { level: 1, id: 'inflation', icon: '💸', name: 'Inflation', desc: 'Every in-game price is doubled.', mods: { priceMult: 2 } },
  { level: 2, id: 'ad_hell', icon: '📺', name: 'Ad Hell', desc: 'Ads arrive twice as often.', mods: { adRate: 2 } },
  { level: 3, id: 'feral_cat', icon: '😾', name: 'Feral Cat', desc: 'Your cat’s needs drain twice as fast.', mods: { catDecay: 2 } },
  { level: 4, id: 'audit_season', icon: '⚖️', name: 'Audit Season', desc: 'Audits are twice as likely. Loan interest doubles.', mods: { auditChance: 2, loanInterest: 2 } },
  { level: 5, id: 'hostile_board', icon: '🏢', name: 'Hostile Board', desc: 'TRANSLATR™ now costs 10 quintillion.', mods: { companyPrice: 10 } },
]
export const cursesFor = (level) => NG_CURSES.filter((c) => c.level <= level)
export const ngPlusMods = (level) => (level > 0 ? combineMods(...cursesFor(level).map((c) => c.mods)) : null)
