import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../store/useGameStore'
import { AdBreak, useAdBreak } from './AdBreak'
// Shared with nikstil.com/doomscroll/ (loaded from the site at runtime, see vite.config.js).
import { createEngine } from '/doomscroll/engine.js'
import { EPISODES, FINAL } from '/doomscroll/levels.js'
import { DIFFICULTIES, savedDifficulty, saveDifficulty } from '/doomscroll/difficulty.js'
import { playSfx, setMusic, setSound } from '/doomscroll/audio.js'

const WIN_PAUSE_MS = 4500 // the final boss's results screen, before the ending plays
// Between levels you keep your health and ammo, topped up to at least this much.
const CARRY_MIN = { hp: 60, ammo: 30 }
const time = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Every level in order: Episodes 1 to 3, then the final boss. Progress (stats.shooterLevel) is an
// index into this list, so "Continue" picks up wherever you got to.
const LEVELS = [
  ...EPISODES.flatMap((ep) =>
    ep.levels.map((l, i) => ({ ...l, episode: ep.id, banner: `EPISODE ${ep.id} · LEVEL ${i + 1} OF ${ep.levels.length}`, episodeEnd: i === ep.levels.length - 1 })),
  ),
  { ...FINAL, episode: 'final' },
]
const FINAL_INDEX = LEVELS.length - 1
const EPISODE_START = Object.fromEntries(EPISODES.map((ep) => [ep.id, LEVELS.findIndex((l) => l.episode === ep.id)]))
const EPISODE_END = {
  1: 'Brock Bottomline has been downsized. Management returns in Episode 2.',
  2: 'The CFO has been audited. The checkout goes on without her.',
  3: 'The Algorithm has been unplugged. Somebody still has to answer to the shareholders.',
}

/** DOOMSCROLL.EXE: the boomer shooter in the Start menu. Loaded on demand; the game pauses behind it. */
export default function Shooter() {
  const open = useGameStore((s) => s.shooterOpen)
  if (!open) return null
  return createPortal(<Doomscroll />, document.body)
}

