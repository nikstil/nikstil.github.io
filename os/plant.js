// The desk plant (bottom right, by the tray) and the zombies that come for your icons.
// Water it once a day and it grows (a seedling, a sprout, a pot plant, a sunflower); grown enough,
// it shoots peas at zombies. Leave it two days and it wilts, and the zombies come: they walk in
// from the right, eat desktop icons, and only stop when you bonk them (click) or the plant gets
// them. Eaten icons wait in the Recycle Bin.

import { feat } from './feats.js'

const KEY = 'nikstilos-plant'
const EATEN = 'nikstilos-eaten'
const read = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d
  } catch {
    return d
  }
}
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {}
}
const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 86400000)

export function plantState() {
  return read(KEY, { born: null, days: [], last: null, invaded: null })
}
/** 0 seed, 1 seedling, 2 sprout, 3 pot plant, 4 sunflower; 'wilted' after two days without water. */
export function stageOf(p = plantState()) {
  if (!p.born) return 0
  if (p.last && daysBetween(p.last, today()) >= 2) return 'wilted'
  const n = p.days.length
  return n >= 7 ? 4 : n >= 4 ? 3 : n >= 2 ? 2 : 1
}
const FACE = { 0: '🌰', 1: '🌱', 2: '🌿', 3: '🪴', 4: '🌻', wilted: '🥀' }
const NAME = { 0: 'a seed', 1: 'a seedling', 2: 'a sprout', 3: 'a pot plant', 4: 'a sunflower', wilted: 'wilted' }
export const eatenIcons = () => read(EATEN, [])

let os = null
let el = null
const zombies = []
const peas = []
let raf = 0
let lastT = 0
let shootIn = 2

function paint() {
  const p = plantState()
  const s = stageOf(p)
  el.querySelector('.pl-face').textContent = FACE[s]
  el.classList.toggle('wilted', s === 'wilted')
  const watered = p.last === today()
  el.title = !p.born ? 'A seed. Click to plant it.' : s === 'wilted' ? 'Wilted. Water it before the zombies notice.' : `Desk plant: ${NAME[s]}, ${p.days.length} day${p.days.length === 1 ? '' : 's'} watered${watered ? ' (watered today ✓)' : ' · click to water'}${s >= 2 ? ' · shoots peas' : ''}`
  el.setAttribute('aria-label', el.title)
}
function water() {
  const p = plantState()
  const t = today()
  const firstTime = !p.born
  if (!p.born) p.born = t
  if (p.last === t) {
    os.balloon?.('🌱 Desk plant', `Already watered today. It’s ${NAME[stageOf(p)]}. Come back tomorrow.`)
    return
  }
  if (!p.days.includes(t)) p.days.push(t)
  p.days = p.days.slice(-60)
  p.last = t
  write(KEY, p)
  feat('plantDays', p.days.length, 'max')
  el.classList.remove('watering')
  void el.offsetWidth
  el.classList.add('watering')
  paint()
  os.balloon?.('🌱 Desk plant', firstTime ? 'Planted! Water it once a day and it grows. Forget it for two days and… well. You’ll see.' : `Watered. It’s ${NAME[stageOf(p)]} now (${p.days.length} days).`)
}

