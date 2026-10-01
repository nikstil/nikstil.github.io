// Custom cursors as inline SVG (native cursors: zero lag, unlike a DOM element chasing the mouse).
// Every theme has its own set of three:
//   arrow — the pointer (always eyeing your wallet)
//   hand  — anything clickable: some kind of target locked onto a dollar sign
//   lock  — disabled buttons: probably a Premium feature
// Aero: glass arrow + glossy coin orb · Y2K: chrome thorns · Skeuomorphism: engraved brass and a
// magnifying glass · Minimalist: stark black · Retro: pixels and the hourglass of eternal waiting

const svg = (body) => `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>${body}</svg>`
const cursor = (body, x, y, fallback) => `url("data:image/svg+xml,${encodeURIComponent(svg(body))}") ${x} ${y}, ${fallback}`

const CHROME_ARROW =
  "<defs><linearGradient id='c' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fff'/><stop offset='.4' stop-color='#c9ced8'/><stop offset='.52' stop-color='#4b515c'/><stop offset='.64' stop-color='#e6e9ef'/><stop offset='1' stop-color='#7d8491'/></linearGradient></defs>" +
  "<path d='M9.9 8.1 13.6 6l-1.5 3.9zM14.8 12.3l3.7-2-1.6 3.9z' fill='#0b0c10'/>" +
  "<path d='M3 2v22.5l5.6-5.2 4.1 9.4 4.2-1.8-4.1-9.2h7.6z' fill='url(#c)' stroke='#0b0c10' stroke-width='1.6' stroke-linejoin='round'/>" +
  "<circle cx='6.3' cy='10' r='1.7' fill='#ff2bd6' stroke='#0b0c10' stroke-width='.6'/>"

const CHROME_TARGET =
  "<circle cx='16' cy='16' r='8.5' fill='none' stroke='#0b0c10' stroke-width='4'/>" +
  "<circle cx='16' cy='16' r='8.5' fill='none' stroke='#ff2bd6' stroke-width='1.8'/>" +
  "<path d='M16 1.5v7M16 23.5v7M1.5 16h7M23.5 16h7' stroke='#0b0c10' stroke-width='4' stroke-linecap='round'/>" +
  "<path d='M16 2.5V8M16 24v5.5M2.5 16H8M24 16h5.5' stroke='#b6ff1a' stroke-width='1.8' stroke-linecap='round'/>" +
  "<text x='16' y='19.8' text-anchor='middle' font-family='Arial Black,Arial,sans-serif' font-weight='900' font-size='11' fill='#b6ff1a' stroke='#0b0c10' stroke-width='.8' paint-order='stroke'>$</text>"

const PADLOCK =
  "<rect x='17' y='20' width='12' height='10' rx='2' fill='#ffd24a' stroke='#0b0c10' stroke-width='1.4'/>" +
  "<path d='M19.5 20v-2.5a3.5 3.5 0 0 1 7 0V20' fill='none' stroke='#0b0c10' stroke-width='1.8'/>" +
  "<circle cx='23' cy='24.6' r='1.3' fill='#0b0c10'/>"

const PIXEL_ARROW = "<path d='M1 1v24l6-6 4.5 9 3-1.5-4.5-9h8.5z' fill='#fff' stroke='#000' stroke-width='1.5' shape-rendering='crispEdges'/>"
const PIXEL_TARGET =
  "<g shape-rendering='crispEdges'><path d='M14 2h4v9h-4zM14 21h4v9h-4zM2 14h9v4H2zM21 14h9v4h-9z' fill='#000'/>" +
  "<path d='M15 3h2v7h-2zM15 22h2v7h-2zM3 15h7v2H3zM22 15h7v2h-7z' fill='#ffd800'/>" +
  "<rect x='13' y='13' width='6' height='6' fill='#000'/><rect x='14' y='14' width='4' height='4' fill='#ff3030'/></g>"
