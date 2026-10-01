import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../store/useGameStore'
import { ENDINGS, ENDING_BY_ID, fmtRunTime } from '../data/endings'
import { CREDITS, ENDING_STORY } from '../data/endingStory'
import { ACHIEVEMENTS } from '../data/achievements'
import { NG_CURSES, cursesFor } from '../data/runMods'
import { money } from '../lib/format'
import { sfx } from '../lib/audio/engine'

const LINE_MS = 2800 // story lines appear one at a time (click to hurry them)
const DELETE_STEP_MS = 700
const SOUND = { snail: 'fanfare', buy: 'jackpot', slave: 'printer', secret: 'ascend', bankrupt: 'hiss', grass: 'purr', taught: 'levelup', shooter: 'horn', deleted: 'shutdown' }
const PARTICLES = { snail: ['🐌', '🍃', '✨'], slave: ['📄', '💼', '📎'], shooter: ['💥', '👹', '🔥'], buy: ['💰', '💸'], secret: ['🕊️', '✨'], bankrupt: ['💸', '🧾'], grass: ['🌱', '✨'], taught: ['ibus', 'um', 'ae', 'us', 'ex', '✍️'], deleted: [] }

/** Plays when the store's `over` is set: story → credits → summary. Loaded on demand. */
export default function EndingScreen() {
  const over = useGameStore((s) => s.over)
  if (!over || !ENDING_BY_ID[over]) return null
  return createPortal(<Ending key={over} id={over} />, document.body)
}

