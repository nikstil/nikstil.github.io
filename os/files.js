// File Explorer for nikstilOS: a pretend C: drive. Your own folders and text files (under
// C:\Users\Guest) are kept in this browser; the rest is read-only: nikstilOS's "system files",
// Program Files with a shortcut to every app, the pictures on the site, and the games' real save
// files (AppData), which open in Notepad. Notepad and a picture viewer come with it.

const KEY = 'nikstilos-files'
const $ = (s, el = document) => el.querySelector(s)
const now = () => Date.now()

// ================= The part you own =================
function seed() {
  const t = now()
  const f = (n, text) => ({ n, k: 'f', t: text, m: t })
  const d = (n, c = []) => ({ n, k: 'd', c, m: t })
  return d('Guest', [
    d('Desktop'),
    d('Documents', [
      f('todo.txt', '1. finish TRANSLATR\n2. touch grass\n3. defuse the bomb\n4. stop opening this file'),
      f('passwords.txt', 'hunter2\n\n(the rest are written on a sticky note under the keyboard)'),
      f('business plan.txt', 'Step 1: translate things\nStep 2: ???\nStep 3: sell TRANSLATR™ Ultra+ Pro Max for $4.99/month'),
    ]),
    d('Pictures'),
    d('Downloads'),
    d('Music', [f('playlist.txt', 'Never Gonna Give You Up\nNever Gonna Give You Up (Remix)\nNever Gonna Give You Up (Live)')]),
  ])
}
let state = load()
function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (v?.root?.k === 'd') return v
  } catch {}
  return { root: seed(), opened: false }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {}
  for (const fn of listeners) fn()
}
const listeners = new Set()
export const onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn))

const HOME = ['C:', 'Users', 'Guest']
const isHome = (p) => p.length >= 3 && p[0] === 'C:' && p[1] === 'Users' && p[2] === 'Guest'
/** The folder node for a path under Guest (or null). */
function ownNode(path) {
  if (!isHome(path)) return null
  let node = state.root
  for (const name of path.slice(3)) {
    node = node.c?.find((x) => x.n === name && x.k === 'd')
    if (!node) return null
  }
  return node
}

