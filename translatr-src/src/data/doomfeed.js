// DoomFeed™ — an endless, algorithmically curated feed of nothing.
// Posts are generated on demand; some react to the player's actual game state.

import { money } from '../lib/format'

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export const AUTHORS = {
  doom: { name: 'Doom Daily', handle: 'doomdaily', avatar: '📰', verified: 'org' },
  algo: { name: 'The Algorithm', handle: 'algorithm', avatar: '🤖', verified: 'org' },
  hustle: { name: 'HustleBro', handle: 'hustlebro_77', avatar: '💪', verified: 'paid' },
  witch: { name: 'Wellness Witch', handle: 'wellness.witch', avatar: '🔮', verified: 'paid' },
  karen: { name: 'CryptoKaren', handle: 'cryptokaren', avatar: '🚀', verified: 'paid' },
  eagle: { name: 'Motivational Eagle', handle: 'soar.daily', avatar: '🦅' },
  grandma: { name: 'Grandma', handle: 'grandma1947', avatar: '👵' },
  source: { name: 'Guy Who Replies "Source?"', handle: 'source_pls', avatar: '🧐' },
  ex: { name: 'Definitely Not Your Ex', handle: 'totally_moved_on', avatar: '💔' },
  weather: { name: 'Local Weather Pessimist', handle: 'itwillrain', avatar: '🌧️' },
  cat: { name: 'Sir Scratchington', handle: 'sirscratchington', avatar: '😾', verified: 'paid' },
  dev: { name: 'DevAccount_01', handle: 'devaccount_01', avatar: '🛠️', verified: 'org' },
  whale: { name: 'xX_Whale_Xx', handle: 'xx_whale_xx', avatar: '🐋', verified: 'paid' },
  bank: { name: 'Your Bank', handle: 'yourbank', avatar: '🏦', verified: 'org' },
  irs: { name: 'Dev IRS', handle: 'dev_irs', avatar: '⚖️', verified: 'org' },
  megavolt: { name: 'MegaVolt™', handle: 'megavolt', avatar: '⚡', verified: 'org' },
  midas: { name: 'Midas Jewelers', handle: 'midas', avatar: '💍', verified: 'org' },
  catcare: { name: 'CatCare+', handle: 'catcareplus', avatar: '🐈‍⬛', verified: 'org' },
  vinnie: { name: 'QuickCash™', handle: 'quickcash', avatar: '🦈', verified: 'org' },
  gems: { name: 'GemCo', handle: 'gemco', avatar: '💎', verified: 'org' },
}

const NEWS = [
  'BREAKING: Area person refreshes feed, finds nothing new, refreshes again.',
  'Experts warn that the number of things experts warn about has never been higher.',
  'Scientists discover a new color. It has already been monetized.',
  'Local cloud described as "slightly ominous". Residents advised to keep scrolling.',
  'Opinion: Here is why my opinion is the correct one (1/47)',
  "The economy did a thing. Here's why that's bad for you specifically.",
  'Man who said "one more video" at 9 PM still going strong at 4 AM.',
  'Your screen-time report would like a word. Several words. It is worried.',
  "Nation's attention span hits record low of 0.8 sec— hey look, a dog",
  'Report: Everything is fine. This report is sponsored by Everything.',
  'Petition to rename Monday "Sunday 2" reaches 3 signatures.',
  'New app lets you doomscroll while doomscrolling. Investors call it "the future".',
]
const NEWS_ART = [
  { art: '📉📰😱', theme: 'from-rose-200 to-red-500' },
  { art: '🌩️🏙️📱', theme: 'from-slate-300 to-slate-600' },
  { art: '📊🔥📊', theme: 'from-amber-200 to-orange-600' },
]

