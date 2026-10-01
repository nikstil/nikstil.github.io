import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { AdBody, DvdLogo } from './AdFormats'
import { TASKBAR_H } from '../lib/dock'
import { sfx } from '../lib/audio/engine'
import { reducedMotion } from '../lib/settings'

const SLIPPERY_GIVE_UP_AFTER = 25
const MAX_FLOATING_Z = 190 // ads may pile up forever, but never above system modals (240+)
const DRAG_THRESHOLD = 4 // px before a press on an ad becomes a drag
const THROW_WINDOW_MS = 90 // recent pointer samples that decide a throw
const MAX_THROW = 1600 // px/s
const CORNER_TOLERANCE = 5 // px from a corner that still counts as hitting it
const CORNER_MS = 2200
const DVD_COLORS = ['#ff2d95', '#00c2ff', '#ffd000', '#4fdc2a', '#ff7a1a', '#a468ff', '#ff3b3b', '#00e0b0']

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const viewW = () => document.documentElement.clientWidth
const viewH = () => document.documentElement.clientHeight
function nextColor(current) {
  let c
  do c = DVD_COLORS[Math.floor(Math.random() * DVD_COLORS.length)]
  while (c === current)
  return c
}
/** Bounces position `p` (moving at `v`) off walls at 0 and `max`: returns [p, v, hitAWall]. */
function reflect(p, v, max) {
  if (p < 0) return [Math.min(-p, max), Math.abs(v), true]
  if (p > max) return [Math.max(2 * max - p, 0), -Math.abs(v), true]
  return [p, v, false]
}

/** Renders ads. Spawning is handled by the game loop in the store. */
export default function AdLayer() {
  const ads = useGameStore((s) => s.ads)
  const [raised, setRaised] = useState([]) // ads the player grabbed, most recent last (drawn on top)
  const [corners, setCorners] = useState([])

  useEffect(() => {
    setRaised((r) => {
      const live = r.filter((id) => ads.some((a) => a.id === id))
      return live.length === r.length ? r : live
    })
  }, [ads])

  // Ad-blocker bait: blockers hide classic ad class names. Ours aren't named like ads, so they
  // still show; the player just gets told off for trying.
  useEffect(() => {
    const bait = document.createElement('div')
    bait.className = 'ad-banner adsbox ad-slot'
    bait.setAttribute('aria-hidden', 'true')
    bait.style.cssText = 'position:absolute;left:-9999px;top:0;width:2px;height:2px;'
    bait.innerHTML = '&nbsp;'
    document.body.appendChild(bait)
    const t = setTimeout(() => {
      if (bait.offsetHeight === 0 || getComputedStyle(bait).display === 'none') {
        useGameStore.getState().toast('🛡️ Ad blocker detected. Cute. Our ads are made in-house, by hand. They cannot be blocked.', 'info')
      }
    }, 2500)
    return () => {
      clearTimeout(t)
      bait.remove()
    }
  }, [])

  const raise = useCallback((id) => setRaised((r) => (r.at(-1) === id ? r : [...r.filter((x) => x !== id), id])), [])
  const celebrate = useCallback((hit) => {
    sfx('jackpot')
    useGameStore.getState().dvdCornerHit()
    setCorners((cs) => [...cs.slice(-2), makeCornerHit(hit)])
  }, [])
  const clearCorner = useCallback((id) => setCorners((cs) => cs.filter((c) => c.id !== id)), [])

  const zFor = (ad, i) => {
    const k = raised.indexOf(ad.id)
    return Math.min(60 + (k < 0 ? i : ads.length + k), MAX_FLOATING_Z)
  }

  return (
    <>
      {ads.map((ad, i) =>
        ad.type === 'trap' ? (
          <TrapAd key={ad.id} ad={ad} onCorner={celebrate} />
        ) : (
          <FloatingAd key={ad.id} ad={ad} z={zFor(ad, i)} onRaise={raise} onCorner={celebrate} />
        ),
      )}
      {corners.map((c) => (
        <CornerHit key={c.id} hit={c} onDone={clearCorner} />
      ))}
    </>
  )
}

/**
 * Puts an ad on screen, lets the player drag it anywhere (it always stays fully visible:
 * you may move the ad, not hide it) and, for DVD ads, bounces it off the screen edges like
 * the old DVD screensaver, throwing included. The position lives in a ref and is written
 * straight to the DOM, so a bouncing ad doesn't re-render React every frame.
 *   floor:  space kept clear at the bottom (the taskbar; 0 inside a full-screen overlay)
 *   center: start centered instead of at the ad's random spot
 */
