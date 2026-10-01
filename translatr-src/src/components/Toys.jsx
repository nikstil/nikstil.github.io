import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { TASKBAR_H } from '../lib/dock'
import { sfx } from '../lib/audio/engine'
import { money } from '../lib/format'
import { reducedMotion } from '../lib/settings'

// Small things that live around the edges of the screen: the CEO Dog (in the header), the mouse
// speedometer (header, top right), the paperclip assistant and the snail.

// ================= Pixel art =================
/** A grid of characters → an SVG of 1×1 pixels (`.` is transparent). */
function PixelArt({ rows, palette, className, title }) {
  const rects = []
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.' && palette[ch]) rects.push(<rect key={`${x},${y}`} x={x} y={y} width="1.02" height="1.02" fill={palette[ch]} />)
    }),
  )
  const w = Math.max(...rows.map((r) => r.length))
  return (
    <svg viewBox={`0 0 ${w} ${rows.length}`} className={className} shapeRendering="crispEdges" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {rects}
    </svg>
  )
}

// ================= The Uncanny CEO Dog =================
// A golden retriever in a suit. The eyes are a little too human. The smile is a little too wide.
const DOG = [
  '......gggggggggggg......',
  '....gggggggggggggggg....',
  '...gggggggggggggggggg...',
  '..GGggggggggggggggggGG..',
  '.GGGggkkkggggggkkkggGGG.',
  '.GGGgwwbbwggggwwbbwgGGG.',
  '.GGGgwwkbwggggwwkbwgGGG.',
  'GGGGggwwwggllggwwwggGGGG',
  'GGGGgggggllllllgggggGGGG',
  'GGG.ggggllkkkkllgggg.GGG',
  'GGG.gggglllkklllgggg.GGG',
  'GG..ggkllllllllllkgg..GG',
  'G...gglkwwwwwwwwklgg...G',
  '....gggkkppppppkkggg....',
  '.....ggglkppppklggg.....',
  '......gggllllllggg......',
  '....ssssggggggggssss....',
  '...ssssSwwwttwwwSssss...',
  '..sssssSSwwttwwSSsssss..',
  '.ssssssSSSwttwSSSssssss.',
  'sssssssSSSSttSSSSsssssss',
  'ssssssssSSSttSSSssssssss',
]
const DOG_PALETTE = { g: '#d9a441', G: '#a8721f', l: '#f2cf86', k: '#1a1410', w: '#fbfbf6', b: '#3a7bd5', p: '#e8708f', s: '#262b36', S: '#3b4252', t: '#c0392b' }
// Asleep: the eyes shut (a line where they were) and the grin relaxes a little.
const DOG_ASLEEP = DOG.map((row, y) => {
  if (y === 5 || y === 7) return row.replace(/[wbk]/g, 'g')
  if (y === 6) return row.replace(/[wbk]/g, 'k')
  if (y === 12) return row.replace(/w/g, 'k')
  return row
})

export function CeoDog() {
  const asleep = useGameStore((s) => !!s.premium.dog_nap)
  const [barking, setBarking] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const bark = () => {
    if (asleep) return
    sfx('bark')
    setBarking(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setBarking(false), 450)
  }
  return (
    <div
      className={`ceo-dog ${barking ? 'is-barking' : ''} ${asleep ? 'is-asleep' : ''}`}
      onPointerEnter={bark}
      title={asleep ? 'The Founder & CEO is asleep. (CEO Nap Time™)' : 'The Founder & CEO'}
    >
      <div className="ceo-dog-frame">
        <PixelArt rows={asleep ? DOG_ASLEEP : DOG} palette={DOG_PALETTE} className="ceo-dog-art" title="The Founder & CEO, a golden retriever in a suit" />
        {asleep && <span className="ceo-dog-z" aria-hidden="true">z<b>Z</b></span>}
        {barking && <span className="ceo-dog-woof" aria-hidden="true">WOOF</span>}
      </div>
      <div className="ceo-dog-caption">
        <b>The Founder &amp; CEO</b>
        <span>{asleep ? 'Out of office (asleep)' : 'Good boy. Visionary.'}</span>
      </div>
    </div>
  )
}

