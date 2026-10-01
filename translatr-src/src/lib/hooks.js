import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { liteGraphics, reducedMotion } from './settings'

/** The single game clock. Every timed system runs inside store.tick(). */
export function useGameLoop() {
  useEffect(() => {
    const id = setInterval(() => useGameStore.getState().tick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
}

const COLLAPSE_MS = 220
const EXPAND_MS = 260

/** The transform-origin a docked widget (DoomFeed™, the cat) shrinks into: its spot on its edge. */
export function dockOrigin({ edge, at = 0.5 }) {
  const p = `${Math.round(at * 100)}%`
  return { left: `0% ${p}`, right: `100% ${p}`, top: `${p} 0%`, bottom: `${p} 100%` }[edge] ?? '50% 100%'
}

/**
 * Minimize/restore animation for a docked widget, whatever minimized it (its own button, the
 * taskbar toggle, Collapse all). Returns the collapsed state to *render*: it lags the stored one
 * while the open widget shrinks into its edge, then whichever version appears grows in.
 * `ref` goes on the rendered root (the open widget and its collapsed tab share it).
 */
export function useCollapseAnimation(collapsed, ref, origin) {
  const [shown, setShown] = useState(collapsed)
  const settled = useRef(false) // no grow-in on the first render
  useLayoutEffect(() => {
    if (collapsed === shown) return
    const el = ref.current
    if (!collapsed || !el?.animate || reducedMotion()) return setShown(collapsed)
    el.style.transformOrigin = origin
    const anim = el.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(0.2)', opacity: 0 }], {
      duration: COLLAPSE_MS,
      easing: 'cubic-bezier(.5,0,.75,.2)',
      fill: 'forwards',
    })
    anim.onfinish = () => setShown(true)
    return () => anim.cancel() // restored mid-flight: it just stays open
  }, [collapsed, shown, ref, origin])
  useLayoutEffect(() => {
    if (!settled.current) {
      settled.current = true
      return
    }
    const el = ref.current
    if (!el?.animate || reducedMotion()) return
    el.style.transformOrigin = origin
    el.animate([{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: EXPAND_MS, easing: 'cubic-bezier(.2,.8,.2,1)' })
    // Only when what's shown changes (the origin is read, not watched).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown])
  return shown
}

/**
 * Keeps an element mounted while its exit animation plays.
 * Returns { mounted, closing }. Re-opening during the exit cancels it.
 */
export function usePresence(open, exitMs = 220) {
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const t = setTimeout(() => setMounted(false), exitMs)
    return () => clearTimeout(t)
  }, [open, exitMs])
  return { mounted: open || mounted, closing: !open && mounted }
}

/** Remembers the last non-null value, so closing modals keep their content during the exit animation. */
export function useLastDefined(value) {
  const [last, setLast] = useState(value)
  if (value != null && value !== last) setLast(value)
  return value ?? last
}

/**
 * Smoothly tweens a number toward its target with requestAnimationFrame (optionally from `initial`).
 * Lite graphics and reduced motion skip the tween: the number just changes.
 */
export function useAnimatedNumber(value, duration = 550, initial = value) {
  const [display, setDisplay] = useState(initial)
  const current = useRef(initial)

  useEffect(() => {
    const from = current.current
    if (from === value) return
    if (liteGraphics() || reducedMotion()) {
      current.current = value
      setDisplay(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - (1 - p) ** 3
      const v = from + (value - from) * eased
      current.current = v
      setDisplay(v)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return display
}