function useAdMover(ad, { frameRef, cardRef, floor, center = false, onGrab, onBounce }) {
  const state = useRef(null)
  const listeners = useRef(null)
  const callbacks = useRef({ onGrab, onBounce })
  const [grabbed, setGrabbed] = useState(false)
  useLayoutEffect(() => {
    callbacks.current = { onGrab, onBounce }
  })

  /** The card's size and its offset inside the frame (the slippery ad has invisible padding). */
  const measure = useCallback(() => {
    const card = cardRef.current
    let ox = 0
    let oy = 0
    for (let n = card; n && n !== frameRef.current; n = n.offsetParent) {
      ox += n.offsetLeft
      oy += n.offsetTop
    }
    return { w: card.offsetWidth, h: card.offsetHeight, ox, oy }
  }, [cardRef, frameRef])

  const limits = useCallback(() => {
    const { w, h } = state.current.box
    return { maxX: Math.max(0, viewW() - w), maxY: Math.max(0, viewH() - floor - h) }
  }, [floor])

  const write = useCallback(() => {
    const s = state.current
    frameRef.current.style.transform = `translate3d(${s.x - s.box.ox}px, ${s.y - s.box.oy}px, 0)`
  }, [frameRef])

  // Initial placement, before the first paint.
  useLayoutEffect(() => {
    const s = { x: 0, y: 0, vx: 0, vy: 0, cruise: 0, box: measure(), drag: null, bounceAt: 0, cornerAt: -Infinity }
    state.current = s
    const { maxX, maxY } = limits()
    s.cruise = clamp(viewW() * 0.1, 90, 160)
    const d = s.cruise / Math.SQRT2 // the classic 45° diagonal
    s.vx = Math.random() < 0.5 ? d : -d
    s.vy = Math.random() < 0.5 ? d : -d
    if (ad.aim === 'corner') {
      // Debug: lined up to hit the bottom-right corner in about a second.
      const t = Math.min(1.2, maxX / d, maxY / d) * 0.95
      s.vx = d
      s.vy = d
      s.x = maxX - d * t
      s.y = maxY - d * t
    } else if (center) {
      s.x = maxX / 2
      s.y = maxY / 2
    } else {
      s.x = maxX > 8 ? clamp((ad.x / 100) * viewW(), 4, maxX - 4) : maxX / 2
      s.y = maxY > 8 ? clamp((ad.y / 100) * viewH(), 4, maxY - 4) : maxY / 2
    }
    write()
    // Mount-only: the ad's spawn spot is fixed for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep it on screen when the window or the ad changes size.
  useEffect(() => {
    const refit = () => {
      const s = state.current
      s.box = measure()
      const { maxX, maxY } = limits()
      s.x = clamp(s.x, 0, maxX)
      s.y = clamp(s.y, 0, maxY)
      write()
    }
    window.addEventListener('resize', refit)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(refit) : null
    ro?.observe(cardRef.current)
    return () => {
      window.removeEventListener('resize', refit)
      ro?.disconnect()
    }
  }, [cardRef, limits, measure, write])

  // The DVD screensaver (parked when motion is reduced).
  useEffect(() => {
    if (!ad.bounce || reducedMotion()) return
    let last = performance.now()
    let raf = requestAnimationFrame(step)
    function step(t) {
      raf = requestAnimationFrame(step)
      const dt = clamp((t - last) / 1000, 0, 0.05) // no teleporting after a background tab
      last = t
      const s = state.current
      if (s.drag?.active) return
      // A thrown ad drifts back to cruising speed.
      const speed = Math.hypot(s.vx, s.vy)
      if (speed > 0 && Math.abs(speed - s.cruise) > 0.5) {
        const k = (speed + (s.cruise - speed) * (1 - Math.exp(-1.4 * dt))) / speed
        s.vx *= k
        s.vy *= k
      }
      const { maxX, maxY } = limits()
      let hitX = false
      let hitY = false
      // An ad too big to move along an axis (tiny screens) just sits at the edge on that axis.
      if (maxX < 1) s.x = 0
      else [s.x, s.vx, hitX] = reflect(s.x + s.vx * dt, s.vx, maxX)
      if (maxY < 1) s.y = 0
      else [s.y, s.vy, hitY] = reflect(s.y + s.vy * dt, s.vy, maxY)
      write()
      if (!hitX && !hitY) return
      const near = (v, max) => v <= CORNER_TOLERANCE || v >= max - CORNER_TOLERANCE
      const corner = maxX >= 1 && maxY >= 1 && near(s.x, maxX) && near(s.y, maxY) && t - s.cornerAt > 600
      if (corner) s.cornerAt = t
      callbacks.current.onBounce?.({
        corner,
        recolor: t - s.bounceAt > 150, // two walls at once (a corner) is one colour change
        x: s.x <= CORNER_TOLERANCE ? 0 : viewW(),
        y: s.y <= CORNER_TOLERANCE ? 0 : viewH() - floor,
      })
      s.bounceAt = t
    }
    return () => cancelAnimationFrame(raf)
  }, [ad.bounce, floor, limits, write])

  const detach = useCallback(() => {
    const l = listeners.current
    if (!l) return
    window.removeEventListener('pointermove', l.move)
    window.removeEventListener('pointerup', l.finish)
    window.removeEventListener('pointercancel', l.finish)
    listeners.current = null
  }, [])

  // Closing an ad mid-drag (it happens: the ad timer doesn't care) mustn't leave the page stuck.
  useEffect(
    () => () => {
      if (!listeners.current) return
      detach()
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    },
    [detach],
  )

  const onPointerDown = useCallback(
    (e) => {
      const s = state.current
      if (!s || e.button !== 0 || s.drag || e.target.closest('button, a, input, select, textarea')) return
      // On touch, only the header drags, so a finger on the ad can still scroll the page.
      if (e.pointerType !== 'mouse' && !e.target.closest('[data-floater-grip]')) return
      callbacks.current.onGrab?.()
      s.drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: s.x, oy: s.y, active: false, samples: [] }

      const finish = (ev) => {
        const d = s.drag
        if (!d || ev.pointerId !== d.id) return
        detach()
        s.drag = null
        if (!d.active) return
        setGrabbed(false)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        useGameStore.getState().noteAdDragged()
        if (!ad.bounce) return
        // Throw: fly off the way it was flung (then settle back to cruising speed).
        const a = d.samples[0]
        const b = d.samples.at(-1)
        const dt = a && b ? (b.t - a.t) / 1000 : 0
        if (dt < 0.01 || performance.now() - b.t > THROW_WINDOW_MS) return // let go without flinging
        const vx = (b.x - a.x) / dt
        const vy = (b.y - a.y) / dt
        const sp = Math.hypot(vx, vy)
        if (sp < 60) return
        const k = Math.min(1, MAX_THROW / sp)
        const minPart = 0.25 * sp * k // never perfectly flat, or it would never reach a corner
        s.vx = Math.sign(vx || 1) * Math.max(Math.abs(vx * k), minPart)
        s.vy = Math.sign(vy || 1) * Math.max(Math.abs(vy * k), minPart)
      }
      const move = (ev) => {
        const d = s.drag
        if (!d || ev.pointerId !== d.id) return
        if (ev.pointerType === 'mouse' && ev.buttons === 0) return finish(ev) // released outside the window
        if (!d.active) {
          if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < DRAG_THRESHOLD) return
          d.active = true
          setGrabbed(true)
          document.body.style.userSelect = 'none'
          document.body.style.cursor = 'grabbing'
        }
        const { maxX, maxY } = limits()
        s.x = clamp(d.ox + ev.clientX - d.sx, 0, maxX)
        s.y = clamp(d.oy + ev.clientY - d.sy, 0, maxY)
        write()
        const now = performance.now()
        d.samples.push({ t: now, x: ev.clientX, y: ev.clientY })
        while (d.samples.length > 2 && now - d.samples[0].t > THROW_WINDOW_MS) d.samples.shift()
      }
      listeners.current = { move, finish }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', finish)
      window.addEventListener('pointercancel', finish)
    },
    [ad.bounce, detach, limits, write],
  )

  return { grabbed, onPointerDown }
}

