// The inventory screen: your skins, stickers and music kits (equip them, stick stickers on guns),
// your cases (open them with keys, with the spinning reel), trade-up contracts, trading with other
// players in an online game, and what you earn by playing: credits for kills and wins, case drops.

import { WEAPONS } from './weapons.js'
import { iconFor, drawnIcon, rarityOf, shortName } from './items.js'
import { openCreditStore } from './credits.js'
import {
  SKINS, RARITY, CASES, KEY_PRICE, skinById, caseById, wearOf, itemName, rollCase, makeItem, skinMaterial, itemKey,
  loadInventory, saveInventory, addItem, toggleEquip, equippedFor, skinDesc, randomSkinFor,
  kindOf, stickerById, musicById, stickerMaterial, stickerUrl, STICKER_GRADE, tradeUpOutcomes, signTradeUp, MUSIC_KITS,
  agentById, equippedAgents, patternOf,
} from './skins.js'

const $ = (s, el = document) => el.querySelector(s)
let inv = loadInventory()
let audio = null
let tab = 'items'
let selUid = null
let filter = 'all'
let onChange = () => {}
let picking = null // { mode: 'sticker' | 'gun', uid } while choosing what goes on what
let contract = [] // uids in the trade-up
let tradeApi = null // set while in an online game: { partners(), send(toId, msg), onOpen() }

export const inventory = () => inv

// A skin's picture takes a moment to draw the first time (the gun, its paint, a render): they're
// drawn a few at a time between frames instead of all at once, so the screen (and the case reel)
// shows straight away and the pictures arrive as it goes.
const toDraw = []
let drawing = false
const afterPaint = (f) => requestAnimationFrame(() => setTimeout(f))
function picture(img, it, w = 150, h = 60) {
  const ready = drawnIcon(it, w, h)
  if (ready != null) return void (img.src = ready)
  toDraw.push([img, it, w, h])
  if (!drawing) {
    drawing = true
    afterPaint(drawSome)
  }
}
function drawSome() {
  const t = performance.now()
  while (toDraw.length && performance.now() - t < 10) {
    const [img, it, w, h] = toDraw.shift()
    if (img.isConnected) img.src = iconFor(it, w, h)
  }
  if (toDraw.length) afterPaint(drawSome)
  else drawing = false
}
/** Your equipped skins, weapon id -> descriptor (sent to the host when you join a game). */
export function equippedSkins() {
  inv = loadInventory()
  const out = {}
  for (const w of Object.keys(inv.equipped)) {
    if (w === 'music' || w.startsWith('agent')) continue
    const d = skinDesc(equippedFor(inv, w))
    if (d) out[w] = d
  }
  // (and who you play as)
  const ag = equippedAgents(inv)
  out.agentT = ag.T
  out.agentCT = ag.CT
  return out
}
/** Your agents for the two sides: { T, CT } (ids, or null). */
export function myAgents() {
  inv = loadInventory()
  return equippedAgents(inv)
}
/** Your music kit (the default one if none). */
export function musicKit() {
  const it = equippedFor(inv, 'music')
  return musicById[it?.music] ?? MUSIC_KITS[0]
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
/** An MVP: the music kit's StatTrak™ counts those. */
export function rewardMvp() {
  const it = equippedFor(inv, 'music')
  if (it && it.st != null) {
    it.st++
    save()
  }
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
  // weapon cases most of the time; now and then a sticker capsule or a music kit box
  const r = Math.random()
  const pool = r < 0.75 ? CASES.filter((c) => !c.kind) : r < 0.92 ? [caseById.capsule] : [caseById.musicbox]
  const c = pool[Math.floor(Math.random() * pool.length)]
  inv.cases[c.id] = (inv.cases[c.id] ?? 0) + 1
  return c.name
}

const equipKey = (it) => (kindOf(it) === 'music' ? 'music' : kindOf(it) === 'agent' ? `agent${agentById[it.agent]?.team}` : kindOf(it) === 'skin' ? skinById[it.skin].weapon : null)
const isEquipped = (it) => equipKey(it) && inv.equipped[equipKey(it)] === it.uid

// ---------------- The screen
export function initInventory(opts) {
  audio = opts.audio
  onChange = opts.onChange ?? onChange
  // gifts waiting from the rest of the site: unpack them now, and say so
  setTimeout(() => {
    const got = collectGifts()
    if (got.length) opts.onGifts?.(got)
  })
  const root = $('#inventory')
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-inv]')
    if (!t) return
    const act = t.dataset.inv
    if (act === 'tab') {
      tab = t.dataset.v
      picking = null
      render()
    } else if (act === 'filter') {
      filter = t.dataset.v
      render()
    } else if (act === 'item') clickItem(Number(t.dataset.uid))
    else if (act === 'equip') {
      const it = inv.items.find((x) => x.uid === selUid)
      if (!it) return
      if (kindOf(it) === 'music') inv.equipped.music === it.uid ? delete inv.equipped.music : (inv.equipped.music = it.uid)
      else toggleEquip(inv, selUid)
      save()
      audio?.play('click')
      if (kindOf(it) === 'music' && inv.equipped.music === it.uid) audio?.music?.(musicById[it.music], 'mvp')
      render()
    } else if (act === 'apply') {
      picking = { mode: kindOf(inv.items.find((x) => x.uid === selUid)) === 'sticker' ? 'gun' : 'sticker', uid: selUid }
      render()
    } else if (act === 'cancel-pick') {
      picking = null
      render()
    } else if (act === 'scrape') scrape()
    else if (act === 'preview') {
      const it = inv.items.find((x) => x.uid === selUid)
      if (it) audio?.music?.(musicById[it.music], 'mvp')
    } else if (act === 'key') {
      const n = Number(t.dataset.n) || 1
      if (inv.credits < KEY_PRICE * n) return flash(`Not enough credits${n > 1 ? ` for ${n} keys (ⓒ ${KEY_PRICE * n})` : ''}: win rounds and get kills to earn them (or get some with ＋ Credits).`)
      inv.credits -= KEY_PRICE * n
      inv.keys += n
      save()
      audio?.play('buy')
      render()
      if (n > 1) flash(`🔑 ${n} keys added.`)
    } else if (act === 'credits') {
      openCreditStore({
        onBought: (n) => {
          inv = loadInventory()
          audio?.play('buy')
          render()
          flash(`ⓒ ${n.toLocaleString('en-US')} credits added.`)
        },
      })
    } else if (act === 'open') openCase(t.dataset.v)
    else if (act === 'reel-close') closeReel()
    else if (act === 'reel-equip') {
      const it = inv.items.find((x) => x.uid === Number(t.dataset.uid))
      if (it && kindOf(it) === 'music') inv.equipped.music = it.uid
      else if (it && (kindOf(it) === 'skin' || kindOf(it) === 'agent')) toggleEquip(inv, it.uid)
      save()
      closeReel()
      tab = 'items'
      render()
    } else if (act === 'contract-clear') {
      contract = []
      render()
    } else if (act === 'sign') signContract()
    else if (act === 'trade') openTradePicker()
  })
}
// SKINSINK.GG (or another tab) changed the inventory: pick that up instead of saving over it.
addEventListener('storage', (e) => {
  if (e.key !== 'strife-inventory') return
  inv = loadInventory()
  if (!document.getElementById('inventory')?.hidden) render()
})
export function showInventory() {
  inv = loadInventory()
  picking = null
  const got = collectGifts()
  render()
  if (got.length) flash(`🎁 ${got.join(' · ')}`)
}

