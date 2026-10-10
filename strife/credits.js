// Buying credits with pretend money. Five packs and a pretend checkout ("WalletDrain™"): no card
// details, nothing is charged, it's all made up. The credits go straight into your COUNTER-STRIFE
// inventory (the one SKINSINK.GG uses too). Used by the inventory screen and the casino.

import { loadInventory, saveInventory } from './skins.js'

export const PACKS = [
  { credits: 25, price: 0.99 },
  { credits: 100, price: 3.49 },
  { credits: 250, price: 7.99, tag: 'Popular' },
  { credits: 1000, price: 27.99, tag: 'Best value' },
  { credits: 10000, price: 249.99, tag: 'Whale' },
]
const SPENT = 'strife-pretend-spent'
const money = (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const num = (v) => v.toLocaleString('en-US')

/** How much pretend money you've spent here, ever. */
export function pretendSpent() {
  try {
    return Number(localStorage.getItem(SPENT)) || 0
  } catch {
    return 0
  }
}
/** Buys a pack: the credits go into the saved inventory. Returns the new balance (or null). */
export function buyPack(credits) {
  const p = PACKS.find((x) => x.credits === credits)
  if (!p) return null
  const inv = loadInventory()
  inv.credits += p.credits
  saveInventory(inv)
  try {
    localStorage.setItem(SPENT, String(Math.round((pretendSpent() + p.price) * 100) / 100))
  } catch {}
  // (other pages hear about it through the storage event; this one, through this)
  dispatchEvent(new Event('strife-inventory'))
  return inv.credits
}

const CSS = `
.cstore{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;background:rgba(6,8,12,.72);font:14px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;color:#e9edf5;padding:12px}
.cstore *{box-sizing:border-box}
.cstore-card{width:min(560px,100%);max-height:100%;overflow:auto;background:#151a24;border:1px solid #2a3243;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5);padding:16px}
.cstore h2{margin:0 0 2px;font-size:19px}
.cstore .cs-sub{margin:0 0 12px;color:#9aa6bd;font-size:12.5px}
.cstore .cs-packs{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.cstore .cs-pack{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:14px 8px 10px;border-radius:10px;border:1px solid #2c3548;background:linear-gradient(#1c2230,#171c27);color:inherit;font:inherit;cursor:pointer}
.cstore .cs-pack:hover,.cstore .cs-pack:focus-visible{border-color:#f5b83d;outline:none;transform:translateY(-1px)}
.cstore .cs-coins{font-size:26px;line-height:1;height:32px}
.cstore .cs-amt{font-size:20px;font-weight:800;color:#ffd166}
.cstore .cs-price{font-weight:700;color:#c8d2e6}
.cstore .cs-tag{position:absolute;top:-8px;right:8px;background:#3fdc7c;color:#06210f;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:99px;text-transform:uppercase;letter-spacing:.04em}
.cstore .cs-tag.whale{background:#7aa7ff;color:#061433}
.cstore .cs-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:12px;color:#8592aa;font-size:12px}
.cstore button.cs-btn{border:0;border-radius:8px;padding:9px 14px;font:inherit;font-weight:700;cursor:pointer;background:#2a3243;color:#e9edf5}
.cstore button.cs-btn.go{background:#f5b83d;color:#241600}
.cstore button.cs-btn:disabled{opacity:.6;cursor:default}
.cstore .cs-pay{display:grid;gap:10px}
.cstore .cs-row{display:flex;justify-content:space-between;gap:8px;padding:10px 12px;border-radius:8px;background:#1b2130}
.cstore .cs-card{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px dashed #3a4459;color:#b8c3d8}
.cstore .cs-card b{color:#e9edf5}
.cstore .cs-status{min-height:20px;text-align:center;color:#9aa6bd}
.cstore .cs-status.ok{color:#3fdc7c;font-weight:700}
.cstore .cs-spin{display:inline-block;width:14px;height:14px;border:2px solid #9aa6bd;border-top-color:transparent;border-radius:50%;animation:cs-spin .7s linear infinite;vertical-align:-2px;margin-right:6px}
@keyframes cs-spin{to{transform:rotate(360deg)}}
`

/**
 * The shop, as a dialog over the page. opts: { onBought(credits, balance), onClose(), title }.
 * Returns a function that closes it.
 */
export function openCreditStore(opts = {}) {
  if (!document.getElementById('cstore-css')) {
    const st = document.createElement('style')
    st.id = 'cstore-css'
    st.textContent = CSS
    document.head.append(st)
  }
  document.querySelector('.cstore')?.remove()
  const el = document.createElement('div')
  el.className = 'cstore'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-label', 'Get credits')
  const card = document.createElement('div')
  card.className = 'cstore-card'
  el.append(card)
  let busy = false
  const close = () => {
    if (busy) return
    el.remove()
    removeEventListener('keydown', onKey, true)
    opts.onClose?.()
  }
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
    }
  }
  addEventListener('keydown', onKey, true)
  el.addEventListener('pointerdown', (e) => e.target === el && close())

  function packs() {
    const coins = ['🪙', '🪙🪙', '💰', '💰💰', '🏦']
    card.innerHTML = `<h2>Get credits</h2><p class="cs-sub">For COUNTER-STRIFE keys and SKINSINK.GG. Instant delivery. No refunds. No regrets (some regrets).</p>
      <div class="cs-packs">${PACKS.map((p, i) => `<button class="cs-pack" data-c="${p.credits}">${p.tag ? `<span class="cs-tag${p.credits >= 10000 ? ' whale' : ''}">${p.tag}</span>` : ''}<span class="cs-coins" aria-hidden="true">${coins[i]}</span><span class="cs-amt">ⓒ ${num(p.credits)}</span><span class="cs-price">${money(p.price)}</span></button>`).join('')}</div>
      <div class="cs-foot"><span>Spent so far: ${money(pretendSpent())}</span><button class="cs-btn" data-x>Close</button></div>`
    card.querySelector('[data-x]').onclick = close
    for (const b of card.querySelectorAll('.cs-pack')) b.onclick = () => checkout(PACKS.find((p) => p.credits === Number(b.dataset.c)))
    card.querySelector('.cs-pack')?.focus()
  }
  function checkout(p) {
    card.innerHTML = `<h2>WalletDrain™</h2><p class="cs-sub">Checkout. One click. That’s the problem.</p>
      <div class="cs-pay">
        <div class="cs-row"><span>ⓒ ${num(p.credits)} credits</span><b>${money(p.price)}</b></div>
        <div class="cs-card"><span aria-hidden="true">💳</span><span><b>Bank of Bloat</b> card •••• 0000<br><small>Your default card. It’s always your default card.</small></span></div>
        <p class="cs-status" aria-live="polite"></p>
        <div class="cs-foot"><button class="cs-btn" data-back>Back</button><button class="cs-btn go" data-pay>Pay ${money(p.price)}</button></div>
      </div>`
    const status = card.querySelector('.cs-status')
    card.querySelector('[data-back]').onclick = packs
    const pay = card.querySelector('[data-pay]')
    pay.focus()
    pay.onclick = () => {
      busy = true
      pay.disabled = card.querySelector('[data-back]').disabled = true
      status.innerHTML = '<span class="cs-spin"></span>Contacting your bank…'
      setTimeout(() => {
        const bal = buyPack(p.credits)
        busy = false
        status.className = 'cs-status ok'
        status.textContent = bal == null ? 'That didn’t work.' : `✓ Approved. ⓒ ${num(p.credits)} added (you have ⓒ ${num(bal)}). Spend it wisely (you won’t).`
        const foot = card.querySelector('.cs-foot')
        foot.innerHTML = '<button class="cs-btn" data-more>Buy more</button><button class="cs-btn go" data-done>Done</button>'
        foot.querySelector('[data-more]').onclick = packs
        foot.querySelector('[data-done]').onclick = close
        foot.querySelector('[data-done]').focus()
        if (bal != null) opts.onBought?.(p.credits, bal)
      }, 900)
    }
  }
  packs()
  document.body.append(el)
  return close
}
