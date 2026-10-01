import { useCallback, useEffect, useState } from 'react'
import Modal from './Modal'
import { useGameStore } from '../store/useGameStore'
import { STAT_COUNT, UNWRAPPED, personaFor, showStat } from '../data/unwrapped'

const YEAR = new Date().getFullYear()

/** TRANSLATR™ Unwrapped: 79 stats as story slides, an all-stats view and a shareable image. */
export default function Unwrapped() {
  const open = useGameStore((s) => s.unwrappedOpen)
  const close = useGameStore((s) => s.closeUnwrapped)
  return (
    <Modal open={open} z={950} onBackdrop={close} backdrop="bg-[#050816]/80">
      <UnwrappedBody onClose={close} />
    </Modal>
  )
}

function UnwrappedBody({ onClose }) {
  const [s] = useState(() => useGameStore.getState()) // a snapshot: the numbers hold still while you read
  const persona = personaFor(s)
  const slides = [{ id: 'intro' }, ...UNWRAPPED.map((g) => ({ id: g.id, group: g })), { id: 'outro' }]
  const [i, setI] = useState(0)
  const [all, setAll] = useState(false)
  const slide = slides[i]
  const go = useCallback((d) => setI((n) => Math.max(0, Math.min(slides.length - 1, n + d))), [slides.length])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [go, onClose])

  const colors = slide.group?.colors ?? (slide.id === 'intro' ? ['#6d28d9', '#db2777'] : ['#0f766e', '#4f46e5'])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="TRANSLATR Unwrapped"
      className="unwrapped relative flex h-[min(760px,92vh)] w-[min(460px,94vw)] flex-col overflow-hidden rounded-2xl text-[#fff] shadow-2xl"
      style={{ background: `linear-gradient(160deg, ${colors[0]}, ${colors[1]})` }}
    >
      {/* Story progress */}
      <div className="flex gap-1 px-3 pt-3">
        {slides.map((sl, n) => (
          <button key={sl.id} className="h-1 flex-1 rounded-full bg-white/25" onClick={() => setI(n)} aria-label={`Slide ${n + 1}`}>
            <span className={`block h-full rounded-full bg-white transition-[width] duration-300 ${n <= i ? 'w-full' : 'w-0'}`} />
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 pt-2 text-[0.6875rem] font-semibold uppercase tracking-widest opacity-80">
        <span>TRANSLATR™ Unwrapped {YEAR}</span>
        <span className="flex gap-1">
          <button className="rounded px-2 py-0.5 hover:bg-white/15" onClick={() => setAll((a) => !a)}>
            {all ? 'Slides' : `All ${STAT_COUNT} stats`}
          </button>
          <button className="rounded px-2 py-0.5 hover:bg-white/15" onClick={onClose} aria-label="Close Unwrapped">
            ✕
          </button>
        </span>
      </div>

      {all ? (
        <AllStats s={s} />
      ) : (
        <div className="relative min-h-0 flex-1">
          <div key={slide.id} className="unwrapped-slide absolute inset-0 overflow-y-auto px-6 pb-20 pt-6">
            {slide.id === 'intro' && <Intro s={s} persona={persona} />}
            {slide.group && <Group group={slide.group} s={s} />}
            {slide.id === 'outro' && <Outro s={s} persona={persona} />}
          </div>
          {/* Tap zones, like every story UI ever */}
          <button className="absolute inset-y-0 left-0 w-1/4" onClick={() => go(-1)} aria-label="Previous" disabled={i === 0} />
          <button className="absolute inset-y-0 right-0 w-1/4" onClick={() => go(1)} aria-label="Next" disabled={i === slides.length - 1} />
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            <button className="rounded-full bg-white/15 px-4 py-1.5 text-sm hover:bg-white/25 disabled:opacity-30" onClick={() => go(-1)} disabled={i === 0}>
              ◀
            </button>
            <span className="self-center font-mono text-xs opacity-70">
              {i + 1}/{slides.length}
            </span>
            <button className="rounded-full bg-white/15 px-4 py-1.5 text-sm hover:bg-white/25 disabled:opacity-30" onClick={() => go(1)} disabled={i === slides.length - 1}>
              ▶
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Intro({ s, persona }) {
  return (
    <div className="flex h-full flex-col justify-center text-center">
      <div className="text-6xl">🎁</div>
      <h2 className="mt-4 text-4xl font-black leading-tight">Your {YEAR}, Unwrapped.</h2>
      <p className="mt-3 text-lg opacity-85">We tracked everything so you don’t have to. {STAT_COUNT} stats. Zero consent.</p>
      <div className="mx-auto mt-8 rounded-2xl bg-white/15 px-5 py-4">
        <div className="text-xs uppercase tracking-widest opacity-75">You are</div>
        <div className="mt-1 text-3xl font-black">
          {persona.icon} {persona.title}
        </div>
        <div className="mt-1 text-sm opacity-85">{persona.line}</div>
      </div>
      <p className="mt-6 text-xs opacity-60">Tap the right side to continue →</p>
    </div>
  )
}

function Group({ group, s }) {
  const [hero, ...rest] = group.stats
  return (
    <div>
      <div className="text-sm font-bold uppercase tracking-widest opacity-80">
        {group.icon} {group.title}
      </div>
      <div className="mt-4">
        <div className="text-[0.8125rem] opacity-80">{hero.label}</div>
        <div className="unwrapped-hero text-5xl font-black leading-none">{showStat(hero, s)}</div>
        {hero.note && <div className="mt-2 text-sm opacity-85">{hero.note(hero.value(s), s)}</div>}
      </div>
      <div className="mt-6 space-y-2.5">
        {rest.map((st, n) => (
          <div key={st.label} className="unwrapped-row rounded-xl bg-white/12 px-4 py-2.5" style={{ animationDelay: `${120 + n * 90}ms` }}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[0.8125rem] opacity-85">{st.label}</span>
              <span className="font-mono text-lg font-bold">{showStat(st, s)}</span>
            </div>
            {st.note && <div className="text-[0.71875rem] opacity-70">{st.note(st.value(s), s)}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function Outro({ s, persona }) {
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const highlights = shareHighlights(s)
  const share = async () => {
    setBusy(true)
    try {
      const blob = await renderShareImage(s, persona, highlights)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `translatr-unwrapped-${YEAR}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    const text = `My TRANSLATR™ Unwrapped ${YEAR}: I'm ${persona.title}. ${highlights.map(([k, v]) => `${k}: ${v}`).join(' · ')}. nikstil.com/translatr`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="flex h-full flex-col justify-center text-center">
      <div className="text-5xl">{persona.icon}</div>
      <h2 className="mt-3 text-3xl font-black">That was your year.</h2>
      <p className="mt-2 opacity-85">Share it with your friends. Please. Our growth targets depend on it.</p>
      <div className="mt-5 grid grid-cols-2 gap-2 text-left">
        {highlights.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white/12 px-3 py-2">
            <div className="text-[0.625rem] uppercase tracking-wider opacity-70">{k}</div>
            <div className="font-mono text-base font-bold">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button className="rounded-full bg-white px-5 py-2 text-sm font-bold text-[#1e1b4b] hover:scale-105 disabled:opacity-60" onClick={share} disabled={busy}>
          {busy ? 'Rendering…' : '⬇ Save share image'}
        </button>
        <button className="rounded-full bg-white/20 px-5 py-2 text-sm font-bold hover:bg-white/30" onClick={copy}>
          {copied ? '✓ Copied' : '📋 Copy as text'}
        </button>
      </div>
    </div>
  )
}

function AllStats({ s }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
      {UNWRAPPED.map((g) => (
        <section key={g.id} className="mb-4">
          <div className="mb-1.5 text-xs font-bold uppercase tracking-widest opacity-80">
            {g.icon} {g.title}
          </div>
          <div className="overflow-hidden rounded-xl bg-white/10">
            {g.stats.map((st) => (
              <div key={st.label} className="flex items-baseline justify-between gap-3 border-b border-white/10 px-3 py-1.5 last:border-0">
                <span className="text-[0.78125rem] opacity-85">{st.label}</span>
                <span className="font-mono text-[0.8125rem] font-bold">{showStat(st, s)}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/** The eight numbers that go on the share card. */
function shareHighlights(s) {
  const pick = (groupId, label) => {
    const st = UNWRAPPED.find((g) => g.id === groupId)?.stats.find((x) => x.label === label)
    return [label, st ? showStat(st, s) : '—']
  }
  return [
    pick('time', 'Time played'),
    pick('income', 'Peak wallet'),
    pick('ads', 'Ads endured'),
    pick('outcome', 'Lost to the cat'),
    pick('translator', 'Words translated'),
    pick('loot', 'Mystery boxes opened'),
    pick('store', 'Microtransactions'),
    pick('social', 'Best leaderboard rank'),
  ]
}

/** Draws the share card (1080×1350) and returns it as a PNG blob. */
function renderShareImage(s, persona, highlights) {
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  const bg = g.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#6d28d9')
  bg.addColorStop(0.55, '#db2777')
  bg.addColorStop(1, '#f59e0b')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  // soft blobs
  for (const [x, y, r, a] of [[180, 220, 320, 0.18], [900, 520, 380, 0.12], [300, 1180, 420, 0.14]]) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, `rgba(255,255,255,${a})`)
    rg.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = rg
    g.fillRect(0, 0, W, H)
  }
  const font = (w, px) => `${w} ${px}px "Segoe UI", system-ui, -apple-system, Roboto, sans-serif`
  g.fillStyle = '#fff'
  g.textBaseline = 'top'
  g.font = font(700, 34)
  g.globalAlpha = 0.85
  g.fillText(`TRANSLATR™ UNWRAPPED ${YEAR}`, 80, 80)
  g.globalAlpha = 1
  g.font = font(900, 92)
  g.fillText('I am', 80, 150)
  g.font = font(900, 104)
  g.fillText(`${persona.icon} ${persona.title}`, 80, 250)
  g.font = font(500, 38)
  g.globalAlpha = 0.9
  g.fillText(persona.line, 80, 380)
  g.globalAlpha = 1

  highlights.forEach(([k, v], n) => {
    const col = n % 2
    const row = Math.floor(n / 2)
    const x = 80 + col * 470
    const y = 480 + row * 185
    g.fillStyle = 'rgba(255,255,255,0.14)'
    roundRect(g, x, y, 440, 160, 28)
    g.fill()
    g.fillStyle = '#fff'
    g.globalAlpha = 0.8
    g.font = font(600, 28)
    g.fillText(k.toUpperCase(), x + 30, y + 28)
    g.globalAlpha = 1
    g.font = font(800, 58)
    g.fillText(String(v), x + 30, y + 70, 380)
  })

  g.font = font(600, 32)
  g.globalAlpha = 0.9
  g.fillText('Play (and regret it) at nikstil.com/translatr', 80, H - 110)
  g.globalAlpha = 1
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'))
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}
