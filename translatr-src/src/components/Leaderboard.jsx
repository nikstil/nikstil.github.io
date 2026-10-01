import { useEffect, useRef, useState } from 'react'
import Panel from './Panel'
import { useGameStore } from '../store/useGameStore'
import { LEADERBOARD } from '../data/gameData'
import { npcStandings, rankFor } from '../lib/leaderboard'
import { useAnimatedNumber } from '../lib/hooks'
import { fmt, money } from '../lib/format'

const ROW_H = 58
const MEDALS = ['#d4a017', '#8a95a5', '#c46a2d']
const fmtScore = (n) => (n >= 1e15 ? fmt(n) : Math.round(n).toLocaleString())
const peakOf = (s) => Math.max(s.money, s.stats.peakMoney ?? 0)

/**
 * The Global Leaderboard, ranked by peak wallet. You're #9,999,999 until you reach 10% of #5's
 * score; then you climb into the top 5 for real. #1 always stays at least 2× ahead. Always.
 */
export default function Leaderboard() {
  const you = useGameStore(peakOf)
  const vip = useGameStore((s) => !!s.premium.vip)
  const startCheckout = useGameStore((s) => s.startCheckout)

  // The others "play" in bursts: their scores move on a beat, with a "+gain" each time.
  const [board, setBoard] = useState(() => ({ play: useGameStore.getState().stats.playSeconds ?? 0, beat: 0, deltas: {} }))
  useEffect(() => {
    const id = setInterval(() => {
      const s = useGameStore.getState()
      const play = s.stats.playSeconds ?? 0
      setBoard((b) => {
        const before = npcStandings(peakOf(s), b.play)
        const after = npcStandings(peakOf(s), play)
        return { play, beat: b.beat + 1, deltas: Object.fromEntries(after.map((n, i) => [n.id, n.score - before[i].score])) }
      })
    }, LEADERBOARD.tickMs)
    return () => clearInterval(id)
  }, [])

  const npcs = npcStandings(you, board.play)
  const rank = rankFor(you, board.play)
  const inTop = rank <= npcs.length
  const rows = inTop ? [...npcs, { id: 'you', name: 'You', badge: vip ? '👑' : '🫵', score: you, you: true }] : npcs
  const rankOf = Object.fromEntries([...rows].sort((a, b) => b.score - a.score).map((p, i) => [p.id, i]))

  const fifth = npcs[npcs.length - 1].score
  const floor = fifth * LEADERBOARD.riseFrom

  return (
    <Panel
      title="Global Leaderboard"
      icon="🏆"
      accent="#7a9cc6"
      right={
        <span className="flex items-center gap-1.5 text-[0.625rem] font-bold text-blood">
          <span className="h-1.5 w-1.5 animate-live rounded-full bg-blood shadow-[0_0_6px_#d32f2f]" />
          LIVE
        </span>
      }
    >
      <div className="mb-3 text-[0.6875rem] text-ink/50">
        {LEADERBOARD.totalPlayers.toLocaleString()} players · ranked by peak wallet · updated live
      </div>

      <div className="relative" style={{ height: ROW_H * rows.length }}>
        {rows.map((p) => (
          <PlayerRow key={p.id} p={p} rank={rankOf[p.id]} delta={board.deltas[p.id] ?? 0} beat={board.beat} />
        ))}
      </div>

      {!inTop && (
        <>
          <div className="my-3 flex items-center gap-2 text-[0.625rem] text-ink/25">
            <div className="h-px flex-1 bg-linear-to-r from-transparent to-ink/15" />
            {Math.max(0, rank - npcs.length - 1).toLocaleString()} players hidden
            <div className="h-px flex-1 bg-linear-to-l from-transparent to-ink/15" />
          </div>
          <YouRow rank={rank} score={you} vip={vip} />
          <p className="mt-2 text-center text-[0.65625rem] leading-snug text-ink/50">
            {you < floor
              ? `Reach ${money(floor)} to start climbing. Everyone else is already there.`
              : `Climbing! #5 is at ${money(fifth)}.`}
          </p>
        </>
      )}
      {inTop && (
        <p className="mt-2 text-center text-[0.65625rem] leading-snug text-ink/50">
          {rank === 2 ? 'Silver. Forever. xX_Whale_Xx will always be 2× ahead.' : 'Top 5! xX_Whale_Xx has noticed you. Their mom’s card has noticed you.'}
        </p>
      )}

      <button onClick={() => startCheckout('rank_boost')} className="btn btn-magenta mt-4 w-full">
        📈 Boost my rank · $19.99
      </button>
      <p className="mt-2 text-center text-[0.625rem] leading-snug text-ink/40">Rank Boosts improve your rank by up to 0 places. #1 is not for sale. #1 is the one buying.</p>
    </Panel>
  )
}

function PlayerRow({ p, rank, delta, beat }) {
  const shown = useAnimatedNumber(p.score, 900)
  const medal = MEDALS[rank]
  return (
    <div
      className={`absolute inset-x-0 flex items-center gap-3 rounded-xl px-2 transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)] ${
        p.you ? 'border border-gold/40 bg-gold/[0.07] shadow-[0_0_18px_-8px_#ffcf3f]' : ''
      }`}
      style={{ height: ROW_H - 6, transform: `translateY(${rank * ROW_H}px)` }}
    >
      <span
        className="w-6 text-center font-display text-sm font-bold"
        style={{ color: medal ?? 'rgba(27,42,58,.45)', textShadow: medal ? `0 0 12px ${medal}` : 'none' }}
      >
        {rank + 1}
      </span>
      <div
        className="grid h-9 w-9 shrink-0 place-items-center avatar-chip rounded-full text-lg"
        style={{ boxShadow: `0 0 0 1.5px ${medal ?? 'rgba(27,42,58,.18)'}, 0 0 14px -4px ${medal ?? 'transparent'}` }}
      >
        {p.badge}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm ${p.you ? 'font-bold text-ink' : 'font-medium text-ink/90'}`}>{p.name}</div>
        <div className="font-mono text-[0.6875rem] tabular-nums text-ink/50">{fmtScore(shown)}</div>
      </div>
      {delta > 0 && !p.you && (
        <span key={beat} className="animate-fade-up font-mono text-[0.625rem] font-semibold text-toxic">
          +{fmt(delta)}
        </span>
      )}
    </div>
  )
}

function YouRow({ rank, score, vip }) {
  const shownScore = useAnimatedNumber(score)
  const shownRank = useAnimatedNumber(rank, 1200)
  const first = useRef(rank)
  const climbed = first.current - rank
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/[0.05] px-2 py-2.5 shadow-[0_1px_4px_-1px_rgba(191,122,0,.35)]">
      <span className="font-mono text-[0.6875rem] font-bold text-gold">#{Math.round(shownRank).toLocaleString()}</span>
      <div className="grid h-9 w-9 shrink-0 place-items-center avatar-chip rounded-full text-lg ring-1 ring-gold/50">{vip ? '👑' : '🫵'}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">You</div>
        <div className="font-mono text-[0.6875rem] tabular-nums text-ink/50">{fmtScore(shownScore)}</div>
      </div>
      <span className={`font-mono text-[0.625rem] ${climbed > 0 ? 'font-bold text-toxic' : 'text-ink/30'}`}>▲{climbed > 0 ? fmt(climbed) : 0}</span>
    </div>
  )
}
