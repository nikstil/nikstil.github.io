// LAWN OF THE DEAD on nikstil.com: menus, the seed picker, the Almanac, Gary’s Garage Sale, saving,
// input, and the loop that runs the game (sim.js) and draws it (draw.js).

import { LEVELS, LEVEL_BY_ID, PLANTS, PLANT_BY_ID, PLANT_ORDER, ZOMBIES, ZOMBIE_BY_ID, AREAS, SHOP, POTS_FROM, nextLevelId } from './data.js'
import { createGame } from './sim.js'
import { W, H, PIXEL, drawGamePixel, pixelCanvas, toLawn, seedRect, shovelRect, beltRect, drawPacket, drawPlantCard, drawZombieCard } from './draw.js'
import { playSfx, setMusic, setSound, setVolume, getVolume, unlockAudio } from './audio.js'
import { drawTitleScene } from './scene.js'

const $ = (sel) => document.querySelector(sel)
const $$ = (sel) => [...document.querySelectorAll(sel)]
const q = new URLSearchParams(location.search)
if (q.has('embed')) document.documentElement.classList.add('embed')

// ================= Saved progress =================
const SAVE_KEY = 'touchgrass-save'
const MUTE_KEY = 'touchgrass-mute'
const fresh = () => ({ next: '1-1', beaten: [], coins: 0, owned: [], seen: [] })
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
const levelIndex = (id) => LEVELS.findIndex((l) => l.id === id)
/** Open on the map: everything up to where you are, anything beaten or right after a beaten
 * level, and the first level of every area (you can skip ahead to any of those). */
const firstOfArea = (id) => id.endsWith('-1')
const reached = (id) => {
  const i = levelIndex(id)
  return i <= levelIndex(save.next) || save.beaten.includes(id) || firstOfArea(id) || save.beaten.includes(LEVELS[i - 1]?.id)
}
/** Plants you've won (and upgrades you've bought). */
/**
 * Plants you've won (and upgrades you've bought). With `at` (a level), also every plant the levels
 * before it give, so skipping ahead to an area doesn't leave you with just a Pea Spitter.
 */
function unlockedPlants(at = null) {
  const out = new Set(['pea'])
  for (const l of LEVELS) if (save.beaten.includes(l.id) && l.unlock) out.add(l.unlock)
  if (at) for (const l of LEVELS.slice(0, levelIndex(at))) if (l.unlock) out.add(l.unlock)
  if (at && levelIndex(at) >= levelIndex(POTS_FROM)) out.add('pot')
  for (const o of save.owned) if (o.startsWith('plant:')) out.add(o.slice(6))
  if (reached(POTS_FROM)) out.add('pot')
  return PLANT_ORDER.filter((id) => out.has(id))
}
const slots = () => 6 + ['slot7', 'slot8', 'slot9', 'slot10'].filter((s) => save.owned.includes(s)).length
const hasShovel = (at = null) => save.beaten.includes('1-4') || (at != null && levelIndex(at) > levelIndex('1-4'))
const shopOpen = () => save.beaten.includes('3-4')
const almanacOpen = () => save.beaten.includes('1-8') || save.beaten.length >= 8

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
  const el = $('#view')
  if (document.fullscreenElement) document.exitFullscreen()
  else el.requestFullscreen?.().catch(() => {})
})
$('#full').hidden = !document.documentElement.requestFullscreen

// ================= Screens =================
const SCREENS = ['title', 'levels', 'picker', 'paused', 'lost', 'won', 'almanac', 'shop']
let screen = 'title'
function show(name) {
  screen = name
  for (const s of SCREENS) $(`#${s}`).hidden = s !== name
  $('#menu-btn').hidden = !(game && (name === 'play'))
  if (name === 'title') {
    game = null
    setMusic('title')
    renderTitle()
  }
  if (name === 'levels') renderLevels()
  if (name === 'almanac') renderAlmanac()
  if (name === 'paused') $('#pause-almanac').hidden = !almanacOpen()
  if (name === 'shop') renderShop()
  const lv = name === 'picker' ? LEVEL_BY_ID[pickedLevel] : game?.level
  $('#bar-sub').textContent = lv && name !== 'title' ? `${AREAS[lv.area].name} · Level ${lv.id}${lv.title ? ` · ${lv.title}` : ''}` : 'Your lawn vs. the dead'
}

