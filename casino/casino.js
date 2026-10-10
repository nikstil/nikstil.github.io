// SKINSINK.GG: the page. A header with your balance (＋ buys credits with pretend money), a tab for
// each game, and (on wide screens) the live feed of big wins and chat. Roulette, Crash and the
// coinflip lobby keep running in the background whichever tab you're on.

import { onWallet, balance, fmt } from './wallet.js'
import { $, $$, h, feed, feedItems, onFeed } from './ui.js'
import { anyone, chatLine } from './bots.js'
import { isMuted, setMuted, click } from './sound.js'
import { openCreditStore } from '../strife/credits.js'
import * as roulette from './roulette.js'
import * as crash from './crash.js'
import * as coinflip from './coinflip.js'
import * as battles from './battles.js'
import * as upgrader from './upgrader.js'
import { mountMarket, mountInventory, mountFree } from './shop.js'

const q = new URLSearchParams(location.search)
if (q.has('embed')) document.documentElement.classList.add('embed')

const TABS = [
  { id: 'roulette', name: 'Roulette', icon: '🎡', mount: roulette.mount },
  { id: 'crash', name: 'Crash', icon: '🚀', mount: crash.mount },
  { id: 'coinflip', name: 'Coinflip', icon: '🪙', mount: coinflip.mount },
  { id: 'battles', name: 'Case Battles', icon: '⚔️', mount: battles.mount },
  { id: 'upgrader', name: 'Upgrader', icon: '⬆️', mount: upgrader.mount },
  { id: 'market', name: 'Market', icon: '🛒', mount: mountMarket },
  { id: 'inventory', name: 'Inventory', icon: '🎒', mount: mountInventory },
  { id: 'free', name: 'Free', icon: '🎁', mount: mountFree },
]

const nav = $('#tabs')
nav.innerHTML = TABS.map((t) => `<a href="#${t.id}" data-tab="${t.id}"><span aria-hidden="true">${t.icon}</span>${t.name}</a>`).join('')
const view = $('#view')
let unmount = null
let current = null
function show(id) {
  const t = TABS.find((x) => x.id === id) ?? TABS[0]
  if (current === t.id) return
  current = t.id
  if (typeof unmount === 'function') unmount()
  unmount = null
  // each tab gets a fresh element (and its listeners go with the old one)
  const host = document.createElement('div')
  view.replaceChildren(host)
  $$('[data-tab]', nav).forEach((a) => a.classList.toggle('sel', a.dataset.tab === t.id))
  $(`[data-tab="${t.id}"]`, nav)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  const r = t.mount(host)
  unmount = typeof r === 'function' ? r : null
  refreshTab = typeof r?.refresh === 'function' ? r.refresh : null
  document.title = `${t.name} · SKINSINK.GG`
}
let refreshTab = null
addEventListener('hashchange', () => show(location.hash.slice(1)))

// ---------------- Balance
const bal = $('#balance b')
let shown = balance()
function paintBalance() {
  const now = balance()
  if (now !== shown) {
    const up = now > shown
    bal.parentElement.classList.remove('up', 'down')
    void bal.offsetWidth
    bal.parentElement.classList.add(up ? 'up' : 'down')
    shown = now
  }
  bal.textContent = fmt(now)
}
onWallet(() => {
  paintBalance()
  if (current === 'inventory') refreshTab?.()
})
paintBalance()
$('#deposit').addEventListener('click', () => {
  click()
  openCreditStore()
})
const mute = $('#mute')
const paintMute = () => {
  mute.textContent = isMuted() ? '🔇' : '🔊'
  mute.setAttribute('aria-label', isMuted() ? 'Sound off' : 'Sound on')
}
mute.addEventListener('click', () => {
  setMuted(!isMuted())
  paintMute()
})
paintMute()

// ---------------- The live feed
const list = $('#feed ul')
function feedRow(e) {
  const li = h(`<li class="${e.kind}"><b></b> <span></span></li>`)
  $('b', li).textContent = `${e.who.face} ${e.who.name}${e.kind === 'chat' ? ':' : ''}`
  $('span', li).textContent = e.text
  return li
}
for (const e of feedItems()) list.append(feedRow(e))
onFeed((e) => {
  list.append(feedRow(e))
  while (list.children.length > 40) list.firstElementChild.remove()
  list.scrollTop = list.scrollHeight
})
setInterval(() => Math.random() < 0.6 && feed({ kind: 'chat', who: anyone(), text: chatLine() }), 3200)
feed({ kind: 'chat', who: anyone(), text: 'gl everyone' })

// ---------------- Go
roulette.start()
crash.start()
coinflip.start()
show(location.hash.slice(1) || 'roulette')
