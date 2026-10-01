import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { SNAKE } from '../../data/arcade'
import { getArcadePrice } from '../../lib/economy'
import { money } from '../../lib/format'
import { sfx } from '../../lib/audio/engine'
import { AdBreak, useAdBreak } from '../AdBreak'

// Wallet Snake: Snake on a Game Boy screen. A credit costs money (or an ad); every bill you eat
// goes into the pot; gold coins are worth more but don't stay long. When you die you can pay to
// continue (keeping the pot) or cash out, minus the platform's 30%. Leaving forfeits the pot.

const COLS = 17
const ROWS = 15
const CELL = 16
const LCD = { bg: '#9bbc0f', dot: '#8bac0f', mid: '#306230', dark: '#0f380f' }
const DIRS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
}

const freshSnake = () => {
  const y = ROWS >> 1
  return { body: [{ x: 5, y }, { x: 4, y }, { x: 3, y }], dir: [1, 0], queue: [], grow: 0, food: null, gold: null, ms: 150 }
}
function emptyCell(s) {
  for (let tries = 0; tries < 400; tries++) {
    const c = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
    const taken = s.body.some((b) => b.x === c.x && b.y === c.y) || (s.food && s.food.x === c.x && s.food.y === c.y) || (s.gold && s.gold.x === c.x && s.gold.y === c.y)
    if (!taken) return c
  }
  return null
}

