// Crash: a multiplier climbs from 1.00× until it crashes. Cash out before it does and your bet is
// multiplied; don't and it's gone. Set an auto cash-out to leave at a number without having to watch.
// Rounds keep going whichever game you're looking at.

import { bet, win, fmt, r2 } from './wallet.js'
import { $, esc, coins, betBox, toast, feed } from './ui.js'
import { anyone, botAmount } from './bots.js'
import { winSound, loseSound, boom, click } from './sound.js'

const BET_S = 7
const AFTER_S = 3
const GROW = 0.09 // ×e every 11 seconds or so
const mult = (t) => Math.exp(GROW * t)
/** Where this round crashes: 4% of rounds at 1.00×, otherwise 0.96 / (1 − u) (a 4% house edge). */
function crashPoint() {
  const u = Math.random()
  if (u < 0.04) return 1
  return Math.min(1000, Math.max(1, Math.floor((96 / (1 - u)) * 1) / 100))
}

const st = { phase: 'betting', until: 0, startAt: 0, point: 1, m: 1, players: [], mine: null, next: null, history: [] }
let view = null

function newRound() {
  st.phase = 'betting'
  st.until = Date.now() + BET_S * 1000
  st.m = 1
  st.players = []
  st.mine = null
  // a bet queued during the last round goes in now
  if (st.next) {
    const n = st.next
    st.next = null
    join(n.amount, n.auto, true)
  }
  const bots = 5 + Math.floor(Math.random() * 10)
  for (let i = 0; i < bots; i++) {
    setTimeout(() => {
      if (st.phase !== 'betting') return
      const target = Math.random() < 0.15 ? 1.1 + Math.random() * 0.3 : Math.random() < 0.7 ? 1.3 + Math.random() * 2 : 2 + Math.random() * 18
      st.players.push({ who: anyone(), amount: botAmount(), target: r2(target), out: null })
      view?.players()
    }, Math.random() * (BET_S - 0.5) * 1000)
  }
  view?.round()
}
function launch() {
  st.phase = 'running'
  st.startAt = Date.now()
  st.point = crashPoint()
  view?.round()
}
function cashOut(p, at) {
  p.out = at
  if (p.me) {
    const got = r2(p.amount * at)
    win(got)
    winSound(at >= 5)
    toast(`Crash: cashed out at ${at.toFixed(2)}× for ⓒ ${fmt(got)}`, 'win')
  } else if (p.amount * at >= 200) feed({ kind: 'win', who: p.who, text: `cashed out ⓒ ${fmt(p.amount * at)} at ${at.toFixed(2)}× in Crash` })
  view?.players()
}
function crash() {
  st.phase = 'crashed'
  st.m = st.point
  st.until = Date.now() + AFTER_S * 1000
  st.history.unshift(st.point)
  st.history.length = Math.min(st.history.length, 30)
  boom()
  if (st.mine && st.mine.out == null) {
    loseSound()
    toast(`Crash: it crashed at ${st.point.toFixed(2)}×. Lost ⓒ ${fmt(st.mine.amount)}.`, 'lose')
  }
  view?.round()
}
function loop() {
  const now = Date.now()
  if (st.phase === 'betting' && now >= st.until) launch()
  else if (st.phase === 'running') {
    const m = mult((now - st.startAt) / 1000)
    st.m = Math.min(m, st.point)
    for (const p of st.players) if (p.out == null && p.target && p.target <= st.m && p.target <= st.point) cashOut(p, p.target)
    if (m >= st.point) crash()
  } else if (st.phase === 'crashed' && now >= st.until) newRound()
  view?.frame()
}
let started = false
export function start() {
  if (started) return
  started = true
  newRound()
  setInterval(loop, 50)
}

/** Your bet (now, or for the next round if this one has started). */
function join(amount, auto, queued = false) {
  if (!(amount > 0)) return toast('Enter an amount first.', 'err')
  if (st.phase !== 'betting') {
    st.next = { amount, auto }
    toast('Your bet goes in next round.')
    view?.controls()
    return
  }
  if (st.mine) return toast('You’re already in this round.', 'err')
  if (!bet(amount)) return queued ? toast('Not enough credits for your queued Crash bet.', 'err') : toast('Not enough credits. Get more with ＋.', 'err')
  click()
  st.mine = { who: { name: 'You', face: '😎' }, amount, target: auto > 1 ? auto : null, out: null, me: true }
  st.players.unshift(st.mine)
  view?.players()
  view?.controls()
}

