import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'

const INTERACTIVE = 'button:not(:disabled), a[href], [role="button"], [role="switch"], select, summary, input[type="range"], input[type="checkbox"], label[for]'
const PRICE = /\$\s?[\d,]+(?:\.\d{1,2})?/
const FREE_SIZE = 22 // px, the reticle while it's just following you
const LOCK_PAD = 6 // px of air around a locked-on target
const PX_PER_POINT = 40 // mouse travel per "data point" sold
const CLICK_POINTS = 7

/**
 * DataHarvester™: a targeting reticle that trails your (native, lag-free) cursor, counts the
 * "data points" it is selling, and snaps its brackets around anything clickable, quoting the
 * price when there is one. Pure decoration: pointer-events none, one rAF loop that only runs
 * while something is moving, and it switches itself off on touch screens and for reduced motion.
 */
export default function DataHarvester() {
  const [fine] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches)
  const motion = useGameStore((s) => s.settings?.motion ?? 'auto')
  const enabled = fine && !(motion === 'reduce' || (motion === 'auto' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches))
  const ref = useRef(null)
  const tagRef = useRef(null)

  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    const tag = tagRef.current
    const s = { px: -100, py: -100, x: -100, y: -100, w: FREE_SIZE, h: FREE_SIZE, target: null, raf: 0, last: 0, points: 0, travel: 0, text: '' }

    const setText = (text) => {
      if (text !== s.text) tag.textContent = s.text = text
    }
    const label = () => {
      if (!s.target) return setText(`DATA SOLD · ${Math.floor(s.points).toLocaleString()}`)
      const price = s.target.textContent?.match(PRICE)?.[0]
      setText(price ? `TARGET · ${price.replace(/\s/g, '')}` : 'TARGET ACQUIRED')
    }

    const frame = (t) => {
      const dt = Math.min(0.05, (t - s.last) / 1000 || 0.016)
      s.last = t
      const target = s.target?.isConnected ? s.target : null
      let gx = s.px
      let gy = s.py
      let gw = FREE_SIZE
      let gh = FREE_SIZE
      if (target) {
        const r = target.getBoundingClientRect()
        gx = r.left + r.width / 2
        gy = r.top + r.height / 2
        gw = r.width + LOCK_PAD * 2
        gh = r.height + LOCK_PAD * 2
      }
      const k = 1 - Math.exp(-dt * (target ? 20 : 14)) // critically-damped-ish follow
      s.x += (gx - s.x) * k
      s.y += (gy - s.y) * k
      s.w += (gw - s.w) * k
      s.h += (gh - s.h) * k
      // `translate`, not `transform`: the click squeeze (a `scale` animation) is applied on top of
      // `transform` and would shrink the position too, flinging the reticle toward the top-left.
      el.style.translate = `${s.x - s.w / 2}px ${s.y - s.h / 2}px`
      el.style.width = `${s.w}px`
      el.style.height = `${s.h}px`
      const settled = Math.abs(gx - s.x) + Math.abs(gy - s.y) + Math.abs(gw - s.w) + Math.abs(gh - s.h) < 0.5
      // A locked target can move on its own (bouncing ads, scrolling), so keep watching it.
      s.raf = settled && !target ? 0 : requestAnimationFrame(frame)
    }
    const wake = () => {
      if (s.raf) return
      s.last = performance.now()
      s.raf = requestAnimationFrame(frame)
    }

    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return el.classList.remove('is-on')
      if (s.px > -100) s.travel += Math.hypot(e.clientX - s.px, e.clientY - s.py)
      s.px = e.clientX
      s.py = e.clientY
      if (s.travel >= PX_PER_POINT) {
        s.points += Math.floor(s.travel / PX_PER_POINT)
        s.travel %= PX_PER_POINT
        if (!s.target) label()
      }
      el.classList.add('is-on')
      wake()
    }
    const onOver = (e) => {
      const hit = e.target.closest?.(INTERACTIVE) ?? null
      if (hit === s.target) return
      s.target = hit
      el.classList.toggle('is-locked', !!hit)
      label()
      wake()
    }
    let clickTimer = 0
    const onDown = () => {
      s.points += CLICK_POINTS
      el.classList.remove('is-click')
      void el.offsetWidth // restart the animation
      el.classList.add('is-click')
      clearTimeout(clickTimer)
      clickTimer = setTimeout(() => el.classList.remove('is-click'), 260)
      label()
    }
    const onLeave = () => el.classList.remove('is-on')

    label()
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('scroll', wake, { passive: true, capture: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    window.addEventListener('blur', onLeave)
    return () => {
      cancelAnimationFrame(s.raf)
      clearTimeout(clickTimer)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', wake, { capture: true })
      document.documentElement.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('blur', onLeave)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <div ref={ref} className="harvester" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <span ref={tagRef} className="harvester-tag" />
    </div>
  )
}
