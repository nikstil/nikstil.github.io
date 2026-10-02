// The title screens of LAWN OF THE DEAD and BRAINS FIRST: a back yard drawn in the games' pixel
// art, alive (clouds drift, the sign sways, grass moves, a zombie hand comes up out of the dirt
// now and then). The menu buttons are HTML laid over the gravestone (see .title-buttons in
// style.css); STONE below says where the stone is, as fractions of the 960×620 screen.

import { INK, PIXEL_FONT, circle, rr, ellipse, poly, line, leaf, darken, lighten, drawZombie } from './art.js'
import { W, H, PIXEL, pixelRender } from './draw.js'

/** The gravestone's face, where the menu goes (x, y, w, h in 960×620 units). */
export const STONE = { x: 572, y: 150, w: 330, h: 380 }

const DAY = {
  sky: ['#4fa7e8', '#8fd0ff', '#d6f0ff'],
  hill: ['#7cc85a', '#5aa83c'],
  far: '#9fd68a',
  grass: '#4f9a2e',
  dirt: '#8a5a32',
  light: null,
}
const NIGHT = {
  sky: ['#141238', '#2e2a68', '#5a4e8e'],
  hill: ['#3f6a3a', '#2c4e2a'],
  far: '#4a6a5a',
  grass: '#2f5a26',
  dirt: '#5a3e26',
  light: '#ffd86b',
}

function sky(ctx, P, t, night) {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.7)
  g.addColorStop(0, P.sky[0])
  g.addColorStop(0.6, P.sky[1])
  g.addColorStop(1, P.sky[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  if (night) {
    // stars, twinkling, and a big moon
    for (let i = 0; i < 60; i++) {
      const x = (i * 157.3) % W
      const y = (i * 61.7) % (H * 0.45)
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i)
      ctx.fillStyle = '#fff'
      ctx.fillRect(x, y, 3, 3)
    }
    ctx.globalAlpha = 1
    circle(ctx, 470, 90, 46, '#fff6d6', '#d9caa0', 3)
    circle(ctx, 455, 80, 10, '#e9dfbf', null)
    circle(ctx, 485, 104, 7, '#e9dfbf', null)
  } else {
    circle(ctx, 500, 80, 34, '#ffe36b', '#f2b100', 3)
  }
  // drifting clouds
  for (let i = 0; i < 4; i++) {
    const x = ((i * 300 + t * (10 + i * 4)) % (W + 300)) - 200
    const y = 50 + i * 38
    ctx.globalAlpha = night ? 0.35 : 0.95
    for (const [dx, dy, r] of [[0, 0, 24], [28, -12, 30], [60, -2, 26], [86, 6, 18], [36, 8, 22]]) circle(ctx, x + dx, y + dy, r, '#ffffff', null)
    ctx.globalAlpha = 1
  }
}

function hills(ctx, P) {
  // the far hill with the house on it
  ctx.beginPath()
  ctx.moveTo(0, 430)
  ctx.quadraticCurveTo(260, 300, 560, 360)
  ctx.quadraticCurveTo(760, 400, W, 380)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.fillStyle = P.far
  ctx.fill()
  // a row of tiny trees on the horizon
  for (let i = 0; i < 9; i++) {
    const x = 520 + i * 48
    const y = 366 + Math.sin(i) * 6
    circle(ctx, x, y - 14, 16, darken(P.far, 0.25), null)
  }
}

function house(ctx, P, night) {
  ctx.save()
  ctx.translate(255, 300)
  // walls, roof, chimney, a garage
  rr(ctx, -70, -40, 140, 90, 4, '#efe3c4')
  rr(ctx, 70, 0, 70, 50, 3, '#e5d6b4')
  poly(ctx, [[-84, -38], [0, -98], [84, -38]], '#c4493a')
  poly(ctx, [[64, 2], [105, -26], [146, 2]], '#b8402f')
  rr(ctx, 30, -100, 18, 40, 2, '#a8553a')
  // windows (lit at night) and the door
  for (const [x, y] of [[-50, -20], [16, -20], [-50, 12]]) {
    rr(ctx, x, y, 28, 22, 2, night ? P.light : '#9fd3ff')
    ctx.fillStyle = INK
    ctx.fillRect(x + 13, y, 2, 22)
  }
  rr(ctx, 12, 8, 26, 42, 3, '#7a4a2a')
  rr(ctx, 82, 14, 46, 36, 2, '#c9c0a8')
  // a picket fence along the front
  for (let i = 0; i < 12; i++) rr(ctx, -110 + i * 22, 44, 10, 24, 2, '#f6f1e2')
  rr(ctx, -112, 52, 264, 6, 1, '#f6f1e2')
  ctx.restore()
  // the path down the hill
  ctx.beginPath()
  ctx.moveTo(270, 370)
  ctx.quadraticCurveTo(250, 470, 120, H)
  ctx.lineTo(260, H)
  ctx.quadraticCurveTo(300, 470, 300, 370)
  ctx.closePath()
  ctx.fillStyle = night ? '#6a6458' : '#d8c8a0'
  ctx.fill()
}

