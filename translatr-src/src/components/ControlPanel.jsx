import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { TRACKS } from '../lib/audio/tracks'
import { useGameStore } from '../store/useGameStore'
import { TEXT_SIZES, graphicsMode, weakHardware } from '../lib/settings'
import { LANGUAGES } from '../lib/language'
import { SAVE_VERSION } from '../lib/save'
import { CHEAT_ACTIONS, CHEAT_CODE_COUNT, CHEAT_TOGGLES } from '../data/cheats'

const APPEARANCE = [
  { id: 'light', label: '☀️ Light', hint: 'The sky, as intended' },
  { id: 'dark', label: '🌙 Dark', hint: 'Every theme, after hours' },
  { id: 'auto', label: 'Auto', hint: 'Follow your device' },
]
const GRAPHICS = [
  { id: 'auto', label: 'Auto', hint: 'Full on capable devices, Lite on weak ones' },
  { id: 'full', label: 'Full', hint: 'Aero glass, glows and every animation' },
  { id: 'lite', label: 'Lite', hint: 'No glass blur or decorative animation: smoother on weak devices' },
]
/** What Auto decided, and why. */
function graphicsNote(settings) {
  const choice = settings.graphics ?? 'auto'
  if (choice !== 'auto') return GRAPHICS.find((g) => g.id === choice).hint
  const why = settings.slowDevice ? ' (this device was running slowly)' : weakHardware() ? ' (low-memory device)' : ''
  return `Auto picked ${graphicsMode(settings) === 'lite' ? 'Lite' : 'Full'}${why}.`
}
const MOTION = [
  { id: 'auto', label: 'Auto', hint: 'Follow your device' },
  { id: 'reduce', label: 'Reduced', hint: 'No shaking, bouncing or DVD ads' },
  { id: 'full', label: 'Full', hint: 'Every animation, even the rude ones' },
]

/** Settings, Windows-7 style: display, sound, save data and credits. */
export default function ControlPanel() {
  const open = useGameStore((s) => s.settingsOpen)
  const close = useGameStore((s) => s.closeSettings)
  return (
    <Modal open={open} z={305} onBackdrop={close}>
      <PanelBody onClose={close} />
    </Modal>
  )
}

