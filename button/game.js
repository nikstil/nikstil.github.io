// THE BUTTON: the page. One red button: a click picks the left option, holding it down for a second
// picks the right one. That is the only way to play.

import { newRun, choose, timeOut, view } from './engine.js'
import { ENDINGS, ENDING_LIST, START_MINUTES, MAX_STRIKES } from './story.js'
import { Scene } from './scene.js'
import { wake, sirenLevel, sfx } from './audio.js'

const HOLD_MS = 1000
const LOCK_MS = 600 // after the screen changes, a moment before the button listens again
const $ = (id) => document.getElementById(id)
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))

// Saved on this device: which endings you've found, and whether the last run folded time back (then
// this one remembers what you learned).
const KEY = 'nikstil-button'
const store = { found: [], loops: 0, remember: false }
try {
  Object.assign(store, JSON.parse(localStorage.getItem(KEY) || '{}'))
} catch {}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {}
}

const scene = new Scene($('scene'))
const btn = $('btn')
const bar = $('bar')
const ring = btn.querySelector('.ring circle')
const RING = 2 * Math.PI * 47
const optA = $('optA')
const optB = $('optB')
const fillB = optB.querySelector('.fill')

let mode = 'title' // title · how · play · end · list
let run = null
let lockUntil = 0
let timer = null // { total, left } seconds, on a timed step
let press = null // the button going down: { at, held, blocked }

// ================= The button =================
function pressStart() {
  wake()
  if (press) return
  const now = performance.now()
  press = { at: now, held: false, blocked: now < lockUntil }
  btn.classList.add('down')
  sfx.down()
}
function pressEnd() {
  if (!press) return
  const p = press
  press = null
  btn.classList.remove('down')
  if (!p.blocked && !p.held) act('a')
}
function pressCancel() {
  press = null
  btn.classList.remove('down')
}
btn.addEventListener('pointerdown', (e) => {
  if (e.button > 0) return
  e.preventDefault()
  btn.focus({ preventScroll: true })
  try {
    btn.setPointerCapture(e.pointerId)
  } catch {}
  pressStart()
})
btn.addEventListener('pointerup', pressEnd)
btn.addEventListener('pointercancel', pressCancel)
btn.addEventListener('contextmenu', (e) => e.preventDefault())
// (the button can be pressed from the keyboard too: Space or Enter, the same click and hold)
const isKey = (e) => e.key === ' ' || e.key === 'Enter'
addEventListener('keydown', (e) => {
  if (!isKey(e)) return
  e.preventDefault()
  if (!e.repeat) pressStart()
})
addEventListener('keyup', (e) => {
  if (!isKey(e)) return
  e.preventDefault()
  pressEnd()
})
addEventListener('blur', pressCancel)

// ================= What a press does =================
function act(which) {
  if (performance.now() < lockUntil) return
  // light up what you picked for a moment, then move on
  lockUntil = performance.now() + 1000
  timer = null
  ;(which === 'a' ? optA : optB).classList.add('picked')
  which === 'a' ? sfx.click() : sfx.hold()
  setTimeout(() => go(which), 180)
}
function go(which) {
  if (mode === 'title') which === 'a' ? start() : show('how')
  else if (mode === 'how') which === 'a' ? start() : show('title')
  else if (mode === 'end') which === 'a' ? start() : show('list')
  else if (mode === 'list') which === 'a' ? start() : show('title')
  else if (mode === 'play') {
    choose(run, which)
    next()
  }
}

function start() {
  run = newRun(store.remember)
  if (store.remember) {
    store.remember = false
    save()
  }
  show('play')
}

function next() {
  if (run.end) return finish()
  show('play')
}

function finish() {
  const e = ENDINGS[run.end]
  if (!store.found.includes(run.end)) store.found.push(run.end)
  if (run.end === 'again') {
    store.loops++
    store.remember = true
  }
  save()
  sirenLevel(0)
  if (e.kind === 'bad') {
    sfx.boom()
    $('top').classList.remove('shake')
    void $('top').offsetWidth
    $('top').classList.add('shake')
  } else if (e.kind === 'loop') sfx.rewind()
  else sfx.good()
  show('end')
}

