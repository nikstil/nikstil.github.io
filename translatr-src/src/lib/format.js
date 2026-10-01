const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 })
// Past trillions, idle-game suffixes: quadrillion, quintillion, sextillion…
const BIG = ['Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']

export function fmt(n) {
  if (!Number.isFinite(n)) return '∞'
  const a = Math.abs(n)
  if (a >= 1e15) {
    let tier = Math.floor(Math.log10(a) / 3) - 5 // 1e15 → Qa, 1e18 → Qi, …
    let v = a / 10 ** (15 + 3 * tier)
    if (v >= 999.995) {
      tier += 1 // 999.999Qa is 1Qi
      v /= 1000
    }
    if (tier >= BIG.length) return n.toExponential(2)
    return `${n < 0 ? '-' : ''}${Number(v.toFixed(2))}${BIG[tier]}`
  }
  if (a >= 1e6) return compact.format(n)
  return Math.floor(n).toLocaleString()
}

export const money = (n) => `$${fmt(n)}`

/** Every digit, for when the size of the number is the joke ($1,000,000,000,000,000,000). */
export const moneyLong = (n) => `$${Math.floor(n).toLocaleString('en')}`
