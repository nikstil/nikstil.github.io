import { useEffect, useRef, useState } from 'react'
import Panel from './Panel'
import { useGameStore, getTableLimit } from '../store/useGameStore'
import { SLOT_LINES, SLOT_MIN_BET, SLOT_SYMBOLS } from '../data/gameData'
import { money } from '../lib/format'
import { sfx } from '../lib/audio/engine'

const REELS = 5
const ROWS = 3
const TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((sum, x) => sum + x.weight, 0)
const FIRST_STOP_MS = 700
const STOP_GAP_MS = 260
const ROCK = '🪨'
const pays = Object.fromEntries(SLOT_SYMBOLS.map((x) => [x.s, x.pays]))

function rollSymbol(rand = Math.random) {
  let r = rand() * TOTAL_WEIGHT
  for (const sym of SLOT_SYMBOLS) {
    r -= sym.weight
    if (r <= 0) return sym.s
  }
  return SLOT_SYMBOLS[0].s
}
const randomFace = () => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)].s
/** The outcome of a pull (seeded on a Daily Challenge: pull #n is the same for everyone). */
function rollGrid() {
  const values = useGameStore.getState().rngMany('slots', REELS * ROWS)
  let i = 0
  return Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => rollSymbol(() => values[i++])))
}

/** Every payline with 3+ of the same symbol from the leftmost reel. grid[reel][row]. */
function lineWins(grid) {
  const wins = []
  SLOT_LINES.forEach((line, index) => {
    const sym = grid[0][line[0]]
    let n = 1
    while (n < REELS && grid[n][line[n]] === sym) n++
    if (n >= 3) wins.push({ index, sym, count: n, mult: pays[sym][n - 3], cells: line.slice(0, n).map((row, reel) => `${reel}:${row}`) })
  })
  return wins
}