/** The timer on this step ran out: a strike (three and it's over). */
function strikeOut() {
  timer = null
  timeOut(run)
  const n = run.fails
  const el = $('strike')
  el.innerHTML = `YOU FROZE<small>STRIKE ${n} OF ${MAX_STRIKES}</small>`
  el.classList.remove('on')
  void el.offsetWidth
  el.classList.add('on')
  sfx.strike()
  next()
}

// ================= Drawing the action bar =================
const CARRY = [
  ['cat', '🐈 Biscuit'],
  ['okafor', '👵 Mrs. Okafor'],
  ['theo', '🧒 Theo'],
  ['keycard', '🪪 keycard'],
  ['tools', '🧰 toolbox'],
  ['shard', '💠 shard'],
  ['freq', '📻 104.7'],
]
function carrying(f) {
  const out = CARRY.filter(([k]) => f[k]).map(([, v]) => v)
  if (f.codeA || f.codeB) out.push(`🔐 ${f.codeA ? 'LYRA' : '????'}-${f.codeB ? '0451' : '????'}`)
  if (f.hurt) out.push('🩹 hurt')
  return out.join('  ·  ')
}

function show(m) {
  mode = m
  const now = performance.now()
  lockUntil = now + LOCK_MS
  timer = null
  optA.classList.remove('picked')
  optB.classList.remove('picked')
  let a = '',
    b = '',
    text = '',
    say = '',
    banner = '',
    sceneName = 'title'
  const hud = $('hud')
  hud.classList.toggle('off', m !== 'play')
  $('carry').textContent = ''
  const found = store.found.length

  if (m === 'title') {
    banner = `<h1>THE BUTTON</h1><p>${found ? `ENDINGS FOUND · ${found} OF ${ENDING_LIST.length}` : 'ONE BUTTON · FIVE ENDINGS'}</p>`
    text = esc(
      `It is 06:42 in New Halden. In fifteen minutes, a warhead lands. All you have is this button.${
        store.remember ? ' (You remember something. You’re not sure what yet.)' : ''
      }`,
    )
    a = 'Begin'
    b = 'How it works'
    sirenLevel(0.25)
  } else if (m === 'how') {
    banner = '<h1>HOW</h1><p>ONE BUTTON · TWO CHOICES</p>'
    text = esc(
      'Click the button for the left choice. Hold it down for one second for the right one: watch the yellow ring fill. Every step takes minutes off the clock. Some choices also have a timer: let it run out and you freeze. That’s a strike. Three strikes and it’s over, whatever you choose.',
    )
    a = 'Begin'
    b = 'Back'
  } else if (m === 'play') {
    const v = view(run)
    sceneName = v.scene
    text = esc(v.text)
    say = v.say
    a = v.a
    b = v.b
    if (v.timer) timer = { total: v.timer, left: v.timer, lastTick: Math.ceil(v.timer) }
    const clock = $('clock')
    clock.textContent = `IMPACT IN ${String(run.t).padStart(2, '0')} MIN`
    clock.classList.toggle('crit', run.t <= 3)
    $('carry').textContent = carrying(run.f)
    $('strikes')
      .querySelectorAll('i')
      .forEach((el, i) => el.classList.toggle('on', i < run.fails))
    sirenLevel(SIREN[v.scene] ?? 0.5)
  } else if (m === 'end') {
    const v = view(run)
    sceneName = v.scene
    banner = `<h1 class="${v.kind === 'bad' ? 'bad' : ''}">${esc(v.title)}</h1><p>ENDING ${v.n} OF ${ENDING_LIST.length}${v.kind === 'bad' ? '' : found === ENDING_LIST.length ? ' · YOU’VE FOUND THEM ALL' : ''}</p>`
    text = esc(v.text)
    a = 'Try again'
    b = `Endings found (${found}/${ENDING_LIST.length})`
  } else if (m === 'list') {
    sceneName = 'title'
    banner = `<h1>ENDINGS</h1><p>${found} OF ${ENDING_LIST.length} FOUND</p>`
    text =
      '<div class="rows">' +
      ENDING_LIST.map((id) => {
        const e = ENDINGS[id]
        return store.found.includes(id) ? `<span>${e.n} · ${esc(e.title)}</span>` : `<span class="no">${e.n} · ${'?'.repeat(e.title.length)}</span>`
      }).join('') +
      '</div>'
    a = 'Try again'
    b = 'Back to the start'
  }

  scene.set(sceneName, now / 1000)
  $('banner').innerHTML = banner
  $('text').innerHTML = text
  $('say').textContent = say
  optA.querySelector('span').textContent = a
  optB.querySelector('span').textContent = b
  btn.setAttribute('aria-label', `The button. Click: ${a}. Hold for one second: ${b}.`)
  $('timer').hidden = !timer
  fit()
  bar.classList.remove('fresh')
  void bar.offsetWidth
  bar.classList.add('fresh')
}

