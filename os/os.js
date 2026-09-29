// nikstilOS: the nikstil.com homepage. A tiny desktop: double-click icons to open windows, drag
// them by the title bar, minimize them to the taskbar, switch between eight themes. No framework
// and no build step; window contents live in <template>s in index.html.
;(() => {
  'use strict'

  // The five TRANSLATR™ themes (same ids, so the game's choice carries over) plus three new ones.
  // `fonts` is a Google Fonts family query, loaded the first time the theme is used.
  const THEMES = [
    { id: 'aero', name: 'Aero', blurb: 'Glass, gloss and optimism (2009)', swatch: ['#1360b9', '#9fd6f5', '#7fcf55'], chrome: '#1a73c4', start: '' },
    { id: 'y2k', name: 'Y2K Cyber-Goth', blurb: 'Chrome, barbed wire, dial-up angst', swatch: ['#07070b', '#c9ced8', '#b6ff1a'], chrome: '#07070b', start: 'nikstil', fonts: 'Orbitron:wght@500;700;900&family=UnifrakturMaguntia' },
    { id: 'skeuo', name: 'Skeuomorphism', blurb: 'Leather, brushed metal, real fake stitching', swatch: ['#6b4327', '#d6d6d6', '#d4a93f'], chrome: '#5a3a22', start: 'Start' },
    { id: 'minimal', name: 'Minimalist', blurb: 'Nothing. Beautifully.', swatch: ['#ffffff', '#000000', '#ffffff'], chrome: '#ffffff', start: 'Start', fonts: 'Inter:wght@300;400;500;600' },
    { id: 'retro', name: 'Retro 95', blurb: 'Beige boxes, pixels, a 56k modem', swatch: ['#008080', '#cfc8b6', '#000080'], chrome: '#008080', start: 'Start', fonts: 'Pixelify+Sans:wght@400;600;700&family=Press+Start+2P' },
    { id: 'luna', name: 'Luna', blurb: 'A green start button and a very green hill (2001)', swatch: ['#245edb', '#3c9a3c', '#8cc2f5'], chrome: '#245edb', start: 'start', isNew: true },
    { id: 'aqua', name: 'Aqua', blurb: 'Pinstripes, gel and traffic lights (2002)', swatch: ['#1d63d3', '#ececec', '#ff5f57'], chrome: '#1d63d3', start: '', isNew: true },
    { id: 'vapor', name: 'Vaporwave', blurb: 'Ａ Ｅ Ｓ Ｔ Ｈ Ｅ Ｔ Ｉ Ｃ sunsets on a neon grid', swatch: ['#ff71ce', '#b967ff', '#01cdfe'], chrome: '#2b0f4f', start: 'スタート', fonts: 'VT323', isNew: true },
  ]
  const THEME_KEY = 'nikstilos-theme'
  const GAME_THEME_KEY = 'translatr-theme' // the game's pick, used until you choose one here
  const GAME_SAVE_KEY = 'translatr-save' // same site, so the homepage can read the game's save
  const BOOTED_KEY = 'nikstilos-booted'

  const APPS = {
    pc: { title: 'System Properties', icon: '💻', width: 420 },
    translatr: { title: 'TRANSLATR™ Ultra+ Pro Max', icon: '🌐', width: 460, init: initTranslatr },
    gif: { title: 'animation.gif - Image Viewer', icon: '🎞️', width: 540, init: initGif },
    readme: { title: 'readme.txt - Notepad', icon: '📄', width: 480 },
    themes: { title: 'Themes', icon: '🎨', width: 600, init: initThemes },
    bin: { title: 'Recycle Bin', icon: '🗑️', width: 460, init: initBin },
  }

  const $ = (sel, root = document) => root.querySelector(sel)
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const coarsePointer = matchMedia('(pointer: coarse)').matches
  const storage = {
    get: (k, s = localStorage) => {
      try {
        return s.getItem(k)
      } catch {
        return null
      }
    },
    set: (k, v, s = localStorage) => {
      try {
        s.setItem(k, v)
      } catch {
        // private mode: it just won't be remembered
      }
    },
  }
  const facts = (() => {
    try {
      return JSON.parse($('#game-facts').textContent)
    } catch {
      return { endings: 6, items: 27, achievements: 90, themes: 5 }
    }
  })()

  // ================= Themes =================
  const loadedFonts = new Set()
  function loadFonts(theme) {
    if (!theme.fonts || loadedFonts.has(theme.fonts)) return
    loadedFonts.add(theme.fonts)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${theme.fonts}&display=swap`
    document.head.append(link)
  }

  function applyTheme(id, save = true) {
    const theme = THEMES.find((t) => t.id === id) ?? THEMES[0]
    document.documentElement.dataset.theme = theme.id
    $('meta[name="theme-color"]').content = theme.chrome
    $('.start-label').textContent = theme.start
    loadFonts(theme)
    if (save) storage.set(THEME_KEY, theme.id)
    $$('[data-theme-pick]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themePick === theme.id)))
  }

  /** Switches theme with the game's circular reveal from `origin` (where the click was). */
  function switchTheme(id, origin) {
    if (!document.startViewTransition || reducedMotion()) return applyTheme(id)
    const x = origin?.x ?? 24
    const y = origin?.y ?? innerHeight - 22
    const transition = document.startViewTransition(() => applyTheme(id))
    transition.ready
      .then(() => {
        const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' },
        )
      })
      .catch(() => {})
  }
  const originOf = (e) => (e && e.clientX ? { x: e.clientX, y: e.clientY } : undefined)

  function themeButton(theme, className) {
    const b = document.createElement('button')
    b.className = className
    b.dataset.themePick = theme.id
    b.setAttribute('aria-pressed', 'false')
    b.innerHTML = `<span class="swatch" aria-hidden="true"></span><span class="theme-name"></span>`
    const sw = $('.swatch', b)
    theme.swatch.forEach((c) => {
      const i = document.createElement('i')
      i.style.background = c
      sw.append(i)
    })
    $('.theme-name', b).textContent = theme.name
    if (theme.isNew) {
      const tag = document.createElement('span')
      tag.className = 'new-tag'
      tag.textContent = 'NEW'
      b.append(tag)
    }
    b.addEventListener('click', (e) => {
      closeMenus()
      switchTheme(theme.id, originOf(e))
    })
    return b
  }

  // ================= Windows =================
  const layer = $('#windows')
  const taskList = $('#tasks')
  const open = new Map() // id -> window record
  let z = 10
  let cascade = 0
  let msgCount = 0

  const taskbarHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--taskbar-h')) || 44
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi))

  function makeWindow({ id, title, icon, width, content, onClose }) {
    const el = document.createElement('section')
    el.className = 'win'
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-label', title)
    el.tabIndex = -1
    el.innerHTML = `
      <header class="win-bar">
        <span class="win-icon" aria-hidden="true"></span>
        <h2 class="win-title"></h2>
        <div class="win-caps">
          <button class="cap cap-min" aria-label="Minimize" title="Minimize">_</button>
          <button class="cap cap-max" aria-label="Maximize" title="Maximize">□</button>
          <button class="cap cap-close" aria-label="Close" title="Close">✕</button>
        </div>
      </header>
      <div class="win-client"></div>`
    $('.win-icon', el).textContent = icon
    $('.win-title', el).textContent = title
    $('.win-client', el).append(content)

    // Where it opens: phones get the full width; elsewhere windows cascade from near the centre.
    const vw = innerWidth
    const vh = innerHeight - taskbarHeight()
    if (vw < 640) {
      el.style.left = '6px'
      el.style.top = '6px'
      el.style.width = `${vw - 12}px`
    } else {
      const w = Math.min(width, vw - 32)
      const n = cascade++ % 7
      el.style.width = `${w}px`
      el.style.left = `${clamp((vw - w) / 2 - 90 + n * 30, 8, vw - w - 8)}px`
      el.style.top = `${clamp(vh * 0.1 + n * 28, 8, vh - 180)}px`
    }

    const task = document.createElement('button')
    task.className = 'task'
    task.innerHTML = `<span class="task-icon" aria-hidden="true"></span><span class="task-label"></span>`
    $('.task-icon', task).textContent = icon
    $('.task-label', task).textContent = title
    task.title = title

    const win = { id, el, task, onClose }
    open.set(id, win)
    layer.append(el)
    taskList.append(task)
    if (!reducedMotion()) el.classList.add('win-in')

    el.addEventListener('pointerdown', () => focusWin(win))
    const bar = $('.win-bar', el)
    bar.addEventListener('pointerdown', (e) => startDrag(win, e))
    bar.addEventListener('dblclick', (e) => !e.target.closest('.win-caps') && toggleMax(win))
    $('.cap-min', el).addEventListener('click', () => minimize(win))
    $('.cap-max', el).addEventListener('click', () => toggleMax(win))
    $('.cap-close', el).addEventListener('click', () => closeWin(win))
    task.addEventListener('click', () => {
      if (el.hidden) {
        el.hidden = false
        focusWin(win)
      } else if (el.classList.contains('is-active')) minimize(win)
      else focusWin(win)
    })

    focusWin(win)
    return win
  }

  function focusWin(win) {
    if (win.el.hidden) return
    z += 1
    win.el.style.zIndex = z
    for (const w of open.values()) {
      const on = w === win
      w.el.classList.toggle('is-active', on)
      w.task.classList.toggle('is-active', on)
    }
    if (!win.el.contains(document.activeElement)) win.el.focus({ preventScroll: true })
  }
  /** Activates the top-most visible window (after one closes or minimizes). */
  function focusTop() {
    const visible = [...open.values()].filter((w) => !w.el.hidden).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)
    if (visible[0]) focusWin(visible[0])
    else for (const w of open.values()) w.task.classList.remove('is-active')
  }
  function minimize(win) {
    win.el.hidden = true
    win.el.classList.remove('is-active')
    win.task.classList.remove('is-active')
    win.task.classList.add('is-min')
    focusTop()
  }
  function toggleMax(win) {
    const max = win.el.classList.toggle('is-max')
    $('.cap-max', win.el).textContent = max ? '❐' : '□'
    $('.cap-max', win.el).setAttribute('aria-label', max ? 'Restore' : 'Maximize')
  }
  function closeWin(win) {
    win.el.remove()
    win.task.remove()
    open.delete(win.id)
    win.onClose?.()
    focusTop()
  }

  /** Title-bar drag. Keeps enough of the window on screen to grab it again. */
  function startDrag(win, e) {
    if (e.button !== 0 || e.target.closest('.win-caps') || win.el.classList.contains('is-max')) return
    const bar = e.currentTarget
    const r = win.el.getBoundingClientRect()
    const dx = e.clientX - r.left
    const dy = e.clientY - r.top
    bar.setPointerCapture(e.pointerId)
    win.el.classList.add('is-dragging')
    const move = (ev) => {
      win.el.style.left = `${clamp(ev.clientX - dx, 90 - r.width, innerWidth - 90)}px`
      win.el.style.top = `${clamp(ev.clientY - dy, 0, innerHeight - taskbarHeight() - 34)}px`
    }
    const up = () => {
      win.el.classList.remove('is-dragging')
      bar.removeEventListener('pointermove', move)
      bar.removeEventListener('pointerup', up)
      bar.removeEventListener('pointercancel', up)
    }
    bar.addEventListener('pointermove', move)
    bar.addEventListener('pointerup', up)
    bar.addEventListener('pointercancel', up)
  }

  function openApp(id) {
    const app = APPS[id]
    if (!app) return
    const existing = open.get(id)
    if (existing) {
      existing.el.hidden = false
      existing.task.classList.remove('is-min')
      focusWin(existing)
      return
    }
    const content = document.getElementById(`app-${id}`).content.cloneNode(true)
    const win = makeWindow({ id, title: app.title, icon: app.icon, width: app.width, content })
    app.init?.(win.el, win)
  }

  /** A message box: one line of text and an OK button. */
  function msgbox(title, text, icon = 'ℹ️') {
    const content = document.createDocumentFragment()
    const body = document.createElement('div')
    body.className = 'win-body msg'
    body.innerHTML = `<span class="msg-icon" aria-hidden="true"></span><p></p>`
    $('.msg-icon', body).textContent = icon
    $('p', body).textContent = text
    const foot = document.createElement('div')
    foot.className = 'win-foot'
    foot.innerHTML = `<button class="btn btn-primary">OK</button>`
    content.append(body, foot)
    const win = makeWindow({ id: `msg-${++msgCount}`, title, icon, width: 360, content })
    win.el.classList.add('is-msg')
    const ok = $('.btn', win.el)
    ok.addEventListener('click', () => closeWin(win))
    ok.focus()
  }

  // ================= Apps =================
  function money(n) {
    const a = Math.abs(n)
    const big = ['Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']
    if (a >= 1e15) {
      const tier = Math.min(big.length - 1, Math.floor(Math.log10(a) / 3) - 5)
      return `$${Number((n / 10 ** (15 + 3 * tier)).toFixed(2))}${big[tier]}`
    }
    return `$${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(n)}`
  }

  function readGameSave() {
    try {
      const state = JSON.parse(storage.get(GAME_SAVE_KEY))?.state
      return state && typeof state.money === 'number' ? state : null
    } catch {
      return null
    }
  }

  function initTranslatr(el) {
    $('.f-endings', el).textContent = facts.endings
    $('.f-items', el).textContent = facts.items
    $('.f-achievements', el).textContent = facts.achievements
    const save = readGameSave()
    const line = $('.tr-save', el)
    if (!save) {
      line.textContent = 'No save on this device yet. Your wallet is empty and full of potential.'
      return
    }
    const endings = Object.keys(save.endings ?? {}).length
    const trophies = Object.keys(save.achievements ?? {}).length
    line.innerHTML = 'Your save on this device: <b></b>'
    $('b', line).textContent = `${money(save.money)} · Prestige ${save.prestige ?? 0} · ${endings}/${facts.endings} endings · ${trophies}/${facts.achievements} achievements`
    $('.tr-launch', el).textContent = '▶ Continue'
  }

  function initGif(el) {
    const img = $('.gif-img', el)
    const frames = ['/animation.gif', '/true.gif']
    let on = 0
    new Image().src = frames[1] // preloaded, so the toggle is instant
    $('.gif-frame', el).addEventListener('click', () => {
      on = 1 - on
      img.src = frames[on]
      $('.status', el).textContent = `${frames[on].slice(1)} · click it`
    })
    img.addEventListener('error', () => {
      $('.gif-frame', el).hidden = true
      $('.gif-missing', el).hidden = false
    })
  }

  function initThemes(el) {
    const grid = $('#theme-grid', el)
    for (const t of THEMES) {
      const card = themeButton(t, 'theme-card')
      const blurb = document.createElement('span')
      blurb.className = 'theme-blurb'
      blurb.textContent = t.blurb
      card.append(blurb)
      grid.append(card)
    }
    applyTheme(document.documentElement.dataset.theme, false) // mark the current one
  }

  const BIN_JOKES = {
    old: ['old_homepage.html', 'Restore “Pick one.”? No. It’s in a better place now.', '📄'],
    motivation: ['motivation.exe', 'motivation.exe has stopped working. It never really started.', '⚠️'],
    sleep: ['sleep_schedule.pdf', 'This file is corrupted beyond repair. Have you tried going to bed?', '⚠️'],
    refund: ['TRANSLATR_refund_policy.txt', 'The file is empty. It was always empty.', '🧾'],
    ideas: ['ending_ideas_v7_FINAL(2).docx', 'Already used. There are six endings now. Go find them.', '💡'],
  }
  function initBin(el) {
    for (const file of $$('.bin-file', el)) {
      const [title, text, icon] = BIN_JOKES[file.dataset.joke]
      file.addEventListener('dblclick', () => msgbox(title, text, icon))
      file.addEventListener('click', (e) => {
        $$('.bin-file', el).forEach((f) => f.classList.toggle('is-selected', f === file))
        if (coarsePointer || e.detail === 0) msgbox(title, text, icon) // tap, or Enter
      })
    }
    $('.bin-empty', el).addEventListener('click', () => msgbox('Recycle Bin', 'Access denied: these files have unionised.', '⛔'))
  }

  // ================= Desktop =================
  const desktop = $('#desktop')
  for (const icon of $$('.desk-icon')) {
    icon.addEventListener('click', (e) => {
      $$('.desk-icon').forEach((i) => i.classList.toggle('is-selected', i === icon))
      // Double-click on a mouse; a tap on touch screens; Enter/Space from the keyboard.
      if (coarsePointer || e.detail === 0) openApp(icon.dataset.app)
    })
    icon.addEventListener('dblclick', () => openApp(icon.dataset.app))
  }
  desktop.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.desk-icon')) $$('.desk-icon').forEach((i) => i.classList.remove('is-selected'))
  })

  // ================= Menus =================
  const startBtn = $('#start-btn')
  const startMenu = $('#start-menu')
  const ctxMenu = $('#ctx-menu')
  function closeMenus() {
    startMenu.hidden = true
    ctxMenu.hidden = true
    startBtn.setAttribute('aria-expanded', 'false')
  }
  startBtn.addEventListener('click', () => {
    const show = startMenu.hidden
    closeMenus()
    startMenu.hidden = !show
    startBtn.setAttribute('aria-expanded', String(show))
    if (show) $('.sm-item', startMenu).focus()
  })
  for (const t of THEMES) {
    const li = document.createElement('li')
    li.append(themeButton(t, 'sm-theme'))
    $('#sm-themes').append(li)
  }
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-app]')
    if (opener && (opener.closest('.start-menu') || opener.closest('.ctx-menu'))) {
      closeMenus()
      openApp(opener.dataset.app)
      return
    }
    if (!e.target.closest('.start-menu, .start-btn, .ctx-menu')) closeMenus()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (!startMenu.hidden || !ctxMenu.hidden) return closeMenus()
    const active = [...open.values()].find((w) => w.el.classList.contains('is-active'))
    if (active?.el.classList.contains('is-msg')) closeWin(active)
  })

  desktop.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.desk-icon')) return
    e.preventDefault()
    closeMenus()
    ctxMenu.hidden = false
    const r = ctxMenu.getBoundingClientRect()
    ctxMenu.style.left = `${Math.min(e.clientX, innerWidth - r.width - 4)}px`
    ctxMenu.style.top = `${Math.min(e.clientY, innerHeight - r.height - 4)}px`
  })
  ctxMenu.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action
    if (!action) return
    closeMenus()
    if (action === 'folder') msgbox('New folder', 'Creating folders requires nikstilOS Pro. Upgrade for $4.99/month. (Kidding. There is no Pro.)', '📁')
    if (action === 'refresh') {
      desktop.classList.remove('is-refreshing')
      void desktop.offsetWidth
      desktop.classList.add('is-refreshing')
    }
  })

  // ================= Taskbar =================
  const clock = $('#clock')
  function tick() {
    const now = new Date()
    clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    clock.dateTime = now.toISOString()
    clock.title = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }
  tick()
  setInterval(tick, 15_000)

  // Show desktop: minimizes everything; a second click brings the same windows back.
  let peeked = []
  $('#show-desktop').addEventListener('click', () => {
    const visible = [...open.values()].filter((w) => !w.el.hidden)
    if (visible.length) {
      peeked = visible
      visible.forEach(minimize)
    } else {
      peeked.filter((w) => open.has(w.id)).forEach((w) => {
        w.el.hidden = false
        w.task.classList.remove('is-min')
        focusWin(w)
      })
      peeked = []
    }
  })

  // ================= Boot & shut down =================
  const boot = $('#boot')
  function runBoot(then) {
    const root = document.documentElement
    if (root.classList.contains('booted')) return then()
    let done = false
    const finish = () => {
      if (done) return
      done = true
      root.classList.add('booted')
      storage.set(BOOTED_KEY, '1', sessionStorage)
      then()
    }
    boot.addEventListener('click', finish, { once: true })
    document.addEventListener('keydown', finish, { once: true })
    setTimeout(finish, 1800)
  }

  const shutdown = $('#shutdown')
  $('#shutdown-btn').addEventListener('click', () => {
    closeMenus()
    shutdown.hidden = false
    shutdown.classList.remove('is-safe')
    setTimeout(() => shutdown.classList.add('is-safe'), reducedMotion() ? 0 : 1400)
  })
  shutdown.addEventListener('click', () => {
    if (!shutdown.classList.contains('is-safe')) return
    for (const w of [...open.values()]) closeWin(w)
    shutdown.hidden = true
    document.documentElement.classList.remove('booted')
    runBoot(() => {})
  })

  // ================= Start =================
  const saved = storage.get(THEME_KEY) || storage.get(GAME_THEME_KEY)
  applyTheme(THEMES.some((t) => t.id === saved) ? saved : 'aero', false)
  runBoot(() => {
    // nikstil.com/#translatr opens that window straight away (handy for links).
    const deep = location.hash.slice(1)
    if (APPS[deep]) openApp(deep)
  })
})()
