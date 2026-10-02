import { useState } from 'react'
import { BOOKMARKS } from '../../data/arcade'

/** What was typed → an address: a path, a URL, a domain, or a Wikipedia search. */
function resolve(q) {
  q = q.trim()
  if (!q || q === 'home') return 'home'
  if (q.startsWith('/')) return new URL(q, location.href).href
  if (/^https?:\/\//i.test(q)) {
    try {
      return new URL(q).href
    } catch {
      return null
    }
  }
  if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(q)) return `https://${q}`
  return `https://en.m.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`
}
// TRANSLATR™ in a frame inside TRANSLATR™ would share (and fight over) this save.
const nested = (url) => {
  const u = new URL(url)
  return u.origin === location.origin && (u.pathname === '/' || u.pathname.startsWith('/translatr'))
}

/** The phone's browser: an address bar, back/forward, a start page of bookmarks, and a frame. */
export default function Browser() {
  const [stack, setStack] = useState({ list: ['home'], at: 0 })
  const [typed, setTyped] = useState('')
  const url = stack.list[stack.at]
  const go = (q) => {
    const next = resolve(q)
    if (!next) return
    setTyped(next === 'home' ? '' : next.replace(location.origin, location.host))
    setStack((s) => ({ list: [...s.list.slice(0, s.at + 1), next], at: s.at + 1 }))
  }
  const move = (d) =>
    setStack((s) => {
      const at = Math.max(0, Math.min(s.list.length - 1, s.at + d))
      const u = s.list[at]
      setTyped(u === 'home' ? '' : u.replace(location.origin, location.host))
      return { ...s, at }
    })
  return (
    <div className="phone-browser">
      <form
        className="phone-urlbar"
        onSubmit={(e) => {
          e.preventDefault()
          go(typed)
        }}
      >
        <button type="button" onClick={() => move(-1)} disabled={stack.at === 0} aria-label="Back">
          ‹
        </button>
        <button type="button" onClick={() => move(1)} disabled={stack.at >= stack.list.length - 1} aria-label="Forward">
          ›
        </button>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search or type an address" aria-label="Address" enterKeyHint="go" />
        <button type="button" onClick={() => go('home')} aria-label="Start page">
          ⌂
        </button>
      </form>
      {url === 'home' ? (
        <div className="phone-start">
          <p className="phone-start-title">Bookmarks</p>
          <ul className="phone-tiles">
            {BOOKMARKS.map((b) => (
              <li key={b.url}>
                <button type="button" onClick={() => go(b.url)}>
                  <span aria-hidden="true">{b.icon}</span>
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
          <p className="phone-fine">Mobile data is not included. The browser runs on your wallet’s Wi-Fi.</p>
        </div>
      ) : nested(url) ? (
        <div className="phone-start phone-fine">This page is already open. It’s the one you’re on. Put the phone down.</div>
      ) : (
        <iframe key={url} className="phone-frame" src={url} title="Browser" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" allow="fullscreen; autoplay" />
      )}
    </div>
  )
}
