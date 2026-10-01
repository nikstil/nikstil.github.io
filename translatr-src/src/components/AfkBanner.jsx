import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore, activeMods } from '../store/useGameStore'
import { AFK_MS } from '../data/gameData'
import { usePresence } from '../lib/hooks'

// Real input only: scroll events are left out on purpose (the DoomFeed™ autoplay scrolls by
// itself, which would otherwise count as "activity" forever).
const ACTIVITY = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']

/**
 * Watches for the player going AFK (no input for AFK_MS) and pauses income until they're
 * back. Expenses keep running, and the banner says so. A hidden tab counts as AFK too.
 */
export default function AfkBanner() {
  const afk = useGameStore((s) => s.afk)
  const { mounted, closing } = usePresence(afk, 250)

  useEffect(() => {
    let last = Date.now()
    const onActive = () => {
      last = Date.now()
      const s = useGameStore.getState()
      if (!s.afk) return
      s.setAfk(false)
      s.toast('▶ Welcome back! Income resumed. (Your expenses never stopped.)', 'info')
    }
    ACTIVITY.forEach((type) => window.addEventListener(type, onActive, { passive: true, capture: true }))
    const timer = setInterval(() => {
      const s = useGameStore.getState()
      // The Mouse Jiggler (an item) keeps you from ever going AFK.
      if (!s.afk && Date.now() - last >= AFK_MS && !activeMods(s).afkProof) s.setAfk(true)
    }, 1000)
    return () => {
      ACTIVITY.forEach((type) => window.removeEventListener(type, onActive, { capture: true }))
      clearInterval(timer)
    }
  }, [])

  if (!mounted) return null
  return createPortal(
    <div className="pointer-events-none fixed left-0 right-[var(--arcade-room,0px)] top-3 z-[385] flex justify-center px-4" role="status">
      <div className={`balloon flex items-center gap-3 px-4 py-2.5 text-[0.8125rem] ${closing ? 'anim-modal-out' : 'anim-modal-in'}`}>
        <span className="text-2xl">💤</span>
        <div>
          <div className="font-semibold">You're AFK: all income is paused.</div>
          <div className="text-[0.6875rem] text-ink/60">Move the mouse or press a key to resume. The cat, your loans and the Dev IRS do not pause.</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
