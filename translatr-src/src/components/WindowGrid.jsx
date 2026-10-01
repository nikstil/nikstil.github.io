import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../store/useGameStore'
import { isWindowAvailable } from '../data/windows'
import { WindowContext } from '../lib/windowContext'
import { takeRestoreOrigin } from '../lib/windowFx'
import { TASKBAR_H } from '../lib/dock'
import Translator from './Translator'
import Mine from './Mine'
import Casino from './Casino'
import Slots from './Slots'
import LootBoxes from './LootBoxes'
import Inventory from './Inventory'
import LoanShark from './LoanShark'
import Leaderboard from './Leaderboard'
import BotPanel from './BotPanel'
import SkillTree from './SkillTree'
import PremiumStore from './PremiumStore'
import Inbox from './Inbox'
import { reducedMotion } from '../lib/settings'

// Column/row spans in the 3-column layout (single column on narrow screens).
const SPANS = {
  wide: '@min-[1024px]:col-span-2',
  full: '@min-[1024px]:col-span-3',
  tall: '@min-[1024px]:row-span-2',
}

// Every movable window. Object order = stable DOM order; the *visual* order comes from CSS `order`.
// Locked windows (bot, skills) appear once isWindowAvailable() says so.
const REGISTRY = {
  translator: { Component: Translator, span: 'wide' },
  mine: { Component: Mine, span: 'tall' },
  casino: { Component: Casino },
  slots: { Component: Slots },
  loot: { Component: LootBoxes },
  inventory: { Component: Inventory },
  mail: { Component: Inbox, span: 'wide' },
  loans: { Component: LoanShark },
  leaderboard: { Component: Leaderboard },
  bot: { Component: BotPanel },
  skills: { Component: SkillTree, span: 'full' },
  store: { Component: PremiumStore, span: 'full' },
}
const IDS = Object.keys(REGISTRY)

const DRAG_THRESHOLD = 6 // px before a title-bar press becomes a drag
const FLIP_MS = 260
const MINIMIZE_MS = 300
const RESTORE_MS = 380
const EASE = 'cubic-bezier(.2,.8,.2,1)'
const LIFT = 1.015 // the dragged window is slightly "picked up"
const INTERACTIVE = 'button, a, input, select, textarea, label, [data-no-drag]'
const SCROLL_ZONE = 110 // px from the top/bottom of the screen that auto-scroll the page while dragging
const MAX_SCROLL_SPEED = 20 // px per frame
const REVEAL_OFFSET = 112 // matches the windows' scroll-mt-28: clears the sticky header