const INFLUENCER = [
  ['hustle', 'Woke up at 3:45 AM. Ice bath. Mined 400 rocks. Opened 3 loot boxes. Got Pocket Lint ×3. That is called MINDSET. 💪'],
  ['hustle', 'Sleep is a subscription I cancelled. Stamina is a mindset. (Also I have bought 6 Energy Drinks today.)'],
  ['witch', "manifesting a Prestige Relic 🔮✨ drop a 🏺 if you're manifesting too"],
  ['witch', 'Mercury is in retrograde, which is why your loot boxes are 90% trash. It has nothing to do with the drop rates.'],
  ['karen', '$MOONRUG just dipped 90%. That means it is 90% OFF. Buying the dip with my rent 🚀🚀🚀'],
  ['eagle', 'They said I could not translate a sentence without paying the vowel tax. They were right. Anyway: SOAR. 🦅'],
  ['grandma', 'HOW DO I MAKE THE WORDS BIGGER. also happy birthday to everyone who has one'],
  ['ex', 'Just adopted a cat. It is fed. On time. Every time. Just saying. 🙂'],
  ['weather', "Sunny today, which means rain later, which means sad. Plan accordingly."],
  ['algo', 'We noticed you lingered on the last post for 0.4 seconds. Here are 400 more exactly like it.'],
  ['dev', 'patch notes v4.20.69: vowels +10% cost. cat 12% hungrier. leaderboard unchanged. you’re welcome'],
  ['dev', 'We hear your feedback, and we have decided to ignore it faster.'],
  ['whale', 'Bought the Midas Ring before breakfast. Bought another one after. (It is one-time only. They charged me anyway.)'],
  ['source', 'Source?'],
]

const BAIT = [
  ['algo', 'Only 2% of people can read this without scrolling past. 👀'],
  ['cat', 'Like this post or I will know. I always know.'],
  ['algo', 'Comment your least favorite vowel. Mine is E. Too expensive.'],
  ['hustle', 'Unpopular opinion: loot boxes are a personality.'],
  ['eagle', 'Tag someone who needs to touch grass. (Everyone. Tag everyone.)'],
  ['algo', 'Type "amen" or your save file gets deleted. (It won’t.) (It might.)'],
]

const SPONSORED = [
  { itemId: 'energy_drink', author: 'megavolt', text: 'Scroll longer. Scroll harder. MegaVolt™ — now with 400% of your daily anxiety.', cta: 'Get MegaVolt™ · $4.99', media: { art: '⚡🥤⚡', theme: 'from-lime-200 to-green-600' } },
  { itemId: 'midas', author: 'midas', text: "The Midas Ring: because earning at a normal rate is for people who aren't the main character.", cta: 'Become the main character · $99.99', media: { art: '💍✨👑', theme: 'from-amber-100 to-yellow-500' } },
  { itemId: 'catcare', author: 'catcare', text: 'Your cat deserves better. Your cat deserves an algorithm. CatCare+ feeds it for only 3× the price.', cta: 'Subscribe · $6.99/mo', media: { art: '🐈‍⬛🤖🍽️', theme: 'from-sky-200 to-indigo-500' } },
  { itemId: 'rank_boost', author: 'algo', text: 'People who looked at your rank also bought: Rank Boost. It improves your rank by up to 0 places.', cta: 'Boost my rank · $19.99', media: { art: '📈📈📈', theme: 'from-emerald-200 to-teal-600' } },
  { itemId: 'debt_relief', author: 'vinnie', text: 'Debt? Not for long. (Terms apply. The terms are that it comes back.)', cta: 'Forgive my debt · $29.99', media: { art: '🧾🔥💸', theme: 'from-rose-200 to-red-600' } },
  { itemId: 'gem_pack', author: 'gems', text: "10,000 Gems. What do Gems do? Nothing. That's the point. That's the whole point.", cta: 'Buy Gems · $19.99', media: { art: '💎💎💎', theme: 'from-cyan-200 to-blue-600' } },
]

