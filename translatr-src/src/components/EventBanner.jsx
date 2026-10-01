import { useGameStore } from '../store/useGameStore'
import { EVENT_BY_ID, EVENT_MS } from '../data/events'

/** The running limited-time event: what it does and how long it has left. */
export default function EventBanner() {
  const event = useGameStore((s) => s.event)
  const clock = useGameStore((s) => s.clock)
  const def = event && EVENT_BY_ID[event.id]
  if (!def) return null
  const left = Math.max(0, event.endsAt - clock)
  const secs = Math.ceil(left / 1000)
  return (
    <div role="status" className="event-banner anim-modal-in relative mb-4 flex items-center gap-3 overflow-hidden px-4 py-2.5" style={{ '--event': def.color }}>
      <span className="text-3xl drop-shadow-[0_2px_3px_rgba(0,0,0,.25)]">{def.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <b className="text-[0.9375rem]">{def.name}</b>
          <span className="event-tag">Limited time</span>
        </div>
        <div className="text-[0.75rem] leading-snug opacity-80">{def.blurb}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-lg font-bold tabular-nums">
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
        </div>
        <div className="text-[0.625rem] opacity-60">left</div>
      </div>
      <div className="event-progress" style={{ width: `${(left / EVENT_MS) * 100}%` }} />
    </div>
  )
}
