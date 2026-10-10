// The other "players": they bet, flip, battle, win big now and then, and chat. None of them are
// real (it would be a lot less lonely if they were).

const PEOPLE = [
  ['Kevin (Sales)', '📈'], ['Brenda (HR)', '🗂️'], ['xX_Intern_Xx', '☕'], ['TheAlgorithm', '🤖'], ['Motivational Eagle', '🦅'],
  ['Captain Captcha', '🧩'], ['Lil Spreadsheet', '📊'], ['The CEO Dog', '🐕'], ['rush_b_rachel', '💨'], ['eco_round_eric', '🪙'],
  ['NovaNovaNova', '🔫'], ['awp_or_nothing', '🎯'], ['Patient Snail', '🐌'], ['s1mple_simon', '🧠'], ['glock_and_roll', '🎸'],
  ['silver_forever', '🥈'], ['DefuseKitDan', '🧰'], ['MarketMaker9000', '💹'], ['QuarterlyQuinn', '📅'], ['flashbang_fran', '💡'],
  ['knife_or_die', '🔪'], ['HeadshotHelen', '🎯'], ['ctrl_alt_defeat', '⌨️'], ['NotABot_Trust', '🙂'],
]
export const people = PEOPLE.map(([name, face]) => ({ name, face, bot: true }))
export const anyone = () => people[Math.floor(Math.random() * people.length)]
/** Someone who isn't one of these. */
export function someoneElse(not = []) {
  const pool = people.filter((p) => !not.includes(p))
  return pool[Math.floor(Math.random() * pool.length)] ?? people[0]
}
/** A bet a bot might make: mostly small, sometimes silly. */
export function botAmount() {
  const r = Math.random()
  const v = r < 0.6 ? 0.5 + Math.random() * 9.5 : r < 0.92 ? 10 + Math.random() * 90 : 100 + Math.random() * 900
  return Math.round(v * (v < 10 ? 10 : 1)) / (v < 10 ? 10 : 1)
}

const LINES = [
  'rigged', 'T T T T', 'CT is due', 'need 2 credits pls', 'just lost my knife lol', 'synergy', 'bomb incoming i can feel it',
  'gg', 'why is crash always 1.00 when i bet', 'all in. again.', 'its a marathon not a sprint', 'who wants to coinflip',
  'case battle me cowards', 'i was up 400 an hour ago', 'my rakeback is my salary now', 'this is fine', 'trust the process',
  'one more', 'cashed out at 1.01 like a coward and it went to 40x', 'upgrader hates me specifically', 'any1 wanna trade',
  'gl everyone', 'the house always wins (not today)', 'is this financial advice', 'nice', 'sold my car for this',
]
export const chatLine = () => LINES[Math.floor(Math.random() * LINES.length)]