// ================= The mouse speedometer =================
const SPEEDO_MAX = 6000 // px/s at the top of the dial
const SPEEDO_SWEEP = 240 // degrees from 0 to max
const CLICKS_KEY = 'translatr-clicks'
const readClicks = () => {
  try {
    return Number(localStorage.getItem(CLICKS_KEY)) || 0
  } catch {
    return 0
  }
}

export function Speedometer() {
  const needle = useRef(null)
  const readout = useRef(null)
  const odometer = useRef(null)
  useEffect(() => {
    let clicks = readClicks()
    let last = null
    let speed = 0 // smoothed px/s
    let raw = 0
    let raf = 0
    let lastFrame = performance.now()
    const showClicks = () => {
      if (odometer.current) odometer.current.textContent = String(clicks % 1e7).padStart(7, '0')
    }
    showClicks()
    const onMove = (e) => {
      const now = performance.now()
      if (last) {
        const dt = (now - last.t) / 1000
        if (dt > 0) raw = Math.max(raw * 0.6, Math.hypot(e.clientX - last.x, e.clientY - last.y) / Math.max(dt, 0.008))
      }
      last = { x: e.clientX, y: e.clientY, t: now }
    }
    // Every button counts: left, right, middle, back, forward.
    const onDown = () => {
      clicks += 1
      showClicks()
      try {
        localStorage.setItem(CLICKS_KEY, String(clicks))
      } catch {
        // not saved: it still counts this session
      }
    }
    const frame = (t) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.1, (t - lastFrame) / 1000)
      lastFrame = t
      if (last && t - last.t > 60) raw *= Math.exp(-dt * 12) // the mouse stopped
      speed += (raw - speed) * (1 - Math.exp(-dt * 10))
      const angle = -SPEEDO_SWEEP / 2 + (Math.min(speed, SPEEDO_MAX * 1.04) / SPEEDO_MAX) * SPEEDO_SWEEP
      if (needle.current) needle.current.setAttribute('transform', `rotate(${angle.toFixed(1)} 50 50)`)
      if (readout.current) readout.current.textContent = String(Math.round(speed))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('mousedown', onDown, true)
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('mousedown', onDown, true)
    }
  }, [])

  // The dial: 0 to 6 (×1000 px/s), a red zone at the top end.
  const ticks = useMemo(() => {
    const out = []
    for (let i = 0; i <= 30; i++) {
      const a = ((-SPEEDO_SWEEP / 2 + (i / 30) * SPEEDO_SWEEP - 90) * Math.PI) / 180
      const major = i % 5 === 0
      const r1 = major ? 35 : 38
      out.push({ x1: 50 + Math.cos(a) * r1, y1: 50 + Math.sin(a) * r1, x2: 50 + Math.cos(a) * 42, y2: 50 + Math.sin(a) * 42, major, red: i >= 25, n: i / 5, lx: 50 + Math.cos(a) * 28, ly: 50 + Math.sin(a) * 28 })
    }
    return out
  }, [])
  const arc = (from, to, r) => {
    const p = (v) => {
      const a = ((-SPEEDO_SWEEP / 2 + (v / SPEEDO_MAX) * SPEEDO_SWEEP - 90) * Math.PI) / 180
      return `${50 + Math.cos(a) * r} ${50 + Math.sin(a) * r}`
    }
    return `M ${p(from)} A ${r} ${r} 0 0 1 ${p(to)}`
  }
  return (
    <div className="speedo" title="Mouse speed (pixels per second) and every mouse click, any button">
      <svg viewBox="0 0 100 100" className="speedo-dial" aria-hidden="true">
        <defs>
          <radialGradient id="speedo-face" cx="50%" cy="45%" r="60%">
            <stop offset="0" stopColor="#2a2f38" />
            <stop offset="1" stopColor="#0b0d11" />
          </radialGradient>
          <linearGradient id="speedo-bezel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f4f6f8" />
            <stop offset="0.5" stopColor="#8a929c" />
            <stop offset="1" stopColor="#d9dde2" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="49" fill="url(#speedo-bezel)" />
        <circle cx="50" cy="50" r="45.5" fill="url(#speedo-face)" />
        <path d={arc(5000, 6000, 40)} fill="none" stroke="#d32f2f" strokeWidth="4" />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.red ? '#ff5a4a' : '#e8e8e8'} strokeWidth={t.major ? 1.8 : 0.8} />
        ))}
        {ticks
          .filter((t) => t.major)
          .map((t) => (
            <text key={t.n} x={t.lx} y={t.ly + 2.6} textAnchor="middle" fontSize="7.5" fontWeight="700" fill={t.red ? '#ff6b5e' : '#f2f2f2'} fontFamily="Arial, sans-serif">
              {t.n}
            </text>
          ))}
        <text x="50" y="36" textAnchor="middle" fontSize="4.6" fill="#9aa3ad" fontFamily="Arial, sans-serif" letterSpacing="0.3">
          ×1000 px/s
        </text>
        <g ref={needle} transform={`rotate(${-SPEEDO_SWEEP / 2} 50 50)`}>
          <path d="M 49 54 L 50 10 L 51 54 Z" fill="#ff3b2f" />
        </g>
        <circle cx="50" cy="50" r="5" fill="#1a1a1a" stroke="#888" strokeWidth="1" />
        <rect x="31" y="63" width="38" height="11" rx="2" fill="#050607" stroke="#3a3f47" strokeWidth="0.8" />
        <text ref={readout} x="50" y="71.6" textAnchor="middle" fontSize="8" fill="#7dff8f" fontFamily="'Courier New', monospace" fontWeight="700">
          0
        </text>
        <text x="50" y="82" textAnchor="middle" fontSize="4.4" fill="#9aa3ad" fontFamily="Arial, sans-serif">
          px/s
        </text>
      </svg>
      <div className="speedo-odo">
        <span className="speedo-odo-label">CLICKS</span>
        <span className="speedo-odo-digits" ref={odometer}>
          0000000
        </span>
      </div>
    </div>
  )
}

