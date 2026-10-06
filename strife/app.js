// COUNTER-STRIFE: menus, input (mouse, keyboard, touch), the camera, the HUD, and the loop.

import * as THREE from './lib/three.min.js'
import { MAPS, MAP_LIST } from './maps.js'
import { Game, eyeOf, weaponOf, dirOf } from './game.js'
import { View } from './view.js'
import { radarImage } from './render.js'
import { WEAPONS, GEAR, SHOP } from './weapons.js'
import { DIFFICULTY } from './bots.js'
import * as audio from './audio.js'

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]
const q = new URLSearchParams(location.search)
const embed = q.has('embed')
if (embed) document.documentElement.classList.add('embed')
const coarse = matchMedia('(pointer: coarse)').matches
if (coarse) document.documentElement.classList.add('touch')
const STEP = 1 / 60

// ================= Settings and record =================
const SKEY = 'strife-settings'
const RKEY = 'strife-record'
const store = {
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(k) ?? 'null')
    } catch {
      return null
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v))
    } catch {
      // private mode: it just won't be remembered
    }
  },
}
const settings = {
  sens: 1.6,
  fov: 74,
  vol: 70,
  quality: coarse ? 'low' : 'medium',
  cross: '#4dff6a',
  invert: false,
  map: 'dust2',
  team: 'auto',
  diff: 1,
  length: 9,
  size: 5,
  ...(store.get(SKEY) ?? {}),
}
if (q.get('map') && MAPS[q.get('map')]) settings.map = q.get('map')
const saveSettings = () => store.set(SKEY, settings)
const record = { wins: 0, losses: 0, kills: 0, deaths: 0, ...(store.get(RKEY) ?? {}) }
audio.setVolume(settings.vol / 100)

const QUALITY = {
  low: { shadows: false, shadowSize: 1024, ratio: 0.75, aa: false },
  medium: { shadows: true, shadowSize: 2048, ratio: 1, aa: true },
  high: { shadows: true, shadowSize: 4096, ratio: 2, aa: true },
}

// ================= Renderer =================
const stage = $('#stage')
let renderer
function makeRenderer() {
  const qq = QUALITY[settings.quality] ?? QUALITY.medium
  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
  }
  try {
    renderer = new THREE.WebGLRenderer({ antialias: qq.aa, powerPreference: 'high-performance' })
  } catch {
    $('#nogl').hidden = false
    return false
  }
  renderer.shadowMap.enabled = qq.shadows
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qq.ratio))
  stage.append(renderer.domElement)
  resize()
  return true
}
function resize() {
  if (!renderer) return
  const w = stage.clientWidth || innerWidth
  const h = stage.clientHeight || innerHeight
  renderer.setSize(w, h, false)
  view?.resize(w, h)
}
addEventListener('resize', resize)

// ================= Session =================
let game = null
let view = null
let mode = 'menu' // 'menu' (a bot match plays behind it) | 'play'
let paused = false
let watched = null // whose eyes we're looking through
let radarImg = null
const look = { yaw: 0, pitch: 0 }
let camY = null
let orbit = 0

function hooks() {
  return {
    sound(name, at, o) {
      if (mode !== 'play') return
      const self = o.who && o.who === watched
      audio.play(name, { at: self ? null : at, gain: (o.gain ?? 1) * (self && name.startsWith('step') ? 0.5 : 1), range: o.range ?? 40 })
    },
    tracer({ a, from, to, w }) {
      if (!view) return
      if (a === watched && mode === 'play') view.kick(w)
      else view.muzzle(a)
      if (a !== watched || Math.random() < 0.5) view.tracer(from, to, a === watched)
    },
    impact({ at, normal, soft }) {
      view?.impact(at, normal, soft)
    },
    hit({ victim, attacker, dmg, part, at, dir }) {
      if (at) view?.blood(at, dir)
      if (mode !== 'play') return
      if (attacker && attacker === game.player) hitMarker(!victim.alive || victim.hp <= 0, part === 'head')
      if (victim === game.player) damageFlash(attacker, dmg)
    },
    kill(e) {
      if (mode !== 'play') return
      addKillfeed(e)
      if (e.victim === game.player) {
        deathInfo = e
        record.deaths++
      }
      if (e.attacker === game.player && e.victim.team !== game.player.team) record.kills++
    },
    knife({ a }) {
      if (a === watched) view?.slash()
    },
    detonate({ nade }) {
      if (nade.type !== 'smoke') view?.explosion(nade.pos, nade.type)
    },
    explode({ pos }) {
      view?.explosion(pos, 'bomb')
    },
    drop(d) {
      view?.addDrop(d)
    },
    dropRemoved(d) {
      view?.removeDrop(d)
    },
    roundStart() {
      if (mode !== 'play') return
      hideBanner()
      deathInfo = null
      spectIdx = 0
      if (game.player) {
        look.yaw = game.player.yaw
        look.pitch = 0
      }
      camY = null
      say(game.practice ? 'Practice: buy anything, anywhere (B)' : `Round ${game.round}${game.round === 1 || game.round === game.halftimeAt + 1 ? ' · pistol round' : ''}`, 2.5)
    },
    live() {
      if (mode === 'play' && !game.practice) say('Go go go!', 1.2)
    },
    roundEnd({ winner, reason, mvp, over }) {
      if (mode !== 'play') return
      const reasons = { elimination: winner === 'T' ? 'All Counter-Terrorists are dead' : 'All Terrorists are dead', bomb: 'The bomb exploded', defuse: 'The bomb has been defused', time: 'Time ran out: the bomb was never planted' }
      showBanner(winner, reasons[reason], mvp ? `MVP: ${mvp.name}${mvp === game.player ? ' (you!)' : ''}` : '')
      if (game.player) audio.play(winner === game.player.team ? 'win' : 'lose')
      if (over) setTimeout(matchOver, 3500)
    },
    planted({ site }) {
      if (mode === 'play') say(`The bomb has been planted at ${site}`, 3, true)
    },
    defused() {
      if (mode === 'play') say('The bomb has been defused', 3)
    },
    bombDropped() {
      if (mode === 'play' && game.player?.team === 'T') say('The bomb has been dropped', 2)
    },
    bombPicked({ a }) {
      if (mode === 'play' && a === game.player) say('You picked up the bomb', 2)
    },
    halftime() {
      if (mode === 'play') say('Halftime: switching sides', 4)
    },
  }
}

