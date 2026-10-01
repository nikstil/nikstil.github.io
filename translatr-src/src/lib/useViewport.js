import { useEffect, useState } from 'react'

const read = () => ({ w: window.innerWidth, h: window.innerHeight })

/**
 * Viewport size. Updated directly on `resize` (browsers already fire it at most once per
 * frame). Deliberately not deferred with requestAnimationFrame: rAF is paused in background
 * tabs, which would leave docked widgets placed for a stale window size.
 */
export function useViewport() {
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const onResize = () =>
      setVp((prev) => {
        const next = read()
        return prev.w === next.w && prev.h === next.h ? prev : next
      })
    onResize() // catch any resize between first render and this effect
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return vp
}