const PIXEL_HOURGLASS =
  "<g shape-rendering='crispEdges'><path d='M8 3h16v3h-2v4l-4 4v4l4 4v4h2v3H8v-3h2v-4l4-4v-4l-4-4V6H8z' fill='#fff' stroke='#000' stroke-width='1.5'/>" +
  "<path d='M12 7h8v2l-4 4-4-4zM12 25l4-4 4 4z' fill='#c9a24a'/></g>"

const AERO_ARROW =
  "<defs><radialGradient id='o' cx='.4' cy='.3' r='.7'><stop offset='0' stop-color='#e8f7ff'/><stop offset='.45' stop-color='#3ea7e8'/><stop offset='1' stop-color='#0b4f99'/></radialGradient></defs>" +
  "<path d='M3 2v22l5.5-5 4 9 3.6-1.6-4-8.9h7.4z' fill='none' stroke='#6fc6ff' stroke-width='4' stroke-linejoin='round' opacity='.45'/>" +
  "<path d='M3 2v22l5.5-5 4 9 3.6-1.6-4-8.9h7.4z' fill='#fff' stroke='#10243a' stroke-width='1.4' stroke-linejoin='round'/>" +
  "<circle cx='22.5' cy='24.5' r='6' fill='url(#o)' stroke='#06305f' stroke-width='1'/>" +
  "<ellipse cx='21.6' cy='22.2' rx='3.4' ry='1.8' fill='#fff' opacity='.75'/>" +
  "<text x='22.5' y='27.6' text-anchor='middle' font-family='Segoe UI,Arial,sans-serif' font-weight='700' font-size='7.5' fill='#fff'>$</text>"
const AERO_TARGET =
  "<defs><linearGradient id='r' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#bfe9ff'/><stop offset='1' stop-color='#1a73c4'/></linearGradient></defs>" +
  "<circle cx='16' cy='16' r='10.5' fill='rgba(160,215,255,.25)' stroke='#06305f' stroke-width='4'/>" +
  "<circle cx='16' cy='16' r='10.5' fill='none' stroke='url(#r)' stroke-width='2.4'/>" +
  "<path d='M16 1.5v5M16 25.5v5M1.5 16h5M25.5 16h5' stroke='#06305f' stroke-width='3.2' stroke-linecap='round'/>" +
  "<path d='M16 2.2v4M16 26v3.8M2.2 16h4M26 16h3.8' stroke='#bfe9ff' stroke-width='1.4' stroke-linecap='round'/>" +
  "<text x='16' y='20' text-anchor='middle' font-family='Segoe UI,Arial,sans-serif' font-weight='800' font-size='11' fill='#ffd24a' stroke='#6a4300' stroke-width='.7' paint-order='stroke'>$</text>"
// Windows 7's "working in background" donut, forever spinning (in spirit)
const AERO_BUSY =
  "<defs><linearGradient id='d' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#e8f7ff'/><stop offset='.5' stop-color='#3ea7e8'/><stop offset='1' stop-color='#0b4f99'/></linearGradient></defs>" +
  "<circle cx='16' cy='16' r='10' fill='none' stroke='#06305f' stroke-width='6.5'/>" +
  "<circle cx='16' cy='16' r='10' fill='none' stroke='url(#d)' stroke-width='4.2' stroke-dasharray='44 19' transform='rotate(-40 16 16)'/>" +
  "<circle cx='16' cy='16' r='3.2' fill='#ffd24a' stroke='#6a4300' stroke-width='.8'/>"

const BRASS_ARROW =
  "<defs><linearGradient id='b' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fff4c8'/><stop offset='.35' stop-color='#e5bd5a'/><stop offset='.7' stop-color='#b38423'/><stop offset='1' stop-color='#6e4f10'/></linearGradient></defs>" +
  "<path d='M5 4v22l5.5-5 4 9 3.6-1.6-4-8.9h7.4z' fill='#2b1a0c' opacity='.35'/>" +
  "<path d='M3 2v22l5.5-5 4 9 3.6-1.6-4-8.9h7.4z' fill='url(#b)' stroke='#3e2615' stroke-width='1.4' stroke-linejoin='round'/>" +
  "<path d='M4.6 5.5V20l3.6-3.3' fill='none' stroke='#fffbe8' stroke-width='.9' stroke-linecap='round' opacity='.8'/>"
