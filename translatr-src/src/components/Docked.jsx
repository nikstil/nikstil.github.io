import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../store/useGameStore'
import { ownsExpansion } from '../data/expansions'
import { useViewport } from '../lib/useViewport'
import { arcadeInset, clamp, dockArea, dockTarget, NAS_PEEK_W, placeOnEdge, scrollbarWidth, snapTarget } from '../lib/dock'

const DRAG_THRESHOLD = 5 // px of movement before a press becomes a drag (so clicks still work)
const SNAP_PX = 48 // floating widgets dock only when dragged (by the pointer) this close to an edge
const EASE = 'cubic-bezier(.2,.8,.2,1)'

/**
 * A fixed widget attached to a screen edge. Drag it by the element that receives
 * `handleProps`: it follows the pointer, an "Aero Snap" ghost previews where it will land,
 * and on release it docks to the nearest edge at the dropped position.
 * With `floating`, it can also be left anywhere on screen: it only docks (and only shows the
 * ghost) when dragged within SNAP_PX of an edge.
 *
 * - `sizeFor(edge, viewport)` → { w, h } for widgets whose shape depends on the edge.
 *   Without it the widget is measured (content-sized, e.g. the cat).
 * - `children({ handleProps, edge, dragging })` renders the widget.
 */
export default function Docked({ id, sizeFor, gap = 0, z = 56, floating = false, children }) {
  const dock = useGameStore((s) => s.layout[id])
  const setDock = useGameStore((s) => s.setDock)
  const vp = useViewport()
  const arcadeOpen = useGameStore((s) => !!s.arcade)
  const arcadeRoom = arcadeInset(vp, arcadeOpen)
  const nasRoom = useGameStore((s) => (ownsExpansion(s, 'nas') && !s.nasUi?.open ? NAS_PEEK_W : 0))
  // Widgets move out of the Arcade sidebar's way, and the NAS's
  const area = dockArea(vp, (arcadeRoom && arcadeRoom + scrollbarWidth()) + nasRoom)
  // Below the lg breakpoint the header isn't sticky: at the top of the page, keep clear of it.
  const headerH = useGameStore((s) => s.headerH ?? 0)
  const ref = useRef(null)
  const gesture = useRef(null)
  const suppressClick = useRef(false)
  const [measured, setMeasured] = useState(null)
  const [drag, setDrag] = useState(null) // { x, y, target } while dragging
  const [animate, setAnimate] = useState(false)

  // Content-sized widgets: track their real size so edge placement stays exact.
  useLayoutEffect(() => {
    const el = ref.current
    if (sizeFor || !el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setMeasured((m) => (m && m.w === r.width && m.h === r.height ? m : { w: r.width, h: r.height }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sizeFor])

  const sizeOf = useCallback((edge) => (sizeFor ? sizeFor(edge, vp) : (measured ?? { w: 0, h: 0 })), [sizeFor, vp, measured])
  const ready = !!sizeFor || !!measured
  const size = sizeOf(dock.edge)
  // (as far as the widget still fits above the taskbar)
  if (vp.w < 1024) area.top = Math.max(0, Math.min(headerH, area.bottom - size.h))
  const pos = drag ?? placeOnEdge(dock, size, area, gap)

  // Enable position transitions one frame after the first real placement (no slide-in on load).
  useEffect(() => {
    if (!ready) return
    const raf = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(raf)
  }, [ready])

  // No accidental text selection while dragging.
  const dragging = !!drag
  useEffect(() => {
    if (!dragging) return
    const prev = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.userSelect = prev
    }
  }, [dragging])

  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest('[data-no-drag]')) return
    const r = ref.current.getBoundingClientRect()
    gesture.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x: r.left, y: r.top, w: r.width, h: r.height, moved: false, target: null }
    try {
      e.currentTarget.setPointerCapture(e.pointerId) // keep receiving moves even when the pointer outruns the widget
    } catch {
      /* pointer no longer active (e.g. synthetic events) — dragging still works while over the handle */
    }
  }

  const onPointerMove = (e) => {
    const g = gesture.current
    if (!g || g.id !== e.pointerId) return
    const dx = e.clientX - g.sx
    const dy = e.clientY - g.sy
    if (!g.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    g.moved = true
    const x = clamp(g.x + dx, area.left, area.right - g.w)
    const y = clamp(g.y + dy, area.top, area.bottom - g.h)
    const pointer = { x: e.clientX, y: e.clientY }
    const rect = { x, y, w: g.w, h: g.h }
    g.target = floating ? snapTarget(pointer, rect, area, sizeOf, SNAP_PX) : dockTarget(pointer, rect, area, sizeOf)
    setDrag({ x, y, target: g.target })
  }

  const finish = (e, commit) => {
    const g = gesture.current
    if (!g || g.id !== e.pointerId) return
    gesture.current = null
    if (g.moved) {
      // The click that follows a drag must not also toggle/expand the widget.
      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false), 0)
      if (commit && g.target) {
        const { edge, at, fx, fy } = g.target
        setDock(id, edge === 'float' ? { edge, fx, fy } : { edge, at })
      }
    }
    setDrag(null)
  }

  const onClickCapture = (e) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    e.stopPropagation()
    e.preventDefault()
  }

  const handleProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp: (e) => finish(e, true),
    onPointerCancel: (e) => finish(e, false),
    onLostPointerCapture: (e) => finish(e, false),
    style: { touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' },
  }

  // No ghost while floating freely: it only appears once an edge is close enough to snap to.
  const ghost = drag?.target && drag.target.edge !== 'float' && { ...placeOnEdge(drag.target, drag.target.size, area, gap), ...drag.target.size }

  return (
    <>
      <div
        ref={ref}
        className="fixed"
        data-dock-edge={dock.edge}
        onClickCapture={onClickCapture}
        style={{
          left: pos.x,
          top: pos.y,
          width: sizeFor ? size.w : undefined,
          height: sizeFor ? size.h : undefined,
          zIndex: dragging ? z + 3 : z,
          visibility: ready ? 'visible' : 'hidden',
          transition: dragging || !animate ? 'none' : `left .32s ${EASE}, top .32s ${EASE}, width .32s ${EASE}, height .32s ${EASE}`,
        }}
      >
        {children({ handleProps, edge: dock.edge, dragging })}
      </div>
      {ghost &&
        createPortal(
          <div className="dock-ghost" style={{ left: ghost.x, top: ghost.y, width: ghost.w, height: ghost.h, zIndex: z + 2 }} />,
          document.body,
        )}
    </>
  )
}
