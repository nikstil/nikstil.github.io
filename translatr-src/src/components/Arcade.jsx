import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../store/useGameStore'
import { ARCADE_GAMES, PHONE_APPS, foldsFor } from '../data/arcade'
import { PREMIUM_ITEMS } from '../data/gameData'
import { money } from '../lib/format'

// The LigmaPhone™ (Start menu → Phone, or the 📱 on the taskbar): a smartphone docked to the
// bottom right of the screen, sold as a microtransaction. Its home screen holds DoomFeed™, a
// browser and the Arcade, whose minigames are played right on it (DOOMSCROLL.EXE still goes full
// screen, and the nikstil.com games turn the phone sideways). Each app is its own chunk, loaded
// when you open it. The main game pauses while a game is played (see PHONE_LIVE_APPS).
// The page makes room for it on wide screens (see arcadeInset in lib/dock.js).
const APPS = {
  doom: lazy(() => import('./DoomFeed').then((m) => ({ default: m.DoomFeedApp }))),
  browser: lazy(() => import('./arcade/Browser')),
  mines: lazy(() => import('./arcade/Minesweeper')),
  solitaire: lazy(() => import('./arcade/Solitaire')),
  snake: lazy(() => import('./arcade/Snake')),
  grass: lazy(() => import('./arcade/TouchGrass')),
  brains: lazy(() => import('./arcade/TouchGrass')),
  loggle: lazy(() => import('./arcade/Loggle')),
}
const PHONE = PREMIUM_ITEMS.find((p) => p.id === 'smartphone')
const ALL = [...PHONE_APPS, ...ARCADE_GAMES]
// The Arcade's own games keep their Windows 98 look; the phone's apps fill the screen.
const WIN98 = new Set(['mines', 'solitaire', 'snake', 'loggle'])

export default function Arcade() {
  const arcade = useGameStore((s) => s.arcade)
  if (!arcade) return null
  return createPortal(<Phone app={arcade} />, document.body)
}

/** The status bar's clock, battery (it drains while you look at it) and signal. */
function StatusBar() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(id)
  }, [])
  const battery = 100 - (Math.floor(now.getTime() / 60_000) % 97)
  return (
    <div className="phone-status" aria-hidden="true">
      <span>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
      <span className="phone-notch" />
      <span>
        📶 {battery}%{battery < 20 ? '🪫' : '🔋'}
      </span>
    </div>
  )
}

const UNFOLD_MS = { 2: 900, 3: 1300 }

/** The unfolding: the folded-over panels swing open, screen off, then the screen lights up. */
function FoldFx({ panels }) {
  return (
    <div className={`fold-fx fold-${panels}`} aria-hidden="true">
      {Array.from({ length: panels - 1 }, (_, i) => (
        <i key={i} className="fold-flap" style={{ '--i': i + 1 }} />
      ))}
    </div>
  )
}
/** The hinges stay visible (faintly) once it's open. */
function Creases({ panels }) {
  return Array.from({ length: panels - 1 }, (_, i) => <i key={i} className="fold-crease" style={{ left: `${((i + 1) * 100) / panels}%` }} aria-hidden="true" />)
}

function Phone({ app }) {
  const close = useGameStore((s) => s.closeArcade)
  const openApp = useGameStore((s) => s.openArcade)
  const owned = useGameStore((s) => !!s.premium?.smartphone)
  // DOOMSCROLL.EXE is too wide even for the trifold: the phone unfolds all the way, then the game
  // takes the whole screen.
  const [launching, setLaunching] = useState(null)
  const open = (id) => {
    if (id !== 'shooter') return openApp(id)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return openApp(id)
    setLaunching(id)
  }
  useEffect(() => {
    if (!launching) return
    const t = setTimeout(() => {
      setLaunching(null)
      openApp(launching)
    }, UNFOLD_MS[3] + 250)
    return () => clearTimeout(t)
  }, [launching, openApp])
  // The slide-in plays once; after that only the unfolding animates.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 400)
    return () => clearTimeout(t)
  }, [])
  const shown = launching ?? app
  const info = ALL.find((g) => g.id === shown)
  const App = owned ? APPS[app] : null
  const panels = owned && shown !== 'menu' ? foldsFor(info?.aspect) : 1

  // Esc pockets the phone from its home screen, when you're in it (games have a back button, and
  // some use Esc to pause; the rest of the page keeps its own Esc).
  const ref = useRef(null)
  useEffect(() => {
    if (app !== 'menu') return
    const onKey = (e) => e.key === 'Escape' && ref.current?.contains(document.activeElement) && close(true)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [app, close])

  let screen
  if (launching) screen = <div className="phone-splash">{info?.icon}</div>
  else if (!owned) screen = <LockScreen />
  else if (!App) screen = <HomeScreen open={open} />
  else
    screen = (
      <Suspense fallback={<div className="p-6 text-center">Loading… (buffering an ad)</div>}>
        {WIN98.has(app) ? (
          <div className="arcade-body">
            <App />
          </div>
        ) : (
          <App game={info} />
        )}
      </Suspense>
    )

  return (
    <aside
      ref={ref}
      className={`phone ${settled ? 'phone-settled' : ''} ${panels > 1 ? `phone-land unfold-${panels}` : ''}`}
      style={panels > 1 ? { '--ar': info.aspect } : undefined}
      aria-label={info ? `${info.name} (LigmaPhone™)` : 'LigmaPhone™'}
      data-app={owned ? shown : 'locked'}
      data-panels={panels}
    >
      <div className="phone-screen">
        {panels > 1 && <FoldFx key={shown} panels={panels} />}
        {panels > 1 && <Creases panels={panels} />}
        <StatusBar />
        {(App || launching) && (
          <div className="phone-appbar">
            <span aria-hidden="true">{info?.icon}</span>
            <span className="min-w-0 flex-1 truncate">{info?.name}</span>
          </div>
        )}
        <div className="phone-app">{screen}</div>
        <nav className="phone-nav">
          <button onClick={() => close(app === 'menu')} aria-label={App ? 'Back' : 'Put the phone away'} title={App ? 'Back' : 'Put the phone away'}>
            ◀
          </button>
          <button onClick={() => open('menu')} aria-label="Home" title="Home">
            ●
          </button>
          <button onClick={() => close(true)} aria-label="Put the phone away" title="Put the phone away (TRANSLATR™ resumes)">
            ✕
          </button>
        </nav>
      </div>
    </aside>
  )
}

