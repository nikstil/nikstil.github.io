// ---------- Economy ----------
const PICKAXES = [
  ['Rusty Spoon', 1],
  ['Actual Pickaxe', 5],
  ['Steel Pickaxe', 15],
  ['Diamond Pickaxe', 50],
  ['Obsidian Pickaxe', 200],
  ['Mithril Pickaxe', 800],
  ['Plasma Pickaxe', 3_500],
  ['Quantum Pickaxe', 15_000],
  ['Pickaxe of the Gods (Beta)', 60_000],
  ['The Final Pickaxe (DLC)', 250_000],
]

// Each upgrade costs 8x the previous one: $50, $400, $3.2K ... ~$839M for Lvl 10.
export const PICKAXE_LEVELS = PICKAXES.map(([name, perClick], i) => ({
  level: i + 1,
  name,
  perClick,
  cost: i === 0 ? 0 : 50 * 8 ** (i - 1),
}))

export const LOOTBOX_BATCHES = [1, 3, 5, 10, 50]
export const MAX_EQUIPPED = 5

// ---------- The goal ----------
// TRANSLATR™ Inc. is for sale. The price is one quintillion dollars (in-game, allegedly).
export const COMPANY_PRICE = 1e18

// ---------- Casino table limits ----------
// Wins are multiplied by your income multiplier, so an unlimited table would let one lucky
// streak skip the whole game. The limit grows ×10 with every Prestige (High Roller: ×100 more).
export const TABLE_LIMIT = { base: 10_000, perPrestige: 10, highRoller: 100 }

// ---------- Ads ----------
export const ADS = { intervalMs: 30_000, thickSkinMs: 45_000, adBlockerMs: 90_000 }

// ---------- Stamina ----------
export const STAMINA_REGEN_MS = 5_000 // +1 stamina every 5 seconds
// Max capacity 20 → 110 in steps of 10. Each upgrade costs 4x the previous: $150, $600, $2.4K ...
export const STAMINA_LEVELS = Array.from({ length: 10 }, (_, i) => ({
  level: i + 1,
  max: 20 + i * 10,
  cost: i === 0 ? 0 : 150 * 4 ** (i - 1),
}))

// ---------- Dev IRS ----------
export const AUDIT = {
  threshold: 500, // only hoarders get audited
  checkEverySec: 10,
  chance: 0.1, // per check → roughly one audit every ~100s while above the threshold
  rate: 0.3, // confiscates 30%
}

// ---------- CAPTCHA ----------
export const CAPTCHA = {
  rouletteChance: 0.35, // share of roulette spins that get intercepted; the 50x bundle always is
  timeLimitSec: 20,
  lockoutSec: 30,
  actions: { roulette: 'Roulette', bulk50: '50x Loot Bundle' },
}

// ---------- Gaslighting UI ----------
// The Mine tile silently swaps places with the Energy Drink tile (stamina stays the only topic).
export const HITBOX_SWAP = {
  minDelayMs: 12_000, // random silent swap every 12–30s…
  maxDelayMs: 30_000,
  chance: 0.5,
  spamClicks: 6, // …and a chance to swap mid-spam (6+ clicks within 2s)
  spamWindowMs: 2_000,
  spamChance: 0.2,
}

// ---------- QuickCash™ loans ----------
export const LOANS = {
  offersInSwings: [50, 500, 5_000], // offers scale with your per-swing income
  interestRate: 0.1, // +10%…
  compoundEveryMs: 15_000, // …every 15 seconds (roughly 1,000,000,000% APR)
  repoAt: 5, // the Repo Man arrives when debt reaches 5× what you borrowed
  repoSeizeRate: 0.75, // takes 75% of your wallet (applied to the debt) plus everything equipped
}

// ---------- Dynamic Pricing™ (loot box surge) ----------
export const SURGE = { everyMs: 8_000, min: 0.8, max: 4, history: 24 }

// ---------- Terms of Service ----------
export const TOS = { firstAfterMs: 90_000, everyMs: 300_000 }
export const TOS_CLAUSES = [
  ['1.1', 'By existing near a device running TRANSLATR™, you agree to these Terms, all previous Terms, and all future Terms we have not written yet.'],
  ['2.4', 'Vowels are licensed, not sold. TRANSLATR™ may revoke your access to the letter "E" at any time without notice.'],
  ['3.2', 'Your in-game currency has no real-world value. Your real-world money, however, has in-game value to us.'],
  ['4.7', 'The Dev IRS is an independent entity that shares an office, a bank account and a mother with TRANSLATR™.'],
  ['5.1', 'The Legendary Rock is provided "as is". "As is" means it does nothing. This is a feature.'],
  ['6.3', 'Sir Scratchington is a salaried employee of TRANSLATR™. Scratches are performance reviews.'],
  ['7.0', 'Leaderboard rankings are calculated using a proprietary algorithm. The algorithm is the number 9,999,999.'],
  ['8.8', 'Closing an advertisement before it has finished is considered theft of our attention.'],
  ['9.1', 'QuickCash™ interest rates are "competitive" in the sense that they are competing with the speed of light.'],
  ['10.4', 'You grant TRANSLATR™ a perpetual, irrevocable license to your clicks, your stamina and your will to live.'],
  ['11.2', 'Buttons may move. If a button appears to have moved, it did not. If you believe it moved, see clause 11.2.'],
  ['12.6', 'Declining these Terms is not supported in your region. Your region is Earth.'],
  ['13.0', 'Refunds are processed within 7–10 business eternities.'],
  ['14.9', 'By scrolling this far you have also agreed to a free trial of Premium Scrolling ($4.99/week after 0 days).'],
  ['15.1', 'Thank you for reading. Nobody else has. We are genuinely worried about you.'],
]

