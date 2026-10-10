// The printer. It prints one thing: a receipt of everything you've done on the site (hours wasted,
// credits lost, ads endured…). It jams. It always jams the first time. Pull the paper out (drag it,
// it fights back) or turn it off and on again (it says PC LOAD LETTER, then works). The receipt can
// be saved as a picture.

import { feat, feats } from './feats.js'

const $ = (s, el = document) => el.querySelector(s)
const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k))
  } catch {
    return null
  }
}
const n = (v) => (typeof v === 'number' && isFinite(v) ? v : 0)
const int = (v) => Math.round(n(v)).toLocaleString('en-US')
const dur = (s) => {
  s = Math.round(n(s))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m ${s % 60}s`
}

/** The receipt's lines: [label, value] (a string on its own is a heading). */
export async function receiptLines() {
  const f = feats()
  const tr = read('translatr-save')?.state ?? {}
  const rec = read('strife-record') ?? {}
  const inv = read('strife-inventory') ?? {}
  const sink = read('skinsink-stats') ?? {}
  const loggle = read('loggle-save')?.stats ?? {}
  const kevin = read('kevin-gotchi')
  const plant = read('nikstilos-plant') ?? {}
  let ach = { n: 0, pts: 0 }
  try {
    const m = await import('/achievements/list.js')
    const all = m.evaluate()
    ach = { n: all.filter((a) => a.done).length, pts: all.filter((a) => a.done).reduce((s, a) => s + a.points, 0) }
  } catch {}
  const net = n(sink.won) - n(sink.wagered)
  return [
    'BLOATOS',
    ['Time on this desktop', dur(read('nikstilos-uptime'))],
    ['Blue screens caused', int(f.bsod)],
    ['TheAlgorithm ended', int(f.algoKills)],
    ['Times explorer.exe died', f.explorerKilled ? 'at least once' : '0'],
    ['Windows thrown', int(f.thrown)],
    'TRANSLATR™',
    ['Clicks', int(tr.stats?.clicks)],
    ['Ads closed', int(tr.stats?.adsClosed)],
    ['Endings found', int(Object.keys(tr.endings ?? {}).length)],
    'COUNTER-STRIFE',
    ['Kills / deaths', `${int(rec.kills)} / ${int(rec.deaths)}`],
    ['Matches won', int(rec.wins)],
    ['Credits on hand', int(inv.credits)],
    ['Money spent on credits', `$${n(read('strife-pretend-spent')).toFixed(2)}`],
    'SKINSINK.GG',
    ['Bet', `ⓒ ${int(sink.wagered)}`],
    [net >= 0 ? 'Up' : 'Down', `ⓒ ${int(Math.abs(net))}`],
    'MISC.',
    ['LOGGLE best streak', int(loggle.best)],
    ['Desk plant', plant.born ? `${int(plant.days?.length)} days watered` : 'not planted'],
    ['Zombies bonked', int(f.zombiesBonked)],
    ['Icons eaten', int(f.iconsEaten)],
    ['Kevin', kevin ? `${kevin.title ?? 'Intern'}${kevin.gen > 1 ? ` (#${kevin.gen})` : ''}` : 'not hired'],
    ['Paper planes thrown', int(f.planes)],
    ['Achievements', `${ach.n} (${ach.pts}G)`],
  ]
}

function receiptHtml(lines, no) {
  const d = new Date()
  const rows = lines
    .map((l) => (typeof l === 'string' ? `<div class="rc-head">${l}</div>` : `<div class="rc-row"><span>${l[0]}</span><i></i><b>${l[1]}</b></div>`))
    .join('')
  return `<div class="rc-top">BLOATOS PRINT SERVICES<br><small>${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · RECEIPT #${String(no).padStart(5, '0')}</small></div>${rows}
    <div class="rc-total"><span>TOTAL TIME WASTED</span><b>${dur(read('nikstilos-uptime'))}</b></div>
    <div class="rc-bar" aria-hidden="true"></div>
    <div class="rc-foot">THANK YOU FOR YOUR PATRONAGE<br>NO REFUNDS · NO REGRETS (SOME REGRETS)</div>`
}
/** The receipt as a PNG (a data URL). */
function receiptPng(lines, no) {
  const W = 380
  const lh = 20
  const H = 130 + lines.length * lh + 110
  const c = document.createElement('canvas')
  c.width = W * 2
  c.height = H * 2
  const g = c.getContext('2d')
  g.scale(2, 2)
  g.fillStyle = '#fdfcf6'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#222'
  g.textAlign = 'center'
  g.font = 'bold 16px "Courier New", monospace'
  g.fillText('BLOATOS PRINT SERVICES', W / 2, 34)
  g.font = '12px "Courier New", monospace'
  const d = new Date()
  g.fillText(`${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · RECEIPT #${String(no).padStart(5, '0')}`, W / 2, 54)
  let y = 90
  g.font = '13px "Courier New", monospace'
  for (const l of lines) {
    if (typeof l === 'string') {
      g.textAlign = 'center'
      g.font = 'bold 13px "Courier New", monospace'
      g.fillText(`— ${l} —`, W / 2, y)
      g.font = '13px "Courier New", monospace'
    } else {
      g.textAlign = 'left'
      g.fillText(l[0], 20, y)
      g.textAlign = 'right'
      g.fillText(String(l[1]), W - 20, y)
    }
    y += lh
  }
  g.textAlign = 'left'
  g.font = 'bold 14px "Courier New", monospace'
  g.fillText('TOTAL TIME WASTED', 20, y + 14)
  g.textAlign = 'right'
  g.fillText(dur(read('nikstilos-uptime')), W - 20, y + 14)
  for (let x = 40; x < W - 40; x += 3) if (Math.random() < 0.6) g.fillRect(x, y + 30, Math.random() < 0.3 ? 2 : 1, 34)
  g.textAlign = 'center'
  g.font = '11px "Courier New", monospace'
  g.fillText('THANK YOU FOR YOUR PATRONAGE', W / 2, y + 84)
  g.fillText('NO REFUNDS · NO REGRETS (SOME REGRETS)', W / 2, y + 100)
  return c.toDataURL('image/png')
}

export function initPrinter(el, win, os) {
  const body = $('.printer', el)
  body.innerHTML = `
    <div class="pr-device" aria-hidden="true"><div class="pr-top"></div><div class="pr-lcd"></div><i class="pr-light"></i><div class="pr-slot"><div class="pr-sheet"></div></div></div>
    <div class="pr-actions"><button type="button" class="pr-btn pr-print">🖨️ Print my stats</button></div>
    <div class="pr-jam" hidden>
      <p><b>Paper jam in tray 2.</b> Pull the paper out (drag the sheet down), or turn it off and on again.</p>
      <div class="pr-pull"><div class="pr-tab" tabindex="0" role="slider" aria-label="Jammed paper: drag it down" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0">📄</div></div>
      <button type="button" class="pr-btn pr-power">🔌 Turn it off and on again</button>
    </div>
    <div class="pr-out" hidden><div class="pr-receipt"></div><div class="pr-actions"><a class="pr-btn pr-save" download="bloatos-receipt.png">💾 Save as image</a><button type="button" class="pr-btn pr-again">🖨️ Print again</button></div></div>`
  const lcd = $('.pr-lcd', body)
  const light = $('.pr-light', body)
  const jam = $('.pr-jam', body)
  const out = $('.pr-out', body)
  const say = (t, state = '') => {
    lcd.textContent = t
    light.className = `pr-light ${state}`
  }
  say('READY')
  let prints = 0
  let power = 0
  let pulls = 0

  async function print() {
    $('.pr-print', body).disabled = true
    out.hidden = true
    jam.hidden = true
    body.classList.add('feeding')
    say('PRINTING…', 'busy')
    await wait(1600)
    // the first print always jams; after that, three times in four
    if (prints === 0 || Math.random() < 0.75) {
      body.classList.remove('feeding')
      body.classList.add('jammed')
      say('PAPER JAM · TRAY 2', 'err')
      feat('jams', 1)
      jam.hidden = false
      pulls = 0
      power = 0
      setPull(0)
      return
    }
    deliver()
  }
  async function deliver() {
    body.classList.remove('jammed', 'feeding')
    jam.hidden = true
    say('PRINTING…', 'busy')
    const lines = await receiptLines()
    prints++
    feat('printed', 1)
    const receipt = $('.pr-receipt', body)
    receipt.innerHTML = receiptHtml(lines, prints + 41)
    out.hidden = false
    receipt.classList.remove('rolling')
    void receipt.offsetWidth
    receipt.classList.add('rolling')
    $('.pr-save', body).href = receiptPng(lines, prints + 41)
    say('DONE. TAKE YOUR RECEIPT.', 'ok')
    $('.pr-print', body).disabled = false
  }
  // ---- pulling the paper: three tugs, each a good drag down (it snags in between)
  const tab = $('.pr-tab', body)
  const setPull = (k) => {
    tab.style.transform = `translateY(${k * 22}px) rotate(${k % 2 ? 4 : -3}deg)`
    tab.setAttribute('aria-valuenow', String(k))
  }
  const SNAGS = ['It moved a bit.', 'It tore slightly. Keep going.', 'Got it! (Most of it.)']
  tab.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    tab.setPointerCapture(e.pointerId)
    const y0 = e.clientY
    const move = (ev) => {
      const dy = ev.clientY - y0
      tab.style.transform = `translateY(${pulls * 22 + Math.max(0, Math.min(40, dy * 0.4))}px)`
      if (dy > 70) {
        tab.removeEventListener('pointermove', move)
        tug()
      }
    }
    tab.addEventListener('pointermove', move)
    tab.addEventListener('pointerup', () => (tab.removeEventListener('pointermove', move), setPull(pulls)), { once: true })
  })
  tab.addEventListener('keydown', (e) => (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tug()))
  function tug() {
    pulls++
    setPull(pulls)
    say(SNAGS[Math.min(pulls - 1, 2)].toUpperCase(), pulls >= 3 ? 'ok' : 'err')
    if (pulls >= 3) {
      feat('unjammed', 1)
      setTimeout(deliver, 600)
    }
  }
  $('.pr-power', body).addEventListener('click', async () => {
    power++
    say('…', '')
    await wait(700)
    if (power === 1) return say('PC LOAD LETTER', 'err')
    feat('unjammed', 1)
    deliver()
  })
  $('.pr-print', body).addEventListener('click', print)
  $('.pr-again', body).addEventListener('click', print)
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
