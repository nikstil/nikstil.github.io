import { useMemo, useRef } from 'react'
import { useGameStore, getMiningRate } from '../store/useGameStore'
import { NAS, NAS_TIERS, ownsExpansion } from '../data/expansions'
import { TASKBAR_H } from '../lib/dock'
import { money } from '../lib/format'
import { sfx } from '../lib/audio/engine'

const perSecond = (n) => (n < 10 ? `$${n.toFixed(2)}` : money(n))

/** Blinking lights: each one on its own rhythm (fixed per light, so they don't reshuffle). */
function Leds({ count, seed = 0, className = '' }) {
  const leds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = Math.abs(Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453) % 1
        return { dur: 0.25 + r * 1.6, delay: -r * 2, color: r < 0.12 ? 'amber' : r < 0.2 ? 'blue' : 'green' }
      }),
    [count, seed],
  )
  return (
    <span className={`nas-leds ${className}`}>
      {leds.map((l, i) => (
        <i key={i} className={`nas-led nas-led-${l.color}`} style={{ animationDuration: `${l.dur}s`, animationDelay: `${l.delay}s` }} />
      ))}
    </span>
  )
}

/** The hardware itself: a NAS box with drive bays, or rack units full of them. */
function Hardware({ tier }) {
  const t = NAS_TIERS[tier]
  if (t.look === 'box') {
    return (
      <div className="nas-box">
        <div className="nas-box-top">
          <span className="nas-brand">HomeLab</span>
          <Leds count={3} seed={tier} />
        </div>
        <div className="nas-bays" style={{ gridTemplateColumns: `repeat(${Math.min(4, t.bays)}, 1fr)` }}>
          {Array.from({ length: t.bays }, (_, i) => (
            <div key={i} className="nas-bay">
              <Leds count={2} seed={i + tier * 10} />
            </div>
          ))}
        </div>
      </div>
    )
  }
  const perUnit = Math.ceil(t.bays / t.units)
  return (
    <div className="nas-rack">
      {Array.from({ length: t.units }, (_, u) => (
        <div key={u} className="nas-unit">
          <span className="nas-unit-ear" />
          <span className="nas-unit-drives">
            {Array.from({ length: perUnit }, (_, i) => (
              <span key={i} className="nas-drive">
                <Leds count={2} seed={u * 31 + i} />
              </span>
            ))}
          </span>
          <Leds count={4} seed={u + 99} className="nas-unit-status" />
          <span className="nas-unit-ear" />
        </div>
      ))}
    </div>
  )
}

/**
 * The HomeLab NAS (expansion). It hides on the right edge of the screen with just its side peeking
 * out (lights blinking); click it and it opens into a little window you can drag anywhere. It pays
 * straight into your wallet, open or not.
 */
export default function Nas() {
  const owned = useGameStore((s) => ownsExpansion(s, 'nas'))
  const tier = useGameStore((s) => s.nas?.tier ?? 0)
  const ui = useGameStore((s) => s.nasUi ?? { open: false })
  const swing = useGameStore((s) => Math.max(1, getMiningRate(s)))
  const earned = useGameStore((s) => s.stats.nasEarned ?? 0)
  const wallet = useGameStore((s) => s.money)
  const box = useRef(null)
  if (!owned) return null
  const t = NAS_TIERS[tier]
  const rate = t.bays * NAS.swingsPerSecondPerBay * swing
  const maxed = tier >= NAS_TIERS.length - 1
  const cost = NAS.upgradeSwings(tier) * swing
  const { setNasUi } = useGameStore.getState()

  if (!ui.open) {
    return (
      <button className="nas-peek" style={{ top: '38%' }} onClick={() => setNasUi({ open: true })} aria-label={`${t.name}: open`} title={`${t.name} · +${perSecond(rate)}/s · click to open`}>
        <span className="nas-peek-vents" />
        <Leds count={Math.min(14, 3 + tier * 2)} seed={tier + 7} className="nas-peek-leds" />
      </button>
    )
  }

  // Drag by the title bar; stays fully on screen.
  const startDrag = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return
    const el = box.current
    const r = el.getBoundingClientRect()
    const dx = e.clientX - r.left
    const dy = e.clientY - r.top
    e.currentTarget.setPointerCapture(e.pointerId)
    const move = (ev) => {
      const x = Math.max(0, Math.min(window.innerWidth - r.width, ev.clientX - dx))
      const y = Math.max(0, Math.min(window.innerHeight - TASKBAR_H - r.height, ev.clientY - dy))
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      el.style.right = 'auto'
    }
    const up = (ev) => {
      ev.currentTarget.removeEventListener('pointermove', move)
      ev.currentTarget.removeEventListener('pointerup', up)
      const now = el.getBoundingClientRect()
      setNasUi({ x: Math.round(now.left), y: Math.round(now.top) })
    }
    e.currentTarget.addEventListener('pointermove', move)
    e.currentTarget.addEventListener('pointerup', up)
  }
  const pos = ui.x != null ? { left: Math.min(ui.x, window.innerWidth - 300), top: Math.min(ui.y, window.innerHeight - TASKBAR_H - 120) } : { right: 16, top: 90 }

  return (
    <section ref={box} className="nas-window" style={pos} aria-label="HomeLab NAS">
      <header className="nas-titlebar" onPointerDown={startDrag}>
        <span>🗄️ {t.name}</span>
        <button className="nas-hide" onClick={() => setNasUi({ open: false })} title="Tuck it back into the edge of the screen" aria-label="Hide">
          ⇥
        </button>
      </header>
      <div className="nas-body">
        <Hardware tier={tier} />
        <div className="nas-stats">
          <span>
            <b>{t.bays}</b> drives
          </span>
          <span>
            <b>+{perSecond(rate)}</b>/s, into your wallet
          </span>
          <span className="text-ink/50">Earned so far: {money(earned)}</span>
        </div>
        <button
          className="btn btn-toxic w-full"
          disabled={maxed || wallet < cost}
          onClick={() => useGameStore.getState().upgradeNas() && sfx('levelup')}
          title={maxed ? 'There is no bigger rack. We checked the warehouse.' : `Next: ${NAS_TIERS[tier + 1].name}`}
        >
          {maxed ? 'Maximum rack achieved' : `Upgrade to ${NAS_TIERS[tier + 1].name} · ${money(cost)}`}
        </button>
      </div>
    </section>
  )
}
