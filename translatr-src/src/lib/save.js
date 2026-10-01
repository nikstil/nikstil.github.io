// Save versioning and save codes.
//
// The save is versioned: when a saved game is older than SAVE_VERSION, each migration between
// its version and this one runs in order (the store's merge then fills in any brand-new fields
// with defaults). Save codes wrap a save in a checksummed, copy-pasteable string.

import { skillPointsFromPrestiges } from '../data/gameData'

export const SAVE_KEY = 'translatr-save'
export const SAVE_VERSION = 3
const CODE_PREFIX = 'TRANSLATR-SAVE'

/** How many microtransactions an old save made (the secret ending needs zero). */
const countPurchases = (s) =>
  Object.values(s.premium ?? {}).reduce((a, b) => a + (Number(b) || 0), 0) + (s.skinsOwned?.diamond ? 1 : 0)

const MIGRATIONS = {
  // v0 → v1: endings, speedruns, the inbox, events and Unwrapped.
  1: (s) => ({
    ...s,
    // Existing players carry on in normal mode (no title screen in the middle of a save).
    mode: s.mode ?? 'normal',
    run: s.run ?? { startedAt: Date.now(), endedAt: null, splits: {} },
    // Prestige now grants n+1 points for the n-th ascension: top up the difference.
    skillPoints: (s.skillPoints ?? 0) + Math.max(0, skillPointsFromPrestiges(s.prestige ?? 0) - 2 * (s.prestige ?? 0)),
    stats: { ...s.stats, purchases: s.stats?.purchases ?? countPurchases(s) },
  }),
  // v1 → v2: light mode is the default. "Auto" used to be, so nobody chose it on purpose.
  2: (s) => (s.settings?.colorMode === 'auto' ? { ...s, settings: { ...s.settings, colorMode: 'light' } } : s),
  // v2 → v3: Luna is the default theme. Aero used to be; anyone who never tried another theme gets Luna.
  3: (s) => ((s.theme ?? 'aero') === 'aero' && !(s.stats?.themesTried ?? []).length ? { ...s, theme: 'luna' } : s),
}

/** zustand persist `migrate`: upgrades a saved state from `version` to SAVE_VERSION. */
export function migrateSave(persisted, version = 0) {
  let s = persisted ?? {}
  for (let v = version + 1; v <= SAVE_VERSION; v++) s = MIGRATIONS[v]?.(s) ?? s
  return s
}

// ---- Save codes ----
function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36)
}
function toBase64(text) {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromBase64(b64) {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

/** The persisted part of the game as a single copy-pasteable line. */
export function encodeSave(persistedState) {
  const body = toBase64(JSON.stringify({ v: SAVE_VERSION, at: Date.now(), state: persistedState }))
  return `${CODE_PREFIX}.${SAVE_VERSION}.${body}.${fnv1a(body)}`
}

/** Reads a save code back. Returns a migrated state, or throws an Error with a readable message. */
export function decodeSave(code) {
  const parts = String(code ?? '').trim().split('.')
  if (parts.length !== 4 || parts[0] !== CODE_PREFIX) throw new Error('That is not a TRANSLATR™ save code.')
  const [, , body, sum] = parts
  if (fnv1a(body) !== sum) throw new Error('This save code is damaged (the checksum does not match). Copy the whole thing.')
  let data
  try {
    data = JSON.parse(fromBase64(body))
  } catch {
    throw new Error('This save code could not be read.')
  }
  if (!data || typeof data.state !== 'object' || !Number.isInteger(data.v)) throw new Error('This save code is empty.')
  if (data.v > SAVE_VERSION) throw new Error('This save is from a newer version of TRANSLATR™. Refresh the page and try again.')
  return { state: migrateSave(data.state, data.v), savedAt: data.at }
}
