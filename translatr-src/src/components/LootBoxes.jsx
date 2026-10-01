import { useRef, useState } from 'react'
import Panel from './Panel'
import LootOpening from './LootOpening'
import { useGameStore, getLootboxPrice, lockSecondsLeft, hasSkill, eventMods } from '../store/useGameStore'
import { EQUIPPABLES, EQUIPPABLE_COUNT, LOOTBOX_BATCHES, LOOT_BOXES, LOOT_BOX_BY_ID, RARITIES, RELIC, RELIC_PITY } from '../data/gameData'
import { money } from '../lib/format'

const TIER_TEXT = { common: 'text-ink/80', rare: 'text-ice', epic: 'text-toxic', legendary: 'shiny-text' }
const NONE_FOUND = [] // one shared empty list: a fresh [] per read would count as a change every time
const RARITY_LABEL = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', relic: 'Relic' }

/** 0.055 → "5.5%", 0.00001 → "1 in 100K" (tiny odds read better as "1 in N"). */
const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 2 })
function fmtOdds(p) {
  if (p >= 0.001) return `${Number((p * 100).toPrecision(2))}%`
  return `1 in ${COMPACT.format(1 / p)}`
}
const itemChance = (box) => RARITIES.reduce((sum, t) => sum + box.odds[t], 0)
/** Rare or better: what actually separates the boxes (commons swamp the totals). */
const rarePlus = (box) => itemChance(box) - box.odds.common

/** Dynamic Pricing™: live surge multiplier with a sparkline. */
function SurgeTicker() {
  const surge = useGameStore((s) => s.surge)
  const history = useGameStore((s) => s.surgeHistory)
  const hot = surge >= 1.5
  const cheap = surge <= 0.95
  const color = hot ? '#d32f2f' : cheap ? '#2c9a1e' : '#bf7a00'
  const W = 120
  const H = 28
  const lo = Math.min(...history, 0.8)
  const hi = Math.max(...history, 1.2)
  const points = history.map((v, i) => `${(i / Math.max(1, history.length - 1)) * W},${H - ((v - lo) / (hi - lo)) * H}`).join(' ')

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2" style={{ borderColor: `${color}40`, background: `${color}0d` }}>
      <div className="min-w-0">
        <div className="label" style={{ color: `${color}cc` }}>
          Dynamic Pricing™
        </div>
        <div className="truncate text-[0.6875rem] font-semibold" style={{ color }}>
          {hot ? '🔥 High demand in your area' : cheap ? '🤑 Low prices (suspicious)' : '📊 Personalized for you'}
        </div>
      </div>
      <svg width={W} height={H} className="shrink-0 overflow-visible">
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      </svg>
      <span className="font-mono text-sm font-bold tabular-nums" style={{ color, textShadow: `0 0 10px ${color}88` }}>
        ×{surge.toFixed(2)}
      </span>
    </div>
  )
}

/** Gacha pity: a relic is guaranteed once the counter reaches RELIC_PITY. */
function PityMeter() {
  const pity = useGameStore((s) => s.pity ?? 0)
  const party = useGameStore((s) => hasSkill(s, 'pity_party'))
  return (
    <div
      className="mt-2 rounded-xl border border-magenta/20 bg-magenta/[0.04] px-3 py-2"
      title="Every box without a relic fills the pity counter (Golden ×2, Platinum ×5). At the top, the next box is a relic. Guaranteed. We pity you."
    >
      <div className="mb-1 flex items-center justify-between text-[0.6875rem]">
        <span className="font-semibold text-magenta">🥺 Pity counter{party && ' · ×2 (Pity Party)'}</span>
        <span className="font-mono tabular-nums text-ink/60">
          {pity.toLocaleString()}/{RELIC_PITY.toLocaleString()}
        </span>
      </div>
      <div className="meter h-1.5" style={{ '--bar': '#c42e86' }}>
        <span style={{ width: `${Math.min(100, (pity / RELIC_PITY) * 100)}%` }} />
      </div>
    </div>
  )
}

