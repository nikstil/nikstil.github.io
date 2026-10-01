import { useEffect, useRef, useState } from 'react'
import Panel from './Panel'
import Modal from './Modal'
import { useGameStore, getMiningRate, getMaxStamina, hasSkill, getStaminaRegenMs, getAutoSwings, getPickaxeCost, getStaminaCost, activeMods, getAdReward } from '../store/useGameStore'
import {
  CARD_CREATIVES,
  HITBOX_SWAP,
  PICKAXE_LEVELS,
  REWARDED_AD_CLICKS,
  REWARDED_AD_COOLDOWN_MS,
  REWARDED_AD_SECONDS,
  STAMINA_LEVELS,
} from '../data/gameData'
import { money } from '../lib/format'
import { sfx } from '../lib/audio/engine'

const PARTICLE_COLORS = ['#ffcf3f', '#ffe88a', '#39ff14', '#ff2bd6', '#3de8ff', '#ffffff']
const MAX_BURSTS = 14
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
let burstSeq = 0

function makeBurst(x, y, gain, crit, auto) {
  const count = crit ? 26 : auto ? 8 : 14
  const reach = crit ? 90 : auto ? 35 : 55
  return {
    id: ++burstSeq,
    x,
    y,
    gain,
    crit,
    particles: Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2
      const dist = reach * (0.6 + Math.random() * 0.9)
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 12,
        color: pick(PARTICLE_COLORS),
        size: 3 + Math.random() * (crit ? 7 : 4),
        delay: Math.random() * 50,
      }
    }),
  }
}

