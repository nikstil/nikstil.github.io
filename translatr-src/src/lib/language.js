import { latinWord } from './translator'

// The Language setting (Control Panel → Display). TRANSLATR™ "localizes" its own interface, badly:
// the text layer (lib/emojiTheme.js) runs every piece of text on the page through translateText().
// The game stays playable: numbers, prices, brand names (TRANSLATR™, DoomFeed™…) and SHOUTING are
// left alone, and nothing inside translate="no" is touched (the language picker itself, your own
// translations and TranslatrAI™'s output).

export const LANGUAGES = [
  { id: 'en', label: 'English', hint: 'The original. Mostly.' },
  { id: 'pirate', label: 'Pirate', hint: 'Arr. Every doubloon counts.' },
  { id: 'corporate', label: 'Corporate', hint: 'Let’s circle back on the whole interface.' },
  { id: 'genz', label: 'Gen Z', hint: 'The interface, but make it no cap.' },
  { id: 'latin', label: 'Premium Latin™', hint: 'Full immersion, in TranslatrAI™’s own grammar. This setting stays in English, so you can find your way back.' },
]
export const LANGUAGE_IDS = LANGUAGES.map((l) => l.id)

const PIRATE = {
  you: 'ye', your: 'yer', yours: 'yers', "you're": 'ye be', "you've": 'ye’ve', yourself: 'yerself',
  are: 'be', is: 'be', am: 'be', "isn't": 'be not', "aren't": 'be not', my: 'me',
  hello: 'ahoy', hi: 'ahoy', hey: 'ahoy', yes: 'aye', no: 'nay', the: 'th’', of: 'o’', for: 'fer',
  over: 'o’er', never: 'ne’er', ever: 'e’er', before: 'afore', there: 'thar', with: 'wit’', think: 'reckon',
  money: 'doubloons', cash: 'booty', coin: 'doubloon', coins: 'pieces o’ eight', dollars: 'doubloons', wallet: 'treasure chest',
  buy: 'plunder', bought: 'plundered', purchase: 'plunder', purchases: 'plunderin’s', sell: 'barter', sold: 'bartered', steal: 'pillage', stole: 'pillaged',
  friend: 'matey', friends: 'hearties', stop: 'avast', cancel: 'scuttle', delete: 'scuttle', deleted: 'scuttled', close: 'batten down',
  ad: 'message in a bottle', ads: 'messages in bottles', reward: 'booty', rewards: 'booty', loot: 'plunder', box: 'chest', boxes: 'chests',
  player: 'scallywag', players: 'scallywags', user: 'landlubber', users: 'landlubbers', company: 'crew', boss: 'cap’n', ceo: 'cap’n', manager: 'first mate',
  cat: 'ship’s cat', settings: 'charts', window: 'porthole', windows: 'portholes', game: 'voyage', play: 'sail', start: 'set sail',
  ending: 'final voyage', endings: 'final voyages', inbox: 'message barrel', email: 'letter', mail: 'letters', gems: 'jewels', gem: 'jewel',
  translate: 'parley', translation: 'parley', translations: 'parleys', premium: 'cap’n’s', subscription: 'tribute', tax: 'tribute', taxes: 'tributes',
  bank: 'vault', lost: 'lost at sea', wow: 'shiver me timbers', great: 'grand', good: 'fine', bad: 'bilge-rat', stupid: 'bilge-brained',
  mining: 'diggin’ fer treasure', pickaxe: 'cutlass', stamina: 'grog', loan: 'debt to Davy Jones', debt: 'debt to Davy Jones',
}
const CORPORATE = {
  use: 'leverage', uses: 'leverages', using: 'leveraging', help: 'enablement', buy: 'invest in', bought: 'invested in', purchase: 'investment',
  money: 'liquidity', cash: 'liquidity', wallet: 'budget', price: 'value proposition', cost: 'investment', problem: 'opportunity', problems: 'opportunities',
  close: 'sunset', delete: 'offboard', cancel: 'deprioritize', stop: 'pause', talk: 'sync', meeting: 'sync', work: 'bandwidth',
  ad: 'brand touchpoint', ads: 'brand touchpoints', free: 'complimentary', cheap: 'cost-optimized', fired: 'rightsized', learn: 'upskill',
  idea: 'learning', ideas: 'learnings', goal: 'KPI', goals: 'KPIs', win: 'deliver value', won: 'delivered value', lose: 'pivot', lost: 'pivoted',
  game: 'ecosystem', play: 'engage', start: 'kick off', yes: 'let’s align on that', no: 'let’s take that offline', fast: 'agile', quickly: 'at pace',
  now: 'going forward', today: 'this sprint', later: 'next quarter', soon: 'next sprint', change: 'transformation', new: 'next-gen',
  best: 'best-in-class', good: 'value-add', great: 'impactful', bad: 'suboptimal', mistake: 'learning opportunity', mistakes: 'learning opportunities',
  users: 'stakeholders', user: 'stakeholder', player: 'resource', players: 'resources', you: 'your team', friend: 'partner', friends: 'partners',
  cat: 'Chief Morale Officer', think: 'ideate', plan: 'roadmap', email: 'touchpoint', emails: 'touchpoints', inbox: 'pipeline',
  settings: 'governance', translate: 'localize', translation: 'localization', translations: 'localizations', grass: 'the offsite',
  mine: 'extract value', mining: 'value extraction', mined: 'extracted', reward: 'incentive', rewards: 'incentives', fun: 'engagement',
  ending: 'exit strategy', endings: 'exit strategies', achievement: 'deliverable', achievements: 'deliverables', trophies: 'deliverables',
  hello: 'hope this finds you well', hi: 'per my last email', sorry: 'thanks for flagging', thanks: 'appreciate you', please: 'kindly',
}
const GENZ = {
  very: 'lowkey', really: 'fr', good: 'bussin', great: 'slay', amazing: 'slay', awesome: 'fire', cool: 'fire', nice: 'valid',
  bad: 'mid', terrible: 'mid', boring: 'mid', money: 'bread', cash: 'bread', dollars: 'bands', friend: 'bestie', friends: 'besties',
  lie: 'cap', lies: 'cap', true: 'no cap', honestly: 'ngl', seriously: 'deadass', yes: 'bet', okay: 'bet', no: 'nah', hello: 'yo', hi: 'yo',
  angry: 'pressed', upset: 'salty', tired: 'dead', funny: 'sending me', embarrassing: 'cringe', weird: 'sus', suspicious: 'sus',
  excellent: 'goated', best: 'goated', rich: 'rich af', expensive: 'pricey af', cat: 'fur baby', boss: 'main character', ceo: 'main character',
  you: 'u', your: 'ur', "you're": 'ur', because: 'bc', probably: 'prob', please: 'pls', thanks: 'ty', win: 'W', won: 'took the W',
  lose: 'take an L', lost: 'took an L', loss: 'L', failed: 'flopped', fail: 'flop', secret: 'lowkey', party: 'function', ad: 'ad (ratio)',
  ads: 'ads (ratio)', annoying: 'giving ick', ugly: 'giving ick', love: 'stan', loves: 'stans', perfect: 'chef’s kiss', broke: 'down bad',
}
const DICTS = { pirate: PIRATE, corporate: CORPORATE, genz: GENZ }