/** The three boxes, as a picker. */
function BoxPicker({ value, onChange }) {
  const prices = useGameStore((s) => LOOT_BOXES.map((b) => getLootboxPrice(s, b.id)).join('|')).split('|')
  return (
    <div role="radiogroup" aria-label="Box type" className="mb-3 grid grid-cols-3 gap-1.5">
      {LOOT_BOXES.map((b, i) => {
        const on = value === b.id
        return (
          <button
            key={b.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(b.id)}
            title={b.blurb}
            className={`flex min-w-0 flex-col items-center rounded-xl border px-1 py-2 transition ${
              on ? 'border-magenta/60 bg-magenta/[0.08] shadow-[0_0_16px_-6px_#c45ab8]' : 'border-ink/10 bg-inset/30 hover:border-ink/25'
            }`}
          >
            <span className={`text-3xl ${on ? '' : 'opacity-70'}`}>{b.emoji}</span>
            <span className="mt-0.5 w-full truncate text-center text-[0.6875rem] font-semibold">{b.name.replace(' Box', '')}</span>
            <span className="font-mono text-[0.625rem] text-ink/60">{money(Number(prices[i]))}</span>
            <span className="text-[0.5625rem] text-ink/45">{fmtOdds(rarePlus(b))} rare+</span>
          </button>
        )
      })}
    </div>
  )
}

