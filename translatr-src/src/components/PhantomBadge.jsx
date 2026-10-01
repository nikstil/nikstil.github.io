import { useGameStore } from '../store/useGameStore'

/**
 * A red notification badge that never clears: clicking whatever it sits on only adds more
 * (store.bumpPhantom). Keyed by the count so every increase replays the bump animation.
 */
export default function PhantomBadge({ id }) {
  const n = useGameStore((s) => s.phantom[id] ?? 0)
  return (
    <span key={n} className="phantom-badge" aria-label={`${n} unread notifications`}>
      {n > 99 ? '99+' : n}
    </span>
  )
}
