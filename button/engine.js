// THE BUTTON: the rules. A run moves from step to step on two inputs, a click ('a') and a hold ('b'),
// plus running out of time on a timed step. Kept free of the page so it can be played headless.

import { STEPS, ENDINGS, START_MINUTES, MAX_STRIKES } from './story.js'

const val = (v, s) => (typeof v === 'function' ? v(s) : v)

/** A fresh run. `memory`: you've looped before, so you know the code and which track is real. */
export function newRun(memory = false) {
  const s = { at: null, t: START_MINUTES, fails: 0, f: {}, say: '', steps: 0, place: '', under: false, end: null, why: null }
  if (memory) Object.assign(s.f, { memory: true, codeA: true, codeB: true, quiet: true })
  arrive(s, 'sirens')
  return s
}

function arrive(s, id) {
  const step = STEPS[id]
  s.at = id
  s.place = step.place
  s.under = !!step.under
  step.enter?.(s)
}

function finish(s, id, why = null) {
  s.end = id
  s.why = why
}

function apply(s, o) {
  o.set?.(s)
  s.t -= val(o.cost, s) ?? 0
  s.say = val(o.say, s) ?? ''
  s.steps++
  const to = val(o.to, s)
  if (to.startsWith('end:')) return finish(s, to.slice(4))
  if (s.t <= 0) return finish(s, 'white', 'clock')
  arrive(s, to)
}

/** Click ('a') or hold ('b'). */
export function choose(s, which) {
  if (s.end) return
  apply(s, STEPS[s.at][which])
}

/** The timer on this step ran out: a strike, and whatever hesitating leads to (three strikes and it's over). */
export function timeOut(s) {
  if (s.end) return
  s.fails++
  if (s.fails >= MAX_STRIKES) return finish(s, 'white', 'frozen')
  apply(s, STEPS[s.at].timeout)
}

/** What the page shows for the current step (or ending). */
export function view(s) {
  if (s.end) {
    const e = ENDINGS[s.end]
    return { ending: s.end, n: e.n, title: e.title, kind: e.kind, scene: e.scene, text: e.text(s, s.why) }
  }
  const step = STEPS[s.at]
  return {
    id: s.at,
    scene: step.scene,
    text: step.text(s),
    say: s.say,
    a: val(step.a.label, s),
    b: val(step.b.label, s),
    timer: val(step.timer, s) ?? 0,
  }
}
