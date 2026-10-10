// Roulette, the skins-site way: a strip of T and CT tiles with one bomb. Bet on T or CT (2×) or the
// bomb (14×) while the timer runs; then it rolls. Rounds keep going whichever game you're looking at.

import { bet, win, fmt } from './wallet.js'
import { $, $$, esc, coins, hex, betBox, toast, feed } from './ui.js'
import { anyone, botAmount } from './bots.js'
import { tick, winSound, loseSound, click } from './sound.js'

const SLOTS = ['bomb', 't', 'ct', 't', 'ct', 't', 'ct', 't', 'ct', 't', 'ct', 't', 'ct', 't', 'ct']
const PAYS = { t: 2, ct: 2, bomb: 14 }
const NAMES = { t: 'T', ct: 'CT', bomb: 'Bomb' }
const FACE = { t: '🟧', ct: '🟦', bomb: '💣' }
const BET_S = 12
const ROLL_S = 6
const SHOW_S = 3
const TILE = 64 // px, with the gap
const REPEAT = 8

const st = { round: 0, phase: 'betting', until: 0, bets: { t: [], ct: [], bomb: [] }, mine: { t: 0, ct: 0, bomb: 0 }, result: null, prev: 0, history: [], hash: '', botsAt: [] }
let view = null // the mounted page, if any

function newRound() {
  st.round++
  st.phase = 'betting'
  st.until = Date.now() + BET_S * 1000
  st.bets = { t: [], ct: [], bomb: [] }
  st.mine = { t: 0, ct: 0, bomb: 0 }
  if (st.result != null) st.prev = st.result
  st.result = null
  st.hash = hex(16)
  // the bots place their bets at random moments
  const n = 4 + Math.floor(Math.random() * 9)
  st.botsAt = Array.from({ length: n }, () => Date.now() + Math.random() * (BET_S - 1) * 1000).sort((a, b) => a - b)
  view?.round()
}
function botBet() {
  const r = Math.random()
  const c = r < 0.46 ? 't' : r < 0.92 ? 'ct' : 'bomb'
  st.bets[c].push({ who: anyone(), amount: c === 'bomb' ? Math.min(20, botAmount()) : botAmount() })
  view?.bets()
}
function roll() {
  st.phase = 'rolling'
  st.until = Date.now() + ROLL_S * 1000
  st.result = Math.floor(Math.random() * SLOTS.length)
  view?.roll()
}
function settle() {
  st.phase = 'result'
  st.until = Date.now() + SHOW_S * 1000
  const c = SLOTS[st.result]
  st.history.unshift(c)
  st.history.length = Math.min(st.history.length, 100)
  const mine = st.mine[c]
  const lost = Object.entries(st.mine).filter(([k]) => k !== c).reduce((s, [, v]) => s + v, 0)
  if (mine > 0) {
    win(mine * PAYS[c])
    winSound(c === 'bomb')
    toast(`Roulette: ${NAMES[c]}! You won ⓒ ${fmt(mine * PAYS[c])}`, 'win')
  } else if (lost > 0) {
    loseSound()
    toast(`Roulette: ${NAMES[c]}. Lost ⓒ ${fmt(lost)}.`, 'lose')
  }
  const big = st.bets[c].filter((b) => !b.me).sort((a, b) => b.amount - a.amount)[0]
  if (big && big.amount * PAYS[c] >= 150) feed({ kind: 'win', who: big.who, text: `won ⓒ ${fmt(big.amount * PAYS[c])} on ${NAMES[c]} in Roulette` })
  view?.result()
}
function loop() {
  const now = Date.now()
  if (st.phase === 'betting') {
    while (st.botsAt.length && st.botsAt[0] <= now) {
      st.botsAt.shift()
      botBet()
    }
    if (now >= st.until) roll()
  } else if (st.phase === 'rolling' && now >= st.until) settle()
  else if (st.phase === 'result' && now >= st.until) newRound()
  view?.clock(now)
}
let started = false
export function start() {
  if (started) return
  started = true
  newRound()
  setInterval(loop, 100)
}

/** Places your bet on a colour. */
function place(c, amount) {
  if (st.phase !== 'betting') return toast('Bets are closed: wait for the next round.', 'err')
  if (!(amount > 0)) return toast('Enter an amount first.', 'err')
  if (!bet(amount)) return toast('Not enough credits. Get more with ＋.', 'err')
  click()
  st.mine[c] += amount
  const mine = st.bets[c].find((b) => b.me)
  if (mine) mine.amount += amount
  else st.bets[c].unshift({ who: { name: 'You', face: '😎' }, amount, me: true })
  view?.bets()
}

