// Case battles: everyone opens the same lineup of cases, one a round. Standard: the biggest total
// takes every skin opened. Crazy: the smallest does. Terminal: only the last case counts. Jackpot:
// what you opened is your tickets, and one ticket wins it all. In 2v2 the teams add up, and the
// winning pair splits the loot. The High Roller Case and the Knife Room are only here: nothing but
// the top grades, at a price to match. Win and the skins are yours (in your COUNTER-STRIFE
// inventory); lose and someone called Kevin has them now.

import { bet, giveItems, fmt, r2 } from './wallet.js'
import { h, $, $$, esc, coins, toast, feed } from './ui.js'
import { someoneElse } from './bots.js'
import { RARITY, SKINS, CASES, rollCase, makeItem, skinById, caseById, anyKnife } from '../strife/skins.js'
import { iconFor, rarityOf, itemValue, caseValue, skinValue, SKIN_CASES } from '../strife/items.js'
import { tick, winSound, loseSound, click } from './sound.js'
import { nudge, TICKER_OF } from '../stonks/market.js'

// ---------------- The battle-only cases: top grades only, from the weapon cases
const inCases = new Set(CASES.flatMap((c) => c.skins ?? []))
const SPECIAL = [
  { id: 'highroller', name: 'High Roller Case', color: '#e4ae39', icon: '💎', grades: ['classified', 'covert', 'gold'] },
  { id: 'kniferoom', name: 'Knife Room', color: '#eb4b4b', icon: '🔪', grades: ['covert', 'gold'] },
].map((c) => ({ ...c, skins: SKINS.filter((s) => c.grades.includes(s.rarity) && inCases.has(s.id)).map((s) => s.id) }))
const special = Object.fromEntries(SPECIAL.map((c) => [c.id, c]))
const caseInfo = (id) => special[id] ?? caseById[id]
/** The odds of each grade in a battle-only case: the usual ones, among just those grades. */
const gradeOdds = (c) => {
  const total = c.grades.reduce((t, g) => t + RARITY[g].odds, 0)
  return c.grades.map((g) => [g, RARITY[g].odds / total])
}
function roll(caseId) {
  const c = special[caseId]
  if (!c) return rollCase(caseId)
  let x = Math.random()
  let grade = c.grades[0]
  for (const [g, p] of gradeOdds(c)) {
    x -= p
    if (x <= 0) {
      grade = g
      break
    }
  }
  const of = c.skins.filter((id) => skinById[id].rarity === grade)
  return makeItem(anyKnife(of[Math.floor(Math.random() * of.length)]))
}
/** What opening one is worth on average. */
function worth(caseId) {
  const c = special[caseId]
  if (!c) return caseValue(caseId)
  return r2(gradeOdds(c).reduce((t, [g, p]) => t + p * skinValue(c.skins.find((id) => skinById[id].rarity === g)), 0) * 1.06)
}
/** What a case costs here: what's in it on average, plus 10%. */
export const casePrice = (id) => r2(worth(id) * 1.1)
const ALL = [...SPECIAL, ...SKIN_CASES]

// ---------------- Modes and line-ups
const MODES = {
  standard: { name: 'Standard', blurb: 'The biggest total takes every skin.' },
  crazy: { name: 'Crazy', blurb: 'Upside down: the smallest total takes every skin.' },
  terminal: { name: 'Terminal', blurb: 'Only the last case counts: the best one opened in it takes the lot.' },
  jackpot: { name: 'Jackpot', blurb: 'What you open is your tickets: one ticket is drawn and takes it all.' },
}
const FORMATS = {
  '1v1': [0, 1],
  '1v1v1': [0, 1, 2],
  '1v1v1v1': [0, 1, 2, 3],
  '2v2': [0, 0, 1, 1],
}
const MAX_CASES = 25
const HIGH_STAKES = 1000 // a pot this big gets the gold treatment
const BEST_KEY = 'skinsink-battle-best'

let battle = null // the one you're in
let view = null
const speed = (b) => (b.fast ? { spin: 1300, gap: 450 } : { spin: 3400, gap: 1300 })

/** A picture of some skin from the case, for the blur going past (same picture every time). */
function filler(caseId) {
  const ids = caseInfo(caseId).skins
  const id = ids[Math.floor(Math.random() * ids.length)]
  return { skin: id, wear: 0.2, seed: 7, st: null, r: skinById[id].rarity }
}

