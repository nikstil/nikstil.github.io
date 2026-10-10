// Case battles: everyone pays for the same cases, everyone opens them at once, round by round; the
// highest total takes every skin opened. Win and they're all yours (in your COUNTER-STRIFE
// inventory); lose and someone called Kevin has them now.

import { bet, giveItems, fmt, r2 } from './wallet.js'
import { h, $, $$, esc, coins, toast, feed } from './ui.js'
import { someoneElse } from './bots.js'
import { rollCase, skinById, caseById } from '../strife/skins.js'
import { iconFor, rarityOf, itemValue, caseValue, SKIN_CASES } from '../strife/items.js'
import { tick, winSound, loseSound, click } from './sound.js'
import { nudge, TICKER_OF } from '../stonks/market.js'

/** What a case costs here: what's in it on average, plus 10%. */
export const casePrice = (id) => r2(caseValue(id) * 1.1)
const SPIN_MS = 3400
const GAP_MS = 1300
const ITEM_H = 76 // reel row height, px

let battle = null // the one you're in
let view = null

/** A picture of some skin from the case, for the blur going past (same picture every time). */
function filler(caseId) {
  const ids = caseById[caseId].skins
  const id = ids[Math.floor(Math.random() * ids.length)]
  return { skin: id, wear: 0.2, seed: 7, st: null, r: skinById[id].rarity }
}

function create(caseId, rounds, seats) {
  const cost = r2(casePrice(caseId) * rounds)
  if (!bet(cost)) return toast(`Not enough credits: this battle costs ⓒ ${fmt(cost)}.`, 'err')
  click()
  const players = [{ who: { name: 'You', face: '😎' }, me: true, drops: [], total: 0 }]
  while (players.length < seats) players.push({ who: someoneElse(players.map((p) => p.who)), drops: [], total: 0 })
  battle = { caseId, rounds, seats, cost, players, round: 0, state: 'running', winner: null }
  view?.render()
  setTimeout(nextRound, 700)
}
function nextRound() {
  const b = battle
  if (!b || b.state !== 'running') return
  if (b.round >= b.rounds) return finish()
  b.round++
  for (const p of b.players) p.pending = rollCase(b.caseId)
  view?.spin()
  setTimeout(() => {
    for (const p of b.players) {
      p.drops.push(p.pending)
      p.total = r2(p.total + itemValue(p.pending))
      p.pending = null
    }
    view?.landed()
    setTimeout(nextRound, GAP_MS)
  }, SPIN_MS)
}
function finish() {
  const b = battle
  const best = Math.max(...b.players.map((p) => p.total))
  const tied = b.players.filter((p) => p.total === best)
  b.winner = tied[Math.floor(Math.random() * tied.length)]
  b.state = 'done'
  const all = b.players.flatMap((p) => p.drops)
  const worth = r2(all.reduce((s, it) => s + itemValue(it), 0))
  if (b.winner.me) {
    giveItems(all)
    winSound(worth >= 100)
    toast(`Case battle won: ${all.length} skins worth ⓒ ${fmt(worth)} are in your inventory.`, 'win')
  } else {
    loseSound()
    toast(`${b.winner.who.name} won the battle and took everything.`, 'lose')
    // a cast member's win is good news for their stock (NASDANK)
    const t = TICKER_OF[b.winner.who.name]
    if (t) nudge(t, 0.06, `${b.winner.who.name} wins a case battle (against you)`)
    if (worth >= 100) feed({ kind: 'win', who: b.winner.who, text: `won a case battle worth ⓒ ${fmt(worth)}` })
  }
  view?.render()
}