export function mount(el) {
  el.innerHTML = `<section class="game roulette">
    <div class="rl-top"><div class="rl-hist" aria-label="Last rolls"></div><div class="rl-last100"></div></div>
    <div class="rl-window"><div class="rl-strip"></div><i class="rl-line"></i><div class="rl-timer"><b></b><i></i></div></div>
    <div class="rl-controls"></div>
    <div class="rl-cols">${['t', 'bomb', 'ct'].map((c) => `<div class="rl-col ${c}" data-c="${c}"><button class="rl-bet ${c}" data-bet="${c}">${FACE[c]} Bet on ${NAMES[c]} <span>${PAYS[c]}×</span></button><div class="rl-total"></div><ul></ul></div>`).join('')}</div>
    <p class="fair">Provably fair™: this round's hash is <code class="rl-hash"></code>. We checked it ourselves and it was fine.</p>
  </section>`
  const box = betBox(1)
  $('.rl-controls', el).append(box.el)
  const strip = $('.rl-strip', el)
  strip.innerHTML = Array.from({ length: REPEAT }, () => SLOTS.map((c) => `<span class="tile ${c}">${c === 'bomb' ? '💣' : NAMES[c]}</span>`).join('')).join('')
  el.addEventListener('click', (e) => {
    const c = e.target.closest('[data-bet]')?.dataset.bet
    if (c) place(c, box.value)
  })
  const win0 = $('.rl-window', el)
  const offsetFor = (index, repeat, jitter = 0) => win0.clientWidth / 2 - (repeat * SLOTS.length + index) * TILE - TILE / 2 + jitter
  let raf = 0
  function park(index) {
    strip.style.transition = 'none'
    strip.style.transform = `translateX(${offsetFor(index, 1)}px)`
  }
  function spin(remaining) {
    park(st.prev)
    void strip.offsetWidth
    const jitter = (Math.random() - 0.5) * (TILE - 14)
    strip.style.transition = `transform ${remaining}ms cubic-bezier(.12,.75,.15,1)`
    strip.style.transform = `translateX(${offsetFor(st.result, REPEAT - 2, jitter)}px)`
    // tick as tiles pass the line
    let lastTile = null
    cancelAnimationFrame(raf)
    const watch = () => {
      const x = new DOMMatrixReadOnly(getComputedStyle(strip).transform).m41
      const tile = Math.floor((win0.clientWidth / 2 - x) / TILE)
      if (lastTile !== null && tile !== lastTile) tick()
      lastTile = tile
      if (st.phase === 'rolling') raf = requestAnimationFrame(watch)
    }
    raf = requestAnimationFrame(watch)
  }
  view = {
    round() {
      $('.rl-hash', el).textContent = st.hash.slice(0, 24) + '…'
      el.querySelectorAll('.rl-col').forEach((c) => c.classList.remove('won', 'lost'))
      this.bets()
    },
    bets() {
      for (const c of ['t', 'ct', 'bomb']) {
        const col = $(`.rl-col.${c}`, el)
        const list = [...st.bets[c]].sort((a, b) => (b.me ? 1e9 : b.amount) - (a.me ? 1e9 : a.amount))
        $('.rl-total', col).innerHTML = `${list.length} bet${list.length === 1 ? '' : 's'} · ${coins(list.reduce((s, b) => s + b.amount, 0))}`
        $('ul', col).innerHTML = list.slice(0, 12).map((b) => `<li class="${b.me ? 'me' : ''}"><span>${b.who.face} ${esc(b.who.name)}</span><b>${coins(b.amount)}</b></li>`).join('')
      }
      $$('.rl-bet', el).forEach((b) => (b.disabled = st.phase !== 'betting'))
    },
    roll() {
      this.bets()
      spin(Math.max(300, st.until - Date.now()))
    },
    result() {
      const c = SLOTS[st.result]
      el.querySelectorAll('.rl-col').forEach((col) => col.classList.add(col.dataset.c === c ? 'won' : 'lost'))
      this.history()
    },
    history() {
      $('.rl-hist', el).innerHTML = st.history.slice(0, 12).map((c) => `<i class="dot ${c}" title="${NAMES[c]}">${c === 'bomb' ? '💣' : ''}</i>`).join('')
      const n = (c) => st.history.filter((x) => x === c).length
      $('.rl-last100', el).innerHTML = st.history.length ? `Last ${st.history.length}: <b class="t">T ${n('t')}</b> <b class="bomb">💣 ${n('bomb')}</b> <b class="ct">CT ${n('ct')}</b>` : ''
    },
    clock(now) {
      const t = $('.rl-timer', el)
      const left = Math.max(0, st.until - now)
      t.hidden = st.phase !== 'betting'
      if (st.phase === 'betting') {
        $('b', t).textContent = `Rolling in ${(left / 1000).toFixed(1)}s`
        $('i', t).style.width = `${(left / (BET_S * 1000)) * 100}%`
      }
    },
  }
  view.round()
  view.history()
  if (st.phase === 'rolling') spin(Math.max(300, st.until - Date.now()))
  else requestAnimationFrame(() => park(st.result ?? st.prev))
  if (st.phase === 'result') view.result()
  return () => {
    cancelAnimationFrame(raf)
    view = null
  }
}
