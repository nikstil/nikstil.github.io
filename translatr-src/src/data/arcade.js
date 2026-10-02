// The Arcade (Start menu): DOOMSCROLL.EXE and three classics, monetized. Prices and prizes are
// in clicks (see getArcadePrice in lib/economy.js): $10 each, ×5 per Prestige.

export const ARCADE_GAMES = [
  { id: 'shooter', icon: '👹', name: 'DOOMSCROLL.EXE', blurb: 'A 1993 shooter. Three episodes, a final boss, co-op. Every hit is an unskippable ad.' },
  { id: 'mines', icon: '💣', name: 'Mine$weeper', blurb: 'Every mine is an upsell. Continuing costs extra.' },
  { id: 'solitaire', icon: '🃏', name: 'Pay-Per-Card Solitaire', blurb: 'Klondike, except every card you draw costs money. Undo is Premium.' },
  { id: 'snake', icon: '🐍', name: 'Wallet Snake', blurb: 'Insert coin. Eat money. The platform keeps 30%.' },
  { id: 'loggle', icon: '🟩', name: 'LOGGLE', blurb: 'The daily name puzzle. Twelve letters, six guesses, a new name every day.' },
  { id: 'grass', icon: '🌱', name: 'LAWN OF THE DEAD', blurb: 'Plant a garden, hold off the zombies. 50 levels of pixel-art lawn defence, from nikstil.com.' },
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
