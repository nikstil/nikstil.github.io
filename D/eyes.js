// How open each eye is, from what the face tracker gives: the gap between the lids and its own blink
// score. Each is judged against what's usual for this face over the last while (so narrow, wide,
// hooded or tired eyes all read as open), and then the two eyes are compared: one shutting while the
// other doesn't is a wink, both together is a blink, and a turned head or a noisy picture is neither.

const WINDOW = 20000 // ms of history that sets what's usual
const KEEP_EVERY = 50 // ms between the samples kept for it
const OPEN_AT = 0.6 // the usual lid gap: this far up the gaps seen (a blink, a wink, a wide-eyed moment are all brief beside 20 s)
const BLINK_AT = 0.4 // the usual blink score: this far up the scores seen
const SETTLING = 3000 // ms: until there's this much to go on, it's slower to call an eye shut
const BLINK_LOW = 0.2, BLINK_SURE = 0.34 // a blink score under the first is an open eye whatever the lids seem to say,
const LIDS_ALONE = 0.45 // so the lids alone only count this much; over the second, they count in full
const OTHER_EYE = 0.9 // an eye's usual gap is at least this much of what the other eye's says it should be,
const OTHER_BLINK = 0.06 // and its usual blink score at most this much over, so a long wink stays a wink
const GAP_SHUT = 0.55 // a lid gap this much smaller than usual is shut
const BLINK_SHUT = 0.35 // a blink score this much higher than usual is shut
const GAP_WEIGHT = 0.6 // how much the gap counts towards "shut" (the blink score is the rest)
const WINK = 0.6 // an eye shutting more than the other gets this much of the difference extra, the other this much less
const SHUT_LO = 0.25 // the drawn eye starts to close at this much shut
const SHUT_SPAN = 0.35 // and is closed this much later
const NOISE_LO = 5 // ...or later if the picture is noisy: never within this many jitters (frame to frame, in fractions of usual)
const CLOSE_BELOW = 0.12 // a drawn eye snaps shut below this,
const REOPEN_ABOVE = 0.3 // and stays shut until it's this open again
const TURN_FULL = 0.26, TURN_NONE = 0.64 // head turned (sine of the angle): winks count fully below the first, not at all past the second

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t) }

function quantile(xs, q) {
  const s = Float64Array.from(xs).sort()
  const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.min(lo + 1, s.length - 1)
  return s[lo] + (s[hi] - s[lo]) * (i - lo)
}


export class EyeState {
  constructor() {
    this.eyes = [0, 1].map(() => ({ hist: [], recent: [], shut: false }))
    this.pairs = [] // the two eyes side by side over the whole window: how they usually differ
    this.lastKept = -Infinity
    this.debug = null
  }

