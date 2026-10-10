// Other visitors, live: everyone on the BloatOS desktop right now shows up as a ghost cursor with a
// made-up name ("Sleepy Llama"). Throw paper planes at each other (a few set messages: nothing you
// type is sent). Anonymous: no account, no name of yours, just where your cursor is on the screen.
// Runs over Supabase realtime when the site's online features are on (or, with ?ghosts=local, between
// tabs of this browser, for testing). The 👻 in the tray hides them, and you from them.

import { feat } from './feats.js'

const ADJ = ['Sleepy', 'Sneaky', 'Curious', 'Grumpy', 'Spooky', 'Fluffy', 'Caffeinated', 'Suspicious', 'Wobbly', 'Polite', 'Feral', 'Damp', 'Overdue', 'Shy', 'Loud', 'Corporate']
const ANIMAL = ['Llama', 'Otter', 'Goose', 'Badger', 'Axolotl', 'Pigeon', 'Capybara', 'Raccoon', 'Moth', 'Walrus', 'Ferret', 'Hedgehog', 'Narwhal', 'Snail', 'Crab', 'Possum']
export const PLANE_MESSAGES = ['👋 hi!', 'nice desktop', 'gg', 'rush B', '🧟 run!', 'water your plant', 'have you tried turning it off and on again', 'I can see you', '❤️']
const KEY = 'nikstilos-ghosts'
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const hue = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

let me = null
let room = null
let enabled = true
const ghosts = new Map() // id -> { el, name, x, y, tx, ty, seen }
let raf = 0
let os = null
let lastSent = 0
let pending = null

export const isEnabled = () => enabled
export const count = () => ghosts.size

/** Supabase realtime (presence: who's here; broadcast: cursors and planes), or tabs of this browser. */
async function openRoom(handlers) {
  const local = new URLSearchParams(location.search).get('ghosts') === 'local'
  const on = window.nikstilOnline
  if (!local && on && (await on.configured.catch(() => false))) {
    const client = await on.connect()
    const ch = client.channel('bloatos:desktop', { config: { broadcast: { self: false, ack: false }, presence: { key: me.id } } })
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState()
      handlers.members(Object.entries(st).filter(([id, m]) => id !== me.id && m[0]).map(([id, m]) => ({ id, ...m[0] })))
    })
      .on('broadcast', { event: 'c' }, ({ payload }) => handlers.cursor(payload))
      .on('broadcast', { event: 'p' }, ({ payload }) => handlers.plane(payload))
      .subscribe((status) => status === 'SUBSCRIBED' && ch.track({ name: me.name }))
    return { send: (ev, p) => ch.send({ type: 'broadcast', event: ev, payload: p }), leave: () => client.removeChannel(ch) }
  }
  if (!local) return null
  const bc = new BroadcastChannel('bloatos-ghosts')
  const peers = new Map()
  const post = (m) => bc.postMessage({ ...m, from: me.id })
  bc.onmessage = ({ data: m }) => {
    if (m.from === me.id) return
    if (m.t === 'here') {
      const had = peers.has(m.from)
      peers.set(m.from, { name: m.name, seen: Date.now() })
      if (!had) handlers.members([...peers].map(([id, p]) => ({ id, name: p.name })))
    } else if (m.t === 'bye') {
      peers.delete(m.from)
      handlers.members([...peers].map(([id, p]) => ({ id, name: p.name })))
    } else if (m.t === 'c') handlers.cursor(m.p)
    else if (m.t === 'p') handlers.plane(m.p)
  }
  const beat = setInterval(() => {
    post({ t: 'here', name: me.name })
    let gone = false
    for (const [id, p] of peers) if (Date.now() - p.seen > 5000) (peers.delete(id), (gone = true))
    if (gone) handlers.members([...peers].map(([id, p]) => ({ id, name: p.name })))
  }, 1000)
  post({ t: 'here', name: me.name })
  addEventListener('pagehide', () => post({ t: 'bye' }))
  return { send: (ev, p) => post({ t: ev, p }), leave: () => (clearInterval(beat), post({ t: 'bye' }), bc.close()) }
}

function ghostEl(id, name) {
  let g = ghosts.get(id)
  if (g) return g
  const el = document.createElement('div')
  el.className = 'ghost-cursor'
  el.style.setProperty('--h', hue(name))
  el.innerHTML = '<svg viewBox="0 0 16 22" width="18" height="24" aria-hidden="true"><path d="M1 1 L1 17 L5 13 L8 20 L11 19 L8 12 L14 12 Z"/></svg><span></span>'
  el.querySelector('span').textContent = name
  el.hidden = true
  document.body.append(el)
  g = { el, name, x: -100, y: -100, tx: -100, ty: -100, seen: 0 }
  ghosts.set(id, g)
  return g
}
function animate() {
  raf = requestAnimationFrame(animate)
  for (const g of ghosts.values()) {
    g.x += (g.tx - g.x) * 0.2
    g.y += (g.ty - g.y) * 0.2
    g.el.style.transform = `translate(${g.x}px, ${g.y}px)`
    // a ghost that hasn't moved for a while fades out (they're still here, just quiet)
    g.el.classList.toggle('idle', Date.now() - g.seen > 15000)
  }
}
function paintTray() {
  const b = document.getElementById('ghost-tray')
  if (!b) return
  b.hidden = !room
  b.classList.toggle('off', !enabled)
  b.querySelector('b').textContent = enabled && ghosts.size ? ghosts.size : ''
  b.title = enabled ? `${ghosts.size ? `${ghosts.size} other visitor${ghosts.size === 1 ? '' : 's'} here` : 'Nobody else here right now'} (you’re “${me.name}”). Click to hide them, and you.` : 'Other visitors are hidden. Click to show them.'
}

