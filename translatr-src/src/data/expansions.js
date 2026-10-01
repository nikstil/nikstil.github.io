// Expansions: CryptoBro Exchange (always there, next to the casino), Ye Olde Forge and the HomeLab
// NAS. The Forge and the NAS are paid DLC (Premium Vault), or a 1% drop from Platinum Boxes.

// ================= CryptoBro Exchange =================
// One stablecoin, two that move ±10% every 5 seconds, two that move ±25% every 3 seconds. A coin
// that falls below its floor gets "relaunched" (v2, v3…): fresh price, and old bags are worth nothing.
export const COINS = [
  { id: 'stbl', name: 'StableCoin™', ticker: 'STBL', icon: '🪙', start: 1, move: 0, every: 0, color: '#2c9a1e', blurb: 'Pegged to $1. Allegedly backed by a jar of coins in the CFO’s car.' },
  { id: 'dogm', name: 'DogeMoon', ticker: 'DOGM', icon: '🐕', start: 0.08, move: 0.1, every: 5000, floor: 1e-5, color: '#d4a017', blurb: 'Much moon. Very ±10%. Every 5 seconds.' },
  { id: 'gwei', name: 'GasGuzzle', ticker: 'GWEI', icon: '⛽', start: 42, move: 0.1, every: 5000, floor: 0.005, color: '#5b7cff', blurb: 'Every transaction costs more than the transaction.' },
  { id: 'rug', name: 'RugPull', ticker: 'RUG', icon: '🧶', start: 3.5, move: 0.25, every: 3000, floor: 0.0005, color: '#d32f2f', blurb: 'It’s in the name. ±25% every 3 seconds.' },
  { id: 'sgma', name: 'SigmaGrindset', ticker: 'SGMA', icon: '🗿', start: 0.0007, move: 0.25, every: 3000, floor: 1e-8, color: '#8e5bd6', blurb: 'Endorsed by a guy who wakes up at 4 AM. ±25% every 3 seconds.' },
]
export const COIN_BY_ID = Object.fromEntries(COINS.map((c) => [c.id, c]))
export const CRYPTO_HISTORY = 40 // price points kept for each sparkline
export const freshMarket = (now = Date.now()) => ({
  prices: Object.fromEntries(COINS.map((c) => [c.id, c.start])),
  history: Object.fromEntries(COINS.map((c) => [c.id, [c.start]])),
  next: Object.fromEntries(COINS.filter((c) => c.every).map((c) => [c.id, now + c.every])),
  version: Object.fromEntries(COINS.map((c) => [c.id, 1])),
})

// ================= Ye Olde Forge =================
// Passive income, no downsides: it fills its coffers by itself and you collect by hand. Upgrades
// are like the pickaxe's: fixed prices in dollars, each level costing more and earning more.
// Income is in "swings" (your mining rate), so it stays worth having all game.
export const FORGE = {
  swingsPerSecond: (level) => 0.4 * level * (1 + level / 10),
  /** Dollars for the level after `level`: $250, $500, $1K… */
  upgradeCost: (level) => 250 * 2 ** (level - 1),
  maxLevel: 30,
  ranks: ['Rusty Anvil', 'Village Smithy', 'Guild Forge', 'Royal Armoury', 'Dragonfire Foundry', 'Forge of the Old Gods'],
}
export const forgeRank = (level) => FORGE.ranks[Math.min(FORGE.ranks.length - 1, Math.floor((level - 1) / 5))]
/** Looks for the Forge, bought with in-game money from the menu in its corner. */
export const FORGE_THEMES = [
  { id: 'medieval', name: 'Medieval', icon: '⚒️', price: 0, smith: '🧔', blurb: 'Stone, timber and a man named Gareth.' },
  { id: 'dwarf', name: 'Dwarven Hall', icon: '🪓', price: 5_000, smith: '🧔‍♂️', blurb: 'Deep under the mountain. The beards are load-bearing.' },
  { id: 'bloodelf', name: 'Blood Elf', icon: '🩸', price: 50_000, smith: '🧝', blurb: 'Crimson, gold, and a very judgemental elf.' },
  { id: 'wizard', name: 'Wizard’s Tower', icon: '🧙', price: 500_000, smith: '🧙', blurb: 'The hammer is optional. The hat is not.' },
  { id: 'orc', name: 'Orcish Warforge', icon: '💀', price: 5_000_000, smith: '👹', blurb: 'Bones, iron and anger management issues.' },
  { id: 'elf', name: 'Moonlit Elven Glade', icon: '🌙', price: 50_000_000, smith: '🧝‍♀️', blurb: 'They forge with starlight. You still pay for the coal.' },
]
export const FORGE_THEME_BY_ID = Object.fromEntries(FORGE_THEMES.map((t) => [t.id, t]))

// ================= HomeLab NAS =================
// Starts as a two-bay box, grows into a rack and then a row of them. Every drive bay blinks and
// earns; money goes straight into your wallet.
export const NAS_TIERS = [
  { name: 'Dual-Bay NAS', bays: 2, look: 'box' },
  { name: 'Four-Bay NAS', bays: 4, look: 'box' },
  { name: 'Eight-Bay NAS', bays: 8, look: 'box' },
  { name: '1U Rack Server', bays: 12, look: 'rack', units: 1 },
  { name: '2U Storage Server', bays: 24, look: 'rack', units: 2 },
  { name: 'Quarter Rack', bays: 40, look: 'rack', units: 4 },
  { name: 'Half Rack', bays: 64, look: 'rack', units: 7 },
  { name: 'Full 42U Rack', bays: 96, look: 'rack', units: 10 },
  { name: 'Data-Centre Row', bays: 160, look: 'rack', units: 14 },
]
export const NAS = {
  swingsPerSecondPerBay: 0.5,
  /** Dollars for the tier after `tier`: $2K, $16K, $128K… */
  upgradeCost: (tier) => 2_000 * 8 ** tier,
}

// ================= How you get them =================
export const EXPANSIONS = {
  forge: { id: 'forge', name: 'Ye Olde Forge', icon: '⚒️', premium: 'forge_dlc' },
  nas: { id: 'nas', name: 'HomeLab NAS', icon: '🗄️', premium: 'nas_dlc' },
}
export const EXPANSION_DROP_CHANCE = 0.01 // per Platinum Box
export const ownsExpansion = (s, id) => !!(s.expansions?.[id] || s.premium?.[EXPANSIONS[id].premium])
