import { useState } from 'react'
import Modal from './Modal'
import { useGameStore } from '../store/useGameStore'
import { DAILY_GOAL_BY_ID, DAILY_MOD_BY_ID, dailyFor } from '../data/daily'
import { fmtRunTime } from '../data/endings'

/** "Reach $10M" + its two modifiers, for any day's challenge. */
export function dailyLabels(cfg) {
  const goal = DAILY_GOAL_BY_ID[cfg.goal]
  return { goal, mods: cfg.mods.map((id) => DAILY_MOD_BY_ID[id]).filter(Boolean) }
}

export function shareText(cfg, time) {
  const { goal, mods } = dailyLabels(cfg)
  return [
    `TRANSLATR™ Daily #${cfg.number} · ${goal.icon} ${goal.label}`,
    mods.map((m) => `${m.icon} ${m.label}`).join(' · '),
    `⏱️ ${fmtRunTime(time)}`,
    'nikstil.com/translatr',
  ].join('\n')
}

/** Today's challenge, as a card (the title screen and the Start menu's confirmation use it). */
export function DailyCard({ onStart, cta = 'Play today’s challenge' }) {
  const cfg = dailyFor()
  const best = useGameStore((s) => s.records.daily?.[cfg.day])
  const { goal, mods } = dailyLabels(cfg)
  return (
    <div className="inset-card flex flex-col p-4 text-left" style={{ '--accent': '#e0a21a' }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-3xl">📅</span>
        <div className="min-w-0">
          <div className="text-lg font-semibold">Daily #{cfg.number}</div>
          <div className="text-[0.6875rem] text-ink/50">Same goal, same luck, for everyone today</div>
        </div>
      </div>
      <div className="mb-1 text-[0.8125rem] font-semibold">
        {goal.icon} {goal.label}
      </div>
      <ul className="mb-3 flex-1 space-y-0.5 text-[0.75rem] text-ink/65">
        {mods.map((m) => (
          <li key={m.id}>
            {m.icon} {m.label}
          </li>
        ))}
        <li className="text-ink/45">Your best today: {best != null ? fmtRunTime(best) : 'not played yet'}</li>
      </ul>
      <button className="btn btn-gold w-full py-2.5" onClick={onStart}>
        {cta}
      </button>
    </div>
  )
}

/** When today's goal is reached: the time, today's best, and a result to paste into the group chat. */
export function DailyResult() {
  const done = useGameStore((s) => s.dailyDone)
  const open = useGameStore((s) => s.mode === 'daily' && !!s.dailyDone && !s.dailyDone.seen && !s.over)
  return (
    <Modal open={open} z={320}>
      {done && <ResultBody done={done} />}
    </Modal>
  )
}

function ResultBody({ done }) {
  const daily = useGameStore((s) => s.daily)
  const best = useGameStore((s) => s.records.daily?.[done.day])
  const { seeDailyResult, leaveDaily } = useGameStore.getState()
  const [copied, setCopied] = useState(false)
  if (!daily) return null
  const { goal } = dailyLabels(daily)
  const text = shareText(daily, done.time) + (done.modified ? '\n🏴 (with cheats)' : '')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="daily-title" className="modal-card w-[min(420px,92vw)] p-6 text-center" style={{ '--accent': '#e0a21a' }}>
      <div className="text-5xl">📅</div>
      <h2 id="daily-title" className="mt-2 text-2xl font-semibold">
        Daily #{daily.number} complete
      </h2>
      <p className="mt-1 text-sm text-ink/60">
        {goal.icon} {goal.label}
      </p>
      <div className="mt-3 font-mono text-3xl font-bold">{fmtRunTime(done.time)}</div>
      <div className={`mt-1 text-sm font-semibold ${done.pb ? 'text-toxic' : 'text-ink/55'}`}>
        {done.modified ? '🏴 Modified game (cheats): not recorded' : done.pb ? 'Your best today!' : `Your best today: ${fmtRunTime(best)}`}
      </div>
      <pre className="inset-card mt-4 whitespace-pre-wrap p-3 text-left font-mono text-[0.75rem]">{text}</pre>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button className="btn btn-magenta" onClick={copy}>
          {copied ? '✓ Copied' : '📋 Copy result'}
        </button>
        <button className="btn btn-gold" onClick={leaveDaily}>
          ↩ Back to my game
        </button>
        <button className="btn btn-ghost" onClick={seeDailyResult}>
          Keep playing
        </button>
      </div>
    </div>
  )
}
