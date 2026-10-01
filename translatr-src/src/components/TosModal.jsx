import { useState } from 'react'
import Modal from './Modal'
import { useGameStore } from '../store/useGameStore'
import { useLastDefined } from '../lib/hooks'
import { TOS_CLAUSES } from '../data/gameData'

/** A blocking "We've updated our Terms" modal. Scroll to the bottom to accept. Declining is not supported. */
export default function TosModal() {
  const tos = useGameStore((s) => s.tos)
  const shown = useLastDefined(tos)
  return (
    <Modal open={!!tos} z={310} backdrop="bg-inset/80">
      {shown && <TosBody key={shown.id} tos={shown} />}
    </Modal>
  )
}

const DECLINE_LINES = [
  'Declining is not supported in your region.',
  'Your region is Earth.',
  'Have you tried agreeing?',
  'The Decline button has been deprecated.',
]

function TosBody({ tos }) {
  const acceptTos = useGameStore((s) => s.acceptTos)
  const toast = useGameStore((s) => s.toast)
  const [readToEnd, setReadToEnd] = useState(false)
  const [declines, setDeclines] = useState(0)

  const onScroll = (e) => {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReadToEnd(true)
  }

  const decline = () => {
    toast(`📜 ${DECLINE_LINES[Math.min(declines, DECLINE_LINES.length - 1)]}`, 'bad')
    setDeclines((d) => d + 1)
  }

  return (
    <div className="modal-card w-[min(520px,94vw)] overflow-hidden" style={{ '--accent': '#3de8ff' }}>
      <div className="border-b border-ink/[0.06] px-6 py-5">
        <div className="label mb-1 text-ice/80">Legal · Mandatory · Unskippable</div>
        <h2 className="font-display text-xl font-semibold">We've updated our Terms of Service</h2>
        <p className="mt-1 text-xs text-ink/45">
          Version {tos.version}. Please read carefully. Nobody does. You must scroll to the bottom to continue.
        </p>
      </div>

      <div onScroll={onScroll} className="max-h-72 space-y-3 overflow-y-auto px-6 py-4 text-[0.8125rem] leading-relaxed text-ink/65">
        {TOS_CLAUSES.map(([n, text]) => (
          <p key={n}>
            <b className="mr-2 font-mono text-ice/70">§{n}</b>
            {text}
          </p>
        ))}
        <p className="pt-2 text-center font-mono text-[0.6875rem] text-ink/30">— end of document (for now) —</p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ink/[0.06] px-6 py-4">
        {declines < DECLINE_LINES.length ? (
          <button
            onClick={decline}
            className="btn btn-ghost btn-sm origin-left transition-transform duration-300"
            style={{ transform: `scale(${1 - declines * 0.2})`, opacity: 1 - declines * 0.18 }}
          >
            Decline
          </button>
        ) : (
          <span className="text-[0.6875rem] text-ink/30">Decline button removed for your convenience.</span>
        )}
        <button onClick={() => acceptTos(tos.id)} disabled={!readToEnd} className="btn btn-gold">
          {readToEnd ? 'I Agree (I did not read this)' : 'Scroll to accept ↓'}
        </button>
      </div>
    </div>
  )
}