export default function Mine() {
  const level = useGameStore((s) => s.pickaxeLevel)
  const rate = useGameStore(getMiningRate)
  const adReward = useGameStore((s) => getAdReward(s, REWARDED_AD_CLICKS))
  const neon = useGameStore((s) => !!s.premium.neon_skin)
  const autoSwings = useGameStore(getAutoSwings)
  const autominer = autoSwings > 0
  const regenMs = useGameStore(getStaminaRegenMs)
  const adReadyIn = useGameStore((s) => Math.max(0, Math.ceil((s.adRewardAt + REWARDED_AD_COOLDOWN_MS - s.clock) / 1000)))
  const noRewarded = useGameStore((s) => !!activeMods(s).noRewardedAds)
  const pickCost = useGameStore((s) => getPickaxeCost(s))
  const staminaCost = useGameStore((s) => getStaminaCost(s))
  // Booleans, not the wallet: money changes every second, affordability rarely does.
  const canPick = useGameStore((s) => s.money >= getPickaxeCost(s))
  const canStamina = useGameStore((s) => s.money >= getStaminaCost(s))
  const crit = useGameStore((s) => hasSkill(s, 'crit'))
  const stamina = useGameStore((s) => s.stamina)
  const staminaTs = useGameStore((s) => s.staminaTs)
  const staminaLevel = useGameStore((s) => s.staminaLevel)
  const maxStamina = useGameStore(getMaxStamina)
  const autoEvent = useGameStore((s) => s.autoMineEvent)
  const { upgradePickaxe, upgradeStamina, startCheckout } = useGameStore.getState()

  const [swapped, setSwapped] = useState(false)
  const [bursts, setBursts] = useState([])
  const [shakeKey, setShakeKey] = useState(0)
  const [watching, setWatching] = useState(false)
  const [adSession, setAdSession] = useState(0)
  const mineRef = useRef(null)
  const recentClicks = useRef([])

  const addBurst = (x, y, gain, isCrit, auto = false) =>
    setBursts((b) => [...b.slice(-(MAX_BURSTS - 1)), makeBurst(x, y, gain, isCrit, auto)])
  const removeBurst = (id) => setBursts((b) => b.filter((x) => x.id !== id))

  // Gaslighting UI: silently swap the Mine and Energy Drink tiles every so often.
  useEffect(() => {
    let timer
    const schedule = () => {
      const delay = HITBOX_SWAP.minDelayMs + Math.random() * (HITBOX_SWAP.maxDelayMs - HITBOX_SWAP.minDelayMs)
      timer = setTimeout(() => {
        if (Math.random() < HITBOX_SWAP.chance) setSwapped((v) => !v)
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  // Auto-miner swings come from the game loop; show them as small bursts.
  useEffect(() => {
    const el = mineRef.current
    if (!autoEvent || !el) return
    addBurst(el.offsetWidth * 0.28, el.offsetHeight * 0.72, autoEvent.gain, autoEvent.crit, true)
  }, [autoEvent])

  const onMine = (e) => {
    // Spam detection runs even when exhausted — mindless clickers are exactly who we want.
    const now = performance.now()
    recentClicks.current = recentClicks.current.filter((t) => now - t < HITBOX_SWAP.spamWindowMs)
    recentClicks.current.push(now)
    const spamming = recentClicks.current.length >= HITBOX_SWAP.spamClicks

    const res = useGameStore.getState().mine()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX ? e.clientX - rect.left : rect.width / 2
    const y = e.clientY ? e.clientY - rect.top : rect.height / 2
    if (res) {
      addBurst(x, y, res.lost ? -res.lost : res.gain, res.crit)
      sfx(res.lost ? 'lose' : res.crit ? 'crit' : 'mine')
    } else {
      sfx('thud')
      setShakeKey((k) => k + 1)
    }

    if (spamming && Math.random() < HITBOX_SWAP.spamChance) {
      recentClicks.current = []
      setSwapped((v) => !v)
    }
  }


  const current = PICKAXE_LEVELS[level - 1]
  const nextPick = PICKAXE_LEVELS[level]
  const nextStamina = STAMINA_LEVELS[staminaLevel]
  const exhausted = stamina <= 0
  const tile = 'mine-tile absolute left-0 top-0 h-full w-[calc(50%-6px)] select-none active:scale-[0.98]'

  return (
    <>
    <Panel id="win-mine" title="The Mine" icon="⛏️" accent="#e0a21a" badge="Free $$$" className="h-full">
      {/* Stamina */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label">Stamina</span>
          <span className="font-mono text-xs tabular-nums text-ink/70">
            <b className={exhausted ? 'glow-blood' : 'glow-toxic'}>{stamina}</b> / {maxStamina}
          </span>
        </div>
        <div className="meter h-3" style={{ '--bar': exhausted ? '#d32f2f' : '#3cb521' }}>
          <span style={{ width: `${(stamina / maxStamina) * 100}%` }} />
        </div>
        <StaminaRegen full={stamina >= maxStamina} since={staminaTs} regenMs={regenMs} />
      </div>

      {/* The two tiles. They swap places. You will not notice (and buy an energy drink). */}
      <div className="relative mb-4 h-48">
        <button
          ref={mineRef}
          data-nosfx
          onClick={onMine}
          className={`${tile} z-10`}
          style={{ transform: swapped ? 'translateX(calc(100% + 12px))' : 'none' }}
        >
          <div key={shakeKey} className={`flex h-full flex-col items-center justify-center ${shakeKey ? 'animate-shake' : ''}`}>
            <div className="relative">
              <span className="text-7xl drop-shadow-[0_8px_8px_rgba(80,50,0,.45)]">🪨</span>
              <span className={`absolute -right-5 -top-3 text-4xl ${neon ? 'animate-rainbow drop-shadow-[0_0_14px_#3de8ff]' : ''}`}>⛏️</span>
              {autominer && <span className="absolute -bottom-2 -left-6 text-3xl">🤖</span>}
            </div>
            <div className="mt-2 font-display text-sm font-bold tracking-[0.25em] text-[#7a4b00]">MINE</div>
            <div className="font-mono text-[0.6875rem] text-ink/50">+{money(rate)} · 1 ⚡</div>
          </div>
          {exhausted && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-2xl bg-inset/70 backdrop-blur-[2px]">
              <div className="text-center">
                <div className="font-display text-sm font-bold tracking-[0.2em] glow-blood">EXHAUSTED</div>
                <div className="mt-1 text-[0.6875rem] text-ink/60">+1 in <RegenIn since={staminaTs} regenMs={regenMs} />s</div>
              </div>
            </div>
          )}
          {bursts.map((b) => (
            <div key={b.id} className="burst" style={{ left: b.x, top: b.y }} onAnimationEnd={(e) => e.target === e.currentTarget && removeBurst(b.id)}>
              <span className="shockwave" style={{ color: b.crit ? '#ff2bd6' : '#ffcf3f' }} />
              {b.particles.map((p, i) => (
                <span
                  key={i}
                  className="particle"
                  style={{ color: p.color, '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--size': `${p.size}px`, animationDelay: `${p.delay}ms` }}
                />
              ))}
              <span
                className={`absolute left-0 top-[-14px] animate-float-up whitespace-nowrap font-mono font-bold ${b.crit ? 'text-2xl glow-magenta' : 'text-base glow-gold'}`}
              >
                {b.gain < 0 ? `🎃 −${money(-b.gain)}` : `${b.crit ? 'CRIT ' : ''}+${money(b.gain)}`}
              </span>
            </div>
          ))}
        </button>

        <button
          onClick={() => startCheckout('energy_drink')}
          className={`${tile} mine-tile-alt`}
          style={{ transform: swapped ? 'none' : 'translateX(calc(100% + 12px))' }}
          title="MegaVolt™ Energy Drink: refills stamina"
        >
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <span className="text-7xl drop-shadow-[0_8px_8px_rgba(20,80,0,.4)]">⚡</span>
            <div className="mt-2 font-display text-sm font-bold tracking-[0.2em] text-[#1d5e0f]">ENERGY</div>
            <div className="font-mono text-[0.6875rem] text-ink/50">{exhausted ? 'refill now · $4.99' : 'you look tired · $4.99'}</div>
          </div>
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl border border-ink/[0.06] bg-inset/30 px-3 py-2 text-xs">
        <span className="text-ink/50">Yield</span>
        <span className="font-mono text-ink">
          <b className="glow-gold">{money(rate)}</b>/swing{autominer && ` · 🤖 ${autoSwings}/s`}
          {crit && ' · 10% crit'}
        </span>
      </div>

      <div className="space-y-3">
        <UpgradeTrack
          title="Pickaxe"
          bar="#f0a800"
          level={level}
          current={`${current.name} · ${money(current.perClick)}/swing`}
          next={nextPick && `Lvl ${nextPick.level} ${nextPick.name} · ${money(nextPick.perClick)}/swing`}
          cost={nextPick ? pickCost : undefined}
          affordable={canPick}
          onUpgrade={upgradePickaxe}
        />
        <UpgradeTrack
          title="Max Stamina"
          bar="#3cb521"
          level={staminaLevel}
          current={`${maxStamina} capacity`}
          next={nextStamina && `+10 capacity → ${nextStamina.max}`}
          cost={nextStamina ? staminaCost : undefined}
          affordable={canStamina}
          onUpgrade={upgradeStamina}
        />
      </div>

      <button
        onClick={() => {
          if (adReadyIn > 0 || noRewarded) return
          setAdSession((n) => n + 1)
          setWatching(true)
        }}
        disabled={adReadyIn > 0 || noRewarded}
        className="btn btn-magenta mt-4 w-full"
        title={adReadyIn > 0 ? 'The advertiser needs a moment to recover' : undefined}
      >
        {noRewarded
          ? '📺 No rewarded ads today (Daily modifier)'
          : adReadyIn > 0
            ? `📺 Next rewarded ad in ${adReadyIn}s`
            : `📺 Watch a ${REWARDED_AD_SECONDS}s ad → +${money(adReward)}`}
      </button>
    </Panel>
    {/* Outside the window body, so minimizing the window can't strand the modal */}
    <Modal open={watching} z={260}>
      <RewardedAd key={adSession} onClose={() => setWatching(false)} />
    </Modal>
    </>
  )
}

/** Seconds until the next stamina point (ticks with the clock, so it stays out of the big component). */
function RegenIn({ since, regenMs }) {
  const clock = useGameStore((s) => s.clock)
  return Math.max(1, Math.ceil((since + regenMs - clock) / 1000))
}

/** The regen bar and "+1 stamina in 3s": the only part of the Mine that needs the clock. */
function StaminaRegen({ full, since, regenMs }) {
  const clock = useGameStore((s) => s.clock)
  const progress = full ? 1 : Math.min(1, Math.max(0, (clock - since) / regenMs))
  const regenIn = full ? null : Math.max(1, Math.ceil((since + regenMs - clock) / 1000))
  return (
    <>
      <div className="mt-1 h-0.5 overflow-hidden rounded bg-ink/5">
        <div className="h-full bg-toxic/60 transition-[width] duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="mt-2 text-[0.6875rem] text-ink/45">{regenIn ? `+1 stamina in ${regenIn}s` : 'Fully rested. Suspicious.'}</div>
    </>
  )
}

function UpgradeTrack({ title, bar, level, current, next, cost, affordable, onUpgrade }) {
  return (
    <div className="inset-card p-3" style={{ '--bar': bar }}>
      <div className="flex items-baseline justify-between">
        <span className="label">{title}</span>
        <span className="font-mono text-[0.6875rem] text-ink/50">Lvl {level}/10</span>
      </div>
      <div className="mt-0.5 truncate text-sm text-ink/85">{current}</div>
      <div className="segments my-2.5">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} data-on={i < level} />
        ))}
      </div>
      {cost != null ? (
        <button onClick={onUpgrade} className={`btn btn-sm w-full justify-between ${affordable ? 'btn-gold' : 'btn-ghost'}`} title={next}>
          <span className="truncate">↑ {next}</span>
          <span className="font-mono">{money(cost)}</span>
        </button>
      ) : (
        <div className="text-center font-display text-xs tracking-widest glow-gold">MAXED · PRESTIGE, COWARD</div>
      )}
    </div>
  )
}

function RewardedAd({ onClose }) {
  const [left, setLeft] = useState(REWARDED_AD_SECONDS)
  const [creative] = useState(() => CARD_CREATIVES[Math.floor(Math.random() * CARD_CREATIVES.length)])
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    if (left <= 0) return
    const id = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(id)
  }, [left])

  const claim = () => {
    if (claimed) return
    setClaimed(true)
    const { claimAdReward, toast } = useGameStore.getState()
    toast(`📺 Thanks for watching! +${money(claimAdReward())}`, 'good')
    onClose()
  }

  const quit = () => {
    useGameStore.getState().toast('No reward for quitters. 📺', 'bad')
    onClose()
  }

  return (
    <div className="modal-card w-[min(420px,92vw)] overflow-hidden" style={{ '--accent': '#ff2bd6' }}>
      <div className="flex items-center justify-between border-b border-ink/[0.06] px-4 py-2 text-xs text-ink/60">
        <span className="font-display tracking-widest">SPONSORED · REWARD IN {Math.max(left, 0)}s</span>
        {left > 0 && (
          <button onClick={quit} className="text-ink/40 hover:text-ink">
            Skip (lose reward) ✕
          </button>
        )}
      </div>
      <div className={`stock-watermark relative flex h-48 items-center justify-center bg-linear-to-br ${creative.theme} text-7xl`}>{creative.art}</div>
      <div className="p-5">
        <div className="font-comic text-xl font-bold">{creative.headline}</div>
        <p className="mt-1 text-sm text-ink/60">{creative.body}</p>
        <div className="meter mt-4" style={{ '--bar': '#ff2bd6' }}>
          <span className="transition-[width] duration-1000 ease-linear" style={{ width: `${((REWARDED_AD_SECONDS - left) / REWARDED_AD_SECONDS) * 100}%` }} />
        </div>
        <button onClick={claim} disabled={left > 0 || claimed} className="btn btn-toxic mt-4 w-full">
          {left > 0 ? `Keep watching… ${left}` : '🎁 Claim reward'}
        </button>
      </div>
    </div>
  )
}
