// Translation contracts: clients email you a phrase, a language and a deadline. Translate that
// exact phrase into that language before the deadline and they pay. Correctly, and they pay in
// full and leave five stars. Wrong (the translator's natural state), and they leave a review.

export const CONTRACT = {
  first: [40_000, 80_000], // the first job, after the game starts
  every: [100_000, 170_000], // then one every ~2–3 minutes…
  max: 3, // …while fewer than this are open
  deadline: [150_000, 300_000],
  payoutSwings: 120, // pays at least this many pickaxe swings’ worth…
  payoutCostMult: 4, // …or 4× what the translation costs, whichever is more
  botchedShare: 0.2, // a wrong translation gets a "pity payment"
  ratingsKept: 30,
}

export const CONTRACT_LANGS = ['Spanish', 'French', 'German', 'Japanese', 'Klingon', 'Pirate']

export const CLIENTS = [
  { name: 'Grandma’s Bakery', icon: '🥐' },
  { name: 'Totally Legit Imports LLC', icon: '📦' },
  { name: 'The Moon (Embassy)', icon: '🌕' },
  { name: 'A Wedding Planner', icon: '💒' },
  { name: 'Dr. Hospital', icon: '🏥' },
  { name: 'Vinnie', icon: '🦈' },
  { name: 'Cat Food Co.', icon: '🐟' },
  { name: 'A Very Tired Tourist', icon: '🧳' },
  { name: 'The Vowels (a band)', icon: '🎸' },
  { name: 'Brock Bottomline, CEO', icon: '💼' },
  { name: 'Your Landlord', icon: '🏠' },
  { name: 'A Pirate (Actual)', icon: '🏴‍☠️' },
]

export const PHRASES = [
  'Where is the bathroom',
  'I would like one coffee please',
  'My hovercraft is full of eels',
  'Please do not eat the cat',
  'The invoice is attached',
  'We are closed on Mondays',
  'Your table is ready',
  'Two tickets to the moon please',
  'I am not a robot',
  'Help I am trapped in a translator',
  'The rent is due on Friday',
  'This sandwich changed my life',
  'Please stop sending emails',
  'I love you but not like that',
  'Where did you park the boat',
  'Do you accept exposure as payment',
]

const REVIEWS = {
  5: [
    'Perfect. Suspiciously perfect. Did you pay for this?',
    'Flawless. My grandmother cried (good crying).',
    'Delivered on time and correct. We have never seen this before.',
    'Five stars. I had to check it twice. Then a third time, out of fear.',
  ],
  1: [
    'Translated it as “{out}”. We printed 5,000 menus.',
    'It said “{out}”. My wedding is ruined. 1/5.',
    'Delivered “{out}”. I don’t know what it means. Neither do they.',
    '“{out}”?? I asked for {lang}. 1 star, and that star is sarcastic.',
  ],
  0: [
    'Never delivered. I waited by the phone. I don’t even have a phone.',
    'Deadline missed. We had to use a dictionary. Like animals.',
    'Ghosted. Would not hire again. Would not hire in the first place, in hindsight.',
  ],
}
const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)]
/** A review for a delivery: 5 (correct), 1 (wrong — quotes what it said) or 0 (never delivered). */
export function reviewText(kind, { out = '', lang = '' } = {}, rand = Math.random) {
  const snippet = out.length > 48 ? `${out.slice(0, 46)}…` : out
  return pick(REVIEWS[kind], rand).replaceAll('{out}', snippet).replaceAll('{lang}', lang)
}

export const normalizePhrase = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Average stars (1 decimal) and count, or null before the first review. */
export function reputationOf(ratings) {
  if (!ratings?.length) return null
  return { avg: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10, count: ratings.length }
}
export const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n)
