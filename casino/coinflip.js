// Coinflip: T or CT, one coin, two players. Join someone's flip (you get the other side) or start
// your own and wait for a taker. The winner takes both stakes, less 5% for the house.

import { bet, win, fmt, r2 } from './wallet.js'
import { $, esc, coins, betBox, toast, feed } from './ui.js'
import { anyone, someoneElse, botAmount } from './bots.js'
import { coin, winSound, loseSound, click } from './sound.js'

const FEE = 0.05
const SIDE = { t: { name: 'T', face: '🟧' }, ct: { name: 'CT', face: '🟦' } }
let nextId = 1
const games = [] // { id, a: {who, side}, b: {who} | null, amount, state: 'open'|'flipping'|'done', result, mine, doneAt }
let view = null

function addBotGame() {
  games.unshift({ id: nextId++, a: { who: anyone(), side: Math.random() < 0.5 ? 't' : 'ct' }, b: null, amount: botAmount(), state: 'open' })
  view?.list()
}
function flip(g) {
  g.state = 'flipping'
  g.result = Math.random() < 0.5 ? 't' : 'ct'
  g.flipAt = Date.now()
  view?.list()
  if (g.mine) view?.show(g)
  setTimeout(() => {
    g.state = 'done'
    g.doneAt = Date.now()
    const pot = r2(g.amount * 2 * (1 - FEE))
    if (g.mine) {
      const iWon = (g.mineSide ?? g.a.side) === g.result
      if (iWon) {
        win(pot)
        winSound(pot >= 100)
        toast(`Coinflip: ${SIDE[g.result].name}! You won ⓒ ${fmt(pot)}`, 'win')
      } else {
        loseSound()
        toast(`Coinflip: ${SIDE[g.result].name}. Lost ⓒ ${fmt(g.amount)}.`, 'lose')
      }
    } else if (pot >= 150) feed({ kind: 'win', who: g.result === g.a.side ? g.a.who : g.b.who, text: `won a ⓒ ${fmt(pot)} coinflip` })
    view?.list()
    view?.done(g)
  }, 3000)
}
function loop() {
  const open = games.filter((g) => g.state === 'open' && !g.mine)
  if (open.length < 6 || Math.random() < 0.18) addBotGame()
  // now and then another bot takes one
  if (open.length > 3 && Math.random() < 0.3) {
    const g = open[Math.floor(Math.random() * open.length)]
    g.b = { who: someoneElse([g.a.who]) }
    flip(g)
  }
  // tidy old ones away
  for (let i = games.length - 1; i >= 0; i--) if (games[i].state === 'done' && Date.now() - games[i].doneAt > 20000) games.splice(i, 1)
  view?.list()
}
let started = false
export function start() {
  if (started) return
  started = true
  for (let i = 0; i < 6; i++) addBotGame()
  setInterval(loop, 2500)
}

function create(amount, side) {
  if (!(amount > 0)) return toast('Enter an amount first.', 'err')
  if (!bet(amount)) return toast('Not enough credits. Get more with ＋.', 'err')
  click()
  const g = { id: nextId++, a: { who: { name: 'You', face: '😎' }, side }, b: null, amount, state: 'open', mine: true, mineSide: side }
  games.unshift(g)
  view?.list()
  view?.show(g)
  // a taker turns up
  setTimeout(() => {
    if (g.state !== 'open') return
    g.b = { who: anyone() }
    flip(g)
  }, 1500 + Math.random() * 3500)
}
function join(id) {
  const g = games.find((x) => x.id === id)
  if (!g || g.state !== 'open' || g.mine) return
  if (!bet(g.amount)) return toast('Not enough credits. Get more with ＋.', 'err')
  click()
  g.b = { who: { name: 'You', face: '😎' } }
  g.mine = true
  g.mineSide = g.a.side === 't' ? 'ct' : 't'
  flip(g)
}

export function mount(el) {
  el.innerHTML = `<section class="game coinflip">
    <div class="cf-stage" hidden><div class="cf-coin"><i class="face t">T</i><i class="face ct">CT</i></div><p class="cf-say"></p></div>
    <div class="cf-create"><h3>Start a flip</h3><div class="cf-bet"></div>
      <div class="cf-sides"><button class="cf-side t" data-side="t">🟧 Play T</button><button class="cf-side ct" data-side="ct">🟦 Play CT</button></div></div>
    <div class="cf-lobby"><h3>Open flips</h3><ul></ul></div>
    <p class="fair">The winner takes both stakes less 5%. The coin is a regular coin. Probably.</p>
  </section>`
  const box = betBox(1)
  $('.cf-bet', el).append(box.el)
  el.addEventListener('click', (e) => {
    const side = e.target.closest('[data-side]')?.dataset.side
    if (side) create(box.value, side)
    const id = Number(e.target.closest('[data-join]')?.dataset.join)
    if (id) join(id)
  })
  const stage = $('.cf-stage', el)
  const coinEl = $('.cf-coin', el)
  view = {
    list() {
      $('.cf-lobby ul', el).innerHTML = games
        .slice(0, 14)
        .map((g) => {
          const other = g.a.side === 't' ? 'ct' : 't'
          const right = g.b ? `${g.b.who.face} ${esc(g.b.who.name)} ${SIDE[other].face}` : '<i>waiting…</i>'
          const act =
            g.state === 'open' && !g.mine ? `<button class="go small" data-join="${g.id}">Join as ${SIDE[other].name}</button>` : g.state === 'flipping' ? '<b class="wait">flipping…</b>' : g.state === 'done' ? `<b class="${g.result}">${SIDE[g.result].face} ${SIDE[g.result].name}</b>` : '<i>yours</i>'
          return `<li class="${g.mine ? 'me' : ''}"><span>${SIDE[g.a.side].face} ${g.a.who.face} ${esc(g.a.who.name)}</span><span class="vs">vs</span><span>${right}</span><b>${coins(g.amount)}</b>${act}</li>`
        })
        .join('')
    },
    show(g) {
      stage.hidden = false
      coinEl.className = 'cf-coin'
      $('.cf-say', el).textContent = g.state === 'open' ? `You’re ${SIDE[g.mineSide].name} for ⓒ ${fmt(g.amount)}. Waiting for someone to take it…` : 'Flipping…'
      if (g.state === 'flipping') {
        void coinEl.offsetWidth
        coinEl.classList.add('spin', g.result)
        coin()
      }
    },
    done(g) {
      if (!g.mine) return
      const iWon = g.mineSide === g.result
      $('.cf-say', el).textContent = `${SIDE[g.result].name}! ${iWon ? `You won ⓒ ${fmt(r2(g.amount * 2 * (1 - FEE)))}.` : 'You lost.'}`
    },
  }
  view.list()
  const live = games.find((g) => g.mine && g.state !== 'done')
  if (live) view.show(live)
  return () => (view = null)
}