export default function Slots() {
  const cash = useGameStore((s) => s.money)
  const limit = useGameStore(getTableLimit)
  const [bet, setBet] = useState(25)
  const [grid, setGrid] = useState(() => Array.from({ length: REELS }, () => ['7️⃣', '7️⃣', '7️⃣']))
  const [stopped, setStopped] = useState(() => Array(REELS).fill(true))
  const [result, setResult] = useState(null) // { tone, text, cells: Set }
  const timers = useRef({ flicker: null, stops: [] })
  const spinningRef = useRef(false)

  // Clear every pending reel timer on unmount.
  useEffect(() => {
    const t = timers.current
    return () => {
      clearInterval(t.flicker)
      t.stops.forEach(clearTimeout)
    }
  }, [])

  const spinning = stopped.some((s) => !s)

  const settle = (final, wager) => {
    const store = useGameStore.getState()
    const lineBet = wager / SLOT_LINES.length
    const wins = lineWins(final)
    const paying = wins.filter((w) => w.mult > 0)
    const rockLines = wins.filter((w) => w.sym === ROCK)
    const base = paying.reduce((sum, w) => sum + w.mult * lineBet, 0)
    const cells = new Set(wins.flatMap((w) => w.cells))
    const five = wins.some((w) => w.count === 5)
    if (five || rockLines.length) store.noteSlotSpin({ five, rock: rockLines.length > 0 })

    if (base > 0) {
      const won = store.settleBet(base, 'slots')
      const big = base >= wager * 10
      sfx(big ? 'jackpot' : base >= wager ? 'win' : 'coin')
      const best = paying.reduce((a, w) => (w.mult > a.mult ? w : a))
      setResult({
        tone: base >= wager ? 'win' : 'meh',
        text: `${paying.length} line${paying.length > 1 ? 's' : ''} · best ${best.count}× ${best.sym} · +${money(won)}${base < wager ? ' (still a loss, technically)' : ''}`,
        cells,
      })
      if (big) store.toast(`🎰 SLOTS BIG WIN! +${money(won)}`, 'good')
    } else if (rockLines.length) {
      sfx('lose')
      const refund = store.refundLoss(wager)
      setResult({ tone: 'bad', text: `${ROCK} LEGENDARY ROCK LINE ×${rockLines.length}. You win: nothing.${refund ? ` Insurance: ${money(refund)}.` : ''}`, cells })
    } else {
      sfx('lose')
      const refund = store.refundLoss(wager)
      setResult({ tone: 'bad', text: `Nothing on 5 lines. −${money(wager)}.${refund ? ` Insurance +${money(refund)}.` : ''} Pull again.`, cells })
    }
  }

  const spin = () => {
    if (spinningRef.current) return
    const store = useGameStore.getState()
    const wager = Math.floor(bet)
    if (!(wager >= SLOT_MIN_BET)) return store.toast(`Minimum bet is ${money(SLOT_MIN_BET)} ($1 a line), you coward.`, 'bad')
    if (!store.placeBet(wager, 'slots')) return

    spinningRef.current = true
    const final = rollGrid()
    const done = Array(REELS).fill(false)
    setStopped(Array(REELS).fill(false))
    setResult(null)

    const t = timers.current
    clearInterval(t.flicker)
    t.stops.forEach(clearTimeout)
    sfx('lever')
    t.flicker = setInterval(() => setGrid((g) => g.map((col, j) => (done[j] ? col : col.map(randomFace)))), 70)
    t.stops = final.map((col, i) =>
      setTimeout(() => {
        done[i] = true
        sfx('reelStop')
        setStopped((s) => s.map((v, j) => (j === i ? true : v)))
        setGrid((g) => g.map((c, j) => (j === i ? col : c)))
        if (i === REELS - 1) {
          clearInterval(t.flicker)
          spinningRef.current = false
          settle(final, wager)
        }
      }, FIRST_STOP_MS + i * STOP_GAP_MS),
    )
  }

  const chip = (label, fn) => (
    <button key={label} disabled={spinning} onClick={() => setBet((b) => Math.max(SLOT_MIN_BET, Math.min(limit, Math.floor(fn(b)))))} className="btn btn-ghost btn-sm font-mono">
      {label}
    </button>
  )

  const toneClass = { win: 'glow-gold', meh: 'text-ink/80', bad: 'text-blood' }
  const lineBet = Math.max(0, Math.floor(bet)) / SLOT_LINES.length

  return (
    <Panel title="Slots of Regret" icon="🎰" accent="#d65a9c" badge="95.6% RTP*">
      <div className="relative mb-4 rounded-2xl bg-linear-to-b from-[#ffe88a] via-[#8a6200] to-[#ffcf3f] p-[2px] shadow-[0_0_40px_-12px_#ffcf3f]">
        <div className="slot-frame rounded-[14px] p-2">
          <div className="grid grid-cols-5 gap-1.5">
            {grid.map((col, reel) => (
              <div key={reel} className={`grid grid-rows-3 gap-1.5 transition ${stopped[reel] ? '' : 'blur-[1.5px]'}`}>
                {col.map((sym, row) => {
                  const lit = result?.cells.has(`${reel}:${row}`)
                  return (
                    <div
                      key={row}
                      className={`slot-cell relative flex h-14 items-center justify-center overflow-hidden rounded-lg border text-3xl ${
                        lit ? (result.tone === 'bad' ? 'is-rock' : 'is-lit') : ''
                      }`}
                    >
                      <span className={stopped[reel] ? 'animate-pop-in' : ''} key={stopped[reel] ? `s-${sym}` : 'spin'}>
                        {sym}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between px-1 font-mono text-[0.625rem] text-ink/45">
            <span>5 lines · ═ ═ ═ ∨ ∧</span>
            <span>{money(lineBet)}/line</span>
          </div>
        </div>
      </div>

      <p className={`mb-3 min-h-[2.5rem] text-center text-sm ${result ? toneClass[result.tone] : 'text-ink/60'}`}>
        {spinning ? 'Spinning…' : result?.text ?? 'Pull the lever. What could go wrong?'}
      </p>

      <div className="mb-2 flex items-center gap-2" style={{ '--accent': '#ff2bd6' }}>
        <span className="label shrink-0">Bet</span>
        <input type="number" min={SLOT_MIN_BET} value={bet} disabled={spinning} onChange={(e) => setBet(Number(e.target.value))} className="input" />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {chip('+10', (b) => b + 10)}
        {chip('+100', (b) => b + 100)}
        {chip('½', (b) => b / 2)}
        {chip('×2', (b) => b * 2)}
        <button disabled={spinning} onClick={() => setBet(Math.max(SLOT_MIN_BET, Math.floor(Math.min(cash, limit))))} className="btn btn-blood btn-sm">
          ALL IN 🔥
        </button>
      </div>

      <button onClick={spin} disabled={spinning} className="btn btn-gold w-full py-3 text-base">
        {spinning ? '…' : 'Pull the lever'}
      </button>

      <div className="mt-4 grid grid-cols-2 gap-1.5 font-mono text-[0.6875rem]">
        {SLOT_SYMBOLS.map((x) => (
          <span key={x.s} className="flex items-center justify-between gap-1 rounded-lg bg-ink/[0.03] px-2 py-1 text-ink/60">
            <span className="text-base">{x.s}</span>
            {x.pays[0] ? (
              <span>
                ×3 <b className="text-gold">{x.pays[0]}</b> ·4 <b className="text-gold">{x.pays[1]}</b> ·5 <b className="text-gold">{x.pays[2]}</b>
              </span>
            ) : (
              <b className="text-blood">pays nothing</b>
            )}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[0.6875rem] text-ink/35">
        Pays × line bet, left to right, on 5 lines. Table limit {money(limit)}. *RTP measured on a different machine.
      </p>
    </Panel>
  )
}
