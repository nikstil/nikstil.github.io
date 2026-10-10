// The Market (buy any skin or sticker, a little over what it's worth), your Inventory (sell skins
// for a little under, and your numbers), and Free (a promo code, a daily bonus, rakeback).

import { items, takeItems, giveItems, credit, spend, stats, saveStats, inventory, fmt, r2 } from './wallet.js'
import { h, $, $$, coins, toast, itemCard } from './ui.js'
import { SKINS, STICKERS, makeItem } from '../strife/skins.js'
import { itemValue, skinValue } from '../strife/items.js'
import { WEAPONS } from '../strife/weapons.js'
import { openCreditStore, pretendSpent } from '../strife/credits.js'
import { winSound, click } from './sound.js'

export const BUY_MARKUP = 1.15
export const SELL_RATE = 0.8

// ---------------- Market
const KINDS = [
  ['all', 'All'],
  ['knife', '★ Knives'],
  ['rifle', 'Rifles'],
  ['sniper', 'Snipers'],
  ['smg', 'SMGs'],
  ['pistol', 'Pistols'],
  ['heavy', 'Heavy'],
  ['sticker', 'Stickers'],
]
const kindOfSkin = (s) => (s.weapon === 'knife' ? 'knife' : WEAPONS[s.weapon]?.kind)
export function mountMarket(el) {
  let filter = 'all'
  let sort = 'up'
  el.innerHTML = `<section class="game market"><div class="mk-bar"><div class="seg mk-kinds">${KINDS.map(([k, n]) => `<button data-kind="${k}">${n}</button>`).join('')}</div>
    <button class="ghost small" data-sort>Price ↑</button></div><div class="grid"></div>
    <p class="fair">Listed at what they're worth plus 15%. New, Field-Tested-ish, delivered straight to your COUNTER-STRIFE inventory.</p></section>`
  const grid = $('.grid', el)
  function render() {
    $$('[data-kind]', el).forEach((b) => b.classList.toggle('sel', b.dataset.kind === filter))
    $('[data-sort]', el).textContent = sort === 'up' ? 'Price ↑' : 'Price ↓'
    const list = []
    if (filter !== 'sticker') for (const s of SKINS) if (filter === 'all' || kindOfSkin(s) === filter) list.push({ it: { skin: s.id, wear: 0.2, seed: 7, st: null }, price: r2(skinValue(s.id) * BUY_MARKUP), id: s.id })
    if (filter === 'all' || filter === 'sticker') for (const k of STICKERS) list.push({ it: { kind: 'sticker', sticker: k.id, r: k.rarity }, price: r2(itemValue({ kind: 'sticker', sticker: k.id }) * BUY_MARKUP), sticker: k.id })
    list.sort((a, b) => (sort === 'up' ? a.price - b.price : b.price - a.price))
    grid.replaceChildren(
      ...list.map((x) => {
        const c = itemCard(x.it, { price: x.price })
        c.append(h(`<button class="go small buy" data-buy="${x.id ?? ''}" data-sticker="${x.sticker ?? ''}" data-price="${x.price}">Buy</button>`))
        return c
      }),
    )
  }
  el.addEventListener('click', (e) => {
    const t = e.target.closest('button')
    if (!t) return
    if (t.dataset.kind) {
      filter = t.dataset.kind
      click()
      return render()
    }
    if ('sort' in t.dataset) {
      sort = sort === 'up' ? 'down' : 'up'
      return render()
    }
    if ('buy' in t.dataset) {
      const price = Number(t.dataset.price)
      if (!spend(price)) return toast('Not enough credits. Get more with ＋.', 'err')
      let it
      if (t.dataset.sticker) it = { kind: 'sticker', sticker: t.dataset.sticker, r: STICKERS.find((k) => k.id === t.dataset.sticker)?.rarity }
      else {
        it = makeItem(t.dataset.buy)
        it.wear = Number((0.16 + Math.random() * 0.2).toFixed(4))
      }
      giveItems([it])
      click()
      toast(`Bought for ⓒ ${fmt(price)}: it's in your inventory.`, 'win')
    }
  })
  render()
}

