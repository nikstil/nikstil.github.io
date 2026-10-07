// The inventory screen: your skins (equip them), your cases (open them with keys, with the
// spinning reel), and what you earn by playing: credits for kills and wins, case drops.

import { WEAPONS } from './weapons.js'
import { gunIcon } from './icons.js'
import {
  RARITY, CASES, KEY_PRICE, skinById, caseById, wearOf, itemName, rollCase, makeItem, skinMaterial, itemKey,
  loadInventory, saveInventory, addItem, toggleEquip, equippedFor, skinDesc, randomSkinFor,
} from './skins.js'

const $ = (s, el = document) => el.querySelector(s)
let inv = loadInventory()
let audio = null
let tab = 'items'
let selUid = null
let filter = 'all'
let onChange = () => {}

export const inventory = () => inv
/** Your equipped skins, weapon id -> descriptor (sent to the host when you join a game). */
export function equippedSkins() {
  inv = loadInventory()
  const out = {}
  for (const w of Object.keys(inv.equipped)) {
    const d = skinDesc(equippedFor(inv, w))
    if (d) out[w] = d
  }
  return out
}
const save = () => {
  saveInventory(inv)
  onChange(inv)
}

// ---------------- In the game
/** The skin a soldier's gun wears: yours for you, now and then a random one for bots. */
export function skinFor(a, weaponId) {
  if (a.remote) return a.netSkins?.[weaponId] ?? null
  if (a.isPlayer) return skinDesc(equippedFor(inv, weaponId))
  if (a.isBot && Math.random() < 0.3) return randomSkinFor(weaponId)
  return null
}
/** A kill by you: a credit, and a tick on a StatTrak™ counter. */
export function rewardKill(weaponId) {
  inv.credits += 1
  const it = equippedFor(inv, weaponId)
  if (it && it.st != null) it.st++
  save()
}
/** A round won by your team: credits, and sometimes a case. Returns the case name or ''. */
export function rewardRound(won) {
  if (!won) return ''
  inv.credits += 3
  let got = ''
  if (Math.random() < 0.12) got = giveCase()
  save()
  return got
}
/** End of a match: a case for playing, more credits for winning. Returns what you got. */
export function rewardMatch(won, mvps = 0) {
  inv.credits += (won ? 15 : 5) + mvps * 5
  const got = giveCase()
  save()
  return got
}
function giveCase() {
  const c = CASES[Math.floor(Math.random() * CASES.length)]
  inv.cases[c.id] = (inv.cases[c.id] ?? 0) + 1
  return c.name
}