/** Drop rates for every box, plus the collection. Legally required. Legally unread. */
function OddsDisclosure() {
  const found = useGameStore((s) => s.stats.itemIds ?? NONE_FOUND)
  const all = Object.values(EQUIPPABLES)
  return (
    <details className="mt-3 rounded-xl border border-ink/[0.08] bg-inset/20 px-3 py-2 text-[0.6875rem]">
      <summary className="cursor-pointer select-none font-semibold text-ink/60">
        📜 Odds &amp; collection ({found.length}/{EQUIPPABLE_COUNT}) · legally required
      </summary>
      <table className="mt-2 w-full table-fixed text-left">
        <thead>
          <tr className="text-ink/50">
            <th className="font-normal">Chance per box</th>
            {LOOT_BOXES.map((b) => (
              <th key={b.id} className="text-right font-normal" title={b.name}>
                {b.emoji}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono">
          {[...RARITIES, 'relic'].map((t) => (
            <tr key={t}>
              <td className={`font-sans font-semibold ${t === 'relic' ? 'glow-gold' : TIER_TEXT[t]}`}>{RARITY_LABEL[t]}</td>
              {LOOT_BOXES.map((b) => (
                <td key={b.id} className="text-right tabular-nums text-ink/70">
                  {fmtOdds(b.odds[t])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-ink/45">Every item can drop from every box. Lucky Charm, the Four-Leaf Clover and the Relic Magnet multiply these.</p>
      <div className="mt-2 flex flex-wrap gap-1" aria-label="Collection">
        {all.map((d) => {
          const got = found.includes(d.id)
          return (
            <span
              key={d.id}
              title={got ? `${d.name} (${RARITY_LABEL[d.tier]}): ${d.desc}` : `??? (${RARITY_LABEL[d.tier]})`}
              className={`grid h-7 w-7 place-items-center rounded-md border text-base ${got ? 'border-ink/15 bg-ink/[0.04]' : 'border-dashed border-ink/10 opacity-40 grayscale'}`}
            >
              {got ? d.emoji : '❔'}
            </span>
          )
        })}
      </div>
    </details>
  )
}

export default function LootBoxes() {
  const [boxId, setBoxId] = useState('cardboard')
  const box = LOOT_BOX_BY_ID[boxId]
  const price = useGameStore((s) => getLootboxPrice(s, boxId))
  const locked = useGameStore((s) => lockSecondsLeft(s, 'bulk50'))
  const whisperer = useGameStore((s) => hasSkill(s, 'box_whisperer'))
  const fakeSale = useGameStore((s) => !!eventMods(s).fakeSale)
  const [results, setResults] = useState(null)
  const [opening, setOpening] = useState(false)
  const openingRef = useRef(false)

  const doBuy = (n, id) => {
    if (openingRef.current) return
    const res = useGameStore.getState().buyLootBoxes(n, id)
    if (!res) return
    openingRef.current = true
    setResults(res)
    setOpening(true)
  }

  const buy = (n) => {
    if (openingRef.current) return
    const store = useGameStore.getState()
    const id = boxId
    if (n === 50) {
      // Pre-check funds so nobody solves a CAPTCHA just to be told they're broke.
      if (store.money < n * getLootboxPrice(store, id)) return store.buyLootBoxes(n, id)
      if (!hasSkill(store, 'box_whisperer')) return store.requestCaptcha('bulk50', () => doBuy(50, id))
    }
    doBuy(n, id)
  }

  const close = () => {
    openingRef.current = false
    setOpening(false)
  }

  const trash = results?.filter((r) => r.kind === 'trash') ?? []
  const good = results?.filter((r) => r.kind !== 'trash') ?? []

  return (
    <>
    <Panel id="win-loot" title="Mystery Boxes" icon="🎁" accent="#c45ab8" badge="0.01% Relic">
      <BoxPicker value={boxId} onChange={setBoxId} />
      <p className="mb-3 text-center text-xs text-ink/50">
        {fakeSale && (
          <>
            <s className="font-mono">{money(price * 2)}</s> <b className="rounded bg-blood px-1 text-[0.625rem] text-[#fff]">−50%</b>{' '}
          </>
        )}
        <b className="text-ink">{box.name}</b> · <b className="font-mono text-ink">{money(price)}</b> each · {fmtOdds(itemChance(box))} items ({fmtOdds(rarePlus(box))} rare or better) · {fmtOdds(box.odds.relic)} relic
      </p>
      <SurgeTicker />
      <PityMeter />
      <div className="mb-4" />
      <div className="grid grid-cols-5 gap-1.5">
        {LOOTBOX_BATCHES.map((n) => {
          const bulkLocked = n === 50 && locked > 0
          return (
            <button
              key={n}
              onClick={() => buy(n)}
              disabled={opening || bulkLocked}
              className={`btn flex-col px-1 py-2 ${n === 50 ? 'btn-magenta' : 'btn-ghost'}`}
              title={n === 50 && !whisperer ? 'Requires human verification' : undefined}
            >
              <span className="text-sm">{bulkLocked ? '🔒' : `×${n}`}</span>
              <span className="font-mono text-[0.625rem] opacity-80">{bulkLocked ? `${locked}s` : money(n * price)}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-[0.625rem] text-ink/35">
        {whisperer ? '×50 bundles skip the CAPTCHA. The boxes trust you now.' : '×50 bundles require CAPTCHA verification. For your safety.'}
      </p>
      <OddsDisclosure />

      {results && !opening && (
        <div className="inset-card mt-4 max-h-48 overflow-auto p-3 text-sm animate-fade-up">
          <div className="label mb-2">Last opened · {results.length} box{results.length > 1 ? 'es' : ''}</div>
          {good.length === 0 && <div className="text-ink/40">Nothing good. Shocking. Buy more?</div>}
          {good.map((r, i) =>
            r.kind === 'relic' ? (
              <div key={i} className="font-semibold glow-gold">
                {RELIC.emoji} {RELIC.name} (Relic!!!)
              </div>
            ) : (
              <div key={i} className={`font-medium ${TIER_TEXT[EQUIPPABLES[r.id].tier]}`}>
                {EQUIPPABLES[r.id].emoji} {r.name} <span className="text-[0.6875rem] font-normal text-ink/45">· {RARITY_LABEL[EQUIPPABLES[r.id].tier]}</span>
              </div>
            ),
          )}
          {trash.length > 0 && <div className="mt-1 text-ink/35">🗑️ {trash.length}× Useless Trash</div>}
        </div>
      )}
    </Panel>
    {/* Outside the window body, so minimizing the window can't strand an opening in progress */}
    {opening && <LootOpening results={results} onClose={close} />}
    </>
  )
}