function renderTitle() {
  const next = save.next
  const done = !next
  $('#adv-label').textContent = save.beaten.length ? 'Continue Adventure' : 'Adventure'
  $('#adv-sub').textContent = done ? 'You beat it. Play any level again.' : `Level ${next}${LEVEL_BY_ID[next]?.title ? ` · ${LEVEL_BY_ID[next].title}` : ''}`
  $('#shop-btn').disabled = !shopOpen()
  $('#shop-btn').title = shopOpen() ? '' : 'Gary opens up after level 3-4'
  $('#almanac-btn').disabled = !almanacOpen()
  $('#almanac-btn').title = almanacOpen() ? '' : 'You get the Almanac after level 1-8'
  $('#wallet').textContent = save.coins ? `💰 $${save.coins.toLocaleString()}` : ''
}

function renderLevels() {
  const list = $('#area-list')
  list.replaceChildren()
  for (const [areaId, area] of Object.entries(AREAS)) {
    const levels = LEVELS.filter((l) => l.id.startsWith(`${Object.keys(AREAS).indexOf(areaId) + 1}-`))
    const row = document.createElement('div')
    row.className = 'area'
    row.innerHTML = `<b>${area.name}</b><div class="area-levels"></div>`
    for (const l of levels) {
      const b = document.createElement('button')
      b.className = `lvl${save.beaten.includes(l.id) ? ' done' : ''}${l.special ? ' special' : ''}`
      b.textContent = l.id
      b.title = l.title ?? `Level ${l.id}`
      b.disabled = !reached(l.id)
      if (firstOfArea(l.id) && levelIndex(l.id) > levelIndex(save.next ?? '5-10') && !save.beaten.includes(l.id)) {
        b.classList.add('skip')
        b.title = `Skip ahead to ${l.id}: you get every plant from the levels before it`
      }
      b.addEventListener('click', () => startLevel(l.id))
      row.querySelector('.area-levels').append(b)
    }
    list.append(row)
  }
}