/** DVD ads: colour change on every bounce, a bounce/corner counter, and the corner callback. */
function useDvd(ad, frameRef, onCorner) {
  const [initialColor] = useState(() => nextColor())
  const color = useRef(initialColor)
  const [score, setScore] = useState({ bounces: 0, corners: 0 })
  const onBounce = useCallback(
    (hit) => {
      if (hit.recolor) {
        color.current = nextColor(color.current)
        frameRef.current?.style.setProperty('--dvd', color.current)
      }
      setScore((sc) => ({ bounces: sc.bounces + 1, corners: sc.corners + (hit.corner ? 1 : 0) }))
      useGameStore.getState().noteDvdBounce()
      if (hit.corner) onCorner({ x: hit.x, y: hit.y, color: color.current })
    },
    [frameRef, onCorner],
  )
  return { enabled: !!ad.bounce, initialColor, ...score, onBounce: ad.bounce ? onBounce : undefined }
}

function FloatingAd({ ad, z, onRaise, onCorner }) {
  const closeAd = useGameStore((s) => s.closeAd)
  const frameRef = useRef(null)
  const cardRef = useRef(null)
  const dvd = useDvd(ad, frameRef, onCorner)
  const mover = useAdMover(ad, { frameRef, cardRef, floor: TASKBAR_H, onGrab: () => onRaise(ad.id), onBounce: dvd.onBounce })
  const close = () => closeAd(ad.id)

  return (
    <div
      ref={frameRef}
      className={`floater ${mover.grabbed ? 'is-grabbed' : ''}`}
      style={{ zIndex: z, '--dvd': dvd.initialColor }}
      onPointerDown={mover.onPointerDown}
    >
      {ad.type === 'slippery' ? (
        <SlipperyAd ad={ad} cardRef={cardRef} dvd={dvd} onClose={close} />
      ) : (
        <div className="anim-modal-in relative">
          <AdBody ad={ad} cardRef={cardRef} dvd={dvd} />
          <CloseButton onClick={close} className="absolute right-1.5 top-[2px]" />
        </div>
      )}
    </div>
  )
}

