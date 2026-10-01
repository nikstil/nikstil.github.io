// Player settings that change the page itself: colour mode, graphics, reduced motion and text size.
// Mirrored to localStorage (like the theme) so index.html can apply them before the first paint.

export const PREFS_KEY = 'translatr-prefs'
export const TEXT_SIZES = [
  { id: 0.9, label: 'Small' },
  { id: 1, label: 'Normal' },
  { id: 1.15, label: 'Large' },
  { id: 1.3, label: 'Huge' },
]
// colorMode: 'light' (the default) | 'dark' | 'auto'. graphics: 'auto' | 'full' | 'lite'.
// slowDevice: Auto saw this device struggle (see lib/perf.js). language: see lib/language.js.
export const DEFAULT_SETTINGS = { motion: 'auto', textScale: 1, colorMode: 'light', graphics: 'auto', slowDevice: false, language: 'en' }

const query = (q) => (typeof window !== 'undefined' ? window.matchMedia?.(q) : null)
const motionMedia = query('(prefers-reduced-motion: reduce)')
const darkMedia = query('(prefers-color-scheme: dark)')
let current = { ...DEFAULT_SETTINGS }

/** Whether a motion setting ('auto' | 'reduce' | 'full') means fewer animations on this device. */
export const motionReduced = (motion = 'auto') => (motion === 'auto' ? !!motionMedia?.matches : motion === 'reduce')
/** True when animations should be cut down: the player asked, or (on "auto") the device did. */
export const reducedMotion = () => motionReduced(current.motion)
/** 'light' or 'dark': the player's choice, or (on "auto") the device's. */
export const colorMode = () => (current.colorMode === 'auto' ? (darkMedia?.matches ? 'dark' : 'light') : current.colorMode)

/**
 * Low-end hardware, as far as the browser will say: 4 GB of memory or less (Chrome reports it),
 * or two CPU cores. Everything else is judged by how it actually runs (lib/perf.js).
 * Keep in step with the copy in index.html.
 */
export const weakHardware = () =>
  typeof navigator !== 'undefined' && ((navigator.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 2)
/** 'lite' or 'full': the player's choice, or (on "auto") what this device seems able to handle. */
export const graphicsMode = (s = current) =>
  s.graphics === 'lite' || s.graphics === 'full' ? s.graphics : weakHardware() || s.slowDevice ? 'lite' : 'full'
/** Lite graphics: no glass blur, no decorative animation loops, lazier offscreen windows. */
export const liteGraphics = () => graphicsMode() === 'lite'

function sync() {
  const root = document.documentElement
  root.dataset.motion = reducedMotion() ? 'reduce' : 'full'
  root.dataset.mode = colorMode()
  root.dataset.perf = graphicsMode()
}
motionMedia?.addEventListener?.('change', () => current.motion === 'auto' && sync())
darkMedia?.addEventListener?.('change', () => current.colorMode === 'auto' && sync())

/** Applies settings to the document (call on load and whenever they change). */
export function applySettings(settings) {
  current = { ...DEFAULT_SETTINGS, ...settings }
  sync()
  document.documentElement.style.setProperty('--text-scale', String(current.textScale))
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(current))
  } catch {
    // blocked storage: the save still remembers them
  }
}