function Doomscroll() {
  const canvas = useRef(null)
  const engine = useRef(null)
  // title | difficulty | play | paused | dead | won (a level) | victory (the final boss)
  const [phase, setPhase] = useState(() => (savedDifficulty() === null ? 'difficulty' : 'title'))
  const [difficulty, setDifficulty] = useState(() => savedDifficulty() ?? 10)
  const [coop, setCoop] = useState(false)
  const [level, setLevel] = useState(0)
  const [result, setResult] = useState(null)
  const [touch] = useState(() => matchMedia('(pointer: coarse)').matches)
  const reached = useGameStore((s) => Math.min(FINAL_INDEX, s.stats.shooterLevel ?? 0))
  const audio = useGameStore((s) => s.audio)
  const carry = useRef(null) // what this level started with (a respawn gets at least that ammo back)
  const { closeShooter, noteShooter, noteBest, triggerEnding } = useGameStore.getState()
  // Every hit: an unskippable ad, then back to it.
  const [ad, showAd] = useAdBreak(() => noteShooter({ shooterAds: 1 }))

  // DOOMSCROLL's own sound follows TRANSLATR™'s sound settings; its music replaces the hold music.
  useEffect(() => setSound({ sfx: audio.sfx !== false, music: audio.music !== false }), [audio])
  useEffect(() => {
    const menu = phase === 'title' || phase === 'difficulty'
    setMusic(menu ? null : LEVELS[level].episode)
  }, [phase, level])
  useEffect(() => () => setMusic(null), [])

  useEffect(() => {
    const e = createEngine(canvas.current, LEVELS, {
      difficulty: DIFFICULTIES[savedDifficulty() ?? 10],
      onHit: () => showAd(() => e.resume()),
      onDeath: () => {
        noteShooter({ shooterDeaths: 1 })
        setPhase('dead')
      },
      onWin: (r) => {
        noteShooter({ shooterLevels: 1, shooterCleanLevels: r.ads === 0 ? 1 : 0, shooterFullClears: r.kills >= r.total ? 1 : 0 })
        if (r.final) noteShooter({ shooterWins: 1 })
        else noteBest({ shooterLevel: r.level + 1 }) // "Continue" starts here next time
        setResult(r)
        setPhase(r.final ? 'victory' : 'won')
      },
      onSound: playSfx,
      onKill: () => noteShooter({ shooterKills: 1 }),
    })
    engine.current = e
    if (new URLSearchParams(location.search).has('debug')) window.doom = e // poke at it from the console
    document.documentElement.classList.add('shooter-open')
    return () => {
      e.destroy()
      document.documentElement.classList.remove('shooter-open')
    }
    // Created once; the callbacks only use stable setters and store actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The Shareholders are beaten: a moment to read the stats, then the ending.
  useEffect(() => {
    if (phase !== 'victory') return
    const t = setTimeout(() => triggerEnding('shooter'), WIN_PAUSE_MS)
    return () => clearTimeout(t)
  }, [phase, triggerEnding])

  const play = (index, stock = null) => {
    carry.current = stock
    engine.current.setCoop(coop)
    engine.current.start(index, stock)
    setLevel(index)
    setPhase('play')
  }
  /** Jumping straight to a level: full health, some ammo (and the rifle after E1M3). */
  const fresh = (index) => (index ? { hp: 100, ammo: index === FINAL_INDEX ? 80 : 40 } : null)
  const start = (index = 0) => {
    play(index, fresh(index))
    noteShooter({ shooterRuns: 1 })
  }
  const keep = (p) => ({ hp: Math.max(CARRY_MIN.hp, p.hp), ammo: Math.max(CARRY_MIN.ammo, p.ammo), rifle: p.rifle, weapon: p.weapon })
  const next = () => {
    const to = result.level + 1
    const stock = coop ? result.players.map(keep) : keep(result)
    // A new episode starts you at full health.
    const full = (c) => (LEVELS[result.level].episodeEnd ? { ...c, hp: 100 } : c)
    play(to, Array.isArray(stock) ? stock.map(full) : full(stock))
  }
  const respawn = () => {
    const again = (c) => ({ ...(c ?? {}), hp: 100, ammo: Math.max(30, c?.ammo ?? 0) })
    play(level, Array.isArray(carry.current) ? carry.current.map(again) : again(carry.current))
  }
  const pause = () => {
    engine.current.pause()
    setPhase('paused')
  }
  const resume = () => {
    engine.current.resume()
    setPhase('play')
  }
  const pickDifficulty = (i) => {
    saveDifficulty(i)
    setDifficulty(i)
    engine.current.setDifficulty(DIFFICULTIES[i])
    setPhase('title')
  }

  // Esc pauses (and the browser releases the mouse). Nothing closes an ad.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || ad) return
      if (phase === 'play') pause()
      else if (phase === 'paused') resume()
      else if (phase === 'difficulty') setPhase('title')
      else if (phase === 'title' || phase === 'dead') closeShooter()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const lv = LEVELS[level]
  const where = lv.episode === 'final' ? 'Final boss' : `Episode ${lv.episode}`
  const reachedLv = LEVELS[reached]
  const finalUnlocked = reached >= FINAL_INDEX
  const episodeButtons = useMemo(() => EPISODES.map((ep) => ({ ep, index: EPISODE_START[ep.id] })), [])

  return (
    <div className="shooter-screen" role="dialog" aria-modal="true" aria-label="DOOMSCROLL.EXE">
      <div className={`shooter-frame${coop ? ' shooter-coop' : ''}`}>
        <div className="shooter-bar">
          <span>DOOMSCROLL.EXE</span>
          <span className="shooter-sub">
            Registered version · 3 episodes + final boss{phase === 'title' || phase === 'difficulty' ? '' : ` · ${where} · ${lv.id}`}
          </span>
          {!ad && phase !== 'victory' && (
            <button className="shooter-x" onClick={closeShooter} aria-label="Quit DOOMSCROLL">
              ✕
            </button>
          )}
        </div>
        <div className="shooter-view">
          <canvas ref={canvas} className="shooter-canvas" />
          {phase === 'title' && (
            <div className="shooter-overlay">
              <div className="shooter-title">DOOMSCROLL</div>
              <div className="shooter-episode">3 episodes · 15 levels · 1 final boss</div>
              <p className="shooter-copy">Hell has pop-ups. Close them with the Ad Blocker 3000 and walk into each level’s EXIT switch. The Shareholders wait at the end.</p>
              <p className="shooter-copy shooter-warn">⚠️ Every hit you take plays a 5-second ad. You can’t skip it. We checked.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {reached > 0 && reached < FINAL_INDEX && (
                  <button className="btn btn-blood" onClick={() => start(reached)}>
                    ▶ Continue: {reachedLv.id} {reachedLv.name}
                  </button>
                )}
                <button className={`btn ${reached > 0 ? '' : 'btn-blood'}`} onClick={() => start(0)}>
                  ▶ New game
                </button>
                {episodeButtons.map(({ ep, index }) =>
                  ep.id > 1 && reached >= index ? (
                    <button key={ep.id} className="btn" onClick={() => start(index)}>
                      Episode {ep.id}
                    </button>
                  ) : null,
                )}
                <button
                  className={`btn ${finalUnlocked ? 'btn-blood' : ''}`}
                  disabled={!finalUnlocked}
                  title={finalUnlocked ? 'The Shareholders' : 'Finish all three episodes to unlock'}
                  onClick={() => start(FINAL_INDEX)}
                >
                  {finalUnlocked ? '👔 Final boss' : '🔒 Final boss'}
                </button>
                <button className="btn" onClick={closeShooter}>
                  Quit to TRANSLATR™
                </button>
              </div>
              <label className="shooter-copy" style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={coop} onChange={(e) => setCoop(e.target.checked)} /> 2 players (split screen, one keyboard)
              </label>
              <p className="shooter-copy" style={{ fontSize: '0.75rem', opacity: 0.8, overflowWrap: 'anywhere' }}>
                Difficulty: <b>{DIFFICULTIES[difficulty].name}</b>{' '}
                <button className="btn" onClick={() => setPhase('difficulty')}>
                  Change
                </button>
              </p>
            </div>
          )}
          {phase === 'difficulty' && (
            <div className="shooter-overlay">
              <div className="shooter-title">CHOOSE YOUR DIFFICULTY</div>
              <p className="shooter-copy">They’re all easy. Some are easier than others. Pick carefully.</p>
              <div style={{ display: 'grid', gap: '6px', width: 'min(100%, 40rem)', maxHeight: 'min(55vh, 26rem)', overflowY: 'auto', padding: '2px 6px 2px 2px' }}>
                {DIFFICULTIES.map((d, i) => (
                  <button
                    key={i}
                    className={`btn ${i === difficulty ? 'btn-blood' : ''}`}
                    style={{ justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal', overflowWrap: 'anywhere', height: 'auto' }}
                    onClick={() => pickDifficulty(i)}
                  >
                    {i + 1}. {d.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === 'paused' && (
            <div className="shooter-overlay">
              <div className="shooter-title">PAUSED</div>
              <div className="flex flex-wrap justify-center gap-2">
                <button className="btn btn-blood" onClick={resume}>
                  ▶ Resume
                </button>
                <button className="btn" onClick={closeShooter}>
                  Quit to TRANSLATR™
                </button>
              </div>
            </div>
          )}
          {phase === 'dead' && !ad && (
            <div className="shooter-overlay shooter-dead">
              <div className="shooter-title">YOU DIED</div>
              <p className="shooter-copy">Customer Support has closed your ticket.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button className="btn btn-blood" onClick={() => showAd(respawn)}>
                  📺 Watch an ad to respawn ({lv.id})
                </button>
                <button className="btn" onClick={closeShooter}>
                  Quit
                </button>
              </div>
            </div>
          )}
          {(phase === 'won' || phase === 'victory') && result && (
            <div className="shooter-overlay">
              <div className="shooter-episode">
                {LEVELS[result.level].id}: {LEVELS[result.level].name}
              </div>
              <div className="shooter-title">{result.final ? 'SHAREHOLDERS DIVESTED' : LEVELS[result.level].episodeEnd ? 'EPISODE COMPLETE' : 'LEVEL COMPLETE'}</div>
              <div className="shooter-stats">
                <span>
                  Pop-ups closed <b>{result.kills}/{result.total}</b>
                </span>
                <span>
                  Ads watched <b>{result.ads}</b>
                </span>
                <span>
                  Time <b>{time(result.seconds)}</b>
                </span>
              </div>
              {(result.ads === 0 || result.kills >= result.total) && (
                <p className="shooter-copy shooter-warn">
                  {[result.ads === 0 && 'Ad-free!', result.kills >= result.total && 'Every pop-up closed!'].filter(Boolean).join(' ')}
                </p>
              )}
              {result.final ? (
                <>
                  <p className="shooter-copy">The Shareholders have been divested. Line goes down. You did that.</p>
                  <button className="btn btn-blood" onClick={() => triggerEnding('shooter')}>
                    Continue ▶
                  </button>
                </>
              ) : (
                <>
                  <p className="shooter-copy">
                    {LEVELS[result.level].episodeEnd ? `${EPISODE_END[LEVELS[result.level].episode]} ` : ''}
                    {result.level + 1 === FINAL_INDEX ? (
                      <b>🔓 The final boss is unlocked. Bullets won’t work on it: bring the Ban Hammer.</b>
                    ) : (
                      <>
                        Next: {LEVELS[result.level + 1].id} {LEVELS[result.level + 1].name}. {LEVELS[result.level].episodeEnd ? 'Guns and ammo carry over; health is topped up.' : 'Health and ammo carry over.'}
                      </>
                    )}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button className="btn btn-blood" onClick={next}>
                      {result.level + 1 === FINAL_INDEX ? 'Fight the final boss ▶' : LEVELS[result.level].episodeEnd ? `Episode ${LEVELS[result.level + 1].episode} ▶` : 'Next level ▶'}
                    </button>
                    <button className="btn" onClick={closeShooter}>
                      Save &amp; quit
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {ad && <AdBreak ad={ad} />}
        </div>
        {touch && !coop && phase === 'play' && !ad && <TouchPad engine={engine} onPause={pause} />}
        <p className="shooter-help">
          {touch
            ? 'Hold the arrows to move and turn · FIRE shoots · BAN swings the Ban Hammer (knocks shots back) · ⇄ switches guns'
            : coop
              ? 'Player 1: WASD move · Q E or mouse turn · Space/F/click fire · V/left Alt/right-click Ban Hammer · 1 2 guns. Player 2: ↑ ↓ move · ← → turn · , . strafe · right Ctrl/Enter fire · P/right Shift Ban Hammer · O guns. Esc pauses'
              : 'WASD / arrows move · ← → or the mouse turn (click the screen to grab the mouse) · Space or click fires · P, V, left Alt or right-click swings the Ban Hammer (it knocks shots back) · 1 / 2 or scroll switches guns · Shift runs · Esc pauses'}
        </p>
      </div>
    </div>
  )
}

/** Phones: hold to move/turn, tap FIRE or BAN. */
function TouchPad({ engine, onPause }) {
  const hold = (name) => ({
    onPointerDown: (e) => {
      engine.current.press(name, true)
      try {
        e.currentTarget.setPointerCapture(e.pointerId) // keep the press when the thumb slides off
      } catch {
        // no capturable pointer (it's fine: pointerup still ends the press)
      }
    },
    onPointerUp: () => engine.current.press(name, false),
    onPointerCancel: () => engine.current.press(name, false),
  })
  return (
    <div className="shooter-pad">
      <div className="shooter-dpad">
        <button className="shooter-key" style={{ gridArea: 'up' }} {...hold('up')} aria-label="Forward">
          ▲
        </button>
        <button className="shooter-key" style={{ gridArea: 'left' }} {...hold('left')} aria-label="Turn left">
          ◀
        </button>
        <button className="shooter-key" style={{ gridArea: 'right' }} {...hold('right')} aria-label="Turn right">
          ▶
        </button>
        <button className="shooter-key" style={{ gridArea: 'down' }} {...hold('down')} aria-label="Back">
          ▼
        </button>
      </div>
      <button className="shooter-key" onClick={onPause} aria-label="Pause">
        ❚❚
      </button>
      <button className="shooter-key" onClick={() => engine.current.nextWeapon()} aria-label="Switch gun">
        ⇄
      </button>
      <button className="shooter-key shooter-fire" {...hold('melee')} aria-label="Ban Hammer">
        BAN
      </button>
      <button className="shooter-key shooter-fire" {...hold('fire')}>
        FIRE
      </button>
    </div>
  )
}
