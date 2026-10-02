// BRAINS FIRST on nikstil.com: LAWN OF THE DEAD the other way round. The garden is planted already;
// you send the zombies. It runs on LAWN OF THE DEAD's engine (touchgrass/sim.js in 'reverse' mode),
// drawing and sound; this file has the menus, saving, input and the loop.

import { ZOMBIE_BY_ID } from '/touchgrass/data.js'
import { createGame } from '/touchgrass/sim.js'
import { W, H, drawGamePixel, toLawn, seedRect, beltRect } from '/touchgrass/draw.js'
import { playSfx, setMusic, setSound, setVolume, getVolume, unlockAudio } from '/touchgrass/audio.js'
import { PUZZLES, asLevel, endless } from '/touchphone/levels.js'
import { drawTitleScene } from '/touchgrass/scene.js'
import { MODES } from '/touchphone/minigames.js'
import { AREAS } from '/touchgrass/data.js'

const $ = (sel) => document.querySelector(sel)
const q = new URLSearchParams(location.search)
if (q.has('embed')) document.documentElement.classList.add('embed')

// ================= Saved progress =================
const SAVE_KEY = 'touchphone-save'
const MUTE_KEY = 'touchgrass-mute' // one mute switch for both games
const ENDLESS_SUN = 300
const fresh = () => ({ beaten: [], best: 0, seed: 1 })
let save = load()
function load() {
  try {
    return { ...fresh(), ...JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') }
  } catch {
    return fresh()
  }
}
function store() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // private browsing: progress just isn't kept
  }
}
const nextPuzzle = () => PUZZLES.find((p) => !save.beaten.includes(p.id)) ?? null
const open = (p) => p.id === 1 || save.beaten.includes(p.id) || save.beaten.includes(p.id - 1)
const endlessOpen = () => save.beaten.length >= PUZZLES.length

// ================= Sound =================
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
})()
setSound({ sfx: !muted, music: !muted })
function showMute() {
  $('#mute').textContent = muted ? '🔇' : '🔊'
}
function toggleMute() {
  muted = !muted
  setSound({ sfx: !muted, music: !muted })
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {}
  showMute()
}
$('#mute').addEventListener('click', toggleMute)
showMute()
$('#full').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen()
  else $('#view').requestFullscreen?.().catch(() => {})
})
$('#full').hidden = !document.documentElement.requestFullscreen

// ================= Screens =================
const SCREENS = ['title', 'levels', 'paused', 'lost', 'won', 'minis']
let screen = 'title'
let game = null
let ui = null
let banners = []
let current = null // { puzzle } or { endless: streak, sun }
let endTimer = 0
function show(name) {
  screen = name
  for (const s of SCREENS) $(`#${s}`).hidden = s !== name
  $('#menu-btn').hidden = !(game && name === 'play')
  if (name === 'title') {
    game = null
    setMusic('title')
    renderTitle()
  }
  if (name === 'levels') renderLevels()
  if (name === 'minis') renderMinis()
  $('#bar-sub').textContent = game && name !== 'title' ? game.level.label + (current?.puzzle ? ` · ${game.level.title}` : '') : 'You’re the zombies now'
}

function renderTitle() {
  const nx = nextPuzzle()
  $('#next-label').textContent = save.beaten.length ? (nx ? 'Next puzzle' : 'All puzzles solved') : 'Puzzles'
  $('#next-sub').textContent = nx ? `Puzzle ${nx.id} · ${nx.name}` : 'Play any of them again, or go endless'
  $('#endless-btn').disabled = !endlessOpen()
  $('#endless-btn').title = endlessOpen() ? '' : `Solve all ${PUZZLES.length} puzzles first`
  $('#record').textContent = save.best ? `♾️ Endless record: ${save.best} garden${save.best === 1 ? '' : 's'}` : `🧩 ${save.beaten.length} / ${PUZZLES.length} puzzles solved`
}

function renderLevels() {
  const list = $('#puzzle-list')
  list.replaceChildren()
  for (const p of PUZZLES) {
    const b = document.createElement('button')
    b.className = `puzzle${save.beaten.includes(p.id) ? ' done' : ''}`
    b.disabled = !open(p)
    b.innerHTML = `<b>${p.id}. ${p.name}</b><small>${p.area === 'night' ? '🌙 Night' : '☀️ Day'} · ${p.scrollers.length} zombies${save.beaten.includes(p.id) ? ' · ✓ solved' : ''}</small>`
    b.addEventListener('click', () => startPuzzle(p))
    list.append(b)
  }
}

