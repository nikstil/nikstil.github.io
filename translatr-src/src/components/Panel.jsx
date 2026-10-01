import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { useWindowHandle } from '../lib/windowContext'

const MAXIMIZE_LINES = [
  'Maximizing windows requires TRANSLATR™ Ultimate ($199).',
  'This window is already at its maximum. Emotionally.',
  'Maximize is a Premium Window Feature™.',
]
const CLOSE_LINES = [
  'This window cannot be closed. It is load-bearing.',
  'Are you sure? (You cannot be sure.)',
  'Closing windows is disabled to protect your engagement metrics.',
  'Nice try.',
]
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

/**
 * A Windows Aero window: tinted glass frame (tint = accent), glowing title,
 * caption buttons (minimize works; maximize/close are, naturally, paywalled).
 * Inside the WindowGrid, minimize sends the window to the taskbar; elsewhere it rolls it up.
 */
export default function Panel({ id, title, icon, accent = '#5ea9dd', badge, right, className = '', bodyClassName = 'p-4', children }) {
  const [minimized, setMinimized] = useState(false)
  const toast = (text) => useGameStore.getState().toast(text, 'info')
  // Inside the WindowGrid, the title bar is a drag handle for rearranging windows.
  const handle = useWindowHandle()
  const minimize = () => (handle ? handle.onMinimize() : setMinimized((m) => !m))

  return (
    <section id={id} className={`aero-window scroll-mt-28 ${className}`} style={{ '--accent': accent }}>
      <header
        className={`aero-titlebar ${handle ? 'draggable-titlebar select-none' : ''}`}
        onPointerDown={handle?.onPointerDown}
        style={handle ? { touchAction: 'none' } : undefined}
      >
        {handle && (
          <span className="doom-grip" aria-hidden="true" title="Drag the title bar to move this window">
            ⠿
          </span>
        )}
        <span className="text-base drop-shadow-[0_1px_1px_rgba(0,0,0,.35)]">{icon}</span>
        <h2 className="aero-title min-w-0 flex-1">{title}</h2>
        <div className="flex shrink-0 items-center gap-1.5 self-center">
          {right}
          {badge && <span className="badge">{badge}</span>}
        </div>
        <div className="caption-btns ml-1 shrink-0">
          <button className="caption-btn" title={handle ? 'Minimize to taskbar' : 'Minimize'} aria-label="Minimize" onClick={minimize}>
            ▁
          </button>
          <button className="caption-btn" title="Maximize" onClick={() => toast(pick(MAXIMIZE_LINES))}>
            ☐
          </button>
          <button className="caption-btn close" title="Close" onClick={() => toast(pick(CLOSE_LINES))}>
            ✕
          </button>
        </div>
      </header>
      {!minimized && <div className={`aero-client flex flex-col ${bodyClassName}`}>{children}</div>}
    </section>
  )
}