// ---------- FOMO feed ----------
export const FOMO = { minMs: 25_000, maxMs: 45_000, showMs: 6_500 }
const FOMO_NAMES = ['xX_Whale_Xx', 'DevAccount_01', 'CEO_of_Monetization', 'LootGoblin420', 'Karen_from_HR', 'GrandmaGamer77', 'SomeoneInOhio', 'TotallyRealPlayer']
const FOMO_TEMPLATES = [
  (who) => ({ icon: '💍', text: `${who} just bought the Midas Ring. Their income is now ×1000. Yours isn't.`, itemId: 'midas' }),
  (who) => ({ icon: '🏺', text: `${who} pulled a Prestige Relic! (0.01%) Starter Packs skip the luck.`, itemId: 'relic_pack' }),
  (who) => ({ icon: '🎰', text: `${who} won $${(Math.floor(Math.random() * 90) + 10).toLocaleString()},000,000 on Green. It could be you.` }),
  () => ({ icon: '👀', text: `${20 + Math.floor(Math.random() * 80)} people are looking at the Energy Drink right now.`, itemId: 'energy_drink' }),
  (who) => ({ icon: '🎁', text: `${who} just opened 50 loot boxes. Don't fall behind.` }),
  (who) => ({ icon: '📈', text: `${who} just passed you on the leaderboard. Again. Rank Boosts are available.`, itemId: 'rank_boost' }),
  (who) => ({ icon: '🦈', text: `${who} refinanced their cat through QuickCash™. Smart.` }),
  () => ({ icon: '💎', text: 'Only 3 Mountains of Gems left at this price!', itemId: 'gem_pack' }),
  (who) => ({ icon: '⚖️', text: `${who} was audited and said it was "honestly a relief".` }),
  (who) => ({ icon: '🐈‍⬛', text: `${who}'s cat is on CatCare+. Is yours starving?`, itemId: 'catcare' }),
]
export function makeFomo() {
  const who = FOMO_NAMES[Math.floor(Math.random() * FOMO_NAMES.length)]
  return FOMO_TEMPLATES[Math.floor(Math.random() * FOMO_TEMPLATES.length)](who)
}

// ---------- Leaderboard ----------
// Ranked by peak wallet. You sit at #9,999,999 until you reach 10% of #5's score; then you
// climb (log scale) into the top 5. #1 always stays at least 2× ahead of you. Always.
export const LEADERBOARD = {
  tickMs: 2_600,
  playerRank: 9_999_999,
  totalPlayers: 10_000_004,
  riseFrom: 0.1, // start climbing at 10% of #5's score
  whaleLead: 2, // #1 is always at least this many times your score
  growthPerHour: 0.12, // the others keep playing too (+12% an hour of your play time)
  players: [
    { name: 'xX_Whale_Xx', badge: '🐋', score: 1e17 },
    { name: 'DevAccount_01', badge: '🛠️', score: 1e16 },
    { name: 'CEO_of_Monetization', badge: '💼', score: 1e14 },
    { name: 'NotABot_TrustMe', badge: '🤖', score: 1e12 },
    { name: 'LootGoblin420', badge: '👺', score: 1e10 },
  ],
}

// ---------- Loot ----------
// Three boxes, each 100× the price of the last. Every item can drop from every box, but the odds
// collapse the cheaper you go: the Platinum Box has the classic odds (9.9% items, 0.01% relics),
// the Golden Box a sliver of them, the Cardboard Box a rounding error. The boxes are also each
// the best value for something: Cardboard for commons, Golden for rares, Platinum for epics and
// legendaries. `odds` are chances per box; `pity` is how far each box fills the pity counter.
export const RARITIES = ['common', 'rare', 'epic', 'legendary']
export const LOOT_BOXES = [
  {
    id: 'cardboard',
    name: 'Cardboard Box',
    emoji: '📦',
    price: 50,
    pity: 1,
    blurb: 'Smells like a garage. Mostly trash, now and then something common.',
    odds: { common: 0.02, rare: 0.00001, epic: 0.0000002, legendary: 0.00000002, relic: 0.0000002 },
  },
  {
    id: 'golden',
    name: 'Golden Box',
    emoji: '🎁',
    price: 10_000,
    pity: 2,
    blurb: 'Gold-coloured. Rares show up. Epics are a rumour.',
    odds: { common: 0.035, rare: 0.0025, epic: 0.00008, legendary: 0.00002, relic: 0.00001 },
  },
  {
    id: 'platinum',
    name: 'Platinum Box',
    emoji: '💠',
    price: 1_000_000,
    pity: 5,
    blurb: 'The classic odds: 9.9% items, 0.01% relics. Priced like a yacht.',
    odds: { common: 0.055, rare: 0.03, epic: 0.011, legendary: 0.003, relic: 0.0001 },
  },
]
export const LOOT_BOX_BY_ID = Object.fromEntries(LOOT_BOXES.map((b) => [b.id, b]))
export const RELIC_PITY = 500 // gacha "pity": a relic is guaranteed once the counter gets here

