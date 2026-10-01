// The movable game windows. The array order is the default arrangement; players can
// drag windows by their title bars to reorder them (saved in the store's layout.windows)
// and minimize them to the taskbar (layout.minimized).

export const DEFAULT_WINDOW_ORDER = [
  'translator',
  'mine',
  'casino',
  'slots',
  'crypto',
  'loot',
  'inventory',
  'mail',
  'loans',
  'leaderboard',
  'bot',
  'skills',
  'store',
  'forge',
]

/** Taskbar label + icon for each window. */
export const WINDOW_META = {
  translator: { icon: '🌐', title: 'Translator' },
  mine: { icon: '⛏️', title: 'The Mine' },
  casino: { icon: '🎡', title: 'Roulette Royale' },
  slots: { icon: '🎰', title: 'Slots of Regret' },
  crypto: { icon: '📈', title: 'CryptoBro Exchange' },
  loot: { icon: '🎁', title: 'Mystery Boxes' },
  inventory: { icon: '🎒', title: 'Inventory' },
  mail: { icon: '📧', title: 'Inbox' },
  loans: { icon: '🦈', title: 'QuickCash™ Loans' },
  leaderboard: { icon: '🏆', title: 'Global Leaderboard' },
  bot: { icon: '🤖', title: 'Bot Rental' },
  skills: { icon: '🌳', title: 'Ascension Tree' },
  store: { icon: '💰', title: 'Premium Vault' },
  forge: { icon: '⚒️', title: 'Ye Olde Forge' },
}

// Windows that only exist once unlocked (pure functions of game state).
const WINDOW_GATES = {
  forge: (s) => !!(s.expansions?.forge || s.premium?.forge_dlc),
  bot: (s) => s.prestige >= 1 || !!s.bot,
  skills: (s) => s.prestige > 0 || s.skillPoints > 0 || Object.keys(s.skills).length > 0,
}
export const isWindowAvailable = (s, id) => !WINDOW_GATES[id] || WINDOW_GATES[id](s)

/**
 * Keeps a saved order valid: drops unknown ids, and slots windows added in newer versions in next
 * to the window they follow by default (the Crypto exchange lands beside the casino games).
 */
export function normalizeWindowOrder(saved) {
  const order = Array.isArray(saved) ? saved.filter((id, i) => DEFAULT_WINDOW_ORDER.includes(id) && saved.indexOf(id) === i) : []
  if (!order.length) return [...DEFAULT_WINDOW_ORDER]
  DEFAULT_WINDOW_ORDER.forEach((id, i) => {
    if (order.includes(id)) return
    const after = DEFAULT_WINDOW_ORDER.slice(0, i).reverse().find((prev) => order.includes(prev))
    order.splice(after ? order.indexOf(after) + 1 : 0, 0, id)
  })
  return order
}

/** Keeps a saved list of minimized windows valid (known ids, no duplicates, minimize order kept). */
export const normalizeMinimized = (saved) =>
  Array.isArray(saved) ? saved.filter((id, i) => DEFAULT_WINDOW_ORDER.includes(id) && saved.indexOf(id) === i) : []
