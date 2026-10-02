// nikstilOS Control Panel (nikstil.com/nikstil/). Edits /site.json, the settings the desktop
// (os/os.js) reads on every visit, and publishes it by committing to the site's GitHub repo.
//
// About the log-on: this is a static site, so the user name and password are checked in the
// browser and anyone who reads this file can get past the log-on screen. It only hides the page.
// What actually protects the site is the GitHub token: only someone with a token that can write to
// the repo can publish anything, and it is never stored anywhere but the browser it was typed into.
;(() => {
  'use strict'

  // SHA-256 of "user name\npassword". To change them, hash the new pair (for example
  // `printf 'name\npass' | sha256sum`) and put the result here.
  const LOGON_HASH = '017fc70352640f1aacb345e030a462555d70968336dd6366f4a8c5eb38a4cf61'
  const REPO = { owner: 'nikstil', name: 'nikstil.github.io' }
  const CONFIG_PATH = 'site.json'

  const SESSION_KEY = 'nikstil-admin-session'
  const TOKEN_KEY = 'nikstil-admin-token'
  const REPO_KEY = 'nikstil-admin-repo'
  const DRAFT_KEY = 'nikstil-preview' // os.js shows this draft at /?preview

  const THEMES = [
    ['aero', 'Aero (2009)'],
    ['retro', 'Retro 95 (1995)'],
    ['y2k', 'Y2K Cyber-Goth (1999)'],
    ['luna', 'Luna (2001)'],
    ['aqua', 'Aqua (2002)'],
    ['skeuo', 'Skeuomorphism (2010)'],
    ['metro', 'Metro (2012)'],
    ['minimal', 'Minimalist (2013)'],
    ['vapor', 'Vaporwave (199X)'],
    ['glass', 'Liquid Glass (2025)'],
  ]
  const APPS = [
    ['pc', '💻'],
    ['translatr', '🌐'],
    ['gif', '🎞️'],
    ['themes', '🎨'],
    ['bin', '🗑️'],
    ['doom', '👹'],
    ['grass', '🌱'],
    ['browser', '🧭'],
    ['leaderboard', '🏆'],
    ['messenger', '💬'],
    ['account', '👤'],
  ]
  const GIFS = [
    ['animation.gif', 'Shown first'],
    ['true.gif', 'Shown after a click'],
  ]
  // What site.json starts out as (the desktop's built-in defaults). Used to fill in anything missing.
  const DEFAULTS = {
    defaultTheme: 'aero',
    user: 'Guest',
    boot: 'Starting up. Please do not turn off your computer.',
    welcome: { title: '', text: '' },
    apps: {
      pc: { label: 'This PC', title: 'System Properties', hidden: false },
      translatr: { label: 'TRANSLATR™', title: 'TRANSLATR™ Ultra+ Pro Max', hidden: false },
      gif: { label: 'The GIF', title: 'animation.gif - Image Viewer', hidden: false },
      themes: { label: 'Themes', title: 'Themes', hidden: false },
      bin: { label: 'Recycle Bin', title: 'Recycle Bin', hidden: false },
      doom: { label: 'DOOMSCROLL.EXE', title: 'DOOMSCROLL.EXE', hidden: false },
      grass: { label: 'TOUCHGRASS.EXE', title: 'TOUCHGRASS.EXE', hidden: false },
      browser: { label: 'Web Browser', title: 'nikBrowser', hidden: false },
      leaderboard: { label: 'Leaderboards', title: 'Leaderboards', hidden: false },
      messenger: { label: 'Messenger', title: 'nikstil Messenger', hidden: false },
      account: { label: 'Account', title: 'Account', hidden: false },
    },
    links: [],
    pc: {
      rows: [
        ['Edition', 'nikstilOS Ultimate'],
        ['Version', '2026, build 1'],
        ['Memory', '640 KB (ought to be enough for anybody)'],
        ['System type', '8-bit operating system on a 64-bit browser'],
        ['Themes installed', '8'],
        ['Registered to', 'you, probably'],
      ],
      note: 'Genuine. Activated. Unlicensed for commercial use, emotional support or taxes.',
    },
    bin: {
      files: [
        { icon: '📄', name: 'old_homepage.html', note: '“Pick one.”', alert: '📄', text: 'Restore “Pick one.”? No. It’s in a better place now.' },
        { icon: '⚙️', name: 'motivation.exe', note: '0 KB', alert: '⚠️', text: 'motivation.exe has stopped working. It never really started.' },
        { icon: '📕', name: 'sleep_schedule.pdf', note: 'corrupted', alert: '⚠️', text: 'This file is corrupted beyond repair. Have you tried going to bed?' },
        { icon: '🧾', name: 'TRANSLATR_refund_policy.txt', note: '0 bytes', alert: '🧾', text: 'The file is empty. It was always empty.' },
        { icon: '💡', name: 'ending_ideas_v7_FINAL(2).docx', note: '', alert: '💡', text: 'Already used. There are nine endings now. Go find them.' },
      ],
      empty: 'Access denied: these files have unionised.',
    },
    online: { url: 'https://flxamobqsrrvmqmzautp.supabase.co', key: '' },
  }

  const $ = (sel, root = document) => root.querySelector(sel)
  const clone = (v) => JSON.parse(JSON.stringify(v))
  const store = {
    get(k, s = localStorage) {
      try {
        return s.getItem(k)
      } catch {
        return null
      }
    },
    set(k, v, s = localStorage) {
      try {
        if (v === null) s.removeItem(k)
        else s.setItem(k, v)
      } catch {
        // private mode: it just won't be remembered
      }
    },
  }

  /** Tiny element builder: h('div', { class: 'x', onclick }, child, 'text', …). */
  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag)
    let value
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null) continue
      if (k === 'class') el.className = v
      else if (k === 'value') value = v // set last, once the type and children are in
      else if (typeof v === 'function') el.addEventListener(k.slice(2), v)
      else if (typeof v === 'boolean') {
        if (k in el) el[k] = v
        else if (v) el.setAttribute(k, '')
      } else el.setAttribute(k, v)
    }
    el.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false))
    if (value !== undefined) el.value = value
    return el
  }

  // ================= Log on =================
  async function sha256(text) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  const logon = $('#logon')
  const form = $('#logon-form')
  const errorBox = $('#logon-error')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const user = $('#user').value.trim().toLowerCase()
    const pass = $('#pass').value
    let ok = false
    try {
      ok = (await sha256(`${user}\n${pass}`)) === LOGON_HASH
    } catch {
      // crypto.subtle needs https (or localhost)
    }
    if (ok) {
      store.set(SESSION_KEY, '1', sessionStorage)
      $('#pass').value = ''
      return openPanel()
    }
    errorBox.hidden = false
    $('.pw-row').hidden = true
    $('.field', form).hidden = true
    form.classList.remove('shake')
    void form.offsetWidth
    form.classList.add('shake')
    $('#logon-ok').focus()
  })
  $('#logon-ok').addEventListener('click', () => {
    errorBox.hidden = true
    $('.pw-row').hidden = false
    $('.field', form).hidden = false
    $('#pass').value = ''
    $('#pass').focus()
  })
  $('#logoff').addEventListener('click', () => {
    if (isDirty() && !confirm('You have unpublished changes. They stay saved in this browser. Log off anyway?')) return
    store.set(SESSION_KEY, null, sessionStorage)
    location.reload()
  })

  // ================= State =================
  let published = null // the settings as they are on the site (a JSON string)
  let remoteSha = null // site.json's blob sha on GitHub, needed to update it
  let draft = null // what's being edited
  let current = 'general'

  /** Fills in anything missing from DEFAULTS, keeping every value (and unknown key) that's there. */
  function normalize(data) {
    const out = data && typeof data === 'object' && !Array.isArray(data) ? clone(data) : {}
    for (const [k, v] of Object.entries(DEFAULTS)) {
      if (out[k] === undefined) out[k] = clone(v)
    }
    if (typeof out.welcome !== 'object' || !out.welcome) out.welcome = clone(DEFAULTS.welcome)
    if (typeof out.apps !== 'object' || !out.apps) out.apps = {}
    for (const [id] of APPS) out.apps[id] = { ...DEFAULTS.apps[id], ...(out.apps[id] || {}) }
    if (!Array.isArray(out.links)) out.links = []
    if (typeof out.online !== 'object' || !out.online) out.online = clone(DEFAULTS.online)
    if (typeof out.pc !== 'object' || !out.pc) out.pc = clone(DEFAULTS.pc)
    if (!Array.isArray(out.pc.rows)) out.pc.rows = clone(DEFAULTS.pc.rows)
    if (typeof out.bin !== 'object' || !out.bin) out.bin = clone(DEFAULTS.bin)
    if (!Array.isArray(out.bin.files)) out.bin.files = clone(DEFAULTS.bin.files)
    return out
  }
  const serialize = (data) => `${JSON.stringify(data, null, 2)}\n`
  const isDirty = () => draft !== null && published !== null && serialize(draft) !== published

  function changed() {
    store.set(DRAFT_KEY, isDirty() ? JSON.stringify(draft) : null)
    renderStatus()
    renderNav()
  }

  // ================= GitHub =================
  const token = () => store.get(TOKEN_KEY, sessionStorage) || store.get(TOKEN_KEY)
  function repo() {
    try {
      const r = JSON.parse(store.get(REPO_KEY))
      if (r?.owner && r?.name) return { owner: r.owner, name: r.name, branch: r.branch || '' }
    } catch {
      // fall through to the default
    }
    return { ...REPO, branch: '' }
  }
  let connection = null // { login, branch } once connected

  class GitHubError extends Error {
    constructor(status, message) {
      super(message)
      this.status = status
    }
  }
  async function gh(path, options = {}) {
    const t = token()
    if (!t) throw new GitHubError(401, 'Not connected to GitHub yet.')
    const res = await fetch(`https://api.github.com${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${t}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
    const body = res.status === 204 ? null : await res.json().catch(() => null)
    if (!res.ok) throw new GitHubError(res.status, body?.message || `GitHub said ${res.status}.`)
    return body
  }
  const repoPath = () => `/repos/${encodeURIComponent(repo().owner)}/${encodeURIComponent(repo().name)}`
  const contentsPath = (file) => `${repoPath()}/contents/${file.split('/').map(encodeURIComponent).join('/')}`

  function explain(err) {
    if (err instanceof GitHubError) {
      if (err.status === 401) return 'GitHub didn’t accept the token (it may have expired). Check it in Publishing.'
      if (err.status === 403) return 'The token can’t write to the repo. It needs Contents: Read and write on ' + `${repo().owner}/${repo().name}.`
      if (err.status === 404) return `GitHub can’t find ${repo().owner}/${repo().name} with this token. Did you give it access to that repository?`
      if (err.status === 409) return 'Someone (or another tab) changed the file since you loaded it. Reload and try again.'
      if (err.status === 422) return `GitHub refused the change: ${err.message}`
      return err.message
    }
    return navigator.onLine === false ? 'You’re offline.' : `Couldn’t reach GitHub (${err.message}).`
  }

  /** Checks the token and works out which branch the site is published from. */
  async function connect() {
    const r = repo()
    const [user, info] = await Promise.all([gh('/user'), gh(repoPath())])
    if (info.permissions && !info.permissions.push) throw new GitHubError(403, 'No write access.')
    let branch = r.branch
    if (!branch) {
      // The branch GitHub Pages builds from, if the token may see it; else the default branch.
      const pages = await gh(`${repoPath()}/pages`).catch(() => null)
      branch = pages?.source?.branch || info.default_branch
    }
    connection = { login: user.login, branch }
    return connection
  }

  /** Base64 of a string as UTF-8 (btoa alone only does Latin-1). */
  function base64Text(text) {
    const bytes = new TextEncoder().encode(text)
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return btoa(bin)
  }
  function decodeBase64Text(b64) {
    const bin = atob(b64.replace(/\s/g, ''))
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
  }
  const base64File = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1])
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  /** site.json straight from the repo (the site itself can lag a minute behind a publish). */
  async function loadFromGitHub() {
    const { branch } = connection || (await connect())
    try {
      const file = await gh(`${contentsPath(CONFIG_PATH)}?ref=${encodeURIComponent(branch)}`)
      remoteSha = file.sha
      return JSON.parse(decodeBase64Text(file.content))
    } catch (err) {
      if (err.status === 404) {
        remoteSha = null
        return null
      }
      throw err
    }
  }
  async function loadFromSite() {
    const res = await fetch(`/${CONFIG_PATH}`, { cache: 'no-cache' })
    return res.ok ? res.json() : null
  }

  /** Commits one file to the site's branch. `content` is base64. */
  async function commitFile(path, content, message, sha) {
    const { branch } = connection || (await connect())
    return gh(contentsPath(path), {
      method: 'PUT',
      body: JSON.stringify({ message, content, branch, ...(sha ? { sha } : {}) }),
    })
  }
  /** The current blob sha of a file in the repo root (works for big files too), or null. */
  async function shaOf(name) {
    const { branch } = connection || (await connect())
    const list = await gh(`${repoPath()}/contents/?ref=${encodeURIComponent(branch)}`)
    return list.find((f) => f.name === name)?.sha ?? null
  }

  // ================= Loading & publishing =================
  async function load({ quiet = false } = {}) {
    setStatus('Loading settings…', 'busy')
    let data = null
    let source = 'site'
    try {
      if (token()) {
        data = await loadFromGitHub()
        source = 'github'
      } else {
        data = await loadFromSite()
      }
    } catch (err) {
      toast(explain(err), true)
      data = await loadFromSite().catch(() => null)
    }
    published = serialize(normalize(data))
    // Unpublished edits from last time (kept in this browser) come back.
    let saved = null
    try {
      saved = JSON.parse(store.get(DRAFT_KEY))
    } catch {
      saved = null
    }
    draft = saved ? normalize(saved) : JSON.parse(published)
    if (saved && isDirty() && !quiet) toast('Restored your unpublished changes from last time.')
    changed()
    render()
    if (source === 'site' && !token()) setStatus('Connect to GitHub (under Publishing) to publish changes.', 'dirty')
  }

  async function publish() {
    if (isSecretKey(draft.online?.key)) {
      show('online')
      return toast('Not published: the Online key is a secret key. Use the publishable key.', true)
    }
    if (!token()) {
      show('publishing')
      return toast('Connect to GitHub first: that’s what lets this page change the site.', true)
    }
    if (!isDirty()) return toast('Nothing to publish: no changes.')
    const content = serialize(draft)
    busy(true)
    setStatus('Publishing…', 'busy')
    try {
      if (!connection) await connect()
      // Make sure nobody changed it in the meantime.
      const before = remoteSha
      const live = await loadFromGitHub()
      if (live && before && remoteSha !== before && serialize(normalize(live)) !== published) {
        if (!confirm('site.json was changed somewhere else since you opened this page. Publish yours over it?')) {
          busy(false)
          return renderStatus()
        }
      }
      const res = await commitFile(CONFIG_PATH, base64Text(content), 'Update site settings from the Control Panel', remoteSha)
      remoteSha = res.content.sha
      published = content
      changed()
      setStatus('Published. nikstil.com updates in a minute or so…', 'busy')
      watchDeploy(content)
    } catch (err) {
      setStatus(explain(err), 'error')
    } finally {
      busy(false)
    }
  }

  /** Polls the live site.json until the publish shows up (GitHub Pages takes ~1 minute). */
  let watching = 0
  async function watchDeploy(expected) {
    const run = ++watching
    const want = JSON.stringify(JSON.parse(expected))
    for (let i = 0; i < 30 && run === watching; i++) {
      await new Promise((r) => setTimeout(r, 10_000))
      try {
        const live = await loadFromSite()
        if (live && JSON.stringify(live) === want) {
          if (run === watching && !isDirty()) setStatus('Live on nikstil.com. ✓', 'ok')
          return
        }
      } catch {
        // keep trying
      }
    }
    if (run === watching && !isDirty()) setStatus('Published. If the site still looks old, give GitHub Pages another minute.', 'ok')
  }

  // ================= Status bar =================
  const statusEl = $('#status')
  function setStatus(text, kind = 'ok') {
    statusEl.textContent = text
    statusEl.className = `status is-${kind}`
  }
  function renderStatus() {
    if (isDirty()) setStatus('Unpublished changes (saved in this browser).', 'dirty')
    else setStatus('Everything’s published.', 'ok')
    $('#publish').disabled = !isDirty()
    $('#discard').disabled = !isDirty()
  }
  function busy(on) {
    for (const id of ['#publish', '#discard', '#preview']) $(id).disabled = on
  }
  let toastTimer = 0
  function toast(text, error = false) {
    const el = $('#toast')
    el.textContent = text
    el.classList.toggle('is-error', error)
    el.hidden = false
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (el.hidden = true), error ? 7000 : 4000)
  }

  $('#publish').addEventListener('click', publish)
  $('#discard').addEventListener('click', () => {
    if (!confirm('Throw away all unpublished changes?')) return
    draft = JSON.parse(published)
    changed()
    render()
  })
  $('#preview').addEventListener('click', () => {
    store.set(DRAFT_KEY, JSON.stringify(draft))
    window.open('/?preview', '_blank', 'noopener')
  })
  addEventListener('beforeunload', (e) => {
    // Edits survive in this browser anyway; this only guards a publish that's still running.
    if (statusEl.classList.contains('is-busy') && statusEl.textContent.startsWith('Publishing')) e.preventDefault()
  })

  // ================= Form helpers =================
  /** A text input bound to obj[key]. */
  function text(obj, key, props = {}) {
    return h('input', {
      type: 'text',
      value: obj[key] ?? '',
      ...props,
      oninput: (e) => {
        obj[key] = e.target.value
        props.onchanged?.(e.target)
        changed()
      },
    })
  }
  function area(obj, key, props = {}) {
    return h('textarea', {
      rows: 3,
      ...props,
      value: obj[key] ?? '',
      oninput: (e) => {
        obj[key] = e.target.value
        changed()
      },
    })
  }
  const row = (label, control, hint) => h('label', { class: 'row' }, h('span', {}, label), control, hint && h('small', {}, hint))

  /** Up / down / remove buttons for item `i` of `list`. */
  function tools(list, i, what) {
    const move = (d) => {
      const [x] = list.splice(i, 1)
      list.splice(i + d, 0, x)
      changed()
      render()
    }
    return h(
      'div',
      { class: 'item-tools' },
      h('button', { class: 'btn btn-small icon-btn', type: 'button', title: 'Move up', 'aria-label': `Move ${what} up`, disabled: i === 0, onclick: () => move(-1) }, '↑'),
      h('button', { class: 'btn btn-small icon-btn', type: 'button', title: 'Move down', 'aria-label': `Move ${what} down`, disabled: i === list.length - 1, onclick: () => move(1) }, '↓'),
      h(
        'button',
        {
          class: 'btn btn-small icon-btn btn-danger',
          type: 'button',
          title: 'Remove',
          'aria-label': `Remove ${what}`,
          onclick: () => {
            list.splice(i, 1)
            changed()
            render()
          },
        },
        '✕',
      ),
    )
  }

  /** Same rule as safeUrl() in os.js: web and mail links only. */
  function validUrl(u) {
    try {
      return ['http:', 'https:', 'mailto:'].includes(new URL(u, location.origin).protocol)
    } catch {
      return false
    }
  }

  // ================= Sections =================
  const SECTIONS = {
    general: { name: 'General', icon: '⚙️', render: renderGeneral },
    desktop: { name: 'Desktop icons', icon: '🖥️', render: renderDesktop },
    links: { name: 'Shortcuts', icon: '🔗', render: renderLinks },
    pc: { name: 'System Properties', icon: '💻', render: renderPc },
    bin: { name: 'Recycle Bin', icon: '🗑️', render: renderBin },
    gif: { name: 'The GIF', icon: '🎞️', render: renderGif },
    online: { name: 'Online', icon: '🌐', render: renderOnline },
    publishing: { name: 'Publishing', icon: '☁️', render: renderPublishing },
    advanced: { name: 'Advanced', icon: '🧰', render: renderAdvanced },
  }

  function renderGeneral() {
    const select = h(
      'select',
      {
        value: draft.defaultTheme,
        onchange: (e) => {
          draft.defaultTheme = e.target.value
          changed()
        },
      },
      THEMES.map(([id, name]) => h('option', { value: id }, name)),
    )
    return [
      h('h2', {}, 'General'),
      h('p', { class: 'intro' }, 'The basics of the desktop at nikstil.com.'),
      h(
        'div',
        { class: 'form' },
        row('Start menu name', text(draft, 'user', { maxlength: 40 }), 'Shown next to the picture at the top of the Start menu.'),
        row('Default theme', select, 'For first-time visitors. Anyone who has already picked a theme keeps theirs.'),
        row('Boot screen text', text(draft, 'boot', { maxlength: 120 }), 'Under the progress bar on the start-up screen.'),
        h('h3', {}, 'Welcome message'),
        h('p', { class: 'hint' }, 'Pops up once per visit after start-up (and again whenever you change it). Leave the message empty for none.'),
        row('Title', text(draft.welcome, 'title', { placeholder: 'Welcome', maxlength: 60 })),
        row('Message', area(draft.welcome, 'text', { placeholder: 'e.g. New ending just dropped in TRANSLATR™.', maxlength: 400 })),
      ),
    ]
  }

  function renderDesktop() {
    return [
      h('h2', {}, 'Desktop icons'),
      h('p', { class: 'intro' }, 'Rename the icons, change their window titles, or hide them. Hidden apps also leave the Start menu (links like nikstil.com/#gif still open them). Leaderboards, Messenger and Account only show once Online is set up.'),
      h('div', { class: 'app-head', 'aria-hidden': 'true' }, h('span'), h('span', {}, 'Icon label'), h('span', { class: 'app-title' }, 'Window title'), h('span', {}, 'Show')),
      h(
        'div',
        { class: 'apps' },
        APPS.map(([id, emoji]) => {
          const app = draft.apps[id]
          const r = h(
            'div',
            { class: `app-row${app.hidden ? ' is-off' : ''}` },
            h('span', { class: 'app-emoji', 'aria-hidden': 'true' }, emoji),
            h('label', { class: 'app-label' }, h('span', { class: 'sr-only' }, `${DEFAULTS.apps[id].label}: icon label`), text(app, 'label', { placeholder: DEFAULTS.apps[id].label, maxlength: 40 })),
            h('label', { class: 'app-title' }, h('span', { class: 'sr-only' }, `${DEFAULTS.apps[id].label}: window title`), text(app, 'title', { placeholder: DEFAULTS.apps[id].title, maxlength: 60 })),
            h(
              'label',
              { class: 'check app-show', title: 'Show on the desktop' },
              h('input', {
                type: 'checkbox',
                checked: !app.hidden,
                onchange: (e) => {
                  app.hidden = !e.target.checked
                  r.classList.toggle('is-off', app.hidden)
                  changed()
                },
              }),
              h('span', { class: 'sr-only' }, `Show ${DEFAULTS.apps[id].label}`),
            ),
          )
          return r
        }),
      ),
      h('p', { class: 'hint' }, 'An empty label or title keeps the default.'),
    ]
  }

  function renderLinks() {
    const list = draft.links
    const urlInput = (link) => {
      const input = text(link, 'url', {
        type: 'url',
        placeholder: 'https://… or /translatr/',
        onchanged: (el) => el.classList.toggle('is-invalid', !!el.value && !validUrl(el.value)),
      })
      input.classList.toggle('is-invalid', !!link.url && !validUrl(link.url))
      return input
    }
    return [
      h('h2', {}, 'Shortcuts'),
      h('p', { class: 'intro' }, 'Extra desktop icons (also added to the Start menu) that open a link: your socials, a project, anything. Links to other sites open in a new tab.'),
      h(
        'div',
        { class: 'list' },
        list.length === 0 && h('div', { class: 'empty' }, 'No shortcuts yet.'),
        list.map((link, i) =>
          h(
            'div',
            { class: 'item' },
            h(
              'div',
              { class: 'item-line' },
              h('label', {}, h('span', { class: 'sr-only' }, 'Icon (an emoji)'), text(link, 'icon', { class: 'emoji', placeholder: '🔗', maxlength: 8 })),
              h('label', { class: 'grow' }, h('span', { class: 'sr-only' }, 'Label'), text(link, 'label', { placeholder: 'Label', maxlength: 40 })),
              tools(list, i, 'shortcut'),
            ),
            h('label', {}, h('span', { class: 'sr-only' }, 'Link'), urlInput(link)),
          ),
        ),
      ),
      h(
        'button',
        {
          class: 'btn add',
          type: 'button',
          onclick: () => {
            list.push({ icon: '🔗', label: '', url: '' })
            changed()
            render()
            $('.item:last-child input[type="text"]:not(.emoji)', $('#content'))?.focus()
          },
        },
        '＋ Add shortcut',
      ),
      h('p', { class: 'hint' }, 'Shortcuts without a label or a valid link (http, https or mailto) are skipped.'),
    ]
  }

  function renderPc() {
    const rows = draft.pc.rows
    return [
      h('h2', {}, 'System Properties'),
      h('p', { class: 'intro' }, 'The “This PC” window: the spec sheet and the line under it.'),
      h(
        'div',
        { class: 'list' },
        rows.length === 0 && h('div', { class: 'empty' }, 'No rows.'),
        rows.map((r, i) =>
          h(
            'div',
            { class: 'item' },
            h(
              'div',
              { class: 'item-line' },
              h('label', { class: 'grow' }, h('span', { class: 'sr-only' }, 'Label'), text(r, 0, { placeholder: 'Label', maxlength: 40 })),
              h('label', { class: 'grow' }, h('span', { class: 'sr-only' }, 'Value'), text(r, 1, { placeholder: 'Value', maxlength: 120 })),
              tools(rows, i, 'row'),
            ),
          ),
        ),
      ),
      h(
        'button',
        {
          class: 'btn add',
          type: 'button',
          onclick: () => {
            rows.push(['', ''])
            changed()
            render()
          },
        },
        '＋ Add row',
      ),
      h('div', { class: 'form' }, h('h3', {}, 'Note'), row('Line under the specs', area(draft.pc, 'note', { maxlength: 300 }))),
    ]
  }

  function renderBin() {
    const files = draft.bin.files
    return [
      h('h2', {}, 'Recycle Bin'),
      h('p', { class: 'intro' }, 'The joke files. Opening one shows its message.'),
      h(
        'div',
        { class: 'list' },
        files.length === 0 && h('div', { class: 'empty' }, 'The Recycle Bin is empty. Suspiciously.'),
        files.map((f, i) =>
          h(
            'div',
            { class: 'item' },
            h(
              'div',
              { class: 'item-line' },
              h('label', {}, h('span', { class: 'sr-only' }, 'Icon (an emoji)'), text(f, 'icon', { class: 'emoji', placeholder: '📄', maxlength: 8 })),
              h('label', { class: 'grow' }, h('span', { class: 'sr-only' }, 'File name'), text(f, 'name', { placeholder: 'file_name.txt', maxlength: 60 })),
              tools(files, i, 'file'),
            ),
            h(
              'div',
              { class: 'item-line' },
              h('label', { class: 'grow' }, h('span', { class: 'sr-only' }, 'Detail'), text(f, 'note', { placeholder: 'Detail on the right, e.g. 0 KB', maxlength: 40 })),
              h('label', {}, h('span', { class: 'sr-only' }, 'Pop-up icon'), text(f, 'alert', { class: 'emoji', placeholder: '⚠️', maxlength: 8, title: 'Icon in the pop-up' })),
            ),
            h('label', {}, h('span', { class: 'sr-only' }, 'Message when opened'), area(f, 'text', { rows: 2, placeholder: 'Message when it’s opened', maxlength: 300 })),
          ),
        ),
      ),
      h(
        'button',
        {
          class: 'btn add',
          type: 'button',
          onclick: () => {
            files.push({ icon: '📄', name: '', note: '', alert: '📄', text: '' })
            changed()
            render()
          },
        },
        '＋ Add file',
      ),
      h('div', { class: 'form' }, h('h3', {}, 'Empty Recycle Bin'), row('Message when someone tries', text(draft.bin, 'empty', { maxlength: 200 }))),
    ]
  }

  function renderGif() {
    const card = ([name, when]) => {
      const img = h('img', { src: `/${name}?v=${Date.now()}`, alt: `${name} as it is on the site now` })
      const input = h('input', { type: 'file', accept: 'image/gif', class: 'sr-only', id: `pick-${name}` })
      const info = h('small', { class: 'muted' }, when)
      const upload = h('button', { class: 'btn btn-primary', type: 'button', disabled: true }, 'Upload')
      let file = null
      input.addEventListener('change', () => {
        file = input.files[0] || null
        if (!file) return
        if (file.type && file.type !== 'image/gif') {
          file = null
          return toast('That’s not a GIF.', true)
        }
        if (file.size > 25 * 1024 * 1024) {
          file = null
          return toast('That GIF is over 25 MB, too big to upload from here.', true)
        }
        img.src = URL.createObjectURL(file)
        info.textContent = `New: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB). Not uploaded yet.`
        upload.disabled = false
      })
      upload.addEventListener('click', async () => {
        if (!file) return
        if (!token()) {
          show('publishing')
          return toast('Connect to GitHub first.', true)
        }
        if (!confirm(`Replace ${name} on nikstil.com with ${file.name}? This goes live straight away.`)) return
        upload.disabled = true
        upload.textContent = 'Uploading…'
        try {
          const [content, sha] = await Promise.all([base64File(file), shaOf(name)])
          await commitFile(name, content, `Replace ${name} from the Control Panel`, sha)
          info.textContent = `Uploaded. It’s live in a minute or so (visitors may see the old one until their browser refreshes it).`
          toast(`${name} uploaded.`)
          file = null
        } catch (err) {
          toast(explain(err), true)
          upload.disabled = false
        } finally {
          upload.textContent = 'Upload'
        }
      })
      return h(
        'div',
        { class: 'gif-card' },
        img,
        h('b', {}, name),
        info,
        h('div', { class: 'item-line' }, input, h('label', { class: 'btn', for: `pick-${name}`, tabindex: '0', onkeydown: (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.click()) }, 'Choose GIF…'), upload),
      )
    }
    return [
      h('h2', {}, 'The GIF'),
      h('p', { class: 'intro' }, 'The two GIFs in the image viewer and at nikstil.com/gif/ (clicking swaps between them). Uploading replaces the file on the site right away: it doesn’t wait for Publish.'),
      h('div', { class: 'gifs' }, GIFS.map(card)),
    ]
  }

  function renderPublishing() {
    const r = repo()
    const conn = h('div', { class: 'conn' }, h('span', { class: 'conn-dot', 'aria-hidden': 'true' }), h('span', {}, token() ? 'Checking…' : 'Not connected.'))
    const setConn = (state, msg) => {
      conn.className = `conn${state ? ` is-${state}` : ''}`
      conn.lastChild.textContent = msg
    }
    const check = async () => {
      if (!token()) return setConn('', 'Not connected.')
      setConn('', 'Checking…')
      try {
        connection = null
        const c = await connect()
        setConn('ok', `Connected as ${c.login}. Publishing to ${repo().owner}/${repo().name}, branch ${c.branch}.`)
      } catch (err) {
        setConn('bad', explain(err))
      }
    }
    const tokenInput = h('input', { type: 'password', placeholder: token() ? '•••••••• (saved)' : 'github_pat_…', autocomplete: 'off', spellcheck: false })
    const remember = h('input', { type: 'checkbox', checked: !!store.get(TOKEN_KEY) })
    const save = async () => {
      const t = tokenInput.value.trim()
      if (!t) return toast('Paste a token first.', true)
      store.set(TOKEN_KEY, null)
      store.set(TOKEN_KEY, null, sessionStorage)
      store.set(TOKEN_KEY, t, remember.checked ? localStorage : sessionStorage)
      tokenInput.value = ''
      tokenInput.placeholder = '•••••••• (saved)'
      await check()
      // Now that it can, reload the settings straight from the repo (unpublished edits are kept:
      // they're saved in this browser and come back on load).
      if (conn.classList.contains('is-ok')) await load({ quiet: true })
    }
    const forget = () => {
      store.set(TOKEN_KEY, null)
      store.set(TOKEN_KEY, null, sessionStorage)
      connection = null
      tokenInput.placeholder = 'github_pat_…'
      setConn('', 'Not connected. The token was removed from this browser.')
    }
    const repoFields = { owner: r.owner, name: r.name, branch: r.branch }
    const saveRepo = () => {
      store.set(REPO_KEY, JSON.stringify(repoFields))
      connection = null
      check()
    }
    queueMicrotask(check)
    const tokenUrl =
      'https://github.com/settings/personal-access-tokens/new?name=nikstil.com%20Control%20Panel&description=Publishes%20settings%20from%20nikstil.com%2Fnikstil&expires_in=366&contents=write'
    return [
      h('h2', {}, 'Publishing'),
      h('p', { class: 'intro' }, 'nikstil.com is a static site on GitHub Pages, so “publishing” means committing the settings to the site’s repo. This page does that for you with a GitHub token.'),
      conn,
      h('h3', {}, 'Connect to GitHub'),
      h(
        'ol',
        { class: 'steps' },
        h('li', {}, 'Open ', h('a', { href: tokenUrl, target: '_blank', rel: 'noopener' }, 'GitHub → new fine-grained token'), ' (signed in as the account that owns the site).'),
        h('li', {}, 'Under ', h('b', {}, 'Repository access'), ', choose ', h('b', {}, 'Only select repositories'), ' → ', h('code', {}, `${r.owner}/${r.name}`), '.'),
        h('li', {}, 'Under ', h('b', {}, 'Permissions'), ', set ', h('b', {}, 'Contents'), ' to ', h('b', {}, 'Read and write'), ' (optionally ', h('b', {}, 'Pages: Read'), ' too). Generate it and paste it here.'),
      ),
      h(
        'div',
        { class: 'form' },
        row('Token', tokenInput),
        h('label', { class: 'check' }, remember, h('span', {}, 'Remember on this device (otherwise it’s forgotten when the tab closes)')),
        h('div', { class: 'button-row' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: save }, 'Connect'), h('button', { class: 'btn', type: 'button', onclick: forget }, 'Forget token')),
      ),
      h(
        'p',
        { class: 'note' },
        'The token stays in this browser and is only ever sent to api.github.com. Only remember it on your own devices. The user name and password in front of this page just hide it: they’re checked in the browser, so they can’t stop someone determined. The token is what actually protects the site, so don’t share it.',
      ),
      h(
        'details',
        {},
        h('summary', {}, 'Repository settings'),
        h(
          'div',
          { class: 'form' },
          row('Owner', text(repoFields, 'owner')),
          row('Repository', text(repoFields, 'name')),
          row('Branch', text(repoFields, 'branch', { placeholder: 'automatic (the one GitHub Pages uses)' }), 'Leave empty unless the site builds from a branch other than the default one.'),
          h('div', { class: 'button-row' }, h('button', { class: 'btn', type: 'button', onclick: saveRepo }, 'Save')),
        ),
      ),
    ]
  }

  function renderAdvanced() {
    const box = h('textarea', { class: 'json', spellcheck: false, value: serialize(draft), 'aria-label': 'site.json' })
    const apply = () => {
      try {
        draft = normalize(JSON.parse(box.value))
        changed()
        toast('Applied. Publish when you’re ready.')
      } catch (err) {
        toast(`That isn’t valid JSON: ${err.message}`, true)
      }
    }
    const download = () => {
      const url = URL.createObjectURL(new Blob([serialize(draft)], { type: 'application/json' }))
      h('a', { href: url, download: 'site.json' }).click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
    const reset = () => {
      if (!confirm('Reset every setting to the original defaults? (Nothing changes on the site until you publish.)')) return
      draft = clone(DEFAULTS)
      changed()
      render()
    }
    return [
      h('h2', {}, 'Advanced'),
      h('p', { class: 'intro' }, 'Everything above, as the raw site.json. Edit it here, or download it to upload to the repo by hand (it goes in the root, next to index.html).'),
      box,
      h(
        'div',
        { class: 'button-row' },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: apply }, 'Apply'),
        h('button', { class: 'btn', type: 'button', onclick: download }, 'Download site.json'),
        h('button', { class: 'btn btn-danger', type: 'button', onclick: reset }, 'Reset to defaults'),
      ),
    ]
  }

  // ================= Online =================
  /** A Supabase secret key must never go in site.json (it's public, and it bypasses every rule). */
  function isSecretKey(key) {
    key = (key ?? '').trim()
    if (key.startsWith('sb_secret_')) return true
    try {
      return JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role'
    } catch {
      return false
    }
  }
  const BRIDGE_TAG = '<script src="/online/translatr-bridge.js" defer></script>'

  async function copy(text, what) {
    try {
      await navigator.clipboard.writeText(text)
      toast(`${what} copied.`)
    } catch {
      toast('Couldn’t copy. Select it and copy it by hand.', true)
    }
  }

  function renderOnline() {
    const o = draft.online
    const keyInput = text(o, 'key', {
      placeholder: 'sb_publishable_… (or the legacy “anon” key, eyJ…)',
      spellcheck: false,
      onchanged: (el) => {
        el.classList.toggle('is-invalid', isSecretKey(el.value))
        warn.hidden = !isSecretKey(el.value)
        showState()
      },
    })
    const warn = h('p', { class: 'note note-bad', hidden: !isSecretKey(o.key) }, 'That’s a secret key. It must never go on the website: anyone could use it to do anything to your database. Use the publishable (or “anon”) key instead.')
    keyInput.classList.toggle('is-invalid', isSecretKey(o.key))
    const state = h('div', { class: 'conn' }, h('span', { class: 'conn-dot', 'aria-hidden': 'true' }), h('span'))
    function showState() {
      const on = !!(o.url?.trim() && o.key?.trim()) && !isSecretKey(o.key)
      state.classList.toggle('is-ok', on)
      state.lastChild.textContent = on ? 'Switched on (once published): Leaderboards and Messenger show on the desktop.' : 'Switched off: the online apps stay hidden until there’s a key.'
    }
    showState()
    const adminSql = "update public.profiles set is_admin = true where username = 'nikstil';"
    const code = (t) => h('code', {}, t)
    return [
      h('h2', {}, 'Online'),
      h('p', { class: 'intro' }, 'Accounts, the TRANSLATR™ leaderboards and nikstil Messenger. They run on your Supabase project; this site only holds its address and public key.'),
      state,
      h(
        'div',
        { class: 'form' },
        row('Supabase project URL', text(o, 'url', { placeholder: 'https://….supabase.co', spellcheck: false, onchanged: showState })),
        row('Publishable key', keyInput, 'Supabase → Project Settings → API Keys. This one is meant to be public.'),
        warn,
      ),
      h('h3', {}, 'Set up (once)'),
      h(
        'ol',
        { class: 'steps' },
        h('li', {}, 'In Supabase, open ', h('b', {}, 'SQL Editor → New query'), ', paste the setup SQL and press ', h('b', {}, 'Run'), '. ', h('button', { class: 'btn btn-small', type: 'button', onclick: async () => copy(await (await fetch('/supabase/schema.sql', { cache: 'no-cache' })).text(), 'Setup SQL') }, 'Copy setup SQL'), ' (It’s safe to run again after an update.)'),
        h('li', {}, 'In ', h('b', {}, 'Authentication → Sign In / Providers → Email'), ', turn ', h('b', {}, 'Confirm email'), ' off. Accounts are a username and password, so there’s no inbox to confirm.'),
        h('li', {}, 'In ', h('b', {}, 'Authentication → URL Configuration'), ', set the Site URL to ', code('https://nikstil.com'), '.'),
        h('li', {}, 'Paste the publishable key above and ', h('b', {}, 'Publish'), '.'),
        h('li', {}, 'On nikstil.com, open ', h('b', {}, 'Start → Account'), ' and create your account (do it straight away, so nobody else takes your name). Then make it an admin by running this in the SQL Editor: ', code(adminSql), ' ', h('button', { class: 'btn btn-small', type: 'button', onclick: () => copy(adminSql, 'SQL') }, 'Copy'), ' (change the name if yours is different).'),
      ),
      h('h3', {}, 'TRANSLATR™ connection'),
      renderBridge(),
      h('h3', {}, 'Moderation'),
      renderModeration(),
    ]
  }

  /** Checks that the game page still loads the leaderboard script (a new game upload replaces it). */
  function renderBridge() {
    const box = h('div', { class: 'conn' }, h('span', { class: 'conn-dot', 'aria-hidden': 'true' }), h('span', {}, 'Checking…'))
    const fix = h('button', { class: 'btn btn-primary', type: 'button', hidden: true }, 'Reconnect')
    const say = (state, msg) => {
      box.className = `conn${state ? ` is-${state}` : ''}`
      box.lastChild.textContent = msg
    }
    async function currentPage() {
      if (!token()) return { html: await (await fetch('/translatr/index.html', { cache: 'no-cache' })).text(), sha: null }
      const { branch } = connection || (await connect())
      const file = await gh(`${contentsPath('translatr/index.html')}?ref=${encodeURIComponent(branch)}`)
      return { html: decodeBase64Text(file.content), sha: file.sha }
    }
    async function check() {
      try {
        const { html } = await currentPage()
        const ok = html.includes('/online/translatr-bridge.js')
        say(ok ? 'ok' : 'bad', ok ? 'Connected: TRANSLATR™ posts speedruns and Daily Challenges to the leaderboards.' : 'Disconnected: the game page no longer loads the leaderboard script (a new game upload replaces translatr/index.html). Runs won’t be posted until it’s reconnected.')
        fix.hidden = ok
      } catch (err) {
        say('bad', `Couldn’t check: ${explain(err)}`)
      }
    }
    fix.addEventListener('click', async () => {
      if (!token()) {
        show('publishing')
        return toast('Connect to GitHub first.', true)
      }
      fix.disabled = true
      try {
        const { html, sha } = await currentPage()
        if (html.includes('/online/translatr-bridge.js')) return check()
        const tag = `    <!-- nikstil.com online: posts speedruns and Daily Challenges to the leaderboards. Keep this line when uploading a new build. -->\n    ${BRIDGE_TAG}\n`
        const next = html.includes('</head>') ? html.replace('</head>', `${tag}  </head>`) : tag + html
        await commitFile('translatr/index.html', base64Text(next), 'Reconnect TRANSLATR to the online leaderboards', sha)
        say('ok', 'Reconnected. It’s live in a minute or so.')
        fix.hidden = true
      } catch (err) {
        toast(explain(err), true)
      } finally {
        fix.disabled = false
      }
    })
    queueMicrotask(check)
    return h('div', { class: 'form' }, box, h('div', { class: 'button-row' }, fix))
  }

  /** Reports, runs and bans. Needs a site account that's an admin (checked by the server). */
  function renderModeration() {
    const wrap = h('div', { class: 'mod' }, h('p', { class: 'muted' }, 'Loading…'))
    const online = window.nikstilOnline
    const fail = (err) => wrap.replaceChildren(h('p', { class: 'note note-bad' }, online ? online.errorText(err) : String(err)))

    async function start() {
      if (!online || !(await online.configured)) {
        return wrap.replaceChildren(h('p', { class: 'muted' }, 'Moderation works once online features are switched on and published.'))
      }
      const me = await online.me().catch(() => null)
      if (!me) return signInForm()
      if (!me.is_admin) {
        return wrap.replaceChildren(
          h('p', { class: 'note' }, `You’re signed in as ${me.username}, which isn’t an admin. Run the admin SQL from step 5 for this account, then reload.`),
          h('div', { class: 'button-row' }, h('button', { class: 'btn', type: 'button', onclick: async () => (await online.signOut(), start()) }, 'Sign out')),
        )
      }
      panel(me)
    }

    function signInForm() {
      const user = h('input', { type: 'text', autocomplete: 'username', placeholder: 'Your nikstil.com username', spellcheck: false })
      const pass = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Password' })
      const err = h('p', { class: 'note note-bad', hidden: true })
      const go = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Sign in')
      const form = h(
        'form',
        {
          class: 'form',
          onsubmit: async (e) => {
            e.preventDefault()
            go.disabled = true
            err.hidden = true
            try {
              await online.signIn(user.value, pass.value)
              start()
            } catch (x) {
              err.textContent = online.errorText(x)
              err.hidden = false
            } finally {
              go.disabled = false
            }
          },
        },
        h('p', { class: 'hint' }, 'Sign in with your nikstil.com account (the one you made admin in step 5). The server checks it, so this part can’t be got around.'),
        row('Username', user),
        row('Password', pass),
        err,
        h('div', { class: 'button-row' }, go),
      )
      wrap.replaceChildren(form)
    }

    const fmt = (ms) => {
      if (ms == null) return '—'
      const s = Math.floor(ms / 1000)
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.${String(Math.floor(ms / 10) % 100).padStart(2, '0')}`
    }
    const date = (iso) => (iso ? new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '')

    async function panel(me) {
      const reports = h('div', { class: 'list' }, h('p', { class: 'muted' }, 'Loading…'))
      const runs = h('div', { class: 'list' }, h('p', { class: 'muted' }, 'Loading…'))
      const who = h('input', { type: 'text', placeholder: 'Username', spellcheck: false })
      async function setBan(id, name, banned) {
        if (banned && !confirm(`Ban ${name}? They can’t post runs or send messages, and they drop off the leaderboards.`)) return
        try {
          await online.admin.setBanned(id, banned)
          toast(`${name} ${banned ? 'banned' : 'unbanned'}.`)
          loadReports()
          loadRuns()
        } catch (err) {
          toast(online.errorText(err), true)
        }
      }
      async function loadReports() {
        try {
          const list = await online.admin.reports(true)
          reports.replaceChildren(
            ...(list.length ? [] : [h('div', { class: 'empty' }, 'No open reports. 🎉')]),
            ...list.map((r) =>
              h(
                'div',
                { class: 'item' },
                h('div', { class: 'item-line' }, h('b', { class: 'grow' }, `${r.reporter ?? 'Someone'} reported ${r.reported_name}${r.reported_banned ? ' (banned)' : ''}`), h('small', { class: 'muted' }, date(r.created_at))),
                h('p', {}, `“${r.reason}”`),
                r.message_body && h('p', { class: 'quote' }, r.message_body),
                h(
                  'div',
                  { class: 'button-row' },
                  h('button', { class: 'btn', type: 'button', onclick: async () => (await online.admin.resolve(r.id).catch((e) => toast(online.errorText(e), true)), loadReports()) }, 'Mark resolved'),
                  h('button', { class: `btn ${r.reported_banned ? '' : 'btn-danger'}`, type: 'button', onclick: () => setBan(r.reported, r.reported_name, !r.reported_banned) }, r.reported_banned ? 'Unban' : `Ban ${r.reported_name}`),
                ),
              ),
            ),
          )
        } catch (err) {
          reports.replaceChildren(h('p', { class: 'note note-bad' }, online.errorText(err)))
        }
      }
      async function loadRuns() {
        try {
          const list = await online.admin.recentRuns(100)
          runs.replaceChildren(
            ...(list.length ? [] : [h('div', { class: 'empty' }, 'No runs yet.')]),
            h(
              'div',
              { class: 'table-wrap' },
              h(
                'table',
                { class: 'runs' },
                h('thead', {}, h('tr', {}, ['Player', 'Board', 'Time', 'Server', 'Status', 'When', ''].map((t) => h('th', {}, t)))),
                h(
                  'tbody',
                  {},
                  list.map((r) =>
                    h(
                      'tr',
                      { class: `is-${r.status}` },
                      h('td', {}, r.username),
                      h('td', {}, r.mode === 'daily' ? `Daily ${r.day}` : r.ending ?? ''),
                      h('td', {}, fmt(r.time_ms)),
                      h('td', { title: r.note ?? '' }, fmt(r.server_ms)),
                      h('td', { title: r.note ?? '' }, r.status),
                      h('td', {}, date(r.finished_at)),
                      h(
                        'td',
                        {},
                        (r.status === 'finished' || r.status === 'removed') &&
                          h(
                            'button',
                            {
                              class: 'btn btn-small',
                              type: 'button',
                              onclick: async () => {
                                try {
                                  await online.admin.setRunRemoved(r.id, r.status === 'finished', r.status === 'finished' ? `Removed by ${me.username}` : null)
                                  loadRuns()
                                } catch (err) {
                                  toast(online.errorText(err), true)
                                }
                              },
                            },
                            r.status === 'finished' ? 'Remove' : 'Restore',
                          ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          )
        } catch (err) {
          runs.replaceChildren(h('p', { class: 'note note-bad' }, online.errorText(err)))
        }
      }
      const banBy = async (banned) => {
        const name = who.value.trim()
        if (!name) return
        const p = await online.findPlayer(name, { includeBanned: true }).catch(() => null)
        if (!p) return toast(`Nobody called “${name}”.`, true)
        if (p.banned === banned) return toast(`${p.username} is ${banned ? 'already' : 'not'} banned.`)
        setBan(p.id, p.username, banned)
      }
      wrap.replaceChildren(
        h('div', { class: 'item-line' }, h('span', { class: 'grow' }, `Signed in as ${me.username} (admin).`), h('button', { class: 'btn btn-small', type: 'button', onclick: async () => (await online.signOut(), start()) }, 'Sign out')),
        h('h3', {}, 'Open reports'),
        reports,
        h('h3', {}, 'Recent runs'),
        h('p', { class: 'hint' }, '“Server” is how long the server saw the run take. Removing a run takes it off the leaderboards (you can restore it).'),
        runs,
        h('h3', {}, 'Ban or unban a player'),
        h(
          'div',
          { class: 'item-line' },
          h('label', { class: 'grow' }, h('span', { class: 'sr-only' }, 'Username'), who),
          h('button', { class: 'btn btn-danger', type: 'button', onclick: () => banBy(true) }, 'Ban'),
          h('button', { class: 'btn', type: 'button', onclick: () => banBy(false) }, 'Unban'),
        ),
      )
      loadReports()
      loadRuns()
    }

    queueMicrotask(start)
    return wrap
  }

  // ================= Rendering =================
  /** Which sections have unpublished edits (a dot in the sidebar). */
  function dirtySections() {
    if (!isDirty()) return new Set()
    const a = draft
    const b = JSON.parse(published)
    const differs = (...keys) => keys.some((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
    const out = new Set()
    if (differs('user', 'defaultTheme', 'boot', 'welcome')) out.add('general')
    if (differs('apps')) out.add('desktop')
    if (differs('links')) out.add('links')
    if (differs('pc')) out.add('pc')
    if (differs('bin')) out.add('bin')
    if (differs('online')) out.add('online')
    return out
  }
  function renderNav() {
    const dirty = dirtySections()
    $('#side').replaceChildren(
      ...Object.entries(SECTIONS).map(([id, s]) =>
        h(
          'button',
          { type: 'button', 'aria-current': String(id === current), onclick: () => show(id) },
          h('span', { 'aria-hidden': 'true' }, s.icon),
          s.name,
          dirty.has(id) && h('span', { class: 'dot', title: 'Unpublished changes' }),
        ),
      ),
    )
  }
  function render() {
    renderNav()
    $('#content').replaceChildren(...SECTIONS[current].render().flat())
  }
  function show(id) {
    current = id
    history.replaceState(null, '', `#${id}`)
    render()
    $('#content').scrollIntoView({ block: 'nearest' })
  }

  function openPanel() {
    logon.hidden = true
    $('#cp').hidden = false
    const hash = location.hash.slice(1)
    if (SECTIONS[hash]) current = hash
    load()
  }

  // ================= Start =================
  if (store.get(SESSION_KEY, sessionStorage)) openPanel()
  else $('#user').focus()
})()