// ---------------- Gifts from the rest of nikstil.com
// Achievement rewards (the hub at /achievements/) and TRANSLATR™'s Premium Vault leave things in
// 'strife-gifts' (this site's storage, shared by every page); they're unpacked here.
const GIFTS = 'strife-gifts'
const KNIVES = SKINS.filter((x) => x.weapon === 'knife')
/** Unpacks any waiting gifts into the inventory. Returns what came, as lines ("2 keys from TRANSLATR™"). */
export function collectGifts() {
  let list = []
  try {
    list = JSON.parse(localStorage.getItem(GIFTS) || '[]')
    localStorage.removeItem(GIFTS)
  } catch {
    return []
  }
  if (!Array.isArray(list) || !list.length) return []
  inv = loadInventory()
  const lines = []
  for (const g of list.slice(0, 50)) {
    if (!g || typeof g !== 'object') continue
    const parts = []
    const keys = Math.max(0, Math.min(25, g.keys | 0))
    if (keys) {
      inv.keys += keys
      parts.push(`${keys} key${keys === 1 ? '' : 's'}`)
    }
    for (const id of Array.isArray(g.cases) ? g.cases.slice(0, 5) : []) {
      if (!caseById[id]) continue
      inv.cases[id] = (inv.cases[id] ?? 0) + 1
      parts.push(caseById[id].name)
    }
    if (g.knife && KNIVES.length) {
      const it = addItem(inv, makeItem(KNIVES[Math.floor(Math.random() * KNIVES.length)].id))
      parts.push(itemName(it))
    }
    if (parts.length) lines.push(`${parts.join(', ')}${g.from ? ` from ${String(g.from).slice(0, 40)}` : ''}`)
  }
  save()
  return lines
}
// (bought or claimed somewhere else while this page is open)
addEventListener('storage', (e) => {
  if (e.key !== GIFTS || !e.newValue) return
  const got = collectGifts()
  if (got.length && !$('#inventory')?.hidden) {
    render()
    flash(`🎁 ${got.join(' · ')}`)
  }
})
function flash(text) {
  const n = $('#inv-note')
  n.textContent = text
  n.classList.remove('show')
  void n.offsetWidth
  n.classList.add('show')
}
function clickItem(uid) {
  const it = inv.items.find((x) => x.uid === uid)
  if (!it) return
  if (tab === 'tradeup') {
    if (contract.includes(uid)) contract = contract.filter((u) => u !== uid)
    else {
      const items = [...contract, uid].map((u) => inv.items.find((x) => x.uid === u))
      const o = tradeUpOutcomes(items)
      if (o.error) return flash(o.error)
      if (items.length > o.need) return flash(`That contract is full (${o.need} skins).`)
      contract.push(uid)
    }
    return render()
  }
  if (picking) {
    // a sticker onto a gun, or a gun to put the sticker on
    const sticker = picking.mode === 'gun' ? inv.items.find((x) => x.uid === picking.uid) : it
    const gun = picking.mode === 'gun' ? it : inv.items.find((x) => x.uid === picking.uid)
    if (!sticker || !gun || kindOf(sticker) !== 'sticker' || kindOf(gun) !== 'skin') return
    if (skinById[gun.skin].weapon === 'knife') return flash('Knives don’t take stickers.')
    gun.stickers ??= []
    if (gun.stickers.length >= 4) return flash('That gun already has four stickers.')
    gun.stickers.push(sticker.sticker)
    inv.items = inv.items.filter((x) => x !== sticker)
    picking = null
    selUid = gun.uid
    save()
    audio?.play('buy')
    flash(`Applied ${stickerById[sticker.sticker].name} to the ${WEAPONS[skinById[gun.skin].weapon].name}.`)
    return render()
  }
  selUid = uid
  render()
}
function scrape() {
  const it = inv.items.find((x) => x.uid === selUid)
  if (!it?.stickers?.length) return
  const gone = it.stickers.pop()
  save()
  flash(`Scraped off ${stickerById[gone]?.name}. It’s gone for good.`)
  render()
}
function card(it, opts = {}) {
  const r = rarityOf(it)
  const b = document.createElement('button')
  b.className = 'inv-card' + (it.uid === selUid && !opts.noSel ? ' sel' : '') + (opts.inContract ? ' picked' : '') + (kindOf(it) !== 'skin' ? ' flat' : '')
  b.dataset.inv = 'item'
  b.dataset.uid = it.uid
  b.style.setProperty('--r', r.color)
  b.innerHTML = `<img alt=""><b></b><small></small>${isEquipped(it) ? '<em>Equipped</em>' : ''}${it.st != null ? '<i class="st">ST</i>' : ''}`
  picture($('img', b), it)
  $('b', b).textContent = shortName(it)
  $('small', b).textContent = kindOf(it) === 'skin' ? wearOf(it.wear).name + ((it.stickers ?? []).length ? ` · ${it.stickers.length} sticker${it.stickers.length > 1 ? 's' : ''}` : '') : r.name
  return b
}
function tabsRender() {
  // (the casino pays out in hundredths)
  $('#inv-credits').textContent = Number.isInteger(inv.credits) ? inv.credits.toLocaleString('en-US') : inv.credits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  $('#inv-buy-key').textContent = `Buy key (ⓒ ${KEY_PRICE})`
  $('#inv-buy-keys').textContent = `10 keys (ⓒ ${KEY_PRICE * 10})`
  $('#inv-keys').textContent = inv.keys
  $('#inventory').querySelectorAll('[data-inv="tab"]').forEach((b) => b.classList.toggle('sel', b.dataset.v === tab))
  const tb = $('#inventory [data-inv="trade"]')
  if (tb) tb.hidden = !tradeApi
}
function render() {
  tabsRender()
  const body = $('#inv-body')
  body.replaceChildren()
  if (tab === 'items') itemsTab(body)
  else if (tab === 'tradeup') tradeUpTab(body)
  else casesTab(body)
}
function itemsTab(body) {
  const bar = document.createElement('div')
  bar.className = 'inv-filters'
  for (const [v, label] of [['all', 'All'], ['pistol', 'Pistols'], ['primary', 'Guns'], ['knife', 'Knives'], ['agent', 'Agents'], ['sticker', 'Stickers'], ['music', 'Music'], ['equipped', 'Equipped']]) {
    const b = document.createElement('button')
    b.dataset.inv = 'filter'
    b.dataset.v = v
    b.textContent = label
    b.classList.toggle('sel', v === filter)
    bar.append(b)
  }
  body.append(bar)
  let want = filter
  if (picking) want = picking.mode === 'gun' ? 'guns-for-stickers' : 'sticker'
  const list = inv.items.filter((it) => {
    const kind = kindOf(it)
    if (want === 'guns-for-stickers') return kind === 'skin' && skinById[it.skin].weapon !== 'knife'
    if (want === 'sticker' || want === 'music' || want === 'agent') return kind === want
    if (want === 'equipped') return isEquipped(it)
    if (want === 'all') return true
    if (kind !== 'skin') return false
    const w = WEAPONS[skinById[it.skin]?.weapon]
    return want === 'knife' ? w.slot === 'knife' : w.slot === want
  })
  const wrap = document.createElement('div')
  wrap.className = 'inv-split'
  const grid = document.createElement('div')
  grid.className = 'inv-grid'
  if (picking) {
    const p = document.createElement('div')
    p.className = 'inv-picking'
    p.innerHTML = `<span></span><button class="ghost small" data-inv="cancel-pick">Cancel</button>`
    $('span', p).textContent = picking.mode === 'gun' ? 'Pick the gun to put the sticker on:' : 'Pick a sticker for this gun:'
    grid.append(p)
  }
  if (!list.length) {
    const p = document.createElement('p')
    p.className = 'inv-empty'
    p.textContent = inv.items.length ? (picking ? (picking.mode === 'gun' ? 'You have no gun skins to put it on.' : 'You have no stickers: open a Sticker Capsule.') : 'Nothing here.') : 'No skins yet. Open a case (Cases tab): you start with one case and one key.'
    grid.append(p)
  }
  for (const it of list) grid.append(card(it))
  wrap.append(grid)
  const sel = inv.items.find((x) => x.uid === selUid)
  if (sel && !picking) wrap.append(details(sel))
  body.append(wrap)
}
function details(it) {
  const r = rarityOf(it)
  const kind = kindOf(it)
  const d = document.createElement('div')
  d.className = 'inv-detail'
  d.style.setProperty('--r', r.color)
  const eq = isEquipped(it)
  d.innerHTML = `<img alt=""><h3></h3><p class="rar"></p><dl></dl><div class="inv-actions"></div>`
  $('img', d).src = kind === 'skin' ? iconFor(it, 320, 128) : iconFor(it)
  if (kind !== 'skin') $('img', d).classList.add('small')
  $('h3', d).textContent = itemName(it)
  const dl = $('dl', d)
  const row = (k, v) => {
    const dt = document.createElement('dt')
    dt.textContent = k
    const dd = document.createElement('dd')
    dd.textContent = v
    dl.append(dt, dd)
  }
  const acts = $('.inv-actions', d)
  const btn = (label, act, cls = 'go') => {
    const b = document.createElement('button')
    b.className = cls
    b.dataset.inv = act
    b.textContent = label
    acts.append(b)
  }
  if (kind === 'skin') {
    const s = skinById[it.skin]
    $('.rar', d).textContent = r.name + (WEAPONS[s.weapon].team ? ` · ${WEAPONS[s.weapon].team === 'T' ? 'Terrorist' : 'Counter-Terrorist'} weapon` : '')
    row('Exterior', wearOf(it.wear).name)
    row('Float', it.wear.toFixed(4))
    const pat = patternOf(it)
    row('Pattern', `#${it.seed}${pat ? ` · ${pat.note}` : ''}`)
    if (it.st != null) row('StatTrak™', `${it.st} kills`)
    if (it.stickers?.length) row('Stickers', it.stickers.map((k) => stickerById[k]?.name).join(', '))
    btn(eq ? 'Unequip' : `Equip on the ${WEAPONS[s.weapon].name}`, 'equip', eq ? 'ghost' : 'go')
    if (s.weapon !== 'knife' && (it.stickers ?? []).length < 4) btn('🏷️ Apply a sticker', 'apply', 'ghost')
    if (it.stickers?.length) btn('Scrape the last sticker', 'scrape', 'ghost')
  } else if (kind === 'agent') {
    const ag = agentById[it.agent]
    $('.rar', d).textContent = `${r.name} agent · ${ag.team === 'T' ? 'Terrorist' : 'Counter-Terrorist'} side`
    row('Who', `${ag.name}, ${ag.title}`)
    row('Wears', `${{ bare: 'No hat', beret: 'A beret', hood: 'A hood', cowboy: 'A cowboy hat', cap: 'A cap', helmet: 'A helmet', gasmask: 'A gas mask', balaclava: 'A balaclava', shemagh: 'A shemagh', beanie: 'A beanie' }[ag.look.head]}${ag.look.shades ? ', shades' : ''}${ag.look.tie ? ', a tie' : ''}`)
    btn(eq ? 'Unequip' : `Play as ${ag.name} (${ag.team} side)`, 'equip', eq ? 'ghost' : 'go')
  } else if (kind === 'sticker') {
    $('.rar', d).textContent = `${r.name} sticker`
    row('Finish', { paper: 'Paper', holo: 'Holo', foil: 'Foil', gold: 'Gold' }[stickerById[it.sticker]?.style] ?? 'Paper')
    btn('🏷️ Apply to a gun', 'apply')
  } else {
    const k = musicById[it.music]
    $('.rar', d).textContent = 'Music kit: plays when a round starts and when you’re MVP'
    row('Artist', k.artist)
    row('Tempo', `${k.bpm} bpm`)
    if (it.st != null) row('StatTrak™ MVPs', String(it.st))
    btn(eq ? 'Unequip' : 'Equip', 'equip', eq ? 'ghost' : 'go')
    btn('▶ Preview', 'preview', 'ghost')
  }
  return d
}
function casesTab(body) {
  const grid = document.createElement('div')
  grid.className = 'case-grid'
  for (const c of CASES) {
    const n = inv.cases[c.id] ?? 0
    const el = document.createElement('div')
    el.className = 'case-card'
    el.style.setProperty('--c', c.color)
    el.innerHTML = `<div class="case-box"><span></span></div><h3></h3><p class="case-n"></p><div class="case-skins"></div><button class="go" data-inv="open"></button>`
    $('.case-box span', el).textContent = c.kind === 'sticker' ? 'Stickers' : c.kind === 'music' ? '♫ Music' : c.kind === 'agent' ? '🕵 Agents' : c.name.replace(' Case', '')
    $('h3', el).textContent = c.name
    $('.case-n', el).textContent = n ? `You have ${n}` : 'None yet: they drop when you play'
    const sk = $('.case-skins', el)
    const line = (text, color, cls = '') => {
      const i = document.createElement('span')
      i.style.setProperty('--r', color)
      i.textContent = text
      if (cls) i.className = cls
      sk.append(i)
    }
    if (c.kind === 'sticker') for (const id of c.stickers) line(`Sticker | ${stickerById[id].name}`, RARITY[stickerById[id].rarity].color)
    else if (c.kind === 'music') for (const id of c.music) line(`${musicById[id].artist}, ${musicById[id].name}`, RARITY.milspec.color)
    else if (c.kind === 'agent') for (const id of c.agents) line(`${agentById[id].name} | ${agentById[id].title} (${agentById[id].team})`, RARITY[agentById[id].rarity].color)
    else {
      let gold = false
      for (const id of c.skins) {
        const s = skinById[id]
        if (s.rarity === 'gold') {
          if (!gold) line('★ Rare Special Item', RARITY.gold.color, 'gold')
          gold = true
          continue
        }
        line(`${WEAPONS[s.weapon].name} | ${s.name}`, RARITY[s.rarity].color)
      }
    }
    const ob = $('button', el)
    ob.dataset.v = c.id
    ob.textContent = !n ? 'None to open' : inv.keys ? 'Open (uses a key)' : `Buy key & open (ⓒ ${KEY_PRICE})`
    ob.disabled = !n
    grid.append(el)
  }
  body.append(grid)
}
function tradeUpTab(body) {
  const items = contract.map((u) => inv.items.find((x) => x.uid === u)).filter(Boolean)
  contract = items.map((x) => x.uid)
  const o = items.length ? tradeUpOutcomes(items) : null
  const head = document.createElement('div')
  head.className = 'tu-head'
  head.innerHTML = `<p></p><div class="tu-slots"></div><div class="tu-out"></div><div class="tu-actions"><button class="go" data-inv="sign">📝 Sign the contract</button><button class="ghost small" data-inv="contract-clear">Clear</button></div>`
  const need = o?.need ?? 10
  $('p', head).textContent = 'Trade up: put in 10 skins of one grade (5 Coverts for a knife) and get one of the next grade back, from the same cases. The wear is the average of what you put in.'
  const slots = $('.tu-slots', head)
  for (let k = 0; k < need; k++) {
    const it = items[k]
    const s = document.createElement('div')
    s.className = 'tu-slot'
    if (it) {
      s.style.setProperty('--r', rarityOf(it).color)
      s.innerHTML = '<img alt="">'
      picture($('img', s), it, 120, 48)
      s.title = shortName(it)
    }
    slots.append(s)
  }
  const out = $('.tu-out', head)
  if (o && !o.error) {
    out.textContent = `Could become: ${o.outcomes.map((x) => `${WEAPONS[skinById[x.skin].weapon].name} | ${skinById[x.skin].name} (${Math.round(x.weight * 100)}%)`).join(', ')}`
  } else out.textContent = o?.error ?? 'Click skins below to add them.'
  $('[data-inv="sign"]', head).disabled = !o || !!o.error || items.length !== need
  body.append(head)
  const grid = document.createElement('div')
  grid.className = 'inv-grid tu-grid'
  const grade = items[0] ? skinById[items[0].skin].rarity : null
  const eligible = inv.items.filter((it) => kindOf(it) === 'skin' && ['milspec', 'restricted', 'classified', 'covert'].includes(skinById[it.skin].rarity) && (!grade || skinById[it.skin].rarity === grade))
  if (!eligible.length) {
    const p = document.createElement('p')
    p.className = 'inv-empty'
    p.textContent = 'You need skins to trade up: open some cases first.'
    grid.append(p)
  }
  for (const it of eligible) grid.append(card(it, { noSel: true, inContract: contract.includes(it.uid) }))
  body.append(grid)
}
function signContract() {
  const items = contract.map((u) => inv.items.find((x) => x.uid === u)).filter(Boolean)
  const result = signTradeUp(items)
  if (!result) return flash('That contract isn’t complete.')
  for (const it of items) for (const [k, v] of Object.entries(inv.equipped)) if (v === it.uid) delete inv.equipped[k]
  inv.items = inv.items.filter((x) => !items.includes(x))
  const got = addItem(inv, result)
  inv.tradeUps = (inv.tradeUps ?? 0) + 1
  contract = []
  save()
  // the same reveal as a case
  showReveal(got, 'Contract signed')
  render()
}