// ---------------- Inventory (sell)
export function mountInventory(el) {
  const sel = new Set()
  el.innerHTML = `<section class="game inventory"><div class="iv-stats"></div>
    <div class="iv-bar"><span class="iv-count"></span><button class="ghost small" data-all>Select all</button><button class="go" data-sell disabled>Sell</button></div>
    <div class="grid"></div>
    <p class="fair">These are your COUNTER-STRIFE skins: equip them, open cases and stick stickers in the game. Selling pays 80% of what a skin's worth (and takes it off your gun if it's equipped).</p></section>`
  const grid = $('.grid', el)
  function renderStats() {
    const s = stats()
    const net = r2(s.won - s.wagered)
    const inv = inventory()
    const worth = r2(inv.items.reduce((t, it) => t + itemValue(it), 0))
    $('.iv-stats', el).innerHTML = `<div><small>Balance</small><b>${coins(inv.credits)}</b></div><div><small>Skins worth</small><b>${coins(worth)}</b></div>
      <div><small>Bet in total</small><b>${coins(s.wagered)}</b></div><div><small>Won back</small><b>${coins(s.won)}</b></div>
      <div class="${net >= 0 ? 'up' : 'down'}"><small>${net >= 0 ? 'Up' : 'Down'}</small><b>${coins(Math.abs(net))}</b></div><div><small>Biggest win</small><b>${coins(s.biggest)}</b></div>
      <div><small>Keys · cases</small><b>🔑 ${inv.keys} · 📦 ${Object.values(inv.cases).reduce((a, b) => a + b, 0)}</b></div><div><small>Pretend money spent</small><b>$${pretendSpent().toFixed(2)}</b></div>`
  }
  function render() {
    const inv = inventory()
    const list = [...inv.items].sort((a, b) => itemValue(b) - itemValue(a))
    for (const u of [...sel]) if (!list.some((it) => it.uid === u)) sel.delete(u)
    const equipped = new Set(Object.values(inv.equipped))
    grid.replaceChildren(
      ...list.map((it) => {
        const c = itemCard(it, { price: r2(itemValue(it) * SELL_RATE), sel: sel.has(it.uid), note: equipped.has(it.uid) ? 'Equipped' : '' })
        c.dataset.uid = it.uid
        return c
      }),
    )
    if (!list.length) grid.innerHTML = '<p class="muted">Nothing here yet. Play COUNTER-STRIFE for cases, or win some skins in a case battle.</p>'
    const total = r2(list.filter((it) => sel.has(it.uid)).reduce((t, it) => t + itemValue(it) * SELL_RATE, 0))
    $('.iv-count', el).textContent = `${list.length} item${list.length === 1 ? '' : 's'}${sel.size ? ` · ${sel.size} selected` : ''}`
    const b = $('[data-sell]', el)
    b.disabled = !sel.size
    b.innerHTML = sel.size ? `Sell ${sel.size} for ${coins(total)}` : 'Sell'
    renderStats()
  }
  el.addEventListener('click', (e) => {
    const card = e.target.closest('.item')
    if (card) {
      const u = Number(card.dataset.uid)
      sel.has(u) ? sel.delete(u) : sel.add(u)
      click()
      return render()
    }
    const t = e.target.closest('button')
    if (!t) return
    if ('all' in t.dataset) {
      const list = items()
      if (sel.size === list.length) sel.clear()
      else list.forEach((it) => sel.add(it.uid))
      return render()
    }
    if ('sell' in t.dataset) {
      const got = takeItems([...sel])
      if (!got) return toast('Something changed: try again.', 'err')
      const total = r2(got.reduce((t2, it) => t2 + itemValue(it) * SELL_RATE, 0))
      credit(total)
      sel.clear()
      winSound(false)
      toast(`Sold ${got.length} for ⓒ ${fmt(total)}.`, 'win')
      render()
    }
  })
  render()
  return { refresh: render }
}

