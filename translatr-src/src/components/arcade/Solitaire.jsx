import { useState } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { SOLITAIRE } from '../../data/arcade'
import { getArcadePrice } from '../../lib/economy'
import { money } from '../../lib/format'
import { sfx } from '../../lib/audio/engine'

// Pay-Per-Card Solitaire: Klondike (draw one), except drawing from the stock costs money after a
// three-card free trial, and each paid card costs a little more than the last. Undo is Premium.
// Click a card to pick it up, then click where it goes. Double-click sends a card home.

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const isRed = (suit) => suit === 1 || suit === 2

function deal() {
  const deck = []
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ id: `${s}-${r}`, s, r, up: false })
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  const tab = Array.from({ length: 7 }, (_, c) => deck.splice(0, c + 1).map((card, i) => ({ ...card, up: i === c })))
  return { stock: deck, waste: [], found: [[], [], [], []], tab, sel: null, history: [], draws: 0, spent: 0, over: false, moved: false }
}

const canFound = (card, pile) => (pile.length ? pile.at(-1).s === card.s && pile.at(-1).r === card.r - 1 : card.r === 1)
function canTab(card, pile) {
  if (!pile.length) return card.r === 13
  const top = pile.at(-1)
  return top.up && isRed(top.s) !== isRed(card.s) && top.r === card.r + 1
}
/** The cards a selection picks up (a tableau pick takes everything on top of it). */
function picked(st, sel) {
  if (sel.from === 'waste') return st.waste.slice(-1)
  if (sel.from === 'found') return st.found[sel.f].slice(-1)
  return st.tab[sel.col].slice(sel.idx)
}
const snapshot = ({ stock, waste, found, tab }) => ({ stock, waste, found, tab })

/** Moves the selection to `dest` ({ found: f } or { col }). Null when the move isn't allowed. */
function move(st, sel, dest) {
  const cards = picked(st, sel)
  if (!cards.length) return null
  if (dest.found != null) {
    if (cards.length !== 1 || !canFound(cards[0], st.found[dest.found])) return null
  } else if ((sel.from === 'tab' && sel.col === dest.col) || !canTab(cards[0], st.tab[dest.col])) return null
  const next = { ...st, waste: [...st.waste], found: st.found.map((p) => [...p]), tab: st.tab.map((p) => [...p]) }
  if (sel.from === 'waste') next.waste.pop()
  else if (sel.from === 'found') next.found[sel.f].pop()
  else {
    const pile = next.tab[sel.col]
    pile.splice(sel.idx)
    if (pile.length && !pile.at(-1).up) pile[pile.length - 1] = { ...pile.at(-1), up: true } // flip the next card
  }
  if (dest.found != null) next.found[dest.found].push(cards[0])
  else next.tab[dest.col].push(...cards)
  return { ...next, sel: null, moved: true, history: [...st.history.slice(-60), snapshot(st)] }
}
/** Where a single card can go home, if anywhere. */
const homeFor = (st, card) => st.found.findIndex((pile) => canFound(card, pile))

