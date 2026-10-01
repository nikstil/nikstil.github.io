import { useState } from 'react'
import Modal from './Modal'
import { useGameStore } from '../store/useGameStore'
import { useLastDefined } from '../lib/hooks'
import { checkCaptcha } from '../lib/captcha'
import { CAPTCHA } from '../data/gameData'

/** Intercepts protected actions with an unfair, extremely polished CAPTCHA. */
export default function CaptchaModal() {
  const captcha = useGameStore((s) => s.captcha)
  const shown = useLastDefined(captcha)
  return (
    <Modal open={!!captcha} z={330} backdrop="bg-inset/80">
      {shown && <CaptchaBody key={shown.id} c={shown} />}
    </Modal>
  )
}

function CaptchaBody({ c }) {
  const clock = useGameStore((s) => s.clock)
  const resolve = useGameStore((s) => s.resolveCaptcha)
  const cancel = useGameStore((s) => s.cancelCaptcha)
  const toast = useGameStore((s) => s.toast)
  const [answer, setAnswer] = useState(c.initial)
  const left = Math.max(0, Math.ceil((c.deadline - clock) / 1000))

  const verify = () => {
    const { passed, reason } = checkCaptcha(c, answer)
    resolve(c.id, passed, reason)
  }

  return (
    <div className="modal-card w-[min(400px,94vw)] overflow-hidden" style={{ '--accent': '#3de8ff' }}>
      {/* Prompt banner */}
      <div className="relative overflow-hidden bg-linear-to-br from-[#1c6fd1] via-[#2f8ae6] to-[#5ab4f5] px-5 py-4">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,.05)_0_8px,transparent_8px_16px)]" />
        <div className="relative">
          <div className="text-[0.6875rem] font-medium text-[#fff]/85">Verify you are human · {CAPTCHA.actions[c.action]}</div>
          <div className="mt-0.5 font-display text-xl font-bold leading-tight text-[#fff]">
            {c.variant === 'color4' ? (
              <>
                Type the color of the number <span style={{ color: c.decoyHex, textShadow: `0 0 10px ${c.decoyHex}` }}>4</span>
              </>
            ) : (
              c.prompt
            )}
          </div>
          {c.hint && <div className="mt-1 text-xs text-[#fff]/80">{c.hint}</div>}
        </div>
      </div>

      <div className="p-4">
        {c.variant === 'dread' && <DreadGrid tiles={c.tiles} selected={answer} onToggle={(i) => setAnswer((a) => (a.includes(i) ? a.filter((x) => x !== i) : [...a, i]))} />}
        {c.variant === 'color4' && (
          <>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {c.cells.map((cell) => (
                <div key={cell.digit} className="grid aspect-square place-items-center rounded-xl border border-ink/20 bg-[#0e1c2c]">
                  <span
                    className="font-display text-4xl font-bold"
                    style={{ color: cell.hex, textShadow: `0 0 14px ${cell.hex}`, transform: `rotate(${cell.rotate}deg)` }}
                  >
                    {cell.digit}
                  </span>
                </div>
              ))}
            </div>
            <input
              autoFocus
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verify()}
              placeholder="e.g. chartreuse"
              className="input font-sans"
            />
          </>
        )}
        {c.variant === 'credit' && (
          <div className="grid grid-cols-2 gap-2">
            {c.options.map((o, i) => (
              <button
                key={o.label}
                onClick={() => setAnswer(i)}
                className={`flex aspect-[4/3] flex-col items-center justify-center rounded-xl border bg-inset/50 transition ${
                  answer === i ? 'border-ice shadow-[0_0_20px_-4px_#3de8ff]' : 'border-ink/10 hover:border-ink/25'
                }`}
              >
                <span className="text-5xl">{o.emoji}</span>
                <span className="mt-1 text-[0.6875rem] text-ink/50">{o.label}</span>
              </button>
            ))}
          </div>
        )}
        {c.variant === 'trust' && (
          <div className="rounded-xl border border-ink/10 bg-inset/50 p-5 text-center">
            <div className="font-mono text-5xl font-bold glow-magenta">{answer}%</div>
            <input type="range" min={0} max={100} value={answer} onChange={(e) => setAnswer(Number(e.target.value))} className="mt-4 w-full" />
            <div className="mt-1 flex justify-between text-[0.625rem] text-ink/40">
              <span>Not at all</span>
              <span>With my life</span>
            </div>
          </div>
        )}

        {/* Time limit */}
        <div className="meter mt-4 h-1" style={{ '--bar': left <= 5 ? '#ff3b5c' : '#3de8ff' }}>
          <span className="transition-[width] duration-1000 ease-linear" style={{ width: `${(left / CAPTCHA.timeLimitSec) * 100}%` }} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <IconBtn title="New challenge" onClick={() => toast('🔄 New challenges are $0.99. Solve this one.', 'info')}>
              ↻
            </IconBtn>
            <IconBtn title="Audio challenge" onClick={() => toast('🎧 Audio challenges are a Premium feature.', 'info')}>
              🎧
            </IconBtn>
            <span className={`ml-1 font-mono text-xs ${left <= 5 ? 'text-blood' : 'text-ink/40'}`}>{left}s</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => cancel(c.id)} className="text-xs text-ink/35 hover:text-ink/70">
              I'm a robot
            </button>
            <button onClick={verify} className="btn btn-gold btn-sm px-5">
              Verify
            </button>
          </div>
        </div>
        <p className="mt-3 text-[0.625rem] leading-snug text-ink/30">Failing locks {CAPTCHA.actions[c.action]} for {CAPTCHA.lockoutSec}s. Protected by reCAPTCHN'T™.</p>
      </div>
    </div>
  )
}

function IconBtn({ children, ...props }) {
  return (
    <button className="grid h-8 w-8 place-items-center rounded-lg text-ink/50 transition hover:bg-ink/5 hover:text-ink" {...props}>
      {children}
    </button>
  )
}

const SHAPE_STYLE = {
  square: { borderRadius: 4 },
  circle: { borderRadius: 999 },
  triangle: { clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' },
  diamond: { clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' },
  hexagon: { clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)' },
}

function DreadGrid({ tiles, selected, onToggle }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {tiles.map((t, i) => {
        const on = selected.includes(i)
        return (
          <button
            key={i}
            onClick={() => onToggle(i)}
            className={`relative grid aspect-square place-items-center overflow-hidden rounded-xl border bg-[radial-gradient(circle,#1b2c40,#0a1522)] transition ${
              on ? 'scale-[0.92] border-ice shadow-[0_0_20px_-4px_#3de8ff]' : 'border-ink/10 hover:border-ink/25'
            }`}
          >
            <span
              className="block h-12 w-12"
              style={{ ...SHAPE_STYLE[t.shape], background: t.color, boxShadow: `0 0 18px ${t.color}`, transform: `rotate(${t.shape === 'square' ? 0 : t.rotate}deg)` }}
            />
            {on && <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ice text-[0.6875rem] font-bold text-black">✓</span>}
          </button>
        )
      })}
    </div>
  )
}