/** Starts a match (or the menu's background bot match, `demo`). */
function start({ demo = false, practice = false } = {}) {
  view?.dispose()
  const map = MAPS[settings.map]
  const team = demo ? null : settings.team === 'auto' ? (Math.random() < 0.5 ? 'T' : 'CT') : settings.team
  game = new Game({ map, team, size: demo ? 5 : settings.size, difficulty: demo ? 1 : settings.diff, practice, rules: { roundsToWin: settings.length }, hooks: hooks() })
  const qq = QUALITY[settings.quality] ?? QUALITY.medium
  view = new View(renderer, { shadows: qq.shadows && renderer.shadowMap.enabled, shadowSize: qq.shadowSize })
  view.load(game)
  resize()
  radarImg = radarImage(map)
  mode = demo ? 'menu' : 'play'
  watched = game.player
  if (game.player) {
    look.yaw = game.player.yaw
    look.pitch = 0
  }
  camY = null
  killfeed.length = 0
  $('#killfeed').replaceChildren()
  hideBanner()
  document.body.classList.toggle('playing', !demo)
}

// ================= Menus =================
function show(id) {
  for (const s of ['menu', 'pause', 'settings', 'controls', 'over']) $('#' + s).hidden = s !== id
  $('#hud').hidden = id === 'menu' || mode !== 'play'
  $('#touch').hidden = !coarse || mode !== 'play' || !!id
}
let backTo = 'menu'
function buildMenu() {
  const maps = $('#maps')
  maps.replaceChildren()
  for (const id of MAP_LIST) {
    const m = MAPS[id]
    const b = document.createElement('button')
    b.className = 'map-card'
    b.dataset.map = id
    const img = radarImage(m)
    const c = document.createElement('canvas')
    c.width = 320
    c.height = 200
    const g = c.getContext('2d')
    g.fillStyle = '#20252c'
    g.fillRect(0, 0, 320, 200)
    const s = Math.min(320 / img.width, 200 / img.height) * 1.15
    g.drawImage(img, (320 - img.width * s) / 2, (200 - img.height * s) / 2, img.width * s, img.height * s)
    const t = document.createElement('div')
    t.className = 'mc-text'
    t.innerHTML = '<b></b><small></small>'
    $('b', t).textContent = m.name
    $('small', t).textContent = m.blurb
    b.append(c, t)
    b.addEventListener('click', () => {
      if (settings.map === id) return
      settings.map = id
      saveSettings()
      syncMenu()
      start({ demo: true })
    })
    maps.append(b)
  }
  const seg = (sel, key, num) =>
    $$(`${sel} button`).forEach((b) =>
      b.addEventListener('click', () => {
        settings[key] = num ? Number(b.dataset.v) : b.dataset.v
        saveSettings()
        syncMenu()
      }),
    )
  seg('#seg-team', 'team')
  seg('#seg-diff', 'diff', true)
  seg('#seg-length', 'length', true)
  seg('#seg-size', 'size', true)
  syncMenu()
}
function syncMenu() {
  $$('.map-card').forEach((b) => b.classList.toggle('sel', b.dataset.map === settings.map))
  const mark = (sel, v) => $$(`${sel} button`).forEach((b) => b.classList.toggle('sel', b.dataset.v === String(v)))
  mark('#seg-team', settings.team)
  mark('#seg-diff', settings.diff)
  mark('#seg-length', settings.length)
  mark('#seg-size', settings.size)
  $('#record').textContent = record.wins + record.losses ? `Record: ${record.wins} won, ${record.losses} lost · ${record.kills} kills, ${record.deaths} deaths` : ''
}
function syncSettings() {
  $('#set-sens').value = settings.sens
  $('#out-sens').textContent = settings.sens.toFixed(2)
  $('#set-fov').value = settings.fov
  $('#out-fov').textContent = settings.fov
  $('#set-vol').value = settings.vol
  $('#out-vol').textContent = settings.vol
  $('#set-quality').value = settings.quality
  $('#set-cross').value = settings.cross
  $('#set-invert').checked = settings.invert
  $('#crosshair').style.setProperty('--c', settings.cross)
}
$('#set-sens').addEventListener('input', (e) => ((settings.sens = Number(e.target.value)), saveSettings(), syncSettings()))
$('#set-fov').addEventListener('input', (e) => ((settings.fov = Number(e.target.value)), saveSettings(), syncSettings()))
$('#set-vol').addEventListener('input', (e) => {
  settings.vol = Number(e.target.value)
  audio.setVolume(settings.vol / 100)
  saveSettings()
  syncSettings()
})
$('#set-cross').addEventListener('change', (e) => ((settings.cross = e.target.value), saveSettings(), syncSettings()))
$('#set-invert').addEventListener('change', (e) => ((settings.invert = e.target.checked), saveSettings()))
$('#set-quality').addEventListener('change', (e) => {
  settings.quality = e.target.value
  saveSettings()
  // New renderer, then rebuild whatever was running.
  const wasPlaying = mode === 'play'
  makeRenderer()
  if (!wasPlaying) start({ demo: true })
  else {
    const qq = QUALITY[settings.quality]
    view.dispose()
    view = new View(renderer, { shadows: qq.shadows, shadowSize: qq.shadowSize })
    view.load(game)
    for (const d of game.drops) view.addDrop(d)
    resize()
  }
})

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-do]')
  if (!b) return
  audio.unlockAudio()
  const act = b.dataset.do
  if (act === 'play' || act === 'practice' || act === 'again') {
    $('#loading').hidden = false
    setTimeout(() => {
      start({ practice: act === 'practice' })
      $('#loading').hidden = true
      paused = false
      show(null)
      grab()
    }, 30)
  } else if (act === 'settings') {
    backTo = mode === 'play' ? 'pause' : 'menu'
    syncSettings()
    show('settings')
  } else if (act === 'controls') {
    backTo = mode === 'play' ? 'pause' : 'menu'
    show('controls')
  } else if (act === 'back') show(backTo)
  else if (act === 'resume') resume()
  else if (act === 'quit') {
    paused = false
    start({ demo: true })
    show('menu')
    syncMenu()
  } else if (act === 'close-buy') toggleBuy(false)
})