// ---------------- The screen
export function initInventory(opts) {
  audio = opts.audio
  onChange = opts.onChange ?? onChange
  const root = $('#inventory')
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-inv]')
    if (!t) return
    const act = t.dataset.inv
    if (act === 'tab') {
      tab = t.dataset.v
      render()
    } else if (act === 'filter') {
      filter = t.dataset.v
      render()
    } else if (act === 'item') {
      selUid = Number(t.dataset.uid)
      render()
    } else if (act === 'equip') {
      toggleEquip(inv, selUid)
      save()
      audio?.play('click')
      render()
    } else if (act === 'key') {
      if (inv.credits < KEY_PRICE) return flash('Not enough credits: win rounds and get kills to earn them.')
      inv.credits -= KEY_PRICE
      inv.keys++
      save()
      audio?.play('buy')
      render()
    } else if (act === 'open') openCase(t.dataset.v)
    else if (act === 'reel-close') closeReel()
    else if (act === 'reel-equip') {
      toggleEquip(inv, Number(t.dataset.uid))
      save()
      closeReel()
      tab = 'items'
      render()
    }
  })
}
export function showInventory() {
  inv = loadInventory()
  render()
}
function flash(text) {
  const n = $('#inv-note')
  n.textContent = text
  n.classList.remove('show')
  void n.offsetWidth
  n.classList.add('show')
}
function iconFor(it, w = 150, h = 60) {
  const s = skinById[it.skin]
  return gunIcon(s.weapon, w, h, { skin: skinMaterial(it), key: itemKey(it) })
}
function card(it) {
  const s = skinById[it.skin]
  const r = RARITY[s.rarity]
  const b = document.createElement('button')
  b.className = 'inv-card' + (it.uid === selUid ? ' sel' : '')
  b.dataset.inv = 'item'
  b.dataset.uid = it.uid
  b.style.setProperty('--r', r.color)
  const eq = inv.equipped[s.weapon] === it.uid
  b.innerHTML = `<img alt=""><b></b><small></small>${eq ? '<em>Equipped</em>' : ''}${it.st != null ? '<i class="st">ST</i>' : ''}`
  $('img', b).src = iconFor(it)
  $('b', b).textContent = `${WEAPONS[s.weapon].name} | ${s.name}`
  $('small', b).textContent = wearOf(it.wear).name
  return b
}
function render() {
  const root = $('#inventory')
  $('#inv-credits').textContent = inv.credits
  $('#inv-keys').textContent = inv.keys
  root.querySelectorAll('[data-inv="tab"]').forEach((b) => b.classList.toggle('sel', b.dataset.v === tab))
  const body = $('#inv-body')
  body.replaceChildren()
  if (tab === 'items') {
    const bar = document.createElement('div')
    bar.className = 'inv-filters'
    for (const [v, label] of [['all', 'All'], ['pistol', 'Pistols'], ['primary', 'Guns'], ['knife', 'Knives'], ['equipped', 'Equipped']]) {
      const b = document.createElement('button')
      b.dataset.inv = 'filter'
      b.dataset.v = v
      b.textContent = label
      b.classList.toggle('sel', v === filter)
      bar.append(b)
    }
    body.append(bar)
    const list = inv.items.filter((it) => {
      const w = WEAPONS[skinById[it.skin]?.weapon]
      if (!w) return false
      if (filter === 'equipped') return inv.equipped[w.id] === it.uid
      if (filter === 'all') return true
      return filter === 'knife' ? w.slot === 'knife' : w.slot === filter
    })
    const wrap = document.createElement('div')
    wrap.className = 'inv-split'
    const grid = document.createElement('div')
    grid.className = 'inv-grid'
    if (!list.length) {
      const p = document.createElement('p')
      p.className = 'inv-empty'
      p.textContent = inv.items.length ? 'Nothing here.' : 'No skins yet. Open a case (Cases tab): you start with one case and one key.'
      grid.append(p)
    }
    for (const it of list) grid.append(card(it))
    wrap.append(grid)
    const sel = inv.items.find((x) => x.uid === selUid)
    if (sel) wrap.append(details(sel))
    body.append(wrap)
  } else {
    const grid = document.createElement('div')
    grid.className = 'case-grid'
    for (const c of CASES) {
      const n = inv.cases[c.id] ?? 0
      const el = document.createElement('div')
      el.className = 'case-card'
      el.style.setProperty('--c', c.color)
      el.innerHTML = `<div class="case-box"><span>${c.name.replace(' Case', '')}</span></div><h3></h3><p class="case-n"></p><div class="case-skins"></div><button class="go" data-inv="open"></button>`
      $('h3', el).textContent = c.name
      $('.case-n', el).textContent = n ? `You have ${n}` : 'None yet: they drop when you play'
      const sk = $('.case-skins', el)
      for (const id of c.skins) {
        const s = skinById[id]
        const i = document.createElement('span')
        i.style.setProperty('--r', RARITY[s.rarity].color)
        i.textContent = s.rarity === 'gold' ? '★ Rare Special Item' : `${WEAPONS[s.weapon].name} | ${s.name}`
        if (s.rarity === 'gold' && sk.querySelector('.gold')) continue
        if (s.rarity === 'gold') i.className = 'gold'
        sk.append(i)
      }
      const ob = $('button', el)
      ob.dataset.v = c.id
      ob.textContent = inv.keys ? 'Open (uses a key)' : 'Open: needs a key'
      ob.disabled = !n || !inv.keys
      grid.append(el)
    }
    body.append(grid)
  }
}
function details(it) {
  const s = skinById[it.skin]
  const r = RARITY[s.rarity]
  const d = document.createElement('div')
  d.className = 'inv-detail'
  d.style.setProperty('--r', r.color)
  const eq = inv.equipped[s.weapon] === it.uid
  d.innerHTML = `<img alt=""><h3></h3><p class="rar"></p><dl><dt>Exterior</dt><dd class="w"></dd><dt>Float</dt><dd class="f"></dd><dt>Pattern</dt><dd class="p"></dd></dl><button class="go" data-inv="equip"></button>`
  $('img', d).src = iconFor(it, 320, 128)
  $('h3', d).textContent = itemName(it)
  $('.rar', d).textContent = r.name + (WEAPONS[s.weapon].team ? ` · ${WEAPONS[s.weapon].team === 'T' ? 'Terrorist' : 'Counter-Terrorist'} weapon` : '')
  $('.w', d).textContent = wearOf(it.wear).name
  $('.f', d).textContent = it.wear.toFixed(4)
  $('.p', d).textContent = `#${it.seed}${it.st != null ? ` · StatTrak™ kills: ${it.st}` : ''}`
  $('button', d).textContent = eq ? 'Unequip' : `Equip on the ${WEAPONS[s.weapon].name}`
  if (eq) $('button', d).className = 'ghost'
  return d
}

