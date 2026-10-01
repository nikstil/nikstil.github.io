// Cheats (Control Panel → Cheats). Turning them on marks the game as Modified until a new game:
// speedrun and Daily Challenge times stop counting and Not One Cent is off the table.
// Achievements still work. Toggles are run modifiers (same keys as events: see runMods.js).

/** One-off cheats. The store (cheatPatch) knows what each one does. */
export const CHEAT_ACTIONS = [
  { id: 'm1', icon: '💵', label: '+$1M' },
  { id: 'b1', icon: '💰', label: '+$1B' },
  { id: 't1', icon: '🏦', label: '+$1T' },
  { id: 'x10', icon: '📈', label: 'Wallet ×10' },
  { id: 'skill', icon: '🌳', label: '+5 skill points' },
  { id: 'gems', icon: '💎', label: '+100 gems' },
  { id: 'stamina', icon: '⚡', label: 'Refill stamina' },
  { id: 'cat', icon: '🐱', label: 'Happy cat' },
  { id: 'debt', icon: '🦈', label: 'Clear debt' },
  { id: 'event', icon: '🎉', label: 'Start an event' },
  { id: 'contract', icon: '📝', label: 'New contract' },
]

/** Always-on cheats, as run modifiers. */
export const CHEAT_TOGGLES = [
  { id: 'noAds', icon: '🚫', label: 'No ads', mods: { noAds: true } },
  { id: 'stamina', icon: '⚡', label: 'Infinite stamina', mods: { infiniteStamina: true } },
  { id: 'gold', icon: '⛏️', label: 'Mining ×10', mods: { mining: 10 } },
  { id: 'cat', icon: '🐱', label: 'Pampered cat', mods: { catDecay: 0 } },
  { id: 'irs', icon: '🧾', label: 'No audits', mods: { noAudits: true } },
  { id: 'polite', icon: '🙇', label: 'Translator never refuses', mods: { noRefusal: true } },
  { id: 'vinnie', icon: '📉', label: 'No loan interest', mods: { loanInterest: 0 } },
]
const TOGGLE_BY_ID = Object.fromEntries(CHEAT_TOGGLES.map((t) => [t.id, t]))
export const cheatMods = (ids = []) => ids.map((id) => TOGGLE_BY_ID[id]?.mods)

/**
 * Codes for the code box (lower case, letters and digits only). Each can give money, skill
 * points and gems, refill stamina, cheer up the cat and switch toggles on. `joke` codes do nothing
 * and don't count as cheating.
 */
export const CHEAT_CODES = {
  rosebud: { money: 1_000, msg: '🌹 Rosebud. +$1,000. A classic.' },
  kaching: { money: 1_000, msg: '💸 Ka-ching. +$1,000.' },
  showmethemoney: { money: 10_000, msg: '💵 Show me the money: +$10,000. Minerals not included.' },
  motherlode: { money: 50_000, msg: '💰 Motherlode! +$50,000. Simoleons accepted.' },
  hesoyam: { money: 250_000, stamina: true, cat: true, msg: '🩹 HESOYAM: +$250,000, full stamina and a happy cat.' },
  idkfa: { skillPoints: 10, gems: 100, msg: '🗝️ All keys, full ammo: +10 skill points and +100 gems.' },
  iddqd: { toggles: ['cat', 'irs', 'vinnie'], msg: '😇 God mode: the cat is content, the IRS forgets you, Vinnie stops counting.' },
  uuddlrlrba: { gems: 30, msg: '🎮 30 lives! We gave you 30 gems instead.' },
  rosettastone: {
    msg: '📜 Premium Latin™ in one line: drop the vowels a word ends with, then add -ex (1–2 letters), -us (3), -um (4), -ae (5) or -ibus (6+).',
  },
  refund: { joke: true, msg: '🧾 “Refund” isn’t a cheat code. It’s a myth.' },
  touchgrass: { joke: true, msg: '🌱 That’s not a cheat. That’s advice.' },
}
const ALIASES = { konami: 'uuddlrlrba', upupdowndownleftrightleftrightba: 'uuddlrlrba' }
export const CHEAT_CODE_COUNT = Object.values(CHEAT_CODES).filter((c) => !c.joke).length
/** "Mother Lode!" → "motherlode"; aliases resolve to their code. */
export function normalizeCode(raw) {
  const code = String(raw).toLowerCase().replace(/[^a-z0-9]/g, '')
  return ALIASES[code] ?? code
}
