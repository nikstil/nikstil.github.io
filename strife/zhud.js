// The Zombies HUD: the round in red chalk (tally marks to five, then numbers), everyone's points,
// your perks, the power-ups running, what you can buy where you're standing, and being down.

import { PERKS, PERK_LIST, POWERUPS } from './zombies.js'

const $ = (s) => document.querySelector(s)
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`)
const PERK_MARK = { jug: 'J', speed: 'SC', tap: 'DT', revive: 'QR', stamin: 'SU' }
const PU_MARK = { insta: '☠', double: 'x2', sale: '$' }
const COLORS = ['#f2f2f2', '#6fb6ff', '#ffd23f', '#6fdc6f'] // players 1-4, as in Black Ops
let root = null
let shown = { round: -1, perks: '', points: '', pu: '' }
let flashUntil = 0
let announceUntil = 0
const popups = []

/** Builds (once) and resets the HUD for a new game. */
export function reset() {
  if (!root) {
    root = document.createElement('div')
    root.className = 'z-hud'
    root.id = 'z-hud'
    root.innerHTML = `<canvas class="z-round" id="z-round" width="220" height="110"></canvas>
      <div class="z-perks" id="z-perks"></div>
      <div class="z-points" id="z-points"></div>
      <div class="z-powerups" id="z-powerups"></div>
      <div class="z-prompt" id="z-prompt"><b></b><small></small></div>
      <div class="z-down" id="z-down" hidden><b></b><span></span><div class="bar"><i></i></div></div>
      <div class="z-announce" id="z-announce"><b></b><small></small></div>`
    $('#hud').append(root)
  }
  shown = { round: -1, perks: '', points: '', pu: '' }
  popups.length = 0
  $('#z-announce').classList.remove('on')
}

/** The round, chalked up: strokes to five (the fifth across), then the number. */
function drawRound(round, flash) {
  const c = $('#z-round')
  const g = c.getContext('2d')
  g.clearRect(0, 0, c.width, c.height)
  if (round < 1) return
  let s = round * 7919
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  g.strokeStyle = g.fillStyle = flash ? '#f4efe6' : '#a0120c'
  g.shadowColor = flash ? '#fff' : '#ff2a1a'
  g.shadowBlur = flash ? 14 : 6
  g.lineCap = 'round'
  const stroke = (x0, y0, x1, y1) => {
    // a chalky stroke: a few slightly different passes
    for (let k = 0; k < 3; k++) {
      g.lineWidth = 5 - k * 1.3
      g.globalAlpha = 0.9 - k * 0.25
      g.beginPath()
      g.moveTo(x0 + (r() - 0.5) * 3, y0 + (r() - 0.5) * 3)
      g.lineTo(x1 + (r() - 0.5) * 3, y1 + (r() - 0.5) * 3)
      g.stroke()
    }
    g.globalAlpha = 1
  }
  if (round <= 5) {
    for (let k = 0; k < Math.min(4, round); k++) stroke(22 + k * 26, 18, 18 + k * 26 + r() * 6, 92)
    if (round === 5) stroke(6, 70, 118, 34)
  } else {
    g.font = 'italic bold 84px "Brush Script MT", "Segoe Script", Georgia, serif'
    g.textBaseline = 'middle'
    g.fillText(String(round), 10, 60)
  }
}

/** Every frame. me: your survivor; w: who you're watching. */
export function update(game, me, w, dt) {
  const z = game.z
  if (!z || !root) return
  const now = game.time
  // the round (it flashes white when a new one starts, BO-style)
  const flash = performance.now() < flashUntil && Math.floor(performance.now() / 180) % 2 === 0
  const rk = `${z.round}|${flash}`
  if (shown.round !== rk) {
    shown.round = rk
    drawRound(z.round, flash)
  }
  // perks
  const who = w ?? me
  const pk = who ? PERK_LIST.filter((k) => who.perks?.[k]).join(',') : ''
  if (shown.perks !== pk) {
    shown.perks = pk
    $('#z-perks').innerHTML = pk ? pk.split(',').map((k) => `<i style="--c:${PERKS[k].color}" title="${esc(PERKS[k].name)}">${PERK_MARK[k]}</i>`).join('') : ''
  }
  // points, everyone's (yours on top)
  const people = z.survivors
  const ptsKey = people.map((a) => `${a.id}:${a.money}:${a.down ? 1 : 0}:${a.alive ? 1 : 0}`).join('|')
  if (shown.points !== ptsKey) {
    shown.points = ptsKey
    $('#z-points').innerHTML = people
      .map((a, k) => ({ a, k }))
      .sort((p, q) => (q.a === me) - (p.a === me))
      .map(({ a, k }) => `<div class="${a === me ? 'me' : ''} ${a.down ? 'down' : ''} ${a.alive ? '' : 'dead'}" style="--c:${COLORS[k % 4]}"><span>${esc(a.name)}</span><b>${a.money}</b></div>`)
      .join('')
  }
  // the points you just got, floating up
  for (let k = popups.length - 1; k >= 0; k--) {
    const p = popups[k]
    p.t += dt
    p.el.style.transform = `translateY(${-p.t * 40}px)`
    p.el.style.opacity = String(Math.max(0, 1 - p.t / 0.9))
    if (p.t > 0.9) {
      p.el.remove()
      popups.splice(k, 1)
    }
  }
  // power-ups running
  const pu = Object.entries(z.timers)
    .filter(([, until]) => until > now)
    .map(([k, until]) => `<i class="${until - now < 5 && Math.floor(now * 4) % 2 ? 'blink' : ''}" title="${esc(POWERUPS[k].name)}">${PU_MARK[k]}<small>${Math.ceil(until - now)}</small></i>`)
    .join('')
  if (shown.pu !== pu) {
    shown.pu = pu
    $('#z-powerups').innerHTML = pu
  }
  // what's here to buy (or do)
  const pr = me && me.alive && !me.down && game.phase !== 'over' ? z.prompt(me) : null
  const pe = $('#z-prompt')
  pe.classList.toggle('on', !!pr)
  pe.classList.toggle('no', !!pr && !pr.ok)
  if (pr) {
    pe.firstChild.textContent = pr.text
    pe.lastChild.textContent = pr.sub ?? ''
  }
  // down (or picking someone up)
  const dn = $('#z-down')
  let show = false
  if (me?.alive && me.down) {
    show = true
    dn.children[0].textContent = 'You are down!'
    const by = me.revivedBy ?? z.survivors.find((b) => b.reviving === me)
    dn.children[1].textContent = me.selfRevive ? 'Quick Revive is getting you back up…' : by ? `${by.name} is reviving you…` : `Bleeding out in ${Math.max(0, Math.ceil(me.bleedAt - now))} s · keep shooting!`
    dn.children[2].firstChild.style.width = `${Math.round(Math.min(1, me.reviveProg || (me.selfRevive ? (now - me.downAt) / 8 : 0)) * 100)}%`
  } else if (me?.reviving) {
    show = true
    dn.children[0].textContent = ''
    dn.children[1].textContent = `Reviving ${me.reviving.name}…`
    dn.children[2].firstChild.style.width = `${Math.round(Math.min(1, me.reviving.reviveProg ?? 0) * 100)}%`
  }
  dn.hidden = !show
  dn.classList.toggle('mine', !!me?.down)
  if (performance.now() > announceUntil) $('#z-announce').classList.remove('on')
}

/** A big line in the middle for a moment (a power-up, the power coming on...). */
export function announce(text, sub = '', secs = 2.5, red = false) {
  if (!root) return
  const a = $('#z-announce')
  a.firstChild.textContent = text
  a.lastChild.textContent = sub
  a.classList.add('on')
  a.classList.toggle('red', red)
  announceUntil = performance.now() + secs * 1000
}
/** The announcer's voice (if the browser has one): deep and slow, the way the game does it. */
export function speak(text) {
  try {
    if (!window.speechSynthesis || document.hidden) return
    const u = new SpeechSynthesisUtterance(text)
    u.pitch = 0.3
    u.rate = 0.82
    u.volume = 0.9
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  } catch {}
}
export function newRound() {
  flashUntil = performance.now() + 2600
}
/** "+50" by your points. */
export function points(n) {
  if (!root) return
  const host = $('#z-points .me') ?? $('#z-points')
  if (!host) return
  const el = document.createElement('em')
  el.className = 'z-pop'
  el.textContent = `+${n}`
  host.append(el)
  popups.push({ el, t: 0 })
  if (popups.length > 8) popups.shift().el.remove()
}

/** The table at the end: everyone's points, kills, headshots, downs and revives. */
export function board(game) {
  const t = document.createElement('table')
  t.innerHTML = '<tr><th>Player</th><th>Points</th><th>Kills</th><th>Headshots</th><th>Downs</th><th>Revives</th></tr>'
  game.z.survivors.forEach((a, k) => {
    const tr = document.createElement('tr')
    tr.innerHTML = '<td></td><td></td><td></td><td></td><td></td><td></td>'
    tr.children[0].textContent = a.name
    tr.children[0].style.color = COLORS[k % 4]
    ;[a.money, a.kills, a.mvps, a.deaths, a.assists].forEach((v, i) => (tr.children[i + 1].textContent = v))
    t.append(tr)
  })
  return t
}
/** Your best round on each map. */
const BEST = 'strife-zombies-best'
export function best(mapId, round = null) {
  let all = {}
  try {
    all = JSON.parse(localStorage.getItem(BEST) || '{}') ?? {}
  } catch {}
  const before = all[mapId] ?? 0
  if (round != null && round > before) {
    all[mapId] = round
    try {
      localStorage.setItem(BEST, JSON.stringify(all))
    } catch {}
  }
  return before
}
