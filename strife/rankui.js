// Ranks on screen: the card on the main menu, what a ranked match did to your rank (on the match's
// end screen), and the Ranks page (the ladder and the online leaderboard). Signed in to nikstil.com,
// ranked matches also go to the server, which keeps the rating the leaderboard shows.

import { RANKS, RANK_AT, PLACEMENT, RANKED_MODES, BOT_RATING, tierOf, rankName, rankBadge, recordMatch, shownRank, setOnlineRank, botTier } from './ranks.js'

const $ = (s) => document.querySelector(s)
const online = () => window.nikstilOnline ?? null
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

export function initRanks({ difficultyName }) {
  let me = null // the signed-in nikstil.com profile, if any

  // ---------------- Who's signed in (the page works the same without)
  async function boot() {
    try {
      me = (await online()?.me()) ?? null
    } catch {
      me = null
    }
    setOnlineRank(me ? onlineCacheFor(me) : null)
    renderCard()
    if (me) refreshOnline()
  }
  // the cached online rank only counts for the account it came from
  const onlineCacheFor = (p) => {
    try {
      const c = JSON.parse(localStorage.getItem('strife-rank-online'))
      return c && c.user === p.username ? c : null
    } catch {
      return null
    }
  }
  async function refreshOnline() {
    if (!me) return
    try {
      const r = await online().strifeRating()
      setOnlineRank({ ...(r ?? { rating: 1000, matches: 0, wins: 0, losses: 0 }), user: me.username })
    } catch {}
    renderCard()
  }

  const placedTier = (r) => (r.matches >= PLACEMENT ? tierOf(r.rating) : null)
  /** The skill group to show next to your name (null: not placed yet). */
  const myTier = () => placedTier(shownRank(!!me))

  // ---------------- The main menu card
  function renderCard() {
    const el = $('#rank-card')
    if (!el) return
    const r = shownRank(!!me)
    const tier = placedTier(r)
    const left = PLACEMENT - r.matches
    const next = tier != null && tier < RANKS.length - 1 ? RANK_AT[tier + 1] - r.rating : 0
    el.innerHTML = `${rankBadge(tier)}<div class="rk-text"><b>${tier != null ? rankName(tier) : 'Unranked'}</b><small>${
      tier != null ? `${r.rating} · ${r.wins}W ${r.losses}L${next ? ` · ${next} to ${rankName(tier + 1)}` : ''}` : `${left} ranked match${left === 1 ? '' : 'es'} to get a rank`
    }</small><small class="rk-where">${r.online ? `🌐 Online rank (${esc(me?.username)})` : '📱 On this device'}</small></div><button class="ghost small" data-do="ranks">Ranks</button>`
  }

  // ---------------- A ranked match
  /** Call when a match starts. Returns the ranked match (or null when this one isn't ranked). */
  function startMatch(game, mapId) {
    if (!game?.player || game.practice || game.client || !RANKED_MODES.includes(game.mode)) return null
    const ctx = { mode: game.mode, map: mapId, difficulty: game.difficulty, roundsToWin: game.rules.roundsToWin, matchId: null, done: false }
    if (me) {
      online()
        .strifeStart(ctx.mode, ctx.map, ctx.difficulty, ctx.roundsToWin)
        .then((id) => (ctx.matchId = id))
        .catch((e) => (ctx.error = online().errorText(e)))
    }
    return ctx
  }
  /** Your rank on the scoreboard, and the bots' (from how good they are). */
  function tagActors(game) {
    for (const a of game.actors) {
      if (a === game.player) a.rankTier = myTier()
      else if (a.isBot) a.rankTier = botTier(game.difficulty, a.id)
    }
  }
  /** The match is over: rate it, here and (signed in) on the server, and show what happened. */
  function finishMatch(ctx, game) {
    if (!ctx || ctx.done) return
    ctx.done = true
    const p = game.player
    const us = game.score[p.team]
    const them = game.score[p.team === 'T' ? 'CT' : 'T']
    const m = { won: game.winner === p.team, difficulty: ctx.difficulty, roundsToWin: ctx.roundsToWin, rounds: us + them, kills: p.kills, deaths: p.deaths, map: ctx.map, mode: ctx.mode }
    const local = recordMatch(m)
    showResult({ ...local, online: false })
    if (!me) return
    const send = () =>
      online()
        .strifeFinish(ctx.matchId, { won: m.won, roundsUs: us, roundsThem: them, kills: p.kills, deaths: p.deaths, mvps: p.mvps ?? 0 })
        .then((r) => {
          if (!r) return
          setOnlineRank({ ...r, user: me.username })
          renderCard()
          const before = r.rating - r.delta
          showResult({ before, after: r.rating, delta: r.delta, tierBefore: tierOf(before), tierAfter: tierOf(r.rating), placed: r.matches >= PLACEMENT, justPlaced: r.matches === PLACEMENT, matches: r.matches, online: true, boardRank: r.board_rank })
        })
        .catch((e) => note(`Couldn’t save this one online (${online().errorText(e)}): it counted on this device.`))
    if (ctx.matchId) send()
    else if (ctx.error) note(`Not ranked online: ${ctx.error}`)
    else setTimeout(() => (ctx.matchId ? send() : note('Couldn’t reach the server: this match counted on this device.')), 2500)
  }
  /** Walking out of a ranked match counts as a loss (the server counts it when the next one starts). */
  function abandon(ctx) {
    if (!ctx || ctx.done) return
    ctx.done = true
    recordMatch({ won: false, difficulty: ctx.difficulty, roundsToWin: ctx.roundsToWin, rounds: 1, kills: 0, deaths: 0, map: ctx.map, mode: ctx.mode })
    renderCard()
  }

  function showResult(r) {
    const el = $('#over-rank')
    if (!el) return
    el.hidden = false
    const tier = r.placed ? r.tierAfter : null
    const up = r.placed && !r.justPlaced && r.tierAfter > r.tierBefore
    const down = r.placed && !r.justPlaced && r.tierAfter < r.tierBefore
    const lo = tier != null ? RANK_AT[tier] : 0
    const hi = tier != null && tier < RANKS.length - 1 ? RANK_AT[tier + 1] : lo + 100
    const pct = tier != null ? Math.max(3, Math.min(100, ((r.after - lo) / (hi - lo)) * 100)) : (r.matches / PLACEMENT) * 100
    el.className = 'over-rank' + (up ? ' up' : down ? ' down' : r.justPlaced ? ' placed' : '')
    const head = r.justPlaced ? 'You’ve been placed!' : up ? 'Rank up!' : down ? 'Rank down' : tier != null ? rankName(tier) : 'Unranked'
    const sub =
      tier == null
        ? `${PLACEMENT - r.matches} more ranked match${PLACEMENT - r.matches === 1 ? '' : 'es'} to get a rank`
        : `${rankName(tier)} · ${r.after}${r.online && r.boardRank ? ` · #${r.boardRank} online` : ''}`
    el.innerHTML = `${rankBadge(tier)}<div class="rk-text"><b>${head}</b><small>${sub}</small><div class="rk-bar"><i style="width:${pct.toFixed(0)}%"></i></div></div><span class="rk-delta ${r.delta >= 0 ? 'plus' : 'minus'}">${r.delta >= 0 ? '+' : ''}${r.delta}</span>${
      r.online ? '<small class="rk-where">🌐 online</small>' : ''
    }<p class="rk-note" hidden></p>`
  }
  function note(text) {
    const n = $('#over-rank .rk-note')
    if (!n) return
    n.hidden = false
    n.textContent = text
  }
  function hideResult() {
    const el = $('#over-rank')
    if (el) el.hidden = true
  }

  // ---------------- The Ranks page
  let seq = 0
  async function openBoard() {
    const body = $('#ranks-body')
    const r = shownRank(!!me)
    const tier = placedTier(r)
    const ladder = RANKS.map((name, t) => `<li class="${t === tier ? 'me' : ''}">${rankBadge(t)}<span>${name}</span><small>${RANK_AT[t] || '—'}</small></li>`).join('')
    body.innerHTML = `<div class="rk-mine">${rankBadge(tier)}<div><b>${tier != null ? rankName(tier) : 'Unranked'}</b><small>${
      tier != null ? `Rating ${r.rating} · ${r.wins} wins, ${r.losses} losses` : `Play ${PLACEMENT - r.matches} more ranked match${PLACEMENT - r.matches === 1 ? '' : 'es'} to get a rank`
    }</small><small>${r.online ? `🌐 Online rank for ${esc(me?.username)}` : '📱 This device’s rank. Sign in to nikstil.com (on the desktop) to get on the online leaderboard.'}</small></div></div>
      <p class="rk-how">Competitive and Wingman matches against bots are ranked (offline, or hosting online). Beating harder bots is worth more: they count as ${BOT_RATING.map((x, i) => `${difficultyName(i)} ${x}`).join(', ')}. Leaving a ranked match counts as a loss.</p>
      <div class="rk-cols"><div><h3>Online leaderboard</h3><p class="rk-status">Loading…</p><table class="rk-board"></table></div><div><h3>Skill groups</h3><ol class="rk-ladder">${ladder}</ol></div></div>`
    const run = ++seq
    const status = $('#ranks-body .rk-status')
    if (!online() || !(await online().configured.catch(() => false))) {
      status.textContent = 'The online leaderboard isn’t switched on for this site.'
      return
    }
    try {
      const rows = await online().strifeLeaderboard(50)
      if (run !== seq) return
      const t = $('#ranks-body .rk-board')
      t.innerHTML = `<tr><th>#</th><th>Player</th><th>Rank</th><th>Rating</th><th>W–L</th></tr>${rows
        .map((x) => `<tr class="${me && x.user_id === me.id ? 'me' : ''}"><td>${['🥇', '🥈', '🥉'][x.rank - 1] ?? x.rank}</td><td>${esc(x.username)}</td><td>${rankBadge(x.tier)}</td><td>${x.rating}</td><td>${x.wins}–${x.losses}</td></tr>`)
        .join('')}`
      status.textContent = rows.length ? '' : 'Nobody’s ranked online yet. Be the first: sign in and play three ranked matches.'
    } catch (e) {
      if (run === seq) status.textContent = online().errorText(e)
    }
  }

  boot()
  return { renderCard, refreshOnline, startMatch, tagActors, finishMatch, abandon, hideResult, openBoard, myTier, get signedIn() {
    return !!me
  } }
}
