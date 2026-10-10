// Command Prompt for nikstilOS: the File Explorer's pretend C: drive, typed at. dir, cd, type,
// start (files, folders and apps), mkdir, del, ren, echo > file, tree, color, cls and the rest of
// the classics, with history (↑ ↓) and Tab to finish a name. Some commands aren't in `help`.

import * as F from '/os/files.js'

const $ = (s, el = document) => el.querySelector(s)
const STORE = 'nikstilos-terminal' // { color, found: [hidden commands tried] }
const HOME = F.homeOf('').slice(0, 3)
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE)) ?? {}
  } catch {
    return {}
  }
}
const write = (v) => {
  try {
    localStorage.setItem(STORE, JSON.stringify(v))
  } catch {}
}

// The apps `start` knows, by any of their names.
const APPS = [
  ['strife', 'COUNTER-STRIFE', ['strife', 'counter-strife', 'counterstrife', 'cs', 'cs2', 'csgo', 'strife.exe']],
  ['casino', 'SKINSINK.GG', ['casino', 'skinsink', 'skinsink.gg', 'skinsink.exe', 'gamble']],
  ['translatr', 'TRANSLATR™', ['translatr', 'translatr.exe', 'translator']],
  ['doom', 'DOOMSCROLL.EXE', ['doom', 'doomscroll', 'doomscroll.exe']],
  ['grass', 'LAWN OF THE DEAD', ['grass', 'lawn', 'lawn.exe', 'touchgrass']],
  ['phone', 'BRAINS FIRST', ['phone', 'brains', 'brains.exe', 'touchphone']],
  ['loggle', 'LOGGLE', ['loggle', 'loggle.exe']],
  ['browser', 'BobbyBrowser', ['browser', 'bobby', 'bobby.exe', 'bobbybrowser', 'iexplore', 'chrome']],
  ['mobile', 'LigmaPhone', ['mobile', 'ligmaphone', 'ligmaphone.exe']],
  ['achievements', 'Achievements', ['achievements', 'achievements.exe']],
  ['themes', 'Themes', ['themes', 'themes.exe']],
  ['files', 'File Explorer', ['files', 'explorer', 'explorer.exe']],
  ['messenger', 'Messenger', ['messenger', 'msn']],
  ['leaderboard', 'Leaderboards', ['leaderboard', 'leaderboards']],
  ['gif', 'The GIF', ['gif', 'animation.gif']],
  ['pc', 'System Properties', ['pc', 'sysdm.cpl']],
  ['bin', 'Recycle Bin', ['bin', 'recyclebin']],
]
const appFor = (name) => APPS.find((a) => a[2].includes(String(name).toLowerCase()))

const COLORS = '0c0c0c 0037da 13a10e 3a96dd c50f1f 881798 c19c00 cccccc 767676 3b78ff 16c60c 61d6d6 e74856 b4009e f9f1a5 f2f2f2'.split(' ').map((c) => '#' + c)

// Commands `help` lists: name, what it does.
const HELP = [
  ['CD', 'Displays the name of or changes the current directory.'],
  ['CLS', 'Clears the screen.'],
  ['COLOR', 'Sets the console colours (try COLOR 0A).'],
  ['DATE', 'Displays the date.'],
  ['DEL', 'Deletes a file.'],
  ['DIR', 'Displays a list of files and subdirectories in a directory.'],
  ['ECHO', 'Displays messages, or writes them to a file (ECHO hi > note.txt).'],
  ['EXIT', 'Quits the Command Prompt.'],
  ['HELP', 'Provides Help information for commands.'],
  ['HISTORY', 'Shows the commands you typed.'],
  ['MKDIR', 'Creates a directory.'],
  ['RD', 'Removes a directory.'],
  ['REN', 'Renames a file or directory.'],
  ['START', 'Opens a file, a folder or an app (START strife).'],
  ['TIME', 'Displays the time.'],
  ['TITLE', 'Sets the window title.'],
  ['TREE', 'Graphically displays the folder structure.'],
  ['TYPE', 'Displays the contents of a text file.'],
  ['VER', 'Displays the nikstilOS version.'],
  ['WHOAMI', 'Displays who you are.'],
]
// The hidden ones (finding them is an achievement)
const HIDDEN = ['sudo', 'matrix', 'rm', 'xyzzy', 'coffee', 'cowsay', 'fortune', 'neofetch', 'ping', 'rush', '42', 'sandwich', 'hello', 'nikstil', 'format', 'shutdown']
const FORTUNES = [
  'You will find a bug. It will be in code you wrote yesterday.',
  'A defuse kit saves lives. Mostly yours.',
  'The CEO dog sees all.',
  'Touch grass today. The zombies will wait.',
  'Your next case drop will be a Mil-Spec. And the one after that.',
  'Someone, somewhere, is still on Silver I. Be kind.',
  'There is no TRANSLATR™ Ultra+ Pro Max Plus. Yet.',
  'The cake is in the Recycle Bin.',
]

