// TRANSLATR™ Unwrapped: 75 stats about the time, money and dignity spent here, in slides.
// value(s) reads the store; fmt picks the display; note(v, s) is the snarky caption (optional).

import { ENDINGS, FLUENCY_TO_WIN } from './endings'
import { ACHIEVEMENTS } from './achievements'
import { fmtRunTime } from './endings'
import { fmt, money } from '../lib/format'
import { EQUIPPABLE_COUNT } from './gameData'

const st = (key) => (s) => s.stats[key] ?? 0
const hours = (sec) => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m ${Math.floor(sec % 60)}s`
}

export const FORMATS = {
  num: (v) => fmt(v),
  money: (v) => money(v),
  time: (v) => hours(v),
  cents: (v) => `$${(v / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  pct: (v) => `${Math.round(v * 100)}%`,
  rank: (v) => `#${Math.round(v).toLocaleString()}`,
  text: (v) => v,
}

export const UNWRAPPED = [
  {
    id: 'time',
    title: 'Your time',
    icon: '⏱️',
    colors: ['#1d4ed8', '#7c3aed'],
    stats: [
      { label: 'Time played', value: st('playSeconds'), fmt: 'time', note: (v) => (v > 3600 ? 'That’s a whole film. A bad one, with ads.' : 'Could have been a nap. A good one.') },
      { label: 'Time spent AFK', value: st('afkSeconds'), fmt: 'time', note: () => 'Your income paused. Your debts did not.' },
      { label: 'Times you went AFK', value: st('afkTimes'), fmt: 'num' },
      { label: 'Longest login streak', value: (s) => s.streak?.best ?? 0, fmt: 'num', note: (v) => (v ? 'days in a row. Habit formed.' : 'Commitment issues. Healthy ones.') },
      { label: 'Time on DoomFeed™', value: st('doomSeconds'), fmt: 'time' },
      { label: 'Time to your first million', value: (s) => s.run?.splits?.m1 ?? null, fmt: 'text', show: (v) => (v == null ? 'not yet' : fmtRunTime(v, false)) },
    ],
  },
  {
    id: 'income',
    title: 'Money in',
    icon: '💰',
    colors: ['#b45309', '#eab308'],
    stats: [
      { label: 'Peak wallet', value: (s) => Math.max(s.money, s.stats.peakMoney ?? 0), fmt: 'money', note: () => 'You had it all. Briefly.' },
      { label: 'Money mined', value: st('moneyMined'), fmt: 'money' },
      { label: 'Casino winnings', value: st('casinoWon'), fmt: 'money', note: () => 'The house would like a word.' },
      { label: 'Paid to watch ads', value: st('adRewardMoney'), fmt: 'money', note: (v, s) => `across ${fmt(s.stats.adRewards ?? 0)} rewarded ads` },
      { label: 'Collected from your bot', value: st('botCollected'), fmt: 'money' },
      { label: 'Borrowed from Vinnie', value: st('borrowed'), fmt: 'money', note: (v) => (v ? 'Vinnie remembers.' : 'Vinnie is hurt you never called.') },
    ],
  },
  {
    id: 'outcome',
    title: 'Money out',
    icon: '💸',
    colors: ['#991b1b', '#ea580c'],
    stats: [
      { label: 'Lost to the cat', value: st('lostToCat'), fmt: 'money', note: () => 'He has no regrets. He has your money.' },
      { label: 'Taken by the Dev IRS', value: st('auditTaken'), fmt: 'money', note: (v, s) => `across ${fmt(s.stats.audited ?? 0)} audits` },
      { label: 'Seized by the Repo Man', value: st('repoTaken'), fmt: 'money' },
      { label: 'Spent on loot boxes', value: st('boxSpend'), fmt: 'money' },
      { label: 'Spent on translations', value: st('translationSpend'), fmt: 'money' },
      { label: 'Vowel Tax paid', value: st('taxPaid'), fmt: 'money', note: () => 'A, E, I, O and U thank you.' },
      { label: 'Spent on cat food', value: st('catFoodSpent'), fmt: 'money' },
      { label: 'Lost to princes and “prizes”', value: st('phishLost'), fmt: 'money' },
    ],
  },
  {
    id: 'mine',
    title: 'The Mine',
    icon: '⛏️',
    colors: ['#78350f', '#a16207'],
    stats: [
      { label: 'Swings by hand', value: st('clicks'), fmt: 'num', note: (v) => (v > 1000 ? 'Your wrist has filed a complaint.' : 'Your wrist thanks you.') },
      { label: 'Swings by robot', value: st('autoSwings'), fmt: 'num', note: () => 'It replaced you. You let it.' },
      { label: 'Times you ran out of stamina', value: st('exhaustions'), fmt: 'num' },
      { label: 'Pickaxe level', value: (s) => s.pickaxeLevel, fmt: 'num' },
      { label: 'Upgrades bought', value: st('upgradesBought'), fmt: 'num' },
      { label: 'Prestiges', value: (s) => s.prestige, fmt: 'num', note: () => 'Everything you owned, deleted, for a bigger number.' },
    ],
  },
  {
    id: 'translator',
    title: 'The Translator',
    icon: '🌐',
    colors: ['#0369a1', '#0891b2'],
    stats: [
      { label: 'Translation requests', value: st('translateAttempts'), fmt: 'num' },
      { label: 'Words translated', value: st('wordsTranslated'), fmt: 'num', note: () => 'Most of them wrong. All of them billed.' },
      { label: 'Times refused (and billed)', value: st('translationsRefused'), fmt: 'num' },
      { label: 'Refusal rate', value: (s) => (s.stats.translateAttempts ? (s.stats.translationsRefused ?? 0) / s.stats.translateAttempts : 0), fmt: 'pct' },
      { label: 'Contracts delivered', value: st('contractsDone'), fmt: 'num' },
      { label: 'Five-star reviews', value: st('contractsPerfect'), fmt: 'num', note: () => 'Suspiciously many.' },
      { label: 'One-star reviews', value: (s) => (s.stats.contractsBotched ?? 0) + (s.stats.contractsLate ?? 0), fmt: 'num', note: (v, s) => `${fmt(s.stats.contractsLate ?? 0)} for never showing up` },
      { label: 'Earned from contracts', value: st('contractEarnings'), fmt: 'money' },
      { label: 'Translated it yourself', value: st('selfCorrect'), fmt: 'num', note: () => 'For free. Legal is looking into it.' },
      { label: 'Best fluency streak', value: st('fluencyBest'), fmt: 'text', show: (v) => `${v ?? 0}/${FLUENCY_TO_WIN}` },
      { label: 'Reputation', value: (s) => (s.ratings?.length ? s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length : null), fmt: 'text', show: (v) => (v == null ? 'no reviews' : `⭐ ${v.toFixed(1)}`) },
    ],
  },
  {
    id: 'casino',
    title: 'The Casino',
    icon: '🎰',
    colors: ['#065f46', '#15803d'],
    stats: [
      { label: 'Roulette spins', value: st('rouletteSpins'), fmt: 'num' },
      { label: 'Slot pulls', value: st('slotSpins'), fmt: 'num' },
      { label: 'Money gambled', value: st('moneyGambled'), fmt: 'money' },
      { label: 'Gambling losses', value: st('gambleLosses'), fmt: 'money', note: () => 'The house thanks you. Personally.' },
      { label: 'Five-of-a-kinds', value: st('slotFives'), fmt: 'num' },
      { label: 'CAPTCHAs failed', value: st('captchaFails'), fmt: 'num', note: () => 'Are you sure you’re human?' },
      { label: 'CAPTCHAs passed', value: st('captchaPasses'), fmt: 'num' },
    ],
  },
  {
    id: 'loot',
    title: 'Loot',
    icon: '🎁',
    colors: ['#86198f', '#db2777'],
    stats: [
      { label: 'Mystery boxes opened', value: st('boxesOpened'), fmt: 'num' },
      { label: 'Items found', value: st('itemsFound'), fmt: 'num' },
      { label: 'Item collection', value: (s) => s.stats.itemIds?.length ?? 0, fmt: 'text', show: (v) => `${v}/${EQUIPPABLE_COUNT}` },
      { label: 'Platinum Boxes opened', value: st('platinumBoxes'), fmt: 'num', note: () => 'A million dollars each. Mostly trash.' },
      { label: 'Pieces of trash', value: (s) => Math.max(0, (s.stats.boxesOpened ?? 0) - (s.stats.itemsFound ?? 0)), fmt: 'num', note: () => 'Statistically, you.' },
      { label: 'Prestige Relics found', value: st('relicsFound'), fmt: 'num', note: (v, s) => (s.stats.pityRelics ? `${s.stats.pityRelics} out of pity` : 'the hard way') },
      { label: 'Trash recycled', value: st('trashRecycled'), fmt: 'num' },
      { label: 'Bots that robbed you', value: st('botsLost'), fmt: 'num', note: (v) => (v ? 'Ibiza is lovely this time of year.' : 'Loyal bots. Suspicious.') },
    ],
  },
  {
    id: 'cat',
    title: 'Sir Scratchington',
    icon: '🐈',
    colors: ['#9a3412', '#d97706'],
    stats: [
      { label: 'Times you fed the cat', value: st('catFed'), fmt: 'num' },
      { label: 'Pets (accepted)', value: st('catPets'), fmt: 'num' },
      { label: 'Play sessions', value: st('catPlays'), fmt: 'num' },
      { label: 'Scratches received', value: st('catScratches'), fmt: 'num', note: (v) => (v ? 'Each one a performance review.' : 'A model owner. Or lucky.') },
      { label: 'Tried to feed it while broke', value: st('catFeedFails'), fmt: 'num', note: () => 'It saw you check your wallet.' },
    ],
  },
  {
    id: 'ads',
    title: 'Ads & dark patterns',
    icon: '📺',
    colors: ['#be123c', '#7c3aed'],
    stats: [
      { label: 'Ads endured', value: (s) => s.adsSeen ?? 0, fmt: 'num', note: () => 'Every one of them was “personalized”.' },
      { label: 'Ads closed', value: st('adsClosed'), fmt: 'num' },
      { label: 'Ads dragged out of the way', value: st('adsDragged'), fmt: 'num' },
      { label: 'DVD bounces watched', value: st('dvdBounces'), fmt: 'num', note: (v, s) => `${fmt(s.stats.dvdCorners ?? 0)} perfect corner${s.stats.dvdCorners === 1 ? '' : 's'}` },
      { label: 'Saves lost to the Trap Ad', value: (s) => s.saveFilesLost ?? 0, fmt: 'num' },
      { label: 'Terms of Service accepted', value: st('tosAccepted'), fmt: 'num', note: () => 'Read: 0.' },
      { label: 'Trackers refused by hand', value: (s) => (s.stats.trackersRefused ?? 0) * 20, fmt: 'num' },
    ],
  },
  {
    id: 'store',
    title: 'The Store',
    icon: '💳',
    colors: ['#a16207', '#be185d'],
    stats: [
      { label: 'Microtransactions', value: st('purchases'), fmt: 'num', note: (v) => (v ? 'Mom’s card has been notified.' : 'Not one cent. We’re scared of you.') },
      { label: 'Fake money spent', value: st('fakeSpend'), fmt: 'cents', note: () => 'Actually charged: $0.00.' },
      { label: 'Store visits', value: (s) => s.storeVisits ?? 0, fmt: 'num' },
      { label: 'Subscriptions cancelled', value: st('subsCancelled'), fmt: 'num', note: (v, s) => `and ${fmt(s.stats.cancelsCancelled ?? 0)} cancellations cancelled` },
      { label: 'Gems bought', value: st('gemsBought'), fmt: 'num', note: () => 'Everything costs 13.' },
      { label: 'Notification badges ignored', value: (s) => Object.values(s.phantom ?? {}).reduce((a, b) => a + b, 0), fmt: 'num' },
    ],
  },
  {
    id: 'social',
    title: 'You, in the world',
    icon: '🏆',
    colors: ['#334155', '#2563eb'],
    stats: [
      { label: 'Best leaderboard rank', value: (s) => s.stats.bestRank ?? 9_999_999, fmt: 'rank', note: (v) => (v <= 5 ? 'Top 5. #1 still has their mom’s card.' : 'Out of 10,000,004.') },
      { label: 'Emails received', value: st('emailsReceived'), fmt: 'num' },
      { label: 'Emails read', value: st('emailsRead'), fmt: 'num' },
      { label: 'Princes paid', value: st('phished'), fmt: 'num' },
      { label: 'Limited-time events', value: st('eventsSeen'), fmt: 'num' },
      { label: 'Achievements', value: (s) => Object.keys(s.achievements).length, fmt: 'text', show: (v) => `${v}/${ACHIEVEMENTS.length}` },
      { label: 'Endings found', value: (s) => ENDINGS.filter((e) => s.endings?.[e.id]).length, fmt: 'text', show: (v) => `${v}/${ENDINGS.length}` },
      { label: 'Themes tried', value: (s) => s.stats.themesTried?.length ?? 0, fmt: 'num' },
      { label: 'Attempts to touch grass', value: st('grassAttempts'), fmt: 'num', note: (v, s) => `best streak: ${fmt(s.stats.grassBest ?? 0)} in a row` },
    ],
  },
]

export const STAT_COUNT = UNWRAPPED.reduce((n, g) => n + g.stats.length, 0)

/** The formatted value of a stat for a state. */
export function showStat(stat, s) {
  const v = stat.value(s)
  return stat.show ? stat.show(v) : FORMATS[stat.fmt](v ?? 0)
}

// Who you are, according to the data we definitely don't sell.
const PERSONAS = [
  { id: 'whale', icon: '🐋', title: 'The Whale', line: 'You found the store and the store found you.', score: (s) => (s.stats.purchases ?? 0) / 4 },
  { id: 'degenerate', icon: '🎰', title: 'The Degenerate', line: 'Red or black? Yes.', score: (s) => ((s.stats.rouletteSpins ?? 0) + (s.stats.slotSpins ?? 0)) / 80 },
  { id: 'miner', icon: '⛏️', title: 'The Grinder', line: 'Click. Click. Click. It’s a lifestyle.', score: (s) => (s.stats.clicks ?? 0) / 600 },
  { id: 'scroller', icon: '📱', title: 'The Doomscroller', line: 'Your thumb has travelled further than you have.', score: (s) => (s.stats.doomSeconds ?? 0) / 900 },
  { id: 'catparent', icon: '🐈', title: 'The Cat Parent', line: 'He tolerates you. That’s love.', score: (s) => ((s.stats.catFed ?? 0) + (s.stats.catPets ?? 0) + (s.stats.catPlays ?? 0)) / 60 },
  { id: 'hoarder', icon: '🎁', title: 'The Box Goblin', line: '90% trash. 100% commitment.', score: (s) => (s.stats.boxesOpened ?? 0) / 800 },
  { id: 'mark', icon: '🎣', title: 'The Mark', line: 'Princes know your address now.', score: (s) => (s.stats.phished ?? 0) / 2 },
  { id: 'debtor', icon: '🦈', title: 'Vinnie’s Favourite', line: 'Interest compounds. So does love.', score: (s) => (s.stats.loansTaken ?? 0) / 3 },
]
export function personaFor(s) {
  const best = PERSONAS.map((p) => ({ ...p, v: p.score(s) })).sort((a, b) => b.v - a.v)[0]
  return best.v >= 1 ? best : { id: 'tourist', icon: '🧳', title: 'The Tourist', line: 'Just looking. For now. We have your email.' }
}