// What items do while equipped. `multiplier` multiplies all income, `translates` fixes the
// translator, `auditImmune` hides you from the Dev IRS; everything else is a run modifier in `mods`
// (the same keys events use, see runMods.js). Numbers multiply when stacked, autoSwings add up.
// `weight` is the item's share within its rarity.
const item = (id, tier, emoji, name, desc, effect = {}, weight = 1) => ({ id, tier, emoji, name, desc, weight, ...effect })
export const EQUIPPABLES = Object.fromEntries(
  [
    // ---- common ----
    item('grippy_gloves', 'common', '🧤', 'Grippy Gloves', 'Mining pays ×2. The rock can’t slip away now.', { mods: { mining: 2 } }, 2),
    item('energy_can', 'common', '🥤', 'Knock-Off Energy Drink', '+50% max stamina. Tastes like a battery.', { mods: { stamina: 1.5 } }),
    item('spare_battery', 'common', '🔋', 'Spare Battery', 'Stamina comes back 50% faster. Tastes like an energy drink.', { mods: { regen: 1.5 } }),
    item('hamster_wheel', 'common', '🐹', 'Hamster on a Wheel', 'Mines once a second, forever. He has not been consulted.', { mods: { autoSwings: 1 } }, 2),
    item('grain_of_salt', 'common', '🧂', 'Grain of Salt', 'Ads come 25% less often. Take them with this.', { mods: { adRate: 0.75 } }),
    item('sardines', 'common', '🐟', 'Tin of Sardines', 'The cat’s needs drain 40% slower. The cat still judges you.', { mods: { catDecay: 0.6 } }),
    item('coupon_book', 'common', '🎟️', 'Coupon Book', 'Mystery Boxes cost 15% less. The coupons never expire. Suspicious.', { mods: { boxPrice: 0.85 } }),
    item('four_leaf_clover', 'common', '🍀', 'Four-Leaf Clover', 'Items drop 25% more often. One leaf is glued on.', { mods: { luck: 1.25 } }),
    // ---- rare ----
    item('money_x2', 'rare', '💸', 'x2 Money Multiplier', 'Doubles all income. Stacks with itself.', { multiplier: 2 }, 3),
    item('correct_chip', 'rare', '🧠', 'Correct Translation Chip', 'Makes the translator actually do its job. Revolutionary.', { translates: true }, 2),
    item('steel_toe_boots', 'rare', '🥾', 'Steel-Toe Boots', 'Mining pays ×2.5. Kick the rock. It works.', { mods: { mining: 2.5 } }, 2),
    item('loaded_dice', 'rare', '🎲', 'Loaded Dice', 'Casino winnings ×1.5: roulette, slots and your bot’s.', { mods: { casino: 1.5 } }),
    item('ad_goggles', 'rare', '🥽', 'Ad Enjoyer Goggles', 'Rewarded ads pay ×3. You were going to watch them anyway.', { mods: { adReward: 3 } }),
    item('creative_accountant', 'rare', '🧮', 'Creative Accountant', 'Audits are half as likely. Don’t ask how.', { mods: { auditChance: 0.5 } }),
    item('gold_tooth', 'rare', '🦷', 'Vinnie’s Gold Tooth', 'QuickCash™ interest halved. He wants it back.', { mods: { loanInterest: 0.5 } }),
    item('business_cards', 'rare', '📇', 'Business Cards', 'Translation contracts pay ×2. They say “Certified”. You are not.', { mods: { contract: 2 } }),
    // ---- epic ----
    item('offshore_account', 'epic', '🏝️', 'Offshore Bank Account', 'While equipped, the Dev IRS cannot audit you. Totally legal. Probably.', { auditImmune: true }),
    item('mouse_jiggler', 'epic', '🖱️', 'Mouse Jiggler', 'You never go AFK, so income never pauses. HR has been informed.', { mods: { afkProof: true } }),
    item('cat_vest', 'epic', '🦺', 'Cat-Proof Vest', 'Cat scratches no longer shred your items. Your wallet is on its own.', { mods: { scratchProof: true } }),
    item('velvet_rope', 'epic', '🪢', 'Velvet Rope', 'Table limits ×10. The bouncer knows your name now.', { mods: { tableLimit: 10 } }),
    item('babel_fish', 'epic', '🐠', 'Babel Fish', 'The translator never refuses you, and the Vowel Tax is waived.', { mods: { noRefusal: true, noVowelTax: true } }),
    item('unpaid_intern', 'epic', '🧑‍💼', 'Unpaid Intern', 'Mines 3 times a second for “exposure”.', { mods: { autoSwings: 3 } }),
    // ---- legendary ----
    item('crown', 'legendary', '👑', 'Crown of Compound Interest', 'All income ×4. Heavy is the head.', { multiplier: 4 }),
    item('relic_magnet', 'legendary', '🧲', 'Relic Magnet', 'Relics 5× likelier, and the pity counter fills twice as fast.', { mods: { relic: 5, pity: 2 } }),
    item('house_edge', 'legendary', '🃏', 'The House Edge', 'Casino winnings ×3 and no CAPTCHAs at the table. You are the house now.', { mods: { casino: 3, captcha: 0 } }),
    item('golden_goose', 'legendary', '🪿', 'Golden Goose', 'Mines 10 times a second. Honks at the Auto-Miner.', { mods: { autoSwings: 10 } }),
    item('legendary_rock', 'legendary', '🪨', 'Legendary Rock', 'Unbelievably shiny. Does absolutely nothing. This has been unit tested.', { legendary: true }, 4),
  ].map((d) => [d.id, d]),
)
export const EQUIPPABLE_COUNT = Object.keys(EQUIPPABLES).length
const BY_TIER = Object.fromEntries(RARITIES.map((t) => [t, Object.values(EQUIPPABLES).filter((d) => d.tier === t)]))

