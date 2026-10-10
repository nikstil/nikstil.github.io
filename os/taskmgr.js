// Task Manager: what's running on BloatOS. Your open windows, plus the background processes every
// PC has (bloatware, mostly). End Task really ends things: a window closes, explorer.exe takes the
// desktop and taskbar with it, and bloatos.exe takes the whole OS (the blue screen has a mini-game:
// type the stop code to reboot faster). Some processes don't take kindly to being ended.

import { feat } from './feats.js'
import * as arg from './arg.js'

const $ = (s, el = document) => el.querySelector(s)
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const rand = (a, b) => a + Math.random() * (b - a)

// The bloat (it's always there). n: how many times TheAlgorithm has come back.
let algoLives = 0
const disabled = new Set() // startup items you "disabled"
const STOP_CODES = ['KEVIN_REPLIED_ALL', 'CEO_DOG_ATE_THE_KERNEL', 'SYNERGY_NOT_FOUND', 'TOO_MANY_TABS_EXCEPTION', 'MEETING_THAT_COULD_HAVE_BEEN_AN_EMAIL', 'COFFEE_DLL_MISSING', 'IRQL_NOT_LESS_OR_EQUAL_TO_MONDAY']

function background() {
  const algo = algoLives ? `TheAlgorithm (${algoLives > 3 ? '∞' : algoLives + 1}).exe` : 'TheAlgorithm.exe'
  const list = [
    { key: 'explorer', name: 'explorer.exe', icon: '🗂️', desc: 'Windows Explorer (the desktop and taskbar)', status: 'Running', cpu: rand(0.5, 3), mem: 61 },
    { key: 'bloatos', name: 'bloatos.exe', icon: '🪟', desc: 'BloatOS kernel', status: 'Running', cpu: rand(1, 4), mem: 412 },
    { key: 'algo', name: algo, icon: '🤖', desc: 'Decides what you see next', status: 'Optimising you', cpu: Math.min(99, rand(88, 97) + algoLives * 2), mem: 2048 * (algoLives + 1) },
    { key: 'kevin', name: 'Kevin (Sales).exe', icon: '📈', desc: 'Circling back', status: 'Not responding', cpu: rand(0, 1), mem: 999 },
    { key: 'brenda', name: 'Brenda_HR_Monitor.exe', icon: '🗂️', desc: 'Human Resources', status: 'Monitoring you', cpu: rand(4, 9), mem: 256 },
    { key: 'miner', name: 'definitely_not_a_miner.exe', icon: '⛏️', desc: 'Nothing to see here', status: 'Mining (not)', cpu: rand(55, 70), mem: 777 },
    { key: 'dog', name: 'CEO_Dog_Updater.exe', icon: '🐕', desc: 'Keeps the CEO dog up to date', status: 'Updating… (3%)', cpu: rand(2, 6), mem: 128 },
    { key: 'telemetry', name: 'TRANSLATR_Telemetry.exe', icon: '📡', desc: 'Phones home', status: 'Phoning home', cpu: rand(3, 8), mem: 333 },
  ]
  if (arg.ghostAwake()) list.push({ key: 'ghost', name: 'ghost.exe', icon: '👻', desc: '???', status: 'Watching', cpu: 0.3, mem: 13 })
  return list
}