// A brass magnifying glass, inspecting your wallet
const BRASS_LOUPE =
  "<defs><radialGradient id='g' cx='.35' cy='.3' r='.8'><stop offset='0' stop-color='#fff' stop-opacity='.9'/><stop offset='1' stop-color='#bcd6e6' stop-opacity='.55'/></radialGradient>" +
  "<linearGradient id='h' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#f6e2a4'/><stop offset='1' stop-color='#8a6014'/></linearGradient></defs>" +
  "<path d='M19 19l9 9' stroke='#2b1a0c' stroke-width='6' stroke-linecap='round'/>" +
  "<path d='M19 19l9 9' stroke='#6b3a1a' stroke-width='4' stroke-linecap='round'/>" +
  "<circle cx='12' cy='12' r='9.5' fill='url(#g)' stroke='#3e2615' stroke-width='4.2'/>" +
  "<circle cx='12' cy='12' r='9.5' fill='none' stroke='url(#h)' stroke-width='2.4'/>" +
  "<text x='12' y='16' text-anchor='middle' font-family='Georgia,serif' font-weight='700' font-size='11' fill='#3e2615'>$</text>"
const BRASS_PADLOCK =
  "<path d='M20 20v-2.8a4 4 0 0 1 8 0V20' fill='none' stroke='#3e2615' stroke-width='3.2'/>" +
  "<path d='M20 20v-2.8a4 4 0 0 1 8 0V20' fill='none' stroke='#c9a24a' stroke-width='1.6'/>" +
  "<rect x='17.5' y='19.5' width='13' height='11' rx='2' fill='url(#b)' stroke='#3e2615' stroke-width='1.3'/>" +
  "<path d='M24 23.2v3.6' stroke='#3e2615' stroke-width='1.8' stroke-linecap='round'/><circle cx='24' cy='23.2' r='1.4' fill='#3e2615'/>"

const STARK_ARROW = "<path d='M3 2v22l5.5-5 4 9 3.6-1.6-4-8.9h7.4z' fill='#000' stroke='#fff' stroke-width='1.5' stroke-linejoin='round'/>"
const STARK_TARGET =
  "<circle cx='16' cy='16' r='9' fill='none' stroke='#fff' stroke-width='3'/><circle cx='16' cy='16' r='9' fill='none' stroke='#000' stroke-width='1.2'/>" +
  "<circle cx='16' cy='16' r='2.2' fill='#000' stroke='#fff'/>"

export const CURSORS = {
  aero: {
    arrow: cursor(AERO_ARROW, 3, 2, 'auto'),
    hand: cursor(AERO_TARGET, 16, 16, 'pointer'),
    lock: cursor(AERO_BUSY, 16, 16, 'wait'),
  },
  brass: {
    arrow: cursor(BRASS_ARROW, 3, 2, 'auto'),
    hand: cursor(BRASS_LOUPE, 12, 12, 'pointer'),
    lock: cursor(BRASS_ARROW + BRASS_PADLOCK, 3, 2, 'not-allowed'),
  },
  chrome: {
    arrow: cursor(CHROME_ARROW, 3, 2, 'auto'),
    hand: cursor(CHROME_TARGET, 16, 16, 'pointer'),
    lock: cursor(CHROME_ARROW + PADLOCK, 3, 2, 'not-allowed'),
  },
  pixel: {
    arrow: cursor(PIXEL_ARROW, 1, 1, 'auto'),
    hand: cursor(PIXEL_TARGET, 16, 16, 'pointer'),
    lock: cursor(PIXEL_HOURGLASS, 16, 16, 'wait'),
  },
  stark: {
    arrow: cursor(STARK_ARROW, 3, 2, 'auto'),
    hand: cursor(STARK_TARGET, 16, 16, 'pointer'),
    lock: cursor(STARK_ARROW + "<rect x='18' y='20' width='10' height='8' fill='#000' stroke='#fff'/>", 3, 2, 'not-allowed'),
  },
}
