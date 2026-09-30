// nikstilOS online apps: Leaderboards, nikstil Messenger and Account. The server side is
// online/online.js (window.nikstilOnline) and supabase/schema.sql.
//
// os.js calls window.nikstilOnlineApps(os) once with the bits of the desktop these need, then
// start() after the site settings are in. Nothing appears unless /site.json switches online on.
;(() => {
  'use strict'

  const ENDINGS = [
    ['buy', '🏢', 'Hostile Takeover'],
    ['slave', '👔', 'Corporate Slave'],
    ['bankrupt', '💀', 'Death by Cat'],
    ['grass', '🌱', 'Touched Grass'],
    ['taught', '✍️', 'Self-Taught'],
    ['shooter', '👹', 'Knee-Deep in the Ads'],
    ['deleted', '⏻', 'Account Deleted'],
    ['secret', '🕊️', 'Not One Cent'],
  ]
  const ending = (id) => ENDINGS.find((e) => e[0] === id)

  function formatTime(ms) {
    if (ms == null) return '—'
    const cs = Math.floor(ms / 10) % 100
    const s = Math.floor(ms / 1000) % 60
    const m = Math.floor(ms / 60000) % 60
    const h = Math.floor(ms / 3600000)
    const pad = (n) => String(n).padStart(2, '0')
    return `${h ? `${h}:${pad(m)}` : m}:${pad(s)}.${pad(cs)}`
  }
  function when(iso) {
    const d = new Date(iso)
    const mins = Math.round((Date.now() - d) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    if (mins < 60 * 24 && d.getDate() === new Date().getDate()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    if (mins < 60 * 24 * 6) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  /** YYYY-MM-DD in the player's time zone, like the game dates its Daily Challenge. */
  function localDay(offset = 0) {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  window.nikstilOnlineApps = (os) => {
    const { $, $$ } = os
    const net = () => window.nikstilOnline
    let available = false
    let me = null // the signed-in profile
    const unread = new Map() // user id -> unread count
    const views = new Set() // open app windows: { onAuth(profile), onMessage(msg) }

    // ================= Start-up =================
    async function start() {
      if (!net()) return
      available = await net().configured
      if (!available) return
      for (const el of $$('[data-online]')) el.hidden = os.siteHidden(el.dataset.online)
      // The Start menu's name and picture open Account.
      const head = $('.sm-head')
      head.setAttribute('role', 'button')
      head.tabIndex = 0
      head.title = 'Account'
      const openAccount = () => {
        os.closeMenus()
        os.openApp('account')
      }
      head.addEventListener('click', openAccount)
      head.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openAccount()))
      $('#msgr-tray').addEventListener('click', () => os.openApp('messenger'))
      $('#balloon').addEventListener('click', openBalloon)
      net().on('auth', onAuth)
      net().on('message', onMessage)
      net().on('resync', () => {
        if (!me) return
        refreshUnread()
        views.forEach((v) => v.onResync?.())
      })
      // Signed in on this device already? (Otherwise the SDK isn't even loaded until it's needed.)
      if (net().hasStoredSession()) net().me().catch(() => {})
    }

    function onAuth(profile) {
      me = profile
      $('.sm-user').textContent = me ? me.username : os.userName()
      $('#msgr-tray').hidden = !me || os.siteHidden('messenger')
      unread.clear()
      if (me) refreshUnread()
      else showUnread()
      views.forEach((v) => v.onAuth?.(me))
    }

    // ================= Unread messages & notifications =================
    async function refreshUnread() {
      try {
        const list = await net().conversations()
        unread.clear()
        for (const c of list) if (c.unread) unread.set(c.user_id, Number(c.unread))
      } catch {
        // not fatal: the badge just starts at zero
      }
      showUnread()
    }
    function showUnread() {
      const total = [...unread.values()].reduce((a, b) => a + b, 0)
      const badge = $('.tray-badge')
      badge.hidden = !total
      badge.textContent = total > 99 ? '99+' : String(total)
      const label = total ? `nikstil Messenger (${total} unread)` : 'nikstil Messenger'
      $('#msgr-tray').title = label
      $('#msgr-tray').setAttribute('aria-label', label)
    }

    let balloonFrom = null
    let balloonTimer = 0
    async function onMessage(msg) {
      if (!me) return
      let handled = false
      views.forEach((v) => (handled = v.onMessage?.(msg) || handled))
      if (msg.sender === me.id || handled) return
      unread.set(msg.sender, (unread.get(msg.sender) ?? 0) + 1)
      showUnread()
      const name = await net().playerName(msg.sender)
      const balloon = $('#balloon')
      balloonFrom = { id: msg.sender, username: name }
      $('.balloon-title', balloon).textContent = `💬 ${name}`
      $('.balloon-text', balloon).textContent = msg.body.length > 90 ? `${msg.body.slice(0, 90)}…` : msg.body
      balloon.hidden = false
      clearTimeout(balloonTimer)
      balloonTimer = setTimeout(() => (balloon.hidden = true), 7000)
    }
    function openBalloon() {
      $('#balloon').hidden = true
      if (balloonFrom) openChat(balloonFrom)
    }

    /** Opens Messenger on a chat with `user` ({ id, username }). */
    function openChat(user) {
      os.openApp('messenger')
      messenger?.show(user)
    }

    /** A tiny element builder. */
    function h(tag, props = {}, ...children) {
      const el = document.createElement(tag)
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue
        if (k === 'class') el.className = v
        else if (typeof v === 'function') el.addEventListener(k.slice(2), v)
        else if (v === true) el.setAttribute(k, '')
        else el.setAttribute(k, v)
      }
      el.append(...children.flat().filter((c) => c != null && c !== false))
      return el
    }
    const offline = (el, text = 'Online features aren’t switched on yet.') => el.replaceChildren(h('p', { class: 'muted' }, text))

    // ================= Leaderboards =================
    function initLeaderboard(el) {
      const body = $('.lb', el)
      if (!available) return offline(body)
      const select = $('.lb-board', el)
      select.append(
        h('optgroup', { label: 'Speedrun' }, h('option', { value: 'any' }, 'Any% (any ending)'), ENDINGS.map(([id, icon, name]) => h('option', { value: id }, `${icon} ${name}`))),
        h('optgroup', { label: 'Daily Challenge' }, h('option', { value: 'daily:0' }, 'Today'), h('option', { value: 'daily:-1' }, 'Yesterday')),
      )
      const tbody = $('tbody', el)
      const empty = $('.lb-empty', el)
      const mine = $('.lb-me', el)
      const status = $('.lb-status', el)
      let seq = 0

      async function load() {
        const run = ++seq
        const [board, offset] = select.value.split(':')
        const day = board === 'daily' ? localDay(Number(offset)) : null
        status.textContent = 'Loading…'
        try {
          const rows = await net().leaderboard(board, day)
          if (run !== seq) return
          el.classList.toggle('lb-any', board === 'any')
          tbody.replaceChildren(
            ...rows.map((r) => {
              const e = ending(r.ending)
              const medal = ['🥇', '🥈', '🥉'][r.rank - 1]
              const name = h('button', { class: 'lb-name', title: me && r.user_id !== me.id ? `Message ${r.username}` : null, onclick: () => me && r.user_id !== me.id && openChat({ id: r.user_id, username: r.username }) }, r.username)
              return h(
                'tr',
                { class: me && r.user_id === me.id ? 'is-me' : null },
                h('td', { class: 'lb-rank' }, medal ?? String(r.rank)),
                h('td', {}, name),
                h('td', { class: 'lb-time' }, formatTime(r.time_ms)),
                h('td', { class: 'lb-ending', title: e?.[2] ?? r.ending }, e ? `${e[1]} ${e[2]}` : r.ending === 'daily' ? '📅 Daily' : r.ending),
                h('td', { class: 'lb-when' }, when(r.finished_at)),
              )
            }),
          )
          empty.hidden = rows.length > 0
          empty.textContent = board === 'daily' ? 'No times yet for this Daily Challenge. Be the first.' : 'No runs on this board yet. Be the first.'
          mine.textContent = ''
          if (me && !rows.some((r) => r.user_id === me.id)) {
            const rank = await net().myRank(board, day)
            if (run === seq && rank) mine.textContent = `You: #${rank.rank} with ${formatTime(rank.time_ms)}`
          } else if (!me) {
            mine.replaceChildren(h('button', { class: 'lb-link', onclick: () => os.openApp('account') }, 'Sign in'), ' to get your runs on the board.')
          }
          status.textContent = live ? '● Live' : `Updated ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
        } catch (err) {
          if (run === seq) status.textContent = net().errorText(err)
        }
      }
      select.addEventListener('change', load)
      $('.lb-refresh', el).addEventListener('click', load)
      // Live: the board refreshes the moment anyone's run finishes (the minute timer is a backstop).
      let live = false
      let soon = 0
      const stopWatching = net().watchLeaderboard({
        onChange: () => {
          clearTimeout(soon)
          soon = setTimeout(load, 300)
        },
        onStatus: (on) => {
          live = on
          if (on) load()
        },
      })
      const timer = setInterval(load, 60_000)
      const view = { onAuth: load }
      views.add(view)
      load()
      return () => {
        clearInterval(timer)
        clearTimeout(soon)
        stopWatching()
        views.delete(view)
      }
    }

    // ================= Account =================
    function initAccount(el) {
      const body = $('.acct', el)
      if (!available) {
        $('.acct-off', el).hidden = false
        return
      }
      const form = $('.acct-form', el)
      const signedIn = $('.acct-in', el)
      const error = $('.acct-error', el)
      const go = $('.acct-go', el)
      let mode = 'in'

      function setMode(m) {
        mode = m
        $$('.acct-tab', el).forEach((t) => t.setAttribute('aria-selected', String(t.dataset.mode === m)))
        $('.acct-age', el).hidden = m !== 'up'
        $('.acct-pass', el).autocomplete = m === 'up' ? 'new-password' : 'current-password'
        go.textContent = m === 'up' ? 'Create account' : 'Sign in'
        error.hidden = true
      }
      $$('.acct-tab', el).forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)))

      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const user = $('.acct-user', el).value
        const pass = $('.acct-pass', el).value
        if (mode === 'up' && !$('.acct-agree', el).checked) {
          error.textContent = 'Please confirm you’re 13 or older.'
          error.hidden = false
          return
        }
        go.disabled = true
        error.hidden = true
        try {
          if (mode === 'up') await net().signUp(user, pass)
          else await net().signIn(user, pass)
          $('.acct-pass', el).value = ''
        } catch (err) {
          error.textContent = net().errorText(err)
          error.hidden = false
        } finally {
          go.disabled = false
        }
      })

      $('.acct-dms', el).addEventListener('change', async (e) => {
        try {
          await net().setAllowDms(e.target.checked)
        } catch (err) {
          e.target.checked = !e.target.checked
          os.msgbox('Account', net().errorText(err), '⚠️')
        }
      })
      $('.acct-signout', el).addEventListener('click', () => net().signOut())
      $('.acct-delete', el).addEventListener('click', async () => {
        const ok = await os.askbox({
          title: 'Delete account',
          icon: '⚠️',
          text: `Delete ${me.username} for good? Your leaderboard times, messages and blocks all go with it. This can’t be undone.`,
          ok: 'Delete it',
        })
        if (!ok) return
        try {
          await net().deleteAccount()
          os.msgbox('Account', 'Your account is gone. Thanks for playing.', '👋')
        } catch (err) {
          os.msgbox('Account', net().errorText(err), '⚠️')
        }
      })

      function render(profile) {
        form.hidden = !!profile
        signedIn.hidden = !profile
        if (!profile) {
          setMode('in') // after signing out, the next thing is signing back in
          $('.acct-agree', el).checked = false
          return
        }
        $('.acct-name', el).textContent = profile.username
        $('.acct-since', el).textContent = `Joined ${new Date(profile.created_at).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}`
        $('.acct-dms', el).checked = profile.allow_dms
        $('.acct-avatar', el).textContent = os.iconFor('account')
      }
      const view = { onAuth: render }
      views.add(view)
      body.classList.add('is-loading')
      net()
        .me()
        .then((p) => {
          render(p)
          body.classList.remove('is-loading')
          if (!p) $('.acct-user', el).focus()
        })
        .catch((err) => offline(body, net().errorText(err)))
      return () => views.delete(view)
    }

    // ================= Messenger =================
    let messenger = null // the open Messenger window's controls

    function initMessenger(el) {
      const body = $('.msgr', el)
      if (!available) return offline(body)
      const list = $('.msgr-list', el)
      const log = $('.msgr-log', el)
      const text = $('.msgr-text', el)
      const find = $('.msgr-find-input', el)
      const suggest = $('.msgr-suggest', el)
      let current = null // { id, username }
      let shown = new Set() // message ids in the log
      let oldest = null
      let blocked = new Set()
      let chats = []

      $('.msgr-signin', el).addEventListener('click', () => os.openApp('account'))
      $('.msgr-back', el).addEventListener('click', () => {
        current = null
        body.classList.remove('is-chatting')
        renderChat()
      })

      // ----- the chat list
      async function loadChats() {
        try {
          chats = await net().conversations()
        } catch (err) {
          list.replaceChildren(h('li', { class: 'muted msgr-error' }, net().errorText(err)))
          return
        }
        $('.msgr-none', el).hidden = chats.length > 0
        list.replaceChildren(
          ...chats.map((c) => {
            const n = current?.id === c.user_id ? 0 : unread.get(c.user_id) ?? 0
            return h(
              'li',
              {},
              h(
                'button',
                { class: `msgr-conv${current?.id === c.user_id ? ' is-current' : ''}`, 'data-user': c.user_id, onclick: () => show({ id: c.user_id, username: c.username }) },
                h('span', { class: 'msgr-conv-name' }, c.username, c.blocked && h('small', { class: 'muted' }, ' (blocked)')),
                h('span', { class: 'msgr-conv-when muted' }, when(c.last_at)),
                h('span', { class: 'msgr-conv-last muted' }, `${c.last_from_me ? 'You: ' : ''}${c.last_body}`),
                n > 0 && h('b', { class: 'msgr-unread', 'aria-label': `${n} unread` }, String(n)),
              ),
            )
          }),
        )
      }
      let chatsTimer = 0
      const reloadChats = () => {
        clearTimeout(chatsTimer)
        chatsTimer = setTimeout(loadChats, 300)
      }

      // ----- finding someone to message
      let findTimer = 0
      find.addEventListener('input', () => {
        clearTimeout(findTimer)
        const q = find.value.trim()
        if (!q) return (suggest.hidden = true)
        findTimer = setTimeout(async () => {
          const people = await net().findPlayers(q).catch(() => [])
          if (find.value.trim() !== q) return
          suggest.replaceChildren(
            ...people.map((p) => h('li', {}, h('button', { type: 'button', onclick: () => pick(p) }, p.username, !p.allow_dms && h('small', { class: 'muted' }, ' (not taking messages)')))),
          )
          if (!people.length) suggest.replaceChildren(h('li', { class: 'muted' }, 'Nobody by that name.'))
          suggest.hidden = false
        }, 250)
      })
      find.addEventListener('keydown', (e) => e.key === 'Escape' && (suggest.hidden = true))
      $('.msgr-find', el).addEventListener('submit', async (e) => {
        e.preventDefault()
        const q = find.value.trim()
        if (!q) return
        const p = await net().findPlayer(q).catch(() => null)
        if (p && p.id !== me?.id) pick(p)
        else os.msgbox('nikstil Messenger', p ? 'That’s you. Pick someone else.' : `Nobody called “${q}” plays here (yet).`, '🔍')
      })
      function pick(p) {
        find.value = ''
        suggest.hidden = true
        show({ id: p.id, username: p.username })
      }

      // ----- a chat
      function bubble(m) {
        shown.add(m.id)
        const mine = m.sender === net().profile?.id
        return h(
          'li',
          { class: `msgr-msg${mine ? ' is-mine' : ''}`, 'data-id': m.id },
          h('span', { class: 'msgr-body' }, m.body),
          h('time', { class: 'msgr-time', datetime: m.created_at, title: new Date(m.created_at).toLocaleString() }, when(m.created_at)),
          !mine && h('button', { class: 'msgr-flag', title: 'Report this message', 'aria-label': 'Report this message', onclick: () => reportUser(m.id) }, '⚑'),
        )
      }
      const atBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 40
      const toBottom = () => (log.scrollTop = log.scrollHeight)

      async function show(user) {
        current = user
        shown = new Set()
        oldest = null
        body.classList.add('is-chatting')
        renderChat()
        log.replaceChildren(h('li', { class: 'muted msgr-loading' }, 'Loading…'))
        if (!(await net().me()) || current?.id !== user.id) return
        try {
          const msgs = await net().history(user.id)
          if (current?.id !== user.id) return
          oldest = msgs[0]?.id ?? null
          log.replaceChildren(...(msgs.length === 50 ? [olderButton()] : []), ...msgs.map(bubble))
          if (!msgs.length) log.replaceChildren(h('li', { class: 'muted msgr-hello' }, `This is the start of your chat with ${user.username}. Say hi!`))
          toBottom()
        } catch (err) {
          log.replaceChildren(h('li', { class: 'muted' }, net().errorText(err)))
        }
        if (unread.get(user.id)) {
          unread.delete(user.id)
          showUnread()
        }
        net().markRead(user.id).catch(() => {})
        loadChats()
        if (!os.coarsePointer) text.focus()
      }
      function olderButton() {
        return h(
          'li',
          { class: 'msgr-older' },
          h(
            'button',
            {
              class: 'btn',
              onclick: async (e) => {
                const li = e.currentTarget.parentElement
                const who = current
                const msgs = await net().history(who.id, oldest).catch(() => [])
                if (current !== who) return
                const height = log.scrollHeight
                li.replaceWith(...(msgs.length === 50 ? [olderButton()] : []), ...msgs.filter((m) => !shown.has(m.id)).map(bubble))
                oldest = msgs[0]?.id ?? oldest
                log.scrollTop = log.scrollHeight - height
              },
            },
            'Load older messages',
          ),
        )
      }
      function renderChat() {
        const chat = $('.msgr-chat', el)
        chat.classList.toggle('has-chat', !!current)
        if (!current) return
        $('.msgr-with', el).textContent = current.username
        const isBlocked = blocked.has(current.id)
        $('.msgr-block', el).textContent = isBlocked ? 'Unblock' : 'Block'
        text.disabled = isBlocked
        $('.msgr-send', el).disabled = isBlocked
        text.placeholder = isBlocked ? `You’ve blocked ${current.username}.` : `Message ${current.username}…`
        $$('.msgr-conv', el).forEach((b) => b.classList.toggle('is-current', b.dataset.user === current.id))
      }

      async function sendNow() {
        const msg = text.value.trim()
        if (!msg || !current) return
        const to = current
        text.value = ''
        autosize()
        $('.msgr-send', el).disabled = true
        try {
          const sent = await net().send(to.id, msg)
          if (current?.id === to.id && !shown.has(sent.id)) {
            $('.msgr-hello', log)?.remove()
            log.append(bubble(sent))
            toBottom()
          }
          reloadChats()
        } catch (err) {
          if (!text.value) text.value = msg // give it back
          os.msgbox('nikstil Messenger', net().errorText(err), '⚠️')
        } finally {
          $('.msgr-send', el).disabled = blocked.has(current?.id)
          if (!os.coarsePointer) text.focus()
        }
      }
      const autosize = () => {
        text.style.height = 'auto'
        text.style.height = `${Math.min(text.scrollHeight, 120)}px`
      }
      text.addEventListener('input', autosize)
      text.addEventListener('keydown', (e) => {
        // Enter sends, Shift+Enter is a new line (on phones, the Send button sends).
        if (e.key === 'Enter' && !e.shiftKey && !os.coarsePointer) {
          e.preventDefault()
          sendNow()
        }
      })
      $('.msgr-compose', el).addEventListener('submit', (e) => {
        e.preventDefault()
        sendNow()
      })

      $('.msgr-block', el).addEventListener('click', async () => {
        const who = current
        if (!who) return
        try {
          if (blocked.has(who.id)) {
            await net().unblock(who.id)
            blocked.delete(who.id)
          } else {
            const ok = await os.askbox({ title: 'Block', icon: '🚫', text: `Block ${who.username}? They won’t be able to message you, and they won’t be told.`, ok: 'Block' })
            if (!ok) return
            await net().block(who.id)
            blocked.add(who.id)
          }
          renderChat()
          loadChats()
        } catch (err) {
          os.msgbox('nikstil Messenger', net().errorText(err), '⚠️')
        }
      })
      async function reportUser(messageId = null) {
        const who = current
        if (!who) return
        const reason = await os.askbox({
          title: 'Report',
          icon: '⚑',
          text: messageId ? `What’s wrong with this message from ${who.username}?` : `Why are you reporting ${who.username}?`,
          ok: 'Send report',
          input: { multiline: true, maxLength: 500, placeholder: 'e.g. spam, harassment…' },
        })
        if (!reason) return
        try {
          await net().report(who.id, reason, messageId)
          os.msgbox('Report', 'Thanks. The site owner will take a look. You can also block them.', '✅')
        } catch (err) {
          os.msgbox('Report', net().errorText(err), '⚠️')
        }
      }
      $('.msgr-report', el).addEventListener('click', () => reportUser())

      // ----- live updates
      function onMessage(m) {
        const other = m.sender === me.id ? m.recipient : m.sender
        reloadChats()
        if (current?.id !== other) return false
        if (!shown.has(m.id)) {
          const stick = atBottom()
          $('.msgr-hello', log)?.remove()
          log.append(bubble(m))
          if (stick || m.sender === me.id) toBottom()
        }
        // Seen straight away only if the window's actually in front of them.
        const visible = !el.hidden && el.classList.contains('is-active') && document.visibilityState === 'visible'
        if (m.sender !== me.id && visible) net().markRead(other).catch(() => {})
        return visible || m.sender === me.id
      }

      let renderedFor // the account this window last drew, so a chat opened meanwhile survives
      async function render(profile) {
        body.classList.toggle('is-out', !profile)
        if (!profile || (renderedFor !== undefined && renderedFor !== profile.id)) {
          body.classList.remove('is-chatting')
          current = null
        }
        renderedFor = profile?.id ?? null
        if (!profile) return renderChat()
        blocked = await net().blocked().catch(() => new Set())
        renderChat()
        loadChats()
      }
      // Coming back to a chat with unread messages in it marks them read.
      el.addEventListener('pointerdown', () => {
        if (current && unread.get(current.id)) {
          unread.delete(current.id)
          showUnread()
          net().markRead(current.id).catch(() => {})
          reloadChats()
        }
      })
      /** After a dropped connection: pick up anything that arrived meanwhile. */
      async function onResync() {
        loadChats()
        if (!current) return
        const who = current
        const msgs = await net().history(who.id).catch(() => [])
        if (current !== who) return
        const missed = msgs.filter((m) => !shown.has(m.id))
        if (!missed.length) return
        $('.msgr-hello', log)?.remove()
        log.append(...missed.map(bubble))
        toBottom()
      }
      const view = { onAuth: render, onMessage, onResync }
      views.add(view)
      messenger = { show }
      body.classList.add('is-out')
      net()
        .me()
        .then(render)
        .catch((err) => offline(body, net().errorText(err)))
      return () => {
        views.delete(view)
        if (messenger?.show === show) messenger = null
      }
    }

    const INITS = { leaderboard: initLeaderboard, messenger: initMessenger, account: initAccount }
    return {
      start,
      init: (id, el, win) => INITS[id]?.(el, win),
    }
  }
})()
