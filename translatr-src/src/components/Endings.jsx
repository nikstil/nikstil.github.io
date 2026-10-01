import { useEffect } from 'react'
import Modal from './Modal'
import { useGameStore } from '../store/useGameStore'
import { ENDINGS, fmtRunTime } from '../data/endings'
import { ACHIEVEMENTS } from '../data/achievements'
import { money } from '../lib/format'

const NO_BESTS = {} // shared: a fresh {} per read would count as a change every time

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
}

/** The endings you've found (and hints for the rest). Above everything, so endings can open it. */
export function EndingsModal() {
  const open = useGameStore((s) => s.endingsOpen)
  const close = useGameStore((s) => s.closeEndings)
  return (
    <Modal open={open} z={950} onBackdrop={close}>
      <EndingsBody onClose={close} />
    </Modal>
  )
}

function EndingsBody({ onClose }) {
  const endings = useGameStore((s) => s.endings)
  const best = useGameStore((s) => s.records.best ?? NO_BESTS)
  useEscape(onClose)
  const found = ENDINGS.filter((e) => endings[e.id]).length
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="endings-title" className="modal-card flex max-h-[86vh] w-[min(760px,94vw)] flex-col overflow-hidden" style={{ '--accent': '#d4a017' }}>
      <div className="flex items-center gap-3 border-b border-ink/10 px-5 py-3">
        <span className="text-3xl">🏁</span>
        <div className="min-w-0 flex-1">
          <h2 id="endings-title" className="font-display text-xl font-semibold leading-tight">
            Endings
          </h2>
          <div className="text-xs text-ink/50">
            {found}/{ENDINGS.length} found · each one ends the run · fastest speedrun times included
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close endings">
          ✕
        </button>
      </div>
      <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2">
        {ENDINGS.map((e, i) => {
          const seen = endings[e.id]
          return (
            <div
              key={e.id}
              className={`ending-tile flex gap-3 rounded-xl border p-3 ${seen ? '' : 'is-locked'}`}
              style={{ '--ending': e.color, borderColor: seen ? `${e.color}88` : undefined }}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl" style={{ background: seen ? `${e.color}22` : undefined }}>
                {seen ? e.icon : '?'}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[0.6875rem] font-mono text-ink/40">#{i + 1}</span>
                  <b className={seen ? '' : 'text-ink/45'}>{seen || !e.secret ? e.title : '???'}</b>
                  {e.tag && (seen || !e.secret) && <span className="badge" style={{ '--accent': e.color }}>{e.tag}</span>}
                </div>
                <div className="mt-0.5 text-[0.75rem] leading-snug text-ink/60">{seen ? e.how : e.hideHint ? '???' : `Hint: ${e.hint}`}</div>
                {seen && (
                  <div className="mt-1 text-[0.6875rem] text-ink/40">
                    First seen {new Date(seen).toLocaleDateString()}
                    {best[e.id] != null && ` · speedrun best ${fmtRunTime(best[e.id])}`}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** The power button's prompt. Keeping your account is the big friendly button, obviously. */
export function ShutdownDialog() {
  const open = useGameStore((s) => s.shutdownOpen)
  const close = useGameStore((s) => s.closeShutdown)
  return (
    <Modal open={open} z={320} backdrop="bg-[#000]/60">
      <ShutdownBody onClose={close} />
    </Modal>
  )
}

function ShutdownBody({ onClose }) {
  const achievements = useGameStore((s) => Object.keys(s.achievements).length)
  const cash = useGameStore((s) => s.money)
  const ads = useGameStore((s) => s.adsSeen)
  useEscape(onClose)
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="shutdown-title" className="modal-card w-[min(440px,92vw)] p-6" style={{ '--accent': '#4a5a6e' }}>
      <div className="mb-2 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#4a5a6e] text-2xl text-[#fff] shadow-inner">⏻</span>
        <h2 id="shutdown-title" className="text-xl font-semibold">
          Shut down TRANSLATR™?
        </h2>
      </div>
      <p className="text-sm leading-relaxed text-ink/70">
        Shutting down <b>permanently deletes your account</b>. You will lose {money(cash)}, {achievements} of {ACHIEVEMENTS.length} achievements, and the memories of {ads.toLocaleString()} ads.
      </p>
      <p className="mt-2 text-sm text-ink/70">Sir Scratchington will be rehomed. He has already packed.</p>
      <button className="btn btn-gold mt-5 w-full py-3 text-base" onClick={onClose}>
        Keep my account (recommended)
      </button>
      <button className="mx-auto mt-3 block text-[0.75rem] text-ink/45 underline decoration-dotted hover:text-blood" onClick={() => useGameStore.getState().deleteAccount()}>
        Delete my account and shut down
      </button>
    </div>
  )
}
