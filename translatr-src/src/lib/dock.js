// Edge-docking geometry for draggable widgets (DoomFeed™, the cat).
// A dock is { edge: 'left' | 'right' | 'top' | 'bottom', at: 0..1 }, where `at` is the
// fraction of free travel along that edge — so positions survive any window size.
// Floating widgets (DoomFeed™) can also be { edge: 'float', fx, fy }: fractions of the free
// travel across and down the screen.

export const TASKBAR_H = 44 // the taskbar owns the bottom strip of the screen
export const EDGES = ['left', 'right', 'top', 'bottom']
export const isHorizontalEdge = (edge) => edge === 'top' || edge === 'bottom'

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi))

// The Arcade is a sidebar docked to the right of the screen. On screens with room to spare the
// page and the docked widgets move over for it; on narrower ones it covers the screen instead.
export const ARCADE_WIDTH = 420
const ARCADE_MIN_BESIDE = 600 // px of game that must still fit beside it
/** How much of the right edge the open Arcade sidebar takes away from the page (0 if it overlays). */
export const arcadeInset = (vp, open) => (open && vp.w - ARCADE_WIDTH >= ARCADE_MIN_BESIDE ? ARCADE_WIDTH : 0)
/** The page's vertical scrollbar: fixed things (the sidebar) sit left of it, but vp.w includes it. */
export const scrollbarWidth = () => (typeof document === 'undefined' ? 0 : Math.max(0, window.innerWidth - document.documentElement.clientWidth))

/** The part of the viewport widgets may occupy (`rightInset`: room taken by the Arcade sidebar). */
export const dockArea = (vp, rightInset = 0) => ({ left: 0, top: 0, right: vp.w - rightInset, bottom: vp.h - TASKBAR_H })

/** Top-left corner of a widget of `size` docked at `dock` inside `area`. */
export function placeOnEdge({ edge, at, fx, fy }, size, area, gap = 0) {
  if (edge === 'float') {
    return {
      x: area.left + clamp(fx ?? 0.5, 0, 1) * Math.max(0, area.right - area.left - size.w),
      y: area.top + clamp(fy ?? 0.5, 0, 1) * Math.max(0, area.bottom - area.top - size.h),
    }
  }
  const a = clamp(at ?? 0, 0, 1)
  const alongX = area.left + a * Math.max(0, area.right - area.left - size.w)
  const alongY = area.top + a * Math.max(0, area.bottom - area.top - size.h)
  switch (edge) {
    case 'left':
      return { x: area.left + gap, y: alongY }
    case 'right':
      return { x: area.right - size.w - gap, y: alongY }
    case 'top':
      return { x: alongX, y: area.top + gap }
    default:
      return { x: alongX, y: area.bottom - size.h - gap }
  }
}

/**
 * Where a widget being dragged would dock: the edge nearest the pointer, keeping the
 * widget's centre (along that edge) where the user dropped it. `sizeForEdge(edge)` lets
 * widgets change shape per edge (DoomFeed™ turns horizontal on top/bottom).
 */
export function dockTarget(pointer, rect, area, sizeForEdge) {
  const dist = {
    left: pointer.x - area.left,
    right: area.right - pointer.x,
    top: pointer.y - area.top,
    bottom: area.bottom - pointer.y,
  }
  const edge = EDGES.reduce((best, e) => (dist[e] < dist[best] ? e : best), 'left')
  return edgeTarget(edge, rect, area, sizeForEdge)
}

/**
 * Free-floating widgets: they only dock when the pointer (i.e. the title bar you're holding)
 * is brought within `snap` px of a screen edge; anywhere else they stay where they're dropped.
 * (Measuring from the pointer, not the widget's sides: a tall widget always touches the top
 * or bottom of the screen, which must not count as "close".) A widget that changes shape when
 * it floats (a top/bottom strip becoming a card) is centred under the pointer instead.
 */
export function snapTarget(pointer, rect, area, sizeForEdge, snap) {
  const dist = {
    left: pointer.x - area.left,
    right: area.right - pointer.x,
    top: pointer.y - area.top,
    bottom: area.bottom - pointer.y,
  }
  const edge = EDGES.reduce((best, e) => (dist[e] < dist[best] ? e : best), 'left')
  if (dist[edge] <= snap) return edgeTarget(edge, rect, area, sizeForEdge)

  const size = sizeForEdge('float')
  const same = Math.abs(size.w - rect.w) < 1 && Math.abs(size.h - rect.h) < 1
  const x = same ? rect.x : pointer.x - size.w / 2
  const y = same ? rect.y : pointer.y - 16 // pointer stays on the title bar
  const travelX = area.right - area.left - size.w
  const travelY = area.bottom - area.top - size.h
  return {
    edge: 'float',
    size,
    fx: travelX > 0 ? clamp((x - area.left) / travelX, 0, 1) : 0,
    fy: travelY > 0 ? clamp((y - area.top) / travelY, 0, 1) : 0,
  }
}

/** Where a widget would sit on `edge`, keeping its centre (along the edge) where it is now. */
function edgeTarget(edge, rect, area, sizeForEdge) {
  const size = sizeForEdge(edge)
  let at
  if (isHorizontalEdge(edge)) {
    const travel = area.right - area.left - size.w
    at = travel > 0 ? clamp((rect.x + rect.w / 2 - size.w / 2 - area.left) / travel, 0, 1) : 0
  } else {
    const travel = area.bottom - area.top - size.h
    at = travel > 0 ? clamp((rect.y + rect.h / 2 - size.h / 2 - area.top) / travel, 0, 1) : 0
  }
  return { edge, at, size }
}

export { clamp }