export function initTerminal(el, win, os) {
  const out = $('.term-out', el)
  const form = $('.term-line', el)
  const input = $('.term-in', el)
  const promptEl = $('.term-prompt', el)
  const body = $('.term', el)
  let cwd = [...HOME]
  const history = []
  let hi = 0
  let busy = false
  const saved = read()
  if (saved.color) setColor(saved.color, false)

  const pathText = (p) => (p.length === 1 ? p[0] + '\\' : F.pathText(p))
  const prompt = () => `${pathText(cwd)}>`
  const showPrompt = () => (promptEl.textContent = prompt())
  function print(text = '', cls = '') {
    const line = document.createElement('div')
    line.className = 'term-l' + (cls ? ' ' + cls : '')
    line.textContent = text
    out.append(line)
    while (out.children.length > 800) out.firstChild.remove()
    body.scrollTop = body.scrollHeight
    return line
  }
  const err = (t) => print(t, 'term-err')

  print('nikstilOS [Version 10.0.2026.1009]')
  print('(c) nikstil Corporation. All rights reserved, some of them wrong.')
  print('')
  print('Type HELP for a list of commands.', 'term-dim')
  print('')
  showPrompt()

  // ---------------- Paths
  /** Splits a command line into words ("quoted words" stay together). */
  function words(line) {
    const out = []
    const re = /"([^"]*)"|(\S+)/g
    let m
    while ((m = re.exec(line))) out.push(m[1] ?? m[2])
    return out
  }
  /** A folder path from what was typed (relative or absolute), or null if there isn't one. */
  function resolveDir(text, from = cwd) {
    text = String(text ?? '').trim()
    if (!text) return [...from]
    let cur
    if (/^~/.test(text)) {
      cur = [...HOME]
      text = text.slice(1)
    } else if (/^[a-z]:/i.test(text)) {
      if (text[0].toUpperCase() !== 'C') return null
      cur = ['C:']
      text = text.slice(2)
    } else if (/^[\\/]/.test(text)) cur = ['C:']
    else cur = [...from]
    for (const part of text.split(/[\\/]+/)) {
      if (!part || part === '.') continue
      if (part === '..') {
        if (cur.length > 1) cur.pop()
        continue
      }
      const found = (F.list(cur) ?? []).find((x) => (x.kind === 'dir' || x.kind === 'drive') && x.name.toLowerCase() === part.toLowerCase())
      if (!found) return null
      cur = [...found.path]
    }
    return cur
  }
  /** A file (or folder) entry from what was typed: { it, dir } or null. */
  function resolveItem(text) {
    text = String(text ?? '').trim()
    const cut = Math.max(text.lastIndexOf('\\'), text.lastIndexOf('/'))
    const dir = cut >= 0 ? resolveDir(text.slice(0, cut) || '\\') : [...cwd]
    if (!dir) return null
    const name = cut >= 0 ? text.slice(cut + 1) : text
    const it = (F.list(dir) ?? []).find((x) => x.name.toLowerCase() === name.toLowerCase())
    return it ? { it, dir } : null
  }

  // ---------------- The commands
  const fmtDate = (ms) => {
    const d = new Date(ms ?? Date.UTC(2007, 0, 30, 9, 0))
    const p = (n) => String(n).padStart(2, '0')
    const h = d.getHours() % 12 || 12
    return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()}  ${p(h)}:${p(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`
  }
  const num = (n) => n.toLocaleString('en-US')
  function dir(args) {
    const target = args.filter((a) => !a.startsWith('/'))[0]
    const p = target ? resolveDir(target) : cwd
    if (!p) return err('File Not Found')
    const items = F.list(p) ?? []
    print(' Volume in drive C is NIKSTILOS')
    print(' Volume Serial Number is 1337-C0DE')
    print('')
    print(` Directory of ${pathText(p)}`)
    print('')
    let files = 0
    let bytes = 0
    if (p.length > 1) {
      print(`${fmtDate()}    <DIR>          .`)
      print(`${fmtDate()}    <DIR>          ..`)
    }
    for (const it of items) {
      if (it.kind === 'dir' || it.kind === 'drive' || it.kind === 'bin') print(`${fmtDate(it.m)}    <DIR>          ${it.name}`)
      else {
        files++
        bytes += it.size ?? 0
        print(`${fmtDate(it.m)}    ${num(it.size ?? 0).padStart(14)} ${it.name}`)
      }
    }
    print(`${String(files).padStart(16)} File(s) ${num(bytes).padStart(14)} bytes`)
    print(`${String(items.length - files + (p.length > 1 ? 2 : 0)).padStart(16)} Dir(s)  ${num(1337420069).padStart(14)} bytes free`)
  }
  function cd(args) {
    const t = args.join(' ')
    if (!t) return print(pathText(cwd))
    const p = resolveDir(t)
    if (!p) return err('The system cannot find the path specified.')
    cwd = p
  }
  function type(args) {
    if (!args.length) return err('The syntax of the command is incorrect.')
    const r = resolveItem(args.join(' '))
    if (!r) return err('The system cannot find the file specified.')
    const { it } = r
    if (it.kind === 'dir' || it.kind === 'drive') return err('Access is denied.')
    if (it.kind === 'img') return print(`${it.name} is a picture. Try: START "${it.name}"`, 'term-dim')
    if (it.kind === 'app' || it.kind === 'joke') return print('MZ\u0090\u0003\u0004\u00ff\u00ff\u00b8@\u000e\u001f\u00ba\u000e\u00b4\t\u00cd!\u00b8\u0001L\u00cd!This program cannot be run in DOS mode.', 'term-dim')
    let t = F.textOf(it) ?? ''
    if (it.kind === 'save') {
      try {
        t = JSON.stringify(JSON.parse(t), null, 2)
      } catch {}
    }
    const lines = t.split('\n')
    for (const l of lines.slice(0, 400)) print(l)
    if (lines.length > 400) print(`… and ${lines.length - 400} more lines (START "${it.name}" to see them all)`, 'term-dim')
  }
  function start(args) {
    const what = args.join(' ').trim()
    if (!what) return os.openApp('terminal')
    const r = resolveItem(what)
    if (r) {
      const { it, dir } = r
      if (it.kind === 'dir' || it.kind === 'drive') return os.explore(it.path)
      return F.openFile(os, it, dir)
    }
    const p = resolveDir(what)
    if (p) return os.explore(p)
    const app = appFor(what.replace(/^"|"$/g, ''))
    if (app) {
      print(`Starting ${app[1]}…`, 'term-dim')
      return os.openApp(app[0])
    }
    err(`The system cannot find the file ${what}.`)
  }
  function mkdir(args) {
    if (!args.length) return err('The syntax of the command is incorrect.')
    const e = F.makeDir(cwd, args.join(' '))
    if (e) err(e)
  }
  function del(args) {
    const r = args.length ? resolveItem(args.join(' ')) : null
    if (!r) return err('Could Not Find ' + pathText(cwd) + '\\' + args.join(' '))
    if (r.it.kind === 'dir') return err('That’s a directory. Use RD.')
    if (r.it.ro) return err('Access is denied.')
    const e = F.remove(r.dir, r.it.name)
    if (e) err(e)
  }
  function rd(args) {
    const name = args.filter((a) => !a.startsWith('/')).join(' ')
    const r = name ? resolveItem(name) : null
    if (!r || r.it.kind !== 'dir') return err('The system cannot find the file specified.')
    if (r.it.ro) return err('Access is denied.')
    const e = F.remove(r.dir, r.it.name)
    if (e) err(e)
  }
  function ren(args) {
    if (args.length < 2) return err('The syntax of the command is incorrect.')
    const r = resolveItem(args[0])
    if (!r) return err('The system cannot find the file specified.')
    if (r.it.ro) return err('Access is denied.')
    const e = F.rename(r.dir, r.it.name, args[1])
    if (e) err(e)
  }
  function echo(raw) {
    const m = raw.match(/^(.*?)\s*(>>?)\s*("[^"]+"|\S+)\s*$/)
    if (!m) return print(raw.trim() ? raw : 'ECHO is on.')
    const r = resolveItem(m[3].replace(/"/g, ''))
    const target = m[3].replace(/"/g, '')
    const cut = Math.max(target.lastIndexOf('\\'), target.lastIndexOf('/'))
    const where = cut >= 0 ? resolveDir(target.slice(0, cut) || '\\') : cwd
    if (!where) return err('The system cannot find the path specified.')
    if (r?.it.ro) return err('Access is denied.')
    const e = F.putText(where, cut >= 0 ? target.slice(cut + 1) : target, m[1], m[2] === '>>')
    if (e) err(e)
  }
  function tree() {
    print(`Folder PATH listing for volume NIKSTILOS`)
    print(pathText(cwd))
    const walk = (p, pre, depth) => {
      const dirs = (F.list(p) ?? []).filter((x) => x.kind === 'dir')
      dirs.forEach((d, k) => {
        const last = k === dirs.length - 1
        print(`${pre}${last ? '└───' : '├───'}${d.name}`)
        if (depth < 4) walk(d.path, pre + (last ? '    ' : '│   '), depth + 1)
      })
    }
    walk(cwd, '', 1)
  }
  function setColor(code, say = true) {
    const m = String(code ?? '').match(/^([0-9a-f])([0-9a-f])$/i)
    if (!m || m[1].toLowerCase() === m[2].toLowerCase()) {
      if (say) print('Sets the console colours: COLOR 0A (black and green), COLOR 1F (blue and white), COLOR 07 to go back.', 'term-dim')
      return
    }
    body.style.setProperty('--term-bg', COLORS[parseInt(m[1], 16)])
    body.style.setProperty('--term-fg', COLORS[parseInt(m[2], 16)])
    write({ ...read(), color: code })
  }

  // ---------------- The hidden ones
  function found(name) {
    const s = read()
    const list = new Set(s.found ?? [])
    if (list.has(name)) return
    list.add(name)
    write({ ...s, found: [...list] })
  }
  async function slow(lines, ms = 220) {
    busy = true
    for (const l of lines) {
      print(l)
      await new Promise((r) => setTimeout(r, ms))
    }
    busy = false
  }
  function matrix() {
    const c = document.createElement('canvas')
    c.className = 'term-matrix'
    body.append(c)
    const w = (c.width = body.clientWidth)
    const h = (c.height = body.clientHeight)
    const g = c.getContext('2d')
    const cols = Math.ceil(w / 14)
    const drops = Array.from({ length: cols }, () => Math.random() * -40)
    busy = true
    const t0 = performance.now()
    const tick = () => {
      g.fillStyle = 'rgba(0, 0, 0, 0.12)'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#16c60c'
      g.font = '14px monospace'
      for (let i = 0; i < cols; i++) {
        g.fillText(String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96)), i * 14, drops[i] * 16)
        if (drops[i] * 16 > h && Math.random() > 0.97) drops[i] = 0
        drops[i]++
      }
      if (performance.now() - t0 < 3500 && c.isConnected) requestAnimationFrame(tick)
      else {
        c.remove()
        busy = false
        print('Wake up, Guest…', 'term-green')
        print('The Matrix has you.', 'term-green')
        print('Follow the white rabbit. (It went into C:\\nikstilOS\\System32.)', 'term-dim')
        showPrompt()
      }
    }
    tick()
  }
  const HIDDEN_RUN = {
    sudo: () => print(`${who()} is not in the sudoers file. This incident will be reported.`, 'term-err'),
    matrix,
    rm: (a) => (a.join(' ').includes('-rf') ? slow(['Deleting C:\\nikstilOS\\System32…', 'Deleting C:\\nikstilOS\\kernel.exe…', 'Deleting your homework…', '…', 'Just kidding. This isn’t Linux. Try DEL.']) : err('\'rm\' is not recognized. This isn’t Linux: try DEL.')),
    xyzzy: () => print('Nothing happens.'),
    coffee: () => err('Error: coffee.dll is missing. Please insert coffee and try again.'),
    cowsay: (a) => {
      const t = a.join(' ') || 'Moo. Have you touched grass today?'
      print(' ' + '_'.repeat(t.length + 2))
      print(`< ${t} >`)
      print(' ' + '-'.repeat(t.length + 2))
      for (const l of ['        \\   ^__^', '         \\  (oo)\\_______', '            (__)\\       )\\/\\', '                ||----w |', '                ||     ||']) print(l)
    },
    fortune: () => print(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]),
    neofetch: () => {
      const ach = achievementsLine()
      const logo = ['  ████████  ████████', '  ████████  ████████', '  ████████  ████████', '', '  ████████  ████████', '  ████████  ████████', '  ████████  ████████', '', '     n i k s t i l O S']
      const info = [`${who()}@nikstil.com`, '-----------------', 'OS: nikstilOS Ultimate', `Theme: ${document.documentElement.dataset.theme ?? 'aero'}`, `Uptime: ${Math.round(performance.now() / 60000)} min`, 'Shell: cmd.exe (allegedly)', `Achievements: ${ach}`, 'CPU: Pentium 4 @ 3.0 GHz (vibes)', 'Memory: 640 KB (should be enough)']
      for (let i = 0; i < Math.max(logo.length, info.length); i++) print((logo[i] ?? '').padEnd(30) + (info[i] ?? ''), i < logo.length ? 'term-green' : '')
    },
    ping: (a) => {
      const host = a[0] || 'nikstil.com'
      slow([`Pinging ${host} with 32 bytes of data:`, ...[1, 2, 3, 4].map(() => `Reply from ${host}: bytes=32 time=${1 + Math.floor(Math.random() * 40)}ms TTL=64`), '', `Ping statistics for ${host}: Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`], 300)
    },
    rush: (a) => {
      if (!/^b$/i.test(a[0] ?? '')) return print('Rush where? (There’s only one right answer.)')
      print('RUSH B, NO STOP. Starting COUNTER-STRIFE…', 'term-green')
      os.openApp('strife')
    },
    42: () => print('The answer to life, the universe and everything. Now what was the question?'),
    sandwich: () => print('What? Make it yourself.'),
    hello: () => print(`Hello, ${who()}. Type HELP if you’re lost.`),
    nikstil: () => print('That’s us! Thanks for poking around. 💙', 'term-green'),
    format: () => err('Access is denied. Nice try though.'),
    shutdown: () => slow(['Shutting down nikstilOS…', 'Saving your 47 open tabs…', 'Saying goodbye to the CEO dog…', 'Shutdown cancelled: you have unsaved fun.'], 400),
  }
  const who = () => window.nikstilOnline?.profile?.username ?? 'Guest'
  function achievementsLine() {
    try {
      const n = Object.keys(JSON.parse(localStorage.getItem('nikstil-achievements')) ?? {}).length
      return `${n} unlocked`
    } catch {
      return 'none yet'
    }
  }

  // ---------------- Running a line
  function run(line) {
    const raw = line.trim()
    if (!raw) return
    const [first, ...args] = words(raw)
    const name = first.toLowerCase()
    const rest = raw.slice(raw.toLowerCase().indexOf(name) + name.length).trim()
    if (name === 'cd..' || name === 'cd\\' || name === 'cd/') return cd([name.slice(2)])
    // "make me a sandwich", "rush b", "hi"
    if (/^make me a sandwich/i.test(raw)) return (found('sandwich'), HIDDEN_RUN.sandwich())
    if (/^(hi|hey|hello)\b/i.test(raw)) return (found('hello'), HIDDEN_RUN.hello())
    if (HIDDEN.includes(name) && HIDDEN_RUN[name]) {
      found(name)
      return HIDDEN_RUN[name](args)
    }
    switch (name) {
      case 'help':
      case '/?':
        if (args[0]) {
          const h = HELP.find((x) => x[0].toLowerCase() === args[0].toLowerCase())
          return print(h ? h[1] : `This command is not supported by the help utility.`)
        }
        print('For more information on a specific command, type HELP command-name')
        for (const [n, d] of HELP) print(`${n.padEnd(10)}${d}`)
        print('')
        print('There are a few more. You’ll have to find them.', 'term-dim')
        return
      case 'dir':
      case 'ls':
        if (name === 'ls') print('(This isn’t Linux, but sure.)', 'term-dim')
        return dir(args)
      case 'cd':
      case 'chdir':
        return cd(args)
      case 'pwd':
        return print(pathText(cwd))
      case 'type':
      case 'cat':
      case 'more':
        return type(args)
      case 'start':
      case 'open':
        return start(args)
      case 'mkdir':
      case 'md':
        return mkdir(args)
      case 'del':
      case 'erase':
        return del(args)
      case 'rd':
      case 'rmdir':
        return rd(args)
      case 'ren':
      case 'rename':
      case 'move':
        return ren(args)
      case 'echo':
        return echo(rest)
      case 'tree':
        return tree()
      case 'cls':
      case 'clear':
        out.replaceChildren()
        return
      case 'color':
        return setColor(args[0])
      case 'date':
        return print(`The current date is: ${new Date().toLocaleDateString([], { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' })}`)
      case 'time':
        return print(`The current time is: ${new Date().toLocaleTimeString()}`)
      case 'ver':
        return print('nikstilOS [Version 10.0.2026.1009] (Ultimate, Home Premium, Pro Max)')
      case 'whoami':
        return print(`nikstil\\${who().toLowerCase()}`)
      case 'hostname':
        return print('NIKSTIL-PC')
      case 'title':
        win.setTitle?.(rest || 'Command Prompt')
        return
      case 'history':
        history.forEach((h, k) => print(`${String(k + 1).padStart(4)}  ${h}`))
        return
      case 'exit':
        return os.closeWin?.(win)
    }
    // an app's name on its own starts it ("strife", "translatr.exe")
    const app = appFor(name)
    if (app && !args.length) {
      print(`Starting ${app[1]}…`, 'term-dim')
      return os.openApp(app[0])
    }
    // a file in this folder on its own opens it
    const r = resolveItem(raw)
    if (r && r.it.kind !== 'dir') return F.openFile(os, r.it, r.dir)
    err(`'${first}' is not recognized as an internal or external command,`)
    err('operable program or batch file.')
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (busy) return
    const line = input.value
    input.value = ''
    print(prompt() + line, 'term-cmd')
    if (line.trim()) {
      history.push(line)
      if (history.length > 100) history.shift()
    }
    hi = history.length
    if (line.trim()) write({ ...read(), runs: (read().runs ?? 0) + 1 })
    try {
      const r = run(line)
      if (r && typeof r.then === 'function') r.then(showPrompt)
    } catch (x) {
      err(String(x?.message ?? x))
    }
    if (!busy) showPrompt()
    body.scrollTop = body.scrollHeight
  })
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      hi = Math.max(0, Math.min(history.length, hi + (e.key === 'ArrowUp' ? -1 : 1)))
      input.value = history[hi] ?? ''
    } else if (e.key === 'Tab') {
      e.preventDefault()
      complete()
    } else if (e.key === 'c' && e.ctrlKey && !input.selectionEnd) {
      print(prompt() + input.value + '^C', 'term-cmd')
      input.value = ''
    }
  })
  /** Tab: finishes the last word with a matching name in the folder (Tab again for the next one). */
  let tabState = null
  function complete() {
    const v = input.value
    const m = v.match(/^(.*?)("?)([^" ]*)$/)
    if (!m) return
    const [, head, , part] = m
    if (!tabState || tabState.after !== v) {
      const cut = Math.max(part.lastIndexOf('\\'), part.lastIndexOf('/'))
      const dirText = cut >= 0 ? part.slice(0, cut + 1) : ''
      const p = cut >= 0 ? resolveDir(dirText || '\\') : cwd
      const stem = (cut >= 0 ? part.slice(cut + 1) : part).toLowerCase()
      const names = p ? (F.list(p) ?? []).map((x) => x.name).filter((n) => n.toLowerCase().startsWith(stem)) : []
      if (!head.trim()) for (const [n] of HELP) if (n.toLowerCase().startsWith(stem)) names.push(n.toLowerCase())
      if (!names.length) return
      tabState = { head, dirText, names, k: -1 }
    }
    tabState.k = (tabState.k + 1) % tabState.names.length
    const n = tabState.names[tabState.k]
    input.value = tabState.head + (/\s/.test(n) ? `"${tabState.dirText}${n}"` : tabState.dirText + n)
    tabState.after = input.value
  }
  body.addEventListener('pointerup', () => {
    if (!getSelection()?.toString()) input.focus()
  })
  setTimeout(() => input.focus(), 50)
  return () => {}
}