function create(setup) {
  const lineup = setup.lineup.slice(0, MAX_CASES)
  if (!lineup.length) return toast('Add some cases to the line-up first.', 'err')
  const cost = r2(lineup.reduce((t, id) => t + casePrice(id), 0))
  if (!bet(cost)) return toast(`Not enough credits: this battle costs ⓒ ${fmt(cost)}.`, 'err')
  click()
  const teams = FORMATS[setup.format]
  const players = [{ who: { name: 'You', face: '😎' }, me: true, team: teams[0], drops: [], total: 0 }]
  while (players.length < teams.length) players.push({ who: someoneElse(players.map((p) => p.who)), team: teams[players.length], drops: [], total: 0 })
  battle = { lineup, mode: setup.mode, format: setup.format, fast: setup.fast, cost, players, round: 0, state: 'running', winners: [] }
  view?.render()
  setTimeout(nextRound, 700)
}
function nextRound() {
  const b = battle
  if (!b || b.state !== 'running') return
  if (b.round >= b.lineup.length) return finish()
  const caseId = b.lineup[b.round]
  b.round++
  for (const p of b.players) p.pending = roll(caseId)
  view?.spin(caseId)
  setTimeout(() => {
    for (const p of b.players) {
      p.drops.push(p.pending)
      p.total = r2(p.total + itemValue(p.pending))
      p.pending = null
    }
    view?.landed()
    setTimeout(nextRound, speed(b).gap)
  }, speed(b).spin)
}
/** Who won: the winning team, by the mode's rules (ties: a coin we don't show you). */
function decide(b) {
  const teamIds = [...new Set(b.players.map((p) => p.team))]
  const score = (t, f) => b.players.filter((p) => p.team === t).reduce((s, p) => s + f(p), 0)
  const last = (p) => itemValue(p.drops[p.drops.length - 1])
  const pickOf = (list) => list[Math.floor(Math.random() * list.length)]
  if (b.mode === 'jackpot') {
    // everyone's total is their share of the tickets (a team's are pooled)
    const tickets = teamIds.map((t) => [t, score(t, (p) => p.total)])
    const all = tickets.reduce((s, [, v]) => s + v, 0)
    const x = Math.random() * all
    b.draw = { tickets: tickets.map(([t, v]) => [t, all ? v / all : 1 / tickets.length]), at: all ? x / all : 0.5 }
    let upTo = 0
    for (const [t, v] of tickets) if (x < (upTo += v)) return t
    return tickets[tickets.length - 1][0]
  }
  const f = b.mode === 'terminal' ? last : (p) => p.total
  const scores = teamIds.map((t) => [t, r2(score(t, f))])
  const best = b.mode === 'crazy' ? Math.min(...scores.map(([, v]) => v)) : Math.max(...scores.map(([, v]) => v))
  return pickOf(scores.filter(([, v]) => v === best).map(([t]) => t))
}
function finish() {
  const b = battle
  const team = decide(b)
  b.winners = b.players.filter((p) => p.team === team)
  b.state = 'done'
  const all = b.players.flatMap((p) => p.drops)
  const pot = r2(all.reduce((s, it) => s + itemValue(it), 0))
  // the winners split it: the best skins dealt out in turn
  const shares = new Map(b.winners.map((p) => [p, []]))
  const order = [...b.winners].sort(() => Math.random() - 0.5)
  ;[...all].sort((x, y) => itemValue(y) - itemValue(x)).forEach((it, i) => shares.get(order[i % order.length]).push(it))
  b.shares = shares
  const me = b.players.find((p) => p.me)
  const mine = shares.get(me) ?? []
  const got = r2(mine.reduce((s, it) => s + itemValue(it), 0))
  remember({ pot, cost: b.cost, got, mode: b.mode, format: b.format, cases: b.lineup.length, at: Date.now() })
  if (mine.length) {
    giveItems(mine)
    winSound(got >= 100)
    toast(`Case battle won: ${mine.length} skins worth ⓒ ${fmt(got)} are in your inventory.`, 'win')
    if (pot >= HIGH_STAKES) feed({ kind: 'win', who: { name: 'You', face: '😎' }, text: `won a ⓒ ${fmt(pot)} case battle` })
  } else {
    loseSound()
    const lead = b.winners[0]
    toast(`${b.winners.map((p) => p.who.name).join(' and ')} won the battle and took everything.`, 'lose')
    // a cast member's win is good news for their stock (NASDANK)
    const t = TICKER_OF[lead.who.name]
    if (t) nudge(t, 0.06, `${lead.who.name} wins a case battle (against you)`)
    if (pot >= 100) feed({ kind: 'win', who: lead.who, text: `won a case battle worth ⓒ ${fmt(pot)}` })
  }
  view?.render()
}

