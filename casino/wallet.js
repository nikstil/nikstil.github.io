// Your money and your skins, which are COUNTER-STRIFE's: the same inventory (this site's storage),
// read fresh before every change so the game and the casino never save over each other. Plus the
// casino's own numbers (how much you've bet and won).

import { loadInventory, saveInventory, addItem } from '../strife/skins.js'

export const r2 = (v) => Math.round(v * 100) / 100
export const fmt = (v) => (Number.isInteger(r2(v)) ? r2(v).toLocaleString('en-US') : r2(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

const listeners = new Set()
/** Calls f whenever the balance or the items change (here, in the game, or in another tab). */
export const onWallet = (f) => (listeners.add(f), () => listeners.delete(f))
const emit = () => listeners.forEach((f) => f())
addEventListener('storage', (e) => e.key === 'strife-inventory' && emit())
addEventListener('strife-inventory', emit) // credits bought on this page

export const balance = () => loadInventory().credits
export const items = () => loadInventory().items
export const inventory = () => loadInventory()

// ---------------- Stats
const SKEY = 'skinsink-stats'
function readStats() {
  try {
    return { wagered: 0, won: 0, biggest: 0, bets: 0, raked: 0, ...(JSON.parse(localStorage.getItem(SKEY)) ?? {}) }
  } catch {
    return { wagered: 0, won: 0, biggest: 0, bets: 0, raked: 0 }
  }
}
export const stats = () => readStats()
export function saveStats(s) {
  try {
    localStorage.setItem(SKEY, JSON.stringify(s))
  } catch {}
}

/** Takes a bet out of your balance. Returns false if you can't cover it. */
export function bet(n) {
  n = r2(n)
  if (!(n > 0)) return false
  const inv = loadInventory()
  if (inv.credits + 1e-9 < n) return false
  inv.credits = r2(inv.credits - n)
  saveInventory(inv)
  const s = readStats()
  s.wagered = r2(s.wagered + n)
  s.bets++
  saveStats(s)
  emit()
  return true
}
/** Pays out winnings. */
export function win(n) {
  n = r2(n)
  if (!(n > 0)) return
  const inv = loadInventory()
  inv.credits = r2(inv.credits + n)
  saveInventory(inv)
  const s = readStats()
  s.won = r2(s.won + n)
  s.biggest = Math.max(s.biggest, n)
  saveStats(s)
  emit()
}
/** Credits that aren't winnings (selling, bonuses, refunds). */
export function credit(n) {
  n = r2(n)
  if (!(n > 0)) return
  const inv = loadInventory()
  inv.credits = r2(inv.credits + n)
  saveInventory(inv)
  emit()
}
/** Spends without counting it as a bet (buying in the market). */
export function spend(n) {
  n = r2(n)
  const inv = loadInventory()
  if (!(n > 0) || inv.credits + 1e-9 < n) return false
  inv.credits = r2(inv.credits - n)
  saveInventory(inv)
  emit()
  return true
}

/** Takes items out of the inventory (unequipping them). Returns them, or null if any is gone. */
export function takeItems(uids) {
  const inv = loadInventory()
  const out = []
  for (const uid of uids) {
    const i = inv.items.findIndex((x) => x.uid === uid)
    if (i < 0) return null
    out.push(inv.items.splice(i, 1)[0])
    for (const [w, u] of Object.entries(inv.equipped)) if (u === uid) delete inv.equipped[w]
  }
  saveInventory(inv)
  emit()
  return out
}
/** Puts new items into the inventory. Returns them (with their uids). */
export function giveItems(list) {
  const inv = loadInventory()
  const out = list.map((it) => {
    const { uid: _u, at: _a, ...clean } = it
    return addItem(inv, clean)
  })
  saveInventory(inv)
  emit()
  return out
}
