// Transient hand-off between the taskbar and the window grid: which button a restore was
// clicked from, so the window can fly out of it. Animation hints, not game state, so they
// stay out of the store (and never get persisted).

const ORIGIN_TTL_MS = 1000
const origins = new Map() // windowId -> { rect, scroll, at }

/** Call right before restoreWindow(id). `scroll` brings the restored window into view. */
export function setRestoreOrigin(id, rect, { scroll = true } = {}) {
  origins.set(id, { rect, scroll, at: Date.now() })
}

/** Consumed by the grid when the window reappears; stale hints are ignored. */
export function takeRestoreOrigin(id) {
  const origin = origins.get(id)
  origins.delete(id)
  return origin && Date.now() - origin.at < ORIGIN_TTL_MS ? origin : null
}

/**
 * Brings a game window into view (from mail links, quick-launch icons…): restored from the
 * taskbar if it's minimized, otherwise scrolled to.
 */
export function focusWindow(id, restoreWindow, minimized) {
  if (minimized) {
    setRestoreOrigin(id, null, { scroll: true })
    restoreWindow(id)
    return
  }
  document.querySelector(`[data-window="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