function pause() {
  if (mode !== 'play' || paused) return
  paused = true
  toggleBuy(false)
  show('pause')
}
function resume() {
  paused = false
  show(null)
  grab()
}
function matchOver() {
  if (mode !== 'play') return
  const me = game.player
  const won = me && game.winner === me.team
  if (me) won ? record.wins++ : record.losses++
  store.set(RKEY, record)
  $('#over-title').textContent = won ? 'Victory' : 'Defeat'
  $('#over-title').className = won ? 'win' : 'loss'
  hideBanner()
  $('#over-score').textContent = me ? `${game.score[me.team]} : ${game.score[me.team === 'T' ? 'CT' : 'T']}` : ''
  const rows = [...game.actors].sort((a, b) => b.kills - a.kills)
  const t = document.createElement('table')
  t.innerHTML = '<tr><th>Player</th><th>K</th><th>A</th><th>D</th><th>★</th></tr>'
  for (const a of rows) {
    const tr = document.createElement('tr')
    tr.innerHTML = '<td></td><td></td><td></td><td></td><td></td>'
    tr.children[0].textContent = a.name
    tr.children[0].className = a.team
    tr.children[1].textContent = a.kills
    tr.children[2].textContent = a.assists
    tr.children[3].textContent = a.deaths
    tr.children[4].textContent = a.mvps || ''
    t.append(tr)
  }
  $('#over-board').replaceChildren(t)
  paused = true
  releaseMouse()
  show('over')
}

// ================= Input =================
const keys = new Set()
const edge = { jump: false, reload: false, slot: null, alt: false, drop: false, pickup: false }
let mouseFire = false
let tabHeld = false
const touch = { mx: 0, mz: 0, fire: false, use: false, crouch: false }
let locked = false
let wantLock = false