/** Long steps on small screens: shrink the words a little until the whole bar fits. */
function fit() {
  let k = 1
  bar.style.setProperty('--fit', k)
  while (bar.scrollHeight > bar.clientHeight + 1 && k > 0.6) {
    k -= 0.04
    bar.style.setProperty('--fit', k.toFixed(2))
  }
}
addEventListener('resize', () => fit())

// how loud the sirens are in each place
const SIREN = { room: 1, tv: 0.7, hall: 1, flat: 0.6, stairs: 0.8, stairsDark: 0.5, door: 0.8, machine: 0.4, roof: 1, courier: 0.2, fly: 0.35, dish: 0.8, terminal: 0.5, radar: 0.4, lobby: 1, street: 1, van: 0.4, road: 0.3, quarry: 0.2, metro: 0.7, metroOut: 0.9, tunnel: 0.2, deep: 0.15, vent: 0.4, observatory: 0.3, domeTop: 0.4, domeIn: 0.1, telescope: 0.1, cavern: 0 }

// ================= Every frame =================
let last = performance.now()
function frame(ts) {
  const dt = Math.min(0.1, (ts - last) / 1000)
  last = ts
  const locked = ts < lockUntil
  btn.classList.toggle('locked', locked)
  bar.classList.toggle('locked', locked)

  // holding: the ring and the right-hand option fill up, and at one second it counts
  let hp = 0
  if (press && !press.blocked && !press.held) {
    hp = clamp((ts - press.at) / HOLD_MS)
    if (hp >= 1) {
      press.held = true
      hp = 0
      act('b')
    }
  }
  ring.style.strokeDashoffset = RING * (1 - hp)
  fillB.style.transform = `scaleX(${hp})`

  // the decision timer (it waits while the screen settles, while you're pressing, and while the tab is hidden)
  if (mode === 'play' && timer && !locked && !document.hidden) {
    if (!(press && !press.blocked)) timer.left -= dt
    const left = Math.max(0, timer.left)
    const el = $('timer')
    el.querySelector('i').style.transform = `scaleX(${left / timer.total})`
    el.querySelector('span').textContent = `DECIDE · ${Math.ceil(left)}`
    el.classList.toggle('low', left < 3)
    if (Math.ceil(left) < timer.lastTick) {
      timer.lastTick = Math.ceil(left)
      if (left < 3.5) sfx.tick()
    }
    if (timer.left <= 0) strikeOut()
  }

  scene.draw({
    t: ts / 1000,
    m: run && mode === 'play' ? clamp(1 - run.t / START_MINUTES) : 0.1,
    f: run?.f ?? {},
  })
  requestAnimationFrame(frame)
}

show('title')
requestAnimationFrame(frame)
// (for testing from the console)
window.theButton = { get mode() { return mode }, get run() { return run }, store }
