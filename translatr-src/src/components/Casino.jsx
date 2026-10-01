import { useEffect, useRef, useState } from 'react'
import Panel from './Panel'
import { useShallow } from 'zustand/react/shallow'
import { useGameStore, getMultiplier, getRoulettePayouts, lockSecondsLeft, getTableLimit, hasSkill, eventMods } from '../store/useGameStore'
import { CAPTCHA } from '../data/gameData'
import { fmt, money } from '../lib/format'
import { sfx, wheelTicks } from '../lib/audio/engine'

// 36 pockets: 17 red, 17 black, 2 green → ~47.2% / 47.2% / 5.6%
const POCKETS = Array.from({ length: 36 }, (_, i) =>
  i === 0 || i === 18 ? 'green' : i < 18 ? (i % 2 ? 'red' : 'black') : i % 2 ? 'black' : 'red',
)
const SEG = 360 / POCKETS.length
const COLORS = { red: '#e53935', black: '#1f2630', green: '#2fb52a' }
const WHEEL_BG = `conic-gradient(${POCKETS.map((c, i) => `${COLORS[c]} ${i * SEG}deg ${(i + 1) * SEG - 0.6}deg, #0a0a0f ${(i + 1) * SEG - 0.6}deg ${(i + 1) * SEG}deg`).join(', ')})`
const SPIN_MS = 3200