function lawn(ctx, P) {
  ctx.beginPath()
  ctx.moveTo(0, 480)
  ctx.quadraticCurveTo(400, 430, W, 470)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, 440, 0, H)
  g.addColorStop(0, P.hill[0])
  g.addColorStop(1, P.hill[1])
  ctx.fillStyle = g
  ctx.fill()
}

/** The big tree on the left, with the sign hanging off its branch. */
function tree(ctx, P, t, night, title) {
  // trunk and roots
  ctx.beginPath()
  ctx.moveTo(-40, H)
  ctx.quadraticCurveTo(40, 420, 10, 200)
  ctx.lineTo(90, 170)
  ctx.quadraticCurveTo(100, 420, 170, H)
  ctx.closePath()
  ctx.fillStyle = night ? '#4a3220' : '#7a4e2a'
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = INK
  ctx.stroke()
  for (let i = 0; i < 6; i++) line(ctx, [[40 + i * 8, 260 + i * 50], [52 + i * 9, 300 + i * 50]], darken(night ? '#4a3220' : '#7a4e2a', 0.3), 3)
  // the branch reaching over
  ctx.beginPath()
  ctx.moveTo(60, 190)
  ctx.quadraticCurveTo(260, 120, 470, 40)
  ctx.lineTo(474, 58)
  ctx.quadraticCurveTo(270, 150, 70, 220)
  ctx.closePath()
  ctx.fillStyle = night ? '#4a3220' : '#7a4e2a'
  ctx.fill()
  ctx.stroke()
  // leaves along the top
  const leafy = night ? '#2c5a2a' : '#4fa83a'
  for (let i = 0; i < 14; i++) {
    const x = -30 + i * 38
    const y = 40 - Math.sin(i * 0.7) * 20 + Math.sin(t * 1.3 + i) * 2
    circle(ctx, x, y, 46, i % 2 ? leafy : darken(leafy, 0.15), null)
  }
  for (let i = 0; i < 8; i++) leaf(ctx, 20 + i * 55, 70 + Math.sin(i) * 10, 26, 1.2 + Math.sin(t + i) * 0.1, leafy)

  // the sign, swinging a little from two ropes
  const swing = Math.sin(t * 1.4) * 0.025
  ctx.save()
  ctx.translate(250, 66)
  ctx.rotate(swing)
  for (const rx of [-170, 170]) line(ctx, [[rx * 0.8, -10], [rx, 46]], '#c9a86a', 4)
  // two planks for the name, one for the subtitle
  const plank = (y, w, h, k) => {
    rr(ctx, -w / 2, y, w, h, 6, k)
    for (let j = 1; j < 3; j++) line(ctx, [[-w / 2 + 10, y + (h / 3) * j], [w / 2 - 10, y + (h / 3) * j + (j % 2 ? 2 : -2)]], darken(k, 0.25), 2)
    for (const nx of [-w / 2 + 12, w / 2 - 12]) circle(ctx, nx, y + 12, 4, '#9aa3ad', INK, 2)
  }
  plank(40, 440, 132, '#b07a46')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = PIXEL_FONT(48)
  ctx.lineWidth = 9
  ctx.strokeStyle = INK
  title.forEach((ln, i) => {
    ctx.fillStyle = i ? '#f6eccb' : '#9cf06a'
    ctx.strokeText(ln, 0, 78 + i * 54)
    ctx.fillText(ln, 0, 78 + i * 54)
  })
  ctx.restore()
}

