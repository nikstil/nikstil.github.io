import { useEffect, useRef, useState } from 'react'
import Panel from './Panel'
import { useGameStore } from '../store/useGameStore'
import { COINS } from '../data/expansions'
import { money } from '../lib/format'
import { sfx } from '../lib/audio/engine'

/** Prices from $1T down to $0.00000001: small ones keep three significant digits. */
export function price(p) {
  if (!Number.isFinite(p)) return '—'
  if (p >= 1000) return money(p)
  return `$${Number(p.toPrecision(3)).toLocaleString('en', { maximumFractionDigits: 12 })}`
}
const qty = (n) => (n >= 1e6 ? n.toExponential(2) : n >= 100 ? Math.round(n).toLocaleString() : n.toPrecision(3))

function Sparkline({ points, color }) {
  if (!points || points.length < 2) return <svg className="crypto-spark" />
  const lo = Math.min(...points)
  const hi = Math.max(...points)
  const span = hi - lo || 1
  const d = points.map((p, i) => `${((i / (points.length - 1)) * 100).toFixed(1)},${(28 - ((p - lo) / span) * 26).toFixed(1)}`).join(' ')
  const up = points.at(-1) >= points[0]
  return (
    <svg className="crypto-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={d} fill="none" stroke={color ?? (up ? '#2c9a1e' : '#d32f2f')} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** CryptoBro Exchange: next to the casino games. Five coins, one of them stable (allegedly). */
export default function Crypto() {
  const market = useGameStore((s) => s.market)
  const holdings = useGameStore((s) => s.crypto)
  const wallet = useGameStore((s) => s.money)
  const [stake, setStake] = useState(100)
  const prices = market?.prices ?? Object.fromEntries(COINS.map((c) => [c.id, c.start]))
  const portfolio = COINS.reduce((sum, c) => sum + (holdings[c.id] ?? 0) * prices[c.id], 0)

  // Flash a row green or red when its price moves.
  const prev = useRef(prices)
  const [flash, setFlash] = useState({})
  useEffect(() => {
    const f = {}
    for (const c of COINS) if (prev.current[c.id] !== prices[c.id]) f[c.id] = prices[c.id] > prev.current[c.id] ? 'up' : 'down'
    prev.current = prices
    if (Object.keys(f).length) {
      setFlash(f)
      const t = setTimeout(() => setFlash({}), 700)
      return () => clearTimeout(t)
    }
  }, [prices])

  const buy = (id) => {
    const s = useGameStore.getState()
    if (s.buyCrypto(id, Math.min(stake, s.money))) sfx('coin')
  }
  const sell = (id, share) => {
    const got = useGameStore.getState().sellCrypto(id, share)
    if (got) sfx('kaching')
  }
  const chip = (label, value) => (
    <button key={label} className="btn btn-ghost btn-sm font-mono" onClick={() => setStake(Math.max(1, Math.floor(value)))}>
      {label}
    </button>
  )

  return (
    <Panel id="win-crypto" title="CryptoBro Exchange" icon="📈" accent="#f7931a" badge="Not financial advice">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="label">Your bags</div>
          <div className="font-mono text-lg font-bold">{money(portfolio)}</div>
        </div>
        <div className="text-right text-[0.6875rem] text-ink/50">
          Prices move every 3–5 seconds.
          <br />
          Coins that crash get relaunched. Your old ones don’t.
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="label shrink-0">Buy</span>
        <input type="number" min={1} value={stake} onChange={(e) => setStake(Number(e.target.value))} className="input w-28 font-mono" aria-label="Dollars per buy" />
        {chip('10%', wallet * 0.1)}
        {chip('50%', wallet * 0.5)}
        {chip('YOLO', wallet)}
      </div>
      <div className="grid gap-1.5">
        {COINS.map((c) => {
          const h = market?.history?.[c.id] ?? [c.start]
          const before = h.length > 1 ? h.at(-2) : h[0]
          const change = before ? (prices[c.id] - before) / before : 0
          const held = holdings[c.id] ?? 0
          const v = market?.version?.[c.id] ?? 1
          return (
            <div key={c.id} className={`crypto-row ${flash[c.id] ? `is-${flash[c.id]}` : ''}`}>
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-xl">{c.icon}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold" title={c.blurb}>
                    {c.name} <span className="font-mono text-[0.625rem] text-ink/50">{c.ticker}{v > 1 ? ` v${v}` : ''}</span>
                  </div>
                  <div className="font-mono text-xs">
                    {price(prices[c.id])}{' '}
                    {c.move ? (
                      <span className={change >= 0 ? 'text-toxic' : 'text-blood'}>
                        {change >= 0 ? '▲' : '▼'} {Math.abs(change * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-ink/40">pegged*</span>
                    )}
                  </div>
                </div>
              </div>
              <Sparkline points={c.move ? h : [1, 1]} color={c.move ? undefined : '#9aa3ad'} />
              <div className="text-right font-mono text-[0.6875rem] leading-tight">
                <div>{held > 0 ? qty(held) : '0'}</div>
                <div className="text-ink/50">{money(held * prices[c.id])}</div>
              </div>
              <div className="flex gap-1">
                <button className="btn btn-toxic btn-sm" onClick={() => buy(c.id)} disabled={wallet < 1}>
                  Buy
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => sell(c.id, 1)} disabled={held <= 0}>
                  Sell
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-center text-[0.625rem] text-ink/35">*The peg is a vibe. Gains are not taxed. Losses are character development.</p>
    </Panel>
  )
}