export default function Solitaire() {
  const [st, setSt] = useState(deal)
  const wallet = useGameStore((s) => s.money)
  const price = (clicks) => getArcadePrice(useGameStore.getState(), clicks)
  const { arcadeCharge, arcadePayout, noteShooter, toast } = useGameStore.getState()

  const freeLeft = Math.max(0, SOLITAIRE.freeDraws - st.draws)
  const drawCost = freeLeft ? 0 : price(SOLITAIRE.draw + SOLITAIRE.drawStep * (st.draws - SOLITAIRE.freeDraws))
  const undoCost = price(SOLITAIRE.undo)
  const prize = price(SOLITAIRE.prize)
  const canFinish = !st.over && !st.stock.length && !st.waste.length && st.tab.every((p) => p.every((c) => c.up))

  /** Applies a move and checks for the win. */
  function commit(next) {
    if (!next) return false
    if (!st.moved) noteShooter({ solitairePlays: 1 })
    if (next.found.every((p) => p.length === 13)) {
      next.over = true
      arcadePayout(prize)
      noteShooter({ solitaireWins: 1 })
      sfx('jackpot')
      toast(`🃏 You won Solitaire! ${money(prize)} paid to your wallet (you spent ${money(next.spent)} on cards).`, 'good')
    } else sfx('click')
    setSt(next)
    return true
  }

  function draw() {
    if (st.over) return
    if (!st.stock.length) {
      if (!st.waste.length) return
      // Back to the stock, face down. Drawing them again costs again, obviously.
      return commit({ ...st, stock: [...st.waste].reverse().map((c) => ({ ...c, up: false })), waste: [], sel: null, moved: true, history: [...st.history.slice(-60), snapshot(st)] })
    }
    if (drawCost) {
      if (!arcadeCharge(drawCost)) return toast(`The next card costs ${money(drawCost)}. You have ${money(useGameStore.getState().money)}.`, 'bad')
      noteShooter({ solitaireDraws: 1 })
    }
    const stock = [...st.stock]
    const card = { ...stock.pop(), up: true }
    commit({ ...st, stock, waste: [...st.waste, card], draws: st.draws + 1, spent: st.spent + drawCost, sel: null, moved: true, history: [...st.history.slice(-60), snapshot(st)] })
  }

  function undo() {
    const last = st.history.at(-1)
    if (!last || st.over) return
    if (!arcadeCharge(undoCost)) return toast(`Undo is a Premium feature: ${money(undoCost)} per undo.`, 'bad')
    sfx('kaching')
    setSt({ ...st, ...last, sel: null, spent: st.spent + undoCost, history: st.history.slice(0, -1) })
  }

  /** Picks a card up, or drops the held one here. */
  function pick(sel, dest) {
    if (st.over) return
    if (st.sel && dest && commit(move(st, st.sel, dest))) return
    const same = st.sel && JSON.stringify(st.sel) === JSON.stringify(sel)
    setSt({ ...st, sel: sel && !same ? sel : null })
  }
  /** Double-click: straight to a foundation. */
  function sendHome(sel) {
    const cards = picked(st, sel)
    if (cards.length !== 1) return
    const f = homeFor(st, cards[0])
    if (f >= 0) commit(move(st, sel, { found: f }))
  }
  function finish() {
    let cur = st
    for (let guard = 0; guard < 60; guard++) {
      const col = cur.tab.findIndex((p) => p.length && homeFor(cur, p.at(-1)) >= 0)
      if (col < 0) break
      cur = move(cur, { from: 'tab', col, idx: cur.tab[col].length - 1 }, { found: homeFor(cur, cur.tab[col].at(-1)) })
    }
    commit(cur)
  }

  const isSel = (sel) => st.sel && JSON.stringify(st.sel) === JSON.stringify(sel)
  const heldCol = st.sel?.from === 'tab' ? st.sel : null

  return (
    <div className="sol">
      <div className="sol-bar">
        <button className="arcade-btn arcade-btn-sm" onClick={() => setSt(deal())}>
          New deal
        </button>
        <button className="arcade-btn arcade-btn-sm" onClick={undo} disabled={!st.history.length || st.over}>
          ↶ Undo ({money(undoCost)})
        </button>
        {canFinish && (
          <button className="arcade-btn arcade-btn-sm arcade-btn-primary" onClick={finish}>
            ✨ Auto-finish
          </button>
        )}
        <span className="ml-auto text-[0.75rem]">
          Win: <b>{money(prize)}</b> · Spent: <b>{money(st.spent)}</b>
        </span>
      </div>
      <div className="sol-table">
        <div className="sol-row">
          <button className={`sol-card ${st.stock.length ? 'sol-back' : 'sol-empty'}`} onClick={draw} aria-label={st.stock.length ? 'Draw a card' : 'Recycle the waste'}>
            {st.stock.length ? (
              <span className="sol-price">{drawCost ? money(drawCost) : `FREE ×${freeLeft}`}</span>
            ) : (
              <span className="sol-pip">↻</span>
            )}
          </button>
          <div className="sol-slot">
            {st.waste.length ? (
              <Card card={st.waste.at(-1)} held={isSel({ from: 'waste' })} onClick={() => pick({ from: 'waste' })} onDoubleClick={() => sendHome({ from: 'waste' })} />
            ) : (
              <span className="sol-card sol-empty" />
            )}
          </div>
          <span className="sol-spacer" />
          {st.found.map((pile, f) =>
            pile.length ? (
              <Card key={f} card={pile.at(-1)} held={isSel({ from: 'found', f })} onClick={() => pick({ from: 'found', f }, { found: f })} />
            ) : (
              <button key={f} className="sol-card sol-empty" onClick={() => pick(null, { found: f })} aria-label="Foundation">
                <span className="sol-pip">A</span>
              </button>
            ),
          )}
        </div>
        <div className="sol-row sol-tableau">
          {st.tab.map((pile, col) => {
            let top = 0
            return (
              <div key={col} className="sol-col" onClick={() => !pile.length && pick(null, { col })}>
                {!pile.length && <span className="sol-card sol-empty" />}
                {pile.map((card, idx) => {
                  const y = top
                  top += card.up ? 0.3 : 0.16
                  return (
                    <div key={card.id} className="sol-stack" style={{ top: `calc(var(--cw) * ${y})` }}>
                      <Card
                        card={card}
                        held={heldCol && heldCol.col === col && idx >= heldCol.idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (card.up) pick({ from: 'tab', col, idx }, { col })
                          else if (st.sel) pick(null, { col })
                        }}
                        onDoubleClick={() => idx === pile.length - 1 && sendHome({ from: 'tab', col, idx })}
                      />
                    </div>
                  )
                })}
                <span className="sol-col-fill" style={{ height: `calc(var(--cw) * ${1.4 + top})` }} />
              </div>
            )
          })}
        </div>
        {st.over && (
          <div className="sol-won">
            <div className="text-2xl font-bold">You win!</div>
            <p>
              Prize {money(prize)}, minus {money(st.spent)} in cards and undos. The house thanks you for playing.
            </p>
            <button className="arcade-btn arcade-btn-primary" onClick={() => setSt(deal())}>
              Deal again
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 text-[0.75rem]">
        Click a card, then where it goes. Double-click to send it home. First {SOLITAIRE.freeDraws} draws free, then each card costs a little more than the last. Wallet:{' '}
        {money(wallet)}.
      </p>
    </div>
  )
}

function Card({ card, held, onClick, onDoubleClick }) {
  if (!card.up) return <span className="sol-card sol-back" onClick={onClick} />
  return (
    <button
      className={`sol-card sol-face ${isRed(card.s) ? 'is-red' : ''} ${held ? 'is-held' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      aria-label={`${RANKS[card.r]} of ${['spades', 'hearts', 'diamonds', 'clubs'][card.s]}`}
    >
      <span className="sol-corner">
        {RANKS[card.r]}
        {SUITS[card.s]}
      </span>
      <span className="sol-pip">{SUITS[card.s]}</span>
    </button>
  )
}