// ================= Starting a level: the seed picker =================
let pickedLevel = null
let chosen = []
let copycatPending = false
function startLevel(id) {
  unlockAudio()
  const level = LEVEL_BY_ID[id]
  pickedLevel = id
  const needsSeeds = !level.conveyor && !['bowling', 'whack', 'vase'].includes(level.special)
  const have = unlockedPlants(id)
  if (!needsSeeds) return begin(id, [])
  if (level.plants) return begin(id, level.plants)
  const usable = have.filter((p) => PLANT_BY_ID[p])
  if (usable.filter((p) => p !== 'copycat').length <= slots() && !usable.includes('copycat')) return begin(id, usable)
  chosen = (save.lastSeeds ?? []).filter((s) => usable.includes(typeof s === 'string' ? s : s.id) && (typeof s === 'string' || usable.includes('copycat'))).slice(0, slots())
  copycatPending = false
  renderPicker()
  show('picker')
  setMusic('title')
}
function packetCanvas(id, opts = {}) {
  const c = document.createElement('canvas')
  c.width = 116
  c.height = 152
  pixelCanvas(c, 2 * PIXEL, (ctx) => {
    ctx.scale(2, 2)
    drawPacket(ctx, id, 1, 1, 56, 74, { cost: PLANT_BY_ID[id]?.cost ?? null, ...opts })
  })
  return c
}
function renderPicker() {
  const level = LEVEL_BY_ID[pickedLevel]
  $('#picker-title').textContent = `Level ${level.id}: choose up to ${slots()} plants`
  const box = $('#chosen')
  box.replaceChildren()
  chosen.forEach((s, i) => {
    const id = typeof s === 'string' ? s : s.id
    const b = document.createElement('button')
    b.className = 'seed'
    b.title = `${PLANT_BY_ID[id].name}${s.imitated ? ' (copy)' : ''}: click to put back`
    b.append(packetCanvas(id, { imitated: !!s.imitated }))
    b.addEventListener('click', () => {
      chosen.splice(i, 1)
      playSfx('pick')
      renderPicker()
    })
    box.append(b)
  })
  const grid = $('#seed-grid')
  grid.replaceChildren()
  const have = unlockedPlants(pickedLevel)
  for (const id of PLANT_ORDER) {
    if (!have.includes(id)) continue
    const b = document.createElement('button')
    b.className = 'seed'
    const taken = chosen.some((s) => (typeof s === 'string' ? s : !s.imitated && s.id) === id) || (id === 'copycat' && chosen.some((s) => s.imitated))
    if (taken) b.classList.add('taken')
    // With the Copycat Sprout picked, the next plant you pick is its copy (so even taken ones are fine).
    b.disabled = chosen.length >= slots() || (taken && !(copycatPending && id !== 'copycat'))
    b.title = `${PLANT_BY_ID[id].name} (${PLANT_BY_ID[id].cost} sun): ${PLANT_BY_ID[id].desc}`
    b.append(packetCanvas(id, { selected: copycatPending && id === 'copycat' }))
    b.addEventListener('click', () => {
      if (id === 'copycat') {
        copycatPending = !copycatPending
      } else if (copycatPending) {
        if (chosen.length < slots()) chosen.push({ id, imitated: true })
        copycatPending = false
      } else if (chosen.length < slots()) chosen.push(id)
      playSfx('pick')
      renderPicker()
    })
    grid.append(b)
  }
  const prev = $('#preview-list')
  prev.replaceChildren()
  for (const z of level.zombies) {
    const c = document.createElement('canvas')
    c.width = 160
    c.height = 200
    c.title = ZOMBIE_BY_ID[z].name
    pixelCanvas(c, 4, (ctx) => {
      ctx.scale(2, 2)
      drawZombieCard(ctx, z, 40, 92, 0.62)
    })
    prev.append(c)
  }
  $('#rock').disabled = chosen.length === 0
}
$('#rock').addEventListener('click', () => {
  save.lastSeeds = chosen
  store()
  begin(pickedLevel, chosen)
})

// ================= Playing =================
let game = null
let ui = null
let banners = []
let endTimer = null
function begin(id, seeds) {
  clearTimeout(endTimer)
  unlockAudio()
  game = createGame(id, { seeds, owned: save.owned })
  ui = { hover: null, mouse: null, holding: null, banners: [], shovel: hasShovel(id) && !game.belt && !['whack', 'vase'].includes(game.special) }
  if (game.special === 'whack') ui.holding = { tool: 'mallet' }
  banners = []
  if (game.usedRake) {
    save.owned = save.owned.filter((o, i) => !(o === 'rake' && i === save.owned.indexOf('rake')))
    store()
  }
  const level = game.level
  if (level.special && level.title) banners.push({ text: level.title, kind: 'go', until: performance.now() + 2600 })
  setMusic(level.special === 'boss' ? 'boss' : level.area)
  show('play')
  save.seen = [...new Set([...(save.seen ?? []), ...level.zombies])]
  store()
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
    else if (e.type === 'won') endTimer = setTimeout(() => finish(true, e), 900)
    else if (e.type === 'lost') endTimer = setTimeout(() => finish(false, e), 1400)
  }
  game.events.length = 0
}