// ---------------- Sending your cursor (a few times a second, only when it moves)
function onMove(e) {
  if (!enabled || !room) return
  pending = { x: e.clientX / innerWidth, y: e.clientY / innerHeight }
  const now = performance.now()
  if (now - lastSent < 330) return
  flush()
}
function flush() {
  if (!pending || !room) return
  lastSent = performance.now()
  room.send('c', { id: me.id, name: me.name, ...pending })
  pending = null
}

// ---------------- Paper planes
/** Throws a plane with one of the set messages at someone (or across the screen). */
export function throwPlane(msgIndex, from) {
  const msg = PLANE_MESSAGES[msgIndex] ?? PLANE_MESSAGES[0]
  const others = [...ghosts.entries()].filter(([, g]) => !g.el.hidden)
  const target = others.length ? pick(others) : null
  const to = target ? { x: target[1].tx / innerWidth, y: target[1].ty / innerHeight } : { x: Math.random(), y: Math.random() * 0.6 }
  const p = { from: { x: from.x / innerWidth, y: from.y / innerHeight }, to, msg: msgIndex, by: me.name, at: target?.[0] ?? null }
  fly(p, true)
  room?.send('p', p)
  feat('planes', 1)
}
function fly(p, mine) {
  const el = document.createElement('div')
  el.className = 'paper-plane'
  el.textContent = '✈️'
  document.body.append(el)
  const x0 = p.from.x * innerWidth
  const y0 = p.from.y * innerHeight
  const x1 = p.to.x * innerWidth
  const y1 = p.to.y * innerHeight
  const ang = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI
  el.animate(
    [
      { transform: `translate(${x0}px, ${y0}px) rotate(${ang}deg) scale(.6)` },
      { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 80}px) rotate(${ang}deg) scale(1.2)`, offset: 0.5 },
      { transform: `translate(${x1}px, ${y1}px) rotate(${ang}deg) scale(1)` },
    ],
    { duration: 1400, easing: 'ease-in-out', fill: 'forwards' },
  ).onfinish = () => {
    el.remove()
    const note = document.createElement('div')
    note.className = 'plane-note'
    note.style.left = `${Math.min(innerWidth - 220, Math.max(8, x1 - 40))}px`
    note.style.top = `${Math.max(8, y1 - 10)}px`
    note.textContent = `${mine ? 'You' : p.by}: ${PLANE_MESSAGES[p.msg] ?? '👋'}`
    if (!mine && p.at === me.id) note.classList.add('for-me')
    document.body.append(note)
    setTimeout(() => note.remove(), 4000)
    if (!mine && p.at === me.id) feat('planesCaught', 1)
  }
}

/** Starts the ghosts (if the site is online, or ?ghosts=local). os: { showMenu, desktop } */
export async function initGhosts(api) {
  os = api
  me = { id: Math.random().toString(36).slice(2, 10), name: `${pick(ADJ)} ${pick(ANIMAL)}` }
  try {
    enabled = localStorage.getItem(KEY) !== 'off'
  } catch {}
  const handlers = {
    members(list) {
      const ids = new Set(list.map((m) => m.id))
      for (const [id, g] of ghosts) if (!ids.has(id)) (g.el.remove(), ghosts.delete(id))
      for (const m of list) ghostEl(m.id, m.name || 'Somebody')
      if (ghosts.size) feat('ghostsSeen', ghosts.size, 'max')
      paintTray()
    },
    cursor(p) {
      if (!enabled || !p?.id || p.id === me.id || typeof p.x !== 'number' || typeof p.y !== 'number') return
      const g = ghostEl(p.id, String(p.name ?? 'Somebody').slice(0, 30))
      g.tx = Math.max(0, Math.min(1, p.x)) * innerWidth
      g.ty = Math.max(0, Math.min(1, p.y)) * innerHeight
      if (g.el.hidden) {
        g.x = g.tx
        g.y = g.ty
        g.el.hidden = false
      }
      g.seen = Date.now()
      paintTray()
    },
    plane(p) {
      if (!enabled || !p?.from || !p?.to || typeof p.msg !== 'number') return
      fly({ from: { x: +p.from.x || 0, y: +p.from.y || 0 }, to: { x: +p.to.x || 0, y: +p.to.y || 0 }, msg: p.msg | 0, by: String(p.by ?? 'Somebody').slice(0, 30), at: p.at }, false)
    },
  }
  room = enabled ? await openRoom(handlers).catch(() => null) : null
  const tray = document.getElementById('ghost-tray')
  tray?.addEventListener('click', async () => {
    enabled = !enabled
    try {
      localStorage.setItem(KEY, enabled ? 'on' : 'off')
    } catch {}
    if (!enabled) {
      room?.leave()
      room = null
      for (const g of ghosts.values()) g.el.remove()
      ghosts.clear()
      // (the tray button stays so you can turn them back on)
      tray.hidden = false
      tray.classList.add('off')
      tray.querySelector('b').textContent = ''
      tray.title = 'Other visitors are hidden. Click to show them.'
      return
    }
    room = await openRoom(handlers).catch(() => null)
    paintTray()
  })
  if (tray && !room && localStorage.getItem(KEY) === 'off') {
    // switched off before: show the button (off) only if the site could do this at all
    const on = window.nikstilOnline
    if (on && (await on.configured.catch(() => false))) {
      tray.hidden = false
      tray.classList.add('off')
    }
  }
  paintTray()
  addEventListener('pointermove', onMove, { passive: true })
  setInterval(flush, 400)
  raf = requestAnimationFrame(animate)
  return { me }
}
/** Your ghost name, and whether there's anyone to throw at. */
export const whoAmI = () => me
export const online = () => !!room
