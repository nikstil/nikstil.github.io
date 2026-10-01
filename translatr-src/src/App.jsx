import Header from './components/Header'
import TaxReceipt from './components/TaxReceipt'
import AchievementsModal, { AchievementPopup } from './components/Achievements'
import { CheckoutModal } from './components/PremiumStore'
import Cat, { ScratchMarks } from './components/Cat'
import AdLayer from './components/Ads'
import AuditModal from './components/AuditModal'
import CaptchaModal from './components/Captcha'
import TosModal from './components/TosModal'
import FomoFeed from './components/FomoFeed'
import { BigModal, DebugPanel, ResetScreen, Taskbar, Toasts } from './components/Overlays'
import Wallpaper from './components/Wallpaper'
import DoomFeed, { DOOM_WIDTH } from './components/DoomFeed'
import WindowGrid from './components/WindowGrid'
import { Paperclip, Snail } from './components/Toys'
import Nas from './components/Nas'
import { Fly, RogueBriefing, RogueLooks } from './components/Rogue'
import DataHarvester from './components/DataHarvester'
import DailyRewards from './components/DailyRewards'
import AfkBanner from './components/AfkBanner'
import EventBanner from './components/EventBanner'
import SpeedrunHud from './components/SpeedrunHud'
import { EndingsModal, ShutdownDialog } from './components/Endings'
import { DailyResult } from './components/Daily'
import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useGameLoop } from './lib/hooks'
import { useViewport } from './lib/useViewport'
import { useGameStore } from './store/useGameStore'
import { startAudio } from './lib/audio/director'
import { applyTheme } from './lib/theme'
import { applySettings, graphicsMode } from './lib/settings'
import { watchFrameRate } from './lib/perf'
import { arcadeInset } from './lib/dock'
import { startTextLayer } from './lib/emojiTheme'

// Loaded on demand: most sessions never need them (or need them once).
const TitleScreen = lazy(() => import('./components/TitleScreen'))
const PrivacyWall = lazy(() => import('./components/PrivacyWall'))
const Tutorial = lazy(() => import('./components/Tutorial'))
const CancelFlow = lazy(() => import('./components/CancelFlow'))
const EndingScreen = lazy(() => import('./components/EndingScreen'))
const Unwrapped = lazy(() => import('./components/Unwrapped'))
const ControlPanel = lazy(() => import('./components/ControlPanel'))
const Shooter = lazy(() => import('./components/Shooter'))
const Arcade = lazy(() => import('./components/Arcade'))

const MIN_CONTENT_WIDTH = 800 // only reserve room for a side-docked DoomFeed™ if the game still fits beside it

/**
 * Mounts a lazily-loaded component the first time `when(state)` is true, then keeps it mounted
 * (so its own open/close animations keep working).
 */
function Deferred({ when, children }) {
  const active = useGameStore(when)
  const [armed, setArmed] = useState(active)
  if (active && !armed) setArmed(true)
  return armed ? <Suspense fallback={null}>{children}</Suspense> : null
}

