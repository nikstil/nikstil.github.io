import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Panel from './Panel'
import { useGameStore, hasCorrectTranslation, trialTranslationsLeft, quoteTranslation, eventMods, activeMods } from '../store/useGameStore'
import { badTranslate, correctTranslate, refusal } from '../lib/translator'
import { money } from '../lib/format'
import { FREE_TRIAL_TRANSLATIONS, TRANSLATOR_SKINS } from '../data/gameData'
import { reputationOf, stars } from '../data/contracts'
import { FLUENCY_MIN_WORDS, FLUENCY_TO_WIN } from '../data/endings'
import { TASKBAR_H } from '../lib/dock'

const LANGUAGES = ['Spanish', 'French', 'German', 'Japanese', 'Klingon', 'Pirate', 'Latin (Premium)']
const DECOR_POSITIONS = ['-top-4 -left-3', '-top-4 -right-3', '-bottom-4 -left-3', '-bottom-4 -right-3']

export default function Translator() {
  const [input, setInput] = useState('')
  const [lang, setLang] = useState('Spanish')
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState(null) // 'bad' | 'correct' | 'trial' | 'refused' | 'broke' | null
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [self, setSelf] = useState(false) // translating it yourself (free, unlocked by your first translation)
  const [mine, setMine] = useState('') // your own translation
  const [marked, setMarked] = useState(null) // how the last one was marked
  const frameBtn = useRef(null)
  const timer = useRef(null)
  const chipEquipped = useGameStore(hasCorrectTranslation)
  const selfUnlocked = useGameStore((s) => (s.stats.translations ?? 0) >= 1)
  const selfNew = useGameStore((s) => !s.stats.selfChecks)
  const selfMode = self && selfUnlocked
  const trialLeft = useGameStore(trialTranslationsLeft)
  // Pricing depends on skills and the current event (Tax Holiday, AI Hype Week).
  const priced = useGameStore((s) => `${!!s.skills.coupon}|${s.event?.id ?? ''}`)
  const down = useGameStore((s) => !!eventMods(s).translatorDown)
  const skinId = useGameStore((s) => s.translatorSkin)
  const skin = TRANSLATOR_SKINS.find((k) => k.id === skinId) ?? TRANSLATOR_SKINS[0]
  // `priced` is the part of the store that changes the price.
  const quote = useMemo(() => quoteTranslation(useGameStore.getState(), input), [input, priced])

  useEffect(() => () => clearTimeout(timer.current), [])

  const translate = () => {
    if (busy) return
    const store = useGameStore.getState()
    if (!quote.words) {
      setStatus('bad')
      setOutput('You want me to translate NOTHING? Bold strategy.')
      return
    }
    // Decide trial eligibility before charging (charging uses up a trial translation).
    const onTrial = trialTranslationsLeft(store) > 0
    const { ok, quote: charged, refused, down: isDown } = store.requestTranslation(input)
    if (isDown) {
      setStatus('refused')
      setOutput('🔧 503 Service Unavailable. TranslatrAI™ is down for Server Maintenance. You were not charged. This has never happened before and will never happen again.')
      return
    }
    if (!ok) {
      setStatus('broke')
      setOutput(`That's ${money(charged.total)} after the Premium Character Tax. You have ${money(store.money)}. Go mine, peasant.`)
      return
    }
    const text = input
    setBusy(true)
    setOutput('')
    clearTimeout(timer.current)
    const language = lang.replace(' (Premium)', '')
    timer.current = setTimeout(() => {
      setBusy(false)
      if (refused) {
        setOutput(refusal(language))
        setStatus('refused')
        return
      }
      const correct = hasCorrectTranslation(useGameStore.getState())
      const out = correct || onTrial ? correctTranslate(text) : badTranslate(text, language)
      setOutput(out)
      setStatus(correct ? 'correct' : onTrial ? 'trial' : 'bad')
      // It remembers what it translated for you (pasting it back as your own doesn't count).
      if (correct || onTrial) useGameStore.getState().sawTranslation(text)
      // If a client ordered exactly this, it's delivered (right or wrong, they will review it).
      useGameStore.getState().deliverContract({ text, lang: language, correct: correct || onTrial, output: out })
    }, 900)
  }

  const check = () => {
    if (!input.trim() || !mine.trim()) return
    const r = useGameStore.getState().selfTranslate({ text: input, attempt: mine, lang: lang.replace(' (Premium)', '') })
    if (!r) return
    setMarked(r)
    if (r.verdict === 'right') {
      setInput('')
      setMine('')
    }
  }
  const switchMode = (on) => {
    setSelf(on)
    setMarked(null)
  }

  let badge
  if (chipEquipped) badge = ['text-toxic border-toxic/40 bg-toxic/10', '● Correct Translation: ACTIVE']
  else if (trialLeft > 0) badge = ['text-gold border-gold/40 bg-gold/10', `● Free trial · ${trialLeft}/${FREE_TRIAL_TRANSLATIONS} left`]
  else badge = ['text-blood border-blood/40 bg-blood/10', '● Trial expired · Quality: hostile']

  return (
    <div className={`relative rounded-[1.6rem] ${skin.pad}`}>
      {/* Skin frame layer (separate so animated skins don't hue-shift the content) */}
      {skin.frame && <div className={`absolute inset-0 rounded-[1.6rem] ${skin.frame} ${skin.anim ? 'animate-rainbow' : ''}`} />}
      {skin.decor?.map((d, i) => (
        <span key={i} className={`absolute z-10 text-3xl ${DECOR_POSITIONS[i]} ${i % 2 ? 'animate-wiggle' : ''}`}>
          {d}
        </span>
      ))}
      {skin.label && (
        <span className={`absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded px-2 text-xs font-bold ${skin.labelClass}`}>
          {skin.label}
        </span>
      )}

      <Panel
        id="win-translator"
        title="Translate — Powered by TranslatrAI™ (it hates you)"
        icon="🌐"
        accent="#3da6e8"
        bodyClassName="p-0"
        right={
          <>
            <span className={`hidden rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold sm:inline ${badge[0]}`}>{badge[1]}</span>
            <button ref={frameBtn} onClick={() => setPickerOpen((o) => !o)} className="btn btn-ghost btn-sm" aria-expanded={pickerOpen}>
              🎨 Frame
            </button>
            {pickerOpen && <SkinPicker anchorRef={frameBtn} onClose={() => setPickerOpen(false)} />}
          </>
        }
      >
        {/* Two columns only when this window is wide enough (it can be dragged into a narrow column) */}
        <div className="@container">
        <div className="grid @min-[560px]:grid-cols-2">
          <div className="border-ink/[0.06] p-5 @min-[560px]:border-r">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="label">{selfMode ? 'English (free, which hurts us)' : "Detect language (we won't)"}</span>
              {selfUnlocked && <ModeSwitch self={selfMode} isNew={selfNew} onChange={switchMode} />}
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type something to have it ignored…"
              rows={5}
              className="input resize-none font-sans text-base"
              style={{ '--accent': '#3de8ff' }}
            />
            {selfMode ? (
              <p className="mt-3 text-xs leading-relaxed text-ink/50">
                {quote.words} word{quote.words === 1 ? '' : 's'} · <span className="text-toxic">free</span> · marked word by word. TranslatrAI™ only ever speaks Premium Latin™, whatever language you pick.
              </p>
            ) : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs leading-relaxed text-ink/50">
                {quote.words} word{quote.words === 1 ? '' : 's'} · <span className="text-magenta">{quote.taxTotal} vowel-taxed</span>
                {quote.discount > 0 && <span className="text-toxic"> · coupon −{money(quote.discount)}</span>}
                <div className="font-mono text-sm text-ink">
                  Total <b className="glow-gold">{money(quote.total)}</b>
                </div>
              </div>
              <button onClick={translate} disabled={busy} className="btn btn-gold">
                {down ? '🔧 Down for maintenance' : busy ? 'Translating…' : `Translate · ${money(quote.total)}`}
              </button>
            </div>
            )}
          </div>

          <div className="bg-inset/20 p-5">
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="input mb-3 w-auto py-1.5 font-sans text-sm">
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            {selfMode ? (
              <SelfTranslate mine={mine} setMine={setMine} marked={marked} canCheck={!!input.trim() && !!mine.trim()} onCheck={check} />
            ) : (
            <div className="min-h-[8.5rem] text-lg">
              {busy ? (
                <div className="space-y-2.5 pt-1">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-ink/10" />
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-ink/10" />
                  <div className="text-sm text-ink/40">Sighing heavily…</div>
                </div>
              ) : output ? (
                <div className="animate-fade-up">
                  <p translate="no" className={status === 'correct' || status === 'trial' ? 'text-ink' : status === 'broke' ? 'text-gold' : 'text-blood'}>{output}</p>
                  {status === 'correct' && <p className="mt-3 text-sm font-medium text-toxic">✓ Verified Correct Translation™ — we detected you meant Latin.</p>}
                  {status === 'trial' && <p className="mt-3 text-sm font-medium text-gold">✓ Correct! (Free trial — {trialLeft} left. After that, I stop caring.)</p>}
                  {status === 'refused' && <p className="mt-3 text-sm font-bold text-blood">⛔ REFUSED · every 2nd request is refused · fee not refunded</p>}
                </div>
              ) : (
                <p className="text-ink/30">Translation will appear here. Emotionally.</p>
              )}
            </div>
            )}
          </div>
        </div>
        </div>
        <Contracts
          onFill={(c) => {
            setInput(c.text)
            setLang(c.lang)
          }}
        />
      </Panel>
    </div>
  )
}

