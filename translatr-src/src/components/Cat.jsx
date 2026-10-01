import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore, activeMods, catIsAngry, getCatFoodCost, isUnderwater } from '../store/useGameStore'
import { CAT, CAT_LINES } from '../data/gameData'
import { money } from '../lib/format'
import { sfx } from '../lib/audio/engine'
import { dockOrigin, useCollapseAnimation } from '../lib/hooks'
import Docked from './Docked'
import RealCat from './RealCat'

const NEEDS = [
  ['hunger', '🍗 Hunger'],
  ['fun', '🧶 Fun'],
  ['love', '💕 Love'],
]
const LINE_EVERY_MS = 6000
const EATING_MS = 2600 // how long the "eating" clip plays after a successful feed

function moodOf(cat, angry) {
  if (angry) return 'angry'
  const lowest = NEEDS.map(([k]) => k).sort((a, b) => cat[a] - cat[b])[0]
  if (cat[lowest] >= CAT.warnAt) return 'happy'
  return { hunger: 'hungry', fun: 'bored', love: 'lonely' }[lowest]
}

/** The cat's current mood (also used by the taskbar button). */
export function useCatMood() {
  // The mood itself, not the needs: they drain every second, the mood changes rarely.
  return useGameStore((s) => moodOf(s.cat, catIsAngry(s)))
}

/** A needy cat, docked to any screen edge (drag it by its title bar). Needs decay in the game loop. */
export default function Cat() {
  return (
    <Docked id="cat" gap={8} z={58}>
      {({ handleProps }) => <CatGadget handleProps={handleProps} />}
    </Docked>
  )
}

/** Cat food costs 1% of your wallet, so the price moves every tick: it re-renders alone. */
function FoodPrice({ short }) {
  const cost = useGameStore(getCatFoodCost)
  return short ? `need ${money(cost)}` : money(cost)
}

