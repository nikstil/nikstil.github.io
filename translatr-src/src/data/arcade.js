// The Arcade (on the LigmaPhone™): DOOMSCROLL.EXE and the classics, monetized. Prices and prizes are
// in clicks (see getArcadePrice in lib/economy.js): $10 each, ×5 per Prestige.

export const ARCADE_GAMES = [
  { id: 'shooter', icon: '👹', name: 'DOOMSCROLL.EXE', blurb: 'A 1993 shooter. Three episodes, a final boss, co-op. Every hit is an unskippable ad.', aspect: 16 / 10 },
  { id: 'mines', icon: '💣', name: 'Mine$weeper', blurb: 'Every mine is an upsell. Continuing costs extra.' },
  { id: 'solitaire', icon: '🃏', name: 'Pay-Per-Card Solitaire', blurb: 'Klondike, except every card you draw costs money. Undo is Premium.' },
  { id: 'snake', icon: '🐍', name: 'Wallet Snake', blurb: 'Insert coin. Eat money. The platform keeps 30%.' },
  { id: 'loggle', icon: '🟩', name: 'LOGGLE', blurb: 'The daily name puzzle. Twelve letters, six guesses, a new name every day.' },
  { id: 'grass', icon: '🌱', name: 'LAWN OF THE DEAD', blurb: 'Plant a garden, hold off the zombies. 50 levels of pixel-art lawn defence, from nikstil.com.', src: '/touchgrass/?embed', aspect: 960 / 672 },
  { id: 'strife', icon: '💣', name: 'COUNTER-STRIFE', blurb: '5v5 bomb defusal against bots or friends online, on six maps, in five modes, with ranks, skins and chat. From nikstil.com.', src: '/strife/?embed', aspect: 16 / 9 },
  { id: 'brains', icon: '🧠', name: 'BRAINS FIRST', blurb: 'The other side of the lawn: you’re the zombies. Puzzles, endless and mini-games, from nikstil.com.', src: '/touchphone/?embed', aspect: 960 / 672 },
]

// The LigmaPhone™'s own apps (the Arcade's games sit beside them on the home screen).
// Apps that leave TRANSLATR™ running are listed in PHONE_LIVE_APPS (store/useGameStore.js).
export const PHONE_APPS = [
  { id: 'doom', icon: '🔥', name: 'DoomFeed™', blurb: 'The endless feed. Now in your pocket, where it can reach you anywhere.' },
  { id: 'browser', icon: '🌐', name: 'Browser', blurb: 'The internet, or the parts of it that agree to load in a frame.' },
  { id: 'casino', icon: '🎰', name: 'SKINSINK.GG', blurb: 'The COUNTER-STRIFE skins casino: roulette, crash, coinflip, case battles and an upgrader. Credits in, regret out. From nikstil.com.', src: '/casino/?embed' },
  { id: 'kevin', icon: '👔', name: 'KEVIN-GOTCHI™', blurb: 'A pet intern. Coffee, snacks, praise, meetings. Get him to CEO before he quits. From nikstil.com.', src: '/kevin/?embed' },
  { id: 'stonks', icon: '📈', name: 'NASDANK', blurb: 'Buy shares in Kevin, Brenda, the CEO Dog and TheAlgorithm. Not financial advice. From nikstil.com.', src: '/stonks/?embed' },
]

/**
 * How many panels the LigmaPhone™ unfolds into for an app of this shape (width / height): portrait
 * apps fit the phone; wider ones open it like a Z Fold (two panels), wider still like a trifold.
 */
export const foldsFor = (aspect) => (!aspect || aspect <= 0.75 ? 1 : aspect <= 1.45 ? 2 : 3)

// The browser's start page.
export const BOOKMARKS = [
  { icon: '👹', name: 'DOOMSCROLL.EXE', url: '/doomscroll/' },
  { icon: '🌱', name: 'LAWN OF THE DEAD', url: '/touchgrass/' },
  { icon: '🧠', name: 'BRAINS FIRST', url: '/touchphone/' },
  { icon: '🟩', name: 'LOGGLE', url: '/loggle/' },
  { icon: '💣', name: 'COUNTER-STRIFE', url: '/strife/' },
  { icon: '🎰', name: 'SKINSINK.GG', url: '/casino/' },
  { icon: '👔', name: 'KEVIN-GOTCHI™', url: '/kevin/' },
  { icon: '📈', name: 'NASDANK', url: '/stonks/' },
  { icon: '🎞️', name: 'The GIF', url: '/gif/' },
  { icon: '📚', name: 'Wikipedia', url: 'https://en.m.wikipedia.org/wiki/Main_Page' },
  { icon: '🎲', name: 'Random article', url: 'https://en.m.wikipedia.org/wiki/Special:Random' },
  { icon: '🗺️', name: 'Maps', url: 'https://www.openstreetmap.org/export/embed.html?bbox=-0.25%2C51.45%2C0.05%2C51.56&layer=mapnik' },
  { icon: '📼', name: 'A very normal video', url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' },
  { icon: '🕹️', name: 'Old web search', url: 'https://wiby.me/' },
]

export const MINES = {
  cols: 9,
  rows: 9,
  mines: 10,
  prize: 150, // clearing the board
  revive: 40, // continuing after a mine (doubles every time)
  hint: 15, // revealing one safe square
}

export const SOLITAIRE = {
  prize: 500, // winning
  freeDraws: 3, // the free trial
  draw: 1, // the first paid draw…
  drawStep: 0.2, // …and how much more each one after it costs
  undo: 5,
}

export const SNAKE = {
  coin: 20, // one credit
  bill: 3, // each 💵 eaten
  gold: 15, // each gold coin (it doesn't stay long)
  fee: 0.3, // the platform's cut when you cash out
  continue: 25, // keep your pot after dying (doubles every time)
}

export const LOGGLE = {
  guesses: 6,
  prize: 150, // solving today's
  extraGuess: 30, // one more guess after the sixth (doubles every time)
}