  /**
   * t: ms. eyes: the person's right then left eye, each { r: lid gap over eye width, b: blink score 0–1 }.
   * turn: how far the head is turned (sine of the angle); above 0, their right side is nearer the camera.
   * Returns how open to draw each eye, 0–1.
   */
  update(t, eyes, turn = 0) {
    const keep = t - this.lastKept >= KEEP_EVERY
    if (keep) this.lastKept = t
    if (keep) this.pairs.push({ t, ratio: eyes[1].r / Math.max(eyes[0].r, 1e-6), diff: eyes[1].b - eyes[0].b })
    while (this.pairs.length && t - this.pairs[0].t > WINDOW) this.pairs.shift()
    for (let j = 0; j < 2; j++) {
      const e = this.eyes[j], m = eyes[j]
      if (keep) e.hist.push({ t, r: m.r, b: m.b })
      while (e.hist.length && t - e.hist[0].t > WINDOW) e.hist.shift()
      e.recent.push({ t, r: m.r })
      while (e.recent.length && t - e.recent[0].t > 1500) e.recent.shift()
    }
    // what's usual for each eye
    const usualGap = this.eyes.map((e, j) => (e.hist.length ? quantile(e.hist.map((s) => s.r), OPEN_AT) : eyes[j].r))
    const usualBlink = this.eyes.map((e, j) => (e.hist.length ? quantile(e.hist.map((s) => s.b), BLINK_AT) : eyes[j].b))
    // A wink held for a while would become that eye's usual. The other eye, still open, says otherwise:
    // over the whole window (a wink is only a part of it) the two eyes keep the same proportions, so
    // neither eye's usual can stray far from what the other's and those proportions make it.
    // (each eye takes its side of them at its most open, so even a long wink doesn't change them)
    const q = (key, at) => (this.pairs.length ? quantile(this.pairs.map((p) => p[key]), at) : key === 'ratio' ? 1 : 0)
    const fromOther = [usualGap[1] / q('ratio', 0.3), usualGap[0] * q('ratio', 0.7)]
    const blinkFromOther = [usualBlink[1] - q('diff', 0.7), usualBlink[0] + q('diff', 0.3)]
    const gap0 = usualGap.map((g, j) => Math.max(g, OTHER_EYE * fromOther[j], 1e-6))
    const blink0 = usualBlink.map((b, j) => Math.min(b, blinkFromOther[j] + OTHER_BLINK))
    // how much the gap jitters at the moment, frame to frame (so an eye really closing isn't jitter),
    // in fractions of usual: a noisy picture needs more to count
    const jitter = this.eyes.map((e, j) => {
      if (e.recent.length < 4) return 0
      const steps = e.recent.slice(1).map((s, k) => Math.abs(s.r - e.recent[k].r) / gap0[j])
      return quantile(steps, 0.5) / 0.954 // the median step of white noise is 0.954 of its spread
    })
    // how shut each eye looks, 0 as usual, 1 and up shut
    const span = this.eyes[0].hist.length ? t - this.eyes[0].hist[0].t : 0
    const settled = 0.4 + 0.6 * clamp(span / SETTLING)
    let shut = eyes.map((m, j) => {
      const byGap = Math.max(0, 1 - m.r / gap0[j]) / GAP_SHUT
      const byBlink = Math.max(0, m.b - blink0[j]) / BLINK_SHUT
      const sure = LIDS_ALONE + (1 - LIDS_ALONE) * smoothstep(BLINK_LOW, BLINK_SURE, m.b)
      return clamp(GAP_WEIGHT * byGap + (1 - GAP_WEIGHT) * byBlink, 0, 1.5) * settled * sure
    })
    // with the head turned, the far eye is seen side-on and its numbers wander: lean on the near one
    const frontal = clamp((TURN_NONE - Math.abs(turn)) / (TURN_NONE - TURN_FULL))
    const near = turn > 0 ? 0 : 1, far = 1 - near
    shut[far] = shut[near] + (shut[far] - shut[near]) * frontal
    // a wink: the eye that's shutting more shuts further, the other opens back up
    shut = shut.map((v, j) => v + WINK * frontal * (v - shut[1 - j]))
    const out = shut.map((v, j) => {
      const lo = Math.max(SHUT_LO, NOISE_LO * jitter[j])
      let open = 1 - smoothstep(lo, lo + SHUT_SPAN, v)
      const e = this.eyes[j]
      if (e.shut) {
        if (open > REOPEN_ABOVE) e.shut = false
        else open = 0
      } else if (open < CLOSE_BELOW) {
        e.shut = true
        open = 0
      }
      return open
    })
    this.debug = { usualGap: gap0, usualBlink: blink0, jitter, shut, frontal }
    return out
  }
}

/** The "one euro" filter: steady when still, quick when it moves (Casiez, Roussel & Vogel, 2012). */
export class OneEuro {
  constructor(minCutoff = 1, beta = 0, dCutoff = 1) {
    this.minCutoff = minCutoff
    this.beta = beta
    this.dCutoff = dCutoff
    this.x = null
    this.dx = 0
  }
  filter(x, dt) {
    if (this.x === null || !(dt > 0)) { this.x = this.x === null ? x : this.x; return this.x }
    const a = (cutoff) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt))
    this.dx += ((x - this.x) / dt - this.dx) * a(this.dCutoff)
    this.x += (x - this.x) * a(this.minCutoff + this.beta * Math.abs(this.dx))
    return this.x
  }
}
