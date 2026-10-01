// Roguelike mode: every run deals you 3 perks, 3 debuffs and one ending you have to reach. Reach
// a different ending and the run is lost. The target is an ending this account hasn't completed
// yet (online accounts remember theirs across devices; guests use this browser's endings).
//
// Perks and debuffs are run modifiers (the same keys as events, Daily Challenges and NG+ curses,
// see runMods.js), plus a few of their own: start* (what you begin with), cls (a look put on the
// page), and toys (fly, clippy, barky).

export const PERKS = [
  { id: 'iron_wrists', icon: '💪', name: 'Iron Wrists', desc: 'Mining pays double.', mods: { mining: 2 } },
  { id: 'insider', icon: '🎰', name: 'Insider Trading', desc: 'Casino winnings ×1.5.', mods: { casino: 1.5 } },
  { id: 'box_whisperer', icon: '📦', name: 'Box Discount', desc: 'Loot boxes cost half.', mods: { boxPrice: 0.5 } },
  { id: 'lucky', icon: '🍀', name: 'Lucky Socks', desc: 'Items drop twice as often.', mods: { luck: 2 } },
  { id: 'relic_radar', icon: '📡', name: 'Relic Radar', desc: 'Relics are five times as likely.', mods: { relic: 5 } },
  { id: 'pity_pass', icon: '🥺', name: 'Pity Pass', desc: 'The relic pity meter fills twice as fast.', mods: { pity: 2 } },
  { id: 'real_blocker', icon: '🛡️', name: 'An Ad Blocker That Works', desc: 'Ads arrive half as often.', mods: { adRate: 0.5 } },
  { id: 'paid_viewer', icon: '📺', name: 'Paid Viewer', desc: 'Rewarded ads pay three times as much.', mods: { adReward: 3 } },
  { id: 'linkedin', icon: '💼', name: 'LinkedIn Premium', desc: 'Translation contracts pay double.', mods: { contract: 2 } },
  { id: 'coupons', icon: '✂️', name: 'Coupon Clipper', desc: 'Every price is 25% lower.', mods: { priceMult: 0.75 } },
  { id: 'free_speech', icon: '🗣️', name: 'Free Speech', desc: 'Translations cost half.', mods: { translatePrice: 0.5 } },
  { id: 'high_roller', icon: '🎩', name: 'VIP Table', desc: 'The table limit is ten times higher.', mods: { tableLimit: 10 } },
  { id: 'big_lungs', icon: '🫁', name: 'Big Lungs', desc: 'Double the stamina.', mods: { stamina: 2 } },
  { id: 'power_nap', icon: '😴', name: 'Power Nap', desc: 'Stamina comes back twice as fast.', mods: { regen: 2 } },
  { id: 'hamsters', icon: '🐹', name: 'Hamster Wheel', desc: 'Two free pickaxe swings every second.', mods: { autoSwings: 2 } },
  { id: 'tax_evasion', icon: '🏝️', name: 'Offshore Account', desc: 'No audits, ever.', mods: { noAudits: true } },
  { id: 'vowel_amnesty', icon: '🅰️', name: 'Vowel Amnesty', desc: 'No vowel tax.', mods: { noVowelTax: true } },
  { id: 'polite_ai', icon: '🤖', name: 'Polite AI', desc: 'TranslatrAI™ never refuses.', mods: { noRefusal: true } },
  { id: 'low_interest', icon: '🦈', name: 'Vinnie Likes You', desc: 'Loan interest is halved.', mods: { loanInterest: 0.5 } },
  { id: 'chill_cat', icon: '😺', name: 'Chill Cat', desc: 'The cat’s needs drain half as fast.', mods: { catDecay: 0.5 } },
  { id: 'cat_sponsor', icon: '🐟', name: 'Sponsored Cat', desc: 'Cat food is free.', mods: { freeFood: true } },
  { id: 'vest', icon: '🦺', name: 'Scratch-Proof Vest', desc: 'The cat can’t scratch you.', mods: { scratchProof: true } },
  { id: 'afk_shield', icon: '🛋️', name: 'Remote Worker', desc: 'Going AFK doesn’t pause your income.', mods: { afkProof: true } },
  { id: 'trust_fund', icon: '🏦', name: 'Trust Fund', desc: 'Start with $50,000.', start: { money: 50_000 } },
  { id: 'gem_stash', icon: '💎', name: 'Gem Stash', desc: 'Start with 39 gems.', start: { gems: 39 } },
  { id: 'skill_solved', icon: '🌳', name: 'Skill Issue (Solved)', desc: 'Start with 3 skill points.', start: { skillPoints: 3 } },
  { id: 'nepo_pickaxe', icon: '⛏️', name: 'Nepo Pickaxe', desc: 'Start with a level 5 pickaxe.', start: { pickaxe: 5 } },
  { id: 'forge_heir', icon: '⚒️', name: 'Forge Inheritance', desc: 'Start owning Ye Olde Forge.', start: { expansion: 'forge' } },
  { id: 'server_key', icon: '🗄️', name: 'Server Room Key', desc: 'Start owning the HomeLab NAS.', start: { expansion: 'nas' } },
  { id: 'crypto_whisper', icon: '📈', name: 'Crypto Whisperer', desc: 'Your coins go up a bit more often than down.', cryptoBias: 0.1 },
  { id: 'captcha_pass', icon: '✅', name: 'Verified Human', desc: 'CAPTCHAs show up a quarter as often.', mods: { captcha: 0.25 } },
  { id: 'bargain_bin', icon: '🏷️', name: 'Clearance Sale', desc: 'TRANSLATR™ Inc. costs half.', mods: { companyPrice: 0.5 } },
]