function grab() {
  if (coarse || mode !== 'play') return
  wantLock = true
  renderer.domElement.requestPointerLock?.()?.catch?.(() => {})
}
function releaseMouse() {
  wantLock = false
  if (document.pointerLockElement) document.exitPointerLock()
}
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer?.domElement
  // Losing the mouse mid-game (Esc) pauses, unless we let it go on purpose (buy menu, etc).
  if (!locked && wantLock && mode === 'play' && !buyOpen && !paused) pause()
})
stage.addEventListener('mousedown', (e) => {
  audio.unlockAudio()
  if (mode !== 'play' || paused) return
  if (!locked && !coarse) {
    if (!buyOpen) grab()
    return
  }
  if (e.button === 0) mouseFire = true
  if (e.button === 2) edge.alt = true
})
addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseFire = false
})
stage.addEventListener('contextmenu', (e) => e.preventDefault())
addEventListener('mousemove', (e) => {
  if (!locked || mode !== 'play' || paused) return
  turn(e.movementX, e.movementY, 1)
})
addEventListener(
  'wheel',
  (e) => {
    if (mode !== 'play' || !locked) return
    cycleWeapon(e.deltaY > 0 ? 1 : -1)
  },
  { passive: true },
)
function turn(dx, dy, scale) {
  const a = game?.player
  const w = a && weaponOf(a)
  const zoom = w?.zoom && a.scope ? w.zoom[a.scope - 1] / 90 : 1
  const k = settings.sens * 0.0011 * scale * zoom
  look.yaw -= dx * k
  look.pitch -= dy * k * (settings.invert ? -1 : 1)
  look.pitch = Math.max(-1.5, Math.min(1.5, look.pitch))
  if (!a?.alive && deathInfo && dx * dx > 0) spectTurn = true
}
function cycleWeapon(dir) {
  const a = game.player
  if (!a?.alive) return
  const order = ['primary', 'pistol', 'knife', 'grenade', 'bomb'].filter((s) => (s === 'grenade' ? a.inv.grenades.length : s === 'bomb' ? a.inv.bomb : a.inv[s]))
  const i = order.indexOf(a.active)
  edge.slot = order[(i + dir + order.length) % order.length]
}
const SLOT_KEYS = { Digit1: 'primary', Digit2: 'pistol', Digit3: 'knife', Digit4: 'grenade', Digit5: 'bomb' }
addEventListener('keydown', (e) => {
  audio.unlockAudio()
  if (e.code === 'KeyM') {
    audio.setMuted(!audio.isMuted())
    return
  }
  if (mode !== 'play') return
  if (e.code === 'Tab') {
    e.preventDefault()
    tabHeld = true
  }
  if (paused) {
    if (e.code === 'Escape' && !$('#pause').hidden) resume()
    return
  }
  if (buyOpen && /^Digit[0-9]$/.test(e.code)) {
    buyKey(Number(e.code.slice(5)))
    return
  }
  if (e.repeat) return
  keys.add(e.code)
  if (e.code === 'Space') edge.jump = true
  if (e.code === 'KeyR') edge.reload = true
  if (e.code === 'KeyQ') edge.slot = 'last'
  if (e.code === 'KeyG') edge.drop = true
  if (e.code === 'KeyE') edge.pickup = true
  if (SLOT_KEYS[e.code]) edge.slot = SLOT_KEYS[e.code]
  if (e.code === 'KeyB') toggleBuy()
  if (e.code === 'Escape') {
    if (buyOpen) toggleBuy(false)
    else pause()
  }
  if (e.code.startsWith('Control') || e.code === 'KeyC' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault()
})
addEventListener('keyup', (e) => {
  keys.delete(e.code)
  if (e.code === 'Tab') tabHeld = false
})
addEventListener('blur', () => {
  keys.clear()
  mouseFire = false
  tabHeld = false
})
document.addEventListener('visibilitychange', () => document.hidden && pause())

/** The human's commands for one tick. */
function playerCmd() {
  const a = game.player
  const k = (c) => keys.has(c)
  const f = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0) - touch.mz
  const s = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0) + touch.mx
  const fw = dirOf(look.yaw, 0)
  const rt = dirOf(look.yaw - Math.PI / 2, 0)
  const cmd = {
    yaw: look.yaw,
    pitch: look.pitch,
    fx: fw.x * f + rt.x * s,
    fz: fw.z * f + rt.z * s,
    jump: edge.jump || k('Space'),
    crouch: k('ControlLeft') || k('ControlRight') || k('KeyC') || touch.crouch,
    walk: k('ShiftLeft') || k('ShiftRight'),
    fire: (mouseFire || touch.fire) && !buyOpen,
    alt: edge.alt,
    use: k('KeyE') || touch.use,
    reload: edge.reload,
    slot: edge.slot,
    drop: edge.drop,
    pickup: edge.pickup,
  }
  edge.jump = edge.reload = edge.alt = edge.drop = edge.pickup = false
  edge.slot = null
  if (!a.alive) {
    cmd.fire = false
  }
  return cmd
}

// ================= Buy menu =================
let buyOpen = false
let buyCat = -1
function toggleBuy(open = !buyOpen) {
  if (open && (!game.player || !game.canBuy(game.player))) {
    say(game.player?.alive ? 'You can only buy in your spawn, early in the round' : 'You’re dead', 1.5)
    audio.play('deny')
    return
  }
  buyOpen = open
  buyCat = -1
  $('#buy').hidden = !open
  if (open) {
    wantLock = false
    if (document.pointerLockElement) document.exitPointerLock()
    renderBuy()
  } else if (mode === 'play' && !paused) grab()
}
function itemDef(id) {
  return WEAPONS[id] ?? GEAR[id]
}
function renderBuy() {
  const a = game.player
  const cats = $('#buy-cats')
  cats.replaceChildren()
  SHOP.forEach((cat, ci) => {
    const col = document.createElement('div')
    col.className = 'buy-cat' + (ci === buyCat ? ' sel' : '')
    const h = document.createElement('h3')
    h.innerHTML = `<kbd>${ci + 1}</kbd>`
    h.append(cat.cat)
    col.append(h)
    let n = 0
    for (const id of cat.items) {
      const it = itemDef(id)
      if (it.team && it.team !== a.team) continue
      n++
      const b = document.createElement('button')
      b.className = 'buy-item'
      const owned = (WEAPONS[id] && (a.inv[WEAPONS[id].slot]?.id === id || a.inv.grenades.includes(id))) || (id === 'kit' && a.kit) || (id === 'vesthelm' && a.helmet && a.armor >= 100) || (id === 'vest' && a.armor >= 100)
      b.classList.toggle('owned', !!owned)
      b.disabled = a.money < (id === 'vesthelm' && a.armor >= 100 ? 350 : it.price) || !!owned
      b.innerHTML = `<b></b><span></span><small></small>`
      $('b', b).textContent = `${ci === buyCat ? n + '. ' : ''}${it.name}`
      $('span', b).textContent = `$${it.price}`
      $('small', b).textContent = WEAPONS[id]?.dmg ? `${WEAPONS[id].dmg} dmg · ${WEAPONS[id].mag} rounds${WEAPONS[id].auto ? ' · auto' : ''}` : ''
      b.dataset.id = id
      b.addEventListener('click', () => doBuy(id))
      col.append(b)
    }
    cats.append(col)
  })
  $('#buy-money').textContent = `$${a.money}`
}
function doBuy(id) {
  const why = game.buy(game.player, id)
  if (why) {
    say(why, 1.2)
    audio.play('deny')
  }
  renderBuy()
}
function buyKey(n) {
  if (buyCat < 0) {
    if (n >= 1 && n <= SHOP.length) buyCat = n - 1
  } else {
    const items = SHOP[buyCat].items.filter((id) => !itemDef(id).team || itemDef(id).team === game.player.team)
    if (items[n - 1]) doBuy(items[n - 1])
    buyCat = -1
  }
  renderBuy()
}