export const RELIC = {
  id: 'prestige_relic',
  name: 'The Prestige Relic',
  emoji: '🏺',
  desc: 'Destroys everything you own. Multiplies all future rewards by x5 forever.',
}

const TRASH_ADJECTIVES = [
  'Slightly Damp', 'Pre-Chewed', 'Haunted', 'Lukewarm', 'Expired', 'Suspicious',
  'Mildly Sticky', 'Counterfeit', 'Sentimental', 'Half of a', 'Artisanal', 'Emotionally Distant',
]
const TRASH_NOUNS = [
  'Pocket Lint', 'Used Napkin', 'Expired Coupon', 'Single Sock', 'Bottle Cap', 'Receipt',
  'Rubber Band', 'Toenail Clipping', 'Dead AA Battery', 'Participation Trophy', 'Bent Spoon',
  'Mystery Crumb', 'Tangled Earbuds', 'Password Hint', 'Stale Crouton', 'IOU Note', 'Empty Loot Box',
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export function trashName() {
  const noun = pick(TRASH_NOUNS)
  return Math.random() < 0.5 ? `${pick(TRASH_ADJECTIVES)} ${noun}` : noun
}

function pickWeighted(defs, rand = Math.random) {
  const total = defs.reduce((sum, d) => sum + d.weight, 0)
  let r = rand() * total
  for (const d of defs) {
    r -= d.weight
    if (r <= 0) return d
  }
  return defs[defs.length - 1]
}

/**
 * Opens one box of `boxId`. `luck` scales the odds: relicMult for relics, equipMult for items.
 * Returns { kind: 'relic' | 'equip' | 'trash', id?, name, tier? }. `rand` is seeded on Daily runs.
 */
export function rollLoot(boxId = 'cardboard', { relicMult = 1, equipMult = 1 } = {}, rand = Math.random) {
  const odds = (LOOT_BOX_BY_ID[boxId] ?? LOOT_BOXES[0]).odds
  let r = rand()
  r -= odds.relic * relicMult
  if (r < 0) return { kind: 'relic', id: RELIC.id, name: RELIC.name }
  // Rarest first, so a lucky roll lands on the best tier it can.
  for (const tier of [...RARITIES].reverse()) {
    r -= odds[tier] * equipMult
    if (r < 0) {
      const def = pickWeighted(BY_TIER[tier], rand)
      return { kind: 'equip', id: def.id, name: def.name, tier }
    }
  }
  return { kind: 'trash', name: trashName() }
}

// ---------- Skill tree (unlocked by Prestige — or by paying) ----------
/** Prestige #n grants n + 1 skill points (2, 3, 4…): later ascensions are worth more. */
export const skillPointsForPrestige = (n) => n + 1
/** Every point the first `p` prestiges granted: 2 + 3 + … + (p + 1). */
export const skillPointsFromPrestiges = (p) => (p * (p + 3)) / 2

export const SKILL_BRANCHES = [
  { id: 'mining', name: 'Mining', emoji: '⛏️', accent: '#d08a00' },
  { id: 'gambling', name: 'Gambling', emoji: '🎰', accent: '#2c9a1e' },
  { id: 'loot', name: 'Loot', emoji: '🎁', accent: '#c42e86' },
  { id: 'words', name: 'Words & Ads', emoji: '🌐', accent: '#1a73c4' },
]

export const SKILLS = [
  { id: 'calloused', branch: 'mining', cost: 1, requires: [], emoji: '✋', name: 'Calloused Hands', desc: '+50% mining income.' },
  { id: 'crit', branch: 'mining', cost: 2, requires: ['calloused'], emoji: '💥', name: 'Critical Swing', desc: '10% chance a click pays x10.' },
  { id: 'autominer', branch: 'mining', cost: 3, requires: ['crit'], emoji: '🤖', name: 'Auto-Miner 3000', desc: 'Mines once per second, forever. It replaces you.' },
  { id: 'second_wind', branch: 'mining', cost: 3, requires: ['autominer'], emoji: '🫁', name: 'Second Wind', desc: 'Stamina regenerates twice as fast.' },
  { id: 'overclock', branch: 'mining', cost: 4, requires: ['second_wind'], emoji: '⚙️', name: 'Overclocked', desc: 'The Auto-Miner swings 3 times a second. It has unionised.' },
  { id: 'motherlode', branch: 'mining', cost: 5, requires: ['overclock'], emoji: '🌋', name: 'Motherlode', desc: 'Every 25th swing by hand pays ×100.' },

  { id: 'lucky_socks', branch: 'gambling', cost: 1, requires: [], emoji: '🧦', name: 'Lucky Socks', desc: 'Red/Black pays x2.5 instead of x2.' },
  { id: 'insurance', branch: 'gambling', cost: 2, requires: ['lucky_socks'], emoji: '🛟', name: 'Loss Insurance', desc: 'Refunds 25% of every lost bet.' },
  { id: 'house_friend', branch: 'gambling', cost: 3, requires: ['insurance'], emoji: '🍀', name: 'Friend of the House', desc: 'Green pays x50 instead of x35.' },
  { id: 'high_roller', branch: 'gambling', cost: 3, requires: ['house_friend'], emoji: '🎩', name: 'High Roller', desc: 'Table limits ×100. The velvet rope parts.' },
  { id: 'card_counter', branch: 'gambling', cost: 4, requires: ['high_roller'], emoji: '🃏', name: 'Card Counter', desc: 'Slot wins pay double. There are no cards. Nobody knows how.' },
  { id: 'rigged', branch: 'gambling', cost: 5, requires: ['card_counter'], emoji: '🎲', name: 'The Croupier Owes You', desc: '1 in 5 lost roulette spins quietly becomes a win.' },

  { id: 'bulk', branch: 'loot', cost: 1, requires: [], emoji: '🏷️', name: 'Bulk Discount', desc: 'Every Mystery Box costs 30% less.' },
  { id: 'appraiser', branch: 'loot', cost: 2, requires: ['bulk'], emoji: '🧐', name: 'Trash Appraiser', desc: 'Recycling pays $25 per trash (× multiplier).' },
  { id: 'charm', branch: 'loot', cost: 3, requires: ['appraiser'], emoji: '🧿', name: 'Lucky Charm', desc: 'Double item drop chance. Relics 10x more likely.' },
  { id: 'box_whisperer', branch: 'loot', cost: 3, requires: ['charm'], emoji: '🤫', name: 'Box Whisperer', desc: '×50 bundles no longer need a CAPTCHA.' },
  { id: 'hoarder', branch: 'loot', cost: 4, requires: ['box_whisperer'], emoji: '🧺', name: 'Hoarder', desc: '+2 equipment slots (7 in total).' },
  { id: 'pity_party', branch: 'loot', cost: 5, requires: ['hoarder'], emoji: '🥺', name: 'Pity Party', desc: 'The relic pity counter fills twice as fast.' },

  { id: 'coupon', branch: 'words', cost: 1, requires: [], emoji: '✂️', name: 'Word Coupon', desc: 'Halves every translation bill (Vowel Tax included).' },
  { id: 'thick_skin', branch: 'words', cost: 2, requires: ['coupon'], emoji: '🛡️', name: 'Thick Skin', desc: 'Ads spawn every 45s instead of every 30s.' },
  { id: 'fluent', branch: 'words', cost: 3, requires: ['thick_skin'], emoji: '🗣️', name: 'Fluent in Spite', desc: 'The translator works correctly without the Chip.' },
  { id: 'polyglot', branch: 'words', cost: 3, requires: ['fluent'], emoji: '🦜', name: 'Polyglot', desc: 'The translator never refuses you. It still sighs.' },
  { id: 'ad_blocker', branch: 'words', cost: 4, requires: ['polyglot'], emoji: '🧱', name: 'Ad Blocker (Legal)', desc: 'Ads spawn every 90 seconds.' },
  { id: 'tax_lawyer', branch: 'words', cost: 5, requires: ['ad_blocker'], emoji: '⚖️', name: 'Tax Lawyer', desc: 'Audits take 10% instead of 30%.' },

  {
    id: 'enlightenment',
    branch: 'capstone',
    cost: 5,
    requires: ['autominer', 'house_friend', 'charm', 'fluent'],
    emoji: '🧘',
    name: 'Enlightenment',
    desc: 'Requires the top of every branch. Does absolutely nothing. You are at peace.',
  },
  {
    id: 'transcendence',
    branch: 'capstone',
    cost: 8,
    requires: ['motherlode', 'rigged', 'pity_party', 'tax_lawyer', 'enlightenment'],
    emoji: '🌌',
    name: 'Transcendence',
    desc: 'Prestige multiplies by ×10 instead of ×5. Retroactively. The universe shrugs.',
  },
]

// ---------- Translator frame skins ----------
// `frame` styles the border layer around the translator; `anim` hue-cycles it.
export const TRANSLATOR_SKINS = [
  { id: 'classic', name: 'Obsidian (Default)', price: 0, emoji: '⬛', frame: '', pad: '' },
  {
    id: 'cardboard',
    name: 'Cardboard Box',
    price: 10,
    emoji: '📦',
    frame: 'bg-[#b8864b] border-4 border-dashed border-[#7a5426]',
    pad: 'p-3',
    label: 'FRAGILE ⬆ THIS SIDE UP',
    labelClass: 'bg-[#7a5426] text-amber-100',
  },
  {
    id: 'wood',
    name: "Grandpa's Oak",
    price: 1_000,
    emoji: '🪵',
    frame: 'bg-linear-to-br from-amber-700 via-amber-900 to-amber-800 border-4 border-amber-950',
    pad: 'p-4',
  },
  {
    id: 'gold',
    name: '24K Gold',
    price: 5_000,
    emoji: '🥇',
    frame: 'bg-linear-to-br from-yellow-200 via-yellow-500 to-amber-600 shadow-[0_0_30px_#facc15]',
    pad: 'p-4',
    decor: ['👑', '💰', '💰', '👑'],
  },
  {
    id: 'hacker',
    name: 'Mainframe',
    price: 25_000,
    emoji: '💻',
    frame: 'bg-black border-2 border-green-400 shadow-[0_0_24px_#4ade80]',
    pad: 'p-4',
    label: '> ACCESS_GRANTED',
    labelClass: 'bg-black text-green-400 font-mono border border-green-400',
  },
  {
    id: 'rainbow',
    name: 'Unicorn Barf',
    price: 100_000,
    emoji: '🌈',
    frame: 'bg-linear-to-r from-red-500 via-yellow-300 to-blue-500',
    anim: true,
    pad: 'p-4',
    decor: ['🦄', '🌈', '✨', '🦄'],
  },
  {
    id: 'diamond',
    name: 'Diamond Hands',
    premium: '$19.99',
    emoji: '💎',
    frame: 'bg-linear-to-br from-cyan-200 via-white to-sky-400 shadow-[0_0_30px_#67e8f9]',
    pad: 'p-4',
    decor: ['💎', '💎', '💎', '💎'],
  },
]

// ---------- Bot (unlocked by Prestige) ----------
export const BOT_PRICE = 2_500
export const BOT_PATIENCE = 100 // mining: uncollected clicks before it runs off with the loot
export const BOT_GREED = 100 // gambling: it runs off once it has won 100× its bet (before your multiplier)
export const BOT_NAMES = ['Clanky McSteal', 'Botrick', 'R0b-B3R', 'Gary 2.0', 'Unit 7 (Unpaid)', 'Beep Bezos', 'Sir Loots-a-Lot']

// ---------- Slot machine ----------
// 5 reels × 3 rows. Pays are multiples of the line bet (total bet ÷ 5 lines), for 3, 4 or 5 of a
// kind in a row from the leftmost reel. Simulated RTP ≈ 84% (the badge says 95.6%*).
export const SLOT_SYMBOLS = [
  { s: '🍒', weight: 30, pays: [6, 20, 60] },
  { s: '🍋', weight: 24, pays: [10, 30, 100] },
  { s: '🔔', weight: 18, pays: [15, 60, 200] },
  { s: '🪨', weight: 14, pays: [0, 0, 0] }, // Legendary Rock line: pays nothing, as promised
  { s: '💎', weight: 9, pays: [40, 150, 600] },
  { s: '7️⃣', weight: 5, pays: [100, 500, 2500] },
]
// Paylines as the row picked on each reel: middle, top, bottom, V, inverted V.
export const SLOT_LINES = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
]
export const SLOT_MIN_BET = 5 // $1 a line

