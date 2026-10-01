import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { MINES } from '../../data/arcade'
import { getArcadePrice } from '../../lib/economy'
import { money } from '../../lib/format'
import { sfx } from '../../lib/audio/engine'
import { AdBreak, useAdBreak } from '../AdBreak'

// Mine$weeper: classic Minesweeper, except every mine is an upsell. Hit one and you can pay to
// continue (the price doubles each time), watch one ad for a free continue, or give up.

const { cols: COLS, rows: ROWS, mines: MINE_COUNT } = MINES
const CELLS = COLS * ROWS
const NUMBER_COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080']

function neighbors(i) {
  const x = i % COLS
  const y = (i / COLS) | 0
  const out = []
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx
      const ny = y + dy
      if ((dx || dy) && nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) out.push(ny * COLS + nx)
    }
  return out
}

const freshGame = () => ({
  cells: Array.from({ length: CELLS }, () => ({ mine: false, open: false, flag: false, n: 0, boom: false })),
  started: false,
  over: null, // 'won' | 'lost'
  upsell: null, // the mine you just found
  revives: 0,
  adUsed: false,
  startedAt: 0,
  endedAt: 0,
})

/** Mines go in after the first click, never on it or next to it. */
function layMines(cells, safe) {
  const banned = new Set([safe, ...neighbors(safe)])
  let placed = 0
  while (placed < MINE_COUNT) {
    const i = Math.floor(Math.random() * CELLS)
    if (banned.has(i) || cells[i].mine) continue
    cells[i].mine = true
    placed++
  }
  cells.forEach((c, i) => (c.n = neighbors(i).filter((j) => cells[j].mine).length))
}

/** Opens `i`, and everything around it while the squares are blank. */
function flood(cells, i) {
  const stack = [i]
  while (stack.length) {
    const j = stack.pop()
    const c = cells[j]
    if (c.open || c.flag) continue
    c.open = true
    if (!c.mine && c.n === 0) stack.push(...neighbors(j))
  }
}

const cleared = (cells) => cells.every((c) => c.mine || c.open)

