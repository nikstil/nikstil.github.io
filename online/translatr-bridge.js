// TRANSLATR™ ↔ nikstil.com online. translatr/index.html loads this with one <script> tag (if a
// new game upload replaces that file, the admin page's Online section puts the tag back).
//
// It never touches the game itself. It watches the save the game keeps in localStorage, tells the
// server when a speedrun or Daily Challenge starts (so the server can time it too), and posts the
// time when it ends. Runs with cheats on, or by players who aren't signed in, stay offline.
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
      await follow(state)
    } catch (err) {
      console.warn('TRANSLATR online:', err)
    } finally {
      busy = false
    }
  }

  async function follow(state) {
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
      write(RUN_KEY, { ...rec, state: 'done' })
      return toast('🏴 Cheats were on, so this run stays off the leaderboard.')
    }
    const ending = run.ending ?? state.over
    const time = run.endedAt - run.startedAt
    try {
      const res = await online.finishRun(rec.id, time, ending, run.splits)
      write(RUN_KEY, { ...rec, state: 'done' })
      finishTries = 0
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

  // ================= Start =================
  function start() {
    online = window.nikstilOnline
    online.configured.then((on) => {
      if (!on) return
      check()
      setInterval(check, 750)
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
