// Graphics "Auto": watches how fast the page actually draws for a few seconds after it opens.
// If the median frame takes longer than SLOW_FRAME_MS (under ~33 fps), the device is struggling
// and `onSlow` runs (once). Only counts while the page is visible: hidden tabs don't draw at all.

const SLOW_FRAME_MS = 30

/** Starts watching. Returns a function that stops it. */
export function watchFrameRate(onSlow, { delayMs = 4_000, sampleMs = 5_000 } = {}) {
  let raf = 0
  let timer = 0
  let stopped = false

  const whenVisible = (fn) => {
    if (!document.hidden) return fn()
    const on = () => {
      if (document.hidden) return
      document.removeEventListener('visibilitychange', on)
      fn()
    }
    document.addEventListener('visibilitychange', on)
  }
  // Let the page settle (fonts, lazy windows, the first ads) before judging it.
  const later = () => whenVisible(() => (timer = setTimeout(sample, delayMs)))

  function sample() {
    if (stopped) return
    const frames = []
    let last = performance.now()
    const end = last + sampleMs
    const step = (t) => {
      if (stopped) return
      if (document.hidden) return later() // start over once it's visible again
      frames.push(t - last)
      last = t
      if (t < end) {
        raf = requestAnimationFrame(step)
        return
      }
      frames.sort((a, b) => a - b)
      const median = frames[frames.length >> 1] ?? 0
      if (median > SLOW_FRAME_MS) onSlow({ median: Math.round(median), fps: Math.round(1000 / median) })
    }
    raf = requestAnimationFrame(step)
  }

  later()
  return () => {
    stopped = true
    cancelAnimationFrame(raf)
    clearTimeout(timer)
  }
}
