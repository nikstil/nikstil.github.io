// Bits every game uses: the bet amount box, toasts, item cards, the live feed.

import { balance, fmt, r2 } from './wallet.js'
import { iconFor, rarityOf, shortName, itemValue } from '../strife/items.js'
import { wearOf, kindOf } from '../strife/skins.js'
import { click } from './sound.js'

export const $ = (s, el = document) => el.querySelector(s)
export const $$ = (s, el = document) => [...el.querySelectorAll(s)]
export const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
export function h(html) {
  const t = document.createElement('template')
  t.innerHTML = html.trim()
  return t.content.firstElementChild
}
export const coins = (v) => `<span class="c">ⓒ</span>${fmt(v)}`
export const hex = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('')

/** The bet box: an amount with ½, 2×, +1, +10, +100, Max and Clear. */
export function betBox(start = 1) {
  const el = h(`<div class="betbox">
    <label class="amount"><span class="c">ⓒ</span><input type="number" min="0" step="0.01" inputmode="decimal" aria-label="Bet amount"></label>
    <div class="quick"><button data-q="clear">Clear</button><button data-q="+1">+1</button><button data-q="+10">+10</button><button data-q="+100">+100</button><button data-q="half">½</button><button data-q="double">2×</button><button data-q="max">Max</button></div>
  </div>`)
  const input = $('input', el)
  input.value = start
  el.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]')?.dataset.q
    if (!q) return
    click()
    const v = Number(input.value) || 0
    const next = q === 'clear' ? 0 : q === 'half' ? v / 2 : q === 'double' ? v * 2 : q === 'max' ? balance() : v + Number(q)
    input.value = r2(Math.max(0, Math.min(next, 1e9)))
  })
  return {
    el,
    get value() {
      return r2(Math.max(0, Number(input.value) || 0))
    },
    set value(v) {
      input.value = r2(v)
    },
  }
}

let toastBox = null
/** A message in the corner. kind: '' | 'win' | 'lose' | 'err' */
export function toast(text, kind = '') {
  toastBox ??= document.body.appendChild(h('<div class="toasts" aria-live="polite"></div>'))
  const t = h(`<div class="toast ${kind}"></div>`)
  t.textContent = text
  toastBox.append(t)
  setTimeout(() => t.classList.add('out'), 2600)
  setTimeout(() => t.remove(), 3100)
}

/** A skin (or sticker, or music kit) as a card. opts: { price, note, sel } */
export function itemCard(it, opts = {}) {
  const r = rarityOf(it)
  const card = h(`<div class="item${opts.sel ? ' sel' : ''}" style="--r:${r.color}">
    <img alt="" loading="lazy"><b></b><small></small><span class="val"></span></div>`)
  const img = $('img', card)
  // pictures are drawn on demand (a gun with its skin takes a moment the first time)
  queueMicrotask(() => (img.src = iconFor(it, 150, 60)))
  $('b', card).textContent = (it.st != null ? 'StatTrak™ ' : '') + shortName(it)
  $('small', card).textContent = kindOf(it) === 'skin' ? wearOf(it.wear).name : r.name
  $('.val', card).innerHTML = coins(opts.price ?? itemValue(it))
  if (opts.note) card.append(h(`<i class="note">${esc(opts.note)}</i>`))
  return card
}

// ---------------- The live feed (big wins and chat), shown on wide screens
const feedList = []
const feedSubs = new Set()
export function feed(entry) {
  feedList.push({ ...entry, at: Date.now() })
  if (feedList.length > 40) feedList.shift()
  feedSubs.forEach((f) => f(entry))
}
export const feedItems = () => feedList
export const onFeed = (f) => (feedSubs.add(f), () => feedSubs.delete(f))