// ---------------- Opening a case: the reel
let reelAnim = 0
function openCase(caseId) {
  if (!(inv.cases[caseId] > 0)) return
  // no key: buy one on the way (it's what the button says)
  if (!inv.keys) {
    if (inv.credits < KEY_PRICE) return flash(`A key is ⓒ ${KEY_PRICE}: win rounds and get kills to earn credits (or get some with ＋ Credits).`)
    inv.credits -= KEY_PRICE
    inv.keys++
  }
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
  // (the ones going past all wear the same paint job, so each skin is only drawn once)
  const filler = (it) => (kindOf(it) === 'skin' ? { ...it, seed: 7, wear: 0.2, stickers: [] } : it)
  for (let i = 0; i < N; i++) items.push(i === at ? won : filler(rollCase(caseId)))
  const pics = []
  for (const it of items) {
    const el = document.createElement('div')
    el.className = 'reel-card'
    el.style.setProperty('--r', rarityOf(it).color)
    strip.append(el)
    if (kindOf(it) === 'skin' && skinById[it.skin].rarity === 'gold' && it !== won) {
      el.innerHTML = '<div class="gold-star">★</div><b>Rare Special Item</b>'
    } else {
      el.innerHTML = '<img alt=""><b></b>'
      $('b', el).textContent = shortName(it)
    }
    pics.push($('img', el))
  }
  // pictures for what's in view at the start first, then where it stops, then the ones that fly past
  const order = [...items.keys()].sort((a, b) => rank(a) - rank(b))
  function rank(i) {
    if (i < 6) return i
    if (Math.abs(i - at) <= 5) return 10 + Math.abs(i - at)
    return 100 + i
  }
  for (const i of order) if (pics[i]) picture(pics[i], items[i])
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
function reveal(it, title = 'You got') {
  const r = rarityOf(it)
  const res = $('#reel-result')
  res.style.setProperty('--r', r.color)
  $('#reel-title').textContent = title
  $('img', res).src = kindOf(it) === 'skin' ? iconFor(it, 400, 160) : iconFor(it)
  $('h3', res).textContent = itemName(it)
  const pat = kindOf(it) === 'skin' ? patternOf(it) : null
  $('p', res).textContent = kindOf(it) === 'skin' ? `${r.name} · ${wearOf(it.wear).name} (${it.wear.toFixed(4)})${pat ? ` · ${pat.note}` : ''}` : kindOf(it) === 'agent' ? `${r.name} agent · ${agentById[it.agent]?.team} side` : r.name
  const eb = $('[data-inv="reel-equip"]', res)
  eb.dataset.uid = it.uid
  eb.hidden = kindOf(it) === 'sticker'
  res.hidden = false
  const top = kindOf(it) === 'skin' ? skinById[it.skin].rarity : kindOf(it) === 'agent' ? agentById[it.agent]?.rarity : stickerById[it.sticker]?.rarity
  audio?.play(top === 'covert' || top === 'gold' || top === 'classified' || patternOf(it)?.gem ? 'win' : 'buy')
  if (kindOf(it) === 'music') audio?.music?.(musicById[it.music], 'mvp')
}
function showReveal(it, title) {
  $('#reel-strip').replaceChildren()
  $('#reel').hidden = false
  reveal(it, title)
}
function closeReel() {
  cancelAnimationFrame(reelAnim)
  $('#reel').hidden = true
  render()
}

// ---------------- Trading (in an online game)
// The app hands us a way to talk to the other players: tradeApi = { partners(), send(toId, msg) }.
// Both sides pick what they offer; both tick Ready; both Confirm; then the items swap.
let trade = null // { with: { id, name }, mine: [uid], theirs: [items], ready: { me, them }, confirm: { me, them } }
export function setTradeApi(api) {
  tradeApi = api
  if (!api && trade) closeTrade()
  if ($('#inventory') && !$('#inventory').hidden) tabsRender()
}
export function openTradePicker() {
  if (!tradeApi) return
  tradeApi.onOpen?.()
  const ps = tradeApi.partners()
  const box = $('#trade')
  box.hidden = false
  box.innerHTML = `<div class="trade-card"><h3>Trade with…</h3><div class="trade-who"></div><button class="ghost" data-trade="close">Cancel</button></div>`
  const who = $('.trade-who', box)
  if (!ps.length) who.textContent = 'There’s nobody else (human) in this game to trade with.'
  for (const p of ps) {
    const b = document.createElement('button')
    b.className = 'go small'
    b.textContent = p.name
    b.addEventListener('click', () => {
      tradeApi.send(p.id, { t: 'invite' })
      box.innerHTML = `<div class="trade-card"><h3>Waiting for ${escapeHtml(p.name)}…</h3><button class="ghost" data-trade="close">Cancel</button></div>`
      trade = { with: p, pending: true, mine: [], theirs: [], ready: {}, confirm: {} }
    })
    who.append(b)
  }
}
const escapeHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
/** A trade message from player `from` ({ id, name }). */
export function onTradeMessage(from, m) {
  if (!m || typeof m !== 'object') return
  const box = $('#trade')
  if (m.t === 'invite') {
    if (trade && !trade.pending) return tradeApi?.send(from.id, { t: 'busy' })
    box.hidden = false
    box.innerHTML = `<div class="trade-card"><h3></h3><div class="trade-who"><button class="go small" data-trade="accept">Accept</button><button class="ghost small" data-trade="decline">Decline</button></div></div>`
    $('h3', box).textContent = `${from.name} wants to trade`
    tradeApi?.onOpen?.()
    trade = { with: from, invited: true, mine: [], theirs: [], ready: {}, confirm: {} }
    audio?.play('click')
  } else if (!trade || trade.with.id !== from.id) return
  else if (m.t === 'accept') {
    trade.pending = false
    renderTrade()
  } else if (m.t === 'decline' || m.t === 'busy' || m.t === 'cancel') {
    const why = m.t === 'busy' ? 'is busy trading' : m.t === 'decline' ? 'said no' : 'cancelled the trade'
    trade = null
    box.innerHTML = `<div class="trade-card"><h3>${escapeHtml(from.name)} ${why}.</h3><button class="ghost" data-trade="close">OK</button></div>`
  } else if (m.t === 'offer' && Array.isArray(m.items)) {
    trade.theirs = m.items.slice(0, 12).filter((it) => it && (it.skin ? skinById[it.skin] : it.sticker ? stickerById[it.sticker] : musicById[it.music]))
    trade.ready = {}
    trade.confirm = {}
    renderTrade()
  } else if (m.t === 'ready') {
    trade.ready.them = !!m.on
    trade.confirm = {}
    renderTrade()
  } else if (m.t === 'confirm') {
    trade.confirm.them = m.sig
    finishTrade()
  }
}
const sigOf = (mine, theirs) => JSON.stringify([mine.map((it) => it.skin ?? it.sticker ?? it.music).sort(), theirs.map((it) => it.skin ?? it.sticker ?? it.music).sort()])
function myOffer() {
  return trade.mine.map((u) => inv.items.find((x) => x.uid === u)).filter(Boolean)
}
const strip = (it) => ({ kind: it.kind, skin: it.skin, sticker: it.sticker, music: it.music, wear: it.wear, seed: it.seed, st: it.st, r: it.r, stickers: it.stickers })
function sendOffer() {
  tradeApi.send(trade.with.id, { t: 'offer', items: myOffer().map(strip) })
}
function renderTrade() {
  const box = $('#trade')
  box.hidden = false
  const mine = myOffer()
  box.innerHTML = `<div class="trade-card wide"><h3></h3>
    <div class="trade-cols"><div><h4>You give</h4><div class="trade-grid mine"></div></div><div><h4></h4><div class="trade-grid theirs"></div></div></div>
    <p class="trade-hint">Click your items below to add or take them out.</p>
    <div class="trade-grid pool"></div>
    <div class="trade-actions"><label><input type="checkbox" data-trade="ready"> I’m ready</label><span class="trade-state"></span><button class="go" data-trade="confirm">Confirm trade</button><button class="ghost" data-trade="cancel">Cancel</button></div></div>`
  $('h3', box).textContent = `Trading with ${trade.with.name}`
  $('.trade-cols div:last-child h4', box).textContent = `${trade.with.name} gives`
  const put = (sel, items, click) => {
    const g = $(sel, box)
    if (!items.length) g.innerHTML = '<span class="none">nothing yet</span>'
    for (const it of items) {
      const c = card({ ...it, uid: it.uid ?? -1 }, { noSel: true })
      if (click) c.addEventListener('click', () => click(it))
      else c.disabled = true
      g.append(c)
    }
  }
  const toggle = (it) => {
    trade.mine = trade.mine.includes(it.uid) ? trade.mine.filter((u) => u !== it.uid) : trade.mine.length < 12 ? [...trade.mine, it.uid] : trade.mine
    trade.ready = {}
    trade.confirm = {}
    sendOffer()
    renderTrade()
  }
  put('.trade-grid.mine', mine, toggle)
  put('.trade-grid.theirs', trade.theirs, null)
  put('.trade-grid.pool', inv.items.filter((it) => !trade.mine.includes(it.uid)), toggle)
  $('[data-trade="ready"]', box).checked = !!trade.ready.me
  $('.trade-state', box).textContent = trade.ready.me && trade.ready.them ? 'Both ready: confirm!' : trade.ready.them ? `${trade.with.name} is ready` : trade.ready.me ? `Waiting for ${trade.with.name}…` : ''
  $('[data-trade="confirm"]', box).disabled = !(trade.ready.me && trade.ready.them) || trade.confirm.me
}
function finishTrade() {
  if (!trade?.confirm.me || !trade.confirm.them) return
  const mine = myOffer()
  const want = sigOf(mine, trade.theirs)
  const theirSig = JSON.parse(trade.confirm.them)
  // their view of the deal must be ours mirrored
  if (JSON.stringify([theirSig[1], theirSig[0]]) !== want) {
    trade.confirm = {}
    trade.ready = {}
    renderTrade()
    return
  }
  for (const it of mine) for (const [k, v] of Object.entries(inv.equipped)) if (v === it.uid) delete inv.equipped[k]
  inv.items = inv.items.filter((x) => !mine.includes(x))
  for (const it of trade.theirs) addItem(inv, it)
  inv.trades = (inv.trades ?? 0) + 1
  save()
  const n = trade.theirs.length
  const who = trade.with.name
  trade = null
  $('#trade').innerHTML = `<div class="trade-card"><h3>Trade done with ${escapeHtml(who)}</h3><p>You got ${n} item${n === 1 ? '' : 's'}. Find them in your inventory.</p><button class="go" data-trade="close">OK</button></div>`
  audio?.play('win')
  if (!$('#inventory').hidden) render()
}
function closeTrade() {
  if (trade && tradeApi) tradeApi.send(trade.with.id, { t: 'cancel' })
  trade = null
  const box = $('#trade')
  if (box) box.hidden = true
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-trade]')
  if (!t) return
  const act = t.dataset.trade
  if (act === 'close') closeTrade()
  else if (act === 'cancel') closeTrade()
  else if (act === 'decline') {
    tradeApi?.send(trade.with.id, { t: 'decline' })
    trade = null
    $('#trade').hidden = true
  } else if (act === 'accept') {
    tradeApi?.send(trade.with.id, { t: 'accept' })
    trade.invited = false
    renderTrade()
  } else if (act === 'confirm' && trade) {
    trade.confirm.me = sigOf(myOffer(), trade.theirs)
    tradeApi.send(trade.with.id, { t: 'confirm', sig: trade.confirm.me })
    renderTrade()
    finishTrade()
  }
})
document.addEventListener('change', (e) => {
  if (e.target.matches?.('[data-trade="ready"]') && trade) {
    trade.ready.me = e.target.checked
    trade.confirm = {}
    tradeApi?.send(trade.with.id, { t: 'ready', on: trade.ready.me })
    renderTrade()
  }
})
export { makeItem }
