// The endings (their stories and credits live in endingStory.js, loaded with the ending
// screen) and the speedrun splits.

export const FLUENCY_TO_WIN = 10 // your own translations in a row, no mistakes (the Self-Taught ending)
export const FLUENCY_MIN_WORDS = 3 // different words a sentence needs to count (shorter ones are practice)

export const ENDINGS = [
  {
    id: 'buy',
    icon: '🏢',
    title: 'Hostile Takeover',
    how: 'Buy TRANSLATR™ Inc. for $1 quintillion.',
    hint: 'Everything has a price. The company’s is in the Premium Vault.',
    color: '#d4a017',
  },
  {
    id: 'slave',
    icon: '👔',
    title: 'Corporate Slave',
    how: 'Own everything in the Premium Vault, earn more from rewarded ads than from mining, then take the job instead of buying the company.',
    hint: 'Buy everything. Watch everything. Mine nothing. When you can finally afford TRANSLATR™, the board may have a better offer.',
    color: '#5b6b7a',
    tag: 'Alternate ending',
  },
  {
    id: 'bankrupt',
    icon: '💀',
    title: 'Death by Cat',
    how: 'Owe Vinnie more than you have. Then let the cat scratch you.',
    hint: 'Debt is survivable. Debt plus an angry cat is not.',
    color: '#d32f2f',
    fatal: true,
  },
  {
    id: 'grass',
    icon: '🌱',
    title: 'Touched Grass',
    how: 'Touch grass 50 times in a row without touching anything else.',
    hint: 'The grass button works. It just needs your undivided attention.',
    color: '#2c9a1e',
  },
  {
    id: 'taught',
    icon: '✍️',
    title: 'Self-Taught',
    how: `Translate ${FLUENCY_TO_WIN} sentences yourself, in a row, without a single mistake.`,
    hint: 'TranslatrAI™ only speaks one language, and its grammar is one rule long. Learn it and you won’t need it.',
    color: '#8e5bd6',
  },
  {
    id: 'shooter',
    icon: '👹',
    title: 'Knee-Deep in the Ads',
    how: 'Beat all three episodes of DOOMSCROLL.EXE, then its final boss, The Shareholders.',
    hint: 'There’s a 1993-style shooter in the Arcade (Start menu). Fifteen levels, then a boss that only the Ban Hammer can hurt. Every hit costs you five unskippable seconds.',
    color: '#b3261e',
  },
  {
    id: 'deleted',
    icon: '⏻',
    title: 'Account Deleted',
    how: 'Minimize every window, then press the power button on the empty desktop.',
    hint: 'Somewhere behind all these windows is an off switch.',
    color: '#4a5a6e',
    fatal: true,
    tag: 'True ending',
    hideHint: true,
  },
  {
    id: 'secret',
    icon: '🕊️',
    title: 'Not One Cent',
    how: 'Buy TRANSLATR™ without ever making a microtransaction.',
    hint: 'Some say the company fears the ones who never pay.',
    color: '#5fb8ff',
    secret: true,
    tag: 'Secret ending',
    hideHint: true,
  },
]
export const ENDING_BY_ID = Object.fromEntries(ENDINGS.map((e) => [e.id, e]))

export const GRASS_TO_WIN = 50 // touches in a row, touching nothing else

const peak = (s) => Math.max(s.money, s.stats.peakMoney ?? 0)

/** Speedrun splits, recorded for every run (normal runs use them for Unwrapped). */
export const SPLITS = [
  { id: 'k1', label: '$1K', check: (s) => peak(s) >= 1e3 },
  { id: 'm1', label: '$1M', check: (s) => peak(s) >= 1e6 },
  { id: 'p1', label: 'First Prestige', check: (s) => s.prestige >= 1 },
  { id: 'b1', label: '$1B', check: (s) => peak(s) >= 1e9 },
  { id: 't1', label: '$1T', check: (s) => peak(s) >= 1e12 },
  { id: 'qa1', label: '$1Qa', check: (s) => peak(s) >= 1e15 },
  { id: 'end', label: 'The End' }, // recorded when an ending plays
]

/** 1:02:03.4 / 2:03.4 */
export function fmtRunTime(ms, tenths = true) {
  if (ms == null || !Number.isFinite(ms)) return '—'
  const t = Math.max(0, ms)
  const h = Math.floor(t / 3_600_000)
  const m = Math.floor((t % 3_600_000) / 60_000)
  const s = Math.floor((t % 60_000) / 1000)
  const d = Math.floor((t % 1000) / 100)
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}${tenths ? `.${d}` : ''}`
}
