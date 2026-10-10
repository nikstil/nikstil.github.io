// The upgrader: put in a skin (or some credits), pick a better skin, and spin. The bigger the jump,
// the smaller your chance; win and the better skin is yours, lose and what you put in is gone.

import { bet, items, takeItems, giveItems, r2, balance } from './wallet.js'
import { $, $$, esc, coins, toast, feed, itemCard } from './ui.js'
import { anyone } from './bots.js'
import { SKINS, skinById, makeItem, kindOf } from '../strife/skins.js'
import { itemValue, skinValue } from '../strife/items.js'
import { WEAPONS } from '../strife/weapons.js'
import { winSound, loseSound, tick, click } from './sound.js'

const EDGE = 0.92 // your chance is 92% of the fair one
const MAX_CHANCE = 0.8
const SPIN_MS = 3600

/** The chance of turning `from` credits' worth into `to`. */
export const chanceOf = (from, to) => Math.max(0, Math.min(MAX_CHANCE, (EDGE * from) / to))
/** A brand new skin of this kind, Field-Tested (the price it's listed at). */
function freshSkin(id) {
  const it = makeItem(id)
  it.wear = Number((0.16 + Math.random() * 0.2).toFixed(4))
  return it
}
// one of each skin to aim for, cheapest first
const TARGETS = SKINS.map((s) => ({ id: s.id, value: skinValue(s.id) }))
  .sort((a, b) => a.value - b.value || a.id.localeCompare(b.id))

