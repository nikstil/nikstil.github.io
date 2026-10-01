// Fake CAPTCHAs: every challenge is generated up front (so rendering is pure) and
// judged by checkCaptcha(). Some are solvable if you read carefully; some are not.

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const NEON = [
  { name: 'magenta', hex: '#ff2bd6', aliases: ['magenta', 'pink', 'fuchsia', 'hot pink', 'neon pink'] },
  { name: 'green', hex: '#39ff14', aliases: ['green', 'toxic green', 'lime', 'neon green'] },
  { name: 'gold', hex: '#ffcf3f', aliases: ['gold', 'yellow', 'golden', 'amber'] },
  { name: 'cyan', hex: '#3de8ff', aliases: ['cyan', 'blue', 'light blue', 'aqua', 'turquoise', 'teal'] },
  { name: 'red', hex: '#ff3b5c', aliases: ['red', 'crimson', 'scarlet'] },
  { name: 'purple', hex: '#9d5cff', aliases: ['purple', 'violet', 'lavender'] },
  { name: 'orange', hex: '#ff8a3d', aliases: ['orange'] },
  { name: 'white', hex: '#f4f4f5', aliases: ['white'] },
]

const SHAPES = ['circle', 'triangle', 'diamond', 'hexagon']

function makeDread() {
  // 9 tiles, 2–4 of which are literal squares. The squares are the ones "containing existential dread".
  const squareCount = 2 + Math.floor(Math.random() * 3)
  const kinds = shuffle([...Array(squareCount).fill('square'), ...Array.from({ length: 9 - squareCount }, () => pick(SHAPES))])
  return {
    variant: 'dread',
    prompt: 'Select all squares containing existential dread',
    hint: 'Click verify once there are none left.',
    tiles: kinds.map((shape) => ({ shape, color: pick(NEON).hex, rotate: Math.floor(Math.random() * 40) - 20 })),
    initial: [],
  }
}

function makeColor4() {
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
  const colors = digits.map(() => pick(NEON))
  const four = colors[digits.indexOf(4)]
  // The "4" in the prompt itself is painted a *different* color, to keep things honest.
  const decoy = pick(NEON.filter((c) => c.name !== four.name))
  return {
    variant: 'color4',
    prompt: 'Type the color of the number 4',
    decoyHex: decoy.hex,
    cells: digits.map((d, i) => ({ digit: d, hex: colors[i].hex, rotate: Math.floor(Math.random() * 50) - 25 })),
    answer: four,
    initial: '',
  }
}

const CREDIT_OPTIONS = [
  { emoji: '📉', label: 'A line going down' },
  { emoji: '💀', label: 'A skull' },
  { emoji: '🕳️', label: 'A hole' },
  { emoji: '🧾', label: 'An unpaid receipt' },
]

function makeCredit() {
  const options = shuffle(CREDIT_OPTIONS)
  return {
    variant: 'credit',
    prompt: 'Select the image that best represents your credit score',
    options,
    correct: Math.floor(Math.random() * options.length), // it's subjective
    initial: null,
  }
}

function makeTrust() {
  return {
    variant: 'trust',
    prompt: 'Drag the slider to how much you trust TRANSLATR™',
    initial: 50,
  }
}

const MAKERS = [makeDread, makeColor4, makeCredit, makeTrust]

export const makeCaptcha = () => pick(MAKERS)()

/** Returns { passed, reason } for a player's answer. */
export function checkCaptcha(c, answer) {
  switch (c.variant) {
    case 'dread': {
      const squares = c.tiles.map((t, i) => (t.shape === 'square' ? i : -1)).filter((i) => i >= 0)
      const picked = [...answer].sort((a, b) => a - b)
      const passed = picked.length === squares.length && picked.every((v, i) => v === squares[i])
      return { passed, reason: passed ? null : 'Wrong squares. The dread was in the SQUARES. It said so.' }
    }
    case 'color4': {
      const guess = String(answer).trim().toLowerCase()
      const passed = c.answer.aliases.includes(guess)
      return { passed, reason: passed ? null : `The 4 was obviously ${c.answer.name}. Are you colorblind or a robot?` }
    }
    case 'credit': {
      const passed = answer === c.correct
      const right = c.options[c.correct]
      return { passed, reason: passed ? null : `The correct answer was ${right.emoji} (${right.label.toLowerCase()}). Obviously.` }
    }
    case 'trust': {
      const passed = Number(answer) === 100
      return { passed, reason: passed ? null : `${answer}% trust detected. We only accept 100%.` }
    }
    default:
      return { passed: false, reason: 'Unknown challenge. You failed it anyway.' }
  }
}
