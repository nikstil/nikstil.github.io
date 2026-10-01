import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import Modal from './Modal'
import RealCat from './RealCat'

// Narrated by the cat, who is not being paid for this.
const STEPS = [
  {
    icon: '📖',
    title: 'Tutorial, I guess',
    line: "Hi. I'm the tutorial. I was told to be enthusiastic about this.",
    more: "I'm not going to be. Let's just get through it.",
  },
  {
    icon: '🌐',
    title: 'The Translator',
    line: "Use the translator or something, I don't really care.",
    more: "It charges $10 a word. Vowels cost extra. It refuses every second request, and still bills you. You'll figure it out. Or you won't.",
  },
  {
    icon: '⛏️',
    title: 'Mining',
    line: "There's a rock. You click it. Money comes out.",
    more: 'Then you run out of stamina and you wait. Or you buy an energy drink. That is genuinely the whole thing. Riveting.',
  },
  {
    icon: '🎡',
    title: 'Gambling',
    line: "The roulette is right there. You're going to lose.",
    more: "Red, black or green, it doesn't matter. I'm not going to stop you. Nobody ever stops anybody.",
  },
  {
    icon: '🪟',
    title: 'The UI, allegedly',
    line: 'Drag windows around if you want. Minimize them. Whatever.',
    more: 'Ads show up every 30 seconds. Some bounce, some run away, one deletes your save. Usability came up in a meeting once. The meeting ran long.',
  },
  {
    icon: '🦈',
    title: 'Loans',
    line: "Broke? Vinnie from QuickCash™ will lend you money. He's nice.",
    more: "The interest compounds every 15 seconds. Then a truck shows up. It's fine. It's not fine. Not my problem.",
  },
  {
    icon: '🥱',
    title: "That's it",
    line: 'That was the tutorial. You could have skipped it, you know.',
    more: 'Anyway. Go translate something. Or don’t.',
  },
]
const NEXT_LABELS = ['ok', 'sure', 'fine', 'yeah yeah', 'mhm', 'k', 'whatever']
const ENTHUSIASM = [12, 7, 4, 3, 2, 1, 0] // percent, per step

/** First-run tutorial (after the cookie banner), reopenable from the Start menu. */
export default function Tutorial() {
  // First run only in normal mode (speedrunners skip it); reopenable from the Start menu.
  const open = useGameStore((s) => (s.mode === 'normal' && !!s.consent && !s.privacyOpen && !s.tutorialSeen) || s.tutorialOpen)
  return (
    <Modal open={open} z={470} backdrop="bg-[#06264d]/45">
      <TutorialBody />
    </Modal>
  )
}

function TutorialBody() {
  const [step, setStep] = useState(0)
  const close = useGameStore((s) => s.closeTutorial)
  const s = STEPS[step]
  const last = step === STEPS.length - 1

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="tut-title" className="modal-card w-[min(520px,94vw)] p-6" style={{ '--accent': '#8a4fc4' }}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 text-center">
          <RealCat mood="bored" size={92} title="Your tutorial guide, Sir Scratchington (unpaid)" />
          <div className="mt-1 text-[0.625rem] leading-tight text-ink/45">
            Sir Scratchington
            <br />
            unpaid intern
          </div>
        </div>
        <div key={step} className="min-w-0 flex-1 animate-fade-up">
          <div className="label mb-1">
            Step {step + 1} of {STEPS.length} · I’m counting for you
          </div>
          <h2 id="tut-title" className="font-display text-xl font-semibold leading-tight">
            <span className="mr-1.5">{s.icon}</span>
            {s.title}
          </h2>
          <p className="mt-2 text-[0.9375rem] font-semibold leading-snug">{s.line}</p>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink/60">{s.more}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 text-[0.6875rem] text-ink/50">
        <span className="shrink-0">Enthusiasm</span>
        <div className="meter h-2 flex-1" style={{ '--bar': '#8a4fc4' }}>
          <span style={{ width: `${ENTHUSIASM[step]}%` }} />
        </div>
        <span className="w-8 shrink-0 text-right font-mono">{ENTHUSIASM[step]}%</span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {!last && (
          <button className="btn btn-ghost btn-sm" onClick={close}>
            Skip (please)
          </button>
        )}
        {step > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setStep((n) => n - 1)}>
            back (why)
          </button>
        )}
        <button className="btn btn-gold ml-auto min-w-24" onClick={() => (last ? close() : setStep((n) => n + 1))} autoFocus>
          {NEXT_LABELS[step]}
        </button>
      </div>
    </div>
  )
}
