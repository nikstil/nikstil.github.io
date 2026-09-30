// nikstil.com online: accounts, TRANSLATR™ leaderboards and Messenger, on Supabase.
// Shared by the desktop (os/online-apps.js), the game page (online/translatr-bridge.js) and the
// admin page. Exposes window.nikstilOnline.
//
// The Supabase project's URL and public key come from /site.json → "online" (set on the admin
// page), so nothing here needs editing. The database side is in /supabase/schema.sql.
;(() => {
  'use strict'
  if (window.nikstilOnline) return

  const SDK = '/online/vendor/supabase-2.117.2.js'
  // Accounts are username + password. Supabase wants an email, so each username gets a made-up
  // address on this domain. No mail is ever sent to it (email confirmation is switched off).
  const EMAIL_DOMAIN = 'players.nikstil.com'
  const STORAGE_KEY = 'nikstil-online-auth' // the session, shared by every page on nikstil.com
  const USERNAME = /^[A-Za-z0-9_]{3,20}$/
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  class OnlineError extends Error {}

  // ================= Setup =================
  let config = null
  const configured = (async () => {
    try {
      const site = await (window.nikstilSite ?? fetch('/site.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)))
      const o = site?.online
      if (!o || typeof o.url !== 'string' || typeof o.key !== 'string' || !o.url.trim() || !o.key.trim()) return false
      config = { url: new URL(o.url.trim()).origin, key: o.key.trim() } // a pasted …/rest/v1/ URL works too
      return true
    } catch {
      return false
    }
  })()

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = src
      s.onload = resolve
      s.onerror = () => reject(new OnlineError('Couldn’t load the online features. Check your connection.'))
      document.head.append(s)
    })
  }

  let client = null
  let connecting = null
  /** The Supabase client, loading the SDK the first time it's needed. */
  function connect() {
    connecting ??= (async () => {
      if (!(await configured)) throw new OnlineError('Online features aren’t switched on yet.')
      if (!window.supabase?.createClient) await loadScript(SDK)
      client = window.supabase.createClient(config.url, config.key, {
        auth: { storageKey: STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
      client.auth.onAuthStateChange((event, session) => {
        if (session?.access_token) client.realtime.setAuth(session.access_token)
        // Signing in or out in another tab. (Supabase asks that nothing awaits its own calls
        // inside this callback, hence the timeout.)
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(refresh, 0)
      })
      refresh()
      return client
    })()
    connecting.catch(() => (connecting = null)) // a failed load can be retried
    return connecting
  }

  /** Is someone signed in on this device? Checked without loading the SDK. */
  function hasStoredSession() {
    try {
      return !!localStorage.getItem(STORAGE_KEY)
    } catch {
      return false
    }
  }

  // ================= Events =================
  const listeners = { auth: new Set(), message: new Set(), resync: new Set() }
  function on(event, fn) {
    listeners[event].add(fn)
    if (event === 'message' && profile && !inbox) subscribeInbox()
    return () => listeners[event].delete(fn)
  }
  const emit = (event, value) => listeners[event].forEach((fn) => {
    try {
      fn(value)
    } catch (err) {
      console.error(err)
    }
  })

  // ================= Accounts =================
  let profile = null // { id, username, allow_dms, is_admin, banned, created_at } or null
  let pending = null // the latest profile check
  let seq = 0

  /** Re-reads who's signed in. Only the latest check counts, so an older, slower one can't undo it. */
  function refresh() {
    const run = ++seq
    pending = (async () => {
      const { data } = await client.auth.getSession()
      const user = data.session?.user
      let next = null
      if (user) {
        const res = await client.from('profiles').select('id, username, allow_dms, is_admin, banned, created_at').eq('id', user.id).maybeSingle()
        next = res.data ?? null
      }
      if (run !== seq) return
      const changed = next?.id !== profile?.id || next?.username !== profile?.username || next?.banned !== profile?.banned
      profile = next
      if (changed) {
        subscribeInbox()
        emit('auth', profile)
      }
    })().catch(() => {})
    return settled()
  }
  /** Waits for every profile check in flight, then says who's signed in. */
  async function settled() {
    let p
    do {
      p = pending
      await p
    } while (p !== pending)
    return profile
  }

  /** The signed-in player, or null. */
  async function me() {
    if (!(await configured)) return null
    if (!hasStoredSession() && !client) return null // nobody's signed in, so don't load the SDK
    await connect()
    return settled()
  }

  const emailFor = (username) => `${username.toLowerCase()}@${EMAIL_DOMAIN}`
  function checkUsername(username) {
    if (!USERNAME.test(username ?? '')) throw new OnlineError('Usernames are 3 to 20 letters, numbers or underscores.')
  }

  async function signUp(username, password) {
    username = username.trim()
    checkUsername(username)
    if ((password ?? '').length < 6) throw new OnlineError('Pick a password of at least 6 characters.')
    const c = await connect()
    const taken = await c.from('profiles').select('id').ilike('username', likeEscape(username)).maybeSingle()
    if (taken.data) throw new OnlineError('That username is taken.')
    const { data, error } = await c.auth.signUp({ email: emailFor(username), password, options: { data: { username } } })
    if (error) throw error
    if (!data.session) {
      throw new OnlineError('The account was made, but it needs confirming. (Site owner: turn off “Confirm email” in Supabase → Authentication → Sign In / Providers → Email.)')
    }
    return refresh()
  }

  async function signIn(username, password) {
    username = username.trim()
    if (!username || !password) throw new OnlineError('Type your username and password.')
    const c = await connect()
    const { error } = await c.auth.signInWithPassword({ email: emailFor(username), password })
    if (error) throw error
    const p = await refresh()
    if (p?.banned) {
      await signOut()
      throw new OnlineError('This account has been banned.')
    }
    return p
  }

  async function signOut() {
    const c = await connect()
    await c.auth.signOut({ scope: 'local' })
    await refresh()
  }

  async function setAllowDms(allow) {
    const c = await connect()
    const { error } = await c.from('profiles').update({ allow_dms: !!allow }).eq('id', profile.id)
    if (error) throw error
    profile = { ...profile, allow_dms: !!allow }
  }

  async function deleteAccount() {
    const c = await connect()
    const { error } = await c.rpc('delete_account')
    if (error) throw error
    await c.auth.signOut({ scope: 'local' })
    await refresh()
  }

  // ================= Leaderboards =================
  async function leaderboard(board = 'any', day = null) {
    const c = await connect()
    const { data, error } = await c.rpc('leaderboard', { p_board: board, p_day: day, p_limit: 50 })
    if (error) throw error
    return data
  }
  async function myRank(board = 'any', day = null) {
    if (!profile) return null
    const c = await connect()
    const { data, error } = await c.rpc('my_rank', { p_board: board, p_day: day })
    if (error) throw error
    return data?.[0] ?? null
  }
  // Live standings: the database announces every change on the public 'leaderboard' channel
  // (see notify_leaderboard in schema.sql), and whoever's watching fetches the new top times.
  let boardChannel = null
  const boardWatchers = new Set()
  /**
   * Calls onChange({ mode, ending }) whenever any leaderboard changes, and onStatus(live) when the
   * live connection comes and goes (after a drop, refetch: something may have been missed).
   * Returns a function that stops watching.
   */
  function watchLeaderboard({ onChange, onStatus } = {}) {
    const w = { onChange, onStatus }
    boardWatchers.add(w)
    connect()
      .then((c) => {
        if (!boardWatchers.has(w)) return
        if (!boardChannel) {
          boardChannel = c
            .channel('leaderboard')
            .on('broadcast', { event: 'changed' }, ({ payload }) => boardWatchers.forEach((x) => x.onChange?.(payload ?? {})))
            .subscribe((status) => boardWatchers.forEach((x) => x.onStatus?.(status === 'SUBSCRIBED')))
        } else if (boardChannel.state === 'joined') {
          onStatus?.(true)
        }
      })
      .catch(() => onStatus?.(false))
    return () => {
      boardWatchers.delete(w)
      if (!boardWatchers.size && boardChannel) {
        client.removeChannel(boardChannel)
        boardChannel = null
      }
    }
  }

  async function startRun(mode, gameStartedAt, day = null) {
    const c = await connect()
    const { data, error } = await c.rpc('start_run', { p_mode: mode, p_game_started_at: gameStartedAt ?? null, p_day: day })
    if (error) throw error
    return data
  }
  async function finishRun(runId, timeMs, ending, splits) {
    const c = await connect()
    const { data, error } = await c.rpc('finish_run', { p_run: runId, p_time_ms: Math.round(timeMs), p_ending: ending, p_splits: splits ?? null })
    if (error) throw error
    return data
  }

  // ================= Messenger =================
  const likeEscape = (s) => s.replace(/[\\%_*]/g, (c) => `\\${c}`)

  /** Players whose names start with `prefix` (for the "find a player" box). */
  async function findPlayers(prefix) {
    prefix = (prefix ?? '').trim()
    if (!/^[A-Za-z0-9_]{1,20}$/.test(prefix)) return []
    const c = await connect()
    const { data, error } = await c.from('profiles').select('id, username, allow_dms').ilike('username', `${likeEscape(prefix)}%`).eq('banned', false).order('username').limit(8)
    if (error) throw error
    return data.filter((p) => p.id !== profile?.id)
  }
  async function findPlayer(username, { includeBanned = false } = {}) {
    const c = await connect()
    const { data, error } = await c.from('profiles').select('id, username, allow_dms, banned').ilike('username', likeEscape(username.trim())).maybeSingle()
    if (error) throw error
    return data && (includeBanned || !data.banned) ? data : null
  }
  const names = new Map() // id -> username, for message notifications
  async function playerName(id) {
    if (names.has(id)) return names.get(id)
    const c = await connect()
    const { data } = await c.from('profiles').select('username').eq('id', id).maybeSingle()
    if (data) names.set(id, data.username)
    return data?.username ?? 'Someone'
  }
  async function conversations() {
    const c = await connect()
    const { data, error } = await c.rpc('conversations')
    if (error) throw error
    return data
  }
  /** Messages with `other`, oldest first; `beforeId` pages back through older ones. */
  async function history(other, beforeId = null) {
    if (!UUID.test(other) || !profile) return []
    const c = await connect()
    const pair = `and(sender.eq.${profile.id},recipient.eq.${other}),and(sender.eq.${other},recipient.eq.${profile.id})`
    let q = c.from('messages').select('id, sender, recipient, body, created_at, read_at').or(pair).order('id', { ascending: false }).limit(50)
    if (beforeId) q = q.lt('id', beforeId)
    const { data, error } = await q
    if (error) throw error
    return data.reverse()
  }
  async function send(other, body) {
    const c = await connect()
    const { data, error } = await c.rpc('send_message', { p_to: other, p_body: body })
    if (error) throw error
    return data
  }
  async function markRead(other) {
    const c = await connect()
    await c.rpc('mark_read', { p_other: other })
  }
  async function blocked() {
    const c = await connect()
    const { data, error } = await c.from('blocks').select('blocked')
    if (error) throw error
    return new Set(data.map((b) => b.blocked))
  }
  async function block(other) {
    const c = await connect()
    const { error } = await c.from('blocks').insert({ blocker: profile.id, blocked: other })
    if (error && error.code !== '23505') throw error // already blocked is fine
  }
  async function unblock(other) {
    const c = await connect()
    const { error } = await c.from('blocks').delete().eq('blocker', profile.id).eq('blocked', other)
    if (error) throw error
  }
  async function report(other, reason, messageId = null, runId = null) {
    const c = await connect()
    const { error } = await c.rpc('report', { p_user: other, p_reason: reason, p_message: messageId, p_run: runId })
    if (error) throw error
  }

  // New messages (to or from you, so other tabs stay in step) arrive as 'message' events.
  let inbox = null
  function subscribeInbox() {
    if (inbox) {
      client.removeChannel(inbox)
      inbox = null
    }
    // Only pages that show messages keep a live connection (not the game or the admin page).
    if (!profile || profile.banned || !listeners.message.size) return
    const push = (payload) => emit('message', payload.new)
    inbox = client
      .channel(`inbox:${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient=eq.${profile.id}` }, push)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender=eq.${profile.id}` }, push)
      // Connected (or back after a drop, like a laptop waking up): anything missed meanwhile needs fetching.
      .subscribe((status) => status === 'SUBSCRIBED' && emit('resync'))
  }

  // ================= Admin =================
  const admin = {
    async call(fn, args = {}) {
      const c = await connect()
      const { data, error } = await c.rpc(fn, args)
      if (error) throw error
      return data
    },
    reports: (openOnly = true) => admin.call('admin_reports', { p_open_only: openOnly }),
    resolve: (id) => admin.call('admin_resolve_report', { p_id: id }),
    setBanned: (user, banned) => admin.call('admin_set_banned', { p_user: user, p_banned: banned }),
    recentRuns: (limit = 100) => admin.call('admin_recent_runs', { p_limit: limit }),
    setRunRemoved: (run, removed, note = null) => admin.call('admin_set_run_removed', { p_run: run, p_removed: removed, p_note: note }),
  }

  // ================= Errors =================
  /** A sentence a player can read, for any error from here or from Supabase. */
  function errorText(err) {
    const msg = String(err?.message ?? err ?? '')
    const code = err?.code ?? ''
    if (err instanceof OnlineError) return msg
    if (/Invalid login credentials/i.test(msg)) return 'Wrong username or password.'
    if (/already registered|already exists/i.test(msg)) return 'That username is taken.'
    if (/Database error saving new user/i.test(msg)) return 'That username isn’t available. Try another one.'
    if (/Email not confirmed/i.test(msg)) return 'This account isn’t confirmed yet. (Site owner: turn off “Confirm email” in Supabase.)'
    if (/signups? (are|is) (disabled|not allowed)/i.test(msg)) return 'New accounts are switched off right now.'
    if (/rate limit|too many/i.test(msg) || err?.status === 429) return 'Too many tries. Wait a minute and try again.'
    if (/Password should/i.test(msg)) return msg
    if (/Failed to fetch|NetworkError|Load failed|network/i.test(msg)) return 'Can’t reach the server. Check your connection.'
    if (/JWT expired|invalid JWT|not authenticated/i.test(msg) || code === '28000') return 'Sign in first.'
    if (code === 'PGRST202' || /Could not find the function/i.test(msg)) return 'The server isn’t set up yet. (Site owner: run supabase/schema.sql.)'
    // Our own database functions raise friendly messages already.
    if (code === 'P0001' || code === '42501') return msg
    return msg || 'Something went wrong.'
  }

  window.nikstilOnline = {
    configured,
    connect,
    hasStoredSession,
    on,
    me,
    get profile() {
      return profile
    },
    signUp,
    signIn,
    signOut,
    setAllowDms,
    deleteAccount,
    leaderboard,
    myRank,
    watchLeaderboard,
    startRun,
    finishRun,
    findPlayers,
    findPlayer,
    playerName,
    conversations,
    history,
    send,
    markRead,
    blocked,
    block,
    unblock,
    report,
    admin,
    errorText,
    USERNAME,
  }
})()