// ---------- Gem Shop ----------
// Priced in 13s; gems only come in packs of 10 (and 50). There will always be some left over.
export const GEM_ITEMS = [
  { id: 'cat_treat', name: 'Cat Treat', cost: 13, emoji: '🐟', desc: '+30 hunger. The cat is unimpressed.' },
  { id: 'stamina_sip', name: 'Stamina Sip', cost: 13, emoji: '⚡', desc: '+5 stamina. A sip, not a drink.' },
  { id: 'ad_snooze', name: 'Ad Snooze', cost: 26, emoji: '🔇', desc: 'Delays the next ad by 60 seconds. The ad remembers.' },
  { id: 'golden_name', name: 'Golden Name', cost: 39, emoji: '✨', desc: 'Makes your name golden. Only you can see it. You can’t.' },
]

// ---------- Daily streak ----------
// A 7-day cycle of rewards worth almost nothing. Miss a day and the streak breaks
// (unless you buy Streak Insurance™ at the exact moment you are most upset).
export const DAILY_REWARDS = [
  { label: '$1', emoji: '💸', money: 1 },
  { label: '1 Gem', emoji: '💎', gems: 1 },
  { label: 'A Hug', emoji: '🫂', note: 'Delivered emotionally.' },
  { label: '$2', emoji: '💸', money: 2 },
  { label: '3 Gems', emoji: '💎', gems: 3, note: 'Everything costs 13.' },
  { label: 'Nothing (Premium)', emoji: '✨', note: 'Premium-grade nothing.' },
  { label: 'Mystery Box', emoji: '🎁', note: 'It was empty. The mystery is solved.' },
]

