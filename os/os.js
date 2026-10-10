// nikstilOS: the nikstil.com homepage. A tiny desktop: double-click icons to open windows, drag
// them by the title bar, minimize them to the taskbar, switch between ten themes (and one more you unlock). No framework
// and no build step; window contents live in <template>s in index.html, and /site.json (edited on
// the admin page, /nikstil/) overrides the text in them.
;(() => {
  'use strict'

  // The same ten themes as TRANSLATR™ (same ids, so the game's choice carries over), in the same
  // order: the era each one comes from. `fonts` is a Google Fonts family query, loaded the first
  // time the theme is used.
  const THEMES = [
    { id: 'retro', name: 'Retro 95', blurb: 'Beige boxes, pixels, a 56k modem (1995)', swatch: ['#008080', '#cfc8b6', '#000080'], chrome: '#008080', start: 'Start', fonts: 'Pixelify+Sans:wght@400;600;700&family=Press+Start+2P' },
    { id: 'y2k', name: 'Y2K Cyber-Goth', blurb: 'Chrome, barbed wire, dial-up angst (1999)', swatch: ['#07070b', '#c9ced8', '#b6ff1a'], chrome: '#07070b', start: 'nikstil', fonts: 'Orbitron:wght@500;700;900&family=UnifrakturMaguntia' },
    { id: 'luna', name: 'Luna', blurb: 'A green start button and a very green hill (2001)', swatch: ['#245edb', '#3c9a3c', '#8cc2f5'], chrome: '#245edb', start: 'start' },
    { id: 'aqua', name: 'Aqua', blurb: 'Pinstripes, gel and traffic lights (2002)', swatch: ['#1d63d3', '#ececec', '#ff5f57'], chrome: '#1d63d3', start: '' },
    { id: 'aero', name: 'Aero', blurb: 'Glass, gloss and optimism (2009)', swatch: ['#1360b9', '#9fd6f5', '#7fcf55'], chrome: '#1a73c4', start: '' },
    { id: 'skeuo', name: 'Skeuomorphism', blurb: 'Leather, brushed metal, real fake stitching (2010)', swatch: ['#6b4327', '#d6d6d6', '#d4a93f'], chrome: '#5a3a22', start: 'Start' },
    { id: 'metro', name: 'Metro', blurb: 'Flat tiles, loud colours, no Start button (2012)', swatch: ['#5133ab', '#2d89ef', '#00a300'], chrome: '#2b1361', start: 'Start' },
    { id: 'minimal', name: 'Minimalist', blurb: 'Nothing. Beautifully. (2013)', swatch: ['#ffffff', '#000000', '#ffffff'], chrome: '#ffffff', start: 'Start', fonts: 'Inter:wght@300;400;500;600' },
    { id: 'vapor', name: 'Vaporwave', blurb: 'Ａ Ｅ Ｓ Ｔ Ｈ Ｅ Ｔ Ｉ Ｃ sunsets on a neon grid (199X, forever)', swatch: ['#ff71ce', '#b967ff', '#01cdfe'], chrome: '#2b0f4f', start: 'スタート', fonts: 'VT323' },
    { id: 'glass', name: 'Liquid Glass', blurb: 'Every surface is a lens now (2025)', swatch: ['#7fe3ff', '#ffffff', '#ff9ad5'], chrome: '#5b7cff', start: '' },
    // unlocked with achievement points (Achievements → Rewards; see /achievements/rewards.js)
    { id: 'terminal', name: 'Terminal', blurb: 'Green on black, like a hacker in a film (1999, in films)', swatch: ['#050a05', '#33ff66', '#0f3d1a'], chrome: '#050a05', start: 'C:\\>', fonts: 'IBM+Plex+Mono:wght@400;500;600', reward: 'r-theme-terminal', at: 200 },
  ]
  // Every theme has its own icons (like the game re-skins its emoji). Keys match APPS, plus the
  // Start menu's user picture.
  const ICONS = {
    aero: { pc: '💻', translatr: '🌐', gif: '🎞️', themes: '🎨', bin: '🗑️', avatar: '🙂', leaderboard: '🏆', messenger: '💬', account: '👤', doom: '👹', grass: '🌱', phone: '🧠', loggle: '🟩', browser: '🧭', mobile: '📱', strife: '💣', achievements: '🎖️', files: '📁', terminal: '⌨️', casino: '🎰' },
    y2k: { pc: '💾', translatr: '🕸️', gif: '📀', themes: '🔮', bin: '⚰️', avatar: '💀', leaderboard: '🏁', messenger: '📟', account: '🕶️', doom: '💀', grass: '🌵', phone: '🧟', loggle: '🔠', browser: '📡', mobile: '📲', strife: '🧨', achievements: '🏅', files: '🗂️', terminal: '📟', casino: '🎲' },
    skeuo: { pc: '🖥️', translatr: '📖', gif: '📽️', themes: '🧵', bin: '🪣', avatar: '😊', leaderboard: '🏅', messenger: '✉️', account: '🪪', doom: '🪓', grass: '🪴', phone: '🧠', loggle: '🧩', browser: '🧭', mobile: '📱', strife: '💣', achievements: '🎖️', files: '🗄️', terminal: '⌨️', casino: '🎰' },
    minimal: { pc: '⎕', translatr: '◍', gif: '▷', themes: '◧', bin: '⌫', avatar: '☺', leaderboard: '№', messenger: '✉︎', account: '◯', doom: '✜', grass: '❦', phone: '◉', loggle: '▦', browser: '⌕', mobile: '▯', strife: '✷', achievements: '✪', files: '▤', terminal: '>_', casino: '◈' },
    retro: { pc: '📺', translatr: '🗺️', gif: '📼', themes: '🖼️', bin: '🚮', avatar: '👾', leaderboard: '🕹️', messenger: '📠', account: '👤', doom: '💥', grass: '🌿', phone: '🧟', loggle: '🔤', browser: '🌐', mobile: '☎️', strife: '🎯', achievements: '🏆', files: '📂', terminal: '🖥️', casino: '🎰' },
    luna: { pc: '🖥️', translatr: '🌍', gif: '🖼️', themes: '🖌️', bin: '♻️', avatar: '🦋', leaderboard: '🥇', messenger: '🗨️', account: '🙋', doom: '👿', grass: '🌻', phone: '🧠', loggle: '🟩', browser: '🌐', mobile: '📱', strife: '💣', achievements: '🎖️', files: '📁', terminal: '⌨️', casino: '🎰' },
    aqua: { pc: '💽', translatr: '🧭', gif: '🎬', themes: '🖍️', bin: '🧺', avatar: '🌸', leaderboard: '🏅', messenger: '💭', account: '🧑', doom: '🎯', grass: '🌷', phone: '🧠', loggle: '🟢', browser: '🌐', mobile: '📱', strife: '💣', achievements: '🏅', files: '🗂️', terminal: '⌨️', casino: '🎲' },
    metro: { pc: '🖥️', translatr: '🔤', gif: '🎞️', themes: '🎨', bin: '🗑️', avatar: '🙂', leaderboard: '🏆', messenger: '💬', account: '👤', doom: '🎮', grass: '🌱', phone: '🧟', loggle: '🟩', browser: '🌐', mobile: '📱', strife: '🎯', achievements: '🎖️', files: '📁', terminal: '⌨️', casino: '🎰' },
    glass: { pc: '💻', translatr: '🫧', gif: '🌈', themes: '🪩', bin: '🗑️', avatar: '🙂', leaderboard: '🏆', messenger: '💬', account: '👤', doom: '👾', grass: '🍀', phone: '🧠', loggle: '🟩', browser: '🧭', mobile: '📱', strife: '💣', achievements: '🎖️', files: '📁', terminal: '⌨️', casino: '🎰' },
    vapor: { pc: '🗿', translatr: '🐬', gif: '📺', themes: '🌴', bin: '🥤', avatar: '😎', leaderboard: '💎', messenger: '📞', account: '🪩', doom: '🔥', grass: '🌴', phone: '🧟', loggle: '🅻', browser: '🌐', mobile: '📲', strife: '🧨', achievements: '💿', files: '📼', terminal: '💾', casino: '💸' },
  }
  ICONS.terminal = { ...ICONS.minimal }
  const iconFor = (key) => ICONS[document.documentElement.dataset.theme]?.[key] ?? ICONS.aero[key] ?? key
  const THEME_KEY = 'nikstilos-theme'
  // ================= Rewards (claimed with achievement points on the hub) =================
  // The same ids as /achievements/rewards.js, which keeps what's claimed under this key.
  const REWARDS_KEY = 'nikstil-rewards'
  const WALLPAPER_KEY = 'nikstilos-wallpaper'
  const WALLPAPERS = [
    { id: 'dust', name: 'Dust II', reward: 'r-wall-dust', at: 50 },
    { id: 'lawn', name: 'Front Lawn', reward: 'r-wall-lawn', at: 150 },
    { id: 'grid', name: 'Midnight Grid', reward: 'r-wall-grid', at: 400 },
    { id: 'elite', name: 'The Global Elite', reward: 'r-wall-elite', at: 750 },
  ]
  const claimedReward = (id) => {
    try {
      return !!JSON.parse(localStorage.getItem(REWARDS_KEY))?.claimed?.[id]
    } catch {
      return false
    }
  }
  const isLocked = (thing) => !!thing?.reward && !claimedReward(thing.reward)
  const lockedNote = (name, at) => `${name} unlocks at ${at} achievement points. Claim it in Achievements → Rewards.`
  const GAME_THEME_KEY = 'translatr-theme' // the game's pick, used until you choose one here
  const GAME_SAVE_KEY = 'translatr-save' // same site, so the homepage can read the game's save
  const BOOTED_KEY = 'nikstilos-booted'
  // nikstil.com/?embed=messenger: just that app, filling the page (TRANSLATR™'s Messenger bubble).
  const embedApp = new URLSearchParams(location.search).get('embed')

  const APPS = {
    pc: { title: 'System Properties', icon: 'pc', width: 420, init: initPc },
    translatr: { title: 'TRANSLATR™ Ultra+ Pro Max', icon: 'translatr', width: 460, init: initTranslatr },
    gif: { title: 'animation.gif - Image Viewer', icon: 'gif', width: 540, init: initGif },
    themes: { title: 'Themes', icon: 'themes', width: 600, init: initThemes },
    bin: { title: 'Recycle Bin', icon: 'bin', width: 460, init: initBin },
    doom: { title: 'DOOMSCROLL.EXE', icon: 'doom', width: 700, init: initDoom },
    grass: { title: 'LAWN OF THE DEAD', icon: 'grass', width: 760, init: initGrass },
    phone: { title: 'BRAINS FIRST', icon: 'phone', width: 760, init: initPhone },
    loggle: { title: 'LOGGLE', icon: 'loggle', width: 480, init: initLoggle },
    browser: { title: 'BobbyBrowser', icon: 'browser', width: 900, init: initBrowser },
    mobile: { title: 'LigmaPhone', icon: 'mobile', width: 400, init: initMobile },
    strife: { title: 'COUNTER-STRIFE', icon: 'strife', width: 900, init: initStrife },
    casino: { title: 'SKINSINK.GG', icon: 'casino', width: 760, init: initCasino },
    achievements: { title: 'Achievements', icon: 'achievements', width: 820, init: initAchievements },
    files: { title: 'File Explorer', icon: 'files', width: 780, init: initFiles },
    terminal: { title: 'Command Prompt', icon: 'terminal', width: 680, init: initTerminal },
    // Online apps (os/online-apps.js): only shown once the site's online features are switched on.
    leaderboard: { title: 'Leaderboards', icon: 'leaderboard', width: 560, init: (el, win) => online?.init('leaderboard', el, win) },
    messenger: { title: 'nikstil Messenger', icon: 'messenger', width: 700, init: (el, win) => online?.init('messenger', el, win) },
    account: { title: 'Account', icon: 'account', width: 400, init: (el, win) => online?.init('account', el, win) },
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
      return { endings: 8, items: 27, achievements: 102, themes: 8 }
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
    let theme = THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === 'aero')
    if (isLocked(theme)) theme = THEMES.find((t) => t.id === 'aero')
    document.documentElement.dataset.theme = theme.id
    $('meta[name="theme-color"]').content = theme.chrome
    $('.start-label').textContent = theme.start
    loadFonts(theme)
    $$('[data-icon]').forEach((el) => (el.textContent = iconFor(el.dataset.icon)))
    document.documentElement.classList.add('icons-ready')
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
    markLock(b, theme)
    b.addEventListener('click', (e) => {
      closeMenus()
      if (isLocked(theme)) return msgbox('Themes', lockedNote(`The ${theme.name} theme`, theme.at), '🔒')
      switchTheme(theme.id, originOf(e))
    })
    return b
  }
  /** A 🔒 on a theme or wallpaper you haven't unlocked yet. */
  function markLock(b, thing) {
    const locked = isLocked(thing)
    b.classList.toggle('is-locked', locked)
    b.title = locked ? lockedNote(thing.name, thing.at) : ''
  }
  // ----- wallpapers
  function applyWallpaper(id, save = true) {
    const w = WALLPAPERS.find((x) => x.id === id)
    if (w && !isLocked(w)) document.documentElement.dataset.wallpaper = w.id
    else delete document.documentElement.dataset.wallpaper
    if (save) storage.set(WALLPAPER_KEY, w && !isLocked(w) ? w.id : '')
    $$('[data-wallpaper-pick]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.wallpaperPick || null) === (document.documentElement.dataset.wallpaper ?? null))))
  }
  function wallpaperButton(w) {
    const b = document.createElement('button')
    b.className = 'wall-card'
    b.dataset.wallpaperPick = w ? w.id : ''
    b.innerHTML = '<span class="wall-thumb" aria-hidden="true"></span><span class="theme-name"></span>'
    if (w) $('.wall-thumb', b).style.backgroundImage = `url(/os/wallpapers/${w.id}.svg)`
    else $('.wall-thumb', b).classList.add('is-theme')
    $('.theme-name', b).textContent = w ? w.name : 'The theme’s own'
    if (w) markLock(b, w)
    b.addEventListener('click', () => {
      if (w && isLocked(w)) return msgbox('Themes', lockedNote(`The ${w.name} wallpaper`, w.at), '🔒')
      applyWallpaper(w?.id ?? null)
    })
    return b
  }
  // claimed on the hub (in another tab, or its window here): the locks come off straight away
  addEventListener('storage', (e) => {
    if (e.key !== REWARDS_KEY) return
    for (const b of $$('[data-theme-pick]')) markLock(b, THEMES.find((t) => t.id === b.dataset.themePick))
    for (const b of $$('[data-wallpaper-pick]')) b.dataset.wallpaperPick && markLock(b, WALLPAPERS.find((w) => w.id === b.dataset.wallpaperPick))
  })

  // ================= Windows =================
  const layer = $('#windows')
  const taskList = $('#tasks')
  const open = new Map() // id -> window record
  let z = 10
  let cascade = 0
  let msgCount = 0

  const taskbarHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--taskbar-h')) || 44
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi))

  /** An icon key from ICONS follows the theme; anything else (a message box's emoji) stays put. */
  function setIcon(el, icon) {
    if (ICONS.aero[icon]) el.dataset.icon = icon
    el.textContent = iconFor(icon)
  }

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
    setIcon($('.win-icon', el), icon)
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
    setIcon($('.task-icon', task), icon)
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
      if (el.hidden || win.minimizing) restore(win)
      else if (el.classList.contains('is-active')) minimize(win)
      else focusWin(win)
    })

    focusWin(win)
    return win
  }

  function focusWin(win) {
    if (win.el.hidden || win.minimizing) return
    z += 1
    win.el.style.zIndex = z
    for (const w of open.values()) {
      const on = w === win
      w.el.classList.toggle('is-active', on)
      w.task.classList.toggle('is-active', on)
    }
    if (!win.el.contains(document.activeElement)) win.el.focus({ preventScroll: true })
  }
  const onDesktop = (w) => !w.el.hidden && !w.minimizing
  /** Activates the top-most visible window (after one closes or minimizes). */
  function focusTop() {
    const visible = [...open.values()].filter(onDesktop).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)
    if (visible[0]) focusWin(visible[0])
    else for (const w of open.values()) w.task.classList.remove('is-active')
  }

  // Minimizing, Windows 7 style: the window shrinks into its taskbar button; restoring grows it
  // back out. (Reduced motion: it just disappears and reappears.)
  const MINIMIZE_MS = 260
  const RESTORE_MS = 280
  /** The transform that squeezes the window's box onto its taskbar button. */
  function towardTask(win) {
    const w = win.el.getBoundingClientRect()
    const t = win.task.getBoundingClientRect()
    const dx = t.left + t.width / 2 - (w.left + w.width / 2)
    const dy = t.top + t.height / 2 - (w.top + w.height / 2)
    const s = Math.max(0.05, Math.min(0.3, t.width / Math.max(w.width, 1)))
    return `translate(${dx}px, ${dy}px) scale(${s})`
  }
  const animates = () => !reducedMotion() && typeof Element.prototype.animate === 'function'

  function minimize(win) {
    if (win.el.hidden || win.minimizing) return
    win.el.classList.remove('is-active')
    win.task.classList.remove('is-active')
    win.task.classList.add('is-min')
    if (!animates()) {
      win.el.hidden = true
      return focusTop()
    }
    win.el.classList.remove('win-in')
    const anim = win.el.animate(
      [{ transform: 'none', opacity: 1 }, { opacity: 1, offset: 0.45 }, { transform: towardTask(win), opacity: 0 }],
      { duration: MINIMIZE_MS, easing: 'cubic-bezier(.5,0,.75,.2)', fill: 'forwards' },
    )
    win.minimizing = anim
    win.el.classList.add('is-minimizing')
    anim.onfinish = () => {
      if (win.minimizing !== anim) return
      win.minimizing = null
      win.el.classList.remove('is-minimizing')
      win.el.hidden = true
      anim.cancel() // drop the end frame, so the window is normal when it comes back
    }
    focusTop()
  }
  /** Back from the taskbar (or on its way there): grows out of its button. */
  function restore(win) {
    const flying = win.minimizing
    if (flying) {
      win.minimizing = null
      win.el.classList.remove('is-minimizing')
      flying.cancel()
    }
    const wasHidden = win.el.hidden || !!flying
    win.el.hidden = false
    win.task.classList.remove('is-min')
    keepOnScreen(win)
    focusWin(win)
    if (!wasHidden || !animates()) return
    win.el.animate(
      [{ transform: towardTask(win), opacity: 0 }, { opacity: 1, offset: 0.5 }, { transform: 'none', opacity: 1 }],
      { duration: RESTORE_MS, easing: 'cubic-bezier(.2,.8,.2,1)' },
    )
  }
  /** Pulls a window back into view if the screen got smaller under it (a phone rotating, say). */
  function keepOnScreen(win) {
    const el = win.el
    if (el.hidden || win.minimizing || el.classList.contains('is-max')) return
    const r = el.getBoundingClientRect()
    const maxLeft = innerWidth - r.width - 6
    const maxTop = innerHeight - taskbarHeight() - r.height - 6
    if (r.left > maxLeft) el.style.left = `${Math.max(6, maxLeft)}px`
    if (r.top > maxTop) el.style.top = `${Math.max(0, maxTop)}px`
  }
  addEventListener('resize', () => open.forEach(keepOnScreen))

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
      restore(existing)
      return existing
    }
    const content = document.getElementById(`app-${id}`).content.cloneNode(true)
    const win = makeWindow({ id, title: app.title, icon: app.icon, width: app.width, content })
    const cleanup = app.init?.(win.el, win) // an app can hand back what to do when it closes
    if (typeof cleanup === 'function') win.onClose = cleanup
    return win
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

  /**
   * A message box with OK and Cancel, and optionally a text box. Resolves to true (or the text)
   * for OK, and null for Cancel or closing it.
   */
  function askbox({ title, text, icon = '❓', ok = 'OK', cancel = 'Cancel', input = null }) {
    return new Promise((resolve) => {
      let result = null
      const content = document.createDocumentFragment()
      const body = document.createElement('div')
      body.className = 'win-body msg'
      body.innerHTML = `<span class="msg-icon" aria-hidden="true"></span><div class="msg-main"><p></p></div>`
      $('.msg-icon', body).textContent = icon
      $('p', body).textContent = text
      let field = null
      if (input) {
        field = document.createElement(input.multiline ? 'textarea' : 'input')
        field.className = 'msg-input'
        if (input.multiline) field.rows = 3
        field.maxLength = input.maxLength ?? 500
        field.placeholder = input.placeholder ?? ''
        if (input.value) field.value = input.value
        field.setAttribute('aria-label', text)
        $('.msg-main', body).append(field)
      }
      const foot = document.createElement('div')
      foot.className = 'win-foot'
      foot.innerHTML = `<button class="btn btn-cancel"></button><button class="btn btn-primary btn-ok"></button>`
      $('.btn-cancel', foot).textContent = cancel
      $('.btn-ok', foot).textContent = ok
      content.append(body, foot)
      const win = makeWindow({ id: `msg-${++msgCount}`, title, icon, width: 380, content, onClose: () => resolve(result) })
      win.el.classList.add('is-msg')
      $('.btn-cancel', win.el).addEventListener('click', () => closeWin(win))
      $('.btn-ok', win.el).addEventListener('click', () => {
        if (field && !field.value.trim()) return field.focus()
        result = field ? field.value.trim() : true
        closeWin(win)
      })
      ;(field ?? $('.btn-ok', win.el)).focus()
    })
  }

  /** A message box with several buttons: resolves to the chosen value (null if it's closed). */
  function choicebox({ title, text, icon = '❓', choices, width = 420 }) {
    return new Promise((resolve) => {
      let result = null
      const content = document.createDocumentFragment()
      const body = document.createElement('div')
      body.className = 'win-body msg'
      body.innerHTML = `<span class="msg-icon" aria-hidden="true"></span><div class="msg-main"><p></p></div>`
      $('.msg-icon', body).textContent = icon
      $('p', body).textContent = text
      const foot = document.createElement('div')
      foot.className = 'win-foot win-foot-choices'
      for (const c of choices) {
        const b = document.createElement('button')
        b.className = `btn${c.primary ? ' btn-primary' : ''}`
        b.textContent = c.label
        b.dataset.value = c.value
        foot.append(b)
      }
      content.append(body, foot)
      const win = makeWindow({ id: `msg-${++msgCount}`, title, icon, width, content, onClose: () => resolve(result) })
      win.el.classList.add('is-msg')
      $$('.win-foot .btn', win.el).forEach((b) =>
        b.addEventListener('click', () => {
          result = b.dataset.value
          closeWin(win)
        }),
      )
      ;($('.win-foot .btn-primary', win.el) ?? $('.win-foot .btn', win.el)).focus()
    })
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

  function initPc(el) {
    const rows = site.pc?.rows
    if (Array.isArray(rows)) {
      const dl = $('.pc-specs', el)
      dl.replaceChildren()
      for (const row of rows) {
        if (!Array.isArray(row)) continue
        const dt = document.createElement('dt')
        const dd = document.createElement('dd')
        dt.textContent = row[0] ?? ''
        dd.textContent = row[1] ?? ''
        dl.append(dt, dd)
      }
    }
    if (text(site.pc?.note) !== null) $('.pc-note', el).textContent = site.pc.note
    // "Themes installed": the real count (unless the admin page wrote something that isn't a number)
    for (const dt of $$('.pc-specs dt', el)) {
      const dd = dt.nextElementSibling
      if (dt.textContent.trim() !== 'Themes installed' || !/^\s*\d+\s*$/.test(dd?.textContent ?? '')) continue
      const locked = THEMES.filter(isLocked).length
      dd.textContent = `${THEMES.length - locked}${locked ? ` (+${locked} to unlock)` : ''}`
    }
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

  /** LAWN OF THE DEAD, the same way (the page at /touchgrass/). */
  function initGrass(el) {
    $('.grass-frame', el).src = '/touchgrass/?embed'
  }

  /** BRAINS FIRST, LAWN OF THE DEAD the other way round (the page at /touchphone/). */
  function initPhone(el) {
    $('.phone-frame', el).src = '/touchphone/?embed'
  }

  /** LOGGLE, the daily Robert Loggia (or Lobert Boggia) puzzle (the page at /loggle/). */
  function initLoggle(el) {
    $('.loggle-frame', el).src = '/loggle/?embed'
  }

  /** SKINSINK.GG, the COUNTER-STRIFE skins casino (the page at /casino/; pretend credits only). */
  function initCasino(el) {
    $('.casino-frame', el).src = '/casino/?embed'
  }

  /** COUNTER-STRIFE, 5v5 bomb defusal against bots (the page at /strife/). */
  let strifeQuery = '' // what the next COUNTER-STRIFE window should do (see openStrife)
  function initStrife(el) {
    $('.strife-frame', el).src = '/strife/?embed' + (strifeQuery ? `&${strifeQuery}` : '')
    strifeQuery = ''
  }
  /** Opens COUNTER-STRIFE to do something: 'join=ABCD' (a game invite), 'host=1&invite=<user id>'. */
  function openStrife(query = '') {
    // Messenger on its own (TRANSLATR™'s bubble): there's no desktop, so a new tab
    if (embedApp) return void window.open(`/strife/?${query}`, '_blank', 'noopener')
    const win = open.get('strife')
    if (win) {
      $('.strife-frame', win.el).src = `/strife/?embed&${query}`
      restore(win)
      return
    }
    strifeQuery = query
    openApp('strife')
  }

  // ================= File Explorer (os/files.js) =================
  let filesMod = null
  const loadFiles = () => (filesMod ??= import('/os/files.js'))
  let filesStart = null // where the next Explorer window opens
  const osApi = {
    openApp: (id) => openApp(id),
    explore: (path) => explore(path),
    closeWin: (w) => closeWin(w),
    msgbox: (...a) => msgbox(...a),
    askbox: (o) => askbox(o),
    makeWindow: (o) => makeWindow(o),
    showMenu: (items, x, y, title, icon) => showMenu(items, x, y, title, icon),
  }
  function initFiles(el, win) {
    let cleanup = null
    let closed = false
    win.setTitle = (t) => ($('.win-title', win.el).textContent = t)
    const start = filesStart
    filesStart = null
    loadFiles().then((m) => {
      if (!closed) cleanup = m.initExplorer(el, win, osApi, start ? { path: start } : {})
    })
    return () => {
      closed = true
      cleanup?.()
    }
  }
  /** Command Prompt (os/terminal.js): the same drive as File Explorer, typed at. */
  function initTerminal(el, win) {
    let cleanup = null
    let closed = false
    win.setTitle = (t) => ($('.win-title', win.el).textContent = t)
    import('/os/terminal.js').then((m) => {
      if (!closed) cleanup = m.initTerminal(el, win, osApi)
    })
    return () => {
      closed = true
      cleanup?.()
    }
  }
  /** Opens File Explorer at a path (a new window each time, like the real thing). */
  function explore(path) {
    filesStart = path
    const was = open.get('files')
    if (was) closeWin(was)
    return openApp('files')
  }
  // Your Desktop folder's files and folders, as desktop icons.
  function renderDesktopFiles(m) {
    for (const li of $$('.desk-icons > li[data-file]')) li.remove()
    const items = m.list(m.DESKTOP) ?? []
    for (const it of items) {
      const li = document.createElement('li')
      li.dataset.file = it.name
      li.innerHTML = `<button class="desk-icon" data-file=""><span class="di-img" aria-hidden="true"></span><span class="di-label"></span></button>`
      const icon = $('.desk-icon', li)
      icon.dataset.file = it.name
      $('.di-img', li).textContent = it.icon
      $('.di-label', li).textContent = it.name
      $('.desk-icons').append(li)
      wireDeskIcon(icon, () => {
        if (it.kind === 'dir') explore(it.path)
        else if (it.kind === 'txt' || it.kind === 'file') {
          m.markOpened()
          m.openNotepad(osApi, { name: it.name, text: it.node?.t ?? '', dir: m.DESKTOP })
        }
      })
      icon.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        showMenu(
          [
            { label: 'Open', run: () => icon.dispatchEvent(new MouseEvent('dblclick')) },
            { label: 'Rename', run: async () => {
              const to = await askbox({ title: 'Rename', text: `New name for “${it.name}”:`, icon: '✏️', input: { value: it.name, maxLength: 80 } })
              if (to == null) return
              const why = m.rename(m.DESKTOP, it.name, to)
              if (why) msgbox('Rename', why, '⚠️')
            } },
            { label: 'Delete', danger: true, run: async () => {
              if (await askbox({ title: 'Delete', text: `Delete “${it.name}”?`, icon: '🗑️', ok: 'Delete' })) m.remove(m.DESKTOP, it.name)
            } },
          ],
          e.clientX,
          e.clientY,
          it.name,
          it.icon,
        )
      })
    }
    layoutIcons()
  }
  loadFiles()
    .then((m) => {
      renderDesktopFiles(m)
      m.onChange(() => renderDesktopFiles(m))
    })
    .catch(() => {})

  /** The achievement hub: every game's achievements in one place (the page at /achievements/). */
  function initAchievements(el) {
    $('.ach-frame', el).src = '/achievements/?embed'
  }

  /** DOOMSCROLL.EXE runs in the window (the page at /doomscroll/, loaded only once it's opened). */
  function initDoom(el) {
    $('.doom-frame', el).src = '/doomscroll/?embed'
  }

  // ================= LigmaPhone =================
  // A smartphone in a window: the games and the browser live on its home screen (not the desktop).
  // Each opens on the phone's screen; ⧉ pops one out into a window. Apps wider than the phone
  // unfold it like a Z Fold (two panels), or like a trifold (three) when they're wider still.
  /** How many panels an app of this shape (width / height) needs. */
  const foldsFor = (aspect) => (!aspect || aspect <= 0.75 ? 1 : aspect <= 1.45 ? 2 : 3)
  const PHONE_APPS = [
    { id: 'browser', label: 'BobbyBrowser' },
    { id: 'doom', label: 'DOOMSCROLL.EXE', aspect: 16 / 10 },
    { id: 'grass', label: 'LAWN OF THE DEAD', aspect: 960 / 672 },
    { id: 'phone', label: 'BRAINS FIRST', aspect: 960 / 672 },
    { id: 'loggle', label: 'LOGGLE' },
    { id: 'strife', label: 'COUNTER-STRIFE', aspect: 16 / 9 },
    { id: 'casino', label: 'SKINSINK.GG' },
  ]
  function initMobile(el, win) {
    const grid = $('.mp-grid', el)
    const home = $('.mp-home', el)
    const screen = $('.mp-app', el)
    const bar = $('.mp-bar', el)
    let current = null
    let cleanup = null
    for (const a of PHONE_APPS) {
      if (site.apps?.[a.id]?.hidden === true) continue
      const li = document.createElement('li')
      li.innerHTML = `<button type="button" class="mp-icon"><span class="mp-icon-art" aria-hidden="true"></span><span class="mp-icon-name"></span></button>`
      setIcon($('.mp-icon-art', li), a.id)
      $('.mp-icon-name', li).textContent = text(site.apps?.[a.id]?.label) || a.label
      $('.mp-icon', li).dataset.app = a.id
      $('.mp-icon', li).addEventListener('click', () => launch(a))
      grid.append(li)
    }
    // Turned sideways (⟲), the phone is landscape: every app gets the wide screen, so nothing unfolds.
    let landscape = false
    // The window grows sideways as the phone unfolds or turns, and back (it stays on screen).
    // `around` keeps it centred on that point (the rotation turns it about its middle).
    function fit(panels, aspect, around) {
      if (win.el.classList.contains('is-max') || innerWidth < 640) return
      const room = innerHeight - taskbarHeight() - 16
      const chrome = 200 // title bar, padding, bezel, status bar, app bar and nav
      let w
      let h
      if (landscape) {
        w = Math.min(1100, innerWidth - 16, (room - 70) * 2 + 40)
        h = (w - 40) / 2 + 70
      } else if (panels > 1) {
        w = Math.min(panels === 2 ? 860 : 1040, innerWidth - 16, (room - chrome) * aspect + 64)
        h = (w - 64) / aspect + chrome
      } else {
        w = Math.min(400, innerWidth - 16)
        h = Math.max(420, Math.min(700, innerHeight - 160)) + 62
      }
      const r = win.el.getBoundingClientRect()
      const cx = around?.x ?? r.left + r.width / 2
      win.el.style.width = `${w}px`
      win.el.style.left = `${clamp(cx - w / 2, 8, innerWidth - w - 8)}px`
      if (around && h) win.el.style.top = `${clamp(around.y - h / 2, 8, room - h)}px`
      else if (h && r.top + h > room) win.el.style.top = `${Math.max(8, room - h)}px`
    }
    const phone = $('.mp', el)
    const mpScreen = $('.mp-screen', el)
    function unfold(panels, animate = true) {
      phone.classList.remove('unfold-2', 'unfold-3', 'unfolded')
      $$('.fold-fx, .fold-crease', mpScreen).forEach((n) => n.remove())
      if (panels < 2) return
      void phone.offsetWidth // restart the animation
      phone.classList.add(`unfold-${panels}`)
      phone.classList.toggle('unfolded', !animate) // already open: no animation
      const fx = document.createElement('div')
      fx.className = `fold-fx fold-${panels}`
      fx.setAttribute('aria-hidden', 'true')
      for (let i = 1; i < panels; i++) {
        const flap = document.createElement('i')
        flap.className = 'fold-flap'
        flap.style.setProperty('--i', i)
        fx.append(flap)
        const crease = document.createElement('i')
        crease.className = 'fold-crease'
        crease.style.left = `${(i * 100) / panels}%`
        crease.setAttribute('aria-hidden', 'true')
        mpScreen.append(crease)
      }
      mpScreen.append(fx)
    }
    function launch(a) {
      stop()
      const content = document.getElementById(`app-${a.id}`).content.cloneNode(true)
      screen.replaceChildren(content)
      cleanup = APPS[a.id].init?.(screen, win)
      current = a
      setIcon($('.mp-bar-icon', el), a.id)
      $('.mp-bar-title', el).textContent = $('.mp-icon-name', $(`.mp-icon[data-app="${a.id}"]`, el)).textContent
      home.hidden = true
      screen.hidden = bar.hidden = false
      layout(true)
    }
    /** Shapes the phone for the current app and orientation (unfolding it if `animate`). */
    function layout(animate, around) {
      const aspect = current?.aspect
      const panels = landscape ? 1 : foldsFor(aspect)
      el.classList.toggle('mp-landscape', landscape)
      el.classList.toggle('mp-land', panels > 1)
      el.style.setProperty('--ar', aspect ?? '')
      el.dataset.panels = panels
      el.dataset.orient = landscape ? 'landscape' : 'portrait'
      fit(panels, aspect, around)
      unfold(panels, animate)
    }
    // ⟲: the whole window turns a quarter, the screen blacked out with the rotation symbol turning
    // along with it, then it fades back in on the new layout.
    const cover = $('.rot-cover', el)
    const icon = $('.rot-icon', el)
    let turning = false
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    async function rotate() {
      if (turning) return
      turning = true
      const quick = reducedMotion()
      const r = win.el.getBoundingClientRect()
      const around = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      const turn = landscape ? '90deg' : '-90deg'
      icon.style.rotate = '0deg'
      cover.classList.add('on')
      await wait(quick ? 0 : 200)
      if (!quick) {
        win.el.classList.add('rot-turning')
        win.el.style.rotate = turn
        await wait(620)
      }
      // The screen is black, so the swap to the new shape doesn't show: the window stops turning
      // and takes the new layout, and the symbol keeps the angle it had.
      win.el.classList.remove('rot-turning')
      win.el.style.rotate = ''
      if (!quick) icon.style.rotate = turn
      landscape = !landscape
      layout(false, around)
      await wait(quick ? 0 : 160)
      cover.classList.remove('on')
      await wait(quick ? 0 : 260)
      turning = false
    }
    $('.mp-rotate', el).addEventListener('click', rotate)
    function stop() {
      if (typeof cleanup === 'function') cleanup()
      cleanup = null
      screen.replaceChildren()
    }
    function goHome() {
      stop()
      current = null
      home.hidden = false
      screen.hidden = bar.hidden = true
      layout(false)
    }
    $('.mp-back', el).addEventListener('click', goHome)
    $('.mp-homebtn', el).addEventListener('click', goHome)
    $('.mp-pop', el).addEventListener('click', () => {
      const id = current?.id
      goHome()
      if (id) openApp(id)
    })
    const clock = () => {
      const now = new Date()
      const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      $('.mp-clock', el).textContent = time
      $('.mp-big-clock', el).textContent = time
      $('.mp-date', el).textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    }
    clock()
    const tick = setInterval(clock, 15_000)
    return () => {
      clearInterval(tick)
      stop()
    }
  }

  // ================= BobbyBrowser =================
  // A small web browser: pages load in a frame, so only sites that allow being embedded show up
  // (the start page lists some that do). Its theme filter makes every page look like the theme.
  const BROWSER_TILES = [
    { icon: '🌐', name: 'TRANSLATR™', url: '/translatr/' },
    { icon: '👹', name: 'DOOMSCROLL.EXE', url: '/doomscroll/' },
    { icon: '🌱', name: 'LAWN OF THE DEAD', url: '/touchgrass/' },
    { icon: '🧠', name: 'BRAINS FIRST', url: '/touchphone/' },
    { icon: '🟩', name: 'LOGGLE', url: '/loggle/' },
    { icon: '💣', name: 'COUNTER-STRIFE', url: '/strife/' },
    { icon: '🎰', name: 'SKINSINK.GG', url: '/casino/' },
    { icon: '🎖️', name: 'Achievements', url: '/achievements/' },
    { icon: '🎞️', name: 'The GIF', url: '/gif/' },
    { icon: '📚', name: 'Wikipedia', url: 'https://en.m.wikipedia.org/wiki/Main_Page' },
    { icon: '🎲', name: 'Random article', url: 'https://en.m.wikipedia.org/wiki/Special:Random' },
    { icon: '🗺️', name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/export/embed.html?bbox=-0.25%2C51.45%2C0.05%2C51.56&layer=mapnik' },
    { icon: '📼', name: 'A very normal video', url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' },
    { icon: '🕹️', name: 'Old web search', url: 'https://wiby.me/' },
  ]
  function initBrowser(el) {
    const frame = $('.br-frame', el)
    const start = $('.br-start', el)
    const input = $('.br-url', el)
    const status = $('.br-status', el)
    const out = $('.br-out', el)
    const view = $('.br-view', el)
    let history = ['home']
    let at = 0
    const tiles = $('.br-tiles', el)
    for (const t of BROWSER_TILES) {
      const li = document.createElement('li')
      li.innerHTML = `<button type="button" class="br-tile"><span class="br-tile-icon" aria-hidden="true"></span><span class="br-tile-name"></span></button>`
      $('.br-tile-icon', li).textContent = t.icon
      $('.br-tile-name', li).textContent = t.name
      $('button', li).addEventListener('click', () => go(t.url))
      tiles.append(li)
    }
    /** What was typed → an address: a URL, a domain, or a Wikipedia search. */
    function resolve(q) {
      q = q.trim()
      if (!q || q === 'home' || q === 'about:home') return 'home'
      if (q.startsWith('/')) return new URL(q, location.href).href
      if (/^https?:\/\//i.test(q)) return safeUrl(q)?.href ?? null
      if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(q) && !/\s/.test(q)) return `https://${q}`
      return `https://en.m.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`
    }
    function show(url) {
      const home = url === 'home'
      start.hidden = !home
      frame.hidden = home
      input.value = home ? '' : url.replace(location.origin, location.host)
      out.hidden = home
      out.href = home ? '#' : url
      if (!home && frame.dataset.url !== url) {
        frame.dataset.url = url
        status.textContent = `Loading ${new URL(url).host}…`
        frame.src = url
      }
      if (home) status.textContent = 'Home'
      $('.br-back', el).disabled = at === 0
      $('.br-fwd', el).disabled = at >= history.length - 1
    }
    function go(q) {
      const url = resolve(q)
      if (!url) return msgbox('BobbyBrowser', 'That address can’t be opened here.', '🧭')
      history = history.slice(0, at + 1)
      history.push(url)
      at = history.length - 1
      show(url)
    }
    frame.addEventListener('load', () => {
      if (frame.hidden) return
      // Our own pages can say where they went; other sites keep that to themselves.
      try {
        const href = frame.contentWindow.location.href
        if (href && href !== 'about:blank' && href !== frame.dataset.url) {
          frame.dataset.url = href
          history[at] = href
          input.value = href.replace(location.origin, location.host)
          out.href = href
        }
        status.textContent = frame.contentDocument?.title || new URL(frame.dataset.url).host
      } catch {
        status.textContent = `${new URL(frame.dataset.url).host} · blank? Some sites won’t open inside another page: try ↗`
      }
    })
    $('.br-bar', el).addEventListener('submit', (e) => {
      e.preventDefault()
      go(input.value)
    })
    $('.br-search', el).addEventListener('submit', (e) => {
      e.preventDefault()
      const q = $('.br-q', el).value.trim()
      if (q) go(q.includes(' ') || !q.includes('.') ? `https://en.m.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}` : q)
    })
    $('.br-back', el).addEventListener('click', () => at > 0 && show(history[--at]))
    $('.br-fwd', el).addEventListener('click', () => at < history.length - 1 && show(history[++at]))
    $('.br-home', el).addEventListener('click', () => go('home'))
    $('.br-reload', el).addEventListener('click', () => {
      if (frame.hidden) return
      frame.src = 'about:blank'
      setTimeout(() => (frame.src = frame.dataset.url), 30)
    })
    const fx = $('.br-fx', el)
    const FX_KEY = 'nikstilos-browser-fx'
    const setFx = (on) => {
      view.classList.toggle('no-fx', !on)
      fx.setAttribute('aria-pressed', String(on))
      storage.set(FX_KEY, on ? '1' : '0')
    }
    setFx(storage.get(FX_KEY) !== '0')
    fx.addEventListener('click', () => setFx(view.classList.contains('no-fx')))
    show('home')
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
    const walls = $('#wall-grid', el)
    walls.append(wallpaperButton(null), ...WALLPAPERS.map(wallpaperButton))
    applyTheme(document.documentElement.dataset.theme, false) // mark the current one
    applyWallpaper(document.documentElement.dataset.wallpaper ?? null, false)
  }

  function initBin(el) {
    const list = $('.bin-list', el)
    const files = site.bin?.files
    if (Array.isArray(files)) {
      list.replaceChildren()
      for (const f of files) {
        if (!f || !text(f.name)) continue
        const li = document.createElement('li')
        li.innerHTML = `<button class="bin-file"><span aria-hidden="true"></span> <span class="bin-name"></span></button>`
        const b = $('.bin-file', li)
        b.dataset.alert = text(f.alert) || text(f.icon) || '📄'
        b.dataset.text = text(f.text) ?? ''
        $('span', b).textContent = text(f.icon) || '📄'
        $('.bin-name', b).textContent = f.name
        if (text(f.note)) {
          const small = document.createElement('small')
          small.textContent = f.note
          b.append(small)
        }
        list.append(li)
      }
    }
    const all = $$('.bin-file', el)
    $('.status', el).textContent = `${all.length} item${all.length === 1 ? '' : 's'}`
    for (const file of all) {
      const show = () => msgbox($('.bin-name', file).textContent, file.dataset.text || 'This file is empty.', file.dataset.alert)
      // On touch screens a tap opens it, so a double tap mustn't open it twice more.
      file.addEventListener('dblclick', () => !coarsePointer && show())
      file.addEventListener('click', (e) => {
        all.forEach((f) => f.classList.toggle('is-selected', f === file))
        if (coarsePointer || e.detail === 0) show() // tap, or Enter
      })
    }
    const empty = $('.bin-empty', el)
    const emptyText = text(site.bin?.empty) || empty.dataset.text
    empty.addEventListener('click', () => msgbox('Recycle Bin', emptyText, '⛔'))
  }

  // ================= Desktop =================
  // Icons: click to select (Ctrl/⌘-click to add), drag a box on the desktop to select several,
  // double-click to open. With a mouse, icons can be dragged anywhere: they snap to a grid and stay
  // where you put them (saved in this browser). Desktop menu → Sort icons puts them back.
  const desktop = $('#desktop')
  const iconList = $('.desk-icons')
  const ICON_POS_KEY = 'nikstilos-icons'
  const CELL_W = 98
  const CELL_H = 100
  const PAD = 10
  let justDragged = 0 // (a drag ends in a click on the dragged icon: that click mustn't select or open it)
  let draggedIcons = []
  const wasDragged = (icon) => Date.now() - justDragged < 300 && draggedIcons.includes(icon)
  const iconKey = (icon) => icon.dataset.app ?? (icon.dataset.file != null ? `file:${icon.dataset.file}` : `link:${$('.di-label', icon).textContent}`)
  const visibleIcons = () => $$('.desk-icon').filter((i) => !i.closest('li').hidden)
  const select = (icons, add = false) => $$('.desk-icon').forEach((i) => i.classList.toggle('is-selected', icons.includes(i) || (add && i.classList.contains('is-selected'))))

  function wireDeskIcon(icon, launch) {
    icon.addEventListener('click', (e) => {
      if (wasDragged(icon)) return
      if (e.ctrlKey || e.metaKey) return icon.classList.toggle('is-selected')
      select([icon])
      // Double-click on a mouse; a tap on touch screens; Enter/Space from the keyboard.
      if (coarsePointer || e.detail === 0) launch()
    })
    icon.addEventListener('dblclick', () => !coarsePointer && !wasDragged(icon) && launch())
    if (!coarsePointer) icon.addEventListener('pointerdown', (e) => startIconDrag(icon, e))
  }
  for (const icon of $$('.desk-icon')) wireDeskIcon(icon, () => (icon.dataset.app === 'pc' ? explore([]) : openApp(icon.dataset.app)))

  // ----- where the icons are
  const loadPositions = () => {
    try {
      const saved = JSON.parse(storage.get(ICON_POS_KEY))
      return saved && typeof saved === 'object' ? saved : null
    } catch {
      return null
    }
  }
  /** Places every icon on the grid: saved spots first, then the rest in the first free cells. */
  function layoutIcons() {
    const saved = loadPositions()
    iconList.classList.toggle('is-free', !!saved)
    if (!saved) {
      $$('.desk-icons > li').forEach((li) => (li.style.left = li.style.top = ''))
      return
    }
    const rows = Math.max(1, Math.floor((desktop.clientHeight - PAD * 2) / CELL_H))
    const cols = Math.max(1, Math.floor((desktop.clientWidth - PAD * 2) / CELL_W))
    const taken = new Set()
    const place = (icon, col, row) => {
      taken.add(`${col},${row}`)
      const li = icon.closest('li')
      li.style.left = `${PAD + col * CELL_W}px`
      li.style.top = `${PAD + row * CELL_H}px`
      icon.dataset.cell = `${col},${row}`
    }
    const free = (col = 0, row = 0) => {
      for (let n = col * rows + row; n < rows * cols * 4; n++) {
        const c = Math.floor(n / rows),
          r = n % rows
        if (!taken.has(`${c},${r}`)) return [c, r]
      }
      return [0, 0]
    }
    const later = []
    for (const icon of visibleIcons()) {
      const spot = saved[iconKey(icon)]
      if (Array.isArray(spot) && spot[0] < cols && spot[1] < rows && !taken.has(`${spot[0]},${spot[1]}`)) place(icon, spot[0], spot[1])
      else later.push(icon)
    }
    for (const icon of later) place(icon, ...free())
  }
  function savePositions() {
    const data = {}
    for (const icon of visibleIcons()) data[iconKey(icon)] = icon.dataset.cell.split(',').map(Number)
    storage.set(ICON_POS_KEY, JSON.stringify(data))
  }
  addEventListener('resize', () => iconList.classList.contains('is-free') && layoutIcons())

  // ----- dragging icons (the selected ones, if you grab one of them)
  function startIconDrag(icon, e) {
    if (e.button !== 0) return
    const x0 = e.clientX,
      y0 = e.clientY
    let moving = null
    const move = (ev) => {
      const dx = ev.clientX - x0,
        dy = ev.clientY - y0
      if (!moving) {
        if (Math.hypot(dx, dy) < 5) return
        if (!iconList.classList.contains('is-free')) {
          // First drag: freeze the current arrangement where it is.
          freezeLayout()
        }
        if (!icon.classList.contains('is-selected')) select([icon])
        moving = $$('.desk-icon.is-selected').filter((i) => !i.closest('li').hidden)
        moving.forEach((i) => i.closest('li').classList.add('is-dragging'))
      }
      for (const i of moving) i.closest('li').style.transform = `translate(${dx}px, ${dy}px)`
    }
    const up = (ev) => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
      if (!moving) return
      justDragged = Date.now()
      draggedIcons = moving
      const dc = Math.round((ev.clientX - x0) / CELL_W),
        dr = Math.round((ev.clientY - y0) / CELL_H)
      const rows = Math.max(1, Math.floor((desktop.clientHeight - PAD * 2) / CELL_H))
      const cols = Math.max(1, Math.floor((desktop.clientWidth - PAD * 2) / CELL_W))
      const others = new Set(visibleIcons().filter((i) => !moving.includes(i)).map((i) => i.dataset.cell))
      // Move them all by the same number of cells; anything that would land on another icon (or
      // off the desktop) takes the nearest free cell instead.
      const placed = new Set()
      for (const i of moving) {
        const [c, r] = i.dataset.cell.split(',').map(Number)
        let tc = Math.min(cols - 1, Math.max(0, c + dc)),
          tr = Math.min(rows - 1, Math.max(0, r + dr))
        const busy = (cc, rr) => others.has(`${cc},${rr}`) || placed.has(`${cc},${rr}`)
        if (busy(tc, tr)) {
          let best = null
          for (let cc = 0; cc < cols; cc++)
            for (let rr = 0; rr < rows; rr++) {
              if (busy(cc, rr)) continue
              const d = Math.hypot(cc - tc, rr - tr)
              if (!best || d < best[2]) best = [cc, rr, d]
            }
          if (best) [tc, tr] = best
        }
        placed.add(`${tc},${tr}`)
        i.dataset.cell = `${tc},${tr}`
        const li = i.closest('li')
        li.classList.remove('is-dragging')
        li.style.transform = ''
      }
      savePositions()
      layoutIcons()
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }
  /** Saves where the icons are right now (in the automatic layout) as their spots. */
  function freezeLayout() {
    const box = iconList.getBoundingClientRect()
    for (const icon of visibleIcons()) {
      const r = icon.closest('li').getBoundingClientRect()
      icon.dataset.cell = `${Math.round((r.left - box.left - PAD) / CELL_W)},${Math.round((r.top - box.top - PAD) / CELL_H)}`
    }
    savePositions()
    layoutIcons()
  }
  function sortIcons() {
    storage.set(ICON_POS_KEY, '')
    try {
      localStorage.removeItem(ICON_POS_KEY)
    } catch {}
    layoutIcons()
  }

  // ----- the selection box: hold the left button on the desktop and drag
  const marquee = document.createElement('div')
  marquee.className = 'marquee'
  marquee.hidden = true
  desktop.append(marquee)
  desktop.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.desk-icon')) return
    const add = e.ctrlKey || e.metaKey
    if (!add) select([])
    if (e.button !== 0 || e.pointerType === 'touch') return
    const x0 = e.clientX,
      y0 = e.clientY
    const before = add ? $$('.desk-icon.is-selected') : []
    let on = false
    const move = (ev) => {
      const x = Math.min(x0, ev.clientX),
        y = Math.min(y0, ev.clientY),
        w = Math.abs(ev.clientX - x0),
        h = Math.abs(ev.clientY - y0)
      if (!on && w + h < 4) return
      on = true
      marquee.hidden = false
      Object.assign(marquee.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` })
      const hits = visibleIcons().filter((i) => {
        const r = i.getBoundingClientRect()
        return r.right > x && r.left < x + w && r.bottom > y && r.top < y + h
      })
      select([...before, ...hits])
    }
    const up = () => {
      marquee.hidden = true
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  })
  // Ctrl/⌘+A selects every icon (when nothing else has the keyboard).
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && (document.activeElement === document.body || document.activeElement?.closest('.desktop'))) {
      e.preventDefault()
      select(visibleIcons())
    }
  })

  // ================= Menus =================
  const startBtn = $('#start-btn')
  const startMenu = $('#start-menu')
  const ctxMenu = $('#ctx-menu')
  const appMenu = $('#app-menu')
  function closeMenus() {
    startMenu.hidden = true
    ctxMenu.hidden = true
    appMenu.hidden = true
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
    if (!startMenu.hidden || !ctxMenu.hidden || !appMenu.hidden) return closeMenus()
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
    if (action === 'folder' || action === 'textfile')
      loadFiles().then(async (m) => {
        const name = action === 'folder' ? m.newFolder(m.DESKTOP) : m.newText(m.DESKTOP)
        if (!name) return
        const to = await askbox({ title: action === 'folder' ? 'New folder' : 'New text document', text: 'Name:', icon: action === 'folder' ? '📁' : '📄', input: { value: name, maxLength: 80 } })
        if (to != null && to !== name) {
          const why = m.rename(m.DESKTOP, name, to)
          if (why) msgbox('Rename', why, '⚠️')
        }
      })
    if (action === 'explorer') explore([])
    if (action === 'sort') sortIcons()
    if (action === 'refresh') {
      desktop.classList.remove('is-refreshing')
      void desktop.offsetWidth
      desktop.classList.add('is-refreshing')
    }
  })

  // ================= App menus =================
  // Right-clicking inside any app opens a menu like the desktop's: what that app can do, then the
  // window's own Minimize / Maximize / Close. It works inside the apps' pages too (the games,
  // LOGGLE, the phone's apps), unless the page uses right-click itself, or you're on a text field
  // or have text selected (then it's the browser's own menu, for copy and paste).
  const nativeMenu = (target, doc = document) =>
    !!target?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]') || !!doc.getSelection?.()?.toString()
  const winOf = (node) => [...open.values()].find((w) => w.el === node?.closest?.('.win'))
  function appMenuItems(win) {
    const el = win.el
    const items = []
    const add = (label, run, extra) => items.push({ label, run, ...extra })
    const live = (sel) => {
      const b = $(sel, el)
      return b && !b.disabled && !b.closest('[hidden]') ? b : null
    }
    const click = (sel) => () => $(sel, el)?.click()
    // The phone: its buttons.
    if ($('.mp', el)) {
      if (live('.mp-bar')) add('⌂  Home screen', click('.mp-homebtn'))
      add(el.dataset.orient === 'landscape' ? '⟲  Rotate to portrait' : '⟲  Rotate to landscape', click('.mp-rotate'))
      if (live('.mp-pop')) add('⧉  Open in its own window', click('.mp-pop'))
    }
    // BobbyBrowser (in a window or on the phone): its toolbar.
    if (live('.br-bar')) {
      add('◀  Back', click('.br-back'), { disabled: !live('.br-back') })
      add('▶  Forward', click('.br-fwd'), { disabled: !live('.br-fwd') })
      add('⟳  Reload', click('.br-reload'))
      add('⌂  Start page', click('.br-home'))
      const out = $('.br-out', el)
      if (out && !out.hidden && out.getAttribute('href') !== '#') add('↗  Open in a new tab', () => window.open(out.href, '_blank', 'noopener'))
    } else {
      // Apps that are a page in a frame (the games, LOGGLE, DOOMSCROLL): reload it, or open it on its own.
      const frame = [...el.querySelectorAll('iframe')].find((f) => !f.closest('[hidden]'))
      if (frame) add('⟳  Reload', () => (frame.src = frame.src))
      const page = $('.win-foot a.btn[href]', el)
      if (page && (frame || !$('.mp', el))) add(`⛶  ${page.textContent.replace(/^\W+/, '').trim() || 'Open full page'}`, () => (page.target ? window.open(page.href, '_blank', 'noopener') : (location.href = page.href)))
    }
    if (live('.tr-launch')) add(`▶  ${$('.tr-launch', el).textContent.replace(/^\W+/, '').trim()}`, click('.tr-launch'))
    if (items.length) items.push('sep')
    const max = el.classList.contains('is-max')
    add('_  Minimize', () => minimize(win))
    add(max ? '❐  Restore' : '□  Maximize', () => toggleMax(win))
    add('✕  Close', () => closeWin(win), { danger: true })
    return items
  }
  function showAppMenu(win, x, y) {
    focusWin(win)
    const inPhone = !$('.mp-bar', win.el)?.hidden && $('.mp-bar-title', win.el)?.textContent
    showMenu(appMenuItems(win), x, y, $('.win-title', win.el).textContent + (inPhone ? ` · ${inPhone}` : ''), APPS[win.id]?.icon ?? 'pc')
  }
  /** A right-click menu: items are { label, run, disabled, danger } or 'sep'. */
  function showMenu(items, x, y, title, icon) {
    closeMenus()
    appMenu.replaceChildren()
    const head = document.createElement('div')
    head.className = 'ctx-head'
    head.innerHTML = '<span aria-hidden="true"></span><b></b>'
    setIcon($('span', head), icon)
    $('b', head).textContent = title
    appMenu.append(head)
    for (const it of items) {
      if (it === 'sep') {
        appMenu.append(document.createElement('hr'))
        continue
      }
      const b = document.createElement('button')
      b.className = `ctx-item${it.danger ? ' ctx-danger' : ''}`
      b.setAttribute('role', 'menuitem')
      b.textContent = it.label
      b.disabled = !!it.disabled
      b.addEventListener('click', () => {
        closeMenus()
        it.run()
      })
      appMenu.append(b)
    }
    appMenu.hidden = false
    const r = appMenu.getBoundingClientRect()
    appMenu.style.left = `${Math.max(4, Math.min(x, innerWidth - r.width - 4))}px`
    appMenu.style.top = `${Math.max(4, Math.min(y, innerHeight - r.height - 4))}px`
    $('.ctx-item:not(:disabled)', appMenu)?.focus({ preventScroll: true })
  }
  layer.addEventListener('contextmenu', (e) => {
    const win = winOf(e.target)
    if (!win || e.defaultPrevented || nativeMenu(e.target)) return
    e.preventDefault()
    showAppMenu(win, e.clientX, e.clientY)
  })
  // Pages in the apps' frames (same-site ones; other sites keep their own menu).
  document.addEventListener(
    'load',
    (e) => {
      const frame = e.target
      if (frame?.tagName !== 'IFRAME' || !frame.closest('.win')) return
      let doc
      try {
        doc = frame.contentDocument
      } catch {
        return
      }
      if (!doc || doc.__nkMenu) return
      doc.__nkMenu = true
      doc.addEventListener('contextmenu', (ev) => {
        if (ev.defaultPrevented || nativeMenu(ev.target, doc)) return
        const win = winOf(frame)
        if (!win) return
        ev.preventDefault()
        const r = frame.getBoundingClientRect()
        const sx = frame.clientWidth ? r.width / frame.clientWidth : 1
        const sy = frame.clientHeight ? r.height / frame.clientHeight : 1
        showAppMenu(win, r.left + ev.clientX * sx, r.top + ev.clientY * sy)
      })
      doc.addEventListener('pointerdown', () => !appMenu.hidden && closeMenus())
    },
    true,
  )

  // ================= Taskbar =================
  const clock = $('#clock')
  function tick() {
    const now = new Date()
    clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    clock.dateTime = now.toISOString()
    clock.title = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }
  // Ticks just after each minute turns over, so it's never a minute behind.
  const tickEachMinute = () => {
    tick()
    setTimeout(tickEachMinute, 60_000 - (Date.now() % 60_000) + 50)
  }
  tickEachMinute()

  // Show desktop: minimizes everything; a second click brings the same windows back.
  let peeked = []
  $('#show-desktop').addEventListener('click', () => {
    const visible = [...open.values()].filter(onDesktop)
    if (visible.length) {
      peeked = visible
      visible.forEach(minimize)
    } else {
      peeked.filter((w) => open.has(w.id)).forEach(restore)
      peeked = []
    }
  })

  // ================= Full screen =================
  // The tray button, the Start menu and the desktop menu put the whole desktop in real full
  // screen, where the browser allows it (iPhones don't, so the buttons stay hidden there).
  // Esc (or the button again) leaves it.
  const root = document.documentElement
  const fsButton = $('#fullscreen-btn')
  const fullscreenElement = () => document.fullscreenElement ?? document.webkitFullscreenElement ?? null
  const canFullscreen =
    !!(root.requestFullscreen || root.webkitRequestFullscreen) && !!(document.fullscreenEnabled ?? document.webkitFullscreenEnabled)
  function toggleFullscreen() {
    if (fullscreenElement()) return void (document.exitFullscreen ?? document.webkitExitFullscreen)?.call(document)
    const refused = () => !fullscreenElement() && msgbox('Full screen', 'Your browser said no. Try F11, or full screen from the browser’s own menu.', '⛔')
    let answered = false
    try {
      Promise.resolve((root.requestFullscreen ?? root.webkitRequestFullscreen).call(root, { navigationUI: 'hide' })).then(
        () => (answered = true),
        () => {
          answered = true
          refused()
        },
      )
    } catch {
      return refused()
    }
    // Some embedded browsers (in-app views) never answer at all: say so rather than do nothing.
    setTimeout(() => !answered && refused(), 2500)
  }
  function syncFullscreen() {
    const on = !!fullscreenElement()
    root.classList.toggle('is-fullscreen', on)
    const label = on ? 'Exit full screen' : 'Full screen'
    fsButton.setAttribute('aria-label', label)
    fsButton.title = label
    $$('[data-action="fullscreen"] .fs-label').forEach((el) => (el.textContent = label))
  }
  if (canFullscreen) {
    $$('#fullscreen-btn, [data-action="fullscreen"]').forEach((el) => (el.hidden = false))
    fsButton.addEventListener('click', toggleFullscreen)
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.start-menu [data-action="fullscreen"], .ctx-menu [data-action="fullscreen"]')) return
      closeMenus()
      toggleFullscreen()
    })
    document.addEventListener('fullscreenchange', syncFullscreen)
    document.addEventListener('webkitfullscreenchange', syncFullscreen)
  }

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
  // Shut down closes the tab. Browsers only allow that when the tab has nothing else in its history
  // (nikstil.com typed into a new tab, or opened in one); otherwise the close is refused and you get
  // the classic "safe to turn off" screen instead (click it to boot back up).
  shutdown.tabIndex = -1
  $('#shutdown-btn').addEventListener('click', () => {
    closeMenus()
    shutdown.hidden = false
    shutdown.classList.remove('is-safe')
    shutdown.focus()
    setTimeout(() => {
      window.close()
      setTimeout(() => shutdown.classList.add('is-safe'), 250)
    }, reducedMotion() ? 0 : 1400)
  })
  // A click (or any key) on the "safe to turn off" screen boots it back up.
  function powerOn() {
    if (!shutdown.classList.contains('is-safe')) return
    for (const w of [...open.values()]) closeWin(w)
    shutdown.hidden = true
    document.documentElement.classList.remove('booted')
    runBoot(() => {})
  }
  shutdown.addEventListener('click', powerOn)
  shutdown.addEventListener('keydown', powerOn)

  // ================= Online =================
  // Accounts, Leaderboards and Messenger live in os/online-apps.js (loaded just before this file).
  const online =
    window.nikstilOnlineApps?.({
      $,
      $$,
      open,
      openApp,
      openStrife,
      makeWindow: (o) => makeWindow(o),
      closeWin,
      focusWin,
      restore,
      msgbox,
      askbox,
      choicebox,
      closeMenus,
      iconFor,
      coarsePointer,
      siteHidden: (id) => site.apps?.[id]?.hidden === true,
      layoutIcons: () => layoutIcons(),
      userName: () => text(site.user) || 'Guest',
    }) ?? null

  // ================= Site settings =================
  // /site.json (edited on the admin page, /nikstil/) overrides the defaults written in index.html.
  // Anything missing or malformed keeps its default, so a broken file can't break the desktop.
  let site = {}
  const text = (v) => (typeof v === 'string' ? v : null)
  /** Only web and mail links: never javascript: or data: URLs. */
  function safeUrl(u) {
    try {
      const url = new URL(u, location.href)
      return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url : null
    } catch {
      return null
    }
  }
  function openLink(url) {
    if (url.origin === location.origin || url.protocol === 'mailto:') location.href = url.href
    else window.open(url.href, '_blank', 'noopener')
  }

  function applySite(data) {
    site = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
    if (text(site.user)) $('.sm-user').textContent = site.user
    if (text(site.boot)) $('.boot-copy').textContent = site.boot
    for (const [id, app] of Object.entries(APPS)) {
      const s = site.apps?.[id]
      if (!s || typeof s !== 'object') continue
      if (text(s.title)) app.title = s.title
      if (text(s.label)) {
        const label = $(`.desk-icon[data-app="${id}"] .di-label`)
        if (label) label.textContent = s.label
        $(`.sm-item[data-app="${id}"] .sm-label`)?.replaceChildren(s.label)
      }
      if (s.hidden === true) $$(`.desk-icon[data-app="${id}"], .sm-item[data-app="${id}"]`).forEach((el) => (el.closest('li').hidden = true))
    }
    // Shortcuts: extra desktop icons (and Start menu entries) that open a link.
    const fsItem = $('.sm-list [data-action="fullscreen"]').closest('li')
    for (const link of Array.isArray(site.links) ? site.links : []) {
      const url = safeUrl(link?.url)
      const label = text(link?.label)
      if (!url || !label) continue
      const icon = text(link.icon) || '🔗'
      const li = document.createElement('li')
      li.innerHTML = `<button class="desk-icon"><span class="di-img" aria-hidden="true"></span><span class="di-label"></span></button>`
      $('.di-img', li).textContent = icon
      $('.di-label', li).textContent = label
      $('.desk-icons').append(li)
      wireDeskIcon($('.desk-icon', li), () => openLink(url))
      const item = document.createElement('li')
      item.innerHTML = `<button class="sm-item" role="menuitem"><span aria-hidden="true"></span> <span class="sm-label"></span></button>`
      $('span', item).textContent = icon
      $('.sm-label', item).textContent = label
      $('.sm-item', item).addEventListener('click', () => {
        closeMenus()
        openLink(url)
      })
      fsItem.before(item)
    }
  }

  /** The welcome message (if one is set): once per visit, and again whenever it changes. */
  function welcome() {
    if (window.nikstilPreview) {
      msgbox('Preview', 'This is your unpublished draft from the admin page. Only this browser can see it.', '👁️')
    }
    const message = text(site.welcome?.text)
    if (!message || storage.get('nikstilos-welcomed', sessionStorage) === message) return
    storage.set('nikstilos-welcomed', message, sessionStorage)
    msgbox(text(site.welcome.title) || 'Welcome', message, text(site.welcome.icon) || '👋')
  }

  // ================= Start =================
  // Waits for the settings (up to 1.5 s: a slow or missing site.json just means the defaults).
  const settings = Promise.race([window.nikstilSite ?? null, new Promise((r) => setTimeout(r, 1500, null))])
  settings
    .then(applySite)
    .catch(() => {})
    .finally(() => {
      const saved = storage.get(THEME_KEY) || storage.get(GAME_THEME_KEY)
      const fallback = THEMES.some((t) => t.id === site.defaultTheme) ? site.defaultTheme : 'aero'
      applyTheme(THEMES.some((t) => t.id === saved) ? saved : fallback, false)
      applyWallpaper(storage.get(WALLPAPER_KEY), false)
      layoutIcons()
      const onlineReady = Promise.resolve(online?.start()).catch(() => {})
      if (APPS[embedApp]) {
        const root = document.documentElement
        root.classList.add('embed-app', 'booted')
        // (After the online check, so the app knows whether it's switched on.)
        onlineReady.then(() => {
          const win = openApp(embedApp)
          win.el.classList.add('is-embedded', 'is-max')
        })
        return
      }
      runBoot(() => {
        // nikstil.com/#translatr opens that window straight away (handy for links).
        const deep = location.hash.slice(1)
        if (APPS[deep]) openApp(deep)
        welcome()
        // Achievement toasts for progress made in any game on the site (they share this storage).
        import('/achievements/list.js')
          .then((m) => {
            const run = () => {
              m.toast(m.check())
              m.sync?.() // signed in: onto the player's profile too
            }
            run()
            setInterval(run, 6000)
            addEventListener('storage', run)
          })
          .catch(() => {})
        // First time here: sign in, make an account, or carry on as a guest.
        onlineReady.then(() => !APPS[deep] && online?.firstVisit())
      })
    })
  addEventListener('hashchange', () => APPS[location.hash.slice(1)] && openApp(location.hash.slice(1)))
})()
