import { createPortal } from 'react-dom'
import { useGameStore } from '../../store/useGameStore'

/**
 * TOUCHGRASS.EXE in the Arcade: nikstil.com/touchgrass/ full screen over the game (it keeps its
 * own save, the same one as on nikstil.com). TRANSLATR™ stays paused underneath.
 */
export default function TouchGrass() {
  const close = useGameStore((s) => s.closeArcade)
  return createPortal(
    <div className="fixed inset-0 z-[600] flex flex-col bg-[#2c6b2f]" role="dialog" aria-modal="true" aria-label="TOUCHGRASS.EXE">
      <div className="flex items-center gap-2 bg-[#7a5230] px-3 py-1.5 text-sm font-bold text-[#fff7e0]">
        <span aria-hidden="true">🌱</span>
        <span className="flex-1">TOUCHGRASS.EXE · the Scrollers want your Wi-Fi</span>
        <button className="arcade-btn arcade-btn-sm" onClick={() => close()}>
          ◀ Back to the Arcade
        </button>
      </div>
      <iframe className="min-h-0 w-full flex-1 border-0" src="/touchgrass/?embed" title="TOUCHGRASS.EXE" allow="fullscreen; autoplay" />
    </div>,
    document.body,
  )
}