/** The Task Manager window. os: { open, closeWin, msgbox, askbox, openApp, killExplorer, restartExplorer, reboot } */
export function initTaskManager(el, win, os) {
  const body = $('.tm', el)
  body.innerHTML = `
    <div class="tm-menu"><button type="button" data-tm="run">▶ Run new task</button><span class="tm-uptime"></span></div>
    <div class="tm-tabs" role="tablist"><button type="button" role="tab" data-tab="proc" class="sel">Processes</button><button type="button" role="tab" data-tab="perf">Performance</button><button type="button" role="tab" data-tab="startup">Startup</button></div>
    <div class="tm-page tm-proc"><table class="tm-procs"><thead><tr><th>Name</th><th>Status</th><th class="num">CPU</th><th class="num">Memory</th></tr></thead><tbody></tbody></table></div>
    <div class="tm-page tm-perf" hidden><div class="tm-graph-wrap"><b>CPU</b> <span class="tm-cpu-now"></span><canvas class="tm-graph" width="460" height="140"></canvas></div><dl class="tm-stats"></dl></div>
    <div class="tm-page tm-startup" hidden><table class="tm-procs tm-start"><thead><tr><th>Name</th><th>Startup impact</th><th>Status</th><th></th></tr></thead><tbody></tbody></table></div>
    <div class="tm-foot"><span class="tm-sum"></span><button type="button" class="tm-end" disabled>End task</button></div>`
  const tbody = $('.tm-proc tbody', body)
  const end = $('.tm-end', body)
  let rows = []
  let sel = null
  const hist = []

  function list() {
    const apps = [...os.open.values()]
      .filter((w) => w !== win)
      .map((w) => ({ key: `win:${w.id}`, name: $('.win-title', w.el)?.textContent || w.id, icon: $('.win-icon', w.el)?.textContent || '🪟', desc: 'App', status: w.el.hidden ? 'Minimized' : 'Running', cpu: rand(0.2, 6), mem: Math.round(rand(40, 380)), win: w, app: true }))
    return [...apps, ...background()]
  }
  function render() {
    rows = list()
    if (sel && !rows.some((r) => r.key === sel)) sel = null
    const group = (title, items) => `<tr class="tm-group"><td colspan="4">${title} (${items.length})</td></tr>` + items.map((r) => `<tr data-key="${esc(r.key)}" class="${r.key === sel ? 'sel' : ''}${r.key === 'ghost' ? ' ghost' : ''}" title="${esc(r.desc)}"><td><span class="tm-icon" aria-hidden="true">${esc(r.icon)}</span>${esc(r.name)}</td><td>${esc(r.status)}</td><td class="num">${r.cpu.toFixed(1)}%</td><td class="num">${r.mem.toLocaleString()} MB</td></tr>`).join('')
    tbody.innerHTML = group('Apps', rows.filter((r) => r.app)) + group('Background processes', rows.filter((r) => !r.app))
    const total = rows.reduce((s, r) => s + r.cpu, 0)
    hist.push(total)
    if (hist.length > 60) hist.shift()
    $('.tm-sum', body).textContent = `Processes: ${rows.length} · CPU: ${total.toFixed(0)}% (yes, over 100) · Memory: ${(rows.reduce((s, r) => s + r.mem, 0) / 1024).toFixed(1)} GB`
    end.disabled = !sel
    $('.tm-uptime', body).textContent = `Up ${Math.floor(performance.now() / 60000)} min`
    if (!$('.tm-perf', body).hidden) perf(total)
  }
  function perf(total) {
    $('.tm-cpu-now', body).textContent = `${total.toFixed(0)}%`
    const c = $('.tm-graph', body)
    const g = c.getContext('2d')
    const w = c.width
    const h = c.height
    g.clearRect(0, 0, w, h)
    g.strokeStyle = 'rgba(17, 125, 187, .25)'
    for (let x = 0; x < w; x += 23) g.strokeRect(x, 0, 23, h)
    g.beginPath()
    hist.forEach((v, i) => {
      const x = w - (hist.length - 1 - i) * (w / 59)
      const y = h - Math.min(1, v / 200) * h
      i ? g.lineTo(x, y) : g.moveTo(x, y)
    })
    g.strokeStyle = '#117dbb'
    g.lineWidth = 2
    g.stroke()
    g.lineTo(w, h)
    g.lineTo(w - (hist.length - 1) * (w / 59), h)
    g.fillStyle = 'rgba(17, 125, 187, .15)'
    g.fill()
    $('.tm-stats', body).innerHTML = `<dt>Memory</dt><dd>15.9 of 16 GB (9.1 GB of it is tabs you forgot about)</dd><dt>GPU</dt><dd>64% (definitely_not_a_miner.exe)</dd><dt>Disk</dt><dd>100% (it's always 100%)</dd><dt>Uptime</dt><dd>${Math.floor(performance.now() / 60000)} min</dd><dt>Vibes</dt><dd>Immaculate</dd>`
  }
  function startup() {
    const items = [
      ['algo', 'TheAlgorithm.exe', 'Very high'],
      ['dog', 'CEO_Dog_Updater.exe', 'Woof'],
      ['brenda', 'Brenda_HR_Monitor.exe', 'Watching'],
      ['kevin', 'Kevin (Sales).exe', 'Unpredictable'],
      ['telemetry', 'TRANSLATR_Telemetry.exe', 'Medium-rare'],
    ]
    $('.tm-start tbody', body).innerHTML = items
      .map(([k, n, impact]) => `<tr><td>${esc(n)}</td><td>${impact}</td><td>${disabled.has(k) ? 'Disabled' : 'Enabled'}</td><td><button type="button" class="tm-small" data-startup="${k}">${disabled.has(k) ? 'Enable' : 'Disable'}</button></td></tr>`)
      .join('')
  }

  // ---------------- Ending things
  async function endTask(key) {
    const r = rows.find((x) => x.key === key)
    if (!r) return
    if (r.win) {
      os.closeWin(r.win)
      feat('tasksEnded', 1)
      return render()
    }
    switch (key) {
      case 'explorer':
        if (!(await os.askbox({ title: 'Task Manager', text: 'Ending explorer.exe takes the desktop and the taskbar with it. You can start it again from here (Run new task → explorer.exe).', icon: '⚠️', ok: 'End process' }))) return
        feat('explorerKilled')
        os.killExplorer()
        break
      case 'bloatos':
        if (!(await os.askbox({ title: 'Task Manager', text: 'Do you want to end the system process “bloatos.exe”? BloatOS will become unusable or shut down. (It’s the kernel. Please don’t.)', icon: '⛔', ok: 'Shut down' }))) return
        bsod(os)
        break
      case 'algo':
        algoLives++
        feat('algoKills', 1)
        os.msgbox('TheAlgorithm', algoLives > 3 ? 'TheAlgorithm can no longer be stopped. It has learned from this.' : 'TheAlgorithm has been ended.\n\n…\n\nTheAlgorithm has restarted, and it remembers what you did.', '🤖')
        break
      case 'kevin':
        os.msgbox('Kevin (Sales).exe', 'Kevin is in a meeting and can’t be ended right now. He’ll circle back after lunch.', '📈')
        break
      case 'brenda':
        feat('brendaTried')
        os.msgbox('Brenda_HR_Monitor.exe', 'Access denied. HR has been notified that you tried to end HR.', '🗂️')
        break
      case 'miner':
        os.msgbox('definitely_not_a_miner.exe', 'Process ended. You saved about $0.0003 of electricity. It will start again at midnight, for reasons.', '⛏️')
        break
      case 'dog':
        os.msgbox('CEO_Dog_Updater.exe', 'Woof. (The update has been postponed until you’re busy.)', '🐕')
        break
      case 'telemetry':
        os.msgbox('TRANSLATR_Telemetry.exe', 'Telemetry ended. Telemetry about you ending telemetry has been sent.', '📡')
        break
      case 'ghost':
        arg.reach(4)
        feat('ghostEnded')
        os.msgbox('ghost.exe', `y̷o̴u̵ ̸c̷a̵n̶’̸t̵ ̷e̵n̷d̸ ̸m̷e̸.\n\nbut you can visit. the casino on your phone knows me by a word.\n\nthe word is ${arg.FINAL_CODE}.`, '👻')
        break
    }
    render()
  }
  async function runTask() {
    const what = await os.askbox({ title: 'Create new task', text: 'Type the name of a program, and BloatOS will open it for you.', icon: '▶', ok: 'OK', input: { value: '', maxLength: 60, placeholder: 'explorer.exe' } })
    if (what == null) return
    const n = what.trim().toLowerCase()
    if (/^explorer(\.exe)?$/.test(n)) return os.restartExplorer()
    if (/^bloatos(\.exe)?$/.test(n)) return os.msgbox('Create new task', 'bloatos.exe is already running. Unfortunately.', '🪟')
    if (/^ghost(\.exe)?$/.test(n)) return os.msgbox('Create new task', arg.step() >= 3 ? 'It doesn’t come when it’s called. It comes at :X3.' : 'Windows cannot find “ghost.exe”. Yet.', '👻')
    if (/^(taskmgr|task manager)(\.exe)?$/.test(n)) return os.msgbox('Create new task', 'You’re looking at it.', '📊')
    if (os.openByName(n)) return
    os.msgbox('Create new task', `Windows cannot find “${what.trim()}”. Make sure you typed the name correctly, and then try again.`, '⛔')
  }

  body.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-key]')
    if (tr) {
      sel = tr.dataset.key
      render()
    }
    const t = e.target.closest('[data-tab]')
    if (t) {
      body.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('sel', b === t))
      $('.tm-proc', body).hidden = t.dataset.tab !== 'proc'
      $('.tm-perf', body).hidden = t.dataset.tab !== 'perf'
      $('.tm-startup', body).hidden = t.dataset.tab !== 'startup'
      end.hidden = t.dataset.tab !== 'proc'
      if (t.dataset.tab === 'startup') startup()
      render()
    }
    const s = e.target.closest('[data-startup]')?.dataset.startup
    if (s) {
      if (s === 'brenda') return os.msgbox('Startup', 'Brenda_HR_Monitor.exe is required by HR policy 7.3.1 and can’t be disabled.', '🗂️')
      if (s === 'algo' && !disabled.has('algo')) {
        disabled.add('algo')
        startup()
        return setTimeout(() => {
          disabled.delete('algo')
          startup()
        }, 1500)
      }
      disabled.has(s) ? disabled.delete(s) : disabled.add(s)
      startup()
    }
    if (e.target.closest('[data-tm="run"]')) runTask()
  })
  tbody.addEventListener('dblclick', (e) => {
    const tr = e.target.closest('tr[data-key]')
    if (tr?.dataset.key.startsWith('win:')) rows.find((r) => r.key === tr.dataset.key)?.win && os.focusWin(rows.find((r) => r.key === tr.dataset.key).win)
  })
  end.addEventListener('click', () => sel && endTask(sel))
  render()
  const timer = setInterval(render, 1000)
  return () => clearInterval(timer)
}

