// DO_NOT_OPEN.txt: a trail of clues across BloatOS that ends in a secret theme.
//   1. DO_NOT_OPEN.txt (on the desktop; it says something different every day) → look in the bin
//   2. do_not_restore.txt in the Recycle Bin (ROT13) → ask the Command Prompt who you are, /secret
//   3. WHOAMI /SECRET → something runs in the Task Manager at :X3 past every hour
//   4. end ghost.exe → it whispers a word for SKINSINK.GG
//   5. the word as a promo code in SKINSINK.GG → the Haunted theme
// Each step only works once the one before is done.

const KEY = 'nikstilos-arg'
export const FINAL_CODE = 'HAUNTED'
export function step() {
  try {
    return Number(localStorage.getItem(KEY)) || 0
  } catch {
    return 0
  }
}
/** Moves on to step n (never back). Returns true if that was new. */
export function reach(n) {
  if (step() >= n) return false
  try {
    localStorage.setItem(KEY, String(n))
  } catch {}
  return true
}
export const hauntedUnlocked = () => step() >= 5

// what the file says today (one of these, by the day)
const DAILY = [
  'I can hear you clicking.',
  'You left a window open last night. I closed it for you.',
  'The icons moved while you were away. Did you notice?',
  'Kevin says hi. Kevin doesn’t know I exist.',
  'Your Recycle Bin is heavier than it looks.',
  'I counted your tabs. You should close some.',
  'The CEO dog barked at me today. Good dog.',
  'Somebody else was on this desktop an hour ago. Not you.',
  'I like it when you change the theme. It tickles.',
  'There is a file you have never opened. It’s me. You opened it.',
  'The taskbar clock is three seconds slow. I did that.',
  'Don’t look behind the Start menu.',
  'The plant is watching. It’s on my side.',
  'Every day I write something new here. Every day you read it.',
]
const dayNumber = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000)
export function dailyLine(d = new Date()) {
  return DAILY[dayNumber(d) % DAILY.length]
}
/** The text of DO_NOT_OPEN.txt (opening it counts as step 1). */
export function fileText() {
  const s = step()
  const today = dailyLine()
  if (s >= 5) return `${today}\n\nYou found me. I’ll be here. Every day.\n\n— the ghost in the machine`
  return `${today}\n\n\nYou weren’t supposed to open this.\n\nSince you did: some things are thrown away so they can be found.\nLook where the rubbish goes.`
}
export const BIN_NAME = 'do_not_restore.txt'
// ROT13 of: "Ask the Command Prompt who you are. Add /secret."
export const BIN_TEXT = 'Nfx gur Pbzznaq Cebzcg jub lbh ner. Nqq /frperg.\n\n(Every letter here is thirteen letters away from where it should be.)'
export const rot13 = (s) => s.replace(/[a-z]/gi, (c) => String.fromCharCode(((c.toLowerCase().charCodeAt(0) - 97 + 13) % 26) + (c <= 'Z' ? 65 : 97)))
/** ghost.exe shows in the Task Manager one minute in ten (at :03, :13, :23…), once you're that far. */
export const ghostAwake = (d = new Date()) => step() >= 3 && d.getMinutes() % 10 === 3