export const DEBUFFS = [
  { id: 'fly', icon: '🪰', name: 'The Fly', desc: 'A fly buzzes around for 2 minutes, then lands on a window. That window is unusable for 5 minutes. Repeat.', toy: 'fly' },
  { id: 'inflation', icon: '💸', name: 'Inflation', desc: 'Every price is doubled.', mods: { priceMult: 2 } },
  { id: 'ad_hell', icon: '📢', name: 'Ad Hell', desc: 'Ads arrive twice as often.', mods: { adRate: 2 } },
  { id: 'feral_cat', icon: '😾', name: 'Feral Cat', desc: 'The cat’s needs drain twice as fast.', mods: { catDecay: 2 } },
  { id: 'audit_season', icon: '⚖️', name: 'Audit Season', desc: 'Audits are twice as likely.', mods: { auditChance: 2 } },
  { id: 'vinnie_mad', icon: '🦈', name: 'Vinnie’s Bad Day', desc: 'Loan interest doubles.', mods: { loanInterest: 2 } },
  { id: 'weak_wrists', icon: '🥀', name: 'Weak Wrists', desc: 'Mining pays 40% less.', mods: { mining: 0.6 } },
  { id: 'house_edge', icon: '🏠', name: 'The House Always Wins (More)', desc: 'Casino winnings ×0.6.', mods: { casino: 0.6 } },
  { id: 'gouging', icon: '📦', name: 'Box Gouging', desc: 'Loot boxes cost double.', mods: { boxPrice: 2 } },
  { id: 'unlucky', icon: '🐈‍⬛', name: 'Black Cat Crossed', desc: 'Items drop half as often.', mods: { luck: 0.5 } },
  { id: 'ad_fatigue', icon: '🚫', name: 'Ad Fatigue', desc: 'No rewarded ads.', mods: { noRewardedAds: true } },
  { id: 'ghosted', icon: '👻', name: 'Ghosted by Clients', desc: 'Contracts pay half.', mods: { contract: 0.5 } },
  { id: 'premium_words', icon: '🔤', name: 'Premium Words', desc: 'Translations cost double.', mods: { translatePrice: 2 } },
  { id: 'low_limit', icon: '🪙', name: 'Penny Slots Only', desc: 'The table limit is a quarter.', mods: { tableLimit: 0.25 } },
  { id: 'small_lungs', icon: '🚬', name: 'Small Lungs', desc: '40% less stamina.', mods: { stamina: 0.6 } },
  { id: 'insomnia', icon: '🌙', name: 'Insomnia', desc: 'Stamina comes back half as fast.', mods: { regen: 0.5 } },
  { id: 'bot_check', icon: '🤖', name: 'Are You A Robot?', desc: 'Three times the CAPTCHAs.', mods: { captcha: 3 } },
  { id: 'hostile_board', icon: '🏢', name: 'Hostile Board', desc: 'TRANSLATR™ Inc. costs three times as much.', mods: { companyPrice: 3 } },
  { id: 'rug_season', icon: '🧶', name: 'Rug Season', desc: 'Coins go down a bit more often than up.', cryptoBias: -0.1 },
  { id: 'rats', icon: '🐀', name: 'Rat Infestation', desc: '40% of loot boxes get eaten.', mods: { ratChance: 0.4 } },
  { id: 'slow_wheel', icon: '🐌', name: 'Slow Wheel', desc: 'The roulette wheel always spins five times slower.', mods: { slowRoulette: true } },
  { id: 'spam', icon: '📨', name: 'Inbox Zero (Never)', desc: 'Three times the spam mail.', mods: { spamRate: 3 } },
  { id: 'clippy', icon: '📎', name: 'Chatty Paperclip', desc: 'The paperclip won’t shut up.', toy: 'clippy' },
  { id: 'barky', icon: '🐕', name: 'Restless CEO', desc: 'The CEO barks at random. Nap Time™ doesn’t help.', toy: 'barky' },
  { id: 'tilt', icon: '📐', name: 'Tilted', desc: 'The whole screen is a bit crooked.', cls: 'rogue-tilt' },
  { id: 'comic_sans', icon: '🔠', name: 'Comic Sans', desc: 'Everything is in Comic Sans.', cls: 'rogue-comic' },
  { id: 'grayscale', icon: '🌫️', name: 'Seasonal Depression', desc: 'The game is in black and white.', cls: 'rogue-gray' },
  { id: 'flipped_wallet', icon: '🙃', name: 'Upside-Down Wallet', desc: 'Your wallet is upside down. The money is fine.', cls: 'rogue-flip-wallet' },
  { id: 'tiny_text', icon: '🔍', name: 'Tiny Text', desc: 'Everything is a bit smaller.', cls: 'rogue-tiny' },
  { id: 'smudged', icon: '👓', name: 'Smudged Glasses', desc: 'Everything is slightly blurry.', cls: 'rogue-blur' },
  { id: 'deep_fried', icon: '🍟', name: 'Deep Fried', desc: 'Saturation and contrast at 200%.', cls: 'rogue-fried' },
  { id: 'starting_debt', icon: '🧾', name: 'Student Loans', desc: 'Start owing Vinnie $25,000.', start: { debt: 25_000 } },
]