// ================= The blue screen =================
let bsodOn = false
/** Blue screen: "type the stop code to reboot faster", or wait for 100%. */
export function bsod(os) {
  if (bsodOn) return
  bsodOn = true
  feat('bsod', 1)
  const code = STOP_CODES[Math.floor(Math.random() * STOP_CODES.length)]
  const el = document.createElement('div')
  el.className = 'bsod'
  el.setAttribute('role', 'alertdialog')
  el.setAttribute('aria-label', 'Blue screen')
  el.innerHTML = `<div class="bsod-in">
    <p class="bsod-face">:(</p>
    <p>Your PC ran into a problem because you ended bloatos.exe. We’re just collecting some error info (and your browsing history), and then we’ll restart for you.</p>
    <p class="bsod-pct"><b>0</b>% complete</p>
    <div class="bsod-qr" aria-hidden="true"></div>
    <p class="bsod-small">For more information about this issue and possible fixes, don’t visit https://www.bloatos.example/stopcode</p>
    <p class="bsod-small">If you call a support person, give them this info:<br>Stop code: <b class="bsod-code">${code}</b></p>
    <form class="bsod-game"><label>⚡ Type the stop code to reboot faster: <input autocomplete="off" spellcheck="false" aria-label="Stop code"></label></form>
  </div>`
  // a QR-ish code (it goes nowhere)
  const qr = $('.bsod-qr', el)
  for (let i = 0; i < 81; i++) qr.append(Object.assign(document.createElement('i'), { className: Math.random() < 0.5 ? 'on' : '' }))
  document.body.append(el)
  const input = $('input', el)
  setTimeout(() => input.focus(), 50)
  let pct = 0
  const t0 = Date.now()
  const done = (fast) => {
    clearInterval(timer)
    if (fast) {
      feat('speedReboot')
      feat('bestReboot', Math.max(1, 60 - Math.round((Date.now() - t0) / 1000)), 'max')
    }
    $('.bsod-pct', el).innerHTML = fast ? '<b>100</b>% complete. Nice typing.' : '<b>100</b>% complete'
    setTimeout(() => {
      el.remove()
      bsodOn = false
      os.reboot()
    }, fast ? 500 : 900)
  }
  const timer = setInterval(() => {
    pct = Math.min(100, pct + Math.floor(rand(1, 6)))
    $('.bsod-pct b', el).textContent = pct
    if (pct >= 100) done(false)
  }, 450)
  $('.bsod-game', el).addEventListener('submit', (e) => {
    e.preventDefault()
    if (input.value.trim().toUpperCase().replace(/\s+/g, '_') === code) done(true)
    else {
      input.value = ''
      input.placeholder = 'Nope. Try again.'
    }
  })
}