export default function App() {
  useGameLoop()
  // Sound: store-driven SFX, hold music, and gesture unlock. Cleaned up on unmount.
  useEffect(() => startAudio(useGameStore), [])
  // Keep <html data-theme>, the cursor set, every emoji on the page and the interface language in
  // step with the saved theme and settings (other tabs included). Layout effects: the swap lands
  // before the first paint.
  const theme = useGameStore((s) => s.theme)
  const language = useGameStore((s) => s.settings.language ?? 'en')
  const textLayer = useRef(null)
  useLayoutEffect(() => {
    const st = useGameStore.getState()
    const controller = startTextLayer({ theme: st.theme, language: st.settings.language ?? 'en' })
    textLayer.current = controller
    return () => controller.stop()
  }, [])
  useLayoutEffect(() => {
    applyTheme(theme)
    textLayer.current?.setTheme(theme)
  }, [theme])
  useLayoutEffect(() => textLayer.current?.setLanguage(language), [language])
  // Reduced motion and text size.
  const settings = useGameStore((s) => s.settings)
  useLayoutEffect(() => applySettings(settings), [settings])
  // Graphics "Auto": if this device can't keep up with the full effects, switch to Lite (once).
  const watchGraphics = (settings.graphics ?? 'auto') === 'auto' && graphicsMode(settings) === 'full'
  useEffect(() => {
    if (!watchGraphics) return
    return watchFrameRate(({ fps }) => {
      const s = useGameStore.getState()
      s.setSettings({ slowDevice: true })
      s.toast(`💡 TRANSLATR™ has detected that your device is running slowly (${fps} fps). Graphics have been changed to Lite, like Windows 7 Basic. Control Panel → Display to change it.`, 'info')
    })
  }, [watchGraphics])

  // Touching anything but the grass button breaks a grass streak (the Touched Grass ending).
  useEffect(() => {
    const onInput = (e) => {
      const s = useGameStore.getState()
      if (s.grassStreak && !e.target?.closest?.('[data-grass]')) s.breakGrassStreak()
    }
    window.addEventListener('pointerdown', onInput, true)
    window.addEventListener('keydown', onInput, true)
    return () => {
      window.removeEventListener('pointerdown', onInput, true)
      window.removeEventListener('keydown', onInput, true)
    }
  }, [])

  const doom = useGameStore((s) => s.layout.doom)
  const arcadeOpen = useGameStore((s) => !!s.arcade)
  const vp = useViewport()

  // A side-docked DoomFeed™ and the Arcade sidebar behave like Windows AppBars: the page makes room.
  const arcadeRoom = arcadeInset(vp, arcadeOpen)
  const sideDocked = !doom.collapsed && (doom.edge === 'left' || doom.edge === 'right')
  const reserve = sideDocked && vp.w - arcadeRoom - DOOM_WIDTH >= MIN_CONTENT_WIDTH ? DOOM_WIDTH : 0
  // Toasts, the speedrun timer and other screen-anchored overlays keep clear of the sidebar too.
  useLayoutEffect(() => document.documentElement.style.setProperty('--arcade-room', `${arcadeRoom}px`), [arcadeRoom])

  return (
    <div
      className="app-bg min-h-screen pb-24"
      style={{
        paddingLeft: doom.edge === 'left' ? reserve : 0,
        paddingRight: (doom.edge === 'right' ? reserve : 0) + arcadeRoom,
        transition: 'padding .32s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <Wallpaper />
      <Header />
      {/* Container queries: the layout responds to the space actually available (not the viewport). */}
      <div className="@container">
        <div className="mx-auto max-w-[1680px] px-4 py-6 @min-[1280px]:px-6">
          <EventBanner />
          {/* Every window can be dragged by its title bar and dropped anywhere in this grid. */}
          <WindowGrid />
        </div>
      </div>

      <DoomFeed />
      <Cat />
      <Snail />
      <Nas />
      <RogueLooks />
      <RogueBriefing />
      <Fly />
      <Paperclip />
      <ScratchMarks />
      <AdLayer />
      <TaxReceipt />
      <FomoFeed />
      <SpeedrunHud />
      <CheckoutModal />
      <TosModal />
      <AuditModal />
      <CaptchaModal />
      <ShutdownDialog />
      <DailyResult />
      <BigModal />
      <AchievementsModal />
      <AchievementPopup />
      <Toasts />
      <DebugPanel />
      <Taskbar />
      <DailyRewards />
      <Deferred when={(s) => !!s.cancelFlow}>
        <CancelFlow />
      </Deferred>
      <AfkBanner />
      <Deferred when={(s) => (!!s.mode && (!s.consent || !s.tutorialSeen)) || s.privacyOpen || s.tutorialOpen}>
        <Tutorial />
        <PrivacyWall />
      </Deferred>
      <Deferred when={(s) => !s.mode}>
        <TitleScreen />
      </Deferred>
      <DataHarvester />
      <Deferred when={(s) => !!s.over}>
        <EndingScreen />
      </Deferred>
      <Deferred when={(s) => s.settingsOpen}>
        <ControlPanel />
      </Deferred>
      <Deferred when={(s) => s.unwrappedOpen}>
        <Unwrapped />
      </Deferred>
      <Deferred when={(s) => s.shooterOpen}>
        <Shooter />
      </Deferred>
      <Deferred when={(s) => !!s.arcade}>
        <Arcade />
      </Deferred>
      <EndingsModal />
      <ResetScreen />
    </div>
  )
}