function startPuzzle(p) {
  current = { puzzle: p }
  begin(asLevel(p))
}
function startEndless(streak = 0, sun = ENDLESS_SUN) {
  if (streak === 0) save.seed = 1 + Math.floor(Math.random() * 1e6)
  store()
  current = { endless: streak, sun }
  begin(asLevel(endless(streak, save.seed)), sun)
}
function begin(level, sun) {
  clearTimeout(endTimer)
  unlockAudio()
  game = createGame(null, { level, sun })
  ui = { hover: null, mouse: null, holding: null }
  banners = []
  const tip = current.puzzle?.tip ?? (level.mini === 'vase' ? 'Click a vase to break it. Zombies inside go for the brains; plants take root.' : level.mini === 'conveyor' ? 'No sun: zombies arrive on the belt. Pick one, then a square right of the line.' : null)
  banners.push({ text: level.title, kind: 'go', until: performance.now() + 2400 })
  // the puzzle's tip, once the intro's done
  if (tip) banners.push({ text: tip, kind: 'info', from: performance.now() + 3200, until: performance.now() + 9500 })
  setMusic(level.area)
  paused = false
  show('play')
}

let paused = false
function pause(on = true) {
  if (!game || game.phase === 'won' || game.phase === 'lost') return
  paused = on
  show(on ? 'paused' : 'play')
}
$('#menu-btn').addEventListener('click', () => pause(true))
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game && screen === 'play') pause(true)
})

function onEvents() {
  for (const e of game.events) {
    if (e.type === 'sfx') playSfx(e.name)
    else if (e.type === 'banner') banners.push({ text: e.text, kind: e.kind, until: performance.now() + e.time * 1000 })
    else if (e.type === 'won') endTimer = setTimeout(() => finish(true), 700)
    else if (e.type === 'lost') endTimer = setTimeout(() => finish(false), 1200)
  }
  game.events.length = 0
}

// ================= Mini-games =================
// (minigames.js: Conveyor Chaos and Vase Breaker, 10 levels each and a Random one)
const miniDone = (mode) => save.minis?.[mode] ?? []
const miniOpen = (mode, n) => n === 0 || miniDone(mode).includes(n) || miniDone(mode).includes(n - 1)
function renderMinis() {
  const list = $('#mini-list')
  list.replaceChildren()
  for (const m of MODES) {
    const card = document.createElement('div')
    card.className = 'mini-card'
    card.innerHTML = `<h3>${m.name}</h3><p>${m.blurb}</p><div class="mini-levels"></div><p class="mini-random">${m.randomBlurb}</p>`
    const row = card.querySelector('.mini-levels')
    m.levels.forEach((l, n) => {
      const b = document.createElement('button')
      b.className = `lvl${miniDone(m.id).includes(n) ? ' done' : ''}`
      b.textContent = String(n + 1)
      b.title = `${l.title} (${AREAS[l.area].name})`
      b.disabled = !miniOpen(m.id, n)
      b.addEventListener('click', () => startMini(m.id, n))
      row.append(b)
    })
    const r = document.createElement('button')
    r.className = 'lvl random'
    r.textContent = '🎲 Random'
    r.title = m.randomBlurb
    r.addEventListener('click', () => startMini(m.id, 'random'))
    row.append(r)
    list.append(card)
  }
}
function startMini(mode, n, level = null) {
  const m = MODES.find((x) => x.id === mode)
  current = { mini: { mode, n, level: level ?? (n === 'random' ? m.random() : m.levels[n]) } }
  begin(current.mini.level, 0)
}
function finishMini(won) {
  const { mode, n, level } = current.mini
  const m = MODES.find((x) => x.id === mode)
  const brains = game.routers.filter((r) => r.eaten).length
  if (won && n !== 'random' && !miniDone(mode).includes(n)) save.minis = { ...save.minis, [mode]: [...miniDone(mode), n] }
  store()
  if (!won) {
    $('#lost-copy').textContent = `${level.label}: you got ${brains} of 5 brains before the ${mode === 'vase' ? 'vases' : 'belt'} ran out.`
    show('lost')
    return
  }
  $('#won-kicker').textContent = `${m.name} · ${level.label}`
  $('#won-title').textContent = 'All five brains. Delicious.'
  $('#won-copy').textContent = n === 'random' ? 'Another one? It’s different every time.' : n === 9 ? `That’s all of ${m.name}. Random has no end.` : ''
  const buttons = $('#won-buttons')
  buttons.replaceChildren()
  const button = (text, go, fn) => {
    const b = document.createElement('button')
    b.className = `btn${go ? ' go' : ''}`
    b.textContent = text
    b.addEventListener('click', fn)
    buttons.append(b)
  }
  if (n === 'random') button('🎲 Another random one', true, () => startMini(mode, 'random'))
  else if (n < 9) button(`Next: ${m.name} ${n + 2} →`, true, () => startMini(mode, n + 1))
  button('Mini-games', false, () => {
    game = null
    show('minis')
  })
  button('Main menu', false, () => show('title'))
  show('won')
}