/** Who translates: TranslatrAI™ (paid) or you (free). */
function ModeSwitch({ self, isNew, onChange }) {
  const option = (on, label) => (
    <button role="radio" aria-checked={self === on} className={`btn btn-sm ${self === on ? 'btn-gold' : 'btn-ghost'}`} onClick={() => onChange(on)}>
      {label}
    </button>
  )
  return (
    <div role="radiogroup" aria-label="Who translates" className="flex flex-wrap gap-1">
      {option(false, '🤖 TranslatrAI™')}
      {option(
        true,
        <>
          ✍️ Myself{isNew && <span className="ml-1 rounded bg-magenta px-1 text-[0.5625rem] font-bold leading-4 text-white">NEW</span>}
        </>,
      )}
    </div>
  )
}

/** Your own Premium Latin™: type it, get it marked, build the streak (the Self-Taught ending). */
function SelfTranslate({ mine, setMine, marked, canCheck, onCheck }) {
  const streak = useGameStore((s) => s.fluency.streak)
  const solvedOnce = useGameStore((s) => (s.stats.selfCorrect ?? 0) > 0)
  return (
    <div className="min-h-[8.5rem]">
      <textarea
        value={mine}
        onChange={(e) => setMine(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onCheck()
          }
        }}
        placeholder="Your translation, in Premium Latin™…"
        aria-label="Your translation"
        rows={3}
        className="input resize-none font-sans text-base"
        style={{ '--accent': '#39ff14' }}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-[8rem] flex-1 text-[0.6875rem] text-ink/55" title={`Sentences of ${FLUENCY_MIN_WORDS}+ different words, in a row, no mistakes`}>
          Fluency streak <b className="text-ink">{streak}/{FLUENCY_TO_WIN}</b>
          <div className="mt-1 h-1.5 overflow-hidden rounded bg-ink/10">
            <div className="h-full rounded bg-toxic transition-[width] duration-500" style={{ width: `${(streak / FLUENCY_TO_WIN) * 100}%` }} />
          </div>
        </div>
        <button className="btn btn-toxic" disabled={!canCheck} onClick={onCheck}>
          ✍️ Check mine · free
        </button>
      </div>
      {marked && marked.verdict !== 'empty' && <Marking r={marked} />}
      {!solvedOnce && (
        <p className="mt-2 text-[0.6875rem] text-ink/45">
          Tip: compare what you type with what TranslatrAI™ sold you. Its grammar is one rule long. It charges $10 a word for it.
        </p>
      )}
    </div>
  )
}