/** Posts that react to the player's current game state (null when not applicable). */
const GAME_AWARE = [
  (s) => ({ author: 'bank', text: `A friendly reminder that your balance is ${money(s.money)}. We are so proud of you. (We are not.)` }),
  (s) => (s.loan ? { author: 'doom', text: `Local player owes QuickCash™ ${money(Math.ceil(s.loan.debt))}. Vinnie described as "very patient" by people who have never met him.`, media: { art: '🦈💸🚚', theme: 'from-rose-200 to-red-500' } } : null),
  (s) => (Object.values(s.cat).some((v) => v <= 0) ? { author: 'cat', text: 'my human forgot to feed me AGAIN. anyway here is their furniture 📸', media: { art: '🛋️🔪😾', theme: 'from-orange-200 to-red-500' } } : { author: 'cat', text: 'my human fed me once and now thinks we are friends. 😼 we are not.' }),
  (s) => ((s.stats.audited ?? 0) > 0 ? { author: 'irs', text: `Record quarter for the Dev IRS! Special thanks to one player in particular (${s.stats.audited} audits and counting).` } : null),
  () => ({ author: 'doom', text: `LEADERBOARD: #9,999,999 holds steady for the ${400 + Math.floor(Math.random() * 600)}th consecutive hour. Analysts call it "legendary".` }),
  (s) => (s.adsSeen > 0 ? { author: 'algo', text: `You have seen ${s.adsSeen} ads so far. Congratulations! Here is a reward: another ad.` } : null),
  (s) => (s.saveFilesLost > 0 ? { author: 'doom', text: `Survivor story: "I closed the ad at 9 seconds. I lost everything." Local player has now lost ${s.saveFilesLost} save file${s.saveFilesLost > 1 ? 's' : ''}.` } : null),
  (s) => (s.prestige > 0 ? { author: 'hustle', text: `Prestiged ${s.prestige}×. Lost everything ${s.prestige}×. Grindset: intact. 💪` } : null),
  (s) => {
    const n = Object.keys(s.achievements).length
    return n > 0 ? { author: 'algo', text: `Congrats on your ${n} achievements! They are worth ${n * 10}G, which is nothing.` } : null
  },
  (s) => ((s.stats.doomMeters ?? 0) > 1 ? { author: 'weather', text: `Forecast: you have scrolled ${(s.stats.doomMeters ?? 0).toFixed(1)} meters today, with a 100% chance of scrolling more.` } : null),
]

let seq = 0
let lastAuthor = null

function base(kindFactory) {
  // Avoid the same account posting twice in a row.
  for (let i = 0; i < 4; i++) {
    const p = kindFactory()
    if (p && p.author !== lastAuthor) return p
  }
  return kindFactory()
}

function makePost(s) {
  const r = Math.random()
  let p
  if (r < 0.14) p = base(() => ({ ...pick(SPONSORED), sponsored: true }))
  else if (r < 0.32) p = base(() => pick(GAME_AWARE)(s)) ?? base(() => ({ author: 'doom', text: pick(NEWS) }))
  else if (r < 0.52) p = base(() => ({ author: 'doom', text: pick(NEWS), media: Math.random() < 0.4 ? pick(NEWS_ART) : undefined }))
  else if (r < 0.66) p = base(() => {
    const [author, text] = pick(BAIT)
    return { author, text }
  })
  else p = base(() => {
    const [author, text] = pick(INFLUENCER)
    return { author, text: author === 'source' ? 'Source?' : text }
  })
  lastAuthor = p.author

  const likes = Math.floor(10 ** (1 + Math.random() * 4))
  return {
    ...p,
    id: ++seq,
    born: Date.now(),
    likes,
    velocity: likes * (0.002 + Math.random() * 0.02), // likes per second: everything is "going viral"
    comments: Math.floor(likes * (0.02 + Math.random() * 0.08)),
    reposts: Math.floor(likes * (0.05 + Math.random() * 0.15)),
    liked: false,
  }
}

/** Generate `n` fresh posts for the current game state. */
export const makeDoomPosts = (n, state) => Array.from({ length: n }, () => makePost(state))
