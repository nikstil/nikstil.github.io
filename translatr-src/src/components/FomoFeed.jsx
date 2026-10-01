import { createPortal } from 'react-dom'
import { useGameStore } from '../store/useGameStore'
import { useLastDefined, usePresence } from '../lib/hooks'
import { FOMO, PREMIUM_ITEMS } from '../data/gameData'

/** "Someone in Ohio just bought…" social-pressure notifications. Scheduled and expired by the game loop. */
export default function FomoFeed() {
  const fomo = useGameStore((s) => s.fomo)
  const dismissFomo = useGameStore((s) => s.dismissFomo)
  const startCheckout = useGameStore((s) => s.startCheckout)
  const premium = useGameStore((s) => s.premium)
  const shown = useLastDefined(fomo)
  const { mounted, closing } = usePresence(!!fomo, 260)
  if (!mounted || !shown) return null

  const item = shown.itemId && PREMIUM_ITEMS.find((p) => p.id === shown.itemId)
  const buyable = item && !(item.oneTime && premium[item.id])

  return createPortal(
    <div className="fixed bottom-14 left-4 z-[380] w-[min(340px,calc(100vw-2rem))]">
      <div
        key={shown.id}
        className={`relative flex items-start gap-3 overflow-hidden balloon p-3 pr-8 ${
          closing ? 'anim-modal-out' : 'anim-modal-in'
        }`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-linear-to-b from-white to-[#dcebf8] text-xl ring-1 ring-[#7a8fa6]">{shown.icon}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[0.6875rem] font-bold text-ice">
            <span className="h-1.5 w-1.5 animate-live rounded-full bg-blood" /> TRANSLATR™ Social · just now
          </div>
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink">{shown.text}</p>
          {buyable && (
            <button
              onClick={() => {
                dismissFomo(shown.id)
                startCheckout(item.id)
              }}
              className="btn btn-magenta btn-sm mt-2"
            >
              Get {item.name} · {item.price}
            </button>
          )}
        </div>
        <button onClick={() => dismissFomo(shown.id)} className="absolute right-2.5 top-2 text-ink/40 hover:text-ink" aria-label="Dismiss">
          ✕
        </button>
        {/* Time-remaining hairline */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ice/60" style={{ animation: `fomo-timer ${FOMO.showMs}ms linear forwards` }} />
      </div>
    </div>,
    document.body,
  )
}
