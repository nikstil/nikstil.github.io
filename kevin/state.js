// Kevin-gotchi: a pet intern. His energy, food and morale run down in real time (even while the
// page is closed); coffee, snacks and praise put them back; work and meetings get him promoted.
// Let morale hit zero, or leave him hungry too long, and he quits. Shared with BloatOS (which texts
// you when he needs something) and NASDANK (KEVN trades on his mood).

const KEY = 'kevin-gotchi'
const NUDGE = 'kevin-gotchi-nudged'
export const TITLES = [
  ['Intern', 0],
  ['Junior Associate', 120],
  ['Associate', 350],
  ['Senior Associate', 700],
  ['Team Lead', 1200],
  ['Manager', 2000],
  ['Regional Manager', 3200],
  ['VP of Synergy', 5000],
  ['CEO', 8000],
]
const HOUR = 3600000
const clamp = (v) => Math.max(0, Math.min(100, v))

function fresh(gen = 1) {
  const now = Date.now()
  return { gen, name: gen === 1 ? 'Kevin' : `Kevin ${['', '', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][gen] ?? gen}`, hired: now, updated: now, energy: 80, fed: 75, morale: 85, xp: 0, title: 'Intern', coffees: [], praisedAt: 0, sleepUntil: 0, starvingSince: 0, quit: null, ceo: false, log: [] }
}
export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if (s && typeof s.energy === 'number') return s
  } catch {}
  return null
}
export function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {}
}
export function hire(gen = 1) {
  const s = fresh(gen)
  log(s, `${s.name} started today. He seems keen.`)
  save(s)
  return s
}
function log(s, text) {
  s.log = [{ at: Date.now(), text }, ...(s.log ?? [])].slice(0, 12)
}
export const titleIndex = (xp) => TITLES.filter(([, at]) => xp >= at).length - 1
export const asleep = (s, now = Date.now()) => s.sleepUntil > now

/** Brings the stats up to now (ten minutes at a time). Returns the same object. */
export function advance(s, now = Date.now()) {
  if (!s || s.quit) return s
  let t = s.updated
  const end = Math.min(now, t + 7 * 24 * HOUR)
  const step = 10 * 60000
  while (t + step <= end) {
    const h = step / HOUR
    const sleeping = s.sleepUntil > t
    s.energy = clamp(s.energy + (sleeping ? 40 : -5) * h)
    s.fed = clamp(s.fed - 6 * h)
    s.morale = clamp(s.morale - (1.5 + (s.energy < 25 ? 1.5 : 0) + (s.fed < 25 ? 1.5 : 0)) * h)
    if (s.fed <= 0) s.starvingSince ||= t
    else s.starvingSince = 0
    t += step
    if (s.morale <= 0) return quit(s, 'I’ve accepted an offer at a competitor. They have a ping-pong table and they say “good job” sometimes.', t)
    if (s.starvingSince && t - s.starvingSince > 24 * HOUR) return quit(s, 'I’m going to lunch. Forever. Please don’t contact me.', t)
  }
  s.updated = t
  return s
}
function quit(s, letter, at) {
  s.quit = { at, letter }
  s.updated = at
  log(s, `${s.name} quit.`)
  return s
}

