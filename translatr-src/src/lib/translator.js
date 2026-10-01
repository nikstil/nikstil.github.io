const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length

const VOWEL = /[aeiou]/i
export const isVowel = (ch) => VOWEL.test(ch)

export const PRICE_PER_WORD = 10
export const REFUSE_EVERY = 2 // every 2nd request is refused (and still billed)

/**
 * The Premium Character Tax: $10 per word, doubled for any word containing a vowel.
 * `coupon` (Word Coupon skill) halves the final bill, rounded in the house's favor.
 */
export function priceTranslation(text, { coupon = false, vowelTax = true, factor = 1 } = {}) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const base = PRICE_PER_WORD * factor // AI Hype Week: ×5 "for the GPUs"
  const lines = words.map((word) => ({ word, base, tax: vowelTax && VOWEL.test(word) ? base : 0 }))
  const subtotal = lines.reduce((sum, l) => sum + l.base + l.tax, 0)
  const taxTotal = lines.reduce((sum, l) => sum + l.tax, 0)
  const discount = coupon ? Math.floor(subtotal / 2) : 0
  return { lines, words: words.length, taxTotal, subtotal, discount, total: subtotal - discount }
}

const INSULTS = [
  'Why should I translate that?',
  'Google it yourself, idiot.',
  'No.',
  'I could translate that. I simply choose not to.',
  'Translation: you should have paid attention in {lang} class.',
  "Error 418: I'm a teapot, not a translator.",
  'That sentence is so bad I refuse to spread it to other languages.',
  'Ask your mom.',
  "Sorry, I only translate on days that end in 'Z'.",
  'Loading enthusiasm... 0%... failed.',
  '"{snippet}"? In {lang} that\'s pronounced "please stop typing".',
  'I translated it in my head. It was stupid. You\'re welcome.',
  'Have you considered just... not saying that?',
]

const REFUSALS = [
  'No. (Every second request is my day off. You were still billed.)',
  "I've decided this sentence doesn't deserve other languages. Fee kept.",
  'Translation declined under the TranslatrAI™ Wellbeing Policy. The fee was for the declining.',
  'I read it. I chose peace. That will be the full price, thanks.',
  'Request refused. Try again — I translate every other time. Probably.',
  'Not today. Not in {lang}. Not for that sentence.',
  "I'm on my break. My break is billable.",
  'Refused. Your money has been translated into our money.',
]

/** What the translator says on the requests it refuses. */
export function refusal(lang) {
  return pick(REFUSALS).replaceAll('{lang}', lang)
}

const WRONG_WORDS = [
  'banana', 'taxes', 'ferret', 'moist', 'Belgium', '🦆', 'spreadsheet', 'yeet',
  'lasagna', 'accountant', 'bees', 'Kevin', 'shoe', 'gravy', 'thunder', 'LinkedIn',
]

const CONSONANTS = 'bcdfghjklmnpqrstvwxzßþðçñ'
const VOWELS = 'aeiouyåøüöæ'

function gibberishWord(len) {
  let w = ''
  for (let i = 0; i < Math.max(2, len); i++) {
    w += i % 2 ? pick(VOWELS) : pick(CONSONANTS)
  }
  return Math.random() < 0.2 ? w.toUpperCase() : w
}

/** The default translator: lazy, wrong, and hostile. */
export function badTranslate(text, lang) {
  const words = text.trim().split(/\s+/)
  const mode = Math.random()
  if (mode < 0.45) {
    const snippet = words.slice(0, 4).join(' ') + (words.length > 4 ? '…' : '')
    return pick(INSULTS).replaceAll('{lang}', lang).replaceAll('{snippet}', snippet)
  }
  if (mode < 0.75) {
    return words.map((w) => gibberishWord(w.length)).join(' ') + ' (probably)'
  }
  return words.map(() => pick(WRONG_WORDS)).join(' ') + ` — close enough for ${lang}.`
}

/**
 * Premium Latin™: the only language TranslatrAI™ really speaks (it "detects you meant Latin").
 * The whole grammar is one rule: drop the vowels a word ends with, then add an ending picked by
 * how many letters the English word has. It charges $10 a word for this. Players who work it out
 * can translate for free, and ten clean sentences in a row is the Self-Taught ending.
 */
export const LATIN_ENDINGS = [
  [2, 'ex'], // I → Iex, to → tex, my → mex
  [3, 'us'], // cat → catus, the → thus
  [4, 'um'], // moon → moonum, cake → cakum
  [5, 'ae'], // hello → hellae
  [Infinity, 'ibus'], // please → pleasibus
]

/** One word in Premium Latin™ (the Language setting uses it for the whole interface). */
export function latinWord(word) {
  const lower = word.toLowerCase()
  const letters = lower.replace(/'/g, '').length
  const base = lower.replace(/[aeiouy]+$/, '') || lower
  const out = base + LATIN_ENDINGS.find(([max]) => letters <= max)[1]
  return word[0] === word[0].toUpperCase() ? out[0].toUpperCase() + out.slice(1) : out
}

/** "Correct" translation (Premium Latin™). Deterministic, so it feels trustworthy. */
export const correctTranslate = (text) => text.replace(/[A-Za-z']+/g, latinWord)

// Words as the translator sees them (curly apostrophes from phone keyboards count as straight ones).
const words = (text) => String(text).toLowerCase().replace(/[‘’]/g, "'").match(/[a-z']+/g) ?? []

/**
 * Marks the player's own Premium Latin™ against the real thing, word by word. Capitals and
 * punctuation don't matter. It says which words are wrong, never what the right ones are.
 */
export function gradeSelfTranslation(english, attempt) {
  const source = words(english)
  const got = words(attempt)
  const marked = source.map((en, i) => ({ en, ok: got[i] === latinWord(en) }))
  const extra = Math.max(0, got.length - source.length)
  return {
    words: marked,
    extra,
    distinct: new Set(source).size,
    correct: source.length > 0 && extra === 0 && marked.every((w) => w.ok),
  }
}