const NOTES = {
  '1-9': 'A note from Gary next door: “They come at night too, you know. Use mushrooms. Mushrooms like the dark. So do zombies, but less politely.”',
  '2-8': 'Gary: “They’re dancing now. Choreographed. On YOUR lawn. Use a Mushroom Cloud. I mean it.”',
  '2-9': 'Gary: “They’ve figured out you have a pool. Zombies can’t swim. They’re going to try anyway.”',
  '3-8': 'Gary: “Jet skis. In a residential pool. I’m calling someone. I don’t know who.”',
  '3-9': 'Gary: “Fog’s rolling in tonight. You’ll want lanterns. I lent mine to a zombie. Long story.”',
  '4-8': 'Gary: “Pogo sticks. Where are they getting pogo sticks?”',
  '4-9': 'Gary: “They’re going for the roof next. Bring pots. Lots of pots.”',
  '5-8': 'Gary: “There’s something big coming. Something with rivets. Bring pots.”',
  '5-9': 'Gary: “That’s it. The Rotbot itself is coming for your brains. I’ll be in my car.”',
}
function finish(won, e) {
  if (!game) return
  const level = game.level
  const earned = game.coinsEarned
  save.coins += earned
  const first = won && !save.beaten.includes(level.id)
  let bag = 0
  if (won) {
    if (first) {
      save.beaten.push(level.id)
      const nx = nextLevelId(level.id)
      // (skipping ahead doesn't move the Adventure along: it carries on from where you were)
      if (save.next === level.id) save.next = nx
    } else {
      bag = 250
      save.coins += bag
    }
  }
  store()
  if (!won) {
    $('#lost-copy').textContent = `A ${ZOMBIE_BY_ID[e.zombie]?.name ?? 'zombie'} made it into the house. ${earned ? `You keep the $${earned} you picked up.` : ''}`
    show('lost')
    return
  }
  const reward = first ? e.reward : 'money'
  const art = $('#won-art').getContext('2d')
  art.clearRect(0, 0, 200, 160)
  $('#won-kicker').textContent = `Level ${level.id} cleared${earned ? ` · +$${earned}` : ''}`
  let title = 'Level cleared!'
  let copy = ''
  if (first && level.unlock) {
    const p = PLANT_BY_ID[level.unlock]
    title = `New plant: ${p.name}`
    copy = `${p.desc} (${p.cost} sun)`
    pixelCanvas($('#won-art'), 4, (x) => drawPlantCard(x, level.unlock, 100, 140, 1.4, 0))
  } else if (reward === 'trophy') {
    title = 'You beat the Rotbot!'
    copy = 'The lawn is quiet. The house is safe. Your brains are still yours. Go and water something.'
  } else if (bag) {
    title = 'A bag of money'
    copy = `$${bag} for playing it again.`
  } else {
    title = 'Level cleared!'
  }
  const extras = []
  if (first && level.reward === 'shovel') extras.push('You also found a shovel: dig up plants you don’t want (S).')
  if (first && level.reward === 'almanac') extras.push('You found the Almanac: everything about every plant and zombie, on the title screen.')
  if (first && level.reward === 'shop') extras.push('Gary has opened a Garage Sale next door. Spend your coins on more seed slots and upgrade plants.')
  if (first && NOTES[level.id]) extras.push(NOTES[level.id])
  $('#won-title').textContent = title
  $('#won-copy').textContent = [copy, ...extras].filter(Boolean).join(' ')
  const buttons = $('#won-buttons')
  buttons.replaceChildren()
  const nx = nextLevelId(level.id)
  if (nx) {
    const b = document.createElement('button')
    b.className = 'btn go'
    b.textContent = `Next: Level ${nx} →`
    b.addEventListener('click', () => startLevel(nx))
    buttons.append(b)
  }
  const m = document.createElement('button')
  m.className = 'btn'
  m.textContent = 'Main menu'
  m.addEventListener('click', () => show('title'))
  buttons.append(m)
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
  if (ui && ui.holding?.tool !== 'mallet') ui.holding = null
})
canvas.addEventListener('pointerdown', (e) => {
  unlockAudio()
  if (!game || screen !== 'play' || paused) return
  if (e.button === 2) return
  const p = point(e)
  ui.mouse = p
  ui.hover = toLawn(game, p.x, p.y)
  click(p)
})
function click(p) {
  const g = game
  if (g.phase !== 'play') return
  const lawn = toLawn(g, p.x, p.y)
  // Seeds, the belt and the shovel
  if (g.belt) {
    for (let i = 0; i < g.belt.items.length; i++) {
      if (inside(p, beltRect(i, g.belt.items[i]))) {
        ui.holding = ui.holding?.from === 'belt' && ui.holding.index === i ? null : { id: g.belt.items[i].id, from: 'belt', index: i }
        playSfx('pick')
        return
      }
    }
  } else {
    for (let i = 0; i < g.seeds.length; i++) {
      if (!inside(p, seedRect(i))) continue
      const s = g.seeds[i]
      const def = PLANT_BY_ID[s.id]
      if (ui.holding?.from === 'seed' && ui.holding.index === i) ui.holding = g.special === 'whack' ? { tool: 'mallet' } : null
      else if (g.t >= s.readyAt && g.sun >= def.cost) {
        ui.holding = { id: s.id, from: 'seed', index: i, imitated: s.imitated }
        playSfx('pick')
      } else playSfx('buzz')
      return
    }
  }
  if (ui.shovel && inside(p, shovelRect(g))) {
    ui.holding = ui.holding?.tool === 'shovel' ? null : { tool: 'shovel' }
    playSfx('pick')
    return
  }
  // Sun and coins (also while holding something)
  if (g.collectAt(lawn.x, lawn.y)) return
  const h = ui.holding
  if (h?.id && lawn.inside) {
    const ok = h.from === 'belt' ? g.plantBelt(h.index, lawn.r, lawn.c) : g.plantSeed(h.index, lawn.r, lawn.c)
    if (ok) ui.holding = g.special === 'whack' ? { tool: 'mallet' } : null
    else playSfx('buzz')
    return
  }
  if (h?.tool === 'shovel') {
    if (lawn.inside) g.shovel(lawn.r, lawn.c)
    ui.holding = null
    return
  }
  if (h?.tool === 'cannon') {
    if (lawn.inside) g.fireCannon(h.plant, lawn.x, lawn.r)
    ui.holding = null
    return
  }
  if (g.special === 'whack') {
    ui.malletDown = true
    setTimeout(() => ui && (ui.malletDown = false), 120)
    g.whack(lawn.x, lawn.y + 0.5 - 0.5)
    return
  }
  if (g.special === 'vase' && lawn.inside && g.breakVase(lawn.r, lawn.c)) return
  // A ready Kernel Cannon: aim it
  if (lawn.inside) {
    const m = g.cells[lawn.r][lawn.c].main
    if (m && g.cannonReady(m)) {
      ui.holding = { tool: 'cannon', plant: m }
      playSfx('pick')
    }
  }
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') return toggleMute()
  if (!game) return
  if (e.key === 'Escape') {
    if (screen === 'play' && ui.holding && ui.holding.tool !== 'mallet') ui.holding = null
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
  if (e.key === 's' || e.key === 'S') {
    if (ui.shovel) ui.holding = ui.holding?.tool === 'shovel' ? null : { tool: 'shovel' }
    return
  }
  const n = '1234567890'.indexOf(e.key)
  if (n >= 0) {
    const r = game.belt ? beltRect(n, game.belt.items[n] ?? { x: 99 }) : seedRect(n)
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
let almanacFromPause = false
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-do]')
  if (!b) return
  unlockAudio()
  const what = b.dataset.do
  if (what === 'adventure') startLevel(save.next ?? '5-10')
  else if (what === 'levels') show('levels')
  else if (what === 'almanac') {
    // from the pause menu, the Almanac's Back goes back to the pause menu
    almanacFromPause = screen === 'paused'
    show('almanac')
  }
  else if (what === 'shop') show('shop')
  else if (what === 'title' && screen === 'almanac' && almanacFromPause) {
    almanacFromPause = false
    show('paused')
  } else if (what === 'title') {
    paused = false
    show('title')
  } else if (what === 'resume') pause(false)
  else if (what === 'restart') {
    paused = false
    startLevel(game?.level.id ?? pickedLevel)
  }
})