function arrayMove(arr, from, to) {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** Slides an element from a visual offset back to its layout position (FLIP). */
function animateFrom(el, dx, dy, scale = 1) {
  el.style.transition = 'none'
  el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`
  el.getBoundingClientRect() // commit the start state before transitioning
  el.style.transition = `transform ${FLIP_MS}ms ${EASE}`
  el.style.transform = ''
}

/** Center of the taskbar button a minimized window lives in (else the overflow button / taskbar middle). */
function taskbarPoint(id) {
  const el = document.querySelector(`[data-task-window="${id}"]`) ?? document.querySelector('[data-task-overflow]')
  const r = el?.getBoundingClientRect()
  if (r?.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  return { x: window.innerWidth / 2, y: window.innerHeight - TASKBAR_H / 2 }
}

/** The transform that shrinks box `r` onto point `p`. */
function shrinkOnto(r, p) {
  const s = Math.max(0.03, Math.min(0.2, 56 / Math.max(r.width, r.height, 1)))
  return `translate(${p.x - (r.left + r.width / 2)}px, ${p.y - (r.top + r.height / 2)}px) scale(${s})`
}

// z-index rides along in the keyframes, so windows fly over their neighbours and drop back
// automatically when the animation is cancelled or ends.
/** Win7-style minimize: the window shrinks into its taskbar button ('fly') or just fades away ('fade'). */
function animateOut(el, id, kind) {
  const end = kind === 'fly' ? shrinkOnto(el.getBoundingClientRect(), taskbarPoint(id)) : 'translateY(18px) scale(0.94)'
  return el.animate(
    [
      { transform: 'none', opacity: 1, zIndex: 40 },
      { opacity: kind === 'fly' ? 1 : 0.6, offset: 0.5 },
      { transform: end, opacity: 0, zIndex: 40 },
    ],
    { duration: MINIMIZE_MS, easing: kind === 'fly' ? 'cubic-bezier(.5,0,.75,.2)' : 'ease-in', fill: 'forwards' },
  )
}

/** Restore: grow out of the taskbar button that was clicked (or fade back in place). */
function animateIn(el, rect) {
  const start = rect ? shrinkOnto(el.getBoundingClientRect(), { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) : 'translateY(18px) scale(0.94)'
  el.animate(
    [
      { transform: start, opacity: 0, zIndex: 40 },
      { opacity: 1, offset: 0.45 },
      { transform: 'none', opacity: 1, zIndex: 40 },
    ],
    { duration: RESTORE_MS, easing: EASE },
  )
}

/** Scrolls a restored window into view, unless its title bar is already comfortably on screen. */
function reveal(el) {
  const r = el.getBoundingClientRect()
  if (r.top >= 0 && r.top <= window.innerHeight - TASKBAR_H - 160) return
  window.scrollBy(0, r.top - REVEAL_OFFSET)
}

/**
 * The desktop of game windows. Drag any window by its title bar: it lifts and follows the
 * pointer, a glass placeholder shows where it will land, and the other windows slide aside
 * live. Minimize (▁) sends a window into the taskbar; its taskbar button brings it back.
 * DOM order never changes (CSS `order` does the reordering) and minimized windows are only
 * hidden, so windows never remount: a spinning roulette, typed text or scroll position all
 * survive being moved or minimized.
 */
export default function WindowGrid() {
  const storedOrder = useGameStore((s) => s.layout.windows)
  const minimized = useGameStore((s) => s.layout.minimized)
  const setWindowOrder = useGameStore((s) => s.setWindowOrder)
  const minimizeWindow = useGameStore((s) => s.minimizeWindow)
  const visible = useGameStore(useShallow((s) => IDS.filter((id) => isWindowAvailable(s, id))))
  const [order, setOrder] = useState(storedOrder)
  const [dragId, setDragId] = useState(null)
  // Windows actually taken out of the layout. Lags `minimized` by the minimize animation.
  const [hidden, setHidden] = useState(() => new Set(minimized))
  const minimizedSet = useMemo(() => new Set(minimized), [minimized])

  const slots = useRef(new Map()) // id -> grid cell (layout position, never transformed)
  const inners = useRef(new Map()) // id -> content wrapper (the thing we translate)
  const drag = useRef(null)
  const flipFrom = useRef(null)
  const dropping = useRef(null)
  const raf = useRef(0)
  const orderRef = useRef(order)
  const visibleRef = useRef([]) // windows currently on the desktop (not minimized)
  const prevMinimized = useRef(minimizedSet)
  const exiting = useRef(new Map()) // id -> Animation of a window still flying into the taskbar
  const restoring = useRef(new Map()) // id -> restore origin, animated once the window is back in the layout
  const exited = useRef(new Map()) // id -> finished (filled) exit animation, dropped once the window is hidden
  const timers = useRef(new Set())

  const shown = visible.filter((id) => !hidden.has(id) && !minimizedSet.has(id))
  const position = new Map(order.map((id, i) => [id, i]))

  // Adopt external changes (Reset layout, another tab) whenever we're not mid-drag.
  useEffect(() => {
    if (!drag.current) setOrder(storedOrder)
  }, [storedOrder])

  // Stable ref callbacks per window (inline ones would churn the maps on every render).
  const refs = useMemo(() => {
    const make = (map, id) => (el) => (el ? map.set(id, el) : map.delete(id))
    return Object.fromEntries(IDS.map((id) => [id, { slot: make(slots.current, id), inner: make(inners.current, id) }]))
  }, [])

  const later = useCallback((fn, ms) => {
    const t = setTimeout(() => {
      timers.current.delete(t)
      fn()
    }, ms)
    timers.current.add(t)
  }, [])

  const snapshot = useCallback(
    (except = []) =>
      new Map(visibleRef.current.filter((id) => !except.includes(id)).map((id) => [id, inners.current.get(id)?.getBoundingClientRect()])),
    [],
  )

  /** Keeps the lifted window under the pointer (relative to wherever its slot currently is). */
  const positionDragged = useCallback(() => {
    const d = drag.current
    if (!d?.active) return
    const slot = slots.current.get(d.id)
    const inner = inners.current.get(d.id)
    if (!slot || !inner) return
    const r = slot.getBoundingClientRect()
    inner.style.transform = `translate(${d.px - d.offX - r.left}px, ${d.py - d.offY - r.top}px) scale(${LIFT})`
  }, [])

  /** If the pointer is over another window, take its place. */
  const hitTest = useCallback(() => {
    const d = drag.current
    if (!d?.active) return
    let target = null
    for (const id of visibleRef.current) {
      if (id === d.id) continue
      const r = slots.current.get(id)?.getBoundingClientRect()
      if (r && d.px >= r.left && d.px <= r.right && d.py >= r.top && d.py <= r.bottom) {
        target = id
        break
      }
    }
    // Hysteresis: after swapping with a window, ignore it until the pointer leaves it,
    // otherwise two windows of different sizes would swap back and forth every frame.
    if (d.lock && d.lock !== target) d.lock = null
    if (!target || target === d.lock) return
    d.lock = target
    flipFrom.current = snapshot([d.id])
    const current = orderRef.current
    flushSync(() => setOrder(arrayMove(current, current.indexOf(d.id), current.indexOf(target))))
  }, [snapshot])

  /** Per-frame while dragging: auto-scroll near the screen edges, follow the pointer, re-sort. */
  const tick = useCallback(() => {
    const d = drag.current
    if (!d?.active) return
    const bottomZone = window.innerHeight - TASKBAR_H - SCROLL_ZONE
    let dy = 0
    if (d.py < SCROLL_ZONE) dy = -Math.ceil(((SCROLL_ZONE - d.py) / SCROLL_ZONE) * MAX_SCROLL_SPEED)
    else if (d.py > bottomZone) dy = Math.ceil(Math.min(1, (d.py - bottomZone) / SCROLL_ZONE) * MAX_SCROLL_SPEED)
    if (dy) window.scrollBy(0, dy)
    positionDragged()
    hitTest()
    raf.current = requestAnimationFrame(tick)
  }, [positionDragged, hitTest])

  // Window-level listeners (not pointer capture), so nothing about the page can interrupt a drag.
  const listeners = useRef(null)
  const detach = useCallback(() => {
    const l = listeners.current
    if (!l) return
    window.removeEventListener('pointermove', l.move)
    window.removeEventListener('pointerup', l.up)
    window.removeEventListener('pointercancel', l.cancel)
    window.removeEventListener('keydown', l.key)
    listeners.current = null
  }, [])

  const end = useCallback(
    (commit) => {
      const d = drag.current
      detach()
      drag.current = null
      cancelAnimationFrame(raf.current)
      if (!d?.active) return // it was just a click on the title bar
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      dropping.current = { id: d.id, x: d.px - d.offX, y: d.py - d.offY }
      if (!commit) {
        flipFrom.current = snapshot([d.id])
        setOrder(d.startOrder)
      }
      setDragId(null)
      if (commit) setWindowOrder(orderRef.current)
    },
    [detach, setWindowOrder, snapshot],
  )

  const onPointerDown = useCallback(
    (id) => (e) => {
      if (e.button !== 0 || drag.current || exiting.current.has(id) || e.target.closest(INTERACTIVE)) return
      drag.current = { id, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, px: e.clientX, py: e.clientY, active: false, lock: null, startOrder: orderRef.current }
      const move = (ev) => {
        const d = drag.current
        if (!d || ev.pointerId !== d.pointerId) return
        d.px = ev.clientX
        d.py = ev.clientY
        if (d.active || Math.hypot(d.px - d.sx, d.py - d.sy) < DRAG_THRESHOLD) return
        const r = slots.current.get(d.id)?.getBoundingClientRect()
        if (!r) return end(false)
        d.offX = d.sx - r.left
        d.offY = d.sy - r.top
        d.active = true
        const inner = inners.current.get(d.id)
        if (inner) inner.style.transition = 'none'
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'grabbing'
        setDragId(d.id)
        raf.current = requestAnimationFrame(tick)
      }
      const up = (ev) => ev.pointerId === drag.current?.pointerId && end(true)
      const cancel = (ev) => ev.pointerId === drag.current?.pointerId && end(false)
      const key = (ev) => ev.key === 'Escape' && drag.current?.active && end(false)
      listeners.current = { move, up, cancel, key }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', cancel)
      window.addEventListener('keydown', key)
    },
    [end, tick],
  )

  const handles = useMemo(
    () => Object.fromEntries(IDS.map((id) => [id, { onPointerDown: onPointerDown(id), onMinimize: () => minimizeWindow(id) }])),
    [onPointerDown, minimizeWindow],
  )

  /** Plays the minimize animation, then takes the windows out of the layout (neighbours FLIP into the gap). */
  const startExit = useCallback(
    (ids, kind) => {
      const mine = new Map(ids.map((id) => [id, animateOut(inners.current.get(id), id, kind)]))
      for (const [id, anim] of mine) exiting.current.set(id, anim)
      later(() => {
        const still = new Set(useGameStore.getState().layout.minimized)
        const done = []
        for (const [id, anim] of mine) {
          if (exiting.current.get(id) !== anim) continue // restored (or re-minimized) mid-flight
          exiting.current.delete(id)
          if (still.has(id)) {
            done.push(id)
            exited.current.set(id, anim) // keep it invisible until the slot is actually hidden
          } else anim.cancel()
        }
        if (!done.length) return
        flipFrom.current = snapshot(done)
        setHidden((h) => new Set([...h, ...done]))
      }, MINIMIZE_MS)
    },
    [later, snapshot],
  )

  // Clean up an in-flight drag, animations and timers if the grid unmounts.
  useEffect(
    () => () => {
      detach()
      cancelAnimationFrame(raf.current)
      timers.current.forEach(clearTimeout)
      timers.current.clear()
      if (drag.current?.active) {
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }
    },
    [detach],
  )

  // After each render: FLIP the windows that moved, keep the dragged one under the pointer,
  // settle a dropped window into its slot, and grow restored windows out of the taskbar.
  useLayoutEffect(() => {
    orderRef.current = order
    visibleRef.current = shown
    const d = drag.current

    const from = flipFrom.current
    flipFrom.current = null
    if (from) {
      for (const [id, first] of from) {
        const inner = inners.current.get(id)
        const slot = slots.current.get(id)
        if (!first || !inner || !slot || hidden.has(id)) continue
        const last = slot.getBoundingClientRect()
        const dx = first.left - last.left
        const dy = first.top - last.top
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) animateFrom(inner, dx, dy)
      }
    }

    if (d?.active) positionDragged()

    const drop = dropping.current
    if (drop && !dragId) {
      dropping.current = null
      const inner = inners.current.get(drop.id)
      const slot = slots.current.get(drop.id)
      if (inner && slot) {
        const r = slot.getBoundingClientRect()
        animateFrom(inner, drop.x - r.left, drop.y - r.top, LIFT)
      }
    }

    for (const [id, anim] of exited.current) {
      if (!hidden.has(id)) continue
      anim.cancel() // safe now: the window is out of the layout
      exited.current.delete(id)
    }

    for (const [id, origin] of restoring.current) {
      restoring.current.delete(id)
      const inner = inners.current.get(id)
      const slot = slots.current.get(id)
      if (!inner || !slot || hidden.has(id)) continue
      if (origin?.scroll) reveal(slot)
      if (!reducedMotion()) animateIn(inner, origin?.rect)
    }
  })

  // Minimize / restore: react to the store (Panel ▁, taskbar buttons, Show desktop, Reset layout,
  // other tabs), so every trigger animates the same way.
  useLayoutEffect(() => {
    const prev = prevMinimized.current
    if (prev === minimizedSet) return
    prevMinimized.current = minimizedSet

    const unhide = []
    for (const id of prev) {
      if (minimizedSet.has(id)) continue
      const flying = exiting.current.get(id)
      if (flying) {
        // Restored mid-minimize: play the minimize backwards instead.
        exiting.current.delete(id)
        takeRestoreOrigin(id)
        flying.reverse()
        later(() => flying.cancel(), MINIMIZE_MS)
      } else if (hidden.has(id)) {
        unhide.push(id)
        restoring.current.set(id, takeRestoreOrigin(id))
      }
    }

    const gone = [...minimizedSet].filter((id) => !prev.has(id) && !hidden.has(id) && !exiting.current.has(id))
    const animated = reducedMotion() ? [] : gone.filter((id) => inners.current.get(id))
    const instant = gone.filter((id) => !animated.includes(id))

    if (unhide.length || instant.length) {
      flipFrom.current = snapshot(instant)
      setHidden((h) => {
        const next = new Set(h)
        unhide.forEach((id) => next.delete(id))
        instant.forEach((id) => next.add(id))
        return next
      })
    }
    // One window flies into its taskbar button; a whole desktop's worth just fades.
    if (animated.length) startExit(animated, animated.length > 1 ? 'fade' : 'fly')
  }, [minimizedSet, hidden, later, snapshot, startExit])

  const desktopEmpty = visible.length > 0 && visible.every((id) => hidden.has(id))

  return (
    <main className="grid min-w-0 grid-flow-row-dense grid-cols-1 gap-(--desk-gap) @min-[1024px]:grid-cols-3">
      {visible.map((id) => {
        const { Component, span } = REGISTRY[id]
        const lifted = dragId === id
        const isHidden = hidden.has(id)
        return (
          <div
            key={id}
            ref={refs[id].slot}
            data-window={id}
            aria-hidden={isHidden || undefined}
            className={`window-slot relative min-w-0 ${span ? SPANS[span] : ''} ${lifted ? 'is-dragging' : ''} ${isHidden ? 'hidden' : ''}`}
            style={{ order: position.get(id) ?? 99, zIndex: lifted ? 30 : undefined }}
          >
            <div ref={refs[id].inner} className="window-inner relative h-full">
              <WindowContext.Provider value={handles[id]}>
                <Component />
              </WindowContext.Provider>
            </div>
          </div>
        )
      })}
      {desktopEmpty && <EmptyDesktop />}
    </main>
  )
}

const DESKTOP_ICONS = [
  ['🗑️', 'Recycle Bin', '🗑️ The Recycle Bin is full of your money. Emptying it costs $4.99.'],
  ['📁', 'My Losses', '📁 "My Losses" is 4.2 TB and growing. Access denied.'],
  ['💾', 'save_final_v2.sav', '💾 Please do not touch the save file. Especially near a Trap Ad.'],
]

/** What you see when every window is in the taskbar: a desktop (the ads stay, obviously). */
function EmptyDesktop() {
  const restoreAll = useGameStore((s) => s.restoreAllWindows)
  const toast = useGameStore((s) => s.toast)
  return (
    <div className="anim-modal-in col-span-full flex flex-col gap-8 py-2">
      <div className="flex flex-wrap gap-2">
        {DESKTOP_ICONS.map(([icon, label, line]) => (
          <button key={label} className="desktop-icon" onDoubleClick={() => toast(line, 'info')} onClick={(e) => e.detail === 0 && toast(line, 'info')} title="Double-click to open">
            <span className="text-4xl drop-shadow-[0_2px_3px_rgba(0,30,70,.45)]">{icon}</span>
            <span className="desktop-icon-label">{label}</span>
          </button>
        ))}
      </div>
      <section className="aero-window mx-auto w-full max-w-md" style={{ '--accent': '#5ea9dd' }}>
        <header className="aero-titlebar">
          <span className="text-base">🖥️</span>
          <h2 className="aero-title min-w-0 flex-1">Desktop</h2>
        </header>
        <div className="aero-client flex flex-col items-center gap-2 p-6 text-center">
          <div className="text-5xl">🌅</div>
          <p className="font-semibold">Every window is minimized to the taskbar.</p>
          <p className="text-sm text-ink/60">The ads, of course, are not. The ads are never minimized.</p>
          <button className="btn btn-gold mt-3" onClick={restoreAll}>
            Restore all windows
          </button>
          <p className="mt-3 text-[0.6875rem] text-ink/40">…wait. Was that there before?</p>
          <button className="power-btn" onClick={() => useGameStore.getState().openShutdown()} title="Shut down" aria-label="Shut down">
            ⏻
          </button>
        </div>
      </section>
    </div>
  )
}
