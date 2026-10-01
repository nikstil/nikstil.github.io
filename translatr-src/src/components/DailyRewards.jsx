import { useEffect, useRef, useState } from 'react'
import { useGameStore, localDay, streakStatus } from '../store/useGameStore'
import { DAILY_REWARDS } from '../data/gameData'
import { sfx } from '../lib/audio/engine'
import Modal from './Modal'

const pad = (n) => String(n).padStart(2, '0')

/** Time left until local midnight, HH:MM:SS. */
function untilMidnight(now) {
  const d = new Date(now)
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
  const s = Math.max(0, Math.floor((next - now) / 1000))
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/**
 * Daily login streak: a 7-day cycle of rewards worth almost nothing, opened automatically once
 * a day (after the first-run cookie banner and tutorial). Miss a day and it breaks — unless you
 * buy Streak Insurance™ right then, at the exact moment you are most upset.
 */
export default function DailyRewards() {
  const open = useGameStore((s) => s.dailyOpen)
  const ready = useGameStore((s) => s.mode === 'normal' && !s.over && !!s.consent && s.tutorialSeen && !s.privacyOpen && !s.tutorialOpen)
  const pending = useGameStore((s) => streakStatus(s, localDay(s.clock)) !== 'claimed')
  const close = useGameStore((s) => s.closeDaily)
  const shownFor = useRef(null) // auto-open at most once per day per session

  useEffect(() => {
    const day = localDay()
    if (!ready || !pending || shownFor.current === day) return
    shownFor.current = day
    useGameStore.getState().openDaily()
  }, [ready, pending])

  // Below the checkout modal (270), so buying insurance shows its payment flow on top.
  return (
    <Modal open={open} z={265} onBackdrop={close}>
      <DailyBody onClose={close} />
    </Modal>
  )
}

function DailyBody({ onClose }) {
  const clock = useGameStore((s) => s.clock)
  const streak = useGameStore((s) => s.streak)
  const status = useGameStore((s) => streakStatus(s, localDay(s.clock)))
  const checkout = useGameStore((s) => s.checkout)
  const [claimed, setClaimed] = useState(null)

  // Which day of the 7-day cycle is today's (claimable or claimed) reward?
  const todayIndex = status === 'claimed' ? (streak.count - 1) % 7 : status === 'continue' ? streak.count % 7 : 0

  const claim = () => {
    const reward = useGameStore.getState().claimDaily()
    if (!reward) return
    setClaimed(reward)
    sfx('coin')
  }

  if (status === 'broken') {
    return (
      <div className="modal-card w-[min(440px,94vw)] p-6 text-center" style={{ '--accent': '#d32f2f' }}>
        <div className="text-5xl">💔</div>
        <h2 className="mt-2 font-display text-xl font-semibold">Your {streak.count}-day streak has ended.</h2>
        <p className="mt-2 text-sm text-ink/60">You missed a day. We noticed. We always notice.</p>
        <button disabled={!!checkout} onClick={() => useGameStore.getState().startCheckout('streak_insurance')} className="btn btn-gold mt-5 w-full py-3 text-base">
          🛟 Repair it · Streak Insurance™ $2.99
        </button>
        <button onClick={() => useGameStore.getState().acceptStreakLoss()} className="btn btn-ghost btn-sm mt-3">
          Let it die (I am a monster)
        </button>
      </div>
    )
  }

  const nextCount = status === 'continue' ? streak.count + 1 : 1
  return (
    <div className="modal-card w-[min(520px,94vw)] p-6" style={{ '--accent': '#e0663a' }}>
      <div className="flex items-center gap-3">
        <span className="text-5xl">🔥</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold leading-tight">Daily Streak: {status === 'claimed' ? streak.count : nextCount} day{(status === 'claimed' ? streak.count : nextCount) === 1 ? '' : 's'}</h2>
          <div className="text-xs text-ink/50">Best: {Math.max(streak.best ?? 0, status === 'claimed' ? streak.count : 0)} · rewards reset every 7 days · missing a day breaks it</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close daily rewards">
          ✕
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {DAILY_REWARDS.map((r, i) => {
          const done = i < todayIndex || (status === 'claimed' && i === todayIndex)
          const today = i === todayIndex
          return (
            <div
              key={i}
              title={r.note ?? r.label}
              className={`inset-card flex flex-col items-center gap-0.5 px-0.5 py-2 text-center ${today ? 'ring-2 ring-[#e0663a]' : ''} ${done ? 'opacity-60' : ''}`}
            >
              <span className="text-[0.625rem] font-semibold text-ink/50">Day {i + 1}</span>
              <span className="text-2xl">{done ? '✅' : r.emoji}</span>
              <span className="text-[0.625rem] leading-tight">{r.label}</span>
            </div>
          )
        })}
      </div>

      {claimed ? (
        <p className="mt-4 animate-fade-up text-center text-sm">
          You got <b>{claimed.label}</b>. {claimed.note ?? 'Try not to spend it all at once.'}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink/50">
          Next reward in <b className="font-mono tabular-nums text-ink/70">{untilMidnight(clock)}</b>
        </span>
        {status === 'claimed' ? (
          <button className="btn btn-ghost ml-auto" onClick={onClose}>
            {claimed ? 'Wow. Thanks.' : 'Come back tomorrow (or else)'}
          </button>
        ) : (
          <>
            <button className="btn btn-ghost btn-sm ml-auto" onClick={onClose}>
              Later
            </button>
            <button className="btn btn-gold px-6" onClick={claim}>
              Claim Day {todayIndex + 1}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