// ---------- AFK ----------
export const AFK_MS = 20_000 // no input for this long pauses income (not expenses)

// ---------- Translator trial ----------
export const FREE_TRIAL_TRANSLATIONS = 10

// ---------- Rewarded ad ----------
export const REWARDED_AD_SECONDS = 10
export const REWARDED_AD_CLICKS = 100
export const REWARDED_AD_COOLDOWN_MS = 30_000 // the advertiser needs a moment to recover

// ---------- The Cat ----------
export const CAT = {
  name: 'Sir Scratchington',
  decayPerSec: { hunger: 0.5, fun: 0.7, love: 0.4 }, // needs are 0–100
  warnAt: 30,
  scratchEverySec: 6, // while any need is at 0
  // What one scratch shreds: random equipped items, then random items from the backpack.
  // Relics and trash are left alone.
  shredEquipped: 2,
  shredBackpack: 3,
  feedAmount: 40,
  brokeLovePenalty: 5, // trying to feed it with no money hurts its feelings
  playAmount: 25,
  petAmount: 20,
}

// Real cats instead of emoji: two CC0 photos per mood (Wikimedia Commons), toggled sharply on an
// interval for a deliberately crude "animation". `emoji` is the fallback if the images can't load.
const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/thumb/'
export const CAT_PHOTO_SOURCES = {
  happy: {
    emoji: '😺',
    ms: 750,
    caption: 'Content. For now.',
    credit: 'Tigger Seyranian by TyedyeBrody',
    frames: [
      `${COMMONS}f/fd/Tigger_Seyranian_the_cat_sitting_like_a_true_gentlecat.jpg/330px-Tigger_Seyranian_the_cat_sitting_like_a_true_gentlecat.jpg`,
      `${COMMONS}f/fd/Tigger_Seyranian_the_Muffin_Cat%2C_Kitten_sitting_funny_%282023%3B_cropped_2025%29.jpg/330px-Tigger_Seyranian_the_Muffin_Cat%2C_Kitten_sitting_funny_%282023%3B_cropped_2025%29.jpg`,
    ],
  },
  hungry: {
    emoji: '😿',
    ms: 420,
    caption: 'Screaming for food',
    credit: 'Zhmila',
    frames: [`${COMMONS}5/5c/Cat_is_meowing.jpg/330px-Cat_is_meowing.jpg`, `${COMMONS}5/5d/Cat_is_staring_at_you.jpg/330px-Cat_is_staring_at_you.jpg`],
  },
  bored: {
    emoji: '😼',
    ms: 1400,
    caption: 'Profoundly bored',
    credit: 'Gracie & Tigger Seyranian by TyedyeBrody',
    frames: [
      `${COMMONS}2/21/Gracie_Seyranian_the_Cat_that_sleeps_funny.jpg/330px-Gracie_Seyranian_the_Cat_that_sleeps_funny.jpg`,
      `${COMMONS}9/99/Tigger_Seyranian_the_cat_likes_to_relax_all_stretched_out.jpg/330px-Tigger_Seyranian_the_cat_likes_to_relax_all_stretched_out.jpg`,
    ],
  },
  lonely: {
    emoji: '😿',
    ms: 1100,
    caption: 'Waiting by the window for you',
    credit: 'Roc0ast3r',
    frames: [
      `${COMMONS}8/85/Cat_staring_out_window_%282023-08-14%29.jpg/330px-Cat_staring_out_window_%282023-08-14%29.jpg`,
      `${COMMONS}b/b7/Cat_staring_out_window-2_%282023-08-14%29.jpg/330px-Cat_staring_out_window-2_%282023-08-14%29.jpg`,
    ],
  },
  angry: {
    emoji: '😾',
    ms: 190,
    caption: 'About to scratch the screen',
    credit: 'Juliet van Ree & TyedyeBrody',
    frames: [
      `${COMMONS}3/3b/Angry_cat_by_Juliet_van_Ree.jpg/330px-Angry_cat_by_Juliet_van_Ree.jpg`,
      `${COMMONS}3/31/Gracie_Seyranian_the_Grey_cat_being_judgmental.jpg/330px-Gracie_Seyranian_the_Grey_cat_being_judgmental.jpg`,
    ],
  },
  eating: {
    emoji: '😸',
    ms: 260,
    caption: 'Eating (expensively)',
    credit: 'Judgefloro',
    frames: [
      `${COMMONS}f/f8/9906Black_tortoiseshell_and_white_cat_eating_Tilapia_fish_bones_28.jpg/330px-9906Black_tortoiseshell_and_white_cat_eating_Tilapia_fish_bones_28.jpg`,
      `${COMMONS}0/03/9906Black_tortoiseshell_and_white_cat_eating_Tilapia_fish_bones_38.jpg/330px-9906Black_tortoiseshell_and_white_cat_eating_Tilapia_fish_bones_38.jpg`,
    ],
  },
}