function finish(won) {
  if (!game) return
  if (current.mini) return finishMini(won)
  const routers = game.routers.filter((r) => r.eaten).length
  if (!won) {
    if (current.endless != null) {
      const cleared = current.endless
      if (cleared > save.best) save.best = cleared
      store()
      $('#lost-copy').textContent = `You cleared ${cleared} garden${cleared === 1 ? '' : 's'} (${routers}/5 brains on this one). Record: ${save.best}.`
    } else $('#lost-copy').textContent = `You got ${routers} of 5 brains. Out of zombies and out of sun. The plants are insufferable about it.`
    show('lost')
    return
  }
  const buttons = $('#won-buttons')
  buttons.replaceChildren()
  const button = (text, go, fn) => {
    const b = document.createElement('button')
    b.className = `btn${go ? ' go' : ''}`
    b.textContent = text
    b.addEventListener('click', fn)
    buttons.append(b)
  }
  if (current.endless != null) {
    const n = current.endless + 1
    if (n > save.best) save.best = n
    store()
    $('#won-kicker').textContent = `Endless · garden ${n}`
    $('#won-title').textContent = 'All five brains. Delicious.'
    $('#won-copy').textContent = `You keep your ${game.sun} sun for the next garden. Record: ${save.best}.`
    const sun = game.sun
    button('Next garden →', true, () => startEndless(n, sun))
    button('Main menu', false, () => show('title'))
    show('won')
    return
  }
  const p = current.puzzle
  const first = !save.beaten.includes(p.id)
  if (first) save.beaten.push(p.id)
  store()
  const nx = PUZZLES.find((x) => x.id === p.id + 1)
  $('#won-kicker').textContent = `Puzzle ${p.id} solved${first ? '' : ' (again)'}`
  $('#won-title').textContent = 'All five brains. Delicious.'
  $('#won-copy').textContent = nx
    ? 'The garden is overrun. The plants are filing a complaint.'
    : `That’s every puzzle. Endless is open: one garden after another, and your sun carries over.`
  if (nx) button(`Next: ${nx.name} →`, true, () => startPuzzle(nx))
  else button('♾️ Endless', true, () => startEndless())
  button('Main menu', false, () => show('title'))
  show('won')
}

// ================= Input =================
const canvas = $('#screen')
const ctx = canvas.getContext('2d')
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const r = canvas.getBoundingClientRect()
  const scale = Math.max(1, (r.width / W) * dpr)
  canvas.width = Math.round(W * scale)
  canvas.height = Math.round(H * scale)
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
}
new ResizeObserver(resize).observe(canvas)
function point(e) {
  const r = canvas.getBoundingClientRect()
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
}
const inside = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
canvas.addEventListener('pointermove', (e) => {
  if (!game) return
  ui.mouse = point(e)
  ui.hover = toLawn(game, ui.mouse.x, ui.mouse.y)
})
canvas.addEventListener('pointerleave', () => {
  if (ui) ui.hover = null
})
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  if (ui) ui.holding = null
})
canvas.addEventListener('pointerdown', (e) => {
  unlockAudio()
  if (!game || screen !== 'play' || paused || e.button === 2) return
  const p = point(e)
  ui.mouse = p
  ui.hover = toLawn(game, p.x, p.y)
  click(p)
})
const WHY = {
  line: 'Right of the red line (a Bungee Thief can go anywhere).',
  sun: 'Not enough sun.',
  vase: 'There’s a vase in the way.',
}
function click(p) {
  const g = game
  if (g.phase !== 'play') return
  const lawn = toLawn(g, p.x, p.y)
  // the zombie belt (Conveyor Chaos)
  if (g.belt) {
    for (let i = 0; i < g.belt.items.length; i++) {
      if (!inside(p, beltRect(i, g.belt.items[i]))) continue
      ui.holding = ui.holding?.from === 'belt' && ui.holding.index === i ? null : { zid: g.belt.items[i].id, from: 'belt', index: i }
      playSfx('pick')
      return
    }
  }
  // vases (Vase Breaker)
  if (g.vases.length && lawn.inside && !ui.holding && g.breakVase(lawn.r, lawn.c)) return
  for (let i = 0; i < g.zseeds.length; i++) {
    if (!inside(p, seedRect(i))) continue
    const s = g.zseeds[i]
    if (ui.holding?.index === i) ui.holding = null
    else if (g.sun >= s.cost) {
      ui.holding = { zid: s.id, index: i }
      playSfx('pick')
    } else {
      playSfx('buzz')
      banners.push({ text: `${ZOMBIE_BY_ID[s.id].name} costs ${s.cost} sun.`, kind: 'info', until: performance.now() + 1400 })
    }
    return
  }
  // Sun (also while holding a zombie)
  if (g.collectAt(lawn.x, lawn.y)) return
  const h = ui.holding
  if (h?.from === 'belt' && lawn.inside) {
    const why = g.whyNotZombieAt(h.zid, lawn.r, lawn.c)
    if (!why && g.placeBeltZombie(h.index, lawn.r, lawn.c)) ui.holding = null
    else {
      playSfx('buzz')
      if (WHY[why]) banners.push({ text: WHY[why], kind: 'info', until: performance.now() + 1400 })
    }
    return
  }
  if (h && lawn.inside) {
    const why = g.whyNotScroller(h.index, lawn.r, lawn.c)
    if (!why && g.placeScroller(h.index, lawn.r, lawn.c)) ui.holding = null
    else {
      playSfx('buzz')
      if (WHY[why]) banners.push({ text: WHY[why], kind: 'info', until: performance.now() + 1400 })
    }
  }
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') return toggleMute()
  if (!game) return
  if (e.key === 'Escape') {
    if (screen === 'play' && ui.holding) ui.holding = null
    else if (screen === 'play') pause(true)
    else if (screen === 'paused') pause(false)
    return
  }
  if (e.key === ' ' && (screen === 'play' || screen === 'paused')) {
    e.preventDefault()
    pause(screen === 'play')
    return
  }
  if (screen !== 'play') return
  const n = '12345678'.indexOf(e.key)
  if (n >= 0 && game.belt?.items[n]) {
    const r = beltRect(n, game.belt.items[n])
    click({ x: r.x + 10, y: r.y + 10 })
  } else if (n >= 0 && n < game.zseeds.length) {
    const r = seedRect(n)
    click({ x: r.x + 10, y: r.y + 10 })
  }
})