// Whole-text flourishes, applied after the words.
const TAILS = {
  pirate: (t) => (/\s/.test(t) && t.endsWith('!') ? `${t} Arr!` : t),
  genz: (t) => (/\s/.test(t) && t.endsWith('!') ? `${t.slice(0, -1)} fr fr!` : t),
}

const WORD = /[A-Za-z][A-Za-z'’]*/g
const upperFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/** Words left alone: brands (TRANSLATR™, DoomFeed), SHOUTING, units stuck to numbers ($5M, 10x), domains and user_names. */
function untouchable(word, before, after, next) {
  if (word.length > 1 && word === word.toUpperCase()) return true
  if (/[a-z][A-Z]/.test(word)) return true
  if (/[\d$#@/._]/.test(before) || /[\d™®@_]/.test(after)) return true
  return after === '.' && /[a-z]/i.test(next)
}

function translateWord(word, lang) {
  if (lang === 'latin') return latinWord(word.replace(/’/g, "'"))
  const dict = DICTS[lang]
  const key = word.toLowerCase().replace(/’/g, "'")
  const out = dict[key]
  if (out) return word[0] === word[0].toUpperCase() ? upperFirst(out) : out
  if (lang === 'pirate' && key.length > 4 && key.endsWith('ing')) return `${word.slice(0, -1)}’` // sailin’
  return word
}

const caches = new Map()
/** `text` in `lang` ('en' leaves it as it is). Cached: the same labels come round every second. */
export function translateText(text, lang) {
  if (lang === 'en' || (!DICTS[lang] && lang !== 'latin')) return text
  let cache = caches.get(lang)
  if (!cache) caches.set(lang, (cache = new Map()))
  const hit = cache.get(text)
  if (hit !== undefined) return hit
  let out = text.replace(WORD, (word, at) =>
    untouchable(word, text[at - 1] ?? '', text[at + word.length] ?? '', text[at + word.length + 1] ?? '') ? word : translateWord(word, lang),
  )
  out = TAILS[lang]?.(out) ?? out
  if (cache.size > 5000) cache.clear()
  cache.set(text, out)
  return out
}