export function mount(el) {
  el.innerHTML = `<section class="game upgrader">
    <div class="up-dial"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="84" class="track"/><circle cx="100" cy="100" r="84" class="arc"/><g class="needle"><path d="M100 8 L94 30 L106 30 Z"/></g></svg>
      <div class="up-mid"><b class="up-chance">0%</b><small>chance</small></div></div>
    <div class="up-spin"><button class="go big" data-spin disabled>Upgrade</button></div>
    <div class="up-cols">
      <div class="up-col"><h3>Put in</h3>
        <div class="seg up-mode"><button data-mode="item" class="sel">A skin</button><button data-mode="credits">Credits</button></div>
        <div class="up-in"></div></div>
      <div class="up-col"><h3>Aim for</h3>
        <div class="seg up-mult">${[1.5, 2, 5, 10, 20].map((m) => `<button data-mult="${m}">${m}×</button>`).join('')}</div>
        <div class="up-out"></div></div>
    </div>
    <p class="fair">Your chance is 92% of a fair one, and never more than 80%. The needle doesn't know that. Probably.</p>
  </section>`
  let mode = 'item'
  let inUid = null
  let inCredits = 5
  let target = null
  let spinning = false
  let angle = 0
  const inValue = () => (mode === 'credits' ? inCredits : itemValue(items().find((x) => x.uid === inUid) ?? {}) || 0)
  function renderIn() {
    const box = $('.up-in', el)
    $$('.up-mode button', el).forEach((b) => b.classList.toggle('sel', b.dataset.mode === mode))
    if (mode === 'credits') {
      box.innerHTML = `<label class="amount"><span class="c">ⓒ</span><input type="number" min="0.5" step="0.5" value="${inCredits}" inputmode="decimal"></label><small class="muted">You have ${coins(balance())}</small>`
      $('input', box).addEventListener('input', (e) => {
        inCredits = r2(Math.max(0, Number(e.target.value) || 0))
        renderOut()
      })
      return
    }
    const mine = items()
      .filter((it) => kindOf(it) === 'skin')
      .sort((a, b) => itemValue(b) - itemValue(a))
    if (!mine.length) {
      box.innerHTML = '<p class="muted">No skins yet. Open cases in COUNTER-STRIFE, win a case battle, buy one in the Market, or put in credits instead.</p>'
      return
    }
    if (!mine.some((it) => it.uid === inUid)) inUid = mine[0].uid
    box.innerHTML = '<div class="grid small"></div>'
    for (const it of mine.slice(0, 60)) {
      const c = itemCard(it, { sel: it.uid === inUid })
      c.dataset.uid = it.uid
      $('.grid', box).append(c)
    }
  }
  function renderOut() {
    const v = inValue()
    const box = $('.up-out', el)
    const options = TARGETS.filter((t) => t.value > v)
    if (!options.some((t) => t.id === target)) target = options[0]?.id ?? null
    box.innerHTML = '<div class="grid small"></div>'
    for (const t of options.slice(0, 48)) {
      const it = { skin: t.id, wear: 0.2, seed: 7, st: null }
      const c = itemCard(it, { price: t.value, sel: t.id === target, note: `${(chanceOf(v, t.value) * 100).toFixed(1)}%` })
      c.dataset.target = t.id
      $('.grid', box).append(c)
    }
    if (!options.length) box.innerHTML = '<p class="muted">That’s already worth more than anything here.</p>'
    dial()
  }
  function dial() {
    const v = inValue()
    const t = target ? skinValue(target) : 0
    const ch = t ? chanceOf(v, t) : 0
    $('.up-chance', el).textContent = `${(ch * 100).toFixed(1)}%`
    const arc = $('.arc', el)
    const len = 2 * Math.PI * 84
    arc.style.strokeDasharray = `${len * ch} ${len}`
    $('[data-spin]', el).disabled = spinning || !ch || !target
    $('[data-spin]', el).innerHTML = target && ch ? `Upgrade to ${skinById[target].weapon === 'knife' ? '★ Knife' : esc(WEAPONS[skinById[target].weapon]?.name)} | ${esc(skinById[target].name)} (${coins(skinValue(target))})` : 'Pick something to aim for'
  }
  async function spin() {
    if (spinning || !target) return
    const v = inValue()
    const to = target
    const ch = chanceOf(v, skinValue(to))
    if (mode === 'credits') {
      if (!(v > 0)) return toast('Put in some credits first.', 'err')
      if (!bet(v)) return toast('Not enough credits.', 'err')
    } else {
      const got = takeItems([inUid])
      if (!got) return toast('That skin isn’t in your inventory any more.', 'err')
    }
    spinning = true
    click()
    dial()
    const won = Math.random() < ch
    // the win arc runs clockwise from the top: land inside it (won) or outside
    const deg = won ? Math.random() * ch * 360 * 0.96 + ch * 360 * 0.02 : ch * 360 + Math.random() * (360 - ch * 360) * 0.96 + (360 - ch * 360) * 0.02
    angle = angle - (angle % 360) + 360 * 6 + deg
    const needle = $('.needle', el)
    needle.style.transition = `transform ${SPIN_MS}ms cubic-bezier(.12,.7,.12,1)`
    needle.style.transform = `rotate(${angle}deg)`
    const tk = setInterval(tick, 120)
    setTimeout(() => clearInterval(tk), SPIN_MS * 0.7)
    await new Promise((r) => setTimeout(r, SPIN_MS + 100))
    spinning = false
    if (won) {
      giveItems([freshSkin(to)])
      winSound(skinValue(to) >= 100)
      toast(`Upgraded! ${skinById[to].name} is in your inventory.`, 'win')
      if (skinValue(to) >= 120) feed({ kind: 'win', who: { name: 'You', face: '😎' }, text: `upgraded into ${skinById[to].name}` })
    } else {
      loseSound()
      toast('The needle says no.', 'lose')
    }
    renderIn()
    renderOut()
  }
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-mode],[data-mult],[data-spin],.item')
    if (!t || spinning) return
    if (t.dataset.mode) {
      mode = t.dataset.mode
      target = null // (the cheapest step up from what's going in)
      renderIn()
      renderOut()
    } else if (t.dataset.mult) {
      const want = inValue() * Number(t.dataset.mult)
      const best = TARGETS.filter((x) => x.value > inValue()).sort((a, b) => Math.abs(a.value - want) - Math.abs(b.value - want))[0]
      if (best) target = best.id
      renderOut()
    } else if ('spin' in t.dataset) spin()
    else if (t.dataset.uid) {
      inUid = Number(t.dataset.uid)
      renderIn()
      renderOut()
    } else if (t.dataset.target) {
      target = t.dataset.target
      renderOut()
    }
    if (!('spin' in t.dataset)) click()
  })
  renderIn()
  renderOut()
  // a stranger's upgrade now and then, to keep the feed busy
  const stranger = setInterval(() => Math.random() < 0.15 && feed({ kind: 'win', who: anyone(), text: 'hit a 12% upgrade into a ★ knife' }), 9000)
  return () => clearInterval(stranger)
}