export function mount(el) {
  el.innerHTML = `<section class="game crash">
    <div class="cr-hist" aria-label="Last crashes"></div>
    <div class="cr-stage"><canvas></canvas><div class="cr-big"><b></b><small></small></div></div>
    <div class="cr-controls"><div class="cr-bet"></div>
      <label class="cr-auto">Auto cash-out at <input type="number" min="1.01" step="0.01" placeholder="off" inputmode="decimal">×</label>
      <button class="go cr-go"></button></div>
    <div class="cr-players"><h3>Players</h3><ul></ul></div>
    <p class="fair">House edge 4%: one round in 25 crashes straight away at 1.00×. That's how it works on the real ones too.</p>
  </section>`
  const box = betBox(1)
  $('.cr-bet', el).append(box.el)
  const auto = $('.cr-auto input', el)
  const go = $('.cr-go', el)
  go.addEventListener('click', () => {
    if (st.phase === 'running' && st.mine && st.mine.out == null) return cashOut(st.mine, st.m)
    if (st.next) {
      st.next = null
      return view.controls()
    }
    join(box.value, Number(auto.value) || 0)
  })
  const canvas = $('canvas', el)
  const g = canvas.getContext('2d')
  function draw() {
    const w = canvas.clientWidth
    const hh = canvas.clientHeight
    const dpr = Math.min(2, devicePixelRatio || 1)
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(hh * dpr)
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, w, hh)
    const t = st.phase === 'running' ? (Date.now() - st.startAt) / 1000 : st.phase === 'crashed' ? Math.log(st.point) / GROW : 0
    const tMax = Math.max(8, t * 1.15)
    const mMax = Math.max(2, st.m * 1.2)
    const pad = { l: 40, b: 22, t: 10, r: 14 }
    const X = (s) => pad.l + (s / tMax) * (w - pad.l - pad.r)
    const Y = (m) => hh - pad.b - ((m - 1) / (mMax - 1)) * (hh - pad.b - pad.t)
    // grid
    g.strokeStyle = 'rgba(255,255,255,.07)'
    g.fillStyle = '#7d889e'
    g.font = '11px system-ui, sans-serif'
    g.lineWidth = 1
    const step = mMax > 20 ? 10 : mMax > 6 ? 2 : mMax > 3 ? 0.5 : 0.25
    for (let m = 1; m <= mMax; m += step) {
      g.beginPath()
      g.moveTo(pad.l, Y(m))
      g.lineTo(w - pad.r, Y(m))
      g.stroke()
      g.fillText(`${m.toFixed(m < 10 ? 2 : 0)}×`, 2, Y(m) + 4)
    }
    if (st.phase === 'betting') return
    // the curve
    const crashed = st.phase === 'crashed'
    const grad = g.createLinearGradient(0, hh, 0, 0)
    grad.addColorStop(0, crashed ? 'rgba(255,93,93,.05)' : 'rgba(63,220,124,.05)')
    grad.addColorStop(1, crashed ? 'rgba(255,93,93,.35)' : 'rgba(63,220,124,.35)')
    g.beginPath()
    g.moveTo(X(0), Y(1))
    const n = 60
    for (let i = 1; i <= n; i++) {
      const s = (t * i) / n
      g.lineTo(X(s), Y(Math.min(mult(s), st.m)))
    }
    g.lineTo(X(t), Y(1))
    g.closePath()
    g.fillStyle = grad
    g.fill()
    g.beginPath()
    g.moveTo(X(0), Y(1))
    for (let i = 1; i <= n; i++) {
      const s = (t * i) / n
      g.lineTo(X(s), Y(Math.min(mult(s), st.m)))
    }
    g.strokeStyle = crashed ? '#ff5d5d' : '#3fdc7c'
    g.lineWidth = 3
    g.stroke()
    g.font = '22px system-ui, sans-serif'
    g.fillText(crashed ? '💥' : '🚀', X(t) - 11, Y(st.m) - 4)
  }
  view = {
    round() {
      $('.cr-hist', el).innerHTML = st.history.slice(0, 14).map((p) => `<span class="pill ${p < 1.5 ? 'red' : p < 3 ? 'blue' : p < 10 ? 'green' : 'gold'}">${p.toFixed(2)}×</span>`).join('')
      this.players()
      this.controls()
      this.frame()
    },
    players() {
      const list = [...st.players].sort((a, b) => (b.me ? 1e9 : b.amount) - (a.me ? 1e9 : a.amount))
      $('.cr-players ul', el).innerHTML = list
        .slice(0, 16)
        .map((p) => {
          const state = p.out != null ? `<b class="up">${p.out.toFixed(2)}× · ${coins(p.amount * p.out)}</b>` : st.phase === 'crashed' ? '<b class="down">crashed</b>' : '<b class="wait">…</b>'
          return `<li class="${p.me ? 'me' : ''}"><span>${p.who.face} ${esc(p.who.name)}</span><span>${coins(p.amount)}</span>${state}</li>`
        })
        .join('')
      this.controls()
    },
    controls() {
      const mine = st.mine
      go.classList.toggle('cash', st.phase === 'running' && !!mine && mine.out == null)
      go.textContent =
        st.phase === 'running' && mine && mine.out == null
          ? `Cash out ⓒ ${fmt(mine.amount * st.m)}`
          : st.next
            ? 'Queued for next round (cancel)'
            : st.phase === 'betting'
              ? mine
                ? 'You’re in'
                : 'Place bet'
              : 'Bet on the next round'
      go.disabled = st.phase === 'betting' && !!mine
    },
    frame() {
      const big = $('.cr-big', el)
      big.classList.toggle('crashed', st.phase === 'crashed')
      if (st.phase === 'betting') {
        $('b', big).textContent = `${Math.max(0, (st.until - Date.now()) / 1000).toFixed(1)}s`
        $('small', big).textContent = 'Starting soon: place your bets'
      } else {
        $('b', big).textContent = `${st.m.toFixed(2)}×`
        $('small', big).textContent = st.phase === 'crashed' ? 'Crashed' : ''
      }
      if (st.phase === 'running' && st.mine && st.mine.out == null) go.textContent = `Cash out ⓒ ${fmt(st.mine.amount * st.m)}`
      draw()
    },
  }
  view.round()
  return () => (view = null)
}