export default function Casino() {
  const cash = useGameStore((s) => s.money)
  const mult = useGameStore(getMultiplier)
  const payouts = useGameStore(useShallow(getRoulettePayouts))
  const locked = useGameStore((s) => lockSecondsLeft(s, 'roulette'))
  const limit = useGameStore(getTableLimit)
  const [bet, setBet] = useState(10)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [history, setHistory] = useState([])
  const [message, setMessage] = useState('Place your bets. The house believes in you (to lose).')
  const spinningRef = useRef(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const doSpin = (choice, wager) => {
    if (spinningRef.current) return
    const store = useGameStore.getState()
    if (!store.placeBet(wager)) return
    spinningRef.current = true
    setSpinning(true)

    // The result is decided up front; the wheel animates to it. (Seeded on a Daily Challenge.)
    const [roll, favour, pick] = store.rngMany('roulette', 3)
    let index = Math.floor(roll * POCKETS.length)
    // The Croupier Owes You: 1 in 5 losing spins quietly lands on your colour instead.
    if (POCKETS[index] !== choice && hasSkill(store, 'rigged') && favour < 0.2) {
      const mine = POCKETS.map((c, i) => (c === choice ? i : -1)).filter((i) => i >= 0)
      index = mine[Math.floor(pick * mine.length)]
    }
    const target = (360 - (index + 0.5) * SEG) % 360
    wheelTicks((SPIN_MS - 200) / 1000)
    setRotation((r) => r + 360 * 5 + ((target - (((r % 360) + 360) % 360) + 360) % 360))
    setMessage(`Spinning… ${money(wager)} on ${choice.toUpperCase()}`)

    timer.current = setTimeout(() => {
      const s = useGameStore.getState()
      const color = POCKETS[index]
      setHistory((h) => [color, ...h].slice(0, 14))
      if (color === choice) {
        sfx('win')
        const won = s.settleBet(wager * getRoulettePayouts(s)[choice])
        setMessage(`${color.toUpperCase()}! You won ${money(won)}. Now bet it all again.`)
        s.toast(`🎰 WINNER! +${money(won)}`, 'good')
      } else {
        sfx('lose')
        const refund = s.refundLoss(wager)
        setMessage(`${color.toUpperCase()}. You lost ${money(wager)}.${refund ? ` Insurance refunded ${money(refund)}.` : ''} Double or nothing?`)
      }
      spinningRef.current = false
      setSpinning(false)
    }, SPIN_MS)
  }

  const spin = (choice) => {
    if (spinningRef.current) return
    const store = useGameStore.getState()
    const left = lockSecondsLeft(store, 'roulette', Date.now())
    if (left > 0) return store.toast(`🔒 Roulette locked for ${left}s. Failed CAPTCHAs have consequences.`, 'bad')
    const wager = Math.floor(bet)
    if (!(wager > 0)) return store.toast('Bet at least $1, you coward.', 'bad')
    if (wager > store.money) return store.toast("You can't bet money you don't have. (Yet. Loans coming soon™)", 'bad')
    if (wager > getTableLimit(store)) return store.placeBet(wager) // refuses, with the table-limit toast
    if (Math.random() < CAPTCHA.rouletteChance * (eventMods(store).captcha ?? 1)) return store.requestCaptcha('roulette', () => doSpin(choice, wager))
    doSpin(choice, wager)
  }

  const chip = (label, fn) => (
    <button key={label} disabled={spinning} onClick={() => setBet((b) => Math.max(1, Math.min(limit, Math.floor(fn(b)))))} className="btn btn-ghost btn-sm font-mono">
      {label}
    </button>
  )

  return (
    <Panel id="win-casino" title="Roulette Royale" icon="🎡" accent="#43b048" badge="94.4% Fair">
      <div className="relative mx-auto mb-4 h-48 w-48">
        <div className="absolute inset-[-10px] animate-spin-slow rounded-full bg-[conic-gradient(from_0deg,#ffcf3f33,transparent_30%,#ff2bd633,transparent_60%,#39ff1433,transparent)] blur-md" />
        <div className="absolute left-1/2 -top-1 z-20 h-0 w-0 -translate-x-1/2 border-x-[9px] border-t-[16px] border-x-transparent border-t-gold drop-shadow-[0_0_8px_#ffcf3f]" />
        <div
          className="relative h-full w-full rounded-full p-[5px] shadow-[0_0_0_2px_#ffcf3f66,0_0_40px_-8px_#ffcf3f]"
          style={{ background: 'linear-gradient(135deg,#ffe88a,#8a6200 50%,#ffcf3f)' }}
        >
          <div
            className="h-full w-full rounded-full"
            style={{
              background: WHEEL_BG,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? `transform ${SPIN_MS - 200}ms cubic-bezier(0.12, 0.8, 0.18, 1)` : 'none',
            }}
          />
          <div className="absolute inset-[32%] grid place-items-center rounded-full border border-gold/50 bg-[radial-gradient(circle_at_40%_35%,#ffffff,#dbe7f2_60%,#a9bfd4)] text-2xl shadow-[0_2px_8px_rgba(0,30,70,.45)]">
            💰
          </div>
        </div>
      </div>

      <p className="mb-3 min-h-[2.5rem] text-center text-sm text-ink/70">{message}</p>

      <div className="mb-2 flex items-center gap-2" style={{ '--accent': '#39ff14' }}>
        <span className="label shrink-0">Bet</span>
        <input type="number" min={1} value={bet} disabled={spinning} onChange={(e) => setBet(Number(e.target.value))} className="input" />
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {chip('+10', (b) => b + 10)}
        {chip('+100', (b) => b + 100)}
        {chip('½', (b) => b / 2)}
        {chip('×2', (b) => b * 2)}
        <button disabled={spinning} onClick={() => setBet(Math.max(1, Math.floor(Math.min(cash, limit))))} className="btn btn-blood btn-sm">
          ALL IN 🔥
        </button>
      </div>

      <div className="relative">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['red', 'text-[#fff] from-[#ff7a7a] to-[#b71c1c] shadow-[0_0_24px_-8px_#ff3b5c]'],
            ['black', 'text-[#fff] from-[#4a5563] to-[#141a22]'],
            ['green', 'text-[#fff] from-[#7ddc5a] to-[#1d7d12]'],
          ].map(([c, cls]) => (
            <button key={c} disabled={spinning || locked > 0} onClick={() => spin(c)} className={`btn flex-col bg-linear-to-b py-2.5 ${cls}`}>
              <span className="text-sm tracking-widest">{c.toUpperCase()}</span>
              <span className="font-mono text-[0.6875rem] opacity-80">×{payouts[c]}</span>
            </button>
          ))}
        </div>
        {locked > 0 && (
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-inset/75 backdrop-blur-sm">
            <span className="font-display text-sm font-bold tracking-widest glow-blood">🔒 CAPTCHA LOCKOUT · {locked}s</span>
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-[0.6875rem] text-ink/40">
        Wins × your x{fmt(mult)} multiplier · table limit {money(limit)} · {Math.round(CAPTCHA.rouletteChance * 100)}% of spins require human verification
      </p>

      {history.length > 0 && (
        <div className="mt-3 flex justify-center gap-1">
          {history.map((c, i) => (
            <span key={i} className="h-3 w-3 rounded-full ring-1 ring-ink/20" style={{ background: COLORS[c], boxShadow: c !== 'black' ? `0 0 8px ${COLORS[c]}` : 'none' }} />
          ))}
        </div>
      )}
    </Panel>
  )
}
