import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { LOGGLE } from '../../data/arcade'
import { getArcadePrice } from '../../lib/economy'
import { money } from '../../lib/format'
import { sfx } from '../../lib/audio/engine'

// LOGGLE: the daily word puzzle. Twelve letters, six guesses, and the answer is always one of two
// names, a coin flip that changes at midnight (your midnight). Everyone gets the same one each day.

export const ANSWERS = ['ROBERTLOGGIA', 'LOBERTBOGGIA']
const SPLIT = 6 // ROBERT | LOGGIA
const LENGTH = 12
const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

/** Today, as YYYY-MM-DD in your own time zone. */
export function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Heads or tails for a day: a hash of the date, so the same day always lands the same way. */
export function answerFor(day) {
  let h = 2166136261
  for (const c of `loggle:${day}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  // Mix the bits (murmur3's finisher) so neighbouring dates don't land the same way.
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return ANSWERS[(h >>> 0) & 1]
}

/** Colours a guess the Wordle way: greens first, then yellows only while that letter is left over. */
export function score(guess, answer) {
  const out = Array(LENGTH).fill('miss')
  const left = {}
  for (let i = 0; i < LENGTH; i++) {
    if (guess[i] === answer[i]) out[i] = 'hit'
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1
  }
  for (let i = 0; i < LENGTH; i++) {
    if (out[i] === 'hit' || !left[guess[i]]) continue
    out[i] = 'near'
    left[guess[i]]--
  }
  return out
}

const RANK = { miss: 1, near: 2, hit: 3 }
const SQUARE = { hit: '🟩', near: '🟨', miss: '⬛' }

export default function Loggle() {
  const day = today()
  const answer = answerFor(day)
  const stats = useGameStore((s) => s.stats)
  const wallet = useGameStore((s) => s.money)
  const { arcadeCharge, arcadePayout, noteShooter, toast } = useGameStore.getState()
  const price = (clicks) => getArcadePrice(useGameStore.getState(), clicks)

  // Today's board lives in your stats, so closing the Arcade (or the tab) doesn't reroll anything.
  const saved = stats.loggleDay === day ? stats.loggleBoard : null
  const guesses = saved?.guesses ?? []
  const extra = saved?.extra ?? 0
  const allowed = LOGGLE.guesses + extra
  const won = guesses.at(-1) === answer
  const over = won || guesses.length >= allowed
  const [typed, setTyped] = useState('')
  const [shake, setShake] = useState(false)

  const save = (board) => useGameStore.setState((s) => ({ stats: { ...s.stats, loggleDay: day, loggleBoard: board } }))

  function submit() {
    if (over) return
    if (typed.length < LENGTH) {
      setShake(true)
      setTimeout(() => setShake(false), 400)
      sfx('error')
      return toast('Not enough letters. It’s 6 + 6. You know the name.', 'bad')
    }
    const next = [...guesses, typed]
    setTyped('')
    save({ guesses: next, extra })
    if (next.length === 1 && !extra) noteShooter({ logglePlays: 1 })
    if (typed === answer) {
      const prize = price(LOGGLE.prize)
      arcadePayout(prize)
      // A streak counts days in a row (yesterday's win, then today's).
      const yesterday = today(new Date(Date.now() - 864e5))
      useGameStore.setState((s) => {
        const streak = s.stats.loggleLastWin === yesterday ? (s.stats.loggleStreak ?? 0) + 1 : 1
        return { stats: { ...s.stats, loggleWins: (s.stats.loggleWins ?? 0) + 1, loggleLastWin: day, loggleStreak: streak, loggleBestStreak: Math.max(streak, s.stats.loggleBestStreak ?? 0), ...(next.length === 1 ? { loggleFirstTry: (s.stats.loggleFirstTry ?? 0) + 1 } : {}) } }
      })
      sfx('jackpot')
      toast(`🟩 ${answer === ANSWERS[0] ? 'Robert Loggia' : 'Lobert Boggia'}, in ${next.length}! ${money(prize)} paid to your wallet.`, 'good')
    } else {
      sfx('tick')
      if (next.length >= allowed) useGameStore.setState((s) => ({ stats: { ...s.stats, loggleStreak: 0 } }))
    }
  }

  function press(key) {
    if (over) return
    if (key === 'ENTER') return submit()
    if (key === 'BACK') return setTyped((t) => t.slice(0, -1))
    if (/^[A-Z]$/.test(key)) setTyped((t) => (t.length < LENGTH ? t + key : t))
  }

  // Your real keyboard works too.
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable="true"]')) return
      const key = e.key === 'Enter' ? 'ENTER' : e.key === 'Backspace' ? 'BACK' : e.key.length === 1 ? e.key.toUpperCase() : null
      if (!key || (key.length === 1 && !/[A-Z]/.test(key))) return
      e.preventDefault()
      press(key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // The best colour each letter has earned, for the keyboard.
  const keys = {}
  for (const g of guesses)
    score(g, answer).forEach((r, i) => {
      if (RANK[r] > (RANK[keys[g[i]]] ?? 0)) keys[g[i]] = r
    })

  const extraCost = price(LOGGLE.extraGuess * 2 ** extra)
  const buyGuess = () => {
    if (!arcadeCharge(extraCost)) return toast(`One more guess costs ${money(extraCost)}. You have ${money(useGameStore.getState().money)}.`, 'bad')
    noteShooter({ loggleBought: 1 })
    sfx('kaching')
    save({ guesses, extra: extra + 1 })
  }

  const share = () => {
    const grid = guesses.map((g) => score(g, answer).map((r, i) => (i === SPLIT ? ' ' : '') + SQUARE[r]).join('')).join('\n')
    const text = `LOGGLE ${day} ${won ? guesses.length : 'X'}/${allowed}\n${grid}`
    navigator.clipboard?.writeText(text).then(
      () => toast('Copied. Go ruin a group chat.', 'good'),
      () => toast('Your browser said no to the clipboard.', 'bad'),
    )
  }

  const rows = Array.from({ length: allowed }, (_, r) => (r < guesses.length ? guesses[r] : r === guesses.length && !over ? typed : ''))

  return (
    <div className="loggle">
      <p className="loggle-intro">
        Today’s name, in six guesses. Solve it: <b>{money(price(LOGGLE.prize))}</b>
      </p>
      <div className="loggle-board" role="grid" aria-label="LOGGLE board">
        {rows.map((word, r) => {
          const done = r < guesses.length
          const marks = done ? score(word, answer) : null
          return (
            <div key={r} role="row" className={`loggle-row ${shake && r === guesses.length ? 'is-shaking' : ''}`}>
              {Array.from({ length: LENGTH }, (_, i) => (
                <span
                  key={i}
                  role="gridcell"
                  className={`loggle-tile ${i === SPLIT ? 'is-split' : ''} ${marks ? `is-${marks[i]}` : word[i] ? 'is-typed' : ''}`}
                  style={marks ? { animationDelay: `${i * 60}ms` } : undefined}
                  aria-label={word[i] ? `${word[i]}${marks ? `, ${marks[i] === 'hit' ? 'right spot' : marks[i] === 'near' ? 'wrong spot' : 'not in it'}` : ''}` : 'empty'}
                >
                  {word[i] ?? ''}
                </span>
              ))}
            </div>
          )
        })}
      </div>

      {over ? (
        <div className="loggle-end">
          {won ? (
            <p className="font-bold text-[#008000]">
              {answer === ANSWERS[0] ? 'ROBERT LOGGIA.' : 'LOBERT BOGGIA.'} Got it in {guesses.length}. Come back tomorrow (it might be the other one).
            </p>
          ) : (
            <>
              <p className="font-bold text-[#800000]">Out of guesses. There were two options.</p>
              <button className="arcade-btn arcade-btn-primary" onClick={buyGuess} disabled={wallet < extraCost}>
                Buy one more guess ({money(extraCost)})
              </button>
            </>
          )}
          <button className="arcade-btn arcade-btn-sm" onClick={share}>
            📋 Share
          </button>
          <p className="text-[0.6875rem] text-[#404040]">
            Wins: {stats.loggleWins ?? 0} · streak {stats.loggleStreak ?? 0} (best {stats.loggleBestStreak ?? 0}) · new name at midnight
          </p>
        </div>
      ) : (
        <div className="loggle-keys" aria-label="Keyboard">
          {ROWS.map((row, r) => (
            <div key={r} className="loggle-keyrow">
              {r === 2 && (
                <button className="loggle-key is-wide" onClick={() => press('ENTER')}>
                  Enter
                </button>
              )}
              {[...row].map((k) => (
                <button key={k} className={`loggle-key ${keys[k] ? `is-${keys[k]}` : ''}`} onClick={() => press(k)}>
                  {k}
                </button>
              ))}
              {r === 2 && (
                <button className="loggle-key is-wide" onClick={() => press('BACK')} aria-label="Backspace">
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