export default function Minesweeper() {
  const [game, setGame] = useState(freshGame)
  const [flagMode, setFlagMode] = useState(false)
  const [, setNow] = useState(0)
  const wallet = useGameStore((s) => s.money)
  const price = (clicks) => getArcadePrice(useGameStore.getState(), clicks)
  const { arcadeCharge, arcadePayout, noteShooter, toast } = useGameStore.getState()
  const [ad, showAd] = useAdBreak(() => noteShooter({ arcadeAds: 1 }))

  // The clock ticks while a board is in play.
  useEffect(() => {
    if (!game.started || game.over) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [game.started, game.over])

  const seconds = game.started ? Math.floor(((game.endedAt || Date.now()) - game.startedAt) / 1000) : 0
  const flags = game.cells.filter((c) => c.flag).length
  const reviveCost = price(MINES.revive * 2 ** game.revives)
  const face = game.over === 'won' ? '😸' : game.over === 'lost' ? '😿' : game.upsell != null ? '🙀' : '😺'

  /** Checks the board after squares open: a mine means an upsell, everything safe open means a win. */
  function settle(next, hit) {
    if (hit != null) {
      next.cells[hit].boom = true
      next.upsell = hit
      sfx('error')
      noteShooter({ minesHit: 1 })
    } else if (cleared(next.cells)) {
      next.over = 'won'
      next.endedAt = Date.now()
      const prize = price(MINES.prize)
      const time = Math.floor((next.endedAt - next.startedAt) / 1000)
      arcadePayout(prize)
      noteShooter({ minesWins: 1, ...(next.revives === 0 ? { minesClean: 1 } : {}) })
      useGameStore.setState((s) => ({ stats: { ...s.stats, minesBestTime: Math.min(s.stats.minesBestTime ?? Infinity, time) } }))
      sfx('jackpot')
      toast(`💣 Board cleared in ${time}s! ${money(prize)} paid to your wallet.`, 'good')
    }
    setGame(next)
  }

  function open(i) {
    if (game.over || game.upsell != null || ad) return
    const next = { ...game, cells: game.cells.map((c) => ({ ...c })) }
    const cell = next.cells[i]
    if (flagMode && !cell.open) return toggleFlag(i)
    if (cell.flag) return
    if (!next.started) {
      layMines(next.cells, i)
      next.started = true
      next.startedAt = Date.now()
      noteShooter({ minesPlays: 1 })
    }
    // Clicking an open number with all its flags placed opens the rest around it.
    const targets = cell.open ? (cell.n && neighbors(i).filter((j) => next.cells[j].flag).length === cell.n ? neighbors(i) : []) : [i]
    let hit = null
    for (const j of targets) {
      const c = next.cells[j]
      if (c.open || c.flag) continue
      if (c.mine) {
        c.open = true
        hit = j
        break
      }
      flood(next.cells, j)
    }
    if (!targets.length) return
    sfx('tick')
    settle(next, hit)
  }

  function toggleFlag(i) {
    if (game.over || game.upsell != null || game.cells[i].open) return
    setGame({ ...game, cells: game.cells.map((c, j) => (j === i ? { ...c, flag: !c.flag } : c)) })
  }

  /** The mine is defused (flagged) and the game goes on. */
  const defuse = (paid) =>
    setGame((g) => ({
      ...g,
      upsell: null,
      revives: g.revives + (paid ? 1 : 0),
      adUsed: g.adUsed || !paid,
      cells: g.cells.map((c, j) => (j === g.upsell ? { ...c, open: false, flag: true, boom: false } : c)),
    }))
  const payToContinue = () => {
    if (!arcadeCharge(reviveCost)) return toast(`Continuing costs ${money(reviveCost)}. You have ${money(useGameStore.getState().money)}.`, 'bad')
    noteShooter({ minesRevives: 1 })
    sfx('kaching')
    defuse(true)
  }
  const giveUp = () =>
    setGame((g) => ({ ...g, upsell: null, over: 'lost', endedAt: Date.now(), cells: g.cells.map((c) => (c.mine ? { ...c, open: true } : c)) }))

  const hintCost = price(MINES.hint)
  const hint = () => {
    if (!game.started || game.over || game.upsell != null) return
    const safe = game.cells.map((c, i) => (!c.mine && !c.open && !c.flag ? i : -1)).filter((i) => i >= 0)
    if (!safe.length) return
    if (!arcadeCharge(hintCost)) return toast(`A hint costs ${money(hintCost)}. Knowledge isn’t free.`, 'bad')
    noteShooter({ minesHints: 1 })
    const next = { ...game, cells: game.cells.map((c) => ({ ...c })) }
    flood(next.cells, safe[Math.floor(Math.random() * safe.length)])
    settle(next, null)
  }

  return (
    <div className="mines">
      <div className="mines-panel">
        <div className="mines-top">
          <span className="arcade-led" aria-label="Mines left">
            {String(Math.max(-99, MINE_COUNT - flags)).padStart(3, '0')}
          </span>
          <button className="mines-face" onClick={() => setGame(freshGame())} aria-label="New game" title="New game">
            {face}
          </button>
          <span className="arcade-led" aria-label="Seconds">
            {String(Math.min(999, seconds)).padStart(3, '0')}
          </span>
        </div>
        <div className="mines-board" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }} onContextMenu={(e) => e.preventDefault()}>
          {game.cells.map((c, i) => (
            <button
              key={i}
              className={`mines-cell ${c.open ? 'is-open' : ''} ${c.boom ? 'is-boom' : ''}`}
              style={c.open && !c.mine && c.n ? { color: NUMBER_COLORS[c.n] } : undefined}
              onClick={() => open(i)}
              onContextMenu={(e) => {
                e.preventDefault()
                toggleFlag(i)
              }}
              aria-label={c.open ? (c.mine ? 'Upsell' : c.n ? String(c.n) : 'Empty') : c.flag ? 'Flagged' : 'Hidden'}
            >
              {c.open ? (c.mine ? '💸' : c.n || '') : c.flag ? '🚩' : ''}
            </button>
          ))}
        </div>
        {game.upsell != null && !ad && (
          <div className="mines-upsell" role="alertdialog" aria-label="You found an upsell">
            <div className="text-3xl">💸</div>
            <div className="font-bold">You found a Premium Mine™!</div>
            <p className="text-[0.75rem]">Don’t lose your progress. Continue now, or lose everything. Your choice (it’s the first one).</p>
            <button className="arcade-btn arcade-btn-primary" onClick={payToContinue} disabled={wallet < reviveCost}>
              Continue for {money(reviveCost)}
            </button>
            {!game.adUsed && (
              <button className="arcade-btn" onClick={() => showAd(() => defuse(false))}>
                📺 Watch an ad to continue (once)
              </button>
            )}
            <button className="arcade-btn arcade-btn-sm" onClick={giveUp}>
              Give up
            </button>
          </div>
        )}
        {ad && <AdBreak ad={ad} />}
      </div>
      <div className="mines-side">
        <p>
          Clear the board: <b>{money(price(MINES.prize))}</b>
        </p>
        <p className="text-[0.75rem]">Click to open, right-click to flag, click a number to open around it. The first click is always safe (we checked, for once).</p>
        <button className={`arcade-btn ${flagMode ? 'is-pressed' : ''}`} aria-pressed={flagMode} onClick={() => setFlagMode((f) => !f)}>
          🚩 Flag mode {flagMode ? 'on' : 'off'}
        </button>
        <button className="arcade-btn" onClick={hint} disabled={!game.started || !!game.over || game.upsell != null}>
          💡 Hint ({money(hintCost)})
        </button>
        {game.over === 'won' && <p className="font-bold text-[#008000]">Cleared! The prize is in your wallet.</p>}
        {game.over === 'lost' && <p className="font-bold text-[#800000]">Game over. Click the cat to try again.</p>}
      </div>
    </div>
  )
}