function CatGadget({ handleProps }) {
  // Whole numbers are all the bars show; fractions would re-render every tick.
  const cat = useGameStore(useShallow((s) => ({ hunger: Math.ceil(s.cat.hunger), fun: Math.ceil(s.cat.fun), love: Math.ceil(s.cat.love) })))
  const angry = useGameStore(catIsAngry)
  const scratchIn = useGameStore((s) => s.catScratchIn)
  const canAffordFood = useGameStore((s) => s.money >= getCatFoodCost(s))
  const catCare = useGameStore((s) => !!s.premium.catcare)
  const fatal = useGameStore(isUnderwater)
  const vest = useGameStore((s) => !!activeMods(s).scratchProof) // Cat-Proof Vest
  // Speech changes every 6s, derived from the shared clock (no extra interval).
  const lineSlot = useGameStore((s) => Math.floor(s.clock / LINE_EVERY_MS))
  const { feedCat, playCat, petCat, setDock } = useGameStore.getState()
  // Minimized state lives with the dock position (starts collapsed on phones; it still gets hungry).
  // The panel shrinks into its corner before the orb appears (and the other way round).
  const dock = useGameStore((s) => s.layout.cat)
  const root = useRef(null)
  const minimized = useCollapseAnimation(dock.collapsed, root, dockOrigin(dock))
  const setMinimized = (collapsed) => setDock('cat', { collapsed })
  const [reaction, setReaction] = useState(null)
  const [eating, setEating] = useState(false)
  const reactionTimer = useRef(null)
  const eatingTimer = useRef(null)
  const mood = moodOf(cat, angry)
  const lines = CAT_LINES[mood]
  const line = lines[lineSlot % lines.length]
  // Angry beats everything; otherwise a fresh meal plays the eating clip for a moment.
  const photo = mood !== 'angry' && eating ? 'eating' : mood

  useEffect(
    () => () => {
      clearTimeout(reactionTimer.current)
      clearTimeout(eatingTimer.current)
    },
    [],
  )

  /** Runs a care action; `fn` returns false on failure (broke / cat said no). */
  const act = (fn, emoji, okSound, failSound, onOk) => {
    const ok = fn() !== false
    sfx(ok ? okSound : failSound)
    if (ok) onOk?.()
    setReaction({ emoji: ok ? emoji : '💸', id: Date.now() })
    clearTimeout(reactionTimer.current)
    reactionTimer.current = setTimeout(() => setReaction(null), 800)
  }
  const startEating = () => {
    setEating(true)
    clearTimeout(eatingTimer.current)
    eatingTimer.current = setTimeout(() => setEating(false), EATING_MS)
  }

  const needsAttention = mood !== 'happy'
  const accent = angry ? '#d32f2f' : needsAttention ? '#e0a21a' : '#3da6e8'

  // Minimized, the cat lives in the taskbar (its button there shows its mood and fidgets when it needs you).
  if (minimized) return null

  return (
    <div
      ref={root}
      className={`gadget w-72 p-3 ${angry ? 'animate-shake' : ''}`}
      style={{ '--mood': accent }}
    >
      <div {...handleProps} className="-mx-1 -mt-1 mb-2 flex select-none items-center justify-between rounded px-1 pt-1" title="Drag to dock the cat to any edge">
        <span className="gadget-title text-sm font-semibold">
          <span className="doom-grip mr-1" aria-hidden="true">⠿</span>
          {CAT.name}
          {catCare && <span className="badge ml-2" style={{ '--accent': '#3da6e8' }}>CatCare+</span>}
        </span>
        <button data-no-drag onClick={() => setMinimized(true)} className="caption-btn rounded-sm" title="Minimize (it still gets hungry)">
          ▁
        </button>
      </div>

      <div className="mb-3 flex items-end gap-3">
        <div className={`relative shrink-0 drop-shadow-[0_4px_6px_rgba(0,30,70,.35)] ${angry ? 'animate-wiggle' : ''}`}>
          <RealCat mood={photo} size={88} />
          {reaction && (
            <span key={reaction.id} className="absolute -top-2 left-1/2 animate-float-up text-2xl">
              {reaction.emoji}
            </span>
          )}
        </div>
        <div
          key={line}
          className={`balloon relative mb-3 flex-1 animate-fade-up px-3 py-2 text-xs ${angry ? 'border-blood/60 text-blood' : ''}`}
        >
          {line}
        </div>
      </div>

      {angry && (
        <div className="mb-3 animate-flash alert-pill rounded border border-blood/60 px-2 py-1.5 text-center text-[0.6875rem] font-bold text-blood">
          Scratching in {Math.max(1, Math.ceil(scratchIn ?? CAT.scratchEverySec))}s ·{' '}
          {fatal
            ? '💀 YOU OWE VINNIE MORE THAN YOU HAVE: THIS SCRATCH IS FATAL'
            : vest
              ? 'money ÷2 · the vest protects your items'
              : `money ÷2 · ${CAT.shredEquipped} equipped + ${CAT.shredBackpack} backpack items shredded`}
        </div>
      )}

      <div className="mb-3 space-y-2 note-panel rounded-md p-2">
        {NEEDS.map(([key, label]) => {
          const v = cat[key]
          const bar = v <= 0 ? '#d32f2f' : v < CAT.warnAt ? '#f0a800' : '#3cb521'
          return (
            <div key={key} className="text-[0.6875rem]">
              <div className="mb-0.5 flex justify-between text-ink/70">
                <span>{label}</span>
                <span className={`font-mono ${v < CAT.warnAt ? 'font-bold text-blood' : ''}`}>{Math.ceil(v)}%</span>
              </div>
              <div className="meter h-2" style={{ '--bar': bar }}>
                <span style={{ width: `${v}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => act(feedCat, '🐟', 'munch', 'meow', startEating)}
          className={`btn btn-sm flex-col gap-0 ${canAffordFood ? '' : 'opacity-60'}`}
          title={canAffordFood ? 'Feed the cat' : "You can't afford cat food"}
        >
          <span>🐟 Feed</span>
          <span className={`font-mono text-[0.625rem] ${canAffordFood ? 'text-ink/50' : 'font-bold text-blood'}`}>
            <FoodPrice short={!canAffordFood} />
          </span>
        </button>
        <button onClick={() => act(playCat, '🧶', 'boing', 'boing')} className="btn btn-sm flex-col gap-0">
          <span>🧶 Play</span>
          <span className="font-mono text-[0.625rem] text-ink/50">free</span>
        </button>
        <button onClick={() => act(petCat, '💕', 'purr', 'hiss')} className="btn btn-sm flex-col gap-0">
          <span>✋ Pet</span>
          <span className="font-mono text-[0.625rem] text-ink/50">90% safe</span>
        </button>
      </div>
    </div>
  )
}

/** Claw marks torn across the whole screen for each scratch (expired by the game loop). */
export function ScratchMarks() {
  const scratches = useGameStore((s) => s.scratches)
  return scratches.map((sc) => (
    <div
      key={sc.id}
      className="pointer-events-none fixed z-[350] animate-[scratch-fade_4s_ease-out_forwards]"
      style={{ left: `${sc.x}vw`, top: `${sc.y}vh`, transform: `translate(-50%, -50%) rotate(${sc.rotate}deg)` }}
    >
      <svg width="420" height="320" viewBox="0 0 420 320" className="drop-shadow-[0_0_10px_rgba(255,59,92,.6)]">
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M ${40 + i * 70} 20 Q ${110 + i * 70} 160 ${90 + i * 70} 300`}
            stroke="#7f1d1d"
            strokeWidth={14 - i}
            strokeLinecap="round"
            fill="none"
            className="animate-[scratch-draw_0.35s_ease-out_forwards]"
            style={{ strokeDasharray: 400, strokeDashoffset: 400, animationDelay: `${i * 60}ms` }}
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <path
            key={`hl-${i}`}
            d={`M ${44 + i * 70} 26 Q ${112 + i * 70} 160 ${92 + i * 70} 292`}
            stroke="#ff8fa3"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className="animate-[scratch-draw_0.35s_ease-out_forwards]"
            style={{ strokeDasharray: 400, strokeDashoffset: 400, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </svg>
    </div>
  ))
}