function CloseButton({ className = '', style, ...props }) {
  return (
    <button
      aria-label="Close ad"
      className={`flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-[#fff] ring-1 ring-[#fff]/30 transition hover:bg-blood ${className}`}
      style={style}
      {...props}
    >
      ✕
    </button>
  )
}

/** Every 20th ad: the close button runs away from your cursor (but never off the screen). */
function SlipperyAd({ ad, cardRef, dvd, onClose }) {
  const zoneRef = useRef(null)
  const btnRef = useRef(null)
  const fledOnTouch = useRef(false)
  const [pos, setPos] = useState(null)
  const [dodges, setDodges] = useState(0)
  const tired = dodges >= SLIPPERY_GIVE_UP_AFTER

  const flee = (cx, cy) => {
    const zone = zoneRef.current?.getBoundingClientRect()
    if (!zone) return
    const maxX = viewW() - 28
    const maxY = viewH() - TASKBAR_H - 28
    let best = null
    for (let k = 0; k < 20; k++) {
      const left = Math.random() * (zone.width - 28)
      const top = Math.random() * (zone.height - 28)
      const ax = zone.left + left
      const ay = zone.top + top
      if (ax < 0 || ay < 0 || ax > maxX || ay > maxY) continue // off screen isn't a hiding spot
      const d = Math.hypot(ax + 14 - cx, ay + 14 - cy)
      if (!best || d > best.d) best = { left, top, d }
      if (d > 180) break
    }
    if (!best) return
    setPos({ left: best.left, top: best.top })
    setDodges((n) => n + 1)
  }

  const onMove = (e) => {
    if (tired || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    if (Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY) < 80) flee(e.clientX, e.clientY)
  }

  return (
    // Invisible padding around the ad is the "danger zone" the X watches.
    <div ref={zoneRef} className="anim-modal-in relative p-10" onMouseMove={onMove}>
      <AdBody ad={ad} cardRef={cardRef} dvd={dvd} />
      <CloseButton
        ref={btnRef}
        onMouseEnter={(e) => !tired && flee(e.clientX, e.clientY)}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' && !tired) {
            fledOnTouch.current = true
            flee(e.clientX, e.clientY)
          }
        }}
        onClick={() => {
          if (fledOnTouch.current) return (fledOnTouch.current = false)
          onClose()
        }}
        className="absolute transition-all duration-100"
        style={pos ? { left: pos.left, top: pos.top } : { right: 46, top: 42 }}
      />
      {tired && <span className="absolute bottom-2 left-12 font-display text-sm font-semibold text-ink drop-shadow-[0_2px_4px_#000]">😮‍💨 ok fine, close me</span>}
    </div>
  )
}

