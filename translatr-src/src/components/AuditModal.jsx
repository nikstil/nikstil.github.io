import Modal from './Modal'
import { useGameStore } from '../store/useGameStore'
import { useAnimatedNumber, useLastDefined } from '../lib/hooks'
import { AUDIT } from '../data/gameData'
import { money } from '../lib/format'

/** The Dev IRS. Menacing, beautifully typeset, and 30% of your money richer. */
export default function AuditModal() {
  const audit = useGameStore((s) => s.audit)
  const shown = useLastDefined(audit)
  return (
    <Modal open={!!audit} z={320} backdrop="bg-[radial-gradient(circle,rgba(90,0,15,.6),rgba(0,0,0,.94))]">
      {shown && <AuditBody key={shown.id} a={shown} />}
    </Modal>
  )
}

function AuditBody({ a }) {
  const dismiss = useGameStore((s) => s.dismissAudit)
  const seized = useAnimatedNumber(a.taken, 1400, 0)

  return (
    <div className="modal-card scanlines w-[min(480px,94vw)] overflow-hidden" style={{ '--accent': '#ff3b5c', borderColor: 'rgba(255,59,92,.45)' }}>
      <div className="h-1 bg-[repeating-linear-gradient(90deg,#ff3b5c_0_18px,#0d0d14_18px_36px)]" />
      <div className="relative p-7">
        <div className="pointer-events-none absolute right-6 top-9 animate-stamp rounded-lg border-[3px] border-blood px-3 py-1 font-display text-xl font-bold tracking-[0.2em] text-blood opacity-0 shadow-[0_0_24px_-4px_#ff3b5c] [animation-delay:500ms]">
          SEIZED
        </div>
        <div className="flex items-center gap-4">
          <Seal />
          <div>
            <div className="label text-blood/80">Department of Developer Revenue</div>
            <h2 className="font-display text-2xl font-bold tracking-wide text-ink">Notice of Audit</h2>
            <div className="font-mono text-xs text-ink/40">Case {a.caseNo}</div>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-ink/60">
          Our algorithms detected <b className="text-ink">excessive hoarding</b> of in-game currency (over {money(AUDIT.threshold)}). Under Section 404 of the Terms
          You Didn't Read, a confiscation has been executed automatically.
        </p>

        <div className="mt-5 rounded-xl border border-ink/[0.07] bg-inset/40 p-4 font-mono text-sm">
          <Line label="Declared assets" value={money(a.before)} />
          <Line label="Confiscation rate" value={`${Math.round(AUDIT.rate * 100)}%`} />
          <Line label="Amount seized" value={`−${money(seized)}`} className="glow-blood text-base font-bold" />
          <div className="my-2 h-px bg-ink/10" />
          <Line label="Remaining balance" value={money(a.after)} className="text-ink" />
        </div>

        <p className="mt-4 text-[0.6875rem] leading-snug text-ink/35">
          Appeals may be submitted by fax to /dev/null. Tip: an equipped <b className="text-toxic">🏝️ Offshore Bank Account</b> makes you invisible to the Dev IRS.
        </p>

        <button onClick={() => dismiss(a.id)} className="btn btn-blood mt-6 w-full">
          I comply (I have no choice)
        </button>
      </div>
    </div>
  )
}

function Line({ label, value, className = 'text-ink/70' }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-ink/40">{label}</span>
      <span className={`tabular-nums ${className}`}>{value}</span>
    </div>
  )
}

function Seal() {
  return (
    <div className="relative grid h-16 w-16 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 animate-spin-slow">
        <defs>
          <path id="seal-ring" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <circle cx="50" cy="50" r="47" fill="none" stroke="#ff3b5c" strokeOpacity=".5" strokeWidth="1.5" />
        <text fill="#ff3b5c" fontSize="10.5" fontFamily="Chakra Petch" letterSpacing="2.4">
          <textPath href="#seal-ring">DEV IRS · WE ALWAYS WIN · DEV IRS · </textPath>
        </text>
      </svg>
      <span className="text-2xl drop-shadow-[0_0_10px_#ff3b5c]">⚖️</span>
    </div>
  )
}