// ================= The paperclip =================
// It has one googly eye and nothing useful to say, ever.
const OBSERVATIONS = [
  'It looks like you’re using a mouse.',
  'It looks like you have a screen.',
  'It looks like you’re reading this.',
  'It looks like it’s currently today.',
  'It looks like time is passing.',
  'It looks like your cursor is somewhere on the screen.',
  'It looks like there are pixels.',
  'It looks like you have a keyboard. Or you don’t.',
  'It looks like this sentence is about to end.',
  'It looks like the cat exists.',
  'It looks like you’re still here.',
  'It looks like the top of the screen is above the bottom.',
  'It looks like I have one eye.',
  'It looks like it’s either a weekday or the weekend.',
  'It looks like the ads are ads.',
  'It looks like you have a browser.',
  'It looks like this is TRANSLATR™.',
  'It looks like you’re doing something.',
  'It looks like nothing happened just now.',
  'It looks like some of these things are buttons.',
  'It looks like you blinked.',
  'It looks like the wallpaper is behind the windows.',
  'It looks like you scrolled. Or you didn’t.',
  'It looks like I’m a paperclip.',
  'It looks like the taskbar is at the bottom.',
  'It looks like words are being displayed.',
  'It looks like you have fingers. Probably.',
  'It looks like the internet is on.',
  'It looks like a speech bubble appeared.',
  'It looks like this is still happening.',
  'It looks like you’ve been here for some amount of time.',
  'It looks like you exist.',
]
/** A few observations that notice something about the game (still not helpful). */
function liveObservation(s) {
  const open = 12 - (s.layout?.minimized?.length ?? 0)
  const now = new Date()
  const picks = [
    `It looks like your wallet says ${money(s.money)}.`,
    `It looks like it’s ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`,
    `It looks like ${open} windows are open. Give or take.`,
    `It looks like you’ve seen ${s.adsSeen} ads.`,
    `It looks like the theme is ${s.theme}.`,
  ]
  return picks[Math.floor(Math.random() * picks.length)]
}
const FIRST_TALK_MS = 25_000
const TALK_EVERY = [45_000, 90_000]
const TALK_FOR_MS = 7_000

