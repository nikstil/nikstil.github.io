import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { AUTHORS, makeDoomPosts } from '../data/doomfeed'
import { PREMIUM_ITEMS } from '../data/gameData'
import { sfx } from '../lib/audio/engine'
import { liteGraphics } from '../lib/settings'

const AUTOPLAY_PX_PER_SEC = 26
const BATCH = 8
const MAX_POSTS = 72 // older posts are trimmed (with scroll compensation) so the DOM stays small forever
const TRIM = 24
const LOAD_AHEAD_PX = 600
const PX_TO_METERS = 0.0254 / 96

const compact = (n) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K` : String(n)
const fmtTime = (sec) => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}
const fmtDist = (m) => (m < 1000 ? `${m.toFixed(m < 10 ? 2 : 1)} m` : `${(m / 1000).toFixed(2)} km`)

/** Time wasted, distance scrolled, dopamine. Ticks every second, so it re-renders alone. */
function DoomStats() {
  const seconds = useGameStore((s) => Math.floor(s.stats.doomSeconds ?? 0))
  const meters = useGameStore((s) => s.stats.doomMeters ?? 0)
  const dopamine = useGameStore((s) => s.stats.doomLikes ?? 0)
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-b border-ink/10 px-2.5 py-1 text-[0.6875rem] text-ink/60">
      <span title="Time spent with DoomFeed™ open">⏱ {fmtTime(seconds)} wasted</span>
      <span title="Distance scrolled">📏 {fmtDist(meters)}</span>
      <span title="Posts liked. Dopamine is not redeemable.">🧠 {dopamine} dopamine</span>
    </div>
  )
}

/** DoomFeed™ as an app on the TRANSLATR™ Phone: the same endless feed, full screen. */
export function DoomFeedApp() {
  const touchGrass = useGameStore((s) => s.touchGrass)
  const grassStreak = useGameStore((s) => s.grassStreak)
  const [tab, setTab] = useState('foryou')
  const [autoplay, setAutoplay] = useState(true)
  return (
    <div className="doom-app flex h-full min-h-0 flex-col text-ink" style={{ '--accent': '#e0663a' }}>
      <div className="flex items-center gap-1 border-b border-ink/10 px-2 py-1.5">
        <button className={`doom-tab-btn ${tab === 'foryou' ? 'active' : ''}`} onClick={() => setTab('foryou')}>
          For You
        </button>
        <button className={`doom-tab-btn ${tab === 'following' ? 'active' : ''}`} onClick={() => setTab('following')}>
          Following (0)
        </button>
        <button className="doom-tab-btn" title={autoplay ? 'Pause autoplay' : 'Resume autoplay'} onClick={() => setAutoplay((a) => !a)}>
          {autoplay ? '❚❚' : '▶'}
        </button>
        <button data-grass className="btn btn-sm ml-auto whitespace-nowrap" onClick={touchGrass} title="Go outside">
          🌱 Touch grass{grassStreak >= 5 && <span className="font-mono text-[0.625rem] text-toxic"> ×{grassStreak}</span>}
        </button>
      </div>
      <DoomStats />
      {tab === 'foryou' ? (
        <Feed horizontal={false} autoplay={autoplay} />
      ) : (
        <div className="grid flex-1 place-items-center p-4 text-center text-[0.8125rem] text-ink/60">
          <div>
            <div className="mb-2 text-3xl">🫥</div>
            You follow 0 accounts. 0 accounts follow you.
            <div>
              <button className="btn btn-sm mt-3" onClick={() => setTab('foryou')}>
                Back to For You
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** The endless list: infinite loading, autoplay, trimming, and distance tracking. */
function Feed({ horizontal, autoplay }) {
  const [posts, setPosts] = useState(() => makeDoomPosts(12, useGameStore.getState()))
  const listRef = useRef(null)
  const lastPos = useRef(0)
  const distance = useRef(0)
  const loading = useRef(false)
  const trimBy = useRef(null)
  const paused = useRef(false)

  const loadMore = useCallback(() => {
    if (loading.current) return
    loading.current = true
    setPosts((ps) => [...ps, ...makeDoomPosts(BATCH, useGameStore.getState())])
  }, [])

  const onScroll = () => {
    const el = listRef.current
    if (!el) return
    const pos = horizontal ? el.scrollLeft : el.scrollTop
    distance.current += Math.abs(pos - lastPos.current)
    lastPos.current = pos
    const remaining = horizontal ? el.scrollWidth - el.clientWidth - pos : el.scrollHeight - el.clientHeight - pos
    if (remaining < LOAD_AHEAD_PX) loadMore()
  }

  // After every posts change: compensate a trim, trim if too long, or top up if too short.
  useLayoutEffect(() => {
    loading.current = false
    const el = listRef.current
    if (!el) return
    if (trimBy.current != null) {
      const removed = trimBy.current
      trimBy.current = null
      if (horizontal) el.scrollLeft -= removed
      else el.scrollTop -= removed
      lastPos.current = horizontal ? el.scrollLeft : el.scrollTop // the jump isn't "scrolling"
      return
    }
    if (posts.length > MAX_POSTS) {
      const first = el.children[0]
      const kept = el.children[TRIM]
      if (first && kept) {
        trimBy.current = horizontal ? kept.offsetLeft - first.offsetLeft : kept.offsetTop - first.offsetTop
        setPosts((ps) => ps.slice(TRIM))
      }
      return
    }
    const pos = horizontal ? el.scrollLeft : el.scrollTop
    const remaining = horizontal ? el.scrollWidth - el.clientWidth - pos : el.scrollHeight - el.clientHeight - pos
    if (remaining < LOAD_AHEAD_PX) loadMore()
  }, [posts, horizontal, loadMore])

  // Autoplay: the feed scrolls itself. Pauses while hovered/touched or when the tab is hidden.
  useEffect(() => {
    if (!autoplay) return
    let raf = 0
    let last = performance.now()
    let carry = 0
    const step = (t) => {
      // Lite graphics: scroll ~12 times a second instead of every frame (each scroll is a repaint).
      if (liteGraphics() && t - last < 80) {
        raf = requestAnimationFrame(step)
        return
      }
      const dt = Math.min(0.1, (t - last) / 1000)
      last = t
      const el = listRef.current
      if (el && !paused.current && !document.hidden) {
        carry += AUTOPLAY_PX_PER_SEC * dt
        const px = Math.floor(carry)
        if (px >= 1) {
          carry -= px
          if (horizontal) el.scrollLeft += px
          else el.scrollTop += px
        }
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [autoplay, horizontal])

  // Horizontal strip: the mouse wheel scrolls sideways.
  useEffect(() => {
    const el = listRef.current
    if (!el || !horizontal) return
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      el.scrollLeft += e.deltaY
      e.preventDefault()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [horizontal])

  // Flush scrolled distance to the store every 2s (and on unmount) instead of on every scroll event.
  useEffect(() => {
    const flush = () => {
      const px = distance.current
      if (px <= 0) return
      distance.current = 0
      useGameStore.getState().addDoomMeters(px * PX_TO_METERS)
    }
    const id = setInterval(flush, 2000)
    return () => {
      clearInterval(id)
      flush()
    }
  }, [])

  const onLike = useCallback((id, liked) => {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, liked } : p)))
    if (liked) {
      useGameStore.getState().likeDoomPost()
      sfx('coin')
    }
  }, [])

  return (
    <div
      ref={listRef}
      onScroll={onScroll}
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      className={`relative min-h-0 flex-1 gap-2 p-2 ${horizontal ? 'flex overflow-x-auto overflow-y-hidden' : 'flex flex-col overflow-y-auto'}`}
      style={{ overscrollBehavior: 'contain' }}
    >
      {posts.map((p) => (
        <Post key={p.id} post={p} horizontal={horizontal} onLike={onLike} />
      ))}
    </div>
  )
}

const Post = memo(function Post({ post, horizontal, onLike }) {
  // Re-render every 5s so timestamps and "viral" like counts keep ticking.
  const slot = useGameStore((s) => Math.floor(s.clock / 5000))
  const toast = useGameStore((s) => s.toast)
  const a = AUTHORS[post.author] ?? AUTHORS.algo
  const age = Math.max(0, (slot * 5000 - post.born) / 1000)
  const likes = Math.floor(post.likes + age * post.velocity) + (post.liked ? 1 : 0)
  const ago = age < 10 ? 'now' : age < 60 ? `${Math.floor(age)}s` : `${Math.floor(age / 60)}m`

  const buy = () => {
    const s = useGameStore.getState()
    const def = PREMIUM_ITEMS.find((p) => p.id === post.itemId)
    if (def?.oneTime && s.premium[def.id]) return s.toast(`You already own ${def.name}. The algorithm will keep showing you this ad anyway.`, 'info')
    s.startCheckout(post.itemId)
  }

  return (
    <article className={`doom-post ${horizontal ? 'flex h-full w-60 shrink-0 flex-col overflow-hidden' : ''}`}>
      <div className="flex gap-2">
        <div className="doom-avatar">{a.avatar}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[0.75rem] leading-tight">
            <b className="truncate text-ink">{a.name}</b>
            {a.verified && (
              <span className="doom-verified" title={a.verified === 'paid' ? 'Verified ($8/mo)' : 'Verified organization'}>
                ✔
              </span>
            )}
          </div>
          <div className="truncate text-[0.6875rem] text-ink/45">
            @{a.handle} · {post.sponsored ? 'Sponsored' : ago}
          </div>
        </div>
      </div>
      <p className={`mt-1.5 text-[0.8125rem] leading-snug text-ink ${horizontal ? 'line-clamp-4' : ''}`}>{post.text}</p>
      {post.media && !horizontal && (
        <div className={`stock-watermark relative mt-2 grid h-24 place-items-center overflow-hidden rounded bg-linear-to-br text-4xl ${post.media.theme}`}>{post.media.art}</div>
      )}
      {post.sponsored && (
        <button className="btn btn-magenta btn-sm mt-2 w-full" onClick={buy}>
          {post.cta}
        </button>
      )}
      <div className={`flex items-center justify-between pt-1.5 ${horizontal ? 'mt-auto' : 'mt-1.5'}`}>
        <button className={`doom-action ${post.liked ? 'liked' : ''}`} onClick={() => onLike(post.id, !post.liked)} title="Like (+1 dopamine)">
          {post.liked ? '♥' : '♡'} {compact(likes)}
        </button>
        <button className="doom-action" onClick={() => toast('💬 Comments are disabled to protect your mental health (and our servers).', 'info')}>
          💬 {compact(post.comments)}
        </button>
        <button className="doom-action" onClick={() => toast('🔁 Reposted. Nobody saw it.', 'info')}>
          🔁 {compact(post.reposts)}
        </button>
        <button className="doom-action" onClick={() => toast('📤 Shared with 0 friends. They were busy scrolling.', 'info')} title="Share">
          📤
        </button>
      </div>
    </article>
  )
})
