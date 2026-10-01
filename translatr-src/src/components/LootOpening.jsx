import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EQUIPPABLES, RELIC } from '../data/gameData'
import { sfx } from '../lib/audio/engine'

const SHAKE_MS = 1400
const BURST_MS = 600

const TRASH_EMOJI = ['🧦', '🧻', '🎟️', '🔩', '🧾', '🪢', '🦶', '🔋', '🏆', '🥄', '🍞', '🎧', '🔑', '🥖', '📜', '📦', '🧽', '🪥']

function hash(str) {
  let h = 0
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

const RARITY = {
  relic: { glow: '#ffcf3f', card: 'border-gold bg-[radial-gradient(circle_at_50%_30%,#ffcf3f55,#1a1405)] shadow-[0_0_26px_-2px_#ffcf3f] text-gold', label: 'MYTHIC' },
  legendary: { glow: '#ff2bd6', card: 'border-magenta/80 bg-[radial-gradient(circle_at_50%_30%,#ff2bd640,#15060f)] shadow-[0_0_20px_-4px_#ff2bd6] text-magenta', label: 'LEGENDARY' },
  epic: { glow: '#39ff14', card: 'border-toxic/70 bg-[radial-gradient(circle_at_50%_30%,#39ff1433,#06140a)] shadow-[0_0_18px_-4px_#39ff14] text-toxic', label: 'EPIC' },
  rare: { glow: '#3de8ff', card: 'border-ice/60 bg-[radial-gradient(circle_at_50%_30%,#3de8ff2e,#051218)] shadow-[0_0_16px_-6px_#3de8ff] text-ice', label: 'RARE' },
  common: { glow: '#cbd5e1', card: 'border-white/30 bg-[radial-gradient(circle_at_50%_30%,#cbd5e126,#0b0f14)] shadow-[0_0_12px_-6px_#cbd5e1] text-[#dbe4ee]', label: 'COMMON' },
  trash: { glow: '#6b7280', card: 'border-white/10 bg-white/[0.03] text-white/40', label: 'TRASH' },
  spoiled: { glow: '#7a5a3a', card: 'border-[#7a5a3a]/60 bg-[radial-gradient(circle_at_50%_30%,#7a5a3a40,#120c07)] text-[#c9a27a]', label: 'SPOILED' },
}

function describe(loot) {
  if (loot.kind === 'relic') return { rarity: 'relic', emoji: RELIC.emoji, name: RELIC.name }
  if (loot.kind === 'equip') {
    const def = EQUIPPABLES[loot.id]
    return { rarity: def.tier ?? 'rare', emoji: def.emoji, name: def.name }
  }
  if (loot.kind === 'spoiled') return { rarity: 'spoiled', emoji: '🐀', name: loot.ate ? `A rat ate your ${loot.ate}` : 'A rat ate it' }
  return { rarity: 'trash', emoji: TRASH_EMOJI[hash(loot.name) % TRASH_EMOJI.length], name: loot.name }
}

/** Full-screen opening: one box shakes (glowing in the best drop's color), bursts, then reveals everything in a grid. */
export default function LootOpening({ results, onClose }) {
  const [phase, setPhase] = useState('shake') // shake → burst → reveal

  useEffect(() => {
    const t1 = setTimeout(() => setPhase((p) => (p === 'shake' ? 'burst' : p)), SHAKE_MS)
    const t2 = setTimeout(() => setPhase('reveal'), SHAKE_MS + BURST_MS)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const items = results.map(describe)
  const order = { relic: 0, legendary: 1, epic: 2, rare: 3, common: 4, trash: 5, spoiled: 6 }
  const best = ['relic', 'legendary', 'epic', 'rare', 'common'].find((r) => items.some((i) => i.rarity === r)) ?? 'trash'

  // Rumble while shaking; one reveal sound when it opens (or when skipped).
  const revealed = useRef(false)
  useEffect(() => {
    if (phase === 'shake') return sfx('rumble')
    if (revealed.current) return
    revealed.current = true
    sfx(best === 'relic' ? 'mythic' : 'reveal')
  }, [phase, best])
  const glow = RARITY[best].glow
  const good = items.filter((i) => i.rarity !== 'trash' && i.rarity !== 'spoiled').length
  const rats = items.filter((i) => i.rarity === 'spoiled').length
  const stagger = Math.min(80, 1600 / items.length)

  // Show the good stuff first, trash last.
  const sorted = [...items].sort((a, b) => order[a.rarity] - order[b.rarity])

  // Portal so no transformed ancestor can break position:fixed.
  return createPortal(
    <div className="anim-backdrop-in fixed inset-0 z-[240] flex flex-col items-center justify-center overflow-hidden bg-black/85 p-4 font-display backdrop-blur-md">
      <h2 className="mb-4 text-center text-3xl font-bold tracking-wide text-white">
        <span className="label mb-1 block text-center">Loot acquisition in progress</span>
        {phase === 'reveal'
          ? `You opened ${results.length} box${results.length > 1 ? 'es' : ''}!`
          : `Opening ${results.length} box${results.length > 1 ? 'es' : ''}…`}
      </h2>

      {/* The single box */}
      <div className={`relative flex items-center justify-center transition-all duration-500 ${phase === 'reveal' ? 'h-24 scale-50' : 'h-72'}`}>
        {phase !== 'shake' && (
          <div
            className="absolute h-[34rem] w-[34rem] animate-rays rounded-full opacity-60"
            style={{ background: `repeating-conic-gradient(${glow}66 0deg 10deg, transparent 10deg 24deg)` }}
          />
        )}
        {phase === 'burst' && <div className="absolute h-64 w-64 animate-burst rounded-full bg-white" />}

        <div className={`relative ${phase === 'shake' ? 'animate-box-shake' : ''}`} style={{ filter: `drop-shadow(0 0 ${phase === 'shake' ? 30 : 50}px ${glow})` }}>
          {/* Lid */}
          <div
            className={`relative z-10 mx-auto -mb-1 h-10 w-52 rounded-md border border-white/20 bg-linear-to-b from-[#2a2a36] to-[#101018] shadow-[inset_0_1px_0_rgba(255,255,255,.2)] ${phase !== 'shake' ? 'animate-lid-fly' : ''}`}
          >
            <div className="absolute inset-y-0 left-1/2 w-7 -translate-x-1/2 bg-linear-to-b from-[#ffe88a] to-[#c68a00]" />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-4xl">🎀</div>
          </div>
          {/* Base */}
          <div className="relative h-36 w-48 rounded-b-lg border border-white/15 bg-linear-to-b from-[#1b1b25] to-[#07070b]">
            <div className="absolute inset-y-0 left-1/2 w-7 -translate-x-1/2 bg-linear-to-b from-[#ffcf3f] to-[#8a6200]" />
            <div className="absolute inset-0 flex items-center justify-center font-display text-5xl font-bold" style={{ color: glow, textShadow: `0 0 20px ${glow}` }}>
              ?
            </div>
          </div>
        </div>
      </div>

      {phase === 'reveal' && (
        <>
          <div className="mt-2 max-h-[55vh] w-full max-w-3xl overflow-auto p-2">
            <div className="flex flex-wrap justify-center gap-2">
              {sorted.map((item, i) => (
                <div
                  key={i}
                  className={`flex w-20 animate-pop-in flex-col items-center rounded-xl border p-1.5 opacity-0 ${RARITY[item.rarity].card}`}
                  style={{ animationDelay: `${i * stagger}ms` }}
                  title={item.name}
                >
                  <span className={`text-3xl ${item.rarity === 'trash' ? 'opacity-60 grayscale' : ''}`}>{item.emoji}</span>
                  <span className={`line-clamp-2 text-center font-sans text-[0.625rem] font-semibold leading-tight ${item.rarity === 'legendary' ? 'shiny-text' : item.rarity === 'trash' ? 'text-white/45' : 'text-white'}`}>
                    {item.name}
                  </span>
                  <span className="mt-0.5 text-[0.5rem] font-bold tracking-[0.15em]">{RARITY[item.rarity].label}</span>
                </div>
              ))}
            </div>
          </div>
          <div
            className="mt-3 flex animate-drop-in flex-col items-center gap-2 opacity-0"
            style={{ animationDelay: `${Math.min(items.length * stagger, 1600)}ms` }}
          >
            <p className="font-sans text-base text-white/80">
              {good > 0 ? `✨ ${good} item${good > 1 ? 's' : ''}` : '😐 Nothing good'} · 🗑️ {items.length - good - rats} trash{rats > 0 ? ` · 🐀 ${rats} eaten by a rat` : ''}
            </p>
            <button onClick={onClose} className="btn btn-gold px-10 py-3 text-lg">
              {good > 0 ? 'Collect' : 'Collect (the trash)'}
            </button>
          </div>
        </>
      )}

      {phase !== 'reveal' && (
        <button onClick={() => setPhase('reveal')} className="mt-6 font-sans text-sm text-white/50 underline-offset-4 hover:text-white hover:underline">
          Skip ⏩
        </button>
      )}
    </div>,
    document.body,
  )
}