// ================= Volume (the pause menu's sliders) =================
{
  const v = getVolume()
  const music = document.querySelector('#vol-music')
  const sfx = document.querySelector('#vol-sfx')
  music.value = Math.round(v.music * 100)
  sfx.value = Math.round(v.sfx * 100)
  music.addEventListener('input', () => setVolume({ music: music.value / 100 }))
  sfx.addEventListener('input', () => setVolume({ sfx: sfx.value / 100 }))
  sfx.addEventListener('change', () => playSfx('sun'))
}

// ================= Buttons =================
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-do]')
  if (!b) return
  unlockAudio()
  const what = b.dataset.do
  if (what === 'next') {
    const nx = nextPuzzle()
    if (nx) startPuzzle(nx)
    else show('levels')
  } else if (what === 'levels') show('levels')
  else if (what === 'minis') show('minis')
  else if (what === 'endless') startEndless()
  else if (what === 'title') {
    paused = false
    show('title')
  } else if (what === 'resume') pause(false)
  else if (what === 'restart') {
    paused = false
    if (current?.mini) startMini(current.mini.mode, current.mini.n, current.mini.level)
    else if (current?.endless != null) startEndless(current.endless, current.sun)
    else if (current?.puzzle) startPuzzle(current.puzzle)
  }
})

// ================= The loop =================
let last = performance.now()
let acc = 0
const STEP = 1 / 60
let showcase = null
function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min(0.25, (now - last) / 1000)
  last = now
  if (game && screen === 'play' && !paused) {
    acc += dt
    while (acc >= STEP) {
      game.update(STEP)
      acc -= STEP
    }
    onEvents()
  } else acc = 0
  if (game && (game.phase === 'won' || game.phase === 'lost')) game.update(dt)
  if (!game) {
    drawTitleScene(ctx, now / 1000, { night: true, title: ['BRAINS', 'FIRST'] })
    return
  }
  const g = game ?? titleScene(now)
  banners = banners.filter((b) => b.until > now)
  const view = game ? { ...ui, banners: banners.filter((b) => !b.from || b.from <= now) } : { banners: [], hover: null, holding: null }
  drawGamePixel(ctx, g, view)
}
/** Behind the title screen: a planted garden with zombies lined up at the red line. */
function titleScene(now) {
  if (!showcase) {
    showcase = createGame(null, { level: asLevel(PUZZLES[6]), skipIntro: true })
    const g = showcase
    g.update(0.001)
    ;[
      ['scroller', 0, 5.7],
      ['vr', 1, 6.4],
      ['cryptobro', 2, 5.9],
      ['beanie', 3, 6.8],
      ['selfie', 4, 6.1],
    ].forEach(([id, r, x]) => g._spawn(id, r, x))
    g.phase = 'won' // nothing moves
  }
  showcase.t = now / 1000
  return showcase
}
requestAnimationFrame(frame)
show('title')
document.fonts?.load("16px 'Press Start 2P'").catch(() => {})

// For tests and the curious.
window.tp = {
  get game() {
    return game
  },
  get save() {
    return save
  },
  set save(s) {
    save = { ...fresh(), ...s }
    store()
  },
  startPuzzle: (id) => startPuzzle(PUZZLES.find((p) => p.id === id)),
  startEndless,
  show,
  click,
}
