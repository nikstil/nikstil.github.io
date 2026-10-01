import { useEffect, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { SPLITS, fmtRunTime } from '../data/endings'
import { dailyLabels } from './Daily'

/** LiveSplit-style timer for speedrun mode: splits, and the difference from your PB's splits. */
export default function SpeedrunHud() {
  const mode = useGameStore((s) => s.mode)
  const run = useGameStore((s) => s.run)
  const pbSplits = useGameStore((s) => s.records.pbSplits)
  const pb = useGameStore((s) => s.records.best?.any)
  const [collapsed, setCollapsed] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const daily = useGameStore((s) => s.daily)
  const cheated = useGameStore((s) => !!s.cheats)
  const timed = mode === 'speedrun' || (mode === 'daily' && !!daily)
  const running = timed && !!run?.startedAt && !run.endedAt

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [running])

  if (!timed || !run?.startedAt) return null
  const elapsed = (run.endedAt ?? now) - run.startedAt
  // Ahead of or behind the PB at the last split you both reached.
  const lastShared = [...SPLITS].reverse().find((sp) => run.splits[sp.id] != null && pbSplits?.[sp.id] != null)
  const ahead = lastShared ? run.splits[lastShared.id] - pbSplits[lastShared.id] < 0 : null

  return (
    // In the header, with the other tiles (so it never covers anything); the splits drop down from it.
    <aside className={`speedrun-hud relative z-[60] w-56 select-none ${collapsed ? '' : 'is-open'}`} aria-label="Speedrun timer">
      <button className="flex w-full items-baseline justify-between gap-2 px-3 py-2" onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Show splits' : 'Hide splits'} aria-expanded={!collapsed}>
        <span className="text-[0.625rem] font-bold uppercase tracking-widest opacity-60">
          {mode === 'daily' ? `Daily #${daily.number}${run.endedAt ? ' ✓' : ''}` : run.endedAt ? 'Final' : 'Speedrun'}
          {cheated && <span title="Cheats are on: this time won’t be recorded"> · 🏴</span>}
        </span>
        <span className={`font-mono text-xl font-bold tabular-nums ${run.endedAt ? 'text-[#ffd84a]' : ahead === false ? 'text-[#ff6b6b]' : 'text-[#5dff8f]'}`}>{fmtRunTime(elapsed)}</span>
      </button>
      {!collapsed && mode === 'daily' && <DailyBody daily={daily} done={!!run.endedAt} />}
      {!collapsed && mode === 'speedrun' && (
        <ol className="speedrun-splits border-t border-white/10 px-3 py-1.5 font-mono text-[0.6875rem]">
          {SPLITS.map((sp) => {
            const t = run.splits[sp.id]
            const ref = pbSplits?.[sp.id]
            const delta = t != null && ref != null ? t - ref : null
            return (
              <li key={sp.id} className={`flex items-center justify-between gap-2 py-0.5 ${t == null ? 'opacity-45' : ''}`}>
                <span className="truncate font-sans">{sp.label}</span>
                <span className="flex items-center gap-1.5 tabular-nums">
                  {delta != null && <span className={delta < 0 ? 'text-[#5dff8f]' : 'text-[#ff6b6b]'}>{`${delta < 0 ? '−' : '+'}${fmtRunTime(Math.abs(delta), false)}`}</span>}
                  <span>{t != null ? fmtRunTime(t, false) : ref != null ? fmtRunTime(ref, false) : '—'}</span>
                </span>
              </li>
            )
          })}
          <li className="mt-1 flex justify-between border-t border-white/10 pt-1 opacity-70">
            <span className="font-sans">Personal best</span>
            <span className="tabular-nums">{pb != null ? fmtRunTime(pb) : '—'}</span>
          </li>
        </ol>
      )}
    </aside>
  )
}

function DailyBody({ daily, done }) {
  const { goal, mods } = dailyLabels(daily)
  return (
    <div className="speedrun-splits border-t border-white/10 px-3 py-2 text-[0.6875rem]">
      <div className={`font-semibold ${done ? 'text-[#5dff8f]' : ''}`}>
        {done ? '✓ ' : '🎯 '}
        {goal.label}
      </div>
      {mods.map((m) => (
        <div key={m.id} className="opacity-70">
          {m.icon} {m.label}
        </div>
      ))}
      <button className="mt-2 w-full rounded bg-white/10 py-1 text-[0.6875rem] hover:bg-white/20" onClick={() => useGameStore.getState().leaveDaily()}>
        ↩ Back to my game
      </button>
    </div>
  )
}