// ---------------- Zombies
function iconTargets() {
  return [...document.querySelectorAll('.desk-icons > li')].filter((li) => !li.hidden && li.offsetParent && !li.classList.contains('being-eaten'))
}
const keyOf = (li) => os.iconKey(li.querySelector('.desk-icon'))
function spawn(delay, tough, pace = 1) {
  setTimeout(() => {
    const z = document.createElement('button')
    z.type = 'button'
    z.className = `zombie${tough ? ' tough' : ''}`
    z.setAttribute('aria-label', 'Zombie (click to bonk)')
    z.innerHTML = `<span class="zb-body">🧟</span>${tough ? '<span class="zb-hat">🪣</span>' : ''}<i class="zb-hp"></i>`
    document.body.append(z)
    const zz = { el: z, x: innerWidth + 10, y: innerHeight - os.taskbarHeight() - 56, hp: tough ? 6 : 3, max: tough ? 6 : 3, speed: (26 + Math.random() * 16) * pace, target: null, eating: 0, dead: false }
    z.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      hit(zz, 1, true)
    })
    zombies.push(zz)
    run()
  }, delay)
}
function hit(z, dmg, bonk) {
  if (z.dead) return
  z.hp -= dmg
  z.x += 14
  z.el.classList.remove('hurt')
  void z.el.offsetWidth
  z.el.classList.add('hurt')
  if (bonk) {
    const pow = document.createElement('i')
    pow.className = 'zb-pow'
    pow.textContent = ['💥', 'BONK', 'POW'][Math.floor(Math.random() * 3)]
    z.el.append(pow)
    setTimeout(() => pow.remove(), 500)
  }
  if (z.hp <= 0) {
    z.dead = true
    if (z.target) z.target.classList.remove('being-eaten')
    feat('zombiesBonked', 1)
    z.el.classList.add('down')
    setTimeout(() => z.el.remove(), 900)
  }
}
function eat(z) {
  const li = z.target
  li.classList.remove('being-eaten')
  const k = keyOf(li)
  const list = eatenIcons()
  if (!list.includes(k)) list.push(k)
  write(EATEN, list)
  li.hidden = true
  feat('iconsEaten', 1)
  os.layoutIcons()
  z.target = null
}
function tick(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016)
  lastT = t
  const alive = zombies.filter((z) => !z.dead)
  for (const z of alive) {
    if (z.eating > 0) {
      z.eating -= dt
      if (z.eating <= 0) eat(z)
    } else {
      if (!z.target || z.target.hidden) {
        const icons = iconTargets()
        // the nearest icon (they start on the right, so that's usually the rightmost)
        z.target = icons.sort((a, b) => dist(z, a) - dist(z, b))[0] ?? null
      }
      if (z.target) {
        const r = z.target.getBoundingClientRect()
        const tx = r.left + r.width / 2 - 24
        const ty = r.top + r.height / 2 - 28
        const d = Math.hypot(tx - z.x, ty - z.y)
        if (d < 14) {
          z.eating = 2.4
          z.target.classList.add('being-eaten')
        } else {
          z.x += ((tx - z.x) / d) * z.speed * dt
          z.y += ((ty - z.y) / d) * z.speed * dt
        }
      } else {
        // nothing left to eat: off they go, to find more brains
        z.x -= z.speed * dt * 2
        if (z.x < -80) {
          z.dead = true
          z.el.remove()
        }
      }
    }
    z.el.classList.toggle('eating', z.eating > 0)
    z.el.style.transform = `translate(${z.x}px, ${z.y}px)`
    z.el.querySelector('.zb-hp').style.width = `${(Math.max(0, z.hp) / z.max) * 100}%`
  }
  // the plant shoots
  const s = stageOf()
  if (alive.length && typeof s === 'number' && s >= 2) {
    shootIn -= dt
    if (shootIn <= 0) {
      shootIn = s >= 4 ? 0.9 : s >= 3 ? 1.4 : 2.2
      const pr = el.getBoundingClientRect()
      const from = { x: pr.left + pr.width / 2, y: pr.top + 8 }
      const target = alive.sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0]
      const p = document.createElement('i')
      p.className = 'pea'
      document.body.append(p)
      peas.push({ el: p, x: from.x, y: from.y, z: target })
    }
  }
  for (const p of [...peas]) {
    const z = p.z
    const tx = z.x + 24
    const ty = z.y + 28
    const d = Math.hypot(tx - p.x, ty - p.y)
    if (z.dead || d < 12) {
      if (!z.dead) hit(z, 1, false)
      p.el.remove()
      peas.splice(peas.indexOf(p), 1)
      continue
    }
    p.x += ((tx - p.x) / d) * 520 * dt
    p.y += ((ty - p.y) / d) * 520 * dt
    p.el.style.transform = `translate(${p.x}px, ${p.y}px)`
  }
  if (zombies.some((z) => !z.dead) || peas.length) raf = requestAnimationFrame(tick)
  else {
    raf = 0
    zombies.length = 0
    endWave()
  }
}
const dist = (z, li) => {
  const r = li.getBoundingClientRect()
  return Math.hypot(r.left - z.x, r.top - z.y)
}
function run() {
  if (raf) return
  lastT = performance.now()
  raf = requestAnimationFrame(tick)
}
let waveOn = false
function endWave() {
  if (!waveOn) return
  waveOn = false
  feat('wavesSurvived', 1)
  const n = eatenIcons().length
  os.balloon?.('🧟 The zombies are gone', n ? `They ate ${n} icon${n === 1 ? '' : 's'}: they’re in the Recycle Bin. Water your plant.` : 'Not a single icon lost. The plant is proud of you.')
}
/** Sends in a wave of n zombies. */
export function invade(n = 4, pace = 1) {
  waveOn = true
  for (let i = 0; i < n; i++) spawn((i * 2600 + Math.random() * 1200) / pace, Math.random() < 0.2, pace)
  os.balloon?.('🧟 Zombies!', 'They’re coming for your icons. Click them to bonk them.')
}
/** Puts eaten icons back on the desktop. */
export function restoreEaten() {
  const keys = eatenIcons()
  write(EATEN, [])
  for (const li of document.querySelectorAll('.desk-icons > li')) {
    const b = li.querySelector('.desk-icon')
    if (b && keys.includes(os.iconKey(b)) && !os.siteHidden(li)) li.hidden = false
  }
  os.layoutIcons()
  return keys.length
}
export const invading = () => zombies.some((z) => !z.dead)

/** Puts the plant on the desktop and decides whether the zombies come today. os: { taskbarHeight, layoutIcons, iconKey, siteHidden(li), balloon(title, text) } */
export function initPlant(api) {
  os = api
  el = document.createElement('button')
  el.type = 'button'
  el.className = 'plant'
  el.innerHTML = '<span class="pl-face" aria-hidden="true"></span><span class="pl-pot" aria-hidden="true"></span><span class="pl-drops" aria-hidden="true">💧</span>'
  el.addEventListener('click', water)
  document.getElementById('desktop').append(el)
  paint()
  // icons eaten last time stay eaten
  const eaten = eatenIcons()
  if (eaten.length) {
    for (const li of document.querySelectorAll('.desk-icons > li')) {
      const b = li.querySelector('.desk-icon')
      if (b && eaten.includes(os.iconKey(b))) li.hidden = true
    }
    os.layoutIcons()
  }
  // the zombies come for a wilted plant (and now and then for anyone), once a day at most
  const p = plantState()
  const s = stageOf(p)
  const t = today()
  if (p.born && p.invaded !== t) {
    const neglected = s === 'wilted' ? daysBetween(p.last, t) : 0
    if (neglected || (p.days.length >= 3 && Math.random() < 0.12)) {
      p.invaded = t
      write(KEY, p)
      setTimeout(() => invade(neglected ? Math.min(10, 2 + neglected) : 3), 25000)
    }
  }
  setInterval(paint, 60000)
}
