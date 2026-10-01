// Limited-time events. Fully random: one at a time, each lasts EVENT_MS, and at least
// EVENT_GAP_MS[0] passes between the end of one and the start of the next.
// `mods` are read by the economy selectors (src/lib/economy.js) and the game loop.

export const EVENT_MS = 3 * 60_000
export const EVENT_GAP_MS = [10 * 60_000, 18 * 60_000] // random gap between events
export const FIRST_EVENT_MS = [4 * 60_000, 9 * 60_000] // the first one, after the game starts

export const EVENTS = [
  {
    id: 'spooky',
    icon: '🎃',
    name: 'Spooky Season',
    color: '#ff7a1a',
    blurb: 'Trick or Tax: every swing might be a trick (−5% of your wallet) or a treat (×13).',
    mods: { trickOrTax: true },
  },
  {
    id: 'black_friday',
    icon: '🛍️',
    name: 'Black Friday',
    color: '#111111',
    blurb: 'Loot boxes 50% OFF!* (*after a 200% price increase. Net: +50%.)',
    mods: { boxPrice: 1.5, fakeSale: true },
  },
  {
    id: 'double_money',
    icon: '💸',
    name: 'Double Money Hour',
    color: '#2c9a1e',
    blurb: 'Mining pays ×2 for the next 3 minutes. The "hour" is a marketing hour. Ads also arrive twice as often.',
    mods: { mining: 2, adRate: 2 },
  },
  {
    id: 'casino_night',
    icon: '🎰',
    name: 'Casino Night',
    color: '#c42e86',
    blurb: 'Every casino win pays ×2. CAPTCHAs are twice as likely. The house is nervous.',
    mods: { casino: 2, captcha: 2 },
  },
  {
    id: 'cat_day',
    icon: '🐈',
    name: 'Cat Appreciation Day',
    color: '#e0a21a',
    blurb: 'Cat food is free! Your cat’s needs drain 3× faster, to celebrate.',
    mods: { catDecay: 3, freeFood: true },
  },
  {
    id: 'market_crash',
    icon: '📉',
    name: 'Market Crash',
    color: '#d32f2f',
    blurb: 'Loot boxes −70% and relics 3× likelier. A genuine deal. Something must be wrong.',
    mods: { boxPrice: 0.3, relic: 3 },
  },
  {
    id: 'maintenance',
    icon: '🔧',
    name: 'Server Maintenance',
    color: '#6b7a8c',
    blurb: 'The translator is down. So is the ad server. Enjoy three minutes of silence.',
    mods: { noAds: true, translatorDown: true },
  },
  {
    id: 'tax_holiday',
    icon: '🏖️',
    name: 'Tax Holiday',
    color: '#1a9ac4',
    blurb: 'No audits and no Vowel Tax. The Dev IRS is at the beach.',
    mods: { noAudits: true, noVowelTax: true },
  },
  {
    id: 'ai_hype',
    icon: '🤖',
    name: 'AI Hype Week',
    color: '#7a4bd6',
    blurb: 'The translator is now “AI-powered”: 5× the price, never refuses, still wrong.',
    mods: { translatePrice: 5, noRefusal: true },
  },
]

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]))

/** A random event, never the same as the last one. */
export function pickEvent(lastId, rand = Math.random) {
  const pool = EVENTS.filter((e) => e.id !== lastId)
  return pool[Math.floor(rand() * pool.length)]
}

export const randBetween = ([a, b], rand = Math.random) => a + rand() * (b - a)