// ================= Touch =================
if (coarse) {
  const stick = $('#stick')
  const knob = $('#stick-knob')
  let sid = null
  let sc = null
  stick.addEventListener('pointerdown', (e) => {
    sid = e.pointerId
    stick.setPointerCapture(sid)
    const r = stick.getBoundingClientRect()
    sc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    moveStick(e)
  })
  const moveStick = (e) => {
    if (e.pointerId !== sid) return
    let dx = e.clientX - sc.x
    let dy = e.clientY - sc.y
    const l = Math.hypot(dx, dy)
    if (l > 50) {
      dx *= 50 / l
      dy *= 50 / l
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`
    touch.mx = dx / 50
    touch.mz = dy / 50
  }
  stick.addEventListener('pointermove', moveStick)
  const endStick = (e) => {
    if (e.pointerId !== sid) return
    sid = null
    knob.style.transform = ''
    touch.mx = touch.mz = 0
  }
  stick.addEventListener('pointerup', endStick)
  stick.addEventListener('pointercancel', endStick)
  const lookEl = $('#look')
  const lookers = new Map()
  lookEl.addEventListener('pointerdown', (e) => {
    lookEl.setPointerCapture(e.pointerId)
    lookers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  })
  lookEl.addEventListener('pointermove', (e) => {
    const p = lookers.get(e.pointerId)
    if (!p || paused) return
    turn((e.clientX - p.x) * 2.2, (e.clientY - p.y) * 2.2, 1)
    p.x = e.clientX
    p.y = e.clientY
  })
  const endLook = (e) => lookers.delete(e.pointerId)
  lookEl.addEventListener('pointerup', endLook)
  lookEl.addEventListener('pointercancel', endLook)
  for (const b of $$('.tb')) {
    const t = b.dataset.t
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      audio.unlockAudio()
      b.classList.add('on')
      if (t === 'fire') touch.fire = true
      if (t === 'use') touch.use = true
      if (t === 'jump') edge.jump = true
      if (t === 'reload') edge.reload = true
      if (t === 'alt') edge.alt = true
      if (t === 'swap') cycleWeapon(1)
      if (t === 'nade') edge.slot = 'grenade'
      if (t === 'crouch') touch.crouch = !touch.crouch
      if (t === 'buy') toggleBuy()
      if (t === 'score') tabHeld = !tabHeld
      if (t === 'pause') pause()
    })
    const up = () => {
      if (t !== 'crouch') b.classList.remove('on')
      else b.classList.toggle('on', touch.crouch)
      if (t === 'fire') touch.fire = false
      if (t === 'use') touch.use = false
    }
    b.addEventListener('pointerup', up)
    b.addEventListener('pointercancel', up)
  }
}

// ================= HUD =================
const hud = {}
for (const id of ['clock', 'score-t', 'score-ct', 'alive-t', 'alive-ct', 'money', 'hp', 'armor', 'clip', 'reserve', 'weapon-name', 'nades', 'kit', 'bomb-carry', 'place', 'hint', 'progress', 'progress-bar', 'center-msg', 'spectate', 'crosshair', 'scope', 'flashbang', 'damage', 'hitmarker', 'scoreboard'])
  hud[id] = $('#' + id)
const last = {}
const setText = (id, v) => {
  if (last[id] !== v) {
    last[id] = v
    hud[id].textContent = v
  }
}
let msgUntil = 0
function say(text, secs = 2, red = false) {
  hud['center-msg'].textContent = text
  hud['center-msg'].classList.toggle('red', red)
  msgUntil = performance.now() + secs * 1000
}
function showBanner(team, sub, mvp) {
  const b = $('#banner')
  b.hidden = false
  b.className = 'banner ' + team
  $('#banner-title').textContent = team === 'T' ? 'TERRORISTS WIN' : 'COUNTER-TERRORISTS WIN'
  $('#banner-sub').textContent = sub
  $('#banner-mvp').textContent = mvp
}
function hideBanner() {
  $('#banner').hidden = true
}
const killfeed = []
function addKillfeed({ victim, attacker, weaponId, headshot }) {
  const li = document.createElement('li')
  const me = game.player
  if (me && (attacker === me || victim === me)) li.classList.add('mine')
  const name = (a) => {
    const s = document.createElement('span')
    s.className = a.team
    s.textContent = a.name
    return s
  }
  if (attacker && attacker !== victim) li.append(name(attacker))
  const w = document.createElement('span')
  w.className = 'w'
  w.textContent = weaponId === 'bomb' ? '💥' : weaponId === 'fall' ? '⤓' : weaponId === 'he' ? 'HE' : WEAPONS[weaponId]?.name ?? weaponId
  li.append(w)
  if (headshot) {
    const h = document.createElement('span')
    h.className = 'hs'
    h.textContent = '◉'
    h.title = 'Headshot'
    li.append(h)
  }
  li.append(name(victim))
  $('#killfeed').append(li)
  killfeed.push({ li, at: performance.now() })
  if (killfeed.length > 6) killfeed.shift().li.remove()
}
function hitMarker(kill, head) {
  const h = hud.hitmarker
  h.classList.remove('on')
  void h.offsetWidth
  h.classList.toggle('kill', kill)
  h.classList.add('on')
  if (head && !kill) audio.play('dink', { gain: 0.25 })
}
let damageAt = 0
function damageFlash(attacker, dmg) {
  const d = hud.damage
  let x = 50
  let y = 50
  if (attacker) {
    const a = game.player
    const ang = Math.atan2(-(attacker.pos.x - a.pos.x), -(attacker.pos.z - a.pos.z)) - look.yaw
    x = 50 - Math.sin(ang) * 48
    y = 50 - Math.cos(ang) * 48
  }
  d.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(255,0,0,${Math.min(0.75, 0.25 + dmg / 120)}), transparent 38%)`
  d.style.transition = 'none'
  d.style.opacity = 1
  damageAt = performance.now()
}
let deathInfo = null
let spectIdx = 0
let spectTurn = false
stage.addEventListener('click', () => {
  if (mode === 'play' && game.player && !game.player.alive) spectIdx++
})

function fmtTime(s) {
  s = Math.ceil(s)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
let radarT = 0
let sbT = 0
function updateHud(dt) {
  const g = game
  const me = g.player
  const w = watched
  const now = g.time
  // clock and scores
  const bombPlanted = g.bomb.state === 'planted'
  setText('clock', g.practice ? '∞' : bombPlanted ? '💣' : g.phase === 'freeze' ? fmtTime(g.phaseEnd - now) : fmtTime(g.roundTimeLeft))
  hud.clock.classList.toggle('bomb', bombPlanted)
  hud.clock.classList.toggle('low', !bombPlanted && g.phase === 'live' && g.roundTimeLeft < 15)
  setText('score-t', String(g.score.T))
  setText('score-ct', String(g.score.CT))
  for (const t of ['T', 'CT']) {
    const list = g.actors.filter((a) => a.team === t)
    const key = list.map((a) => (a.alive ? 1 : 0)).join('')
    if (last['alive' + t] !== key) {
      last['alive' + t] = key
      hud['alive-' + t.toLowerCase()].innerHTML = list.map((a) => `<i class="${a.alive ? '' : 'dead'}" title="${a.name.replace(/[<>&"]/g, '')}"></i>`).join('')
    }
  }
  // you (or who you're watching)
  if (w) {
    setText('hp', String(Math.max(0, Math.ceil(w.hp))))
    hud.hp.classList.toggle('low', w.hp <= 25)
    setText('armor', String(Math.ceil(w.armor)) + (w.helmet ? '⛑' : ''))
    hud.kit.hidden = !w.kit
    hud['bomb-carry'].hidden = !w.inv.bomb
    const wpn = weaponOf(w)
    setText('weapon-name', wpn?.name ?? '')
    const s = w.inv[w.active]
    const mag = wpn?.mag
    setText('clip', mag && s ? String(s.clip) : wpn?.kind === 'grenade' ? String(w.inv.grenades.filter((x) => x === wpn.id).length) : '')
    setText('reserve', mag && s ? `/ ${s.reserve}` : '')
    hud.clip.classList.toggle('low', !!(mag && s && s.clip <= Math.ceil(mag * 0.2)))
    const nk = w.inv.grenades.join(',') + w.active
    if (last.nades !== nk) {
      last.nades = nk
      hud.nades.innerHTML = w.inv.grenades.map((id, k) => `<span class="${w.active === 'grenade' && k === 0 ? 'on' : ''}">${WEAPONS[id].name.replace(' Grenade', '').replace('Flashbang', 'Flash')}</span>`).join('')
    }
  }
  if (me) {
    const m = `$${me.money}`
    if (last.money !== m) {
      if (last.money) {
        hud.money.classList.remove('flash')
        void hud.money.offsetWidth
        hud.money.classList.add('flash')
      }
      setText('money', m)
    }
  }
  setText('place', w ? g.world.calloutAt(w.pos.x, w.pos.z) : '')
  // hints and progress
  let hint = ''
  let prog = null
  if (me?.alive && g.phase !== 'post') {
    const site = g.inSite(me)
    if (me.inv.bomb && g.phase === 'live') hint = site ? `Hold ${coarse ? 'E' : 'E (or click with the bomb out)'} to plant the bomb` : 'Take the bomb to A or B'
    if (me.team === 'CT' && g.bomb.state === 'planted' && Math.hypot(me.pos.x - g.bomb.pos.x, me.pos.z - g.bomb.pos.z) < 1.8) hint = `Hold E to defuse${me.kit ? ' (kit: 5 s)' : ' (10 s, 5 with a kit)'}`
    const drop = g.drops.find((d) => Math.hypot(me.pos.x - d.pos.x, me.pos.z - d.pos.z) < 1.6)
    if (drop && !hint) hint = `Press E to pick up the ${WEAPONS[drop.id].name}`
    if (g.canBuy(me) && g.phase === 'freeze' && g.round <= 2 && !hint) hint = coarse ? 'Tap $ to buy' : 'Press B to buy'
    if (me.plant > 0) prog = { label: 'Planting the bomb…', v: me.plant / g.rules.plantTime, cls: '' }
    if (g.bomb.defuser === me && me.defuse > 0) prog = { label: 'Defusing…', v: me.defuse / (me.kit ? g.rules.kitTime : g.rules.defuseTime), cls: 'defuse' }
  }
  setText('hint', buyOpen ? '' : hint)
  hud.progress.hidden = !prog
  if (prog) {
    hud.progress.className = 'progress ' + prog.cls
    hud.progress.firstChild.textContent = prog.label
    hud['progress-bar'].style.width = `${Math.min(100, prog.v * 100)}%`
  }
  if (performance.now() > msgUntil) setText('center-msg', '')
  else last['center-msg'] = null
  // spectating / death
  if (me && !me.alive && !g.practice) {
    hud.spectate.hidden = false
    const killer = deathInfo?.attacker && deathInfo.attacker !== me ? `Killed by ${deathInfo.attacker.name} (${WEAPONS[deathInfo.weaponId]?.name ?? deathInfo.weaponId}${deathInfo.headshot ? ', headshot' : ''})` : 'You died'
    const sp = watched && watched !== me ? `Spectating ${watched.name}` : 'Spectating'
    hud.spectate.innerHTML = ''
    hud.spectate.append(sp)
    const small = document.createElement('small')
    small.textContent = `${killer} · click to switch player`
    hud.spectate.append(small)
  } else hud.spectate.hidden = true
  // crosshair, scope, flash
  const wpn = w && weaponOf(w)
  const scoped = !!(wpn?.zoom && w.scope)
  hud.scope.hidden = !scoped
  hud.crosshair.classList.toggle('off', scoped || (wpn?.kind === 'sniper' && !scoped) || !w?.alive)
  if (wpn && w) {
    const spd = Math.hypot(w.vel.x, w.vel.z)
    const gap = 3 + (wpn.moveSpread ?? 0.03) * Math.min(1, spd / (wpn.speed || 6)) * 160 + (w.onGround ? 0 : 10) + Math.min(10, w.recoil * 1.2)
    hud.crosshair.style.setProperty('--gap', `${gap.toFixed(1)}px`)
  }
  let fl = 0
  if (w && now < w.flashUntil) fl = now < w.flashFull ? 1 : (w.flashUntil - now) / Math.max(0.01, w.flashUntil - w.flashFull)
  hud.flashbang.style.opacity = fl.toFixed(3)
  if (damageAt && performance.now() - damageAt > 80) {
    hud.damage.style.transition = 'opacity 0.7s'
    hud.damage.style.opacity = 0
    damageAt = 0
  }
  // killfeed ages out
  while (killfeed.length && performance.now() - killfeed[0].at > 7000) killfeed.shift().li.remove()
  // radar (~20 fps)
  radarT -= dt
  if (radarT <= 0) {
    radarT = 0.05
    drawRadar()
  }
  // scoreboard (when Tab is held)
  hud.scoreboard.hidden = !tabHeld
  if (tabHeld) {
    sbT -= dt
    if (sbT <= 0) {
      sbT = 0.25
      drawScoreboard()
    }
  }
}
function drawRadar() {
  const c = $('#radar')
  const g = c.getContext('2d')
  const S = c.width
  const me = watched
  g.clearRect(0, 0, S, S)
  if (!me || !radarImg) return
  const scale = 2.4 // px per metre
  g.save()
  g.beginPath()
  g.arc(S / 2, S / 2, S / 2 - 1, 0, 7)
  g.clip()
  g.translate(S / 2, S / 2)
  g.rotate(look.yaw * (me === game.player ? 1 : 0) + (me === game.player ? 0 : me.yaw))
  g.scale(scale, scale)
  g.translate(-me.pos.x, -me.pos.z)
  g.globalAlpha = 0.9
  g.drawImage(radarImg, 0, 0, radarImg.width / 8, radarImg.height / 8)
  g.globalAlpha = 1
  const now = game.time
  const myTeam = me.team
  const dot = (x, z, col, r = 1.6) => {
    g.beginPath()
    g.arc(x, z, r, 0, 7)
    g.fillStyle = col
    g.fill()
    g.lineWidth = 0.4
    g.strokeStyle = '#000'
    g.stroke()
  }
  // enemies your team has seen in the last moment
  const seen = new Map()
  for (const s of game.intel[myTeam]) if (now - s.at < 1.2) seen.set(s.id, s)
  for (const a of game.actors) {
    if (!a.alive || a === me) continue
    if (a.team === myTeam) dot(a.pos.x, a.pos.z, myTeam === 'T' ? '#e3ac48' : '#6fa8e0')
    else if (seen.has(a.id)) dot(a.pos.x, a.pos.z, '#ff3b3b')
  }
  // the bomb
  const b = game.bomb
  if (b.state === 'planted' || (myTeam === 'T' && b.state === 'dropped')) {
    g.font = '5px sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(b.state === 'planted' && now % 1 < 0.5 ? '🔴' : '💣', b.pos.x, b.pos.z)
  } else if (myTeam === 'T' && b.carrier && b.carrier !== me && b.carrier.alive) dot(b.carrier.pos.x, b.carrier.pos.z, '#ff8c1a', 2)
  g.restore()
  // you: an arrow in the middle, pointing up
  g.save()
  g.translate(S / 2, S / 2)
  g.fillStyle = '#fff'
  g.beginPath()
  g.moveTo(0, -7)
  g.lineTo(5, 6)
  g.lineTo(0, 3)
  g.lineTo(-5, 6)
  g.closePath()
  g.fill()
  g.restore()
}
function drawScoreboard() {
  for (const t of ['CT', 'T']) {
    const table = $(`#sb-${t.toLowerCase()}`)
    const rows = game.actors.filter((a) => a.team === t).sort((a, b) => b.kills - a.kills)
    const showMoney = game.player?.team === t
    let html = `<tr><th>Player</th>${showMoney ? '<th>$</th>' : ''}<th>K</th><th>A</th><th>D</th><th>★</th></tr>`
    for (const a of rows) {
      const n = a.name.replace(/[<>&"]/g, '')
      html += `<tr class="${a.alive ? '' : 'dead'} ${a === game.player ? 'me' : ''}"><td>${a.inv.bomb ? '💣 ' : ''}${n}${a.alive ? '' : ' ✝'}</td>${showMoney ? `<td>$${a.money}</td>` : ''}<td>${a.kills}</td><td>${a.assists}</td><td>${a.deaths}</td><td>${a.mvps || ''}</td></tr>`
    }
    table.innerHTML = html
    $(`#sb-${t.toLowerCase()}-score`).textContent = game.score[t]
  }
  $('#sb-foot').textContent = `${MAPS[settings.map].name} · Round ${game.round} · first to ${game.rules.roundsToWin} · bots: ${DIFFICULTY[game.difficulty].name}`
}

// ================= Camera =================
function cameraFor(dt) {
  const g = game
  const me = g.player
  if (mode === 'menu' || !me) {
    // the menu: circle slowly over the map
    orbit += dt * 0.05
    const cx = g.map.w / 2
    const cz = g.map.d / 2
    return { x: cx + Math.sin(orbit) * 62, y: 52, z: cz + Math.cos(orbit) * 62, yaw: orbit, pitch: -0.62, fov: 60 }
  }
  if (me.alive || g.practice) {
    watched = me
    const e = eyeOf(me)
    if (camY === null || !me.onGround) camY = e.y
    else camY += (e.y - camY) * Math.min(1, dt * 16)
    const w = weaponOf(me)
    const fov = w?.zoom && me.scope ? (w.zoom[me.scope - 1] / 90) * settings.fov : settings.fov
    return { x: e.x, y: camY, z: e.z, yaw: look.yaw + me.punch.yaw, pitch: look.pitch + me.punch.pitch, fov }
  }
  // dead: watch a teammate (or anyone left)
  const alive = g.actors.filter((a) => a.alive && a.team === me.team)
  const pool = alive.length ? alive : g.actors.filter((a) => a.alive)
  if (g.time - me.deadAt < 1.6 || !pool.length) {
    // a moment to see what got you
    watched = me
    const e = eyeOf(me)
    return { x: e.x, y: e.y - Math.min(1.2, (g.time - me.deadAt) * 2), z: e.z, yaw: look.yaw, pitch: look.pitch, fov: settings.fov, roll: Math.min(0.5, (g.time - me.deadAt) * 0.8) }
  }
  watched = pool[spectIdx % pool.length]
  const e = eyeOf(watched)
  return { x: e.x, y: e.y, z: e.z, yaw: watched.yaw, pitch: watched.pitch, fov: settings.fov }
}

// ================= The loop =================
let acc = 0
let lastT = performance.now()
function frame(t) {
  requestAnimationFrame(frame)
  const dt = Math.min(0.1, (t - lastT) / 1000)
  lastT = t
  if (!game || !view) return
  const live = !paused || mode === 'menu'
  if (live) {
    acc += dt
    let n = 0
    while (acc >= STEP && n < 6) {
      game.update(STEP, mode === 'play' && game.player ? playerCmd() : null)
      acc -= STEP
      n++
    }
    if (n === 6) acc = 0
  }
  const cam = cameraFor(dt)
  view.update(dt, game, mode === 'play' ? watched : null)
  if (mode === 'play') view.updateViewmodel(dt, watched, game)
  view.render(cam, mode === 'play' && watched?.alive)
  audio.setListener(cam.x, cam.y, cam.z, cam.yaw)
  if (mode === 'play') updateHud(dt)
}

// ================= Boot =================
if (makeRenderer()) {
  buildMenu()
  syncSettings()
  start({ demo: true })
  show('menu')
  requestAnimationFrame(frame)
  // ?play starts straight away (the phone and nikstilOS open the menu; this is for links)
  if (q.has('play')) $('[data-do="play"]').click()
}
// for tests and the curious
window.strife = { get game() { return game }, get view() { return view }, settings, look }
