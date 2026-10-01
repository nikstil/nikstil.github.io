import { flushSync } from 'react-dom'
import { themeById } from '../data/themes'
import { CURSORS } from './cursors'
import { reducedMotion } from './settings'

// Mirrored outside the save so index.html can apply the theme before the first paint.
export const THEME_KEY = 'translatr-theme'

/** Puts a theme on the document: data-theme, its cursor set and the browser chrome colour. */
export function applyTheme(id) {
  const theme = themeById(id)
  const root = document.documentElement
  if (root.dataset.theme !== theme.id) root.dataset.theme = theme.id
  const cursors = CURSORS[theme.cursor]
  root.style.setProperty('--cur-arrow', cursors.arrow)
  root.style.setProperty('--cur-hand', cursors.hand)
  root.style.setProperty('--cur-lock', cursors.lock)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.chrome)
  try {
    localStorage.setItem(THEME_KEY, theme.id)
  } catch {
    // private mode / blocked storage: the save still remembers it
  }
}

/**
 * Switches theme with a circular reveal growing from `origin` (View Transitions API), or
 * instantly where that isn't supported. `commit` updates React state; it runs synchronously
 * inside the transition so the "after" snapshot is complete.
 */
export function switchTheme(id, commit, origin) {
  const run = () => {
    flushSync(commit)
    applyTheme(id)
  }
  if (!document.startViewTransition || reducedMotion()) return run()
  const x = origin?.x ?? 24
  const y = origin?.y ?? window.innerHeight - 22
  const transition = document.startViewTransition(run)
  transition.ready
    .then(() => {
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
    .catch(() => {}) // skipped transitions (e.g. a second click mid-animation) are fine
}

/** The same circular reveal for any other look change (dark mode): `commit` updates React state. */
export function revealChange(commit, origin) {
  if (!document.startViewTransition || reducedMotion()) return commit()
  const x = origin?.x ?? 24
  const y = origin?.y ?? window.innerHeight - 22
  const transition = document.startViewTransition(() => flushSync(commit))
  transition.ready
    .then(() => {
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' },
      )
    })
    .catch(() => {})
}