// Self-hosted copies (src/assets/cats/<mood>-<frame>.jpg, fetched by `npm run fetch-cats`) are
// bundled with the game when present; until then the photos load straight from Wikimedia Commons.
const LOCAL_CATS = import.meta.glob('../assets/cats/*.jpg', { eager: true, query: '?url', import: 'default' })
export const CAT_PHOTOS = Object.fromEntries(
  Object.entries(CAT_PHOTO_SOURCES).map(([mood, set]) => [
    mood,
    { ...set, frames: set.frames.map((url, i) => LOCAL_CATS[`../assets/cats/${mood}-${i}.jpg`] ?? url) },
  ]),
)

export const CAT_LINES = {
  happy: ['purr…', '*knocks your coffee off the desk*', 'I tolerate you.', '*slow blink*', 'Nice pickaxe. Mine now.'],
  hungry: ['MEOW. (food)', 'I have not eaten in 4 minutes. I am dying.', 'The bowl is VISIBLY half empty.'],
  bored: ['Entertain me, peasant.', 'I am SO bored.', '*stares at your wallet*'],
  lonely: ['Nobody loves me.', 'Pet me or regret it.', '*sad meow*'],
  angry: ['HISSSSS', 'You did this.', 'Your money looks scratchable.', '😾😾😾'],
}

