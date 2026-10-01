import Panel from './Panel'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore, getLoanOffers, getCreditScore } from '../store/useGameStore'
import { useAnimatedNumber } from '../lib/hooks'
import { LOANS } from '../data/gameData'
import { money } from '../lib/format'

/** QuickCash™ by Vinnie: instant loans, compounding every 15 seconds, with a complimentary Repo Man. */
export default function LoanShark() {
  const loan = useGameStore((s) => s.loan)
  // Only what's on screen: with no loan, neither the wallet nor the clock matters here.
  const repay = useGameStore((s) => (s.loan ? Math.min(Math.floor(s.money), Math.ceil(s.loan.debt)) : 0))
  const nextIn = useGameStore((s) => (s.loan ? Math.max(0, Math.ceil((s.loan.lastAccrual + LOANS.compoundEveryMs - s.clock) / 1000)) : 0))
  const offers = useGameStore(useShallow(getLoanOffers))
  const credit = useGameStore(getCreditScore)
  const { takeLoan, repayLoan, startCheckout } = useGameStore.getState()
  const shownDebt = useAnimatedNumber(loan?.debt ?? 0, 700)

  const repoLine = loan ? loan.principal * LOANS.repoAt : 0
  const danger = loan ? Math.min(1, loan.debt / repoLine) : 0
  const barColor = danger >= 0.75 ? '#ff3b5c' : danger >= 0.45 ? '#ffcf3f' : '#39ff14'
  const creditColor = credit >= 700 ? 'text-toxic' : credit >= 500 ? 'text-gold' : 'text-blood'

  return (
    <Panel title="QuickCash™ Loans" icon="🦈" id="win-loans" accent="#43b048" badge="0% Judgment">
      <div className="mb-4 flex items-center justify-between rounded-xl border border-ink/[0.06] bg-inset/30 px-3 py-2 text-xs">
        <span className="text-ink/50">
          Credit score <b className={`font-mono ${creditColor}`}>{credit}</b>
        </span>
        <span className="font-mono text-ink/40">APR: yes</span>
      </div>

      {loan ? (
        <div className="inset-card mb-4 p-3">
          <div className="flex items-baseline justify-between">
            <span className="label">You owe Vinnie</span>
            <span className="font-mono text-[0.6875rem] text-ink/40">borrowed {money(loan.principal)}</span>
          </div>
          <div className={`mt-1 font-mono text-2xl font-bold tabular-nums ${danger >= 0.75 ? 'glow-blood animate-flash' : 'glow-gold'}`}>{money(shownDebt)}</div>
          <div className="mt-1 text-[0.6875rem] text-ink/45">
            +{Math.round(LOANS.interestRate * 100)}% in <b className="font-mono text-ink/70">{nextIn}s</b>
          </div>
          <div className="mt-3 flex justify-between text-[0.625rem] text-ink/40">
            <span>Repo Man ETA</span>
            <span className="font-mono">
              {Math.round(danger * 100)}% of {money(repoLine)}
            </span>
          </div>
          <div className="meter mt-1" style={{ '--bar': barColor }}>
            <span style={{ width: `${danger * 100}%` }} />
          </div>
          {danger >= 0.75 && <p className="mt-2 text-[0.6875rem] font-semibold text-blood">🚚 A truck has been seen idling outside your house.</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={repayLoan} className="btn btn-toxic btn-sm" disabled={repay < 1}>
              Repay {money(repay)}
            </button>
            <button onClick={() => startCheckout('debt_relief')} className="btn btn-ghost btn-sm" style={{ '--accent': '#ff2bd6' }}>
              Forgive · $29.99
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 text-center text-sm text-ink/50">
          <div className="mb-2 text-5xl">🤝</div>
          No debt. Vinnie finds this <i>concerning</i>.
        </div>
      )}

      <div className="label mb-2">{loan ? 'Borrow more (why not)' : 'Instant approval'}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {offers.map((amt) => (
          <button key={amt} onClick={() => takeLoan(amt)} className="btn btn-ghost flex-col px-1 py-2" style={{ '--accent': '#39ff14' }}>
            <span className="font-mono text-sm">{money(amt)}</span>
            <span className="text-[0.5625rem] text-ink/40">instant</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[0.625rem] leading-snug text-ink/30">
        +{Math.round(LOANS.interestRate * 100)}% every {LOANS.compoundEveryMs / 1000}s. At {LOANS.repoAt}× the principal the Repo Man takes {Math.round(LOANS.repoSeizeRate * 100)}% of your
        wallet and everything equipped. Debt survives Prestige.
      </p>
    </Panel>
  )
}