/** Which words were right (never what the right ones are), and what it meant for the streak. */
function Marking({ r }) {
  const wrong = r.words.filter((w) => !w.ok).length + r.extra
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`
  const ok = r.correct
  let msg
  if (r.verdict === 'copied') msg = '📋 That’s TranslatrAI™’s own translation, pasted back. It noticed. It’s flattered. Doesn’t count.'
  else if (r.verdict === 'right') msg = `✓ Perfect Premium Latin™. TranslatrAI™ hates that. Streak ${r.streak}/${FLUENCY_TO_WIN}.`
  else if (r.verdict === 'wrong') msg = `✗ ${plural(wrong, 'word')} wrong. ${r.lost ? `Your ${r.lost}-sentence streak is gone.` : 'Streak stays at 0.'}`
  else if (r.why === 'short')
    msg = ok
      ? `✓ Correct! Practice only: a sentence needs ${FLUENCY_MIN_WORDS} different words to count.`
      : `✗ ${plural(wrong, 'word')} wrong. Practice only (under ${FLUENCY_MIN_WORDS} different words), so no harm done.`
  else msg = ok ? '✓ Correct, but you already used that sentence in this streak. New one, please.' : `✗ ${plural(wrong, 'word')} wrong. You already used that sentence, so it doesn’t count either way.`
  return (
    <div className="animate-fade-up mt-3">
      <div className="flex flex-wrap gap-1" translate="no">
        {r.words.map((w, i) => (
          <span key={i} className={`rounded px-1.5 py-0.5 font-mono text-[0.75rem] ${w.ok ? 'bg-toxic/15 text-toxic' : 'bg-blood/15 text-blood'}`}>
            {w.ok ? '✓' : '✗'} {w.en}
          </span>
        ))}
        {r.extra > 0 && <span className="rounded bg-blood/15 px-1.5 py-0.5 font-mono text-[0.75rem] text-blood">✗ +{r.extra} extra</span>}
      </div>
      <p className={`mt-2 text-sm font-medium ${r.verdict === 'copied' ? 'text-gold' : ok ? 'text-toxic' : 'text-blood'}`}>{msg}</p>
    </div>
  )
}

/** Open translation jobs (they arrive by email), your reputation, and the latest review. */
function Contracts({ onFill }) {
  const contracts = useGameStore((s) => s.contracts)
  const clock = useGameStore((s) => s.clock)
  const ratings = useGameStore((s) => s.ratings)
  const latest = useGameStore((s) => s.reviews[0])
  const payMult = useGameStore((s) => activeMods(s).contract ?? 1) // Business Cards
  const rep = reputationOf(ratings)
  return (
    <div className="@container border-t border-ink/10 px-5 py-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="label">📋 Contracts</span>
        <span className="text-[0.6875rem] text-ink/55">
          {rep ? `⭐ ${rep.avg.toFixed(1)} from ${rep.count} review${rep.count === 1 ? '' : 's'} · better reviews, bigger jobs` : 'New translator · no reviews yet'}
        </span>
      </div>
      {contracts.length === 0 ? (
        <p className="text-[0.75rem] text-ink/45">No open jobs. Clients will email you. They always do.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 @min-[760px]:grid-cols-3">
          {contracts.map((c) => {
            const secs = Math.max(0, Math.ceil((c.deadline - clock) / 1000))
            return (
              <li key={c.id} className="inset-card flex min-w-0 items-center gap-2.5 p-2.5">
                <span className="text-2xl">{c.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.6875rem] text-ink/55">
                    {c.client} · pays <b className="text-toxic">{money(Math.round(c.payout * payMult))}</b>
                  </div>
                  <div className="truncate text-[0.8125rem] font-semibold" title={`“${c.text}” into ${c.lang}`}>
                    “{c.text}” → {c.lang}
                  </div>
                  <div className={`font-mono text-[0.6875rem] ${secs < 45 ? 'font-bold text-blood' : 'text-ink/50'}`}>
                    ⏳ {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')} left
                  </div>
                </div>
                <button className="btn btn-sm shrink-0" onClick={() => onFill(c)} title="Put the phrase and language in the translator">
                  Fill in
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {latest && (
        <p className="mt-2 truncate text-[0.6875rem] text-ink/55" title={latest.text}>
          Latest review · {latest.client}: <span className={latest.stars >= 4 ? 'text-gold' : 'text-blood'}>{stars(latest.stars)}</span> “{latest.text}”
        </p>
      )}
    </div>
  )
}

const PICKER_GAP = 6

/**
 * Frame picker. Portaled to <body> and positioned against its button: inside the window it was
 * trapped in the window's stacking context (glass backdrop-filter), so later windows painted
 * over it and the window edge clipped it. Flips above the button when there's no room below.
 */
function SkinPicker({ anchorRef, onClose }) {
  const owned = useGameStore((s) => s.skinsOwned)
  const current = useGameStore((s) => s.translatorSkin)
  const selectSkin = useGameStore((s) => s.selectSkin)
  const ref = useRef(null)
  const [place, setPlace] = useState(null)

  // Follow the button (page scroll, window resize, inner scrollers).
  useLayoutEffect(() => {
    const update = () => {
      const a = anchorRef.current?.getBoundingClientRect()
      const el = ref.current
      if (!a || !el) return
      const vw = document.documentElement.clientWidth
      const floor = window.innerHeight - TASKBAR_H
      const left = Math.max(8, Math.min(a.right - el.offsetWidth, vw - el.offsetWidth - 8))
      const below = a.bottom + PICKER_GAP
      const fitsBelow = below + el.offsetHeight <= floor - 8
      const top = fitsBelow || a.top - PICKER_GAP - el.offsetHeight < 8 ? below : a.top - PICKER_GAP - el.offsetHeight
      setPlace({ left, top, above: top < a.top })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [anchorRef])

  // Close on a press outside (the button toggles it itself) or Escape.
  useEffect(() => {
    const onDown = (e) => !ref.current?.contains(e.target) && !anchorRef.current?.contains(e.target) && onClose()
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchorRef, onClose])

  return createPortal(
    <div
      ref={ref}
      data-no-drag
      role="dialog"
      aria-label="Translator frames"
      className="modal-card anim-modal-in fixed z-[195] w-72 max-w-[calc(100vw-16px)] p-1"
      style={{
        '--accent': '#3da6e8',
        left: place?.left ?? 0,
        top: place?.top ?? 0,
        visibility: place ? 'visible' : 'hidden',
        transformOrigin: place?.above ? 'bottom right' : 'top right',
      }}
    >
      <div className="mb-1 flex items-center justify-between px-2 py-1">
        <span className="label">Translator frames</span>
        <button onClick={onClose} className="text-ink/40 hover:text-ink">
          ✕
        </button>
      </div>
      {TRANSLATOR_SKINS.map((k) => {
        const isOwned = !!owned[k.id]
        const label = current === k.id ? 'EQUIPPED' : isOwned ? 'Equip' : k.premium ? k.premium : money(k.price)
        return (
          <button
            key={k.id}
            onClick={() => selectSkin(k.id)}
            className={`mb-0.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${
              current === k.id ? 'bg-gold/10 ring-1 ring-gold/50' : 'hover:bg-ink/5'
            }`}
          >
            <span>
              {k.emoji} {k.name}
            </span>
            <span className={`font-mono text-xs font-semibold ${k.premium && !isOwned ? 'text-magenta' : isOwned ? 'text-toxic' : 'text-ink/50'}`}>{label}</span>
          </button>
        )
      })}
    </div>,
    document.body,
  )
}