/** Things you can do. Returns what happened (a line for the log), or why not. */
export const ACTIONS = {
  coffee: { icon: '☕', label: 'Coffee' },
  snack: { icon: '🍕', label: 'Snack' },
  praise: { icon: '👏', label: 'Praise' },
  work: { icon: '📊', label: 'Give work' },
  meeting: { icon: '📅', label: 'Meeting' },
  nap: { icon: '💤', label: 'Nap' },
}
export function act(s, what, now = Date.now()) {
  advance(s, now)
  if (s.quit) return { error: 'He doesn’t work here any more.' }
  if (asleep(s, now) && what !== 'wake') return { error: 'Shh. He’s napping.' }
  let text = ''
  const before = titleIndex(s.xp)
  switch (what) {
    case 'coffee': {
      s.coffees = (s.coffees ?? []).filter((t) => now - t < 2 * HOUR)
      s.coffees.push(now)
      s.energy = clamp(s.energy + 30)
      s.fed = clamp(s.fed - 2)
      if (s.coffees.length > 3) {
        s.morale = clamp(s.morale - 12)
        text = 'Coffee number ' + s.coffees.length + '. He can hear colours now.'
      } else text = 'Coffee. He’s vibrating with potential.'
      break
    }
    case 'snack':
      s.fed = clamp(s.fed + 35)
      s.energy = clamp(s.energy + 5)
      text = ['A slice of pizza from the meeting room.', 'A granola bar of uncertain age.', 'Leftover birthday cake (not his birthday).'][Math.floor(Math.random() * 3)]
      break
    case 'praise':
      if (now - (s.praisedAt ?? 0) < 10 * 60000) {
        s.morale = clamp(s.morale + 4)
        text = '“Great job!” again. He can tell you don’t mean it.'
      } else {
        s.morale = clamp(s.morale + 18)
        text = '“Great job, Kevin!” He’ll remember this forever.'
      }
      s.praisedAt = now
      break
    case 'work':
      if (s.energy < 15) return { error: 'Too tired to work. Try coffee.' }
      s.xp += Math.round(20 * (0.5 + s.energy / 100) * (0.5 + s.morale / 100))
      s.energy = clamp(s.energy - 12)
      s.morale = clamp(s.morale - 6)
      s.fed = clamp(s.fed - 5)
      text = ['He made a spreadsheet. It has a pivot table.', 'He replied to 40 emails. One was to the CEO dog.', 'He “circled back”.', 'He synergised a deliverable.'][Math.floor(Math.random() * 4)]
      break
    case 'meeting':
      s.xp += 6
      s.morale = clamp(s.morale - 12)
      s.energy = clamp(s.energy - 8)
      text = 'A one-hour meeting. It could have been an email.'
      break
    case 'nap':
      if (s.energy > 85) return { error: 'He’s not tired. He says.' }
      s.sleepUntil = now + HOUR
      text = 'Nap time under the desk. Back in an hour.'
      break
    case 'wake':
      s.sleepUntil = 0
      s.morale = clamp(s.morale - 10)
      text = 'You woke him up. He’s grumpy about it.'
      break
    default:
      return { error: '?' }
  }
  const after = titleIndex(s.xp)
  if (after > before) {
    s.title = TITLES[after][0]
    text += ` 🎉 Promoted to ${s.title}!`
    s.morale = clamp(s.morale + 20)
    if (s.title === 'CEO') s.ceo = true
  }
  log(s, text)
  s.updated = now
  save(s)
  return { text, promoted: after > before ? TITLES[after][0] : null }
}

/** His face, from how he's doing. */
export function mood(s, now = Date.now()) {
  if (!s) return { face: '🫥', say: '' }
  if (s.quit) return { face: '🫥', say: 'Kevin has left the building.' }
  if (asleep(s, now)) return { face: '😴', say: 'zzz… synergy… zzz' }
  if ((s.coffees ?? []).filter((t) => now - t < 2 * HOUR).length > 3) return { face: '😵‍💫', say: 'i can SEE the spreadsheets' }
  if (s.fed < 25) return { face: '🤤', say: 'is there any pizza left from the meeting' }
  if (s.energy < 25) return { face: '🥱', say: 'can i have coffee 🥺' }
  if (s.morale < 25) return { face: '😢', say: 'do you think i’m doing a good job' }
  if (s.morale > 70 && s.energy > 50 && s.fed > 50) return { face: '😄', say: ['let’s circle back!', 'synergy!!', 'i love it here', 'per my last email 😊'][Math.floor(now / 60000) % 4] }
  return { face: '🙂', say: ['is it friday yet', 'just checking in', 'quick question'][Math.floor(now / 60000) % 3] }
}
/** Something he'd text you about (once in a while), or null. */
export function needsYou(s, now = Date.now()) {
  if (!s || s.quit || asleep(s, now)) return null
  let last = 0
  try {
    last = Number(localStorage.getItem(NUDGE)) || 0
  } catch {}
  if (now - last < 30 * 60000) return null
  const m = s.fed < 25 ? 'is there any food. i haven’t eaten since the meeting 🍕' : s.energy < 25 ? 'can i have coffee 🥺' : s.morale < 25 ? 'do you think i’m doing a good job?' : null
  if (!m) return null
  try {
    localStorage.setItem(NUDGE, String(now))
  } catch {}
  return m
}