export function mount(el) {
  el.innerHTML = `<section class="game battles"><div class="cb-body"></div>
    <p class="fair">Cases cost what's in them on average plus 10%. The winner takes every skin; ties are settled by a coin we don't show you.</p></section>`
  const body = $('.cb-body', el)
  let pick = { caseId: SKIN_CASES[0].id, rounds: 3, seats: 2 }
  function setup() {
    const cost = r2(casePrice(pick.caseId) * pick.rounds)
    body.innerHTML = `<div class="cb-setup">
      <h3>Pick a case</h3>
      <div class="cb-cases">${SKIN_CASES.map((c) => `<button class="cb-case${c.id === pick.caseId ? ' sel' : ''}" data-case="${c.id}" style="--cc:${c.color}"><span class="box">📦</span><b>${esc(c.name)}</b><small>${coins(casePrice(c.id))}</small></button>`).join('')}</div>
      <div class="cb-opts">
        <label>Rounds <span class="seg">${[1, 2, 3, 4, 5].map((n) => `<button data-rounds="${n}" class="${n === pick.rounds ? 'sel' : ''}">${n}</button>`).join('')}</span></label>
        <label>Players <span class="seg">${[2, 3, 4].map((n) => `<button data-seats="${n}" class="${n === pick.seats ? 'sel' : ''}">${Array(n).fill('1').join('v')}</button>`).join('')}</span></label>
      </div>
      <button class="go big" data-create>Start battle · ${coins(cost)}</button>
      <details class="cb-odds"><summary>What's in the ${esc(caseById[pick.caseId].name)}</summary><div class="cb-contents"></div></details>
    </div>`
    const contents = $('.cb-contents', body)
    $('details', body).addEventListener('toggle', () => {
      if (contents.childElementCount) return
      const ids = [...caseById[pick.caseId].skins].sort((a, b) => ['milspec', 'restricted', 'classified', 'covert', 'gold'].indexOf(skinById[b].rarity) - ['milspec', 'restricted', 'classified', 'covert', 'gold'].indexOf(skinById[a].rarity))
      for (const id of ids) {
        const it = { skin: id, wear: 0.2, seed: 7, st: null }
        const d = h(`<div class="mini" style="--r:${rarityOf(it).color}"><img alt=""><small></small></div>`)
        $('img', d).src = iconFor(it, 120, 48)
        $('small', d).textContent = `${skinById[id].name}`
        contents.append(d)
      }
    })
  }
  function arena() {
    const b = battle
    body.innerHTML = `<div class="cb-arena">
      <div class="cb-head"><b>${esc(caseById[b.caseId].name)}</b> · round <span class="cb-round">${b.round}</span>/${b.rounds} · pot <span class="cb-pot"></span></div>
      <div class="cb-seats" style="--n:${b.seats}">${b.players
        .map(
          (p, i) => `<div class="cb-seat${p.me ? ' me' : ''}" data-i="${i}"><div class="cb-who">${p.who.face} ${esc(p.who.name)}</div><div class="cb-total"></div>
          <div class="cb-reel"><div class="cb-strip"></div><i class="cb-line"></i></div><div class="cb-drops"></div></div>`,
        )
        .join('')}</div>
      <div class="cb-end" hidden></div></div>`
    totals()
    drops()
    if (b.state === 'done') ended()
  }
  function totals() {
    const b = battle
    $('.cb-round', body).textContent = b.round
    $('.cb-pot', body).innerHTML = coins(b.players.reduce((s, p) => s + p.total, 0))
    b.players.forEach((p, i) => ($(`.cb-seat[data-i="${i}"] .cb-total`, body).innerHTML = coins(p.total)))
  }
  function drops() {
    battle.players.forEach((p, i) => {
      const box = $(`.cb-seat[data-i="${i}"] .cb-drops`, body)
      box.replaceChildren(
        ...p.drops.map((it) => {
          const d = h(`<div class="mini" style="--r:${rarityOf(it).color}"><img alt=""><small></small></div>`)
          $('img', d).src = iconFor(it, 120, 48)
          $('small', d).innerHTML = coins(itemValue(it))
          return d
        }),
      )
    })
  }
  function ended() {
    const b = battle
    const end = $('.cb-end', body)
    end.hidden = false
    const all = b.players.flatMap((p) => p.drops)
    const worth = all.reduce((s, it) => s + itemValue(it), 0)
    end.innerHTML = `<p>${b.winner.me ? `🏆 You won! ${all.length} skins worth ${coins(worth)} are in your inventory.` : `${b.winner.who.face} ${esc(b.winner.who.name)} won ${coins(worth)} of skins.`}</p>
      <div class="menu-row"><button class="go" data-again>Same again (${coins(b.cost)})</button><button class="ghost" data-new>New battle</button></div>`
    $$('.cb-seat', body).forEach((s) => s.classList.toggle('won', Number(s.dataset.i) === b.players.indexOf(b.winner)))
  }
  body.addEventListener('click', (e) => {
    const t = e.target.closest('button')
    if (!t) return
    if (t.dataset.case) pick.caseId = t.dataset.case
    if (t.dataset.rounds) pick.rounds = Number(t.dataset.rounds)
    if (t.dataset.seats) pick.seats = Number(t.dataset.seats)
    if (t.dataset.case || t.dataset.rounds || t.dataset.seats) return (click(), setup())
    if ('create' in t.dataset) create(pick.caseId, pick.rounds, pick.seats)
    if ('again' in t.dataset) create(battle.caseId, battle.rounds, battle.seats)
    if ('new' in t.dataset) {
      battle = null
      setup()
    }
  })
  let ticker = 0
  view = {
    render() {
      if (!battle) return setup()
      arena()
    },
    spin() {
      totals()
      const b = battle
      b.players.forEach((p, i) => {
        const strip = $(`.cb-seat[data-i="${i}"] .cb-strip`, body)
        const n = 28
        const list = Array.from({ length: n }, (_, k) => (k === n - 3 ? p.pending : filler(b.caseId)))
        strip.innerHTML = ''
        for (const it of list) {
          const d = h(`<div class="cb-item" style="--r:${rarityOf(it).color}"><img alt=""></div>`)
          $('img', d).src = iconFor(it, 120, 48)
          strip.append(d)
        }
        strip.style.transition = 'none'
        strip.style.transform = 'translateY(0)'
        void strip.offsetWidth
        const reelH = strip.parentElement.clientHeight
        const jitter = (Math.random() - 0.5) * (ITEM_H * 0.5)
        strip.style.transition = `transform ${SPIN_MS - 200}ms cubic-bezier(.1,.7,.15,1)`
        strip.style.transform = `translateY(${-((n - 3) * ITEM_H + ITEM_H / 2 - reelH / 2 + jitter)}px)`
      })
      clearInterval(ticker)
      let k = 0
      ticker = setInterval(() => {
        if (++k > 26) return clearInterval(ticker)
        if (k < 10 || k % Math.ceil(k / 8) === 0) tick()
      }, 110)
    },
    landed() {
      totals()
      drops()
      $$('.cb-strip', body).forEach((s) => {
        const it = s.children[s.children.length - 3]
        it?.classList.add('hit')
      })
    },
  }
  view.render()
  return () => {
    clearInterval(ticker)
    view = null
  }
}
