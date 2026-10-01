import { useLayoutEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { TRACKERS, TRACKER_PARTNERS } from '../data/trackers'
import { sfx } from '../lib/audio/engine'
import Modal from './Modal'

// Class names avoid "cookie"/"consent"/"banner": cookie-notice filter lists would hide it.

const RESPAWN_CHANCE = 0.15 // switching one off may quietly switch another back on…
const MAX_RESPAWNS = 3 // …but only a few times, so it stays beatable
const SHUFFLE_MS = 520
const FLASH_MS = 1600

function shuffled(list) {
  let next
  do {
    next = [...list]
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[next[i], next[j]] = [next[j], next[i]]
    }
  } while (next.every((id, i) => id === list[i]))
  return next
}

/**
 * The GDPR banner from hell. Shown on first load (until `consent` is saved) and whenever it's
 * reopened from the Start menu. 20 trackers, all on; touching any toggle reshuffles the whole
 * list. "Reject All" needs a Privacy Pass from the store, so it's Accept All or 20 manual
 * switch-offs while the list keeps moving.
 */
export default function PrivacyWall() {
  const open = useGameStore((s) => (!!s.mode && !s.consent) || s.privacyOpen)
  return (
    <Modal open={open} z={480} backdrop="bg-[#000]/55">
      <WallBody />
    </Modal>
  )
}

function WallBody() {
  const hasPass = useGameStore((s) => !!s.premium.privacy_pass)
  const reopened = useGameStore((s) => !!s.consent)
  const [order, setOrder] = useState(() => shuffled(TRACKERS.map((t) => t.id)))
  const [on, setOn] = useState(() => new Set(TRACKERS.map((t) => t.id)))
  const [flash, setFlash] = useState(null) // { id, n } — a tracker that "legitimately" came back
  const respawns = useRef(0)
  const rows = useRef(new Map())
  const before = useRef(null)
  const flashTimer = useRef(null)
  const byId = Object.fromEntries(TRACKERS.map((t) => [t.id, t]))
  const remaining = on.size

  const rowRef = (id) => (el) => (el ? rows.current.set(id, el) : rows.current.delete(id))

  const toggle = (id) => {
    // Remember where every row was, then flip + reshuffle; the layout effect animates the jump.
    before.current = new Map([...rows.current].map(([k, el]) => [k, el.getBoundingClientRect().top]))
    const next = new Set(on)
    if (next.has(id)) next.delete(id)
    else next.add(id)

    const wasTurnedOff = on.has(id)
    const offOthers = TRACKERS.map((t) => t.id).filter((t) => t !== id && !next.has(t))
    if (wasTurnedOff && offOthers.length && respawns.current < MAX_RESPAWNS && Math.random() < RESPAWN_CHANCE) {
      const back = offOthers[Math.floor(Math.random() * offOthers.length)]
      next.add(back)
      respawns.current += 1
      setFlash({ id: back, n: respawns.current })
      clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS)
      sfx('error', { low: true })
    }
    setOn(next)
    setOrder((o) => shuffled(o))
  }

  // FLIP: slide every row from its old spot to its new one.
  useLayoutEffect(() => {
    const first = before.current
    before.current = null
    if (!first) return
    for (const [id, el] of rows.current) {
      const top = first.get(id)
      if (top == null) continue
      const dy = top - el.getBoundingClientRect().top
      if (Math.abs(dy) > 1) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: SHUFFLE_MS, easing: 'cubic-bezier(.2,.9,.25,1.15)' })
    }
  }, [order])

  useLayoutEffect(() => () => clearTimeout(flashTimer.current), [])

  const finish = (choice) => {
    const { setConsent, toast } = useGameStore.getState()
    setConsent(choice)
    if (choice === 'all') toast(`✅ Thank you! Your data is now shared with ${TRACKER_PARTNERS.toLocaleString()} trusted partners (and Kevin).`, 'good')
    else if (choice === 'custom') toast('🍪 Preferences saved. They will be reviewed within 7–10 business decades.', 'info')
    else toast(`🛂 Everything rejected. Your rejection has been shared with ${TRACKER_PARTNERS.toLocaleString()} partners.`, 'info')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pw-title"
      className="modal-card flex max-h-[92vh] w-[min(760px,96vw)] flex-col overflow-hidden"
      style={{ '--accent': '#e0a21a' }}
    >
      <div className="border-b border-ink/10 p-5 pb-4">
        <div className="flex items-start gap-3">
          <span className="text-4xl leading-none" aria-hidden="true">
            🍪
          </span>
          <div className="min-w-0">
            <h2 id="pw-title" className="font-display text-2xl font-semibold leading-tight">
              We value your privacy™
            </h2>
            <div className="text-xs text-ink/50">(at approximately $0.0004 per visitor)</div>
          </div>
        </div>
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink/70">
          {reopened && <b>We reset your choices for your convenience. </b>}
          We and our <b>{TRACKER_PARTNERS.toLocaleString()} partners</b> use cookies, pixels, beacons, fingerprints, telepathy and Kevin to personalise your
          experience, measure your loneliness and sell both. Manage your choices below. Every time you touch a toggle we <b>re-sort the list</b>, to keep
          things fresh.
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs">
          <div className="meter h-2 flex-1" style={{ '--bar': remaining ? '#d32f2f' : '#3cb521' }}>
            <span style={{ width: `${((TRACKERS.length - remaining) / TRACKERS.length) * 100}%` }} />
          </div>
          <span className="shrink-0 font-mono tabular-nums text-ink/70">
            {TRACKERS.length - remaining}/{TRACKERS.length} disabled
          </span>
        </div>
      </div>

      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-3" aria-label="Trackers">
        {order.map((id) => {
          const t = byId[id]
          const isOn = on.has(id)
          const flashing = flash?.id === id
          return (
            <li key={id} ref={rowRef(id)} className={`hell-row ${flashing ? 'is-flash' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 text-[0.8125rem] font-semibold">
                  {t.name}
                  <span className="text-[0.625rem] font-normal text-ink/45">{t.partners.toLocaleString()} partners</span>
                  {flashing && <span className="text-[0.6875rem] font-bold text-blood">↺ re-enabled for legitimate interest</span>}
                </div>
                <div className="text-[0.6875rem] text-ink/55">{t.purpose}</div>
              </div>
              <button
                role="switch"
                aria-checked={isOn}
                aria-label={`${t.name}: ${isOn ? 'on' : 'off'}`}
                className="hell-switch"
                onClick={() => toggle(id)}
              />
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col-reverse gap-2 border-t border-ink/10 p-4 sm:flex-row sm:items-center">
        <span className="hell-tip-host relative inline-flex" style={{ cursor: hasPass ? undefined : 'var(--cur-lock, not-allowed)' }}>
          <button className="btn btn-ghost w-full disabled:pointer-events-none sm:w-auto" disabled={!hasPass} onClick={() => finish('rejected')} aria-describedby="pw-reject-tip">
            Reject All
          </button>
          {!hasPass && (
            <span id="pw-reject-tip" role="tooltip" className="hell-tip">
              Requires Privacy Pass ($4.99 in Store)
            </span>
          )}
        </span>
        <button className="btn btn-ghost" disabled={remaining > 0} onClick={() => finish('custom')}>
          {remaining > 0 ? `Confirm choices (${remaining} still on)` : 'Confirm my choices'}
        </button>
        <button className="btn btn-gold px-8 py-3 text-base sm:ml-auto" onClick={() => finish('all')}>
          Accept All ✨
        </button>
      </div>
    </div>
  )
}
