import { useEffect, useRef, useState } from 'react'
import { useGameStore, fakeDiscountFactor, getCompanyPrice } from '../store/useGameStore'
import { GEM_ITEMS, PREMIUM_ITEMS } from '../data/gameData'
import { money, moneyLong } from '../lib/format'
import Modal from './Modal'
import Panel from './Panel'
import RealCat from './RealCat'
import PhantomBadge from './PhantomBadge'
import { useLastDefined } from '../lib/hooks'
import { sfx } from '../lib/audio/engine'

const OFFER_WINDOW_SEC = 300
const VISIT_COOLDOWN_MS = 20_000 // one "visit" per 20s of looking at the store
const STOCK = 2 // "Only 2 left!" — forever
const SHELF = PREMIUM_ITEMS.filter((item) => !item.hidden)

/** "$9.99/wk" → { amount: 9.99, suffix: '/wk' } */
function parsePrice(price) {
  const m = price.match(/\$([\d,.]+)(.*)/)
  return { amount: parseFloat(m[1].replace(/,/g, '')), suffix: m[2] }
}
/** The fake "was" price and discount. The was-price grows every visit, so the deal keeps "improving". */
function fakeDeal(price, visits) {
  const { amount, suffix } = parsePrice(price)
  const was = Math.ceil(amount * fakeDiscountFactor(visits)) - 0.01
  return { was: `$${was.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`, pct: Math.floor((1 - amount / was) * 100) }
}
const hash = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