// ---------------- Free stuff
const FREE = 'skinsink-free'
function readFree() {
  try {
    return { code: false, daily: 0, ...(JSON.parse(localStorage.getItem(FREE)) ?? {}) }
  } catch {
    return { code: false, daily: 0 }
  }
}
const saveFree = (f) => {
  try {
    localStorage.setItem(FREE, JSON.stringify(f))
  } catch {}
}
export const RAKEBACK = 0.005
export function mountFree(el) {
  el.innerHTML = `<section class="game free">
    <div class="fr-card"><h3>🎁 Promo code</h3><p>Got a code from your favourite streamer? (There's only one streamer. It's us.)</p>
      <form class="fr-code"><input placeholder="Enter a code" maxlength="20" autocomplete="off" spellcheck="false" aria-label="Promo code"><button class="go">Redeem</button></form></div>
    <div class="fr-card"><h3>📅 Daily bonus</h3><p>Once a day: between ⓒ 0.25 and ⓒ 5, mostly nearer the 0.25.</p><button class="go" data-daily></button></div>
    <div class="fr-card"><h3>♻️ Rakeback</h3><p>0.5% of everything you've bet, back. It's how we say thanks for the other 99.5%.</p><button class="go" data-rake></button></div>
    <div class="fr-card"><h3>💳 Credits</h3><p>Out of credits? Buy some with pretend money. Or play COUNTER-STRIFE: kills and wins pay credits.</p><button class="go" data-store>Get credits</button></div>
  </section>`
  function render() {
    const f = readFree()
    const s = stats()
    const left = f.daily + 86400000 - Date.now()
    const d = $('[data-daily]', el)
    d.disabled = left > 0
    d.textContent = left > 0 ? `Come back in ${Math.floor(left / 3600000)}h ${Math.floor((left % 3600000) / 60000)}m` : 'Claim'
    const due = r2((s.wagered - (s.raked ?? 0)) * RAKEBACK)
    const r = $('[data-rake]', el)
    r.disabled = due < 0.01
    r.innerHTML = due >= 0.01 ? `Claim ${coins(due)}` : 'Nothing yet: bet something'
  }
  $('.fr-code', el).addEventListener('submit', (e) => {
    e.preventDefault()
    const input = $('input', e.target)
    const code = input.value.trim().toUpperCase()
    const f = readFree()
    if (!code) return
    if (code === 'NIKSTIL') {
      if (f.code) return toast('You’ve used that one already.', 'err')
      f.code = true
      saveFree(f)
      credit(5)
      winSound(false)
      toast('Code NIKSTIL: ⓒ 5 added. Tell your friends (please).', 'win')
      input.value = ''
    } else toast('Code not found. Have you tried NIKSTIL?', 'err')
  })
  el.addEventListener('click', (e) => {
    const t = e.target.closest('button')
    if (!t) return
    if ('daily' in t.dataset) {
      const f = readFree()
      if (f.daily + 86400000 > Date.now()) return
      const amount = r2(0.25 + Math.pow(Math.random(), 3) * 4.75)
      f.daily = Date.now()
      saveFree(f)
      credit(amount)
      winSound(amount > 2)
      toast(`Daily bonus: ⓒ ${fmt(amount)}.`, 'win')
      render()
    }
    if ('rake' in t.dataset) {
      const s = stats()
      const due = r2((s.wagered - (s.raked ?? 0)) * RAKEBACK)
      if (due < 0.01) return
      s.raked = s.wagered
      saveStats(s)
      credit(due)
      winSound(false)
      toast(`Rakeback: ⓒ ${fmt(due)}.`, 'win')
      render()
    }
    if ('store' in t.dataset) openCreditStore()
  })
  render()
  const t = setInterval(render, 30000)
  return () => clearInterval(t)
}