export const PERK_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p]))
export const DEBUFF_BY_ID = Object.fromEntries(DEBUFFS.map((d) => [d.id, d]))

/** Endings a run can ask for. (The snail's takes hours; it never comes up.) */
export const TARGET_POOL = ['buy', 'secret', 'slave', 'bankrupt', 'grass', 'taught', 'shooter', 'deleted']

/** Endings this account has completed (from the online account when signed in; else this device). */
export function completedEndings(s) {
  try {
    const account = JSON.parse(localStorage.getItem('translatr-account') ?? 'null')
    if (account && Array.isArray(account.endings)) return [...new Set([...account.endings, ...Object.keys(s.endings ?? {})])]
  } catch {
    // no account info: use this device's
  }
  return Object.keys(s.endings ?? {})
}

/** A fresh run: 3 perks, 3 debuffs, and an ending you haven't completed yet (any, once you have them all). */
export function draftRun(s, rand = Math.random) {
  const pick = (list, n) => {
    const pool = [...list]
    const out = []
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0].id)
    return out
  }
  const done = new Set(completedEndings(s))
  const fresh = TARGET_POOL.filter((id) => !done.has(id))
  const targets = fresh.length ? fresh : TARGET_POOL
  return {
    perks: pick(PERKS, 3),
    debuffs: pick(DEBUFFS, 3),
    target: targets[Math.floor(rand() * targets.length)],
    newTarget: fresh.length > 0,
    result: null, // 'win' | 'loss' once an ending plays
  }
}

/** The modifiers a run's perks and debuffs add up to. */
export const rogueModList = (rogue) => (rogue ? [...rogue.perks.map((id) => PERK_BY_ID[id]?.mods), ...rogue.debuffs.map((id) => DEBUFF_BY_ID[id]?.mods)].filter(Boolean) : [])
/** Page looks (html classes) and toys a run has switched on. */
export const rogueLooks = (rogue) => (rogue ? rogue.debuffs.map((id) => DEBUFF_BY_ID[id]?.cls).filter(Boolean) : [])
export const rogueToys = (rogue) => (rogue ? rogue.debuffs.map((id) => DEBUFF_BY_ID[id]?.toy).filter(Boolean) : [])
/** How much more often coins go up than down (perks and debuffs add up). */
export const rogueCryptoBias = (rogue) =>
  rogue ? [...rogue.perks.map((id) => PERK_BY_ID[id]), ...rogue.debuffs.map((id) => DEBUFF_BY_ID[id])].reduce((sum, x) => sum + (x?.cryptoBias ?? 0), 0) : 0