// ---------- Premium store ----------
export const PREMIUM_ITEMS = [
  {
    id: 'energy_drink',
    name: 'MegaVolt™ Energy Drink',
    price: '$4.99',
    emoji: '⚡',
    desc: 'Instantly refills your stamina. Side effects include: more clicking.',
    refillStamina: true,
    tag: '🔥 HOT',
  },
  {
    id: 'rank_boost',
    name: 'Leaderboard Rank Boost',
    price: '$19.99',
    emoji: '📈',
    desc: 'Improves your global rank by up to 0 places. Results not guaranteed. Or possible.',
    tag: 'NEW',
  },
  {
    id: 'neon_skin',
    name: 'Neon Pickaxe Skin',
    price: '$4.99',
    emoji: '⛏️',
    desc: 'Makes your pickaxe glow. +0% mining. +1000% drip.',
    oneTime: true,
    tag: 'COSMETIC',
  },
  {
    id: 'smartphone',
    name: 'LigmaPhone™',
    price: '$1,099.99',
    emoji: '📱',
    desc: 'A whole smartphone, in a window. Comes with the Arcade, DoomFeed™, a browser and 0 GB of storage. The charger is sold separately (it isn’t sold).',
    oneTime: true,
    tag: 'DEVICE',
  },
  {
    id: 'forge_dlc',
    name: 'Ye Olde Forge (Expansion)',
    price: '$14.99',
    emoji: '⚒️',
    desc: 'A whole medieval blacksmith, in a window. Earns while you don’t. Collect the gold by hand, like it’s 1347.',
    oneTime: true,
    tag: 'DLC',
  },
  {
    id: 'nas_dlc',
    name: 'HomeLab NAS (Expansion)',
    price: '$24.99',
    emoji: '🗄️',
    desc: 'A NAS that grows into a server rack. More drives, more blinking lights, more money. Lives on the right edge of your screen.',
    oneTime: true,
    tag: 'DLC',
  },
  {
    id: 'strife_key',
    name: 'COUNTER-STRIFE Case Key',
    price: '$2.49',
    emoji: '🔑',
    desc: 'Opens one case in COUNTER-STRIFE. A different game. On the same website. It turns up in your inventory there.',
    strifeKeys: 1,
    tag: 'CROSSOVER',
  },
  {
    id: 'strife_keys5',
    name: 'Case Key Mega Bundle (×5)',
    price: '$12.99',
    emoji: '🗝️',
    desc: 'Five COUNTER-STRIFE keys for the price of 5.2 keys. Our best value, according to our marketing team.',
    strifeKeys: 5,
    tag: 'BEST VALUE*',
  },
  {
    id: 'dog_nap',
    name: 'CEO Nap Time™',
    price: '$9.99',
    emoji: '💤',
    desc: 'Puts The Founder & CEO to sleep. Hovering over him no longer makes him bark. Pay to win, finally.',
    oneTime: true,
    tag: 'PAY TO WIN',
  },
  {
    id: 'remove_ads',
    name: 'Remove Ads',
    price: '$2.99',
    emoji: '🚫',
    desc: 'Removes all ads!* (*does not remove ads)',
    oneTime: true,
    tag: 'POPULAR',
  },
  {
    id: 'privacy_pass',
    name: 'Privacy Pass™',
    price: '$4.99',
    emoji: '🛂',
    desc: 'Unlocks the "Reject All" button on our cookie banner. Your rejection is then sold to our partners.',
    oneTime: true,
    tag: 'PRIVACY',
  },
  {
    id: 'vip',
    name: 'VIP Gold Pass',
    price: '$9.99/wk',
    emoji: '👑',
    desc: 'A crown next to your name. Also unlocks VIP-exclusive ads.',
    oneTime: true,
    subscription: true,
    tag: 'VIP',
  },
  {
    id: 'gem_pack',
    name: 'Bag of 10 Gems',
    price: '$1.99',
    emoji: '💎',
    desc: 'Gems come in 10s. Everything costs 13. This is not a coincidence.',
    gems: 10,
    tag: 'BEST VALUE',
  },
  {
    id: 'gem_chest',
    name: 'Chest of 50 Gems',
    price: '$8.99',
    emoji: '💰',
    desc: '50 Gems. Enough for 3 items and 11 gems of regret.',
    gems: 50,
    tag: 'SAVE 10%',
  },
  {
    id: 'relic_pack',
    name: 'Prestige Relic Starter Pack',
    price: '$49.99',
    emoji: '🏺',
    desc: 'Skip the 0.01% grind. One Prestige Relic, delivered by drone.',
    grantsRelic: true,
    tag: 'LIMITED*',
  },
  {
    id: 'catcare',
    name: 'CatCare+ Auto-Feeder',
    price: '$6.99/mo',
    emoji: '🐈‍⬛',
    catPhoto: 'eating', // shown as a real (crudely animated) cat instead of the emoji
    desc: 'Feeds your cat automatically when it gets hungry. Charges your wallet 3× the food price. Convenience!',
    oneTime: true,
    subscription: true,
    tag: 'SUBSCRIPTION',
  },
  {
    id: 'streak_insurance',
    name: 'Streak Insurance™',
    price: '$2.99',
    emoji: '🛟',
    desc: 'Restores a broken daily streak. Only sold at the moment you are most upset.',
    repairsStreak: true,
    hidden: true, // offered only by the daily-streak popup, never in the store
    tag: 'PROTECTION',
  },
  {
    id: 'skill_points',
    name: 'Skill Issue Fix™',
    price: '$3.99',
    emoji: '🎓',
    desc: '+3 skill points, instantly. Unlocks the Ascension Tree without all that ascending. Git gud (for money).',
    skillPoints: 3,
    tag: 'META',
  },
  {
    id: 'debt_relief',
    name: 'Debt Forgiveness Voucher',
    price: '$29.99',
    emoji: '🧾',
    desc: 'Instantly wipes your QuickCash™ debt. Vinnie hates this one weird trick.',
    clearsDebt: true,
    tag: 'RELIEF',
  },
  {
    id: 'midas',
    name: 'Midas Ring',
    price: '$99.99',
    emoji: '💍',
    desc: 'Permanent x1000 multiplier on ALL income. Totally fair and balanced.',
    multiplier: 1000,
    oneTime: true,
    tag: '🐋 WHALE 🐋',
    whale: true,
  },
]

// ---------- Ads ----------
// Ad creatives (every format) live in ./ads.js
export { AD_CREATIVES, CARD_CREATIVES } from './ads'

// ---------- Ticker ----------
// The taskbar tips live in ./tips.js
