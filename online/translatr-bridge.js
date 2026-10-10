// TRANSLATR™ ↔ nikstil.com online. translatr/index.html loads this with one <script> tag (if a
// new game upload replaces that file, the admin page's Online section puts the tag back).
//
// It never touches the game itself. It watches the save the game keeps in localStorage, tells the
// server when a speedrun or Daily Challenge starts (so the server can time it too), and posts the
// time when it ends. Runs with cheats on, or by players who aren't signed in, stay offline.
// When a speedrun ends, it also puts live leaderboards beside the game's results page.
;(() => {
  'use strict'
  if (window.translatrOnline) return
  window.translatrOnline = true

  const SAVE_KEY = 'translatr-save'
  const RUN_KEY = 'translatr-online-run' // this device's run in progress: { gameStartedAt, mode, day, id, state }
  const ENDINGS = {
    buy: 'Hostile Takeover',
    slave: 'Corporate Slave',
    bankrupt: 'Death by Cat',
    grass: 'Touched Grass',
    taught: 'Self-Taught',
    shooter: 'Knee-Deep in the Ads',
    deleted: 'Account Deleted',
    secret: 'Not One Cent',
    snail: 'ive waited 4 no 5000 years for this',
  }

  const read = (key) => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null')
    } catch {
      return null
    }
  }
  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage full or blocked: the run just won't survive a reload
    }
  }

  function formatTime(ms) {
    const cs = Math.floor(ms / 10) % 100
    const s = Math.floor(ms / 1000) % 60
    const m = Math.floor(ms / 60000) % 60
    const h = Math.floor(ms / 3600000)
    const pad = (n) => String(n).padStart(2, '0')
    return `${h ? `${h}:${pad(m)}` : m}:${pad(s)}.${pad(cs)}`
  }

  // ================= Toasts =================
  // Its own small notice in the corner, styled inline so it looks the same over every game theme.
  let box = null
  let hideTimer = 0
  function toast(text, { link = false, ms = 7000 } = {}) {
    if (!box) {
      box = document.createElement('div')
      box.setAttribute('role', 'status')
      Object.assign(box.style, {
        position: 'fixed',
        left: '12px',
        bottom: '60px', // above the game's own taskbar
        zIndex: '2147483647',
        maxWidth: 'min(92vw, 380px)',
        padding: '10px 14px',
        borderRadius: '8px',
        font: '13px/1.4 "Segoe UI", system-ui, sans-serif',
        color: '#fff',
        background: 'rgba(12, 20, 40, 0.93)',
        boxShadow: '0 8px 24px rgba(0,0,0,.35)',
        transition: 'opacity .25s',
        pointerEvents: 'auto',
      })
      document.body.append(box)
    }
    box.textContent = text
    if (link) {
      const a = document.createElement('a')
      a.href = '/#leaderboard'
      a.textContent = ' See the leaderboard →'
      Object.assign(a.style, { color: '#9fd4ff', fontWeight: '600' })
      box.append(a)
    }
    box.style.opacity = '1'
    box.hidden = false
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      box.style.opacity = '0'
      setTimeout(() => (box.hidden = true), 300)
    }, ms)
  }

  // ================= Watching the save =================
  let online = null
  let busy = false
  let lastRaw = null
  let finishTries = 0

  async function check() {
    if (busy) return
    let raw = null
    try {
      raw = localStorage.getItem(SAVE_KEY)
    } catch {
      return
    }
    if (raw === lastRaw) return
    busy = true
    try {
      lastRaw = raw
      const state = JSON.parse(raw ?? 'null')?.state
      lastState = state
      await follow(state)
    } catch (err) {
      console.warn('TRANSLATR online:', err)
    } finally {
      busy = false
    }
  }

  // ================= Endings, per account =================
  // The signed-in account's completed endings (all devices), kept in localStorage for the game: a
  // Roguelike run picks its target from the ones the account hasn't done. Endings reached here are
  // added to the account as they happen.
  const ACCOUNT_KEY = 'translatr-account'
  let accountEndings = null // Set, while signed in
  function writeAccount(me) {
    try {
      if (me && accountEndings) localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ id: me.id, username: me.username, endings: [...accountEndings] }))
      else localStorage.removeItem(ACCOUNT_KEY)
    } catch {
      // storage blocked: the game falls back to this device's endings
    }
  }
  async function loadAccountEndings(me) {
    accountEndings = null
    if (!me) return writeAccount(null)
    try {
      const c = await online.connect()
      const { data } = await c.from('profiles').select('endings_done').eq('id', me.id).maybeSingle()
      accountEndings = new Set(data?.endings_done ?? [])
      writeAccount(me)
      syncEndings(lastState)
    } catch {
      // older database without endings_done: nothing to sync
    }
  }
  async function syncEndings(state) {
    const me = online?.profile
    if (!me || !accountEndings || !state?.endings) return
    const fresh = Object.keys(state.endings).filter((id) => !accountEndings.has(id))
    if (!fresh.length) return
    fresh.forEach((id) => accountEndings.add(id))
    writeAccount(me)
    try {
      const c = await online.connect()
      const { data } = await c.rpc('note_endings', { p_endings: fresh })
      if (Array.isArray(data)) {
        accountEndings = new Set(data)
        writeAccount(me)
      }
    } catch {
      // try again with the next ending
    }
  }

  async function follow(state) {
    syncEndings(state)
    const mode = state?.mode
    const run = state?.run
    if ((mode !== 'speedrun' && mode !== 'daily') || !run?.startedAt) return
    let rec = read(RUN_KEY)

    const fresh = !rec || rec.gameStartedAt !== run.startedAt || rec.mode !== mode
    // (A run stuck 'starting' means the page closed mid-request: asking again finds the same run.)
    if (fresh || rec.state === 'starting') {
      if (run.endedAt) return
      const day = mode === 'daily' ? state.daily?.day ?? null : null
      rec = { gameStartedAt: run.startedAt, mode, day, id: rec?.id ?? null, state: 'starting' }
      // The server has to time the run from the start, so a run that began before this page was
      // watching (an old save, or one from before the leaderboards existed) stays offline.
      if (fresh && Date.now() - run.startedAt > 15000) {
        write(RUN_KEY, { ...rec, state: 'offline' })
        return toast('⏱️ This run started before the online leaderboard was watching, so it stays offline. Start a new one to get on the board.', { ms: 9000 })
      }
      write(RUN_KEY, rec)
      const me = await online.me().catch(() => null)
      if (!me) {
        write(RUN_KEY, { ...rec, state: 'offline' })
        return toast('⏱️ You’re not signed in, so this run won’t go on the online leaderboard. Sign in on nikstil.com (Start → Account) before your next one.', { ms: 9000 })
      }
      try {
        rec = { ...rec, id: await online.startRun(mode, run.startedAt, day), state: 'running' }
        write(RUN_KEY, rec)
        toast(`⏱️ Online: this ${mode === 'daily' ? 'Daily Challenge' : 'run'} posts to the leaderboard as ${me.username}. Good luck.`)
      } catch (err) {
        write(RUN_KEY, { ...rec, state: 'error' })
        toast(`⏱️ This run won’t go on the leaderboard: ${online.errorText(err)}`, { ms: 9000 })
      }
      return
    }

    if (!run.endedAt || rec.state !== 'running') return
    if (state.cheats) {
      write(RUN_KEY, { ...rec, state: 'done', cheats: true })
      boards?.refresh()
      return toast('🏴 Cheats were on, so this run stays off the leaderboard.')
    }
    const ending = run.ending ?? state.over
    const time = run.endedAt - run.startedAt
    try {
      const res = await online.finishRun(rec.id, time, ending, run.splits)
      write(RUN_KEY, { ...rec, state: 'done', result: res })
      finishTries = 0
      boards?.refresh()
      if (res?.status === 'finished') {
        const board = mode === 'daily' ? 'today’s Daily' : 'Any%'
        let text = `🏆 ${formatTime(time)}: #${res.rank} on ${board}`
        if (mode === 'speedrun' && res.ending_rank) text += `, #${res.ending_rank} for ${ENDINGS[ending] ?? ending}`
        if (res.pb) text += '. New personal best!'
        toast(text, { link: true, ms: 12000 })
      } else if (res?.status === 'rejected') {
        toast(`⚠️ The leaderboard didn’t accept that time: ${res.reason ?? 'it didn’t check out'}`, { ms: 12000 })
      }
    } catch (err) {
      // Probably the connection: keep the run and try again on the next check (a few times).
      if (++finishTries < 5) {
        lastRaw = null
        setTimeout(check, 5000 * finishTries)
      } else {
        write(RUN_KEY, { ...rec, state: 'error' })
      }
      toast(`⚠️ Couldn’t post your time yet: ${online.errorText(err)}`)
    }
  }

  // ================= Ending-screen leaderboards =================
  // When a speedrun ends, the results page gets two live boards: this ending's on the left and
  // Any% on the right. Where the screen is too narrow for both beside the results (phones), a
  // button at the top opens them one at a time.
  const ICONS = { buy: '🏢', slave: '👔', bankrupt: '💀', grass: '🌱', taught: '✍️', shooter: '👹', deleted: '⏻', secret: '🕊️', snail: '🐌' }
  const TOP = 10
  const STYLE = `
.tro-boards { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; font: 13px/1.35 "Segoe UI", system-ui, -apple-system, sans-serif; color: #fff; --w: 300px; --gap: 20px; }
.tro-boards * { box-sizing: border-box; }
.tro-panel { position: absolute; top: 50%; width: var(--w); max-height: calc(100vh - 140px); display: flex; flex-direction: column; pointer-events: auto; transform: translateY(-50%);
  border: 1px solid rgba(255,255,255,.12); border-radius: 14px; background: rgba(14,14,16,.84); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); box-shadow: 0 20px 50px rgba(0,0,0,.5); animation: tro-in .5s .15s both; }
.tro-left { left: var(--gap); }
.tro-right { right: var(--gap); animation-delay: .3s; }
.tro-head { padding: 13px 14px 10px 16px; border-bottom: 1px solid rgba(255,255,255,.08); }
.tro-kicker { display: flex; align-items: center; gap: 8px; font-size: 10.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.55); }
.tro-kicker > span:first-child { flex: 1; }
.tro-live { display: inline-flex; align-items: center; gap: 5px; color: #ff8a8a; }
.tro-live i { width: 7px; height: 7px; border-radius: 50%; background: #ff4d4d; animation: tro-pulse 1.4s infinite; }
.tro-live.is-off { color: rgba(255,255,255,.4); }
.tro-live.is-off i { background: #777; animation: none; }
.tro-x, .tro-switch { padding: 2px 6px; border: 0; border-radius: 6px; font: inherit; color: rgba(255,255,255,.7); background: rgba(255,255,255,.08); cursor: pointer; }
.tro-x:hover, .tro-switch:hover { color: #fff; background: rgba(255,255,255,.18); }
.tro-switch { display: none; letter-spacing: 0; text-transform: none; }
.tro-title { margin-top: 5px; font-size: 17px; font-weight: 700; }
.tro-sub { font-size: 12px; color: rgba(255,255,255,.55); }
.tro-list { margin: 0; padding: 6px 8px; list-style: none; overflow-y: auto; }
.tro-row { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; }
.tro-row + .tro-row { margin-top: 2px; }
.tro-rank { text-align: center; color: rgba(255,255,255,.6); font-variant-numeric: tabular-nums; }
.tro-name { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tro-name small { margin-left: 4px; }
.tro-time { font: 600 13px ui-monospace, "JetBrains Mono", Consolas, monospace; font-variant-numeric: tabular-nums; }
.tro-row.is-me { background: rgba(74,222,128,.16); box-shadow: inset 0 0 0 1px rgba(74,222,128,.45); }
.tro-row.is-me .tro-time { color: #6ef0a0; }
.tro-row.is-new { animation: tro-flash 2.4s ease-out; }
.tro-empty { padding: 18px 16px; text-align: center; color: rgba(255,255,255,.55); }
.tro-foot { padding: 10px 16px 12px; border-top: 1px solid rgba(255,255,255,.08); font-size: 12px; color: rgba(255,255,255,.7); }
.tro-foot:empty { display: none; }
.tro-foot b { color: #fff; }
.tro-foot p { margin: 0; }
.tro-foot p + p { margin-top: 3px; }
.tro-foot a { color: #9fd4ff; }
.tro-pill { position: absolute; top: 12px; left: 50%; display: none; padding: 7px 14px; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; font: 600 13px/1 "Segoe UI", system-ui, sans-serif; color: #fff; background: rgba(14,14,16,.84); box-shadow: 0 8px 24px rgba(0,0,0,.4); pointer-events: auto; cursor: pointer; transform: translateX(-50%); }
.tro-pill i { display: inline-block; width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; background: #ff4d4d; vertical-align: 1px; animation: tro-pulse 1.4s infinite; }
.tro-boards.is-closed .tro-panel { display: none; }
.tro-boards.is-closed .tro-pill { display: block; }
.tro-boards.is-compact .tro-panel { display: none; top: auto; bottom: 12px; left: 12px; right: 12px; width: auto; max-height: 62vh; transform: none; animation-name: tro-up; animation-delay: 0s; }
.tro-boards.is-compact .tro-pill { display: block; }
.tro-boards.is-compact.is-open .tro-panel.is-current { display: flex; }
.tro-boards.is-compact .tro-switch { display: inline-block; }
@keyframes tro-in { from { opacity: 0; transform: translateY(calc(-50% + 14px)); } }
@keyframes tro-up { from { opacity: 0; transform: translateY(14px); } }
@keyframes tro-pulse { 50% { opacity: .35; } }
@keyframes tro-flash { from { background: rgba(255,210,70,.45); } }
@media (prefers-reduced-motion: reduce) { .tro-panel, .tro-row.is-new, .tro-live i, .tro-pill i { animation: none !important; } }
`
  const make = (tag, className, text) => {
    const el = document.createElement(tag)
    if (className) el.className = className
    if (text != null) el.textContent = text
    return el
  }

  let lastState = null // the game's state, as last read from its save
  let boards = null // the panels, while they're up

  function watchEnding() {
    const s = lastState
    const ending = s?.run?.ending ?? s?.over
    const want = !!document.querySelector('.ending-summary') && s?.mode === 'speedrun' && !!s.run?.endedAt && !!ending
    if (want && !boards) boards = showBoards(s)
    else if (!want && boards) {
      boards.close()
      boards = null
    } else if (boards) boards.layout()
  }

  function showBoards(state) {
    const ending = state.run.ending ?? state.over
    const startedAt = state.run.startedAt
    const time = state.run.endedAt - startedAt
    if (!document.getElementById('tro-style')) {
      const style = make('style')
      style.id = 'tro-style'
      style.textContent = STYLE
      document.head.append(style)
    }
    const root = make('div', 'tro-boards')
    root.setAttribute('role', 'complementary')
    root.setAttribute('aria-label', 'Live leaderboards')
    const pill = make('button', 'tro-pill')
    pill.append(make('i'), 'Live leaderboards')

    function panel(side, board, kicker, title, sub) {
      const el = make('section', `tro-panel tro-${side}`)
      const head = make('header', 'tro-head')
      const top = make('div', 'tro-kicker')
      const live = make('span', 'tro-live is-off')
      live.append(make('i'), 'Live')
      const switcher = make('button', 'tro-switch', side === 'left' ? 'Any% →' : '← This ending')
      const close = make('button', 'tro-x', '✕')
      close.title = 'Hide the leaderboards'
      close.setAttribute('aria-label', 'Hide the leaderboards')
      top.append(make('span', null, kicker), live, switcher, close)
      head.append(top, make('div', 'tro-title', title), make('div', 'tro-sub', sub))
      const list = make('ol', 'tro-list')
      const foot = make('footer', 'tro-foot')
      el.append(head, list, foot)
      switcher.addEventListener('click', () => pick(side === 'left' ? right : left))
      close.addEventListener('click', hide)
      root.append(el)
      return { el, board, list, foot, live, seen: null }
    }
    const left = panel('left', ending, 'This ending', `${ICONS[ending] ?? '🏁'} ${ENDINGS[ending] ?? ending}`, 'Fastest speedruns to this ending')
    const right = panel('right', 'any', 'Any%', '⏱️ Any%', 'Fastest speedruns, any ending')
    root.append(pill)
    document.body.append(root)

    function pick(p) {
      left.el.classList.toggle('is-current', p === left)
      right.el.classList.toggle('is-current', p === right)
    }
    pick(left)
    function hide() {
      root.classList.remove('is-open')
      root.classList.add('is-closed')
    }
    pill.addEventListener('click', () => {
      root.classList.remove('is-closed')
      root.classList.toggle('is-open', !root.classList.contains('is-open') || !root.classList.contains('is-compact'))
    })

    function layout() {
      const card = document.querySelector('.ending-summary')?.getBoundingClientRect()
      const space = card && card.width ? Math.min(card.left, innerWidth - card.right) : (innerWidth - 640) / 2
      const width = Math.min(320, space - 36)
      const wide = width >= 210 && innerHeight >= 420
      root.classList.toggle('is-compact', !wide)
      if (wide) {
        root.style.setProperty('--w', `${width}px`)
        root.style.setProperty('--gap', `${Math.max(16, (space - width) / 2)}px`)
      }
    }
    layout()

    // ----- this player's line under each board
    function footer(p, rows, mine, me) {
      p.foot.replaceChildren()
      const line = (...parts) => {
        const el = make('p')
        el.append(...parts)
        p.foot.append(el)
      }
      const rec = read(RUN_KEY)
      const ours = rec && rec.gameStartedAt === startedAt ? rec : null
      if (ours?.result?.status === 'finished') {
        line('This run: ', make('b', null, formatTime(time)), ours.result.pb ? ' · new personal best!' : '')
      } else if (ours?.result?.status === 'rejected') {
        line('This run wasn’t accepted: the time didn’t match the server’s.')
      } else if (ours?.cheats) {
        line('🏴 Cheats were on, so this run isn’t on the board.')
      } else if (ours?.state === 'running') {
        line('Posting your time…')
      } else if (!me) {
        const a = make('a', null, 'Sign in on nikstil.com')
        a.href = '/#account'
        line(a, ' to get your runs on here.')
      } else {
        line('This run wasn’t timed online, so it isn’t on the board.')
      }
      if (me && mine && !rows.some((r) => r.user_id === me.id)) line('Your best: ', make('b', null, `#${mine.rank}`), ` · ${formatTime(mine.time_ms)}`)
    }

    function fill(p, rows, mine, me) {
      const shown = rows.slice(0, TOP)
      const keys = new Set(shown.map((r) => `${r.user_id}:${r.time_ms}`))
      p.list.replaceChildren(
        ...shown.map((r) => {
          const row = make('li', 'tro-row')
          if (me && r.user_id === me.id) row.classList.add('is-me')
          if (p.seen && !p.seen.has(`${r.user_id}:${r.time_ms}`)) row.classList.add('is-new')
          const name = make('span', 'tro-name', r.username)
          if (me && r.user_id === me.id) name.append(make('small', null, '(you)'))
          else if (p.board === 'any' && ICONS[r.ending]) name.append(make('small', null, ICONS[r.ending]))
          row.append(make('span', 'tro-rank', ['🥇', '🥈', '🥉'][r.rank - 1] ?? String(r.rank)), name, make('span', 'tro-time', formatTime(r.time_ms)))
          return row
        }),
      )
      if (!shown.length) p.list.append(make('li', 'tro-empty', 'No runs yet. This could be you.'))
      p.seen = keys
      footer(p, shown, mine, me)
    }

    let closed = false
    let seq = 0
    async function load() {
      const run = ++seq
      try {
        const me = await online.me().catch(() => null)
        const [a, b] = await Promise.all([online.leaderboard(ending), online.leaderboard('any')])
        const [ma, mb] = me ? await Promise.all([online.myRank(ending).catch(() => null), online.myRank('any').catch(() => null)]) : [null, null]
        if (closed || run !== seq) return
        fill(left, a, ma, me)
        fill(right, b, mb, me)
      } catch (err) {
        if (closed || run !== seq) return
        for (const p of [left, right]) {
          p.list.replaceChildren(make('li', 'tro-empty', `Leaderboard unavailable: ${online.errorText(err)}`))
          p.foot.replaceChildren()
        }
      }
    }
    let timer = 0
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(load, 300)
    }
    const stop = online.watchLeaderboard({
      onChange: refresh,
      onStatus: (live) => {
        for (const p of [left, right]) p.live.classList.toggle('is-off', !live)
        if (live) refresh() // (re)connected: catch up on anything missed
      },
    })
    load()
    return {
      layout,
      refresh,
      close() {
        closed = true
        clearTimeout(timer)
        stop()
        root.remove()
      },
    }
  }

  // ================= Yapper bubble =================
  // A chat button in the bottom-right corner: in the game's taskbar tray (#nk-tray-slot) so it never
  // covers anything, or floating if the page has no tray. It opens Yapper
  // (nikstil.com/?embed=messenger) in a little panel over the game, with an unread count, and a
  // full-screen button.
  function messengerBubble() {
    const style = document.createElement('style')
    style.textContent = `
      #nk-msgr-bubble { position: fixed; right: 14px; bottom: 58px; z-index: 2147483000; width: 52px; height: 52px; border: 2px solid #fff; border-radius: 50%; display: grid; place-items: center; font-size: 24px; line-height: 1; cursor: pointer; color: #fff; background: radial-gradient(circle at 35% 30%, #6fc3ff, #1f6fd1 70%); box-shadow: 0 6px 18px rgba(0,0,0,.35); transition: transform .15s; }
      #nk-msgr-bubble:hover { transform: scale(1.07); }
      #nk-msgr-bubble:focus-visible { outline: 3px solid #ffd24a; outline-offset: 2px; }
      #nk-msgr-bubble.in-tray { position: relative; right: auto; bottom: auto; z-index: auto; width: auto; height: 100%; min-width: 34px; padding: 0 8px; border: 0; border-radius: 0; font-size: 18px; color: inherit; background: none; box-shadow: none; }
      #nk-msgr-bubble.in-tray:hover { transform: none; }
      #nk-msgr-bubble.in-tray #nk-msgr-badge { top: 2px; right: 0; min-width: 16px; padding: 0 4px; font-size: 10px; line-height: 16px; }
      #nk-msgr-badge { position: absolute; top: -4px; right: -4px; min-width: 20px; padding: 0 5px; border-radius: 10px; font: 700 11px/20px "Segoe UI", system-ui, sans-serif; text-align: center; color: #fff; background: #d93025; box-shadow: 0 0 0 2px #fff; }
      #nk-msgr-panel { position: fixed; right: 14px; bottom: 120px; z-index: 2147483000; display: flex; flex-direction: column; width: min(420px, calc(100vw - 28px)); height: min(600px, calc(100vh - 140px)); border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 16px 48px rgba(0,0,0,.45); font: 13px "Segoe UI", system-ui, sans-serif; }
      #nk-msgr-panel[hidden], #nk-msgr-badge[hidden] { display: none; }
      #nk-msgr-panel:fullscreen { width: 100%; height: 100%; border-radius: 0; }
      #nk-msgr-head { display: flex; align-items: center; gap: 6px; padding: 6px 8px 6px 12px; color: #fff; background: linear-gradient(#3b8de0, #1f6fd1); font-weight: 600; }
      #nk-msgr-head span { flex: 1; }
      #nk-msgr-head button { width: 28px; height: 26px; border: 0; border-radius: 5px; color: #fff; background: rgba(255,255,255,.15); font-size: 14px; cursor: pointer; }
      #nk-msgr-head button:hover { background: rgba(255,255,255,.3); }
      #nk-msgr-panel iframe { flex: 1; width: 100%; border: 0; }
      html.shooter-open :is(#nk-msgr-bubble, #nk-msgr-panel) { display: none; }
    `
    document.head.append(style)
    const bubble = document.createElement('button')
    bubble.id = 'nk-msgr-bubble'
    bubble.title = 'Yapper'
    bubble.setAttribute('aria-label', 'Yapper')
    bubble.innerHTML = '💬<span id="nk-msgr-badge" hidden></span>'
    const panel = document.createElement('section')
    panel.id = 'nk-msgr-panel'
    panel.hidden = true
    panel.setAttribute('aria-label', 'Yapper')
    panel.innerHTML = '<div id="nk-msgr-head"><span>💬 Yapper</span><button class="nk-full" title="Full screen" aria-label="Full screen">⛶</button><button class="nk-close" title="Close" aria-label="Close">✕</button></div>'
    document.body.append(bubble, panel)
    // Into the taskbar tray when there is one (and back in if the taskbar is redrawn).
    const dock = () => {
      const slot = document.getElementById('nk-tray-slot')
      if (slot && bubble.parentElement !== slot) {
        slot.append(bubble)
        bubble.className = 'in-tray task-btn'
        panel.style.bottom = '52px'
      }
    }
    dock()
    new MutationObserver(dock).observe(document.body, { childList: true, subtree: true })
    const badge = bubble.querySelector('#nk-msgr-badge')
    let unread = 0
    const showBadge = () => {
      badge.hidden = !unread
      badge.textContent = unread > 99 ? '99+' : String(unread)
      bubble.setAttribute('aria-label', unread ? `Yapper (${unread} unread)` : 'Yapper')
    }
    function toggle(open = panel.hidden) {
      panel.hidden = !open
      if (!open) return
      if (!panel.querySelector('iframe')) {
        const frame = document.createElement('iframe')
        frame.src = '/?embed=messenger'
        frame.title = 'Yapper'
        panel.append(frame)
      }
      unread = 0 // the Yapper itself shows what's unread from here
      showBadge()
    }
    bubble.addEventListener('click', () => toggle())
    panel.querySelector('.nk-close').addEventListener('click', () => {
      if (document.fullscreenElement === panel) document.exitFullscreen?.()
      toggle(false)
    })
    const full = panel.querySelector('.nk-full')
    full.hidden = !panel.requestFullscreen
    full.addEventListener('click', () => (document.fullscreenElement === panel ? document.exitFullscreen() : panel.requestFullscreen().catch(() => {})))
    document.addEventListener('fullscreenchange', () => {
      const on = document.fullscreenElement === panel
      full.textContent = on ? '🗗' : '⛶'
      full.title = on ? 'Exit full screen' : 'Full screen'
    })
    // Unread messages while the panel is closed (only when signed in on this device).
    online.on('message', (m) => {
      if (!panel.hidden || m.sender === online.profile?.id) return
      unread += 1
      showBadge()
    })
    online.on('auth', async (me) => {
      unread = 0
      if (me) {
        try {
          unread = (await online.conversations()).reduce((n, c) => n + Number(c.unread || 0), 0)
        } catch {}
      }
      showBadge()
    })
    if (online.hasStoredSession()) online.me().catch(() => {})
  }

  // ================= Start =================
  function start() {
    online = window.nikstilOnline
    online.configured.then((on) => {
      if (!on) return
      online.on('auth', loadAccountEndings)
      if (!online.hasStoredSession()) writeAccount(null) // signed out (elsewhere): back to this device's endings
      messengerBubble()
      check()
      setInterval(check, 750)
      setInterval(watchEnding, 500)
      document.addEventListener('visibilitychange', check)
    })
  }
  if (window.nikstilOnline) start()
  else {
    const s = document.createElement('script')
    s.src = '/online/online.js'
    s.onload = start
    document.head.append(s)
  }
})()