// ---------------- Your biggest battles (this device)
function bests() {
  try {
    const v = JSON.parse(localStorage.getItem(BEST_KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
function remember(r) {
  const list = [...bests(), r].sort((x, y) => y.pot - x.pot).slice(0, 5)
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(list))
  } catch {}
}

export function mount(el) {
  el.innerHTML = `<section class="game battles"><div class="cb-body"></div>
    <p class="fair">Cases cost what's in them on average plus 10%. Ties are settled by a coin we don't show you. In 2v2 the winners take turns picking from the loot, best first.</p></section>`
  const body = $('.cb-body', el)
  let pick = { lineup: [SKIN_CASES[0].id], mode: 'standard', format: '1v1', fast: false, shown: SKIN_CASES[0].id }
  const costOf = () => r2(pick.lineup.reduce((t, id) => t + casePrice(id), 0))
  function setup() {
    const counts = {}
    for (const id of pick.lineup) counts[id] = (counts[id] ?? 0) + 1
    const cost = costOf()
    const best = bests()
    body.innerHTML = `<div class="cb-setup">
      <h3>Build the line-up <small>(a case a round, up to ${MAX_CASES})</small></h3>
      <div class="cb-cases">${ALL.map(
        (c) => `<button class="cb-case${special[c.id] ? ' special' : ''}${counts[c.id] ? ' sel' : ''}" data-add="${c.id}" style="--cc:${c.color}" title="Add one to the line-up"><span class="box">${c.icon ?? '📦'}</span><b>${esc(c.name)}</b><small>${coins(casePrice(c.id))}</small>${counts[c.id] ? `<i class="cb-n">×${counts[c.id]}</i>` : ''}</button>`,
      ).join('')}</div>
      <div class="cb-lineup">${pick.lineup.length ? pick.lineup.map((id, i) => `<button class="cb-chip" data-del="${i}" style="--cc:${caseInfo(id).color}" title="Take it out">${esc(caseInfo(id).name.replace(' Case', ''))} ✕</button>`).join('') : '<span class="muted">Nothing yet: click cases above.</span>'}
        ${pick.lineup.length ? '<button class="ghost small" data-clear>Clear</button>' : ''}</div>
      <div class="cb-opts">
        <label>Mode <span class="seg">${Object.entries(MODES).map(([k, m]) => `<button data-mode="${k}" class="${k === pick.mode ? 'sel' : ''}">${m.name}</button>`).join('')}</span></label>
        <p class="cb-blurb">${MODES[pick.mode].blurb}</p>
        <label>Players <span class="seg">${Object.keys(FORMATS).map((k) => `<button data-format="${k}" class="${k === pick.format ? 'sel' : ''}">${k}</button>`).join('')}</span></label>
        <label>Spins <span class="seg"><button data-fast="0" class="${pick.fast ? '' : 'sel'}">Normal</button><button data-fast="1" class="${pick.fast ? 'sel' : ''}">Fast</button></span></label>
      </div>
      <button class="go big${cost >= HIGH_STAKES ? ' stakes' : ''}" data-create ${pick.lineup.length ? '' : 'disabled'}>${cost >= HIGH_STAKES ? '💰 High stakes · ' : ''}Start battle · ${coins(cost)}</button>
      <details class="cb-odds"><summary>What's in the ${esc(caseInfo(pick.shown).name)}</summary><div class="cb-contents"></div></details>
      ${best.length ? `<div class="cb-best"><h4>Your biggest battles</h4>${best.map((r) => `<div><b>${coins(r.pot)}</b> pot · ${MODES[r.mode]?.name ?? r.mode} ${esc(r.format)} · ${r.cases} case${r.cases === 1 ? '' : 's'} · ${r.got ? `won ${coins(r.got)}` : 'lost'}</div>`).join('')}</div>` : ''}
    </div>`
    const contents = $('.cb-contents', body)
    $('details', body).addEventListener('toggle', () => {
      if (contents.childElementCount) return
      const order = ['milspec', 'restricted', 'classified', 'covert', 'gold']
      const ids = [...caseInfo(pick.shown).skins].sort((a, b) => order.indexOf(skinById[b].rarity) - order.indexOf(skinById[a].rarity))
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
    const pot = b.players.reduce((s, p) => s + p.total, 0)
    const teamed = new Set(b.players.map((p) => p.team)).size < b.players.length
    body.innerHTML = `<div class="cb-arena${b.cost >= HIGH_STAKES ? ' high-stakes' : ''}">
      ${b.cost >= HIGH_STAKES ? '<div class="cb-stakes">💰 HIGH STAKES</div>' : ''}
      <div class="cb-head"><b>${MODES[b.mode].name} · ${esc(b.format)}</b> · round <span class="cb-round">${b.round}</span>/${b.lineup.length} · <span class="cb-case-now">${esc(caseInfo(b.lineup[Math.max(0, b.round - 1)]).name)}</span> · pot <span class="cb-pot">${coins(pot)}</span></div>
      <div class="cb-track">${b.lineup.map((id, i) => `<i class="${i < b.round ? 'done' : ''}" style="--cc:${caseInfo(id).color}" title="${esc(caseInfo(id).name)}"></i>`).join('')}</div>
      <div class="cb-seats" style="--n:${b.players.length}">${b.players
        .map(
          (p, i) => `<div class="cb-seat${p.me ? ' me' : ''}${teamed ? ` team-${p.team}` : ''}" data-i="${i}"><div class="cb-who">${teamed ? `<span class="cb-team">${p.team ? 'B' : 'A'}</span> ` : ''}${p.who.face} ${esc(p.who.name)}</div><div class="cb-total"></div>
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
    $('.cb-case-now', body).textContent = caseInfo(b.lineup[Math.max(0, b.round - 1)]).name
    $('.cb-pot', body).innerHTML = coins(b.players.reduce((s, p) => s + p.total, 0))
    b.players.forEach((p, i) => ($(`.cb-seat[data-i="${i}"] .cb-total`, body).innerHTML = coins(p.total)))
    $$('.cb-track i', body).forEach((t, i) => t.classList.toggle('done', i < b.round))
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
    const pot = all.reduce((s, it) => s + itemValue(it), 0)
    const me = b.players.find((p) => p.me)
    const mine = b.shares?.get(me) ?? []
    const names = b.winners.map((p) => `${p.who.face} ${esc(p.who.name)}`).join(' and ')
    const jackpot = b.draw
      ? `<div class="cb-jackpot">${b.draw.tickets.map(([t, share]) => `<span class="team-${t}" style="flex:${Math.max(0.02, share)}">${Math.round(share * 100)}%</span>`).join('')}<i style="left:${(b.draw.at * 100).toFixed(1)}%"></i></div>`
      : ''
    end.innerHTML = `${jackpot}<p>${
      mine.length
        ? `🏆 ${b.winners.length > 1 ? `You and ${esc(b.winners.find((p) => !p.me).who.name)} won! Your half: ` : 'You won! '}${mine.length} skins worth ${coins(mine.reduce((s, it) => s + itemValue(it), 0))} are in your inventory.`
        : `${names} won ${coins(pot)} of skins.`
    }</p>
      <div class="menu-row"><button class="go" data-again>Same again (${coins(b.cost)})</button><button class="ghost" data-new>New battle</button></div>`
    $$('.cb-seat', body).forEach((s) => s.classList.toggle('won', b.winners.includes(b.players[Number(s.dataset.i)])))
  }
  body.addEventListener('click', (e) => {
    const t = e.target.closest('button')
    if (!t) return
    if (t.dataset.add) {
      if (pick.lineup.length >= MAX_CASES) return toast(`${MAX_CASES} cases is the most a battle takes.`, 'err')
      pick.lineup.push(t.dataset.add)
      pick.shown = t.dataset.add
    } else if (t.dataset.del) pick.lineup.splice(Number(t.dataset.del), 1)
    else if ('clear' in t.dataset) pick.lineup = []
    else if (t.dataset.mode) pick.mode = t.dataset.mode
    else if (t.dataset.format) pick.format = t.dataset.format
    else if (t.dataset.fast) pick.fast = t.dataset.fast === '1'
    if (t.dataset.add || t.dataset.del || 'clear' in t.dataset || t.dataset.mode || t.dataset.format || t.dataset.fast) return (click(), setup())
    if ('create' in t.dataset) create(pick)
    if ('again' in t.dataset) create(battle)
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
    spin(caseId) {
      totals()
      const b = battle
      const { spin } = speed(b)
      b.players.forEach((p, i) => {
        const strip = $(`.cb-seat[data-i="${i}"] .cb-strip`, body)
        const n = 28
        const list = Array.from({ length: n }, (_, k) => (k === n - 3 ? p.pending : filler(caseId)))
        strip.innerHTML = ''
        for (const it of list) {
          const d = h(`<div class="cb-item" style="--r:${rarityOf(it).color}"><img alt=""></div>`)
          $('img', d).src = iconFor(it, 120, 48)
          strip.append(d)
        }
        strip.style.transition = 'none'
        strip.style.transform = 'translateY(0)'
        void strip.offsetWidth
        const itemH = strip.firstElementChild?.offsetHeight || 76
        const reelH = strip.parentElement.clientHeight
        const jitter = (Math.random() - 0.5) * (itemH * 0.5)
        strip.style.transition = `transform ${spin - 200}ms cubic-bezier(.1,.7,.15,1)`
        strip.style.transform = `translateY(${-((n - 3) * itemH + itemH / 2 - reelH / 2 + jitter)}px)`
      })
      clearInterval(ticker)
      let k = 0
      const every = b.fast ? 60 : 110
      ticker = setInterval(() => {
        if (++k > spin / every - 4) return clearInterval(ticker)
        if (k < 10 || k % Math.ceil(k / 8) === 0) tick()
      }, every)
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