export function Paperclip() {
  const [line, setLine] = useState(null)
  const pupil = useRef(null)
  const eye = useRef(null)
  const hideTimer = useRef(0)

  const talk = () => {
    const s = useGameStore.getState()
    setLine(Math.random() < 0.3 ? liveObservation(s) : OBSERVATIONS[Math.floor(Math.random() * OBSERVATIONS.length)])
    sfx('boing')
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setLine(null), TALK_FOR_MS)
  }

  // Talks now and then, all by itself.
  useEffect(() => {
    let t = setTimeout(function next() {
      const s = useGameStore.getState()
      if (s.mode && !s.over && !s.shooterOpen && !document.hidden) talk()
      t = setTimeout(next, TALK_EVERY[0] + Math.random() * (TALK_EVERY[1] - TALK_EVERY[0]))
    }, FIRST_TALK_MS)
    return () => {
      clearTimeout(t)
      clearTimeout(hideTimer.current)
    }
  }, [])

  // The googly eye: the pupil lags behind where the mouse is, and wobbles when it gets there.
  useEffect(() => {
    if (reducedMotion()) return
    let target = { x: 0, y: 0 }
    const pos = { x: 0, y: 0, vx: 0, vy: 0 }
    let raf = 0
    const onMove = (e) => {
      const r = eye.current?.getBoundingClientRect()
      if (!r) return
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      const d = Math.hypot(dx, dy) || 1
      const reach = 2.2
      target = { x: (dx / d) * reach, y: (dy / d) * reach }
    }
    const step = () => {
      raf = requestAnimationFrame(step)
      // A loose spring: googly.
      pos.vx += (target.x - pos.x) * 0.08 - pos.vx * 0.12
      pos.vy += (target.y - pos.y) * 0.08 - pos.vy * 0.12 + 0.05
      pos.x += pos.vx
      pos.y += pos.vy
      const d = Math.hypot(pos.x, pos.y)
      if (d > 2.6) {
        pos.x *= 2.6 / d
        pos.y *= 2.6 / d
      }
      pupil.current?.setAttribute('transform', `translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)})`)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <div className="paperclip" style={{ bottom: TASKBAR_H + 10 }}>
      {line && (
        <div className="paperclip-bubble" role="status">
          {line}
        </div>
      )}
      <button className="paperclip-btn" onClick={talk} aria-label="The paperclip (it has something to say)" title="Clippy’s cousin. Less helpful.">
        <svg viewBox="0 0 40 64" className="paperclip-art" aria-hidden="true">
          <defs>
            <linearGradient id="clip-metal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#7d858f" />
              <stop offset="0.45" stopColor="#eef1f4" />
              <stop offset="1" stopColor="#8a929c" />
            </linearGradient>
          </defs>
          {/* a paperclip, bent a bit out of shape */}
          <path
            d="M 14 58 L 14 18 Q 14 6 22 6 Q 30 6 30 18 L 30 46 Q 30 54 24 54 Q 18 54 18 46 L 19 22 Q 19 16 22.5 16 Q 26 17 25.5 23 L 24 40"
            fill="none"
            stroke="url(#clip-metal)"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M 14 58 L 14 18 Q 14 6 22 6 Q 30 6 30 18 L 30 46 Q 30 54 24 54 Q 18 54 18 46 L 19 22 Q 19 16 22.5 16 Q 26 17 25.5 23 L 24 40" fill="none" stroke="rgb(0 0 0 / .25)" strokeWidth="0.6" />
          {/* one googly eye */}
          <g ref={eye}>
            <circle cx="22" cy="28" r="6.5" fill="#fff" stroke="#222" strokeWidth="0.8" />
            <g ref={pupil}>
              <circle cx="22" cy="28" r="3" fill="#111" />
              <circle cx="21" cy="27" r="0.9" fill="#fff" />
            </g>
          </g>
        </svg>
      </button>
    </div>
  )
}

// ================= The snail =================
// A 32-bit snail (two frames) that sets off from the Start button and crawls 5 pixels a minute of
// play. If it reaches the right edge before you reach any ending, the secret choice unlocks.
const SNAIL_PX_PER_MIN = 5
const SNAIL_W = 40
const SNAIL_A = [
  '.........oooooo........',
  '.......ooOOOOOOoo......',
  '......oOOhhhhhhOOo.....',
  '.....oOhhOOOOOOhhOo....',
  '.....oOhOoooooooOhOo.e.',
  '.....oOhOoHHHHHoOhOo.B.e',
  '.....oOhOoHooooHOhOo.B.B',
  '.....oOhhOoooooOhhOo.B.B',
  '......oOhhhhhhhhhOo..bbb',
  '.......ooOOOOOOOoo..bbwbb',
  '..BBbbbbbbbbbbbbbbbbbbbbb',
  '.Bbbbbbbbbbbbbbbbbbbbbbb.',
  'BBBBBBBBBBBBBBBBBBBBBBB..',
]
const SNAIL_B = [
  '.........oooooo..........',
  '.......ooOOOOOOoo........',
  '......oOOhhhhhhOOo.......',
  '.....oOhhOOOOOOhhOo......',
  '.....oOhOoooooooOhOo...e.',
  '.....oOhOoHHHHHoOhOo...B.e',
  '.....oOhOoHooooHOhOo...B.B',
  '.....oOhhOoooooOhhOo...B.B',
  '......oOhhhhhhhhhOo....bbb',
  '.......ooOOOOOOOoo...bbbwbb',
  '..BBbbbbbbbbbbbbbbbbbbbbbbb',
  '.Bbbbbbbbbbbbbbbbbbbbbbbbb.',
  'BBBBBBBBBBBBBBBBBBBBBBBBB..',
]
const SNAIL_PALETTE = { o: '#6b3410', O: '#a85d24', h: '#de9a52', H: '#f7d49c', b: '#a8d86a', B: '#6f9c38', e: '#151515', w: '#ffffff' }

export function Snail() {
  const minutes = useGameStore((s) => (s.stats.playSeconds ?? 0) / 60)
  const arrived = useGameStore((s) => s.snailArrived)
  const gaveUp = useGameStore((s) => !!s.run?.endedAt && !s.snailArrived)
  const playing = useGameStore((s) => !!s.mode)
  const [frame, setFrame] = useState(0)
  const [vw, setVw] = useState(() => document.documentElement.clientWidth)
  const [party, setParty] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => 1 - f), 800)
    const onResize = () => setVw(document.documentElement.clientWidth)
    window.addEventListener('resize', onResize)
    return () => {
      clearInterval(t)
      window.removeEventListener('resize', onResize)
    }
  }, [])
  const edge = vw - SNAIL_W - 6
  const x = arrived ? edge : Math.min(edge, 8 + minutes * SNAIL_PX_PER_MIN)
  useEffect(() => {
    if (arrived || gaveUp || !playing || x < edge) return
    if (useGameStore.getState().arriveSnail()) {
      sfx('fanfare')
      setParty(true)
      setTimeout(() => setParty(false), 5000)
    }
  }, [x, edge, arrived, gaveUp, playing])

  if (gaveUp || !playing) return null
  return (
    <>
      <div className={`snail ${arrived ? 'is-home' : ''}`} style={{ left: x, bottom: TASKBAR_H - 3 }} title={arrived ? 'The snail made it. Buy TRANSLATR™.' : `A snail. ${SNAIL_PX_PER_MIN} pixels a minute. It has somewhere to be.`}>
        {arrived && <span className="snail-flag">🏁</span>}
        <PixelArt rows={frame && !arrived ? SNAIL_B : SNAIL_A} palette={SNAIL_PALETTE} className="snail-art" />
      </div>
      {party && <Confetti />}
    </>
  )
}

// ================= Confetti =================
const CONFETTI_COLORS = ['#ff3b5c', '#ffcf3f', '#39d353', '#3da6e8', '#b967ff', '#ff8a3d', '#ffffff']
export function Confetti({ count = 140 }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * 100,
        delay: Math.random() * 0.9,
        dur: 2.4 + Math.random() * 2,
        drift: (Math.random() - 0.5) * 200,
        spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
      })),
    [count],
  )
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          style={{ left: `${b.x}%`, width: b.w, height: b.h, background: b.color, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, '--drift': `${b.drift}px`, '--spin': `${b.spin}deg` }}
        />
      ))}
    </div>
  )
}