/** The gravestone the menu is carved into, with flowers, a shovel and a hand in the dirt. */
function grave(ctx, P, t, night) {
  const { x, y, w, h } = STONE
  // the mound
  ellipse(ctx, x + w / 2, y + h + 30, w * 0.75, 50, P.dirt)
  for (let i = 0; i < 9; i++) circle(ctx, x - 40 + i * 50, y + h + 30 + Math.sin(i * 2) * 10, 6, darken(P.dirt, 0.2), null)
  // the stone: a body with a rounded top, shaded, cracked, mossy
  const stone = night ? '#7a7e8c' : '#9a9ea8'
  ctx.beginPath()
  ctx.moveTo(x - 20, y + h + 20)
  ctx.lineTo(x - 20, y + 30)
  ctx.quadraticCurveTo(x - 20, y - 90, x + w / 2, y - 92)
  ctx.quadraticCurveTo(x + w + 20, y - 90, x + w + 20, y + 30)
  ctx.lineTo(x + w + 20, y + h + 20)
  ctx.closePath()
  const g = ctx.createLinearGradient(x, 0, x + w, 0)
  g.addColorStop(0, lighten(stone, 0.15))
  g.addColorStop(0.7, stone)
  g.addColorStop(1, darken(stone, 0.3))
  ctx.fillStyle = g
  ctx.fill()
  ctx.lineWidth = 5
  ctx.strokeStyle = INK
  ctx.stroke()
  // a carved border and an engraved name plate
  ctx.strokeStyle = darken(stone, 0.35)
  ctx.lineWidth = 3
  ctx.strokeRect(x - 6, y - 8, w + 12, h + 22)
  line(ctx, [[x + 40, y - 60], [x + 70, y - 30], [x + 62, y + 4]], darken(stone, 0.45), 3)
  line(ctx, [[x + w - 30, y + h - 40], [x + w - 6, y + h - 10]], darken(stone, 0.45), 3)
  for (let i = 0; i < 7; i++) circle(ctx, x + w + 4 - (i % 3) * 10, y + 40 + i * 14, 7, night ? '#3f6a3a' : '#5aa83c', null)
  ctx.font = PIXEL_FONT(16)
  ctx.textAlign = 'center'
  ctx.fillStyle = darken(stone, 0.45)
  ctx.fillText('R.I.P.', x + w / 2, y - 40)
  // flowers in clay pots at the foot
  for (const [fx, k] of [[x + w - 70, 0], [x + w - 10, 1], [x + 20, 2]]) {
    rr(ctx, fx - 18, y + h + 6, 36, 30, 4, '#c46a3a')
    for (let j = 0; j < 3; j++) {
      const sway = Math.sin(t * 2 + k + j) * 3
      line(ctx, [[fx - 8 + j * 8, y + h + 8], [fx - 10 + j * 10 + sway, y + h - 22]], '#3f8a2a', 3)
      circle(ctx, fx - 10 + j * 10 + sway, y + h - 26, 8, ['#ffe36b', '#ff8fb0', '#fff'][(k + j) % 3], INK, 2)
    }
  }
  // a shovel stuck in the dirt
  ctx.save()
  ctx.translate(x - 50, y + h + 10)
  ctx.rotate(-0.25)
  rr(ctx, -4, -90, 8, 80, 2, '#8a6a3a')
  rr(ctx, -12, -98, 24, 10, 3, '#8a6a3a')
  poly(ctx, [[-14, -10], [14, -10], [10, 22], [-10, 22]], '#c9ced6')
  ctx.restore()
  // now and then a zombie hand claws up out of the mound
  const cycle = (t % 9) / 9
  if (cycle > 0.55) {
    const up = Math.min(1, (cycle - 0.55) * 8) * Math.min(1, (1 - cycle) * 10)
    ctx.save()
    ctx.beginPath()
    ctx.rect(x + 120, y + h - 80, 120, 110)
    ctx.clip()
    ctx.translate(x + 180, y + h + 30 - up * 60)
    ctx.rotate(Math.sin(t * 6) * 0.15)
    rr(ctx, -9, 0, 18, 60, 6, '#7a5a3a')
    rr(ctx, -12, -18, 24, 22, 8, '#9fb88a')
    for (let f = 0; f < 4; f++) rr(ctx, -11 + f * 6, -32 + Math.abs(f - 1.5) * 3, 5, 18, 2, '#9fb88a')
    ctx.restore()
  }
}

function foreground(ctx, P, t) {
  // grass tufts swaying along the bottom
  for (let i = 0; i < 40; i++) {
    const x = i * 25 + ((i * 7) % 11)
    const sway = Math.sin(t * 2 + i * 0.6) * 4
    for (let j = -1; j <= 1; j++) line(ctx, [[x + j * 5, H], [x + j * 7 + sway, H - 26 - ((i + j) % 3) * 8]], j ? P.grass : darken(P.grass, 0.15), 4)
  }
}

/** A zombie shuffling across the far hill (BRAINS FIRST: a few of them). */
function walker(ctx, t, night) {
  const n = night ? 3 : 1
  for (let i = 0; i < n; i++) {
    const k = ((t * 0.02 + i * 0.33) % 1)
    ctx.save()
    ctx.translate(560 + k * 300, 368 + Math.sin(k * 3) * 6)
    ctx.scale(0.28, 0.28)
    drawZombie(ctx, ['scroller', 'beanie', 'vr'][i], { id: i, x: 0, row: 0, hp: 190, maxHp: 190, speed: 0.4, state: 'walk', helmet: { hp: 1, max: 1 } }, t)
    ctx.restore()
  }
}

/** Draws the whole title screen as pixel art. o: { night, title: [line, line] } */
export function drawTitleScene(target, t, o) {
  const P = o.night ? NIGHT : DAY
  pixelRender(
    target,
    W,
    H,
    PIXEL,
    (ctx) => {
      sky(ctx, P, t, o.night)
      hills(ctx, P)
      house(ctx, P, o.night)
      walker(ctx, t, o.night)
      lawn(ctx, P)
      grave(ctx, P, t, o.night)
      tree(ctx, P, t, o.night, o.title)
      foreground(ctx, P, t)
    },
    'title',
  )
}