// ---------------- Opening a case: the reel
let reelAnim = 0
function openCase(caseId) {
  if (!inv.keys || !(inv.cases[caseId] > 0)) return
  inv.keys--
  inv.cases[caseId]--
  const won = addItem(inv, rollCase(caseId))
  inv.opened++
  save()
  const c = caseById[caseId]
  const reel = $('#reel')
  const strip = $('#reel-strip')
  strip.replaceChildren()
  $('#reel-result').hidden = true
  $('#reel-title').textContent = `Opening the ${c.name}…`
  reel.hidden = false
  // filler items around the prize, rarer ones rarer, like the real reel
  const N = 46
  const at = 40
  const items = []
  for (let i = 0; i < N; i++) items.push(i === at ? won : rollCase(caseId))
  for (const it of items) {
    const s = skinById[it.skin]
    const el = document.createElement('div')
    el.className = 'reel-card'
    el.style.setProperty('--r', RARITY[s.rarity].color)
    if (s.rarity === 'gold' && it !== won) {
      el.innerHTML = '<div class="gold-star">★</div><b>Rare Special Item</b>'
    } else {
      el.innerHTML = '<img alt=""><b></b>'
      $('img', el).src = iconFor(it, 150, 60)
      $('b', el).textContent = `${WEAPONS[s.weapon].name} | ${s.name}`
    }
    strip.append(el)
  }
  const cardW = 158
  const view = $('#reel-window').clientWidth || 640
  const target = at * cardW + cardW / 2 - view / 2 + (Math.random() - 0.5) * (cardW * 0.7)
  const t0 = performance.now()
  const dur = 5600
  let lastIdx = -1
  cancelAnimationFrame(reelAnim)
  const step = (now) => {
    const u = Math.min(1, (now - t0) / dur)
    const e = 1 - Math.pow(1 - u, 4)
    const x = target * e
    strip.style.transform = `translateX(${-x}px)`
    const idx = Math.floor((x + view / 2) / cardW)
    if (idx !== lastIdx) {
      lastIdx = idx
      audio?.play('click', { gain: 0.5 })
    }
    if (u < 1) reelAnim = requestAnimationFrame(step)
    else reveal(won)
  }
  reelAnim = requestAnimationFrame(step)
}
function reveal(it) {
  const s = skinById[it.skin]
  const r = RARITY[s.rarity]
  const res = $('#reel-result')
  res.style.setProperty('--r', r.color)
  $('#reel-title').textContent = 'You got'
  $('img', res).src = iconFor(it, 400, 160)
  $('h3', res).textContent = itemName(it)
  $('p', res).textContent = `${r.name} · ${wearOf(it.wear).name} (${it.wear.toFixed(4)})`
  $('[data-inv="reel-equip"]', res).dataset.uid = it.uid
  res.hidden = false
  audio?.play(s.rarity === 'covert' || s.rarity === 'gold' || s.rarity === 'classified' ? 'win' : 'buy')
}
function closeReel() {
  cancelAnimationFrame(reelAnim)
  $('#reel').hidden = true
  render()
}
export { makeItem }
