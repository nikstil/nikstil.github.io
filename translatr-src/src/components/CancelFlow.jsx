import { useEffect, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { PREMIUM_ITEMS } from '../data/gameData'
import Modal from './Modal'

// What each subscription "costs" you to cancel, emotionally.
const PERKS = {
  vip: { lose: 'your crown, VIP-exclusive ads and a sense of belonging', sad: 'Your crown' },
  catcare: { lose: 'automatic feeding, a fed cat and your cat’s remaining trust', sad: 'Your cat' },
}

// The maze. Seven confirmations (six "sure?" plus a double negative), a retention offer,
// an exit survey and a final screen whose "Cancel" button cancels the *cancellation*.
const STEPS = [
  { kind: 'sure', title: 'Are you sure?', body: (p) => `You will lose ${p.lose}.` },
  { kind: 'sure', title: 'Are you really sure?', body: () => 'People who cancel are 400% less premium. That’s just science.' },
  { kind: 'sure', title: 'Like, sure sure?', body: () => 'We just want to be sure that you’re sure you’re sure.' },
  { kind: 'offer' },
  { kind: 'sure', title: 'Think of the shareholders.', body: () => 'Somewhere, a yacht will be 2% smaller because of you.' },
  { kind: 'survey' },
  { kind: 'sure', title: (p) => `${p.sad} will miss you.`, body: () => 'It told us. We asked it directly.' },
  { kind: 'double' },
  { kind: 'sure', title: 'Okay. Last one. Promise.', body: () => 'This is the real last confirmation (there is one more).' },
  { kind: 'final' },
]
const SURVEY = ['Too expensive', 'I never use it', 'I found a better scam', 'My cat made me do it']

/** The subscription cancellation maze (VIP Gold Pass, CatCare+). Opened from the store. */
export default function CancelFlow() {
  const id = useGameStore((s) => s.cancelFlow)
  const close = useGameStore((s) => s.closeCancelFlow)
  return <Modal open={!!id}>{id && <Maze key={id} id={id} onClose={close} />}</Modal>
}

function Maze({ id, onClose }) {
  const item = PREMIUM_ITEMS.find((p) => p.id === id)
  const perks = PERKS[id] ?? { lose: 'everything', sad: 'We' }
  const [step, setStep] = useState(0)
  const [typed, setTyped] = useState('')
  const [shake, setShake] = useState(0)
  const s = STEPS[step]
  const text = (v) => (typeof v === 'function' ? v(perks) : v)
  const next = () => setStep((n) => Math.min(n + 1, STEPS.length - 1))

  const toast = (msg, tone = 'info') => useGameStore.getState().toast(msg, tone)
  const keep = () => {
    onClose()
    toast(`🎉 Great choice! ${item.name} stays. Your wallet thanks you for your continued support.`, 'good')
  }

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // The helpful button and the cancelling button trade places on every screen.
  const flipped = step % 2 === 1
  const pair = (primary, secondary) => (
    <div className={`mt-6 flex items-center gap-3 ${flipped ? 'flex-row-reverse' : ''}`}>
      {primary}
      <span className="flex-1" />
      {secondary}
    </div>
  )
  const keepBtn = (label = `Keep ${item.name}`) => (
    <button className="btn btn-gold px-5 py-2.5 text-base" onClick={keep}>
      {label}
    </button>
  )
  const onwards = (label = 'Continue cancelling', onClick = next) => (
    <button className="text-[0.75rem] text-ink/45 underline decoration-dotted hover:text-ink/70" onClick={onClick}>
      {label}
    </button>
  )

  let content
  if (s.kind === 'sure') {
    content = (
      <>
        <h2 className="font-display text-2xl font-semibold">{text(s.title)}</h2>
        <p className="mt-2 text-sm text-ink/60">{text(s.body)}</p>
        {pair(keepBtn(), onwards())}
      </>
    )
  } else if (s.kind === 'offer') {
    content = (
      <>
        <div className="label text-blood">Wait! A special offer, just for you</div>
        <h2 className="mt-1 font-display text-2xl font-semibold">50% off. Forever.*</h2>
        <p className="mt-2 text-sm text-ink/60">Stay and pay half. *Forever means one week. Half means slightly less than full.</p>
        {pair(
          <button
            className="btn btn-magenta px-5 py-2.5 text-base"
            onClick={() => {
              useGameStore.getState().acceptRetention()
              toast('🎉 Thanks for staying! Your 50% discount applies from: never.', 'good')
            }}
          >
            Accept offer
          </button>,
          onwards('No thanks, I enjoy paying full price'),
        )}
      </>
    )
  } else if (s.kind === 'survey') {
    content = (
      <>
        <h2 className="font-display text-2xl font-semibold">Why are you leaving?</h2>
        <p className="mt-2 text-sm text-ink/60">Your feedback helps us make leaving harder.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {SURVEY.map((answer) => (
            <button
              key={answer}
              className="btn btn-ghost"
              onClick={() => {
                toast(`📝 "${answer}". We hear you. We won't change anything.`, 'info')
                next()
              }}
            >
              {answer}
            </button>
          ))}
        </div>
      </>
    )
  } else if (s.kind === 'double') {
    content = (
      <>
        <h2 className="font-display text-2xl font-semibold">Do you not want to not cancel your subscription?</h2>
        <p className="mt-2 text-sm text-ink/60">Please answer carefully.</p>
        {pair(
          <button
            className="btn btn-ghost px-6"
            onClick={() => {
              setStep(0)
              toast('Double negatives are hard. Let’s start over, for clarity.', 'info')
            }}
          >
            No
          </button>,
          <button className="btn btn-ghost px-6" onClick={next}>
            Yes
          </button>,
        )}
      </>
    )
  } else {
    const confirmed = typed.trim().toUpperCase() === 'CANCEL'
    content = (
      <>
        <h2 className="font-display text-2xl font-semibold">Final step</h2>
        <p className="mt-2 text-sm text-ink/60">
          Type <b className="font-mono">CANCEL</b> to confirm you want to cancel {item.name}.
        </p>
        <input
          key={shake}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type CANCEL"
          className={`input mt-3 font-mono ${shake ? 'animate-shake' : ''}`}
          autoFocus
        />
        {pair(
          <button
            className="btn btn-gold px-6"
            title="Cancels the cancellation"
            onClick={() => {
              useGameStore.getState().cancelTheCancellation()
              toast(`🎉 Cancellation cancelled! You're still subscribed to ${item.name}.`, 'good')
            }}
          >
            Cancel
          </button>,
          <button
            className="btn btn-ghost px-6"
            onClick={() => {
              if (!confirmed) {
                setShake((n) => n + 1)
                return toast('Please type CANCEL. In capitals. We are very serious about this.', 'bad')
              }
              useGameStore.getState().cancelSubscription(id)
              toast(`✂️ ${item.name} cancelled. We'll miss your money.`, 'info')
            }}
          >
            Continue
          </button>,
        )}
      </>
    )
  }

  return (
    <div role="dialog" aria-modal="true" className="modal-card w-[min(480px,94vw)] p-6" style={{ '--accent': '#8a4fc4' }}>
      <div className="mb-4 flex items-center gap-2 text-[0.6875rem] text-ink/45">
        <span className="text-lg">{item.emoji}</span>
        <span className="font-semibold">Manage subscription · {item.name}</span>
        <span className="ml-auto font-mono">
          step {step + 1} of {step + 2}
        </span>
      </div>
      <div key={step} className="animate-fade-up">
        {content}
      </div>
    </div>
  )
}