/** Not bought yet: the lock screen sells you the phone you're looking at. */
function LockScreen() {
  const checkout = useGameStore((s) => s.checkout)
  const buy = () => useGameStore.getState().startCheckout('smartphone')
  return (
    <div className="phone-lock">
      <div className="phone-lock-clock">{new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
      <div className="phone-lock-icon" aria-hidden="true">
        🔒
      </div>
      <h2>This phone is not activated</h2>
      <p>
        The LigmaPhone™ has the Arcade, DoomFeed™ and a browser. You can see it. You can’t use it. That’s what the {PHONE.price} is for.
      </p>
      <button className="phone-buy" onClick={buy} disabled={!!checkout}>
        {checkout?.itemId === 'smartphone' ? 'Processing…' : `Buy for ${PHONE.price}`}
      </button>
      <p className="phone-fine">One-time purchase. Counts as a microtransaction. No charger in the box.</p>
    </div>
  )
}

/** The home screen: a wallet widget, then an icon for every app and game. */
function HomeScreen({ open }) {
  const stats = useGameStore((s) => s.stats)
  const wallet = useGameStore((s) => s.money)
  const best = progress(stats)
  return (
    <div className="phone-home">
      <div className="phone-widget">
        <span className="phone-widget-label">Wallet</span>
        <b>{money(wallet)}</b>
        <span className="phone-widget-label">⏱ {Math.floor((stats.doomSeconds ?? 0) / 60)} min on DoomFeed™</span>
      </div>
      <p className="phone-section">Apps</p>
      <div className="phone-grid">
        {PHONE_APPS.map((g) => (
          <AppIcon key={g.id} app={g} onOpen={() => open(g.id)} />
        ))}
      </div>
      <p className="phone-section">Arcade</p>
      <div className="phone-grid">
        {ARCADE_GAMES.map((g) => (
          <AppIcon key={g.id} app={g} note={best[g.id]} onOpen={() => open(g.id)} />
        ))}
      </div>
    </div>
  )
}

function AppIcon({ app, note, onOpen }) {
  return (
    <button className="phone-icon" onClick={onOpen} title={`${app.blurb}${note ? `\n${note}` : ''}`} data-app-id={app.id}>
      <span className="phone-icon-art" aria-hidden="true">
        {app.icon}
      </span>
      <span className="phone-icon-name">{app.name}</span>
    </button>
  )
}

/** How far you've got in LAWN OF THE DEAD (it saves on its own, on nikstil.com). */
function touchGrassProgress() {
  try {
    const s = JSON.parse(localStorage.getItem('touchgrass-save') ?? 'null')
    if (!s?.beaten?.length) return 'Not played'
    return s.next ? `Up to level ${s.next}` : 'Beaten. The Algorithm logged off.'
  } catch {
    return 'Not played'
  }
}

/** Whether today's LOGGLE is done, and your streak. */
function loggleProgress(stats) {
  const d = new Date()
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const streak = stats.loggleStreak ? ` · streak ${stats.loggleStreak}` : ''
  if (stats.loggleLastWin === day) return `Solved today${streak}`
  if (stats.loggleDay === day && stats.loggleBoard?.guesses?.length >= 6 + (stats.loggleBoard.extra ?? 0)) return 'Missed today. Somehow.'
  return stats.loggleWins ? `Today’s is waiting · ${stats.loggleWins} solved${streak}` : 'Today’s is waiting'
}

/** A best score (or some progress) for each Arcade game. */
function progress(stats) {
  return {
    shooter: stats.shooterWins ? `Beaten ${stats.shooterWins}×` : stats.shooterLevel ? `Reached ${stats.shooterLevel >= 15 ? 'the final boss' : `E${1 + Math.floor(stats.shooterLevel / 5)}M${(stats.shooterLevel % 5) + 1}`}` : 'Not played',
    mines: stats.minesWins ? `${stats.minesWins} cleared · best ${stats.minesBestTime}s` : stats.minesPlays ? `${stats.minesPlays} played, 0 cleared` : 'Not played',
    solitaire: stats.solitaireWins ? `${stats.solitaireWins} won · ${stats.solitaireDraws ?? 0} paid draws` : stats.solitairePlays ? `${stats.solitairePlays} dealt, 0 won` : 'Not played',
    snake: stats.snakeBest ? `Best: ${stats.snakeBest} bills in one game` : 'Not played',
    grass: touchGrassProgress(),
    brains: 'Saves on nikstil.com',
    loggle: loggleProgress(stats),
  }
}