function Ending({ id }) {
  const def = ENDING_BY_ID[id]
  const story = ENDING_STORY[id]
  const [snap] = useState(() => useGameStore.getState()) // the moment it ended (the loop is paused anyway)
  const [at] = useState(() => Date.now())
  const deleting = useMemo(() => story.deleting?.(snap) ?? [], [story, snap])
  // Some stories quote your save (a function of it); the rest are fixed.
  const lines = useMemo(() => (typeof story.lines === 'function' ? story.lines(snap) : story.lines), [story, snap])
  const [phase, setPhase] = useState(deleting.length ? 'deleting' : 'story')
  const [step, setStep] = useState(deleting.length ? 0 : 1)
  const [particles] = useState(() =>
    PARTICLES[id].length
      ? Array.from({ length: 18 }, (_, i) => ({ e: PARTICLES[id][i % PARTICLES[id].length], x: Math.random() * 100, d: Math.random() * 8, t: 7 + Math.random() * 6, s: 18 + Math.random() * 22 }))
      : [],
  )

  useEffect(() => {
    sfx(SOUND[id])
    // The game behind the ending doesn't scroll (no stray scrollbar over the scene).
    const html = document.documentElement
    const before = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = before
    }
  }, [id])

  // Advance by one: finish the deletion list, show the next line, roll the credits, show the summary.
  const advance = useCallback(() => {
    if (phase === 'deleting') {
      setPhase('story')
      setStep(1)
    } else if (phase === 'story') {
      if (step < lines.length) setStep(step + 1)
      else setPhase('credits')
    } else if (phase === 'credits') setPhase('summary')
  }, [phase, step, lines.length])

  // The automatic pace.
  useEffect(() => {
    if (phase === 'deleting') {
      const t = setTimeout(() => (step < deleting.length ? setStep(step + 1) : advance()), step < deleting.length ? DELETE_STEP_MS : 1200)
      return () => clearTimeout(t)
    }
    if (phase === 'story') {
      const t = setTimeout(advance, step < lines.length ? LINE_MS : LINE_MS + 1800)
      return () => clearTimeout(t)
    }
  }, [phase, step, deleting.length, lines.length, advance])

  useEffect(() => {
    const onKey = (e) => {
      if (phase === 'summary') return
      if (e.key === 'Escape') setPhase('summary')
      else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault()
        advance()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [phase, advance])

  return (
    <div
      className={`ending-screen ending-scene-${id}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Ending: ${def.title}`}
      onClick={phase === 'summary' ? undefined : advance}
    >
      {particles.map((p, i) => (
        <span key={i} className="ending-particle" style={{ left: `${p.x}%`, animationDelay: `${p.d}s`, animationDuration: `${p.t}s`, fontSize: p.s }}>
          {p.e}
        </span>
      ))}
      {id === 'grass' && <div className="ending-hills" aria-hidden="true" />}

      {phase !== 'summary' && (
        <button
          className="ending-skip"
          onClick={(e) => {
            e.stopPropagation()
            setPhase('summary')
          }}
        >
          Skip ▸▸
        </button>
      )}

      {phase === 'deleting' && (
        <div className="ending-terminal">
          <div className="mb-3 opacity-60">C:\TRANSLATR&gt; delete-account --force --no-upsell</div>
          {deleting.slice(0, step).map((line, i) => (
            <div key={i} className="animate-fade-up">
              {line} <span className="text-[#5dff8f]">done</span>
            </div>
          ))}
          <span className="ending-cursor">▌</span>
        </div>
      )}

      {phase === 'story' && (
        <div className="ending-story">
          <div className="ending-kicker">
            {def.icon} {def.tag ?? 'Ending'} · {def.title}
          </div>
          {lines.slice(0, step).map((line, i) => (
            <p key={i} className={`ending-line ${i === step - 1 ? 'is-new' : ''}`}>
              {line}
            </p>
          ))}
          <div className="ending-hint">{step < lines.length ? 'click to continue' : 'click for the credits'}</div>
        </div>
      )}

      {phase === 'credits' && (
        <div className="ending-credits-viewport">
          <div className="ending-credits" onAnimationEnd={() => setPhase('summary')}>
            <div className="ending-credits-title">
              {def.icon}
              <br />
              {def.title}
            </div>
            {CREDITS.map(([role, who]) => (
              <div key={role} className="ending-credit">
                <div className="ending-credit-role">{role}</div>
                <div className="ending-credit-who">{who}</div>
              </div>
            ))}
            <div className="ending-credits-title">THE END</div>
          </div>
        </div>
      )}

      {phase === 'summary' && <Summary id={id} snap={snap} at={at} />}
    </div>
  )
}

function Summary({ id, snap, at }) {
  const def = ENDING_BY_ID[id]
  const endings = useGameStore((s) => s.endings)
  const records = useGameStore((s) => s.records)
  const { restartGame, keepPlaying, openUnwrapped, openEndings } = useGameStore.getState()
  const found = ENDINGS.filter((e) => endings[e.id]).length
  const number = ENDINGS.findIndex((e) => e.id === id) + 1
  const run = snap.run
  const time = run?.startedAt && run.endedAt ? run.endedAt - run.startedAt : null
  const unlocked = ACHIEVEMENTS.filter((a) => (snap.achievements[a.id] ?? 0) >= at - 3000) // granted by this ending
  const speedrun = snap.mode === 'speedrun'
  const pb = speedrun && records.last?.pb
  const nextNg = (snap.ngPlus ?? 0) + 1
  const newCurse = NG_CURSES.find((c) => c.level === nextNg)
  const skillsKept = Object.keys(snap.skills ?? {}).length
  const rogue = snap.mode === 'rogue' ? snap.rogue : null

  const stats = [
    ['Time', time != null ? fmtRunTime(time, speedrun) : '—'],
    ['Peak wallet', money(Math.max(snap.money, snap.stats.peakMoney ?? 0))],
    ['Ads endured', snap.adsSeen.toLocaleString()],
    ['Prestiges', snap.prestige],
    ['Microtransactions', (snap.stats.purchases ?? 0).toLocaleString()],
    ['Achievements', `${Object.keys(snap.achievements).length}/${ACHIEVEMENTS.length}`],
  ]

  return (
    <div className="ending-summary anim-modal-in" onClick={(e) => e.stopPropagation()}>
      <div className="text-5xl">{def.icon}</div>
      <div className="mt-2 text-[0.6875rem] font-bold uppercase tracking-[0.25em] opacity-70">
        Ending {number} of {ENDINGS.length}
        {def.tag ? ` · ${def.tag}` : ''}
      </div>
      <h2 className="mt-1 text-3xl font-semibold">{def.title}</h2>
      {snap.ngPlus > 0 && <div className="mt-1 text-[0.75rem] font-semibold opacity-80">in New Game+ {snap.ngPlus} ({cursesFor(snap.ngPlus).map((c) => c.name).join(', ')})</div>}
      <p className="mt-1 text-sm opacity-75">{def.how}</p>
      {rogue && (
        <div className={`rogue-result ${rogue.result === 'win' ? 'is-win' : 'is-loss'}`}>
          {rogue.result === 'win'
            ? `🎲 Run cleared. Target hit: ${ENDING_BY_ID[rogue.target]?.title}.${records.rogue?.streak > 1 ? ` ${records.rogue.streak} wins in a row.` : ''}`
            : `🎲 Run lost. The target was ${ENDING_BY_ID[rogue.target]?.icon} ${ENDING_BY_ID[rogue.target]?.title}, not this one.`}
        </div>
      )}
      {snap.cheats && <div className="mt-2 text-[0.75rem] font-semibold opacity-80">🏴 Modified game · {speedrun ? 'this time wasn’t recorded' : 'cheats were on'}</div>}
      {speedrun && time != null && !snap.cheats && (
        <div className={`mt-3 inline-block rounded-lg px-3 py-1.5 font-mono text-lg font-bold ${pb ? 'bg-[#5dff8f]/20 text-[#5dff8f]' : 'bg-white/10'}`}>
          ⏱️ {fmtRunTime(time)} {pb ? '· NEW PERSONAL BEST' : `· PB ${fmtRunTime(records.best?.any)}`}
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2 text-left sm:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white/10 px-3 py-2">
            <div className="text-[0.625rem] uppercase tracking-wider opacity-60">{k}</div>
            <div className="font-mono text-sm font-semibold">{v}</div>
          </div>
        ))}
      </div>
      {unlocked.length > 0 && (
        <div className="mt-3 text-[0.75rem] opacity-85">
          🏆 Unlocked: {unlocked.map((a) => a.title).join(' · ')}
        </div>
      )}
      <div className="mt-1 text-[0.75rem] opacity-70">
        🏁 {found}/{ENDINGS.length} endings found
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button className="btn btn-magenta" onClick={openUnwrapped}>
          🎁 My Unwrapped
        </button>
        <button className="btn" onClick={openEndings}>
          🏁 All endings
        </button>
        <button className="btn btn-gold" onClick={() => restartGame({ scope: 'game', mode: 'normal' })}>
          ▶ New game
        </button>
        <button className="btn btn-gold" onClick={() => restartGame({ scope: 'game', mode: 'speedrun' })}>
          ⏱️ New speedrun
        </button>
        <button className="btn btn-magenta" onClick={() => restartGame({ scope: 'game', mode: 'rogue' })}>
          🎲 New roguelike run
        </button>
        <button className="btn btn-blood" onClick={() => restartGame({ scope: 'game', mode: 'normal', ngPlus: nextNg })} title="Keep your skills. Add a curse.">
          ✚ New Game+ {nextNg}
        </button>
        {!def.fatal && (
          <button className="btn btn-ghost" onClick={keepPlaying}>
            Keep playing
          </button>
        )}
      </div>
      <p className="mt-3 text-[0.6875rem] opacity-55">A new game keeps your achievements and endings. Everything else goes.</p>
      <p className="mt-1 text-[0.6875rem] opacity-70">
        ✚ New Game+ {nextNg} also keeps your {skillsKept} learned skill{skillsKept === 1 ? '' : 's'} and adds{' '}
        {newCurse ? `${newCurse.icon} ${newCurse.name}: ${newCurse.desc.toLowerCase()}` : 'nothing new (you have every curse already). Bragging rights only.'}
      </p>
    </div>
  )
}
