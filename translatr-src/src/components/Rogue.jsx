import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { useGameStore } from '../store/useGameStore'
import { ENDING_BY_ID } from '../data/endings'
import { DEBUFF_BY_ID, PERK_BY_ID, rogueLooks, rogueToys } from '../data/rogue'
import { TASKBAR_H } from '../lib/dock'
import { sfx } from '../lib/audio/engine'
import { reducedMotion } from '../lib/settings'

// Roguelike mode: the run's briefing, the badge in the header, the looks some debuffs put on the
// page, and the fly.

const rogueOf = (s) => (s.mode === 'rogue' ? s.rogue : null)

function Card({ item, bad }) {
  return (
    <div className={`rogue-card ${bad ? 'is-bad' : 'is-good'}`}>
      <span className="rogue-card-icon">{item.icon}</span>
      <div>
        <div className="rogue-card-name">{item.name}</div>
        <div className="rogue-card-desc">{item.desc}</div>
      </div>
    </div>
  )
}

/** The run's briefing: shown when it starts (and from the header badge). */
export function RogueBriefing() {
  const rogue = useGameStore(rogueOf)
  const open = useGameStore((s) => !!rogueOf(s) && !s.rogue.seen && !s.over && !s.resetting)
  const target = rogue && ENDING_BY_ID[rogue.target]
  return (
    <Modal open={open} z={470}>
      {rogue && target && (
        <div className="modal-card rogue-briefing w-[min(720px,94vw)] p-6" role="dialog" aria-modal="true" aria-label="Your Roguelike run" style={{ '--accent': '#8e5bd6' }}>
          <div className="label mb-1 text-center">🎲 Roguelike run</div>
          <div className="rogue-target">
            <div className="rogue-target-kicker">Your target{rogue.newTarget ? ' · an ending you haven’t done yet' : ''}</div>
            <div className="rogue-target-title">
              {target.icon} {target.title}
            </div>
            <div className="rogue-target-how">{target.how}</div>
            <div className="rogue-target-rule">Reach any other ending first and the run is lost.</div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="label mb-2">3 perks</div>
              <div className="grid gap-2">
                {rogue.perks.map((id) => PERK_BY_ID[id] && <Card key={id} item={PERK_BY_ID[id]} />)}
              </div>
            </div>
            <div>
              <div className="label mb-2">3 debuffs</div>
              <div className="grid gap-2">
                {rogue.debuffs.map((id) => DEBUFF_BY_ID[id] && <Card key={id} item={DEBUFF_BY_ID[id]} bad />)}
              </div>
            </div>
          </div>
          <button className="btn btn-magenta mt-5 w-full py-2.5" onClick={() => useGameStore.getState().seeRogue()}>
            Start the run
          </button>
        </div>
      )}
    </Modal>
  )
}

/** In the header: what you're going for. Click for the full briefing. */
export function RogueBadge() {
  const rogue = useGameStore(rogueOf)
  if (!rogue) return null
  const target = ENDING_BY_ID[rogue.target]
  const lines = [...rogue.perks.map((id) => `＋ ${PERK_BY_ID[id]?.name}`), ...rogue.debuffs.map((id) => `－ ${DEBUFF_BY_ID[id]?.name}`)].join('\n')
  return (
    <button className="stat-tile text-left" onClick={() => useGameStore.setState((s) => ({ rogue: { ...s.rogue, seen: false } }))} title={`Roguelike run\n${lines}\n(click for the briefing)`}>
      <div className="stat-label">🎲 Roguelike target</div>
      <div className="font-mono text-sm font-semibold text-magenta">
        {target?.icon} {target?.title}
        {rogue.result && (rogue.result === 'win' ? ' ✓' : ' ✗')}
      </div>
    </button>
  )
}

/** Debuffs that change how the page looks (Tilted, Comic Sans, Deep Fried…): classes on <html>. */
export function RogueLooks() {
  const looks = useGameStore((s) => rogueLooks(rogueOf(s)).join(' '))
  useLayoutEffect(() => {
    const list = looks ? looks.split(' ') : []
    list.forEach((c) => document.documentElement.classList.add(c))
    return () => list.forEach((c) => document.documentElement.classList.remove(c))
  }, [looks])
  return null
}

export const useRogueToy = (toy) => useGameStore((s) => rogueToys(rogueOf(s)).includes(toy))

// ================= The fly =================
// Buzzes around for 2 minutes, lands on a window and sits there for 5, rubbing its legs together.
// The window under it can't be used until it leaves.
// (?debug&flyscale=0.01 speeds it up, for testing.)
const FLY_SCALE = (() => {
  const q = new URLSearchParams(location.search)
  return q.has('debug') ? Number(q.get('flyscale')) || 1 : 1
})()
const FLY_BUZZ_MS = 2 * 60_000 * FLY_SCALE
const FLY_SIT_MS = 5 * 60_000 * FLY_SCALE

