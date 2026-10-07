// The achievement hub: every game's achievements, worked out from their saves in this browser.

import { GAMES, evaluate, unlockedAt, check, toast } from './list.js'

const $ = (s, el = document) => el.querySelector(s)
if (new URLSearchParams(location.search).has('embed')) document.documentElement.classList.add('embed')

let sel = 'all'
let filter = 'all'
let list = []
let stamps = {}

const gameOf = (id) => GAMES.find((g) => g.id === id)
const when = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  const days = Math.floor((Date.now() - ts) / 864e5)
  return days < 1 ? 'today' : days < 2 ? 'yesterday' : days < 30 ? `${days} days ago` : d.toLocaleDateString()
}

function refresh() {
  const fresh = check()
  if (fresh.length) toast(fresh)
  list = evaluate()
  stamps = unlockedAt()
  render()
}

function render() {
  const done = list.filter((a) => a.done)
  const pts = done.reduce((s, a) => s + a.points, 0)
  const pct = Math.round((done.length / list.length) * 100)
  $('#score').textContent = pts.toLocaleString()
  $('#ring').style.setProperty('--p', pct)
  $('#pct').textContent = pct + '%'
  // games
  const nav = $('#games')
  nav.replaceChildren()
  const navBtn = (id, icon, name, c, of) => {
    const b = document.createElement('button')
    b.className = sel === id ? 'sel' : ''
    b.style.setProperty('--c', c)
    const got = of.filter((a) => a.done).length
    b.innerHTML = `<span class="gi"></span><b></b><small><span class="bar"><i style="width:${(got / Math.max(1, of.length)) * 100}%"></i></span>${got}/${of.length}</small>`
    $('.gi', b).textContent = icon
    $('b', b).textContent = name
    b.addEventListener('click', () => {
      sel = id
      filter = 'all'
      render()
      $('#main').scrollTop = 0
    })
    nav.append(b)
  }
  navBtn('all', '🎖️', 'Overview', '#f2c14e', list)
  for (const g of GAMES) navBtn(g.id, g.icon, g.name, g.color, list.filter((a) => a.game === g.id))

  const main = $('#main')
  main.replaceChildren()
  if (sel === 'all') overview(main, done, pts)
  else gamePage(main, gameOf(sel))
}

function card(a, showGame = false) {
  const g = gameOf(a.game)
  const el = document.createElement('div')
  el.className = 'ach' + (a.done ? '' : ' locked')
  el.style.setProperty('--c', g.color)
  const hidden = a.secret && !a.done
  el.innerHTML = `<span class="badge"></span><h3></h3><span class="pts"></span><p></p><div class="meta"></div>`
  $('.badge', el).textContent = hidden ? '?' : a.icon
  $('h3', el).textContent = hidden ? 'Secret achievement' : a.name
  $('.pts', el).textContent = `${a.points}G`
  $('p', el).textContent = hidden ? 'Keep playing to find out.' : a.desc
  const meta = $('.meta', el)
  if (showGame) {
    const t = document.createElement('span')
    t.className = 'game-tag'
    t.textContent = g.name
    meta.append(t)
  }
  if (a.done) {
    const t = document.createElement('span')
    t.textContent = `Unlocked ${when(stamps[a.id])}`
    meta.append(t)
  } else if (a.max > 1 && !hidden) {
    const bar = document.createElement('span')
    bar.className = 'bar'
    bar.innerHTML = `<i style="width:${(a.cur / a.max) * 100}%"></i>`
    const t = document.createElement('span')
    t.textContent = `${a.cur.toLocaleString()} / ${a.max.toLocaleString()}`
    meta.append(bar, t)
  }
  return el
}

function overview(main, done, pts) {
  const stats = document.createElement('div')
  stats.className = 'stats'
  const played = new Set(done.map((a) => a.game)).size
  for (const [v, l] of [
    [`${done.length} / ${list.length}`, 'achievements'],
    [pts.toLocaleString(), 'points'],
    [played, `game${played === 1 ? '' : 's'} with an achievement`],
    [list.filter((a) => !a.done && a.max > 1 && a.cur / a.max >= 0.5).length, 'more than halfway there'],
  ]) {
    const s = document.createElement('div')
    s.className = 'stat'
    s.innerHTML = '<b></b><small></small>'
    $('b', s).textContent = v
    $('small', s).textContent = l
    stats.append(s)
  }
  main.append(stats)
  const recent = done.filter((a) => stamps[a.id]).sort((a, b) => stamps[b.id] - stamps[a.id]).slice(0, 6)
  section(main, 'Recently unlocked', recent, 'Nothing yet. Play anything on nikstil.com and your achievements show up here.')
  const close = list.filter((a) => !a.done && !a.secret && a.max > 1 && a.cur > 0).sort((a, b) => b.cur / b.max - a.cur / a.max).slice(0, 6)
  section(main, 'Almost there', close, 'Nothing in progress.')
  const next = list.filter((a) => !a.done && !a.secret && !(a.max > 1 && a.cur > 0)).slice(0, 6)
  section(main, 'Try next', next, '')
}
function section(main, title, items, empty) {
  if (!items.length && !empty) return
  const h = document.createElement('h4')
  h.textContent = title
  main.append(h)
  if (!items.length) {
    const p = document.createElement('p')
    p.className = 'empty'
    p.textContent = empty
    main.append(p)
    return
  }
  const grid = document.createElement('div')
  grid.className = 'grid'
  for (const a of items) grid.append(card(a, true))
  main.append(grid)
}

function gamePage(main, g) {
  const of = list.filter((a) => a.game === g.id)
  const got = of.filter((a) => a.done)
  const b = document.createElement('div')
  b.className = 'banner'
  b.style.setProperty('--c', g.color)
  b.innerHTML = '<span class="bi"></span><div><h2></h2><p></p></div><a target="_top">Play</a>'
  $('.bi', b).textContent = g.icon
  $('h2', b).textContent = g.name
  $('p', b).textContent = `${got.length} of ${of.length} unlocked · ${got.reduce((s, a) => s + a.points, 0)} of ${of.reduce((s, a) => s + a.points, 0)} points`
  $('a', b).href = g.url
  if (g.id === 'site') $('a', b).textContent = 'Open'
  main.append(b)
  const chips = document.createElement('div')
  chips.className = 'chips'
  for (const [v, l] of [['all', 'All'], ['done', 'Unlocked'], ['locked', 'Locked']]) {
    const c = document.createElement('button')
    c.textContent = l
    c.className = filter === v ? 'sel' : ''
    c.addEventListener('click', () => {
      filter = v
      render()
    })
    chips.append(c)
  }
  main.append(chips)
  const grid = document.createElement('div')
  grid.className = 'grid'
  const shown = of.filter((a) => (filter === 'all' ? true : filter === 'done' ? a.done : !a.done)).sort((a, b) => (b.done ? 1 : 0) - (a.done ? 1 : 0))
  for (const a of shown) grid.append(card(a))
  main.append(grid)
}

// who's looking (the nikstil.com account, if signed in)
async function profile() {
  const on = window.nikstilOnline
  if (!on || !on.hasStoredSession()) return
  try {
    await on.connect()
    const p = await on.me()
    if (!p) return
    $('#me-name').textContent = p.username
    $('#me-sub').textContent = 'Signed in on nikstil.com'
    $('#me-avatar').textContent = p.username.slice(0, 1).toUpperCase()
  } catch {}
}

refresh()
addEventListener('storage', refresh)
addEventListener('focus', refresh)
setInterval(refresh, 15000)
addEventListener('load', profile)