// ================= The Almanac =================
let almTab = 'plants'
let almSel = 'pea'
$$('.tab').forEach((t) =>
  t.addEventListener('click', () => {
    almTab = t.dataset.tab
    almSel = almTab === 'plants' ? 'pea' : 'scroller'
    renderAlmanac()
  }),
)
const RECHARGE = { 7.5: 'Fast (7.5 s)', 30: 'Slow (30 s)', 50: 'Very slow (50 s)' }
function toughness(hp) {
  return hp < 300 ? 'Low' : hp < 700 ? 'Medium' : hp < 1500 ? 'High' : hp < 5000 ? 'Extreme' : 'Ridiculous'
}
function renderAlmanac() {
  $$('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === almTab)))
  const grid = $('#alm-grid')
  grid.replaceChildren()
  const have = new Set(unlockedPlants())
  const seen = new Set([...(save.seen ?? []), 'scroller', 'trend'])
  const items = almTab === 'plants' ? PLANTS : ZOMBIES
  for (const it of items) {
    const known = almTab === 'plants' ? have.has(it.id) || !!it.shop : seen.has(it.id) || (it.id === 'backup' && seen.has('dancer')) || (it.id === 'ipadkid' && seen.has('gigachad'))
    const b = document.createElement('button')
    b.setAttribute('aria-pressed', String(it.id === almSel))
    b.disabled = !known
    const c = document.createElement('canvas')
    c.width = 108
    c.height = 108
    if (known)
      pixelCanvas(c, 4, (cx) => {
        cx.scale(2, 2)
        if (almTab === 'plants') drawPlantCard(cx, it.id, 27, 50, 0.5)
        else drawZombieCard(cx, it.id, 30, 52, 0.36)
      })
    b.append(c, known ? it.name : '???')
    b.addEventListener('click', () => {
      almSel = it.id
      renderAlmanac()
    })
    grid.append(b)
  }
  const it = (almTab === 'plants' ? PLANT_BY_ID : ZOMBIE_BY_ID)[almSel]
  $('#alm-name').textContent = it.name
  $('#alm-desc').textContent = it.desc
  $('#alm-flavor').textContent = it.flavor
  const stats = $('#alm-stats')
  stats.replaceChildren()
  const add = (k, v) => {
    const dt = document.createElement('dt')
    dt.textContent = k
    const dd = document.createElement('dd')
    dd.textContent = v
    stats.append(dt, dd)
  }
  if (almTab === 'plants') {
    add('Sun', String(it.cost))
    add('Recharge', RECHARGE[it.recharge] ?? `${it.recharge} s`)
    add('Toughness', `${it.hp}`)
    if (it.mushroom) add('Note', 'Sleeps in the daytime (wake it with an Espresso Bean)')
    if (it.upgrade) add('Goes on', PLANT_BY_ID[it.upgrade].name)
    if (it.shop) add('Garage Sale', `$${it.shop.toLocaleString()}`)
  } else {
    const total = it.hp + (it.helmet?.hp ?? 0) + (it.shield?.hp ?? 0)
    add('Toughness', `${toughness(total)} (${total})`)
    if (it.helmet) add('Wears', `${it.helmet.name}${it.helmet.metal ? ' (metal)' : ''}`)
    if (it.shield) add('Carries', `${it.shield.name}${it.shield.metal ? ' (metal)' : ''}`)
    add('Speed', it.speed === 0 ? '—' : it.speed < 0.2 ? 'Slow' : it.speed < 0.3 ? 'Normal' : it.speed < 0.5 ? 'Fast' : 'Very fast')
  }
}
// The Almanac's big picture, animated while it's open.
function drawAlmanacArt(t) {
  const c = $('#alm-art')
  pixelCanvas(c, 4, (x) => {
    if (almTab === 'plants') drawPlantCard(x, almSel, 110, 170, 1.4, t)
    else drawZombieCard(x, almSel, 120, 186, almSel === 'gigachad' ? 0.62 : 1.1, t)
  })
}

// ================= Gary’s Garage Sale =================
function renderShop() {
  $('#shop-coins').textContent = `$${save.coins.toLocaleString()}`
  const list = $('#shop-list')
  list.replaceChildren()
  const have = new Set(unlockedPlants())
  for (const it of SHOP) {
    const owned = save.owned.includes(it.id) && !it.consumable
    let available = true
    if (it.needs?.startsWith('area:')) available = reached(it.needs === 'area:pool' ? '3-1' : '5-1')
    else if (it.needs === 'beat') available = reached('5-1')
    else if (it.needs?.startsWith('plant:')) available = have.has(it.needs.slice(6))
    else if (it.needs) available = save.owned.includes(it.needs)
    const card = document.createElement('div')
    card.className = 'shop-item'
    const count = it.consumable ? save.owned.filter((o) => o === it.id).length : 0
    card.innerHTML = `<b>${it.icon} ${it.name}</b><small>${it.desc}</small><span>$${it.price.toLocaleString()}${count ? ` · you have ${count}` : ''}</span>`
    const b = document.createElement('button')
    b.className = 'btn small'
    b.textContent = owned ? 'Owned' : !available ? 'Not yet' : 'Buy'
    b.disabled = owned || !available || save.coins < it.price
    b.addEventListener('click', () => {
      if (save.coins < it.price) return
      save.coins -= it.price
      save.owned.push(it.id)
      store()
      playSfx('buy')
      renderShop()
    })
    card.append(b)
    list.append(card)
  }
}

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
  if (game && game.phase !== 'intro' && (game.phase === 'won' || game.phase === 'lost')) game.update(dt)
  // draw
  // the title screen is its own little scene
  if (!game) {
    drawTitleScene(ctx, now / 1000, { night: false, title: ['LAWN OF', 'THE DEAD'] })
    return
  }
  const g = game ?? titleScene(now)
  if (g) {
    ui ??= { banners: [] }
    banners = banners.filter((b) => b.until > now)
    const view = game ? { ...ui, banners } : { banners: [], hover: null, holding: null }
    drawGamePixel(ctx, g, view)
  }
  if (screen === 'almanac') drawAlmanacArt(now / 1000)
}
/** Behind the title screen: a lawn with a few plants and zombies, just idling. */
function titleScene(now) {
  if (!showcase) {
    showcase = createGame('1-4', { skipIntro: true })
    const g = showcase
    g.update(0.001)
    ;[
      ['sun', 0, 0],
      ['pea', 0, 1],
      ['double', 1, 2],
      ['sun', 1, 0],
      ['coco', 2, 4],
      ['frost', 2, 1],
      ['gulp', 3, 3],
      ['sun', 3, 0],
      ['pea', 4, 2],
      ['mine', 4, 5],
    ].forEach(([id, r, c]) => g._addPlant(id, r, c, { free: true }))
    g.plants.find((p) => p.type === 'mine').armed = true
    g.plants.find((p) => p.type === 'mine').timer = 0
    ;[
      ['scroller', 0, 7.3],
      ['beanie', 1, 8.1],
      ['vr', 3, 6.9],
      ['selfie', 4, 8.4],
      ['cryptobro', 2, 8.6],
    ].forEach(([id, r, x]) => g._spawn(id, r, x))
    g.phase = 'won' // nothing moves
  }
  showcase.t = now / 1000
  return showcase
}
requestAnimationFrame(frame)
show('title')
document.fonts?.load("16px 'Press Start 2P'").then(() => screen === 'picker' && renderPicker()).catch(() => {})

// For tests and the curious.
window.tg = {
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
  startLevel,
  begin,
  show,
  pause,
  click,
}
