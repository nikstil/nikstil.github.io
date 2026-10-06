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
  strife: lazy(() => import('./arcade/TouchGrass')),
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
  const ref = useRef(null)
  // ⟲ turns it sideways: in landscape every app gets the wide screen, so nothing unfolds.
  const [landscape, setLandscape] = useState(false)
  const [skipFold, setSkipFold] = useState(false) // just turned back upright: already open
  useEffect(() => setSkipFold(false), [shown])
  const panels = owned && shown !== 'menu' && !landscape ? foldsFor(info?.aspect) : 1
  const rot = useRotation(ref, () => {
    setLandscape((l) => !l)
    setSkipFold(true)
  })

  // Esc pockets the phone from its home screen, when you're in it (games have a back button, and
  // some use Esc to pause; the rest of the page keeps its own Esc).
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
      className={`phone ${settled ? 'phone-settled' : ''} ${landscape ? 'phone-landscape' : ''} ${panels > 1 ? `phone-land unfold-${panels}` : ''} ${skipFold ? 'unfolded' : ''}`}
      style={{ ...(panels > 1 ? { '--ar': info.aspect } : {}), ...rot.style }}
      data-orient={landscape ? 'landscape' : 'portrait'}
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
        <div className={`rot-cover ${rot.dark ? 'on' : ''}`} aria-hidden="true">
          <span className="rot-icon" style={{ rotate: rot.iconTurn }}>
            <RotateIcon />
          </span>
        </div>
        <nav className="phone-nav">
          <button onClick={() => close(app === 'menu')} aria-label={App ? 'Back' : 'Put the phone away'} title={App ? 'Back' : 'Put the phone away'}>
            ◀
          </button>
          <button onClick={() => open('menu')} aria-label="Home" title="Home">
            ●
          </button>
          <button onClick={() => rot.start(landscape)} aria-label="Rotate" title="Rotate (landscape / portrait)" data-rotate>
            ⟲
          </button>
          <button onClick={() => close(true)} aria-label="Put the phone away" title="Put the phone away (TRANSLATR™ resumes)">
            ✕
          </button>
        </nav>
      </div>
    </aside>
  )
}

function RotateIcon() {
  return (
    <svg viewBox="0 0 48 48" width="52" height="52" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="16" y="10" width="16" height="28" rx="3" />
      <path d="M22 34h4" />
      <path d="M7 21A17 17 0 0 1 17 6" />
      <path d="M17 2v5h-5" />
      <path d="M41 27A17 17 0 0 1 31 42" />
      <path d="M31 46v-5h5" />
    </svg>
  )
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
/** Where the phone's middle ends up for an orientation (see .phone and .phone-landscape). */
function restingCentre(toLandscape) {
  const vw = document.documentElement.clientWidth
  const vh = window.innerHeight
  if (toLandscape) {
    const w = Math.min(vw - 16, 1000, (vh - 64) * 2)
    return { x: vw / 2, y: vh - 52 - w / 4 }
  }
  const w = Math.min(380, vw - 16)
  const h = Math.min(780, vh - 64)
  return { x: vw - (vw <= 480 ? 8 : 12) - w / 2, y: vh - 52 - h / 2 }
}
/**
 * ⟲: the screen blacks out, the whole phone turns a quarter (gliding to where it will rest) with
 * the rotation symbol turning along, it takes its new shape under the black, then fades back in.
 */
function useRotation(ref, swap) {
  const [state, setState] = useState({ dark: false, style: {}, iconTurn: '0deg' })
  const busy = useRef(false)
  const start = async (landscape) => {
    if (busy.current || !ref.current) return
    busy.current = true
    const quick = matchMedia('(prefers-reduced-motion: reduce)').matches
    const turn = landscape ? '90deg' : '-90deg'
    const r = ref.current.getBoundingClientRect()
    const to = restingCentre(!landscape)
    const glide = `translate(${to.x - (r.left + r.width / 2)}px, ${to.y - (r.top + r.height / 2)}px) rotate(${turn})`
    setState({ dark: true, style: {}, iconTurn: '0deg' })
    await wait(quick ? 0 : 200)
    if (!quick) {
      setState({ dark: true, style: { transform: glide, transition: 'transform 0.6s cubic-bezier(.45, .05, .25, 1)' }, iconTurn: '0deg' })
      await wait(620)
    }
    // Under the black: stop turning, take the new shape; the symbol keeps the angle it had.
    swap()
    setState({ dark: true, style: {}, iconTurn: quick ? '0deg' : turn })
    await wait(quick ? 0 : 160)
    setState((s) => ({ ...s, dark: false }))
    await wait(quick ? 0 : 260)
    busy.current = false
  }
  return { ...state, start }
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

/** Your COUNTER-STRIFE record (it keeps its own, on nikstil.com). */
function strifeRecord() {
  try {
    const r = JSON.parse(localStorage.getItem('strife-record') ?? 'null')
    return r && r.wins + r.losses ? `${r.wins} won, ${r.losses} lost · ${r.kills} kills` : 'Not played'
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
    strife: strifeRecord(),
    loggle: loggleProgress(stats),
  }
}