export default function Snake() {
  const canvas = useRef(null)
  const g = useRef(freshSnake())
  const [phase, setPhase] = useState('insert') // insert | play | paused | dead
  const [hud, setHud] = useState({ pot: 0, bills: 0, length: 3, continues: 0 })
  const [cashed, setCashed] = useState(null) // the last cash-out: { net, fee }
  const [touch] = useState(() => matchMedia('(pointer: coarse)').matches)
  const wallet = useGameStore((s) => s.money)
  const price = (clicks) => getArcadePrice(useGameStore.getState(), clicks)
  const { arcadeCharge, arcadePayout, noteShooter, noteBest, toast } = useGameStore.getState()
  const [ad, showAd] = useAdBreak(() => noteShooter({ arcadeAds: 1 }))
  const hudRef = useRef(hud)
  hudRef.current = hud

  function draw() {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const s = g.current
    ctx.fillStyle = LCD.bg
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL)
    ctx.fillStyle = LCD.dot
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) ctx.fillRect(x * CELL + 7, y * CELL + 7, 2, 2)
    ctx.textAlign = 'center'
    ctx.font = 'bold 9px "Courier New", monospace'
    if (s.food) {
      const { x, y } = s.food
      ctx.fillStyle = LCD.mid
      ctx.fillRect(x * CELL + 1, y * CELL + 4, 14, 9)
      ctx.fillStyle = LCD.bg
      ctx.fillRect(x * CELL + 2, y * CELL + 5, 12, 7)
      ctx.fillStyle = LCD.dark
      ctx.fillText('$', x * CELL + 8, y * CELL + 12)
    }
    if (s.gold && (s.gold.ttl > 12 || s.gold.ttl % 2)) {
      const { x, y } = s.gold
      ctx.fillStyle = LCD.dark
      ctx.beginPath()
      ctx.arc(x * CELL + 8, y * CELL + 8, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = LCD.bg
      ctx.fillText('$', x * CELL + 8, y * CELL + 11)
    }
    s.body.forEach((b, i) => {
      ctx.fillStyle = i ? LCD.dark : LCD.mid
      ctx.fillRect(b.x * CELL + 1, b.y * CELL + 1, 14, 14)
      if (i) return
      ctx.fillStyle = LCD.dark
      ctx.fillRect(b.x * CELL + 3, b.y * CELL + 3, 10, 10)
      ctx.fillStyle = LCD.bg
      const [dx, dy] = s.dir
      const ex = b.x * CELL + 8 + dx * 3
      const ey = b.y * CELL + 8 + dy * 3
      ctx.fillRect(ex - 1 - dy * 3, ey - 1 - dx * 3, 2, 2)
      ctx.fillRect(ex - 1 + dy * 3, ey - 1 + dx * 3, 2, 2)
    })
  }

  function begin(keepPot) {
    const s = freshSnake()
    s.food = emptyCell(s)
    g.current = s
    setHud((h) => (keepPot ? { ...h, length: 3 } : { pot: 0, bills: 0, length: 3, continues: 0 }))
    setCashed(null)
    setPhase('play')
    draw()
  }
  const insertCoin = () => {
    const cost = price(SNAKE.coin)
    if (!arcadeCharge(cost)) return toast(`A credit costs ${money(cost)}. Or watch an ad. We’re flexible.`, 'bad')
    sfx('coin')
    noteShooter({ snakePlays: 1 })
    begin(false)
  }
  const freeCredit = () =>
    showAd(() => {
      noteShooter({ snakePlays: 1 })
      begin(false)
    })

  // One step of the snake.
  function advance() {
    const s = g.current
    if (s.dead) return
    if (s.queue.length) s.dir = s.queue.shift()
    const head = { x: s.body[0].x + s.dir[0], y: s.body[0].y + s.dir[1] }
    const on = (c) => c && c.x === head.x && c.y === head.y
    const eats = on(s.food) || on(s.gold)
    const tailMoves = s.grow === 0 && !eats
    const selfHit = s.body.some((b, i) => (i < s.body.length - 1 || !tailMoves) && b.x === head.x && b.y === head.y)
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || selfHit) return die()
    s.body.unshift(head)
    let gain = 0
    let bill = 0
    if (on(s.food)) {
      bill = 1
      gain = price(SNAKE.bill) // (eating keeps the tail this step: one segment longer)
      s.ms = Math.max(70, s.ms - 3)
      s.food = emptyCell(s)
      const bills = hudRef.current.bills + 1
      if (bills % 5 === 0 && !s.gold) s.gold = { ...emptyCell(s), ttl: 45 }
      noteShooter({ snakeBills: 1 })
      sfx('munch')
    } else if (on(s.gold)) {
      gain = price(SNAKE.gold)
      s.grow += 1 // two segments in all
      s.gold = null
      sfx('coin')
    }
    if (!eats) {
      if (s.grow > 0) s.grow -= 1
      else s.body.pop()
    }
    if (s.gold && --s.gold.ttl <= 0) s.gold = null
    if (gain || s.body.length !== hudRef.current.length)
      setHud((h) => ({ ...h, pot: h.pot + gain, bills: h.bills + bill, length: s.body.length }))
    draw()
  }
  function die() {
    g.current.dead = true
    sfx('lose')
    setPhase('dead')
    noteBest({ snakeBest: hudRef.current.bills })
    draw()
  }

  // The game loop: a step every `ms` (it speeds up as you eat).
  useEffect(() => {
    if (phase !== 'play' || ad) return
    let t
    const step = () => {
      advance()
      if (g.current && phase === 'play') t = setTimeout(step, g.current.ms)
    }
    t = setTimeout(step, g.current.ms)
    return () => clearTimeout(t)
    // advance/die only use refs, stable setters and store actions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ad])
  useEffect(() => {
    if (phase === 'dead') return
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const turn = ([dx, dy]) => {
    const s = g.current
    const last = s.queue.at(-1) ?? s.dir
    if ((dx === -last[0] && dy === -last[1]) || (dx === last[0] && dy === last[1]) || s.queue.length > 2) return
    s.queue.push([dx, dy])
  }
  useEffect(() => {
    const onKey = (e) => {
      if (DIRS[e.code] && phase === 'play') {
        e.preventDefault()
        turn(DIRS[e.code])
      } else if ((e.code === 'Space' || e.code === 'KeyP' || e.key === 'Escape') && (phase === 'play' || phase === 'paused') && !ad) {
        e.preventDefault()
        setPhase(phase === 'play' ? 'paused' : 'play')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  // Swipes on the screen turn too.
  const swipe = useRef(null)
  const onPointerDown = (e) => (swipe.current = { x: e.clientX, y: e.clientY })
  const onPointerUp = (e) => {
    const from = swipe.current
    swipe.current = null
    if (!from || phase !== 'play') return
    const dx = e.clientX - from.x
    const dy = e.clientY - from.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return
    turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)])
  }

  const net = Math.round(hud.pot * (1 - SNAKE.fee))
  const continueCost = price(SNAKE.continue * 2 ** hud.continues)
  const cashOut = () => {
    if (hud.pot > 0) arcadePayout(net)
    sfx('kaching')
    setCashed({ net, fee: hud.pot - net })
    setHud((h) => ({ ...h, pot: 0 }))
    setPhase('insert')
  }
  const payToContinue = () => {
    if (!arcadeCharge(continueCost)) return toast(`Continuing costs ${money(continueCost)}.`, 'bad')
    sfx('coin')
    noteShooter({ snakeContinues: 1 })
    setHud((h) => ({ ...h, continues: h.continues + 1 }))
    begin(true)
  }

  return (
    <div className="snake">
      <div className="snake-hud">
        <span>
          Pot <b>{money(hud.pot)}</b>
        </span>
        <span>
          Bills <b>{hud.bills}</b>
        </span>
        <span>
          Length <b>{hud.length}</b>
        </span>
      </div>
      <div className="snake-screen">
        <canvas ref={canvas} width={COLS * CELL} height={ROWS * CELL} className="snake-canvas" onPointerDown={onPointerDown} onPointerUp={onPointerUp} />
        {phase === 'insert' && !ad && (
          <div className="snake-overlay">
            <div className="snake-title">WALLET SNAKE</div>
            {cashed ? (
              <p>
                Cashed out {money(cashed.net)} (platform fee: {money(cashed.fee)}). Thank you for your business.
              </p>
            ) : (
              <p>
                Eat bills ({money(price(SNAKE.bill))} each). Gold coins pay {money(price(SNAKE.gold))} but vanish. Cash out when you die, minus {Math.round(SNAKE.fee * 100)}%.
              </p>
            )}
            <div className="snake-blink">INSERT COIN</div>
            <button className="arcade-btn arcade-btn-primary" onClick={insertCoin} disabled={wallet < price(SNAKE.coin)}>
              🪙 Insert coin ({money(price(SNAKE.coin))})
            </button>
            <button className="arcade-btn" onClick={freeCredit}>
              📺 Watch an ad for a free credit
            </button>
          </div>
        )}
        {phase === 'paused' && (
          <div className="snake-overlay">
            <div className="snake-title">PAUSED</div>
            <button className="arcade-btn arcade-btn-primary" onClick={() => setPhase('play')}>
              ▶ Resume
            </button>
          </div>
        )}
        {phase === 'dead' && (
          <div className="snake-overlay">
            <div className="snake-title">GAME OVER</div>
            <p>
              Pot: {money(hud.pot)}. After the {Math.round(SNAKE.fee * 100)}% platform fee: <b>{money(net)}</b>.
            </p>
            <button className="arcade-btn arcade-btn-primary" onClick={cashOut}>
              💰 Cash out {money(net)}
            </button>
            <button className="arcade-btn" onClick={payToContinue} disabled={wallet < continueCost}>
              Continue and keep the pot ({money(continueCost)})
            </button>
            <p className="text-[0.6875rem]">Unclaimed winnings expire when you leave. Obviously.</p>
          </div>
        )}
        {ad && <AdBreak ad={ad} />}
      </div>
      {touch ? (
        <div className="snake-pad">
          {[
            ['▲', [0, -1], 'up'],
            ['◀', [-1, 0], 'left'],
            ['▶', [1, 0], 'right'],
            ['▼', [0, 1], 'down'],
          ].map(([label, dir, area]) => (
            <button key={area} className="arcade-btn snake-key" style={{ gridArea: area }} onPointerDown={() => turn(dir)} aria-label={`Turn ${area}`}>
              {label}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-center text-[0.75rem]">Arrows or WASD to steer · Space or Esc pauses</p>
      )}
    </div>
  )
}