export default function PremiumStore() {
  const premium = useGameStore((s) => s.premium)
  const checkout = useGameStore((s) => s.checkout)
  const startCheckout = useGameStore((s) => s.startCheckout)
  const visits = useGameStore((s) => s.storeVisits ?? 0)
  const rootRef = useRef(null)
  const [restock, setRestock] = useState(null) // { id, phase: 'sold' | 'restocked' } after a purchase

  // Count a "visit" whenever the store is actually on screen (at most once per 20s).
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    let last = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || Date.now() - last < VISIT_COOLDOWN_MS) return
        last = Date.now()
        useGameStore.getState().visitStore()
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // After a purchase: "Only 1 left!!" for a moment, then a miraculous restock back to 2.
  // (Timers live in a ref: closing the checkout must not cancel the restock.)
  const doneId = checkout?.phase === 'done' ? checkout.itemId : null
  const restockTimers = useRef([])
  useEffect(() => {
    if (!doneId) return
    restockTimers.current.forEach(clearTimeout)
    setRestock({ id: doneId, phase: 'sold' })
    restockTimers.current = [
      setTimeout(() => setRestock({ id: doneId, phase: 'restocked' }), 3000),
      setTimeout(() => setRestock(null), 9000),
    ]
  }, [doneId])
  useEffect(() => () => restockTimers.current.forEach(clearTimeout), [])
  return (
    <Panel
      id="win-store"
      title="The Premium Vault — TRANSLATR™ Marketplace"
      icon="💰"
      accent="#e0a21a"
      bodyClassName="overflow-hidden p-6"
      right={
        <button
          className="relative grid h-7 w-7 place-items-center text-base"
          title="Notifications (clicking them does not help)"
          onClick={() => {
            useGameStore.getState().bumpPhantom('store')
            sfx('ping')
          }}
        >
          🔔
          <PhantomBadge id="store" />
        </button>
      }
    >
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(255,200,60,.22),transparent_65%)]" />
      <div className="relative mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label mb-1 text-gold">Exclusive · Members only · Everyone is a member</div>
          <h2 className="text-3xl font-light text-gold-grad">The Premium Vault</h2>
        </div>
        <div className="flex items-center gap-2 alert-pill rounded-md border border-blood/40 px-3 py-2 text-sm font-semibold text-blood shadow-[0_2px_6px_-2px_rgba(211,47,47,.4)]">
          <span className="h-2 w-2 animate-live rounded-full bg-blood" />
          Offer ends in <OfferCountdown />
          <span className="text-[0.625rem] text-blood/60">(it resets)</span>
        </div>
      </div>

      <Acquisition />

      <div ref={rootRef} className="@container">
      <div className="relative grid gap-4 @min-[520px]:grid-cols-2 @min-[780px]:grid-cols-3 @min-[1180px]:grid-cols-5">
        {SHELF.map((item, i) => {
          const owned = premium[item.id] ?? 0
          const subscribed = item.subscription && owned > 0
          const soldOut = item.oneTime && owned > 0 && !subscribed
          const deal = fakeDeal(item.price, visits)
          const stockLine =
            restock?.id === item.id ? (restock.phase === 'sold' ? `Only ${STOCK - 1} left!!` : `Restocked just for you! Only ${STOCK} left!`) : `Only ${STOCK} left!`
          const accent = item.whale ? '#c42e86' : item.refillStamina || item.clearsDebt ? '#2c9a1e' : '#d08a00'
          return (
            <div
              key={item.id}
              className={`shop-card group relative flex flex-col overflow-hidden p-4 transition duration-300 hover:-translate-y-1 animate-fade-up ${
                item.whale ? 'border-magenta/50' : ''
              }`}
              style={{ animationDelay: `${i * 60}ms`, boxShadow: item.whale ? '0 0 22px -6px #c42e86' : undefined }}
            >
              {/* glass sheen on hover */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(120,190,255,.18)_45%,transparent_60%)] opacity-0 transition duration-500 group-hover:opacity-100" />
              <span className="badge absolute right-3 top-3" style={{ '--accent': accent }}>
                {item.tag}
              </span>
              <div className="my-3 text-5xl drop-shadow-[0_4px_6px_rgba(0,40,90,.25)] transition duration-300 group-hover:scale-110">
                {item.catPhoto ? <RealCat mood={item.catPhoto} size={56} /> : item.emoji}
              </div>
              <div className="shop-card-title text-base font-semibold leading-tight">{item.name}</div>
              <p className="mb-3 mt-1 flex-1 text-xs leading-relaxed text-ink/50">{item.desc}</p>
              {!item.oneTime && owned > 0 && <div className="mb-2 font-mono text-[0.6875rem] text-ink/40">Purchased ×{owned}</div>}
              {!soldOut && !subscribed && (
                <div className="mb-2 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <s className="font-mono text-[0.6875rem] text-ink/40">{deal.was}</s>
                    <span className="rounded-sm bg-blood px-1 font-mono text-[0.625rem] font-bold text-[#fff]">−{deal.pct}%</span>
                  </div>
                  <div className="text-[0.65625rem] font-semibold text-blood">
                    🔥 {stockLine} · 👀 <Viewers id={item.id} /> viewing
                  </div>
                </div>
              )}
              {subscribed ? (
                <button onClick={() => useGameStore.getState().openCancelFlow(item.id)} className="btn btn-ghost w-full">
                  Subscribed ✓ · Manage
                </button>
              ) : (
                <button
                  disabled={soldOut || !!checkout}
                  onClick={() => startCheckout(item.id)}
                  className={`btn w-full ${soldOut ? 'btn-ghost' : item.whale ? 'btn-magenta' : item.refillStamina ? 'btn-toxic' : 'btn-gold'}`}
                >
                  {soldOut ? 'Owned ✓' : `Buy · ${item.price}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
      </div>
      <GemShop />
      <p className="relative mt-5 text-center text-[0.6875rem] text-ink/35">
        All sales final. Prices in Real American Dollars™. Premium items survive Prestige, but not the Trap Ad.
      </p>
    </Panel>
  )
}

// The ticking bits live in their own tiny components, so the clock re-renders a number, not
// every card in the store.

/** A "limited time" countdown derived from the shared clock. It resets forever. */
function OfferCountdown() {
  const left = useGameStore((s) => OFFER_WINDOW_SEC - (Math.floor(s.clock / 1000) % OFFER_WINDOW_SEC))
  return <span className="font-mono tabular-nums">{`${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`}</span>
}

/** "👀 37 viewing": changes every 7 seconds, for urgency. */
function Viewers({ id }) {
  const slot = useGameStore((s) => Math.floor(s.clock / 7000))
  return 12 + ((hash(id) + slot * 7) % 70)
}

/** The goal of the game: TRANSLATR™ Inc. itself, for one quintillion (in-game) dollars. */
function Acquisition() {
  const cash = useGameStore((s) => s.money)
  const price = useGameStore(getCompanyPrice) // ten quintillion on NG+5
  const afford = cash >= price
  const pct = Math.min(1, Math.log10(Math.max(1, cash)) / Math.log10(price)) // log scale, for morale
  const confirm = () =>
    useGameStore.getState().showModal({
      tone: 'good',
      title: '🏢 Buy TRANSLATR™ Inc.?',
      body: `This spends ${moneyLong(price)}. The board will sign anything. This ends the game. One of its endings, anyway.`,
      confirmLabel: 'Buy the company',
      cancelLabel: 'Not yet',
      onConfirm: () => useGameStore.getState().buyCompany(),
    })
  return (
    <div className="acquisition-card relative mb-6 overflow-hidden rounded-xl border border-gold/50 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-5xl drop-shadow-[0_4px_6px_rgba(120,80,0,.35)]">🏢</span>
        <div className="min-w-[14rem] flex-1">
          <div className="label text-gold">For sale · Final price · Serious offers only</div>
          <div className="text-xl font-semibold">TRANSLATR™ Inc. (the whole company)</div>
          <div className="text-[0.6875rem] text-ink/55">
            <span className="font-mono">{moneyLong(price)}</span> · {price > 1e18 ? 'ten quintillion (the board got hostile)' : 'one quintillion dollars'} · in-game money only. The one thing in the Vault your mom’s card can’t buy.
          </div>
          <div className="meter mt-2 h-2.5" style={{ '--bar': '#d4a017' }}>
            <span style={{ width: `${pct * 100}%` }} />
          </div>
          <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-[0.6875rem] text-ink/50">
            <span>Your wallet: {money(cash)}</span>
            <span>{afford ? 'You can afford it. Oh no.' : `${(pct * 100).toFixed(1)}% of the way (log scale, for morale)`}</span>
          </div>
        </div>
        <button className={`btn px-5 py-3 ${afford ? 'btn-gold animate-glow-pulse' : 'btn-ghost'}`} style={{ '--glow': '#ffcf3f' }} disabled={!afford} onClick={confirm}>
          {afford ? '🏢 Buy the company' : 'Can’t afford it (yet)'}
        </button>
      </div>
    </div>
  )
}

/** Spend gems. Everything costs a multiple of 13; gems only come in packs of 10 (or 50). */
function GemShop() {
  const gems = useGameStore((s) => s.gems)
  const buy = useGameStore((s) => s.buyGemItem)
  const stuck = gems > 0 && gems < 13
  return (
    <div className="relative mt-6 border-t border-ink/10 pt-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="label text-ice">Gem Shop</div>
          <div className="text-[0.6875rem] text-ink/45">Prices in gems. Gems come in packs of 10. Prices come in 13s. Math is a Premium feature.</div>
        </div>
        <div className={`font-mono text-sm font-semibold ${stuck ? 'text-blood' : 'text-ice'}`}>
          💎 {gems.toLocaleString()} {stuck && <span className="text-[0.6875rem] font-normal">(can't afford anything)</span>}
        </div>
      </div>
      <div className="@container">
        <div className="grid gap-2 @min-[520px]:grid-cols-2 @min-[900px]:grid-cols-4">
          {GEM_ITEMS.map((g) => (
            <div key={g.id} className="inset-card flex items-center gap-3 p-3">
              <span className="text-3xl">{g.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{g.name}</div>
                <div className="text-[0.6875rem] leading-snug text-ink/50">{g.desc}</div>
              </div>
              <button className={`btn btn-sm shrink-0 font-mono ${gems >= g.cost ? 'btn-magenta' : 'btn-ghost'}`} onClick={() => buy(g.id)}>
                💎 {g.cost}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Global fake payment flow (used by the store, the Energy Drink button and the leaderboard). */
export function CheckoutModal() {
  const checkout = useGameStore((s) => s.checkout)
  const closeCheckout = useGameStore((s) => s.closeCheckout)
  const shown = useLastDefined(checkout)
  const item = shown && PREMIUM_ITEMS.find((p) => p.id === shown.itemId)

  return (
    <Modal open={!!checkout} z={270} onBackdrop={closeCheckout}>
      {item && (
        <div className="modal-card w-[min(380px,92vw)] p-7 text-center" style={{ '--accent': shown.phase === 'done' ? '#39ff14' : '#ffcf3f' }}>
          {shown.phase === 'processing' ? (
            <>
              <div className="relative mx-auto mb-5 h-14 w-14">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-ink/10 border-t-gold shadow-[0_0_20px_-4px_#ffcf3f]" />
                <div className="absolute inset-0 grid place-items-center text-2xl">{item.emoji}</div>
              </div>
              <div className="font-display text-lg font-semibold">Processing payment…</div>
              <div className="mt-2 text-sm text-ink/50">
                Charging <b className="font-mono text-ink">{item.price}</b> to <b className="text-ink">Mom's Card ••••0000</b>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-toxic/15 text-2xl text-toxic shadow-[0_0_30px_-6px_#39ff14] animate-pop-in">✓</div>
              <div className="font-display text-lg font-semibold">Purchase complete</div>
              <div className="mt-2 text-sm text-ink/60">
                You got <b className="text-ink">{item.name}</b>. Actually charged: <b className="font-mono text-toxic">$0.00</b>. Your bank will never know.
              </div>
              {item.id === 'remove_ads' && (
                <div className="mt-3 text-sm text-blood">
                  Ads have been removed.*
                  <div className="text-[0.6875rem] text-ink/40">*Ads have not been removed.</div>
                </div>
              )}
              {item.id === 'rank_boost' && <div className="mt-3 font-mono text-sm text-gold">New rank: #9,999,999 (+0)</div>}
              {item.refillStamina && <div className="mt-3 text-sm text-toxic">⚡ Stamina fully restored. Heart rate: concerning.</div>}
              {item.clearsDebt && <div className="mt-3 text-sm text-toxic">🧾 Debt forgiven. Vinnie is sending a strongly worded fruit basket.</div>}
              {item.id === 'catcare' && <div className="mt-3 text-sm text-gold">🐈‍⬛ Subscribed. Your cat is now fed by an algorithm, at 3× the price.</div>}
              {item.repairsStreak && <div className="mt-3 text-sm text-toxic">🛟 Streak restored. It was never broken. We never said that.</div>}
              {item.gems && <div className="mt-3 text-sm text-ice">💎 +{item.gems} gems. Everything costs 13. Enjoy the leftovers.</div>}
              {item.skillPoints && <div className="mt-3 text-sm text-magenta">🎓 +{item.skillPoints} skill points. The Ascension Tree is open for business.</div>}
              {item.id === 'privacy_pass' && (
                <div className="mt-3 text-sm text-toxic">
                  🛂 "Reject All" unlocked. Find it under Start → Cookie preferences.
                  <div className="text-[0.6875rem] text-ink/40">Your rejection will be shared with 1,436 partners.</div>
                </div>
              )}
              <button onClick={closeCheckout} className="btn btn-gold mt-6 w-full">
                Buy more!
              </button>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