function Segmented({ value, options, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          title={o.hint}
          className={`btn btn-sm ${value === o.id ? 'btn-gold' : 'btn-ghost'}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Section({ icon, title, children }) {
  return (
    <section className="border-b border-ink/10 px-5 py-4 last:border-0">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="text-lg">{icon}</span> {title}
      </h3>
      {children}
    </section>
  )
}

function PanelBody({ onClose }) {
  const settings = useGameStore((s) => s.settings)
  const audio = useGameStore((s) => s.audio)
  const { setSettings, setAudio } = useGameStore.getState()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="cp-title" className="modal-card flex max-h-[88vh] w-[min(560px,94vw)] flex-col overflow-hidden" style={{ '--accent': '#3da6e8' }}>
      <div className="flex items-center gap-3 border-b border-ink/10 px-5 py-3">
        <span className="text-3xl">⚙️</span>
        <div className="min-w-0 flex-1">
          <h2 id="cp-title" className="font-display text-xl font-semibold leading-tight">
            Control Panel
          </h2>
          <div className="text-xs text-ink/50">All Control Panel Items › Settings you’re allowed to change</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close Control Panel">
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section icon="🖥️" title="Display">
          {/* Always in English, so a player who picked Premium Latin™ can find the way back. */}
          <div className="mb-3" translate="no">
            <div className="mb-1 text-[0.75rem] text-ink/60">Language</div>
            <Segmented label="Language" value={settings.language ?? 'en'} options={LANGUAGES} onChange={(v) => setSettings({ language: v })} />
            <div className="mt-1 text-[0.6875rem] text-ink/45">
              {LANGUAGES.find((l) => l.id === (settings.language ?? 'en'))?.hint} Interface only: TranslatrAI™ still speaks nothing but Premium Latin™.
            </div>
          </div>
          <div className="mb-3">
            <div className="mb-1 text-[0.75rem] text-ink/60">Appearance</div>
            <Segmented label="Appearance" value={settings.colorMode ?? 'light'} options={APPEARANCE} onChange={(v) => setSettings({ colorMode: v })} />
          </div>
          <div className="mb-3">
            <div className="mb-1 text-[0.75rem] text-ink/60">Graphics</div>
            <Segmented
              label="Graphics"
              value={settings.graphics ?? 'auto'}
              options={GRAPHICS}
              // Picking Auto again re-tests the device.
              onChange={(v) => setSettings({ graphics: v, ...(v === 'auto' ? { slowDevice: false } : {}) })}
            />
            <div className="mt-1 text-[0.6875rem] text-ink/45">{graphicsNote(settings)}</div>
          </div>
          <div className="mb-3">
            <div className="mb-1 text-[0.75rem] text-ink/60">Text size</div>
            <Segmented label="Text size" value={settings.textScale} options={TEXT_SIZES} onChange={(v) => setSettings({ textScale: v })} />
          </div>
          <div>
            <div className="mb-1 text-[0.75rem] text-ink/60">Motion</div>
            <Segmented label="Motion" value={settings.motion} options={MOTION} onChange={(v) => setSettings({ motion: v })} />
            <div className="mt-1 text-[0.6875rem] text-ink/45">{MOTION.find((m) => m.id === settings.motion)?.hint}. Themes live in the Start menu.</div>
          </div>
        </Section>

        <Section icon="🔊" title="Sound">
          <div className="flex flex-wrap items-center gap-2">
            <button className={`btn btn-sm ${audio.music ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setAudio({ music: !audio.music })}>
              {audio.music ? '🎵 Music on' : '🔇 Music off'}
            </button>
            <button className={`btn btn-sm ${audio.sfx ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setAudio({ sfx: !audio.sfx })}>
              {audio.sfx ? '🔊 Sound effects on' : '🔇 Sound effects off'}
            </button>
          </div>
          <label className="mt-3 flex items-center gap-3 text-[0.75rem] text-ink/60">
            Background music
            <select className="input max-w-[16rem] py-1 text-[0.8125rem]" value={audio.track ?? 'hold'} onChange={(e) => setAudio({ track: e.target.value, music: true })}>
              {TRACKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 flex items-center gap-3 text-[0.75rem] text-ink/60">
            Master volume
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(audio.volume * 100)}
              onChange={(e) => setAudio({ volume: Number(e.target.value) / 100 })}
              className="flex-1"
            />
            <span className="w-9 text-right font-mono">{Math.round(audio.volume * 100)}%</span>
          </label>
        </Section>

        <Cheats />

        <SaveData />

        <Section icon="ℹ️" title="About TRANSLATR™">
          <p className="text-[0.75rem] leading-relaxed text-ink/60">
            TRANSLATR™ Ultra+ Pro Max · save format v{SAVE_VERSION} · made at nikstil.com. Cat photos by TyedyeBrody, Zhmila, Roc0ast3r, Juliet van Ree and Judgefloro (Wikimedia
            Commons, CC0). Fonts from Google Fonts. No real money is ever charged; no data is ever actually collected. The jokes are free.
          </p>
        </Section>
      </div>
    </div>
  )
}

/** Developer Mode™ for everyone. Switching it on marks the game as Modified (see data/cheats.js). */
function Cheats() {
  const cheats = useGameStore((s) => s.cheats)
  const mode = useGameStore((s) => s.mode)
  const inDebt = useGameStore((s) => !!s.loan)
  const [sure, setSure] = useState(false)
  const [code, setCode] = useState('')
  const [reply, setReply] = useState(null)
  const { enableCheats, cheat, toggleCheat, enterCheatCode } = useGameStore.getState()

  if (!cheats) {
    return (
      <Section icon="🕹️" title="Cheats">
        <p className="mb-2 text-[0.75rem] leading-relaxed text-ink/60">
          Developer Mode™, now for everyone. Switching cheats on marks this game as <b>🏴 Modified</b> until you start a new one:{' '}
          {mode === 'speedrun' ? 'this speedrun won’t be recorded' : mode === 'daily' ? 'today’s Daily Challenge time won’t be recorded' : 'speedrun and Daily Challenge times won’t count'},
          and the Not One Cent ending is off the table. Achievements still work. We’re not your mom.
        </p>
        {sure ? (
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-sm btn-blood" onClick={enableCheats}>
              🏴 Yes, I’m a cheater
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setSure(false)}>
              No, I respect the grind
            </button>
          </div>
        ) : (
          <button className="btn btn-sm" onClick={() => setSure(true)}>
            🏴 Enable cheats
          </button>
        )}
      </Section>
    )
  }

  const submit = (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setReply(enterCheatCode(code))
    setCode('')
  }
  return (
    <Section icon="🕹️" title="Cheats">
      <p className="mb-3 text-[0.75rem] text-ink/60">
        🏴 This game is Modified · {cheats.used} cheat{cheats.used === 1 ? '' : 's'} used. Times won’t be recorded until you start a new game.
      </p>
      <div className="mb-1 text-[0.75rem] text-ink/60">Instant</div>
      <div className="flex flex-wrap gap-1">
        {CHEAT_ACTIONS.map((a) => (
          <button key={a.id} className="btn btn-sm" disabled={a.id === 'debt' && !inDebt} onClick={() => cheat(a.id)}>
            {a.icon} {a.label}
          </button>
        ))}
      </div>
      <div className="mb-1 mt-3 text-[0.75rem] text-ink/60">Always on</div>
      <div className="flex flex-wrap gap-1">
        {CHEAT_TOGGLES.map((t) => {
          const on = cheats.toggles.includes(t.id)
          return (
            <button key={t.id} role="switch" aria-checked={on} className={`btn btn-sm ${on ? 'btn-gold' : 'btn-ghost'}`} onClick={() => toggleCheat(t.id)}>
              {t.icon} {t.label}
            </button>
          )
        })}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={submit}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter a cheat code"
          aria-label="Cheat code"
          autoComplete="off"
          spellCheck={false}
          className="input min-w-0 flex-1 py-1.5 font-mono text-sm"
        />
        <button type="submit" className="btn btn-sm" disabled={!code.trim()}>
          Enter
        </button>
      </form>
      {reply && <p className={`mt-1 text-[0.75rem] ${reply.ok ? 'text-toxic' : 'text-blood'}`}>{reply.msg}</p>}
      <p className="mt-1 text-[0.6875rem] text-ink/45">
        Codes found: {cheats.codes.length}/{CHEAT_CODE_COUNT}
        {cheats.codes.length ? ` · ${cheats.codes.join(', ')}` : ' · rumour has it the classics work'}
      </p>
    </Section>
  )
}

function SaveData() {
  const [code, setCode] = useState('')
  const [paste, setPaste] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const out = useRef(null)
  const { getSaveCode, importSave, askResetAll } = useGameStore.getState()

  const exportCode = () => {
    setCode(getSaveCode())
    setCopied(false)
    requestAnimationFrame(() => out.current?.select())
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      out.current?.select()
    }
  }
  const load = () => {
    setError('')
    try {
      importSave(paste)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Section icon="💾" title="Save data">
      <p className="mb-2 text-[0.75rem] text-ink/60">Your game saves itself in this browser. A save code moves it to another device (or backs it up).</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-sm btn-gold" onClick={exportCode}>
          ⬆ Export save code
        </button>
        {code && (
          <button className="btn btn-sm" onClick={copy}>
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        )}
      </div>
      {code && <textarea ref={out} readOnly value={code} rows={3} className="input mt-2 resize-none break-all font-mono text-[0.6875rem]" aria-label="Your save code" />}

      <div className="mt-4 text-[0.75rem] text-ink/60">Import a save code (replaces this save):</div>
      <textarea
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        rows={2}
        placeholder="TRANSLATR-SAVE.1.…"
        className="input mt-1 resize-none break-all font-mono text-[0.6875rem]"
        aria-label="Save code to import"
      />
      {error && <div className="mt-1 text-[0.75rem] font-semibold text-blood">{error}</div>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="btn btn-sm" disabled={!paste.trim()} onClick={load}>
          ⬇ Import save
        </button>
        <span className="flex-1" />
        <button className="btn btn-sm btn-blood" onClick={askResetAll}>
          💥 Reset all
        </button>
      </div>
    </Section>
  )
}
