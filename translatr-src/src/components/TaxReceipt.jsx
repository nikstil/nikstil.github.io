import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../store/useGameStore'
import { useLastDefined, usePresence } from '../lib/hooks'
import { isVowel, PRICE_PER_WORD } from '../lib/translator'

const SHOW_MS = 8_000
const MAX_LINES = 9

/** A thermal-paper receipt that "prints" after every translation, itemising the Vowel Tax. */
export default function TaxReceipt() {
  const receipt = useGameStore((s) => s.receipt)
  const dismiss = useGameStore((s) => s.dismissReceipt)
  const shown = useLastDefined(receipt)
  const { mounted, closing } = usePresence(!!receipt, 260)

  // Auto-dismiss this specific receipt (id-guarded, so a newer receipt is never closed early).
  useEffect(() => {
    if (!receipt) return
    const t = setTimeout(() => dismiss(receipt.id), SHOW_MS)
    return () => clearTimeout(t)
  }, [receipt, dismiss])

  if (!mounted || !shown) return null
  const extra = shown.lines.length - MAX_LINES
  const extraTotal = shown.lines.slice(MAX_LINES).reduce((sum, l) => sum + l.base + l.tax, 0)

  return createPortal(
    <div
      className={`fixed left-4 top-24 z-[280] w-72 drop-shadow-[0_24px_40px_rgba(0,0,0,.7)] ${closing ? 'anim-modal-out' : ''}`}
      role="status"
    >
      <div key={shown.id} className="receipt-paper animate-receipt relative rounded-t-md px-5 pt-5 font-mono text-[0.75rem]">
        <button onClick={() => dismiss(shown.id)} className="absolute right-3 top-2 text-black/40 hover:text-black" aria-label="Close receipt">
          ✕
        </button>
        <div className="text-center">
          <div className="font-display text-sm font-bold tracking-[0.2em]">TRANSLATR™</div>
          <div className="text-[0.625rem] tracking-widest opacity-60">DEPT. OF LINGUISTIC REVENUE</div>
          <div className="my-2 border-y border-dashed border-black/30 py-1 text-[0.6875rem] font-bold tracking-wider">
            PREMIUM CHARACTER TAX RECEIPT
          </div>
        </div>

        <div className="space-y-0.5">
          {shown.lines.slice(0, MAX_LINES).map((l, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="truncate">
                {[...l.word].map((ch, j) => (
                  <span key={j} className={isVowel(ch) ? 'font-bold text-[#c2008f] underline decoration-dotted' : ''}>
                    {ch}
                  </span>
                ))}
              </span>
              <span className="shrink-0">
                ${l.base}{l.tax ? <span className="font-bold text-[#c2008f]"> +${l.tax}</span> : null}
              </span>
            </div>
          ))}
          {extra > 0 && (
            <div className="flex justify-between opacity-70">
              <span>…and {extra} more word{extra > 1 ? 's' : ''}</span>
              <span>${extraTotal}</span>
            </div>
          )}
        </div>

        <div className="mt-2 space-y-0.5 border-t border-dashed border-black/30 pt-2">
          <Row label={`Base (${PRICE_PER_WORD}/word)`} value={`$${shown.words * PRICE_PER_WORD}`} />
          <Row label="Vowel surcharge" value={`$${shown.taxTotal}`} strong />
          <Row label="Subtotal" value={`$${shown.subtotal}`} />
          {shown.discount > 0 && <Row label="Word Coupon" value={`−$${shown.discount}`} />}
          <div className="mt-1 flex justify-between border-t-2 border-black pt-1 text-sm font-bold">
            <span>{shown.refused ? 'REFUSAL FEE' : 'TOTAL CHARGED'}</span>
            <span>${shown.total}</span>
          </div>
          {shown.refused && <div className="text-center text-[0.6875rem] font-bold tracking-widest text-[#c2008f]">** TRANSLATION REFUSED · NON-REFUNDABLE **</div>}
        </div>

        <p className="mt-2 text-[0.625rem] leading-snug opacity-70">
          * Vowels (A, E, I, O, U) are Premium Characters™. Consonants remain free-to-play for now.
        </p>
        <div className="barcode mt-3" />
        <div className="mt-1 text-center text-[0.625rem] tracking-[0.3em] opacity-60">THANK YOU FOR YOUR COMPLIANCE</div>
      </div>
    </div>,
    document.body,
  )
}

function Row({ label, value, strong }) {
  return (
    <div className={`flex justify-between ${strong ? 'font-bold text-[#c2008f]' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