/** Every 25th ad: close it before 10s and lose your entire save (and all other ads). */
function TrapAd({ ad, onCorner }) {
  const [left, setLeft] = useState(10)
  const frameRef = useRef(null)
  const cardRef = useRef(null)
  const dvd = useDvd(ad, frameRef, onCorner)
  const mover = useAdMover(ad, { frameRef, cardRef, floor: 0, center: true, onBounce: dvd.onBounce })

  useEffect(() => {
    if (left <= 0) return
    if (left < 10) sfx('tick')
    const id = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(id)
  }, [left])

  const onClose = () => {
    const { closeAd, hardReset } = useGameStore.getState()
    closeAd(ad.id)
    if (left > 0) hardReset()
  }

  return (
    <div className="anim-backdrop-in fixed inset-0 z-[200] overflow-hidden bg-[radial-gradient(circle,rgba(120,0,20,.55),rgba(0,0,0,.92))] backdrop-blur-md">
      <div
        ref={frameRef}
        className={`floater ${mover.grabbed ? 'is-grabbed' : ''}`}
        style={{ position: 'absolute', '--dvd': dvd.initialColor }}
        onPointerDown={mover.onPointerDown}
      >
        <div
          ref={cardRef}
          data-floater-grip
          className={`floater-card floater-grip modal-card scanlines anim-modal-in relative w-[min(28rem,calc(100vw-2rem))] overflow-hidden p-7 text-center ${dvd.enabled ? 'dvd-glow' : ''}`}
          style={{ '--accent': '#ff3b5c', borderColor: 'rgba(255,59,92,.5)' }}
        >
          <button
            onClick={onClose}
            aria-label="Close ad"
            className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-ink/5 text-sm text-ink/60 ring-1 ring-ink/15 transition hover:bg-blood hover:text-ink"
          >
            ✕
          </button>
          {dvd.enabled && <DvdLogo className="mx-auto mb-2 block h-6" />}
          <div className="label mb-2 text-blood/80">Mandatory Premium Partner Message · #{ad.n}</div>
          <div className="font-display text-2xl font-bold tracking-wide glow-blood animate-flash">DO NOT CLOSE BEFORE 10 SECONDS</div>
          <p className="mt-3 text-sm text-ink/60">
            Closing early will <b className="text-blood">permanently delete your save file</b>.
          </p>
          <div className="relative mx-auto my-6 grid h-32 w-32 place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={left > 0 ? '#ff3b5c' : '#39ff14'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (left / 10)}
                style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 6px ${left > 0 ? '#ff3b5c' : '#39ff14'})` }}
              />
            </svg>
            <span className={`font-mono text-5xl font-bold ${left > 0 ? 'text-ink' : 'glow-toxic'}`}>{left > 0 ? left : '✓'}</span>
          </div>
          <p className="text-sm text-ink/45">
            {left > 0
              ? `Please enjoy this tasteful ${dvd.enabled ? 'bouncing' : 'black'} rectangle.`
              : 'You may now close this ad. Well done. Truly.'}
          </p>
        </div>
      </div>
    </div>
  )
}

let cornerSeq = 0
function makeCornerHit({ x, y, color }) {
  // Particles spray inward, away from the two walls that were hit.
  const inward = Math.atan2(y > 0 ? -1 : 1, x > 0 ? -1 : 1)
  return {
    id: ++cornerSeq,
    x,
    y,
    color,
    particles: Array.from({ length: 36 }, () => {
      const angle = inward + (Math.random() - 0.5) * 1.9
      const dist = 70 + Math.random() * 150
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        color: DVD_COLORS[Math.floor(Math.random() * DVD_COLORS.length)],
        size: 4 + Math.random() * 7,
        delay: Math.random() * 90,
      }
    }),
  }
}

/** The moment everyone in the office was waiting for. */
function CornerHit({ hit, onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(hit.id), CORNER_MS)
    return () => clearTimeout(t)
  }, [hit.id, onDone])
  const right = hit.x > 0
  const bottom = hit.y > 0
  return (
    <div className="pointer-events-none fixed inset-0 z-[235] overflow-hidden" aria-hidden="true">
      <div className="burst" style={{ left: hit.x, top: hit.y }}>
        <span className="shockwave" style={{ color: hit.color, width: 44, height: 44 }} />
        {hit.particles.map((p, i) => (
          <span
            key={i}
            className="particle"
            style={{ color: p.color, '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--size': `${p.size}px`, animationDelay: `${p.delay}ms` }}
          />
        ))}
      </div>
      <div
        className="dvd-corner-text"
        style={{
          '--dvd': hit.color,
          left: hit.x,
          top: hit.y,
          transform: `translate(${right ? 'calc(-100% - 24px)' : '24px'}, ${bottom ? 'calc(-100% - 24px)' : '24px'})`,
        }}
      >
        📀 IT HIT THE CORNER!
      </div>
    </div>
  )
}
