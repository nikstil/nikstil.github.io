import { Suspense, lazy, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../store/useGameStore'
import { ARCADE_GAMES } from '../data/arcade'
import { money } from '../lib/format'

// The Arcade (Start menu): a Windows-98-style sidebar docked to the right of the screen, with a
// launcher and the minigames played right inside it (DOOMSCROLL.EXE still goes full screen).
// Each game is its own chunk, loaded when you open it. The main game pauses while one is played.
// The page and the docked widgets make room for it on wide screens (see arcadeInset in lib/dock.js).
const GAMES = {
  mines: lazy(() => import('./arcade/Minesweeper')),
  solitaire: lazy(() => import('./arcade/Solitaire')),
  snake: lazy(() => import('./arcade/Snake')),
  grass: lazy(() => import('./arcade/TouchGrass')),
}

export default function Arcade() {
  const arcade = useGameStore((s) => s.arcade)
  if (!arcade) return null
  return createPortal(<ArcadeSidebar game={arcade} />, document.body)
}

function ArcadeSidebar({ game }) {
  const close = useGameStore((s) => s.closeArcade)
  const wallet = useGameStore((s) => s.money)
  const info = ARCADE_GAMES.find((g) => g.id === game)
  const Game = GAMES[game]

  // Esc closes the sidebar from its menu, when you're in it (games have a back button, and some use
  // Esc to pause; the rest of the page keeps its own Esc).
  const ref = useRef(null)
  useEffect(() => {
    if (game !== 'menu') return
    const onKey = (e) => e.key === 'Escape' && ref.current?.contains(document.activeElement) && close(true)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game, close])

  return (
    <aside ref={ref} className="arcade-sidebar" aria-label={info ? `${info.name} (Arcade)` : 'Arcade'}>
      <div className="arcade-title">
        <span aria-hidden="true">{info?.icon ?? '🕹️'}</span>
        <span className="min-w-0 flex-1 truncate">{info ? info.name : 'TRANSLATR™ Arcade'}</span>
        <button className="arcade-x" onClick={() => close(true)} aria-label="Close the Arcade" title="Close the Arcade">
          ✕
        </button>
      </div>
      <div className="arcade-body">
        {Game ? (
          <Suspense fallback={<div className="p-6 text-center">Loading… (buffering an ad)</div>}>
            <Game />
          </Suspense>
        ) : (
          <ArcadeMenu />
        )}
      </div>
      <div className="arcade-status">
        <span className="arcade-field">Wallet: {money(wallet)}</span>
        {info && (
          <button className="arcade-btn arcade-btn-sm ml-auto" onClick={() => close()}>
            ◀ Arcade
          </button>
        )}
      </div>
    </aside>
  )
}

/** How far you've got in TOUCHGRASS.EXE (it saves on its own, on nikstil.com). */
function touchGrassProgress() {
  try {
    const s = JSON.parse(localStorage.getItem('touchgrass-save') ?? 'null')
    if (!s?.beaten?.length) return 'Not played'
    return s.next ? `Up to level ${s.next}` : 'Beaten. The Algorithm logged off.'
  } catch {
    return 'Not played'
  }
}

/** The game picker, with a best score (or some progress) for each. */
function ArcadeMenu() {
  const stats = useGameStore((s) => s.stats)
  const open = useGameStore((s) => s.openArcade)
  const best = {
    shooter: stats.shooterWins ? `Beaten ${stats.shooterWins}×` : stats.shooterLevel ? `Reached ${stats.shooterLevel >= 15 ? 'the final boss' : `E${1 + Math.floor(stats.shooterLevel / 5)}M${(stats.shooterLevel % 5) + 1}`}` : 'Not played',
    mines: stats.minesWins ? `${stats.minesWins} cleared · best ${stats.minesBestTime}s` : stats.minesPlays ? `${stats.minesPlays} played, 0 cleared` : 'Not played',
    solitaire: stats.solitaireWins ? `${stats.solitaireWins} won · ${stats.solitaireDraws ?? 0} paid draws` : stats.solitairePlays ? `${stats.solitairePlays} dealt, 0 won` : 'Not played',
    snake: stats.snakeBest ? `Best: ${stats.snakeBest} bills in one game` : 'Not played',
    grass: touchGrassProgress(),
  }
  return (
    <div className="p-2">
      <p className="mb-3 text-[0.8125rem]">
        Five classics, lovingly monetized. Winnings go straight to your wallet. So do the fees, in the other direction. TRANSLATR™ pauses while you play.
      </p>
      <div className="grid gap-2">
        {ARCADE_GAMES.map((g) => (
          <button key={g.id} className="arcade-game" onClick={() => open(g.id)}>
            <span className="arcade-game-icon" aria-hidden="true">
              {g.icon}
            </span>
            <span className="min-w-0 text-left">
              <span className="block font-bold">{g.name}</span>
              <span className="block text-[0.75rem] leading-snug">{g.blurb}</span>
              <span className="mt-1 block text-[0.6875rem] text-[#404040]">{best[g.id]}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