// ================= The read-only parts =================
const APP_FILES = [
  ['translatr', 'TRANSLATR™', 'translatr.exe'],
  ['strife', 'COUNTER-STRIFE', 'strife.exe'],
  ['doom', 'DOOMSCROLL', 'DOOMSCROLL.EXE'],
  ['grass', 'LAWN OF THE DEAD', 'lawn.exe'],
  ['phone', 'BRAINS FIRST', 'brains.exe'],
  ['loggle', 'LOGGLE', 'loggle.exe'],
  ['browser', 'BobbyBrowser', 'bobby.exe'],
  ['mobile', 'LigmaPhone', 'ligmaphone.exe'],
  ['achievements', 'Achievements', 'achievements.exe'],
  ['themes', 'Themes', 'themes.exe'],
  ['files', 'File Explorer', 'explorer.exe'],
  ['terminal', 'Command Prompt', 'cmd.exe'],
]
const SAVES = [
  ['translatr-save', 'TRANSLATR™'],
  ['strife-inventory', 'COUNTER-STRIFE'],
  ['strife-stats', 'COUNTER-STRIFE'],
  ['strife-record', 'COUNTER-STRIFE'],
  ['strife-settings', 'COUNTER-STRIFE'],
  ['doomscroll-save', 'DOOMSCROLL'],
  ['touchgrass-save', 'LAWN OF THE DEAD'],
  ['touchphone-save', 'BRAINS FIRST'],
  ['loggle-save', 'LOGGLE'],
  ['nikstil-achievements', 'Achievements'],
  ['nikstilos-files', 'nikstilOS'],
  ['nikstilos-icons', 'nikstilOS'],
]
const SYS = {
  'kernel.exe': 'Please do not double-click the kernel.',
  'boot.ini': '[boot loader]\ntimeout=30\ndefault=nikstilOS\n\n[operating systems]\nnikstilOS="nikstilOS Ultimate" /fastdetect /noexecute=optin /vibes=immaculate',
  'hosts': '127.0.0.1  localhost\n127.0.0.1  responsibilities.com\n127.0.0.1  inbox-zero.org',
  'win.ini': '[fonts]\nComic Sans=yes\n\n[extensions]\n.txt=notepad.exe\n.gif=animation.gif\n.exe=probably fine',
  'error.log': '[00:00:01] nikstilOS started\n[00:00:02] user opened TRANSLATR\n[00:00:03] productivity: not found\n[00:00:04] warning: too many tabs\n[00:00:05] error: coffee.dll missing',
}
const DOWNLOADS = [
  ['definitely_not_a_virus.exe', '🦠', 'Windows Defender? Never heard of it. Running anyway… just kidding. Nothing happened. Probably.'],
  ['free_RAM_download.zip', '🗜️', 'You now have 640 KB more RAM. (You don’t.)'],
  ['TRANSLATR_crack_v2.exe', '💿', 'Nice try. The CEO dog has been notified.'],
]
const PICTURES = [
  ['animation.gif', '/animation.gif'],
  ['true.gif', '/true.gif'],
  ['og-image.png', '/og-image.png'],
  ['counter-strife.png', '/strife/og-image.png'],
  ['doomscroll.png', '/doomscroll/og-image.png'],
  ['lawn-of-the-dead.png', '/touchgrass/og-image.png'],
]
const sizeOf = (s) => new Blob([s ?? '']).size
export const fmtSize = (n) => (n < 1024 ? `${n} bytes` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`)

/**
 * What's in a folder: [{ name, kind, icon, size, ro, open?, path, text?, url?, app? }].
 * kind: 'dir' | 'txt' | 'img' | 'app' | 'save' | 'drive' | 'bin' | 'joke'
 */
export function list(path) {
  const P = (...p) => [...path, ...p]
  if (!path.length)
    return [
      { name: 'Local Disk (C:)', kind: 'drive', icon: '💽', path: ['C:'], ro: true, size: 0 },
      { name: 'Recycle Bin', kind: 'bin', icon: '🗑️', ro: true, app: 'bin' },
    ]
  const [drive, ...rest] = path
  if (drive !== 'C:') return null
  const key = rest.join('/')
  if (!rest.length)
    return [
      dir('nikstilOS', P('nikstilOS'), true, '🪟'),
      dir('Program Files', P('Program Files'), true),
      dir('Users', P('Users'), true),
      dir('AppData', P('AppData'), true),
    ]
  if (key === 'nikstilOS') return [dir('System32', P('System32'), true), ...Object.keys(SYS).filter((k) => k === 'boot.ini' || k === 'win.ini').map((n) => sysFile(n, P(n)))]
  if (key === 'nikstilOS/System32') return [dir('drivers', P('drivers'), true), ...Object.keys(SYS).filter((k) => k !== 'boot.ini' && k !== 'win.ini').map((n) => sysFile(n, P(n)))]
  if (key === 'nikstilOS/System32/drivers') return [joke('printer.sys', '🖨️', 'PC LOAD LETTER', P('printer.sys')), joke('coffee.dll', '☕', 'coffee.dll is missing. Please insert coffee and try again.', P('coffee.dll'))]
  if (key === 'Program Files') return APP_FILES.map(([id, name]) => dir(name, P(name), true, '📁'))
  if (rest[0] === 'Program Files' && rest.length === 2) {
    const a = APP_FILES.find((x) => x[1] === rest[1])
    if (!a) return null
    return [
      { name: a[2], kind: 'app', icon: '⚙️', app: a[0], ro: true, path: P(a[2]), size: 4096 + a[2].length * 997 },
      { name: 'readme.txt', kind: 'txt', icon: '📄', ro: true, path: P('readme.txt'), text: `${a[1]}\n\nDouble-click ${a[2]} to start it. Or use the desktop, like a normal person.`, size: 90 },
    ]
  }
  if (key === 'AppData') return [dir('nikstil', P('nikstil'), true)]
  if (key === 'AppData/nikstil') return [dir('Saves', P('Saves'), true, '💾')]
  if (key === 'AppData/nikstil/Saves')
    return SAVES.map(([k, game]) => {
      let raw = null
      try {
        raw = localStorage.getItem(k)
      } catch {}
      return raw == null ? null : { name: `${k}.json`, kind: 'save', icon: '💾', ro: true, path: P(`${k}.json`), storageKey: k, game, size: sizeOf(raw) }
    }).filter(Boolean)
  if (key === 'Users') return [dir('Guest', P('Guest'), true, '🙂'), dir('Public', P('Public'), true)]
  if (key === 'Users/Public') return [{ name: 'shared.txt', kind: 'txt', icon: '📄', ro: true, path: P('shared.txt'), text: 'Everyone can read this. Nobody has.', size: 35 }]
  // your own folders, with a few extras mixed in
  const node = ownNode(path)
  if (!node) return null
  const out = node.c.map((x) => (x.k === 'd' ? dir(x.n, P(x.n), false) : { name: x.n, kind: /\.txt$/i.test(x.n) ? 'txt' : 'file', icon: '📄', ro: false, path: P(x.n), node: x, size: sizeOf(x.t), m: x.m }))
  const sub = rest.slice(2).join('/')
  if (sub === 'Pictures') for (const [n, url] of PICTURES) out.push({ name: n, kind: 'img', icon: '🖼️', url, ro: true, path: P(n), size: 0 })
  if (sub === 'Downloads') for (const [n, icon, text] of DOWNLOADS) out.push(joke(n, icon, text, P(n)))
  return out
}
function dir(name, path, ro, icon = '📁') {
  return { name, kind: 'dir', icon, path, ro }
}
function sysFile(name, path) {
  return { name, kind: name.endsWith('.exe') ? 'joke' : 'txt', icon: name.endsWith('.exe') ? '⚙️' : '📄', ro: true, path, text: SYS[name], size: sizeOf(SYS[name]), alert: name.endsWith('.exe') ? SYS[name] : null }
}
function joke(name, icon, text, path) {
  return { name, kind: 'joke', icon, ro: true, path, alert: text, size: 1337 }
}
export const pathText = (p) => (p.length ? p[0] + '\\' + p.slice(1).join('\\') : 'This PC')

// ================= Changing things =================
const BAD = /[\\/:*?"<>|]/
function uniqueName(node, base, ext = '') {
  let name = base + ext
  for (let i = 2; node.c.some((x) => x.n.toLowerCase() === name.toLowerCase()); i++) name = `${base} (${i})${ext}`
  return name
}
export function newFolder(path) {
  const node = ownNode(path)
  if (!node) return null
  const n = uniqueName(node, 'New folder')
  node.c.push({ n, k: 'd', c: [], m: now() })
  save()
  return n
}
export function newText(path) {
  const node = ownNode(path)
  if (!node) return null
  const n = uniqueName(node, 'New Text Document', '.txt')
  node.c.push({ n, k: 'f', t: '', m: now() })
  save()
  return n
}
/** Renames an entry in a folder you own. Returns '' or why not. */
export function rename(path, from, to) {
  const node = ownNode(path)
  to = String(to ?? '').trim()
  if (!node) return 'Access denied.'
  if (!to) return 'A file name can’t be empty.'
  if (BAD.test(to)) return 'A file name can’t contain any of these characters: \\ / : * ? " < > |'
  const it = node.c.find((x) => x.n === from)
  if (!it) return 'It’s gone.'
  if (to !== from && node.c.some((x) => x.n.toLowerCase() === to.toLowerCase())) return 'There is already a file with that name.'
  if (path.length === 3 && ['Desktop', 'Documents', 'Pictures', 'Downloads', 'Music'].includes(from) && it.k === 'd') return 'That folder belongs to nikstilOS. Leave it be.'
  it.n = to
  it.m = now()
  save()
  return ''
}
export function remove(path, name) {
  const node = ownNode(path)
  if (!node) return 'Access denied.'
  if (path.length === 3 && ['Desktop', 'Documents', 'Pictures', 'Downloads', 'Music'].includes(name)) return 'You can’t delete that one. nikstilOS needs it (to feel complete).'
  const i = node.c.findIndex((x) => x.n === name)
  if (i < 0) return ''
  node.c.splice(i, 1)
  save()
  return ''
}
export function writeText(path, name, text) {
  const node = ownNode(path)
  const it = node?.c.find((x) => x.n === name && x.k === 'f')
  if (!it) return false
  it.t = String(text).slice(0, 200000)
  it.m = now()
  save()
  return true
}
/** Writes a text file in a folder you own (making it if needed; append adds to the end). Returns '' or why not. */
export function putText(path, name, text, append = false) {
  const node = ownNode(path)
  name = String(name ?? '').trim()
  if (!node) return 'Access is denied.'
  if (!name || BAD.test(name)) return 'The filename, directory name, or volume label syntax is incorrect.'
  let it = node.c.find((x) => x.n.toLowerCase() === name.toLowerCase())
  if (it && it.k !== 'f') return 'Access is denied.'
  if (!it) node.c.push((it = { n: name, k: 'f', t: '', m: now() }))
  it.t = String((append ? it.t + '\n' : '') + text).replace(/^\n/, '').slice(0, 200000)
  it.m = now()
  save()
  return ''
}
/** Makes a folder with this name in a folder you own. Returns '' or why not. */
export function makeDir(path, name) {
  const node = ownNode(path)
  name = String(name ?? '').trim()
  if (!node) return 'Access is denied.'
  if (!name || BAD.test(name)) return 'The filename, directory name, or volume label syntax is incorrect.'
  if (node.c.some((x) => x.n.toLowerCase() === name.toLowerCase())) return `A subdirectory or file ${name} already exists.`
  node.c.push({ n: name, k: 'd', c: [], m: now() })
  save()
  return ''
}
/** The text inside a listed item (your files, the read-only ones, the games' saves), or null. */
export function textOf(it) {
  if (!it) return null
  if (it.node) return it.node.t ?? ''
  if (it.storageKey) {
    try {
      return localStorage.getItem(it.storageKey)
    } catch {
      return null
    }
  }
  return it.text ?? null
}
export function markOpened() {
  if (state.opened) return
  state.opened = true
  save()
}
export const DESKTOP = [...HOME, 'Desktop']
export const homeOf = (name) => [...HOME, name]

// ================= The window =================
/**
 * os: { openApp, msgbox, askbox, makeWindow, closeWin, showMenu(items, x, y, title), focusWin }
 * opts: { path } to start somewhere.
 */
export function initExplorer(el, win, os, opts = {}) {
  let path = opts.path ?? homeOf('Documents')
  const back = []
  const fwd = []
  let view = 'icons'
  let selected = null
  let query = ''
  const body = $('.fx', el)
  body.innerHTML = `
    <div class="fx-bar">
      <button class="fx-btn fx-back" title="Back" aria-label="Back">◀</button>
      <button class="fx-btn fx-fwd" title="Forward" aria-label="Forward">▶</button>
      <button class="fx-btn fx-up" title="Up one level" aria-label="Up">⬆</button>
      <nav class="fx-crumbs" aria-label="Location"></nav>
      <input class="fx-search" type="search" placeholder="Search" aria-label="Search this folder">
    </div>
    <div class="fx-tools">
      <button class="fx-tool fx-newdir">📁 New folder</button>
      <button class="fx-tool fx-newtxt">📄 New text document</button>
      <span class="fx-sep"></span>
      <button class="fx-tool fx-view">☷ Details</button>
    </div>
    <div class="fx-main">
      <aside class="fx-side">
        <h4>Quick access</h4>
        <button data-go="Desktop">🖥️ Desktop</button>
        <button data-go="Documents">📄 Documents</button>
        <button data-go="Pictures">🖼️ Pictures</button>
        <button data-go="Downloads">⬇️ Downloads</button>
        <button data-go="Music">🎵 Music</button>
        <h4>This PC</h4>
        <button data-path="">💻 This PC</button>
        <button data-path="C:">💽 Local Disk (C:)</button>
        <button data-path="C:/Program Files">📦 Program Files</button>
        <button data-path="C:/AppData/nikstil/Saves">💾 Game saves</button>
      </aside>
      <div class="fx-list" tabindex="0" role="listbox" aria-label="Files"></div>
    </div>`
  const foot = $('.fx-status', el)
  const listEl = $('.fx-list', body)

  function go(p, push = true) {
    if (list(p) == null) return
    if (push) {
      back.push(path)
      fwd.length = 0
    }
    path = p
    selected = null
    query = ''
    $('.fx-search', body).value = ''
    render()
  }
  function render() {
    const items = (list(path) ?? []).filter((x) => !query || x.name.toLowerCase().includes(query.toLowerCase()))
    const sorted = items.sort((a, b) => (b.kind === 'dir') - (a.kind === 'dir') || a.name.localeCompare(b.name, undefined, { numeric: true }))
    // address bar
    const crumbs = $('.fx-crumbs', body)
    crumbs.replaceChildren()
    const parts = [['This PC', []], ...path.map((p, i) => [i === 0 ? 'Local Disk (C:)' : p, path.slice(0, i + 1)])]
    parts.forEach(([label, p], i) => {
      if (i) crumbs.append(Object.assign(document.createElement('span'), { textContent: '›', className: 'fx-chev' }))
      const b = document.createElement('button')
      b.textContent = label
      b.addEventListener('click', () => go(p))
      crumbs.append(b)
    })
    requestAnimationFrame(() => (crumbs.scrollLeft = crumbs.scrollWidth)) // the current folder stays in view
    $('.fx-back', body).disabled = !back.length
    $('.fx-fwd', body).disabled = !fwd.length
    $('.fx-up', body).disabled = !path.length
    const own = !!ownNode(path)
    $('.fx-newdir', body).disabled = !own
    $('.fx-newtxt', body).disabled = !own
    $('.fx-view', body).textContent = view === 'icons' ? '☷ Details' : '▦ Icons'
    for (const b of body.querySelectorAll('.fx-side button')) {
      const p = b.dataset.go ? homeOf(b.dataset.go) : b.dataset.path ? b.dataset.path.split('/') : []
      b.classList.toggle('sel', p.join('/') === path.join('/'))
    }
    win.setTitle?.(`${path.length ? path[path.length - 1] : 'This PC'} - File Explorer`)
    // the files
    listEl.className = `fx-list ${view}`
    listEl.replaceChildren()
    if (view === 'details') {
      const h = document.createElement('div')
      h.className = 'fx-row fx-head'
      h.innerHTML = '<span>Name</span><span>Type</span><span>Size</span>'
      listEl.append(h)
    }
    for (const it of sorted) {
      const b = document.createElement('button')
      b.className = 'fx-row' + (it.name === selected ? ' sel' : '')
      b.setAttribute('role', 'option')
      b.innerHTML = '<i></i><b></b><span class="t"></span><span class="s"></span>'
      $('i', b).textContent = it.icon
      $('b', b).textContent = it.name
      $('.t', b).textContent = typeName(it)
      $('.s', b).textContent = it.kind === 'dir' || it.kind === 'drive' || it.kind === 'bin' ? '' : fmtSize(it.size ?? 0)
      b.addEventListener('click', (e) => {
        selected = it.name
        listEl.querySelectorAll('.fx-row.sel').forEach((x) => x.classList.remove('sel'))
        b.classList.add('sel')
        if (e.detail === 0 || matchMedia('(pointer: coarse)').matches) openItem(it)
      })
      b.addEventListener('dblclick', () => openItem(it))
      b.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        selected = it.name
        b.classList.add('sel')
        itemMenu(it, e.clientX, e.clientY)
      })
      listEl.append(b)
    }
    if (!sorted.length) {
      const p = document.createElement('p')
      p.className = 'fx-empty'
      p.textContent = query ? 'No items match your search.' : 'This folder is empty.'
      listEl.append(p)
    }
    foot.textContent = `${sorted.length} item${sorted.length === 1 ? '' : 's'}${own ? '' : ' · read-only'}`
  }
  function typeName(it) {
    return { dir: 'File folder', txt: 'Text Document', img: 'Image', app: 'Application', save: `${it.game} save data`, drive: 'Local Disk', bin: 'Recycle Bin', joke: it.name.split('.').pop().toUpperCase() + ' File', file: 'File' }[it.kind] ?? 'File'
  }
  function openItem(it) {
    if (it.kind === 'dir' || it.kind === 'drive') return go(it.path)
    openFile(os, it, path)
  }
  async function doRename(it) {
    if (it.ro) return os.msgbox('Rename', 'Access denied: this file belongs to the system.', '🔒')
    const to = await os.askbox({ title: 'Rename', text: `New name for “${it.name}”:`, icon: '✏️', input: { placeholder: it.name, value: it.name, maxLength: 80 } })
    if (to == null) return
    const why = rename(path, it.name, to)
    if (why) os.msgbox('Rename', why, '⚠️')
    else {
      selected = to
      render()
    }
  }
  async function doDelete(it) {
    if (it.ro) return os.msgbox('Delete', 'Access denied. You’ll need permission from TrustedInstaller to make changes to this file. (TrustedInstaller says no.)', '🔒')
    const ok = await os.askbox({ title: 'Delete', text: `Delete “${it.name}”? It won’t go to the Recycle Bin: the Recycle Bin is full of its own problems.`, icon: '🗑️', ok: 'Delete' })
    if (!ok) return
    const why = remove(path, it.name)
    if (why) os.msgbox('Delete', why, '⚠️')
    render()
  }
  function props(it) {
    const lines = [`Type: ${typeName(it)}`, `Location: ${pathText(path)}`]
    if (it.kind !== 'dir') lines.push(`Size: ${fmtSize(it.size ?? 0)}`)
    if (it.m) lines.push(`Modified: ${new Date(it.m).toLocaleString()}`)
    if (it.ro) lines.push('Attributes: read-only, system')
    os.msgbox(`${it.name} Properties`, lines.join('\n'), it.icon)
  }
  function itemMenu(it, x, y) {
    os.showMenu(
      [
        { label: 'Open', run: () => openItem(it) },
        'sep',
        { label: 'Rename', run: () => doRename(it), disabled: it.ro },
        { label: 'Delete', run: () => doDelete(it), disabled: it.ro, danger: true },
        { label: 'Copy path', run: () => navigator.clipboard?.writeText(pathText([...path, it.name])) },
        'sep',
        { label: 'Properties', run: () => props(it) },
      ],
      x,
      y,
      it.name,
      it.icon,
    )
  }
  function create(kind) {
    const n = kind === 'dir' ? newFolder(path) : newText(path)
    if (!n) return os.msgbox('New', 'You can’t create files here. Try Documents.', '🔒')
    selected = n
    render()
    const it = list(path).find((x) => x.name === n)
    if (it) doRename(it)
  }
  // wiring
  $('.fx-back', body).addEventListener('click', () => {
    if (!back.length) return
    fwd.push(path)
    go(back.pop(), false)
  })
  $('.fx-fwd', body).addEventListener('click', () => {
    if (!fwd.length) return
    back.push(path)
    go(fwd.pop(), false)
  })
  $('.fx-up', body).addEventListener('click', () => path.length && go(path.slice(0, -1)))
  $('.fx-newdir', body).addEventListener('click', () => create('dir'))
  $('.fx-newtxt', body).addEventListener('click', () => create('txt'))
  $('.fx-view', body).addEventListener('click', () => {
    view = view === 'icons' ? 'details' : 'icons'
    render()
  })
  $('.fx-search', body).addEventListener('input', (e) => {
    query = e.target.value
    render()
  })
  for (const b of body.querySelectorAll('.fx-side button')) b.addEventListener('click', () => go(b.dataset.go ? homeOf(b.dataset.go) : b.dataset.path ? b.dataset.path.split('/') : []))
  listEl.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.fx-row')) return
    e.preventDefault()
    const own = !!ownNode(path)
    os.showMenu(
      [
        { label: '📁  New folder', run: () => create('dir'), disabled: !own },
        { label: '📄  New text document', run: () => create('txt'), disabled: !own },
        'sep',
        { label: view === 'icons' ? '☷  Details view' : '▦  Icons view', run: () => $('.fx-view', body).click() },
        { label: '⟳  Refresh', run: render },
      ],
      e.clientX,
      e.clientY,
      path.length ? path[path.length - 1] : 'This PC',
      '📁',
    )
  })
  listEl.addEventListener('keydown', (e) => {
    const it = (list(path) ?? []).find((x) => x.name === selected)
    if (e.key === 'Backspace') path.length && go(path.slice(0, -1))
    else if (!it) return
    else if (e.key === 'Enter') openItem(it)
    else if (e.key === 'F2') doRename(it)
    else if (e.key === 'Delete') doDelete(it)
    else return
    e.preventDefault()
  })
  const off = onChange(render)
  render()
  return () => off()
}

// ================= Notepad =================
let noteCount = 0
/** Opens a file the way double-clicking it does (`dir`: the folder it's in, for saving). */
export function openFile(os, it, dir) {
  markOpened()
  if (it.kind === 'bin' || it.kind === 'app') return os.openApp(it.app)
  if (it.kind === 'joke') return os.msgbox(it.name, it.alert, it.icon)
  if (it.kind === 'img') return openImage(os, it)
  if (it.kind === 'save') {
    let raw = ''
    try {
      raw = JSON.stringify(JSON.parse(localStorage.getItem(it.storageKey)), null, 2)
    } catch {
      raw = localStorage.getItem(it.storageKey) ?? ''
    }
    if (raw.length > 60000) raw = raw.slice(0, 60000) + '\n\n… (the rest is too long to show)'
    return openNotepad(os, { name: it.name, text: raw, ro: true, note: `${it.game} keeps this in your browser.` })
  }
  if (it.kind === 'txt' || it.kind === 'file') {
    if (it.ro) return openNotepad(os, { name: it.name, text: it.text ?? '', ro: true })
    return openNotepad(os, { name: it.name, text: it.node.t, dir })
  }
}
export function openNotepad(os, { name, text, ro = false, dir = null, note = '' }) {
  const content = document.createDocumentFragment()
  const body = document.createElement('div')
  body.className = 'win-body notepad'
  body.innerHTML = `<div class="np-menu"><button class="np-save">💾 Save</button><span class="np-info"></span></div><textarea class="np-text" spellcheck="false"></textarea>`
  const foot = document.createElement('div')
  foot.className = 'win-foot'
  foot.innerHTML = '<span class="status muted np-status"></span>'
  content.append(body, foot)
  const win = os.makeWindow({ id: `note-${++noteCount}`, title: `${name}${ro ? ' (read-only)' : ''} - Notepad`, icon: '📝', width: 560, content })
  const ta = $('.np-text', win.el)
  ta.value = text
  ta.readOnly = ro
  const saveBtn = $('.np-save', win.el)
  saveBtn.hidden = ro
  $('.np-info', win.el).textContent = note
  let dirty = false
  const status = () => ($('.np-status', win.el).textContent = `${ro ? 'Read-only' : dirty ? 'Unsaved changes' : 'Saved'} · ${ta.value.length.toLocaleString()} characters`)
  const doSave = () => {
    if (ro || !dir) return
    writeText(dir, name, ta.value)
    dirty = false
    status()
  }
  ta.addEventListener('input', () => {
    dirty = true
    status()
  })
  ta.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      doSave()
    }
  })
  saveBtn.addEventListener('click', doSave)
  win.onClose = () => dirty && doSave() // nikstilOS saves for you; it's that kind of OS
  status()
  ta.focus()
  return win
}

// ================= Pictures =================
let picCount = 0
export function openImage(os, it) {
  const content = document.createDocumentFragment()
  const body = document.createElement('div')
  body.className = 'win-body picview'
  body.innerHTML = '<img alt="">'
  $('img', body).src = it.url
  $('img', body).alt = it.name
  content.append(body)
  os.makeWindow({ id: `pic-${++picCount}`, title: `${it.name} - Photos`, icon: '🖼️', width: 560, content })
}
