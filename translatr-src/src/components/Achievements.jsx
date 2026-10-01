import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Modal from './Modal'
import { useGameStore } from '../store/useGameStore'
import { ACHIEVEMENTS, ACHIEVEMENT_POINTS } from '../data/achievements'
import { useLastDefined, usePresence } from '../lib/hooks'

/**
 * The Hall of Shame: hidden until the taskbar's trophy button (or the header's Shame counter)
 * opens it in the middle of the screen. Every achievement, locked ones hinted.
 */
export default function AchievementsModal() {
  const open = useGameStore((s) => s.trophiesOpen)
  const close = useGameStore((s) => s.closeTrophies)
  return (
    <Modal open={open} z={305} onBackdrop={close}>
      <HallOfShame onClose={close} />
    </Modal>
  )
}

function HallOfShame({ onClose }) {
  const unlocked = useGameStore((s) => s.achievements)
  const count = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shame-title"
      className="modal-card flex max-h-[86vh] w-[min(880px,94vw)] flex-col overflow-hidden"
      style={{ '--accent': '#e0a21a' }}
    >
      <div className="flex items-center gap-3 border-b border-ink/10 px-5 py-3">
        <span className="text-3xl">🏆</span>
        <div className="min-w-0 flex-1">
          <h2 id="shame-title" className="font-display text-xl font-semibold leading-tight">
            Hall of Shame
          </h2>
          <div className="text-xs text-ink/50">
            {count}/{ACHIEVEMENTS.length} unlocked · {count * ACHIEVEMENT_POINTS}G · worthless
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close Hall of Shame">
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="meter mb-4" style={{ '--bar': '#ffcf3f' }}>
        <span style={{ width: `${(count / ACHIEVEMENTS.length) * 100}%` }} />
      </div>
      <div className="@container">
      <div className="grid grid-cols-1 gap-2 @min-[420px]:grid-cols-2 @min-[640px]:grid-cols-3 @min-[820px]:grid-cols-4">
        {ACHIEVEMENTS.map((a) => {
          const got = !!unlocked[a.id]
          return (
            <div
              key={a.id}
              title={`${a.title} — ${a.desc}`}
              className={`flex items-center gap-2 rounded-xl border p-2 transition ${
                got ? 'border-gold/40 bg-gold/[0.06] shadow-[0_0_18px_-10px_#ffcf3f]' : 'border-ink/[0.05] bg-inset/30'
              }`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-base ${got ? 'bg-gold/15' : 'bg-ink/5 grayscale opacity-40'}`}>
                {got ? a.icon : '?'}
              </span>
              <div className="min-w-0">
                <div className={`truncate text-[0.75rem] font-semibold ${got ? 'text-ink' : 'text-ink/35'}`}>{got ? a.title : '???'}</div>
                <div className="truncate text-[0.625rem] text-ink/35">{a.desc}</div>
              </div>
            </div>
          )
        })}
      </div>
      </div>
      </div>
    </div>
  )
}

/** Console-style unlock toast, one at a time (queued by the game loop). */
export function AchievementPopup() {
  const popup = useGameStore((s) => s.achievementPopup)
  const shown = useLastDefined(popup)
  const { mounted, closing } = usePresence(!!popup, 300)
  if (!mounted || !shown) return null
  const a = ACHIEVEMENTS.find((x) => x.id === shown.achId)
  if (!a) return null

  return createPortal(
    <div className="pointer-events-none fixed bottom-16 left-[calc((100%_-_var(--arcade-room,0px))_/_2)] z-[390] -translate-x-1/2">
      <div
        key={shown.id}
        className={`gadget flex items-center gap-3 rounded-full py-2 pl-2 pr-6 ${closing ? 'anim-modal-out' : 'anim-modal-in'}`}
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.8), 0 14px 34px -8px rgba(0,25,70,.6), 0 0 26px -2px #f0b400' }}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full border border-[#a86f00] bg-[radial-gradient(circle_at_50%_30%,#fff6cc,#ffd35c_45%,#e59c00)] text-xl shadow-[inset_0_1px_0_#fff,0_0_12px_#ffcf3f]">{a.icon}</span>
        <div>
          <div className="text-[0.6875rem] font-bold text-gold">
            🏆 Achievement unlocked · {ACHIEVEMENT_POINTS}G
          </div>
          <div className="text-sm font-semibold text-ink">{a.title}</div>
          <div className="text-[0.6875rem] text-ink/60">{a.desc}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