/** Two frames: front legs up (rubbing) and down. */
function FlySprite({ rubbing, frame }) {
  return (
    <svg viewBox="0 0 24 20" className="fly-art" aria-hidden="true">
      {/* wings */}
      <ellipse cx="8" cy="6" rx="6" ry="3.4" fill="rgb(210 230 255 / .65)" stroke="rgb(90 110 140 / .6)" strokeWidth=".5" className={rubbing ? '' : 'fly-wing'} />
      <ellipse cx="16" cy="6" rx="6" ry="3.4" fill="rgb(210 230 255 / .65)" stroke="rgb(90 110 140 / .6)" strokeWidth=".5" className={rubbing ? '' : 'fly-wing fly-wing-r'} />
      {/* body */}
      <ellipse cx="12" cy="11" rx="4" ry="5.5" fill="#1d2420" />
      <ellipse cx="12" cy="10" rx="2.6" ry="3.6" fill="#2f4a3a" />
      {/* head with big red eyes */}
      <circle cx="12" cy="5" r="3" fill="#1d2420" />
      <circle cx="10.2" cy="4.4" r="1.6" fill="#a8261c" />
      <circle cx="13.8" cy="4.4" r="1.6" fill="#a8261c" />
      {/* legs: the front pair rubs together when it has landed */}
      {rubbing ? (
        frame ? (
          <path d="M10 7 L9 3.2 M14 7 L15 3.2 M9 3.2 L11.4 2.6 M15 3.2 L12.6 2.6" stroke="#111" strokeWidth=".7" fill="none" />
        ) : (
          <path d="M10 7 L10.2 3 M14 7 L13.8 3 M10.2 3 L12.6 3.4 M13.8 3 L11.4 3.4" stroke="#111" strokeWidth=".7" fill="none" />
        )
      ) : (
        <path d="M9 8 L5 6.5 M15 8 L19 6.5" stroke="#111" strokeWidth=".7" fill="none" />
      )}
      <path d="M8.5 11 L4.5 12 M15.5 11 L19.5 12 M9 14 L5.5 17 M15 14 L18.5 17" stroke="#111" strokeWidth=".7" fill="none" />
    </svg>
  )
}

export function Fly() {
  const on = useRogueToy('fly')
  const paused = useGameStore((s) => !!s.over || s.shooterOpen || !s.rogue?.seen)
  const fly = useRef(null)
  const [landed, setLanded] = useState(null) // { id, rect } of the window it's sitting on
  const [frame, setFrame] = useState(0)
  const phase = useRef({ until: 0, landed: null })

  // Leg rubbing: two frames.
  useEffect(() => {
    if (!landed) return
    const t = setInterval(() => setFrame((f) => 1 - f), 180)
    return () => clearInterval(t)
  }, [landed])

  useEffect(() => {
    if (!on || paused) return
    const p = phase.current
    if (!p.until) p.until = Date.now() + FLY_BUZZ_MS
    const pos = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.4, vx: 120, vy: -60 }
    let raf = 0
    let last = performance.now()
    const windows = () => [...document.querySelectorAll('.window-slot .aero-window')].filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 120 && r.height > 80 && r.bottom > 60 && r.top < window.innerHeight - TASKBAR_H - 40
    })
    const step = (t) => {
      raf = requestAnimationFrame(step)
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      const now = Date.now()
      if (p.landed) {
        // Sitting: follow the window if it moves; take off after 5 minutes.
        const el = document.getElementById(p.landed.id)
        const r = el?.getBoundingClientRect()
        if (r) {
          pos.x = r.left + r.width / 2
          pos.y = r.top + 18
          setLanded((cur) => (cur && cur.rect.left === r.left && cur.rect.top === r.top && cur.rect.width === r.width && cur.rect.height === r.height ? cur : { id: p.landed.id, rect: { left: r.left, top: r.top, width: r.width, height: r.height } }))
        }
        if (now >= p.until || !r) {
          p.landed = null
          p.until = now + FLY_BUZZ_MS
          setLanded(null)
          pos.vy = -200
        }
      } else {
        // Buzzing about: a jittery wander that keeps to the screen.
        const wander = reducedMotion() ? 0.3 : 1
        pos.vx += (Math.random() - 0.5) * 900 * dt * wander
        pos.vy += (Math.random() - 0.5) * 900 * dt * wander
        const speed = Math.hypot(pos.vx, pos.vy)
        const max = 260
        if (speed > max) {
          pos.vx *= max / speed
          pos.vy *= max / speed
        }
        pos.x += pos.vx * dt
        pos.y += pos.vy * dt
        if (pos.x < 20 || pos.x > window.innerWidth - 20) pos.vx *= -1
        if (pos.y < 20 || pos.y > window.innerHeight - TASKBAR_H - 20) pos.vy *= -1
        pos.x = Math.max(20, Math.min(window.innerWidth - 20, pos.x))
        pos.y = Math.max(20, Math.min(window.innerHeight - TASKBAR_H - 20, pos.y))
        if (now >= p.until) {
          const list = windows()
          const el = list[Math.floor(Math.random() * list.length)]
          if (el) {
            p.landed = { id: el.id }
            p.until = now + FLY_SIT_MS
            sfx('buzz')
            const name = el.querySelector('.aero-title')?.textContent ?? 'a window'
            useGameStore.getState().toast(`🪰 A fly landed on ${name}. You can’t use it until the fly leaves (5 minutes).`, 'bad')
          } else p.until = now + 10_000
        }
      }
      if (fly.current) fly.current.style.transform = `translate(${pos.x - 14}px, ${pos.y - 12}px) rotate(${p.landed ? 0 : Math.atan2(pos.vy, pos.vx) * (180 / Math.PI) + 90}deg)`
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [on, paused])

  if (!on) return null
  return (
    <>
      {landed && (
        <div
          className="fly-block"
          style={{ left: landed.rect.left, top: landed.rect.top, width: landed.rect.width, height: landed.rect.height }}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            sfx('buzz')
          }}
          onClick={(e) => e.stopPropagation()}
          title="A fly is sitting on this window. You can’t use it until it leaves."
        >
          <span className="fly-block-label">🪰 Occupied by a fly</span>
        </div>
      )}
      <div ref={fly} className={`fly ${landed ? 'is-landed' : ''}`} aria-hidden="true" style={{ display: paused ? 'none' : undefined }}>
        <FlySprite rubbing={!!landed} frame={frame} />
      </div>
    </>
  )
}
