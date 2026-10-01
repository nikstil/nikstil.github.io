import { useEffect, useRef, useState } from 'react'
import { useGameStore, getMultiplier, getMaxStamina } from '../store/useGameStore'
import { useAnimatedNumber } from '../lib/hooks'
import { fmt, money } from '../lib/format'
import { ACHIEVEMENTS } from '../data/achievements'
import { cursesFor } from '../data/runMods'
import { CeoDog, Speedometer } from './Toys'
import { RogueBadge } from './Rogue'

/** The rolling wallet number. Its own component: the roll re-renders this, not the whole command bar. */
function WalletValue({ cash }) {
  const shown = useAnimatedNumber(cash)
  return <div className="wallet-value">{money(shown)}</div>
}

/** Command bar across the top of the "desktop" (Aero glass by default; themes re-skin its classes). */
export default function Header() {
  const cash = useGameStore((s) => s.money)
  const mult = useGameStore(getMultiplier)
  const prestige = useGameStore((s) => s.prestige)
  const gems = useGameStore((s) => s.gems)
  const vip = useGameStore((s) => !!s.premium.vip)
  const adsSeen = useGameStore((s) => s.adsSeen)
  const saveFilesLost = useGameStore((s) => s.saveFilesLost)
  const stamina = useGameStore((s) => s.stamina)
  const maxStamina = useGameStore(getMaxStamina)
  const debt = useGameStore((s) => Math.ceil(s.loan?.debt ?? 0))
  const trophies = useGameStore((s) => Object.keys(s.achievements).length)
  const streak = useGameStore((s) => s.streak?.count ?? 0)
  const afk = useGameStore((s) => s.afk)
  const ngPlus = useGameStore((s) => s.ngPlus ?? 0)

  // Floating +$/-$ deltas next to the wallet.
  const [deltas, setDeltas] = useState([])
  const prev = useRef(cash)
  useEffect(() => {
    const diff = cash - prev.current
    prev.current = cash
    if (!diff) return
    setDeltas((d) => [...d.slice(-3), { id: `${Date.now()}-${Math.random()}`, diff }])
  }, [cash])

  return (
    <header className="cmdbar relative z-40 lg:sticky lg:top-0">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 xl:px-6">
        <div className="flex items-center gap-3">
          <div className="start-orb" aria-hidden="true">
            <span className="start-glyph text-lg">T</span>
          </div>
          <div className="leading-tight">
            <h1 className="brand-title text-2xl">
              {vip && <span className="mr-1">👑</span>}
              TRANSLATR<span className="text-base align-top">™</span> <span className="brand-edition">Ultra+ Pro Max</span>
            </h1>
            <div className="brand-sub text-[0.6875rem]">Home Premium · Service Pack 7 · Genuine Advantage™</div>
          </div>
          <CeoDog />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="wallet-tile">
            <div className="wallet-label">Wallet{afk && ' · ⏸ paused'}</div>
            <WalletValue cash={cash} />
            <div className="pointer-events-none absolute -right-2 top-1">
              {deltas.map((d) => (
                <span
                  key={d.id}
                  onAnimationEnd={() => setDeltas((all) => all.filter((x) => x.id !== d.id))}
                  className={`absolute right-0 animate-delta whitespace-nowrap delta-chip rounded px-1 font-mono text-xs font-bold shadow ${d.diff > 0 ? 'text-toxic' : 'text-blood'}`}
                >
                  {d.diff > 0 ? '+' : '−'}
                  {money(Math.abs(d.diff))}
                </span>
              ))}
            </div>
          </div>
          {debt > 0 && <Stat label="Owed to Vinnie" value={`−${money(debt)}`} className="text-blood" />}
          <Stat label="Multiplier" value={`x${fmt(mult)}`} className="text-toxic" />
          <div className="stat-tile">
            <div className="stat-label">Stamina</div>
            <div className="flex items-center gap-2">
              <div className="meter w-20" style={{ '--bar': stamina ? '#3cb521' : '#d32f2f' }}>
                <span style={{ width: `${(stamina / maxStamina) * 100}%` }} />
              </div>
              <span className="font-mono text-xs tabular-nums text-ink/70">
                {stamina}/{maxStamina}
              </span>
            </div>
          </div>
          {prestige > 0 && <Stat label="Prestige" value={'★'.repeat(Math.min(prestige, 5)) + (prestige > 5 ? `+${prestige - 5}` : '')} className="text-magenta" />}
          {ngPlus > 0 && (
            <div title={`New Game+ ${ngPlus}: ${cursesFor(ngPlus).map((c) => `${c.name} (${c.desc})`).join(' · ')}`}>
              <Stat label="New Game+" value={`✚ ${ngPlus}`} className="text-blood" />
            </div>
          )}
          <Stat label="Gems · 13 buys 1" value={`◆ ${fmt(gems)}`} className="text-ice" />
          <button className="text-left" onClick={() => useGameStore.getState().openDaily()} title="Daily rewards (worth almost nothing)">
            <Stat label="Streak" value={`🔥 ${streak} day${streak === 1 ? '' : 's'}`} className="text-blood" />
          </button>
          <button className="text-left" onClick={() => useGameStore.getState().openTrophies()} title="Open the Hall of Shame">
            <Stat label="Shame" value={`🏆 ${trophies}/${ACHIEVEMENTS.length}`} className="text-gold" />
          </button>
          <Stat label="Ads endured" value={fmt(adsSeen)} className="text-ink/80" />
          <RogueBadge />
          {saveFilesLost > 0 && <Stat label="Saves lost" value={`☠ ${saveFilesLost}`} className="text-blood" />}
          <Speedometer />
        </div>
      </div>
    </header>
  )
}

function Stat({ label, value, className = '' }) {
  return (
    <div className="stat-tile">
      <div className="stat-label">{label}</div>
      <div className={`font-mono text-sm font-semibold tabular-nums ${className}`}>{value}</div>
    </div>
  )
}
