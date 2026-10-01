import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore } from '../store/useGameStore'
import { nextTips } from '../data/tips'
import { WINDOW_META, isWindowAvailable } from '../data/windows'
import { useLastDefined } from '../lib/hooks'
import { focusWindow, setRestoreOrigin } from '../lib/windowFx'
import { ENDINGS } from '../data/endings'
import { mailFolderOf } from '../data/mail'
import { TASKBAR_H } from '../lib/dock'
import { onMusicStatus, sfx } from '../lib/audio/engine'
import { TRACK_TITLE } from '../lib/audio/music'
import { THEMES } from '../data/themes'
import { revealChange, switchTheme } from '../lib/theme'
import { colorMode, motionReduced } from '../lib/settings'
import { dailyFor } from '../data/daily'
import { dailyLabels } from './Daily'
import Modal from './Modal'
import PhantomBadge from './PhantomBadge'
import RealCat from './RealCat'
import { useCatMood } from './Cat'

const TONES = {
  good: { color: '#2c9a1e', icon: '✓', title: 'Success' },
  bad: { color: '#d32f2f', icon: '✕', title: 'Error' },
  info: { color: '#1a73c4', icon: 'i', title: 'TRANSLATR™' },
}

/** Windows 7 notification balloons. They animate themselves; the game loop removes expired ones. */
export function Toasts() {
  const toasts = useGameStore((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed right-[calc(1rem_+_var(--arcade-room,0px))] top-24 z-[400] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const tone = TONES[t.tone] ?? TONES.info
        return (
          <div key={t.id} className="balloon flex animate-toast items-start gap-2.5 p-2.5 text-[0.8125rem]">
            <span
              className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold text-[#fff] shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_1px_2px_rgba(0,0,0,.3)]"
              style={{ background: `radial-gradient(circle at 50% 30%, #fff8, ${tone.color} 60%)` }}
            >
              {tone.icon}
            </span>
            <div className="min-w-0">
              <div className="text-[0.6875rem] font-bold" style={{ color: tone.color }}>
                {tone.title}
              </div>
              <div className="leading-snug text-ink">{t.text}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function BigModal() {
  const modal = useGameStore((s) => s.modal)
  const closeModal = useGameStore((s) => s.closeModal)
  const shown = useLastDefined(modal)
  const accent = { bad: '#d32f2f', warn: '#8a4fc4', good: '#c07a00' }[shown?.tone] ?? '#1a73c4'

  return (
    <Modal open={!!modal} z={300} onBackdrop={modal?.onConfirm ? undefined : closeModal}>
      {shown && (
        <div className="modal-card w-[min(440px,92vw)] p-7 text-center" style={{ '--accent': accent }}>
          <h2 className="text-2xl font-light" style={{ color: accent }}>
            {shown.title}
          </h2>
          <p className="mt-3 leading-relaxed text-ink/70">{shown.body}</p>
          {shown.onConfirm ? (
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  closeModal()
                  shown.onCancel?.()
                }}
                className="btn btn-ghost"
              >
                {shown.cancelLabel ?? 'Cancel'}
              </button>
              <button
                onClick={() => {
                  closeModal()
                  shown.onConfirm()
                }}
                className={`btn ${shown.tone === 'bad' ? 'btn-blood' : 'btn-magenta'}`}
              >
                {shown.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          ) : (
            <button onClick={closeModal} className={`btn mt-6 w-full ${shown.tone === 'bad' ? 'btn-blood' : 'btn-gold'}`}>
              {shown.tone === 'bad' ? 'I deserve this' : 'Continue'}
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}

const RESTARTS = {
  reset: ['Resetting everything…', 'Deleting your progress. Finally, something here that loads fast.', '#d32f2f'],
  newgame: ['Starting a new game…', 'Your achievements and endings come with you. Your money does not.', '#3da6e8'],
  ngplus: ['Starting New Game+…', 'Your skills come with you. So does a new curse.', '#c42e86'],
  daily: ['Starting today’s Daily Challenge…', 'Your game is parked. It will be right here when you get back.', '#e0a21a'],
  return: ['Back to your game…', 'The Daily Challenge is over. Your debts missed you.', '#3da6e8'],
  import: ['Loading your save…', 'Restoring your progress, your debts and your cat’s opinion of you.', '#2c9a1e'],
}

/** Covers the moment between a restart (Reset all, a new game, an imported save) and the page reloading. */
export function ResetScreen() {
  const resetting = useGameStore((s) => s.resetting)
  const shown = useLastDefined(resetting || null)
  const [title, line, color] = RESTARTS[shown] ?? RESTARTS.reset
  return (
    <Modal open={!!resetting} z={1000} backdrop="bg-[#06264d]/70">
      <div role="status" className="modal-card w-[min(360px,92vw)] p-7 text-center" style={{ '--accent': color }}>
        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-ink/10" style={{ borderTopColor: color }} />
        <div className="font-display text-lg font-semibold">{title}</div>
        <div className="mt-2 text-sm text-ink/55">{line}</div>
      </div>
    </Modal>
  )
}

/** Labeled tray toggle: clearly shows whether a channel is on or muted. */
function MuteButton({ on, onToggle, label, icon, title }) {
  return (
    <button
      onClick={onToggle}
      title={title}
      aria-pressed={!on}
      className={`task-btn h-8 px-2 ${on ? '' : 'task-btn-alert'}`}
    >
      <span className="flex items-center gap-1.5 text-[0.75rem]">
        {on ? icon : <span className="text-sm">🔇</span>}
        {/* icon-only on phones so the tray (and clock) still fit */}
        <span className={`hidden sm:inline ${on ? '' : 'line-through decoration-2'}`}>{label}</span>
      </span>
    </button>
  )
}

function VolumeRow({ label, value, onChange, muted, onMute }) {
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex items-center justify-between text-[0.75rem]">
        <span className="font-semibold">
          {label} <span className="font-normal text-ink/50">· {muted ? 'muted' : `${Math.round(value * 100)}%`}</span>
        </span>
        {onMute && (
          <button onClick={onMute} className={`btn btn-sm py-0.5 ${muted ? 'btn-blood' : ''}`}>
            {muted ? '🔇 Unmute' : '🔊 Mute'}
          </button>
        )}
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className={`w-full ${muted ? 'opacity-40' : ''}`}
        aria-label={`${label} volume`}
      />
    </div>
  )
}

/** Closes a popup on a press outside `ref` or on Escape. */
function useDismiss(open, ref, setOpen) {
  useEffect(() => {
    if (!open) return
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, ref, setOpen])
}

/**
 * The Start button ("Translatr") and its menu: the site theme on the left, system stuff on the
 * right. Its red badge never clears — opening the menu only makes the number go up.
 */
function StartMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const theme = useGameStore((s) => s.theme)
  const hasPass = useGameStore((s) => !!s.premium.privacy_pass)
  const endingsFound = useGameStore((s) => ENDINGS.filter((e) => s.endings?.[e.id]).length)
  const inDaily = useGameStore((s) => s.mode === 'daily')
  const dark = useGameStore((s) => (s.settings?.colorMode === 'auto' ? colorMode() : s.settings?.colorMode) === 'dark')
  const today = dailyFor()
  const todayGoal = dailyLabels(today).goal
  const s = useGameStore.getState()
  useDismiss(open, ref, setOpen)

  const onStart = () => {
    setOpen((o) => !o)
    s.bumpPhantom('start')
    sfx('ping')
  }

  // Theme picks keep the menu open, so you can flick through them.
  const pickTheme = (id, e) => {
    if (id === theme) return
    const r = e.currentTarget.getBoundingClientRect()
    switchTheme(id, () => s.setTheme(id), { x: r.left + 24, y: r.top + r.height / 2 })
  }

  const item = (icon, label, onClick, hint, className = '') => (
    <button
      className={`menu-item ${className}`}
      onClick={() => {
        setOpen(false)
        onClick()
      }}
    >
      <span className="w-6 shrink-0 text-center text-lg">{icon}</span>
      <span className="min-w-0">
        <span className="menu-item-label">{label}</span>
        {hint && <span className="menu-item-hint">{hint}</span>}
      </span>
    </button>
  )

  return (
    <div ref={ref} className="relative shrink-0">
      <button className="start-btn" title="Start" aria-expanded={open} aria-haspopup="menu" onClick={onStart}>
        <span className="start-orb">
          <span className="start-glyph">T</span>
        </span>
        <span className="start-label">Translatr</span>
        <PhantomBadge id="start" />
      </button>
      {open && (
        <div
          className="modal-card anim-modal-in absolute bottom-12 left-0 grid max-h-[calc(100vh-4.5rem)] w-[min(580px,calc(100vw-12px))] gap-1 overflow-y-auto p-1.5 sm:grid-cols-[1.15fr_1fr]"
          style={{ '--accent': '#3da6e8', transformOrigin: 'bottom left' }}
        >
          <div className="flex flex-col">
            <div className="flex items-center justify-between pr-1">
              <div className="menu-heading">Theme</div>
              <button
                className="btn btn-sm"
                aria-pressed={dark}
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  revealChange(() => s.setSettings({ colorMode: dark ? 'light' : 'dark' }), { x: r.left + r.width / 2, y: r.top + r.height / 2 })
                }}
              >
                {dark ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>
            {THEMES.map((t) => (
              <button key={t.id} className="menu-item" aria-pressed={t.id === theme} onClick={(e) => pickTheme(t.id, e)}>
                <span className="theme-swatch" style={{ '--s1': t.swatch[0], '--s2': t.swatch[1], '--s3': t.swatch[2] }} />
                <span className="min-w-0 flex-1">
                  <span className="menu-item-label">{t.name}</span>
                  <span className="menu-item-hint">{t.blurb}</span>
                </span>
                {t.id === theme && <span className="font-bold">✓</span>}
              </button>
            ))}
            {/* Pinned to the menu's bottom-left corner. */}
            <div className="mt-auto border-t border-ink/10 pt-1">
              {item('⚙️', 'Control Panel', s.openSettings, 'Language, text size, sound, save codes')}
              {item('🗕', 'Collapse all', s.collapseAll, 'Everything to the taskbar. The cat too.')}
              {item('💥', 'Reset all', s.askResetAll, 'Wipe everything and start over. No refunds.', 'menu-item-danger')}
            </div>
          </div>
          <div className="sm:border-l sm:border-ink/10 sm:pl-1">
            <div className="menu-heading">TRANSLATR™ Start</div>
            {item('🗗', 'Restore all', s.restoreAllWindows, 'Bring back everything you minimized')}
            {item('↺', 'Reset window layout', s.resetLayout, 'Windows, the cat and DoomFeed™ back home')}
            {item('🏁', `Endings (${endingsFound}/${ENDINGS.length})`, s.openEndings, 'Eight ways out. Some are worse.')}
            {item('🕹️', 'Arcade', () => s.openArcade(), 'DOOMSCROLL.EXE, Mine$weeper, Solitaire and Snake. Monetized.')}
            {item('🎁', 'Unwrapped', s.openUnwrapped, 'Your year, in 79 uncomfortable stats')}
            {inDaily
              ? item('↩', 'Leave the Daily Challenge', s.leaveDaily, 'Back to your parked game')
              : item('📅', `Daily Challenge #${today.number}`, () => confirmDaily(s, today), `${todayGoal.icon} ${todayGoal.label}`)}
            {item('🍪', 'Cookie preferences', s.openPrivacy, hasPass ? 'Privacy Pass active: you may Reject All' : 'Change your mind (you can’t, really)')}
            {item('📖', 'Tutorial', s.openTutorial, 'Watch someone not care, again')}
            {item('🔥', 'Daily rewards', s.openDaily, 'Protect your streak. Your precious streak.')}
            {item('⭐', 'Start Menu Premium', () => s.toast('Start Menu Premium is $4.99/mo. It adds a second, identical Start menu.', 'info'), 'Unlock 0 extra features')}
            {item('⏻', 'Shut down', s.openShutdown, 'Only with every window closed. Good luck.')}
          </div>
        </div>
      )}
    </div>
  )
}

const TICKER_PX_PER_SECOND = 70 // a steady reading speed, however long the tips are
const TIPS_PER_LAP = 6
const STILL_TIP_MS = 12_000 // reduced motion: one tip at a time, swapped this often

/**
 * The taskbar's endless useless tips (data/tips.js): a shuffled handful at a time, scrolling at a
 * steady speed. Two laps sit side by side; when the first has scrolled past, the second takes its
 * place and a fresh one queues up behind it, so the text never jumps. Hover to pause and read.
 */
function TipTicker() {
  // From the store, not reducedMotion(): this renders before the app applies a changed setting.
  const still = motionReduced(useGameStore((s) => s.settings.motion))
  const draw = () => nextTips(useGameStore.getState(), TIPS_PER_LAP)
  const [laps, setLaps] = useState(() => [draw(), draw()])
  const track = useRef(null)
  const firstLap = useRef(null)
  const scroll = useRef(null)
  const advance = () => setLaps(([, second]) => [second, draw()])

  useLayoutEffect(() => {
    if (still || !track.current?.animate) return
    const distance = firstLap.current.offsetWidth
    // `forwards` holds the end position until this effect re-runs with the next laps, in the same frame.
    const anim = track.current.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-distance}px)` }], {
      duration: (distance / TICKER_PX_PER_SECOND) * 1000,
      easing: 'linear',
      fill: 'forwards',
    })
    anim.onfinish = advance
    scroll.current = anim
    return () => anim.cancel()
    // advance only uses a stable setter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laps, still])
  useEffect(() => {
    if (!still) return
    const t = setInterval(advance, STILL_TIP_MS)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still])

  const lap = (tips, ref) => (
    <span ref={ref} className="flex shrink-0">
      {tips.map((tip, i) => (
        <span key={i} className="flex shrink-0 items-center">
          <span className="px-6">{tip}</span>
          <span aria-hidden="true" className="opacity-50">
            •
          </span>
        </span>
      ))}
    </span>
  )
  return (
    <div
      className="fade-edges mx-1 min-w-0 flex-1 overflow-hidden text-[0.8125rem]"
      onPointerEnter={() => scroll.current?.pause()}
      onPointerLeave={() => scroll.current?.play()}
      title="Useless tips (hover to pause)"
    >
      {still ? (
        <div className="truncate px-2">{laps[0][0]}</div>
      ) : (
        <div ref={track} className="flex w-max whitespace-nowrap">
          {lap(laps[0], firstLap)}
          {lap(laps[1])}
        </div>
      )}
    </div>
  )
}

/** Starting a daily parks the current game, so say so first. */
function confirmDaily(s, cfg) {
  const { goal, mods } = dailyLabels(cfg)
  s.showModal({
    tone: 'good',
    sfx: 'uac',
    title: `📅 Daily Challenge #${cfg.number}`,
    body: `Goal: ${goal.label}. Modifiers: ${mods.map((m) => m.label).join(' and ')}. Everyone gets the same luck today. Your current game is parked and comes right back when you leave the daily (Start menu → Leave).`,
    confirmLabel: 'Start the daily',
    cancelLabel: 'Not now',
    onConfirm: s.startDaily,
  })
}

/** The cat's taskbar icon is the cat itself, in whatever mood it's in. */
function CatToggleIcon() {
  return <RealCat mood={useCatMood()} size={26} round title="Sir Scratchington" />
}

/** The only way into the Hall of Shame: a trophy in the tray, with the unlock count on it. */
function TrophyButton() {
  const count = useGameStore((s) => Object.keys(s.achievements).length)
  const open = useGameStore((s) => s.trophiesOpen)
  return (
    <button
      className={`task-btn relative px-2 text-lg ${open ? 'task-btn-on' : ''}`}
      title="Hall of Shame (achievements)"
      aria-label={`Achievements: ${count} unlocked`}
      aria-pressed={open}
      onClick={() => useGameStore.getState()[open ? 'closeTrophies' : 'openTrophies']()}
    >
      🏆
      <span className="trophy-count">{count}</span>
    </button>
  )
}

/** Taskbar button that shows/hides a docked widget; lit like a running Win7 app while open. */
function WidgetToggle({ id, icon, label }) {
  const open = useGameStore((s) => !s.layout[id].collapsed)
  const setDock = useGameStore((s) => s.setDock)
  return (
    <button
      className={`task-btn text-xl ${open ? 'task-btn-on' : ''}`}
      title={`${open ? 'Minimize' : 'Show'} ${label}`}
      aria-pressed={open}
      onClick={() => setDock(id, { collapsed: open })}
    >
      {icon}
    </button>
  )
}

/** Restores a minimized window, which grows out of the taskbar element that was clicked. */
function restoreFrom(id, el) {
  setRestoreOrigin(id, el.getBoundingClientRect())
  useGameStore.getState().restoreWindow(id)
}

// Quick-launch icons: jump to a window (restoring it first if it's minimized).
const PINNED = ['translator', 'mine', 'casino', 'loot', 'mail', 'loans', 'store']

function PinnedButton({ id }) {
  const isMinimized = useGameStore((s) => s.layout.minimized.includes(id))
  const unread = useGameStore((s) => (id === 'mail' ? s.mail.filter((m) => !m.read && mailFolderOf(m) === 'inbox').length : 0))
  const { icon, title } = WINDOW_META[id]
  const isStore = id === 'store'
  return (
    <button
      className={`task-btn relative text-xl ${isMinimized ? 'task-btn-minimized' : ''}`}
      title={isMinimized ? `${title} (minimized) — click to restore` : title}
      onClick={(e) => {
        // The store's badge "clears" by growing. Every visit makes it worse.
        if (isStore) {
          useGameStore.getState().bumpPhantom('store')
          sfx('ping')
        }
        if (isMinimized) restoreFrom(id, e.currentTarget)
        else focusWindow(id)
      }}
    >
      {icon}
      {isStore && <PhantomBadge id="store" />}
      {unread > 0 && (
        <span className="phantom-badge" aria-label={`${unread} unread`}>
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}

const TASK_SLOT = 42 // px per icon-only task button (38px + 4px gap)
const STACK_SLOT = 46 // px for the 🗗 stack button holding the overflow (and its gap)

/**
 * Win7-style task buttons for minimized windows. They shrink (label first, then down to the
 * icon) as more windows pile up; whatever still doesn't fit collapses into a jump list.
 */
function TaskWindows({ width }) {
  const ids = useGameStore(useShallow((s) => s.layout.minimized.filter((id) => isWindowAvailable(s, id))))
  if (!ids.length) return null
  // The ticker keeps its margins (8px) and the gap before it (4px) even when squeezed to nothing.
  const room = width - 12 + 4
  const overflow = ids.length * TASK_SLOT > room
  const inline = overflow ? ids.slice(0, Math.max(0, Math.floor((room - STACK_SLOT) / TASK_SLOT))) : ids
  return (
    <div className="flex min-w-0 shrink items-center gap-1">
      {inline.map((id) => (
        <button
          key={id}
          data-task-window={id}
          className="task-window"
          title={`${WINDOW_META[id].title} — click to restore`}
          onClick={(e) => restoreFrom(id, e.currentTarget)}
        >
          <span className="shrink-0 text-lg leading-none">{WINDOW_META[id].icon}</span>
          <span className="task-window-label">{WINDOW_META[id].title}</span>
        </button>
      ))}
      {overflow && <TaskOverflow ids={ids.slice(inline.length)} />}
    </div>
  )
}

/** The 🗗 stack for task buttons that do not fit, with a jump list to restore them. */
function TaskOverflow({ ids }) {
  const [open, setOpen] = useState(false)
  const [left, setLeft] = useState(8)
  const ref = useRef(null)
  const btnRef = useRef(null)
  useDismiss(open, ref, setOpen)

  const toggle = () => {
    const r = btnRef.current.getBoundingClientRect()
    setLeft(Math.max(8, Math.min(r.left, window.innerWidth - 248)))
    setOpen((o) => !o)
  }

  return (
    <div ref={ref} className="shrink-0">
      <button
        ref={btnRef}
        data-task-overflow
        className="task-window task-window-stack"
        title={`${ids.length} more minimized window${ids.length === 1 ? '' : 's'}`}
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="text-base leading-none">🗗</span>
        <b className="text-xs">{ids.length}</b>
      </button>
      {open && (
        <div className="modal-card anim-modal-in fixed w-60 p-1.5 text-ink" style={{ '--accent': '#3da6e8', left, bottom: TASKBAR_H + 6 }}>
          <div className="menu-heading pb-1">Minimized windows</div>
          {ids.map((id) => (
            <button
              key={id}
              className="menu-item py-1.5"
              onClick={() => {
                setOpen(false)
                restoreFrom(id, btnRef.current)
              }}
            >
              <span className="text-lg">{WINDOW_META[id].icon}</span>
              <span className="menu-item-label truncate">{WINDOW_META[id].title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Windows 7-style taskbar: Start orb, pinned windows, tips ticker, tray (music, sound, volume, clock). */
export function Taskbar() {
  const minute = useGameStore((s) => Math.floor(s.clock / 60_000)) // the clock shows hours and minutes
  const audio = useGameStore((s) => s.audio)
  const setAudio = useGameStore((s) => s.setAudio)
  const toggleDesktop = useGameStore((s) => s.toggleDesktop)
  const [musicStatus, setMusicStatus] = useState('idle')
  const [volumeOpen, setVolumeOpen] = useState(false)
  useEffect(() => onMusicStatus(setMusicStatus), [])

  // The stretch between the widget toggles and the tray holds the task buttons, then the tips
  // ticker. Its width doesn't depend on its content, so it can decide how many buttons fit.
  const areaRef = useRef(null)
  const [areaW, setAreaW] = useState(0)
  useLayoutEffect(() => {
    const el = areaRef.current
    const measure = () => {
      const cs = getComputedStyle(el)
      setAreaW(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))
    }
    measure() // before the first paint, not whenever the observer gets round to it
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const now = new Date(minute * 60_000)
  const playing = musicStatus === 'playing' && audio.music
  const musicLabel =
    musicStatus === 'rendering' ? 'Composing hold music…' : musicStatus === 'playing' ? TRACK_TITLE : 'Click anywhere to start the hold music'

  return (
    // Above floating ads (≤190) so the Start menu stays usable; below the Trap Ad and modals.
    <div className="taskbar fixed inset-x-0 bottom-0 z-[195] flex h-[44px] items-center gap-1.5 pl-1.5">
      <StartMenu />

      <div className="hidden items-center gap-0.5 md:flex">
        {PINNED.map((id) => (
          <PinnedButton key={id} id={id} />
        ))}
      </div>
      <div className="tray-sep flex items-center gap-0.5 pl-1">
        <WidgetToggle id="doom" icon="🔥" label="DoomFeed™" />
        <WidgetToggle id="cat" icon={<CatToggleIcon />} label="Sir Scratchington" />
      </div>

      <div ref={areaRef} className="tray-sep flex h-full min-w-0 flex-1 items-center gap-1 pl-1">
        <TaskWindows width={areaW} />
        <TipTicker />
      </div>

      {/* System tray */}
      <div className="tray-sep relative flex h-full shrink-0 items-center gap-0.5 pl-1">
        <MuteButton
          on={audio.music}
          onToggle={() => setAudio({ music: !audio.music })}
          label="Music"
          icon={
            <>
              <span className="text-sm sm:hidden">🎵</span>
              <span className={`eq max-sm:hidden ${playing ? '' : 'paused'}`}>
                <i />
                <i />
                <i />
                <i />
              </span>
            </>
          }
          title={audio.music ? `Mute music — ${musicLabel}` : 'Unmute music'}
        />
        <MuteButton on={audio.sfx} onToggle={() => setAudio({ sfx: !audio.sfx })} label="SFX" icon={<span className="text-sm">🔊</span>} title={audio.sfx ? 'Mute sound effects' : 'Unmute sound effects'} />
        {/* phones: the hardware volume keys will have to do; the trophy needs the room */}
        <button className="task-btn px-2 text-sm max-sm:hidden" title="Volume mixer" onClick={() => setVolumeOpen((o) => !o)}>
          🎚️
        </button>
        <TrophyButton />
        {volumeOpen && (
          <div className="modal-card anim-modal-in absolute bottom-12 right-10 w-64 p-3 text-ink">
            <div className="mb-2 flex items-center justify-between">
              <span className="menu-heading p-0 text-sm">Volume Mixer</span>
              <button onClick={() => setVolumeOpen(false)} className="text-ink/40 hover:text-ink" aria-label="Close volume mixer">
                ✕
              </button>
            </div>
            <VolumeRow label="Master" value={audio.volume} onChange={(v) => setAudio({ volume: v })} />
            <VolumeRow label="Music" value={audio.musicVolume ?? 1} muted={!audio.music} onMute={() => setAudio({ music: !audio.music })} onChange={(v) => setAudio({ musicVolume: v })} />
            <VolumeRow label="SFX" value={audio.sfxVolume ?? 1} muted={!audio.sfx} onMute={() => setAudio({ sfx: !audio.sfx })} onChange={(v) => setAudio({ sfxVolume: v })} />
            <div className="mt-2 truncate border-t border-ink/10 pt-2 text-[0.6875rem] text-ink/60" title={musicLabel}>
              {playing ? '♪ ' : ''}
              {musicLabel}
            </div>
          </div>
        )}
        <div className="px-2 text-center text-[0.6875rem] leading-tight" title={now.toLocaleString()}>
          <div>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
          <div className="hidden sm:block">{now.toLocaleDateString()}</div>
        </div>
        <button
          className="show-desktop"
          title="Show desktop (click again to bring the windows back)"
          aria-label="Show desktop"
          onClick={toggleDesktop}
        />
      </div>
    </div>
  )
}

/** Visible only with ?debug in the URL. */
export function DebugPanel() {
  if (!new URLSearchParams(window.location.search).has('debug')) return null
  window.game = useGameStore // poke at state from the devtools console
  const s = useGameStore.getState()
  const btn = 'rounded-md border border-toxic/30 bg-inset/60 px-2 py-0.5 text-[0.6875rem] text-toxic hover:bg-toxic/10'
  const actions = [
    ['+$10k', () => s.addMoney(10_000)],
    ['+$1M', () => s.addMoney(1_000_000)],
    ['ad', () => s.spawnAd('normal')],
    ['slippery ad', () => s.spawnAd('slippery')],
    ['trap ad', () => s.spawnAd('trap')],
    ['dvd ad', () => s.spawnAd('normal', true)],
    ['dvd → corner', () => s.spawnAd('normal', true, { aim: 'corner' })],
    ['dvd slippery', () => s.spawnAd('slippery', true)],
    ['dvd trap', () => s.spawnAd('trap', true)],
    ['+13 gems', () => useGameStore.setState((st) => ({ gems: st.gems + 13 }))],
    ['streak: claimed yday', () => useGameStore.setState((st) => ({ streak: { ...st.streak, count: Math.max(1, st.streak.count), lastDay: new Date(Date.now() - 864e5).toLocaleDateString('sv') } }))],
    ['streak: break', () => useGameStore.setState((st) => ({ streak: { ...st.streak, count: Math.max(3, st.streak.count), lastDay: '2000-01-01' } }))],
    ['daily popup', () => s.openDaily()],
    ['AFK now', () => s.setAfk(true)],
    ['store visits +10', () => useGameStore.setState((st) => ({ storeVisits: (st.storeVisits ?? 0) + 10 }))],
    ['show desktop', () => s.toggleDesktop()],
    ['relic', () => s.buyPremium('relic_pack')],
    ['+10 skill pts', () => useGameStore.setState((st) => ({ skillPoints: st.skillPoints + 10 }))],
    ['starve cat', () => useGameStore.setState({ cat: { hunger: 1, fun: 50, love: 50 } })],
    ['audit', () => s.forceAudit()],
    ['captcha', () => s.requestCaptcha('roulette', () => s.toast('Debug CAPTCHA passed', 'good'))],
    ['drain stamina', () => useGameStore.setState({ stamina: 0, staminaTs: Date.now() })],
    ['clear lockouts', () => useGameStore.setState({ lockouts: {} })],
    ['loan $5k', () => s.takeLoan(5_000)],
    ['repo now', () => useGameStore.setState((st) => (st.loan ? { loan: { ...st.loan, debt: st.loan.principal * 5, lastAccrual: Date.now() - 15_000 } } : {}))],
    ['ToS', () => useGameStore.setState({ nextTosAt: 0 })],
    ['FOMO', () => useGameStore.setState({ nextFomoAt: 0 })],
    ['surge ×3', () => useGameStore.setState((st) => ({ surge: 3, surgeHistory: [...st.surgeHistory, 3].slice(-24) }))],
    ['event now', () => useGameStore.setState({ event: null, nextEventAt: 0 })],
    ['end event', () => useGameStore.setState((st) => (st.event ? { event: { ...st.event, endsAt: Date.now() } } : {}))],
    ['spam now', () => useGameStore.setState({ nextSpamAt: 0 })],
    ['news now', () => useGameStore.setState({ nextNewsAt: 0 })],
    ['+$1Qi', () => s.addMoney(1e18)],
    ['×1000 money', () => useGameStore.setState((st) => ({ money: Math.max(1000, st.money * 1000) }))],
    ['underwater', () => useGameStore.setState((st) => ({ loan: { principal: 1e3, debt: st.money + 5e3, lastAccrual: Date.now() } }))],
    ['grass ×49', () => useGameStore.setState({ grassStreak: 49 })],
    ['pity 1990', () => useGameStore.setState({ pity: 1990 })],
    ['play +1h', () => useGameStore.setState((st) => ({ stats: { ...st.stats, playSeconds: (st.stats.playSeconds ?? 0) + 3600 } }))],
    ['contract now', () => useGameStore.setState({ nextContractAt: 0 })],
    ['dark/light', () => s.setSettings({ colorMode: colorMode() === 'dark' ? 'light' : 'dark' })],
    ...ENDINGS.map((e) => e.id).map((id) => [`end: ${id}`, () => s.triggerEnding(id)]),
  ]
  return (
    <div className="fixed right-2 top-1/2 z-[450] flex max-w-[220px] -translate-y-1/2 flex-wrap gap-1 rounded-xl border border-toxic/30 bg-inset/85 p-2 font-mono backdrop-blur">
      <b className="w-full text-[0.6875rem] text-toxic">🐛 DEBUG</b>
      {actions.map(([label, fn]) => (
        <button key={label} className={btn} onClick={fn}>
          {label}
        </button>
      ))}
    </div>
  )
}
