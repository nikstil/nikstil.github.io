import { useEffect, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { AD_CREATIVES } from '../data/gameData'

// The ad's own layouts. Every format shares the Shell: the draggable header strip (where the
// close X sits), the DVD glow and the bounce counter. Class names avoid "ad-*" on purpose:
// ad blockers hide those.

/** Clicking anything in an ad earns you another ad. */
function moreAds(message = 'Thanks for your interest! Here is another ad.') {
  const { spawnAd, toast } = useGameStore.getState()
  spawnAd()
  toast(message, 'info')
}

export function DvdLogo({ className = '' }) {
  return (
    <svg viewBox="0 0 60 28" className={`dvd-logo ${className}`} role="img" aria-label="DVD">
      <text x="30" y="15" textAnchor="middle" fontSize="17" fontWeight="900" fontStyle="italic" fontFamily="Arial Black, Arial, sans-serif" letterSpacing="-0.5">
        DVD
      </text>
      <ellipse cx="30" cy="22.5" rx="27" ry="4.6" />
      <text x="30" y="24.6" textAnchor="middle" fontSize="5.2" fontWeight="700" fontFamily="Arial, sans-serif" letterSpacing="1.4" fill="#fff">
        ADVERT
      </text>
    </svg>
  )
}

/** Picks the creative's layout. */
export function AdBody({ ad, cardRef, dvd }) {
  const c = AD_CREATIVES[ad.creative % AD_CREATIVES.length]
  const Format = FORMATS[c.format ?? 'card'] ?? CardAd
  return <Format ad={ad} c={c} cardRef={cardRef} dvd={dvd} />
}

function Shell({ ad, cardRef, dvd, width = 'w-[min(340px,88vw)]', system = false, label, children }) {
  const vip = useGameStore((s) => !!s.premium.vip)
  const adFree = useGameStore((s) => !!s.premium.remove_ads)
  const title = label ?? (adFree ? 'Ad-Free Experience™ Advertisement' : vip ? '👑 VIP-Exclusive Advertisement' : 'Advertisement')
  return (
    <div
      ref={cardRef}
      className={`floater-card relative overflow-hidden rounded-xl bg-white ${width} ${
        dvd.enabled ? 'dvd-glow' : 'shadow-[0_30px_60px_-10px_rgba(0,0,0,.9),0_0_0_1px_rgba(255,255,255,.2)]'
      }`}
    >
      <div
        data-floater-grip
        className={`floater-grip flex min-h-[27px] items-center gap-1.5 py-1 pl-2.5 pr-10 font-sans text-[0.625rem] font-semibold uppercase tracking-wider ${
          system ? 'bg-[linear-gradient(90deg,#0a246a,#3a6ea5)] text-[#fff]' : 'bg-neutral-100 text-neutral-500'
        }`}
        title="Drag to move this ad (closing it is also an option, apparently)"
      >
        <span aria-hidden="true" className={`text-xs leading-none ${system ? 'text-[#fff]/60' : 'text-neutral-400'}`}>
          ⠿
        </span>
        <span className="min-w-0 truncate">
          {title} · #{ad.n}
        </span>
        {dvd.enabled && <DvdLogo className="ml-auto shrink-0" />}
      </div>
      {children}
      {dvd.enabled && (
        <span className="pointer-events-none absolute bottom-1.5 left-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-[#fff]">
          📀 {dvd.bounces} bounce{dvd.bounces === 1 ? '' : 's'} · {dvd.corners} corner{dvd.corners === 1 ? '' : 's'}
        </span>
      )}
    </div>
  )
}

function CardAd({ ad, c, cardRef, dvd }) {
  return (
    <Shell ad={ad} cardRef={cardRef} dvd={dvd}>
      <div className={`stock-watermark relative flex h-32 items-center justify-center bg-linear-to-br ${c.theme} text-6xl`}>{c.art}</div>
      <div className="p-3 pb-7 text-neutral-900">
        <div className="font-comic text-lg font-bold leading-tight">{c.headline}</div>
        <p className="mt-1 font-sans text-sm text-neutral-600">{c.body}</p>
        <button onClick={() => moreAds()} className="mt-2 w-full animate-flash rounded bg-orange-500 py-2 font-sans font-bold text-ink">
          {c.cta}
        </button>
      </div>
    </Shell>
  )
}

/** A fake Windows XP-era warning dialog. Both buttons do the same thing. */
function AlertAd({ ad, c, cardRef, dvd }) {
  return (
    <Shell ad={ad} cardRef={cardRef} dvd={dvd} system width="w-[min(380px,90vw)]" label={`${c.title} — Advertisement`}>
      <div className="flex gap-3 bg-[#ece9d8] p-4 pb-7 font-sans text-[0.8125rem] text-neutral-900">
        <span className="text-4xl leading-none">{c.icon}</span>
        <div className="min-w-0">
          <div className="font-bold">{c.headline}</div>
          <p className="mt-1 text-neutral-700">{c.body}</p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {c.buttons.map((b) => (
              <button
                key={b}
                onClick={() => moreAds('Fixing… just kidding. Here is another ad.')}
                className="min-w-20 rounded-[3px] border border-[#003c74] bg-[linear-gradient(180deg,#fff,#ece9d8_85%,#d6d0c5)] px-3 py-1 text-[0.75rem] shadow-[inset_0_0_0_1px_#fff]"
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  )
}

/** A "video" ad. Its skip button skips… to the next ad. */
function VideoAd({ ad, c, cardRef, dvd }) {
  const [left, setLeft] = useState(5)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return (
    <Shell ad={ad} cardRef={cardRef} dvd={dvd} width="w-[min(400px,90vw)]">
      <div className={`relative flex aspect-video items-center justify-center bg-linear-to-br ${c.theme} text-6xl`}>
        {c.art}
        <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 font-sans text-[0.625rem] font-bold text-[#fff]">▶ SPONSORED VIDEO</span>
        <button
          disabled={left > 0}
          onClick={() => moreAds('Skipped! Enjoy this other ad instead.')}
          className="absolute bottom-3 right-0 border border-[#fff]/40 bg-black/70 px-3 py-1.5 font-sans text-[0.75rem] text-[#fff] disabled:opacity-80"
        >
          {left > 0 ? `Skip ad in ${left}` : 'Skip ad ⏩'}
        </button>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-[#fff]/25">
          <div className="h-full bg-[#ffcc00] [animation:video-progress_30s_linear_forwards]" />
        </div>
      </div>
      <div className="flex items-center gap-2 p-3 pb-7 text-neutral-900">
        <div className="min-w-0 flex-1">
          <div className="truncate font-sans text-sm font-bold">{c.headline}</div>
          <p className="font-sans text-xs text-neutral-600">{c.body}</p>
        </div>
        <button onClick={() => moreAds()} className="shrink-0 rounded bg-[#1a73e8] px-3 py-1.5 font-sans text-xs font-bold text-[#fff]">
          {c.cta}
        </button>
      </div>
    </Shell>
  )
}

/** A DM from a stranger that types itself out, one message at a time. */
function ChatAd({ ad, c, cardRef, dvd }) {
  const [shown, setShown] = useState(1)
  const [reply, setReply] = useState('')
  const typing = shown < c.lines.length
  useEffect(() => {
    if (!typing) return
    const t = setTimeout(() => setShown((n) => n + 1), 1300)
    return () => clearTimeout(t)
  }, [typing, shown])
  return (
    <Shell ad={ad} cardRef={cardRef} dvd={dvd} width="w-[min(320px,88vw)]" label="Sponsored message">
      <div className="bg-[#f0f2f5] p-3 pb-7 font-sans text-neutral-900">
        <div className="mb-2 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff] text-xl shadow">{c.avatar}</span>
          <div className="leading-tight">
            <div className="text-[0.8125rem] font-bold">{c.name}</div>
            <div className="text-[0.625rem] text-[#2e9e44]">● online · 0.2 km away</div>
          </div>
        </div>
        <div className="space-y-1.5">
          {c.lines.slice(0, shown).map((line, i) => (
            <div key={i} className="w-fit max-w-[85%] animate-fade-up rounded-2xl rounded-bl-sm bg-[#fff] px-3 py-1.5 text-[0.8125rem] shadow-sm">
              {line}
            </div>
          ))}
          {typing && <div className="w-fit rounded-2xl bg-[#fff] px-3 py-1.5 text-[0.8125rem] text-neutral-400 shadow-sm">typing…</div>}
        </div>
        <div className="mt-3 flex gap-1.5">
          <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-[#fff] px-3 py-1 text-[0.8125rem] outline-none" />
          <button onClick={() => moreAds('Message sent! They replied with an ad.')} className="shrink-0 rounded-full bg-[#0084ff] px-3 py-1 text-[0.75rem] font-bold text-[#fff]">
            {c.cta}
          </button>
        </div>
      </div>
    </Shell>
  )
}

/** A 468×60-era flashing banner. CLICK HERE. */
function BannerAd({ ad, c, cardRef, dvd }) {
  return (
    <Shell ad={ad} cardRef={cardRef} dvd={dvd} width="w-[min(480px,92vw)]">
      <div className={`flex items-center gap-3 bg-linear-to-r ${c.theme} px-3 py-3 pb-7`}>
        <span className="animate-wiggle text-4xl">{c.art}</span>
        <div className="min-w-0 flex-1 animate-flash font-comic text-base font-bold uppercase leading-tight text-[#1b0033] [text-shadow:1px_1px_0_#fff]">{c.headline}</div>
        <button onClick={() => moreAds('CONGRATULATIONS! You won: another banner.')} className="shrink-0 rounded border-2 border-[#1b0033] bg-[#fff] px-3 py-1 font-comic text-sm font-bold text-[#1b0033] shadow-[3px_3px_0_#1b0033]">
          {c.cta}!
        </button>
      </div>
    </Shell>
  )
}

/** One quick question. Every answer is the right answer (to sell). */
function SurveyAd({ ad, c, cardRef, dvd }) {
  const [pick, setPick] = useState(null)
  return (
    <Shell ad={ad} cardRef={cardRef} dvd={dvd} label="Sponsored survey">
      <div className="p-3 pb-7 font-sans text-neutral-900">
        <div className="text-base font-bold">{c.headline}</div>
        <p className="mt-1 text-sm text-neutral-600">{c.question}</p>
        <div className="mt-2 space-y-1">
          {c.options.map((o) => (
            <label key={o} className="flex items-center gap-2 rounded border border-neutral-200 px-2 py-1 text-[0.8125rem] hover:bg-neutral-50">
              <input type="radio" name={`survey-${ad.id}`} checked={pick === o} onChange={() => setPick(o)} />
              {o}
            </label>
          ))}
        </div>
        <button
          disabled={!pick}
          onClick={() => moreAds(`Thanks! Your answer ("${pick}") has been sold to 1,436 partners.`)}
          className="mt-3 w-full rounded bg-[#7c3aed] py-1.5 text-sm font-bold text-[#fff] disabled:opacity-40"
        >
          {c.cta}
        </button>
      </div>
    </Shell>
  )
}

const FORMATS = { card: CardAd, alert: AlertAd, video: VideoAd, chat: ChatAd, banner: BannerAd, survey: SurveyAd }
