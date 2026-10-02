// TOUCHGRASS.EXE: the art. Every plant and Scroller is drawn with canvas paths in a soft-shaded
// cartoon style. Nothing is an image file.
//
// Plants are drawn standing on (0, 0), the middle of the bottom of their tile, about 80 units
// tall; Scrollers stand on (0, 0) facing left, about 120 units tall. The caller scales.

export const INK = '#2a2620'
/** The pixel font (Press Start 2P, loaded by the page), at a size. */
export const PIXEL_FONT = (px) => `${px}px 'Press Start 2P', monospace`
const TAU = Math.PI * 2

// ================= Little helpers =================
// The look: soft cartoon shading (a light top-left, a darker bottom-right) and outlines in a
// dark shade of each colour rather than flat black.
function rgb(hex) {
  if (typeof hex !== 'string' || hex[0] !== '#') return null
  let h = hex.slice(1)
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function mix(hex, to, k) {
  const c = rgb(hex)
  if (!c) return hex
  const t = to === 'white' ? [255, 255, 255] : [20, 16, 12]
  return `rgb(${c.map((v, i) => Math.round(v + (t[i] - v) * k)).join(',')})`
}
export const darken = (hex, k = 0.45) => mix(hex, 'black', k)
export const lighten = (hex, k = 0.35) => mix(hex, 'white', k)
function path(ctx, fill, stroke = INK, width = 3, box = null) {
  if (fill) {
    if (box && rgb(fill)) {
      const [x, y, w, h] = box
      const g = ctx.createRadialGradient(x + w * 0.35, y + h * 0.28, Math.min(w, h) * 0.05, x + w * 0.45, y + h * 0.45, Math.max(w, h) * 0.75)
      g.addColorStop(0, lighten(fill, 0.38))
      g.addColorStop(0.55, fill)
      g.addColorStop(1, darken(fill, 0.22))
      ctx.fillStyle = g
    } else ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.lineWidth = width * 0.72
    ctx.lineJoin = 'round'
    ctx.strokeStyle = stroke === INK && rgb(fill) ? darken(fill, 0.62) : stroke
    ctx.stroke()
  }
}
export function circle(ctx, x, y, r, fill, stroke = INK, width = 3) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  path(ctx, fill, stroke, width, r > 3 ? [x - r, y - r, 2 * r, 2 * r] : null)
}
function ellipse(ctx, x, y, rx, ry, fill, stroke = INK, width = 3, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU)
  path(ctx, fill, stroke, width, rx > 3 ? [x - rx, y - ry, 2 * rx, 2 * ry] : null)
}
export function rr(ctx, x, y, w, h, r, fill, stroke = INK, width = 3) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  path(ctx, fill, stroke, width, w > 6 && h > 6 ? [x, y, w, h] : null)
}
function poly(ctx, pts, fill, stroke = INK, width = 3) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]
  path(ctx, fill, stroke, width, box[2] > 6 && box[3] > 6 ? box : null)
}
function line(ctx, pts, stroke = INK, width = 3) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = width
  ctx.strokeStyle = stroke
  ctx.stroke()
}
function leaf(ctx, x, y, len, ang, fill = '#5fbf4a') {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(len * 0.5, -len * 0.38, len, 0)
  ctx.quadraticCurveTo(len * 0.5, len * 0.38, 0, 0)
  path(ctx, fill)
  line(ctx, [
    [len * 0.1, 0],
    [len * 0.8, 0],
  ], 'rgba(0,0,0,.25)', 2)
  ctx.restore()
}
/**
 * Plants don't have faces (they're plants). Kept so every plant's art can still say where a face
 * would go; sleeping mushrooms get their "z"s from the caller.
 */
function face() {}
// The old cartoon face, unused.
// eslint-disable-next-line no-unused-vars
function oldFace(ctx, x, y, s = 1, mood = 'happy', look = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  if (mood === 'sleep') {
    line(ctx, [
      [-9, 0],
      [-4, 2],
      [-1, 0],
    ], INK, 2.4)
    line(ctx, [
      [3, 0],
      [7, 2],
      [11, 0],
    ], INK, 2.4)
  } else {
    // big cartoon eyes: white, with a pupil and a shine
    for (const ex of [-6.5, 6.5]) {
      ctx.beginPath()
      ctx.ellipse(ex + look * 0.5, -1, 4.6, 5.6, 0, 0, TAU)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.lineWidth = 1.4
      ctx.strokeStyle = 'rgba(40,30,20,.55)'
      ctx.stroke()
      circle(ctx, ex + look + 1.2, 0, 2.6, '#1c1a16', null)
      circle(ctx, ex + look + 1.9, -1.1, 0.9, '#fff', null)
    }
    if (mood === 'angry') {
      line(ctx, [
        [-11, -7],
        [-3, -4],
      ], INK, 2.6)
      line(ctx, [
        [11, -7],
        [3, -4],
      ], INK, 2.6)
    }
    if (mood === 'scared' || mood === 'sad') {
      line(ctx, [
        [-11, -4],
        [-3, -7],
      ], INK, 2.2)
      line(ctx, [
        [11, -4],
        [3, -7],
      ], INK, 2.2)
    }
  }
  if (mood === 'happy' || mood === 'focus') {
    ctx.beginPath()
    ctx.arc(look, 4, 4, 0.15 * Math.PI, 0.85 * Math.PI)
    path(ctx, null, INK, 2.2)
    if (mood === 'happy') {
      circle(ctx, -11 + look, 4, 2.6, 'rgba(255,120,140,.45)', null)
      circle(ctx, 11 + look, 4, 2.6, 'rgba(255,120,140,.45)', null)
    }
  } else if (mood === 'angry') {
    line(ctx, [
      [-4 + look, 7],
      [4 + look, 7],
    ], INK, 2.4)
  } else if (mood === 'scared' || mood === 'sad') {
    ctx.beginPath()
    ctx.arc(look, 9, 3.5, 1.15 * Math.PI, 1.85 * Math.PI)
    path(ctx, null, INK, 2.2)
  }
  ctx.restore()
}
function zzz(ctx, x, y, t) {
  ctx.save()
  ctx.font = PIXEL_FONT(16)
  ctx.fillStyle = '#bcd7ff'
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.6 + i / 3) % 1
    ctx.globalAlpha = 1 - k
    ctx.strokeText('z', x + k * 14, y - k * 26)
    ctx.fillText('z', x + k * 14, y - k * 26)
  }
  ctx.restore()
}
function mound(ctx, w = 30) {
  ellipse(ctx, 0, -3, w, 7, '#6b4a2e', INK, 2.5)
}
function stem(ctx, x0, y0, x1, y1, w = 5, color = '#3f9a3a') {
  line(ctx, [
    [x0, y0],
    [(x0 + x1) / 2 + 3, (y0 + y1) / 2],
    [x1, y1],
  ], INK, w + 3)
  line(ctx, [
    [x0, y0],
    [(x0 + x1) / 2 + 3, (y0 + y1) / 2],
    [x1, y1],
  ], color, w)
}

// A pea pod: an upright pod with a round spout on the right. Used by the Spitter family.
function pod(ctx, { x = 0, y = -46, color = '#79c84f', dark = '#4c9a34', spout = 1, recoil = 0, flip = false, frost = false, scale = 1 } = {}) {
  ctx.save()
  ctx.translate(x - recoil * 4, y)
  ctx.scale(flip ? -scale : scale, scale)
  // the pod
  ctx.beginPath()
  ctx.moveTo(-16, 20)
  ctx.bezierCurveTo(-24, 0, -18, -26, 2, -30)
  ctx.bezierCurveTo(20, -32, 22, -6, 14, 20)
  ctx.closePath()
  path(ctx, color)
  // seam with peas inside
  line(ctx, [
    [-6, -24],
    [-2, 0],
    [-4, 18],
  ], dark, 2.4)
  for (const py of [-14, -2, 10]) circle(ctx, -9, py, 4, dark, null)
  // spouts
  const sp = [
    [16, -14],
    [16, -2],
    [16, 10],
    [16, -26],
  ].slice(0, spout)
  for (const [sx, sy] of sp) {
    rr(ctx, sx - 2, sy - 7, 16 + recoil * 3, 14, 6, color)
    ellipse(ctx, sx + 14 + recoil * 3, sy, 4, 6.5, '#22301e', INK, 2)
  }
  face(ctx, 2, -12, 0.9, 'happy')
  if (frost) {
    for (const [fx, fy] of [
      [-12, -20],
      [8, -26],
      [-14, 4],
    ]) {
      line(ctx, [
        [fx - 4, fy],
        [fx + 4, fy],
      ], '#fff', 2)
      line(ctx, [
        [fx, fy - 4],
        [fx, fy + 4],
      ], '#fff', 2)
    }
  }
  ctx.restore()
}
function podPlant(ctx, opts, t) {
  stem(ctx, 0, -2, -2, -26, 6)
  leaf(ctx, -2, -8, 22, Math.PI * 0.95, '#5fbf4a')
  leaf(ctx, 0, -10, 22, -0.1, '#5fbf4a')
  const bob = Math.sin(t * 2.4) * 1.5
  pod(ctx, { ...opts, y: -50 + bob })
}

function daisy(ctx, x, y, t, { petal = '#fff', center = '#f8c62c', glow = 0, s = 1, coin = false } = {}) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  if (glow > 0) {
    ctx.globalAlpha = glow * 0.6
    circle(ctx, 0, 0, 36, '#fff6b0', null)
    ctx.globalAlpha = 1
  }
  ctx.rotate(Math.sin(t * 0.8) * 0.12)
  for (let i = 0; i < 12; i++) {
    ctx.save()
    ctx.rotate((i / 12) * TAU)
    ellipse(ctx, 0, -20, 6, 13, petal, INK, 2.2)
    ctx.restore()
  }
  circle(ctx, 0, 0, 15, center)
  if (coin) {
    ctx.font = PIXEL_FONT(16)
    ctx.fillStyle = '#8a5a00'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('$', 0, 1)
  } else face(ctx, 0, -1, 0.8, 'happy')
  ctx.restore()
}

function mushroom(ctx, { capColor, capDark, stemColor = '#f2ead6', w = 26, h = 18, stemH = 18, y = 0, mood = 'happy', spots = true, t = 0, squash = 0 } = {}) {
  const sy = y - stemH
  rr(ctx, -w * 0.38, sy, w * 0.76, stemH, 6, stemColor)
  face(ctx, 0, sy + stemH * 0.55, 0.75, mood)
  ctx.beginPath()
  ctx.ellipse(0, sy + 2, w * (1 + squash * 0.1), h * (1 - squash * 0.15), 0, Math.PI, 0)
  ctx.closePath()
  path(ctx, capColor)
  if (spots) {
    circle(ctx, -w * 0.45, sy - h * 0.35, w * 0.13, capDark, null)
    circle(ctx, w * 0.25, sy - h * 0.6, w * 0.16, capDark, null)
    circle(ctx, w * 0.6, sy - h * 0.15, w * 0.1, capDark, null)
  }
}

// ================= Plants =================
/**
 * Draws a plant. p: the plant (or null for an icon), t: game time.
 * p.shotAt drives recoil/attack poses; p.asleep shows it sleeping.
 */
export function drawPlant(ctx, type, p, t) {
  const since = p ? t - (p.shotAt ?? -9) : 9
  const recoil = since < 0.18 ? 1 - since / 0.18 : 0
  const asleep = p?.asleep
  const hurt = p && p.maxHp && p.hp < p.maxHp
  const f = PLANT_ART[type]
  if (!f) return
  ctx.save()
  if (p?.imitated && ctx.filter !== undefined) ctx.filter = 'grayscale(1) contrast(1.1)'
  f(ctx, p, t, { since, recoil, asleep, hurt, mood: asleep ? 'sleep' : 'happy' })
  ctx.restore()
  if (asleep) zzz(ctx, 10, -60, t)
}

const PLANT_ART = {
  pea: (ctx, p, t, a) => podPlant(ctx, { spout: 1, recoil: a.recoil }, t),
  frost: (ctx, p, t, a) => podPlant(ctx, { spout: 1, recoil: a.recoil, color: '#9fd8f2', dark: '#5aa6cf', frost: true }, t),
  double: (ctx, p, t, a) => podPlant(ctx, { spout: 2, recoil: a.recoil, color: '#6fbf40', dark: '#3f8a2a' }, t),
  quad: (ctx, p, t, a) => {
    podPlant(ctx, { spout: 4, recoil: a.recoil, color: '#5aae36', dark: '#2f7a22' }, t)
    rr(ctx, -12, -84, 24, 8, 3, '#2f7a22')
  },
  back: (ctx, p, t, a) => {
    stem(ctx, 0, -2, 0, -26, 6)
    leaf(ctx, 0, -8, 22, Math.PI * 0.95)
    leaf(ctx, 0, -10, 22, -0.1)
    const bob = Math.sin(t * 2.4) * 1.5
    pod(ctx, { y: -50 + bob, spout: 1, recoil: a.recoil, color: '#8fd05c' })
    // back spouts
    ctx.save()
    ctx.translate(0, -50 + bob)
    for (const sy of [-14, -2]) {
      rr(ctx, -30, sy - 7, 16, 14, 6, '#8fd05c')
      ellipse(ctx, -30, sy, 4, 6.5, INK, INK, 2)
    }
    ctx.restore()
  },
  triple: (ctx, p, t, a) => {
    stem(ctx, 0, -2, 0, -24, 6)
    leaf(ctx, 0, -8, 22, Math.PI * 0.95)
    leaf(ctx, 0, -10, 22, -0.1)
    const bob = Math.sin(t * 2.4) * 1.5
    pod(ctx, { x: -6, y: -66 + bob, spout: 1, recoil: a.recoil, scale: 0.6 })
    pod(ctx, { x: -6, y: -34 + bob, spout: 1, recoil: a.recoil, scale: 0.6 })
    pod(ctx, { x: 6, y: -50 + bob, spout: 1, recoil: a.recoil, scale: 0.68 })
  },
  sun: (ctx, p, t) => {
    stem(ctx, 0, -2, 0, -36, 6)
    leaf(ctx, 0, -10, 24, Math.PI * 0.9)
    leaf(ctx, 0, -14, 24, -0.15)
    const glow = p?.glowAt != null && t - p.glowAt < 1 ? 1 - (t - p.glowAt) : 0
    daisy(ctx, 0, -52, t, { glow })
  },
  twin: (ctx, p, t) => {
    stem(ctx, -10, -2, -14, -38, 5)
    stem(ctx, 8, -2, 14, -40, 5)
    leaf(ctx, 0, -10, 24, Math.PI * 0.9)
    leaf(ctx, 0, -12, 24, -0.15)
    const glow = p?.glowAt != null && t - p.glowAt < 1 ? 1 - (t - p.glowAt) : 0
    daisy(ctx, -15, -52, t, { glow, s: 0.78 })
    daisy(ctx, 15, -56, t + 0.5, { glow, s: 0.78 })
  },
  gold: (ctx, p, t) => {
    stem(ctx, 0, -2, 0, -32, 5)
    leaf(ctx, 0, -10, 22, Math.PI * 0.9, '#7cc24a')
    leaf(ctx, 0, -12, 22, -0.15, '#7cc24a')
    const glow = p?.glowAt != null && t - p.glowAt < 1 ? 1 - (t - p.glowAt) : 0
    daisy(ctx, 0, -48, t, { petal: '#f7b928', center: '#ffe36b', glow, coin: true, s: 0.9 })
  },
  pom: (ctx, p, t) => {
    const fuse = p ? Math.max(0, 1 - p.timer / p.def.fuse) : 0
    const s = 1 + fuse * 0.35 + (fuse > 0 ? Math.sin(t * 40) * fuse * 0.05 : 0)
    ctx.save()
    ctx.translate(0, -30)
    ctx.scale(s, s)
    circle(ctx, 0, 0, 26, fuse > 0.5 && Math.floor(t * 12) % 2 ? '#ff4d4d' : '#c42c4a')
    // crown on top
    poly(ctx, [
      [-9, -22],
      [-6, -33],
      [-2, -24],
      [2, -33],
      [6, -24],
      [9, -33],
      [11, -21],
    ], '#a3203b')
    // the grenade pin
    ctx.beginPath()
    ctx.arc(16, -26, 7, 0, TAU)
    path(ctx, null, '#c9c9c9', 3)
    ctx.beginPath()
    ctx.arc(16, -26, 7, 0, TAU)
    path(ctx, null, INK, 1)
    circle(ctx, -10, -8, 5, 'rgba(255,255,255,.35)', null)
    face(ctx, 0, 2, 1, fuse > 0 ? 'angry' : 'happy')
    ctx.restore()
  },
  coco: (ctx, p) => coconut(ctx, p, 1),
  cocotower: (ctx, p) => coconut(ctx, p, 1.9),
  mine: (ctx, p, t) => {
    if (p && !p.armed) {
      mound(ctx, 22)
      leaf(ctx, -2, -6, 16, -Math.PI * 0.62, '#5fbf4a')
      leaf(ctx, 2, -6, 16, -Math.PI * 0.4, '#5fbf4a')
      return
    }
    mound(ctx, 26)
    ellipse(ctx, 0, -14, 22, 16, '#f2e6f3')
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(0, -14, 22, 16, 0, Math.PI, 0)
    ctx.clip()
    ellipse(ctx, 0, -22, 26, 14, '#9c4dbd', null)
    ctx.restore()
    ellipse(ctx, 0, -14, 22, 16, null)
    leaf(ctx, -2, -28, 14, -Math.PI * 0.62)
    leaf(ctx, 2, -28, 14, -Math.PI * 0.4)
    line(ctx, [
      [8, -26],
      [14, -40],
    ], INK, 2)
    circle(ctx, 14, -42, 3.5, Math.floor(t * 3) % 2 ? '#ff3030' : '#7a1010', INK, 1.5)
    face(ctx, 0, -12, 0.8, 'happy')
  },
  gulp: (ctx, p, t, a) => {
    const chewing = p?.chewing
    const biting = p?.biting
    stem(ctx, 0, -2, 0, -14, 7)
    leaf(ctx, 0, -6, 24, Math.PI * 0.92, '#4ea83c')
    leaf(ctx, 0, -6, 24, -0.08, '#4ea83c')
    const bulge = chewing ? 1.18 + Math.sin(t * 6) * 0.04 : 1
    ctx.save()
    ctx.translate(0, -14)
    ctx.scale(bulge, 1)
    ctx.beginPath()
    ctx.moveTo(-14, 0)
    ctx.bezierCurveTo(-26, -20, -20, -56, -14, -62)
    ctx.lineTo(16, -62)
    ctx.bezierCurveTo(22, -50, 24, -20, 12, 0)
    ctx.closePath()
    path(ctx, '#7fbf3f')
    for (const sy of [-16, -32, -48]) line(ctx, [
      [-12, sy],
      [12, sy - 2],
    ], '#b5324a', 3)
    ellipse(ctx, 1, -62, 16, 5, '#5a1020')
    face(ctx, 1, -36, 0.85, chewing ? 'happy' : 'focus')
    ctx.restore()
    // the lid
    ctx.save()
    ctx.translate(-14, -76)
    ctx.rotate(biting ? 0.9 : chewing ? 0.05 : -0.5 + Math.sin(t * 2) * 0.05)
    ellipse(ctx, 16, -2, 18, 6, '#b5324a')
    ctx.restore()
  },
  puff: (ctx, p, t, a) => puffball(ctx, p, t, a, 0.85),
  seapuff: (ctx, p, t, a) => {
    ellipse(ctx, 0, -4, 26, 6, 'rgba(255,255,255,.35)', '#3a8bb0', 2)
    puffball(ctx, p, t, a, 0.8)
  },
  glow: (ctx, p, t, a) => {
    const grown = p && p.def.grow && t - p.born >= p.def.grow
    const s = grown ? 1 : 0.7
    ctx.save()
    ctx.scale(s, s)
    ctx.globalAlpha = 0.35 + Math.sin(t * 2) * 0.1
    circle(ctx, 0, -32, 30, '#7cf7e0', null)
    ctx.globalAlpha = 1
    mushroom(ctx, { capColor: '#3fe0c5', capDark: '#a9fff0', w: 24, h: 20, stemH: 22, mood: a.mood })
    ctx.restore()
  },
  stink: (ctx, p, t, a) => {
    mushroom(ctx, { capColor: '#7a8a3c', capDark: '#4f5c22', w: 28, h: 22, stemH: 26, mood: a.asleep ? 'sleep' : 'focus', squash: a.recoil })
    if (!a.asleep)
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.8 + i / 3) % 1
        ctx.globalAlpha = 0.6 * (1 - k)
        line(ctx, [
          [-16 + i * 14, -52 - k * 16],
          [-12 + i * 14, -58 - k * 16],
          [-16 + i * 14, -64 - k * 16],
        ], '#8ea83c', 2.5)
        ctx.globalAlpha = 1
      }
  },
  gloom: (ctx, p, t, a) => {
    for (let i = 0; i < 8; i++) {
      ctx.save()
      ctx.translate(0, -30)
      ctx.rotate((i / 8) * TAU + t * 0.4)
      poly(ctx, [
        [-5, -24],
        [0, -38],
        [5, -24],
      ], '#4a2a5e', INK, 2)
      ctx.restore()
    }
    mushroom(ctx, { capColor: '#5b3576', capDark: '#2c1840', w: 30, h: 24, stemH: 24, mood: a.asleep ? 'sleep' : 'angry', squash: a.recoil, stemColor: '#d8cde6' })
  },
  gobbler: (ctx, p, t) => {
    const chew = Math.sin(t * 10) * 3
    ellipse(ctx, 0, -18, 26, 20 + chew * 0.3, '#6d9d3a')
    for (const [bx, by] of [
      [-14, -30],
      [10, -34],
      [18, -20],
      [-20, -14],
    ]) circle(ctx, bx, by, 5, '#86b84a', INK, 2)
    ellipse(ctx, 6, -12, 12, 6 + Math.abs(chew), '#3a1a12')
    face(ctx, -2, -26, 0.8, 'happy')
  },
  swirl: (ctx, p, t, a) => {
    rr(ctx, -9, -26, 18, 26, 6, '#f2ead6')
    face(ctx, 0, -12, 0.75, a.mood)
    ctx.beginPath()
    ctx.ellipse(0, -24, 28, 22, 0, Math.PI, 0)
    ctx.closePath()
    path(ctx, '#ff5fa2')
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(0, -24, 28, 22, 0, Math.PI, 0)
    ctx.closePath()
    ctx.clip()
    ctx.translate(0, -34)
    ctx.rotate(t * 2)
    const cols = ['#ffd84a', '#6ee7ff', '#a26bff', '#ff5fa2']
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, 40, (i / 4) * TAU, ((i + 0.5) / 4) * TAU)
      ctx.closePath()
      ctx.fillStyle = cols[i]
      ctx.fill()
    }
    ctx.restore()
    ctx.beginPath()
    ctx.ellipse(0, -24, 28, 22, 0, Math.PI, 0)
    ctx.closePath()
    path(ctx, null)
  },
  shy: (ctx, p, t, a) => {
    const hide = p?.hiding ? 1 : 0
    ctx.save()
    ctx.translate(0, hide * 22)
    ctx.scale(1, 1 - hide * 0.35)
    mushroom(ctx, { capColor: '#c79bd8', capDark: '#9c6bb3', w: 18, h: 14, stemH: 40, mood: hide ? 'scared' : a.mood, squash: a.recoil })
    ctx.restore()
    mound(ctx, 18)
  },
  frostcap: (ctx, p, t, a) => {
    const fuse = p && p.def.fuse ? Math.max(0, 1 - p.timer / p.def.fuse) : 0
    ctx.save()
    ctx.scale(1 + fuse * 0.2, 1 + fuse * 0.2)
    mushroom(ctx, { capColor: '#9fe6ff', capDark: '#e8fbff', w: 28, h: 22, stemH: 22, mood: a.mood })
    for (const ix of [-20, -8, 6, 18]) poly(ctx, [
      [ix - 4, -24],
      [ix + 4, -24],
      [ix, -14],
    ], '#e8fbff', INK, 2)
    ctx.restore()
  },
  cloud: (ctx, p, t, a) => {
    const fuse = p && p.def.fuse ? Math.max(0, 1 - p.timer / p.def.fuse) : 0
    ctx.save()
    ctx.scale(1 + fuse * 0.3 + (fuse ? Math.sin(t * 30) * 0.03 : 0), 1 + fuse * 0.3)
    mushroom(ctx, { capColor: '#4a4e5a', capDark: '#9cff5a', w: 30, h: 26, stemH: 22, mood: a.asleep ? 'sleep' : 'angry', stemColor: '#c9c3b8' })
    ctx.restore()
  },
  lily: (ctx) => {
    ellipse(ctx, 0, -4, 34, 9, '#4fae4a')
    ctx.beginPath()
    ctx.moveTo(0, -4)
    ctx.lineTo(16, -10)
    ctx.lineTo(18, -2)
    ctx.closePath()
    path(ctx, '#3a85b0', null)
    circle(ctx, -14, -8, 5, '#ff9ccd', INK, 2)
  },
  pot: (ctx) => {
    poly(ctx, [
      [-22, -26],
      [22, -26],
      [16, 0],
      [-16, 0],
    ], '#c8643b')
    rr(ctx, -25, -32, 50, 9, 3, '#d97a4c')
    line(ctx, [
      [-14, -14],
      [14, -14],
    ], 'rgba(0,0,0,.25)', 3)
  },
  zucchini: (ctx, p, t, a) => {
    const jump = p?.jumping ? Math.min(1, (0.75 - p.timer) / 0.75) : 0
    ctx.save()
    if (jump) {
      const dx = ((p.jumpX ?? p.col + 0.5) - (p.col + 0.5)) * 82 * jump
      ctx.translate(dx, -Math.sin(jump * Math.PI) * 60)
    }
    ctx.rotate(-0.1)
    rr(ctx, -16, -66, 32, 64, 15, '#2f7a2c')
    for (const sx of [-6, 6]) line(ctx, [
      [sx, -60],
      [sx, -8],
    ], '#58a84a', 2.5)
    rr(ctx, -8, -74, 16, 10, 4, '#7a5a2a')
    face(ctx, 0, -40, 0.95, 'angry')
    // arms, flexing
    line(ctx, [
      [-14, -30],
      [-26, -36],
      [-22, -48],
    ], '#2f7a2c', 6)
    line(ctx, [
      [14, -30],
      [26, -36],
      [22, -48],
    ], '#2f7a2c', 6)
    ctx.restore()
  },
  kelp: (ctx, p, t) => {
    const grab = p?.grabbing ? 1 : 0
    for (let i = 0; i < 4; i++) {
      const x = -14 + i * 9
      const sway = Math.sin(t * 2 + i) * 5
      line(ctx, [
        [x, 0],
        [x + sway, -16],
        [x - sway * 0.6, -30 - i * 2],
      ], INK, 8)
      line(ctx, [
        [x, 0],
        [x + sway, -16],
        [x - sway * 0.6, -30 - i * 2],
      ], grab ? '#2c8a54' : '#3fae6a', 5)
    }
    face(ctx, 0, -8, 0.7, grab ? 'angry' : 'happy')
    ellipse(ctx, 0, -2, 28, 5, 'rgba(255,255,255,.3)', '#3a8bb0', 2)
  },
  ghost: (ctx, p, t) => {
    const fuse = p && p.def.fuse ? Math.max(0, 1 - p.timer / p.def.fuse) : 0
    ctx.save()
    ctx.translate(0, -34)
    ctx.scale(1 + fuse * 0.25, 1 + fuse * 0.25 + Math.sin(t * 30) * fuse * 0.04)
    ctx.beginPath()
    ctx.moveTo(-14, -26)
    ctx.bezierCurveTo(-24, -10, -22, 16, -10, 30)
    ctx.quadraticCurveTo(-4, 22, 0, 32)
    ctx.quadraticCurveTo(6, 22, 12, 30)
    ctx.bezierCurveTo(24, 14, 22, -14, 12, -26)
    ctx.closePath()
    path(ctx, fuse > 0.4 && Math.floor(t * 14) % 2 ? '#ff8a3d' : '#e8322b')
    rr(ctx, -5, -38, 10, 14, 4, '#3f9a3a')
    // a shine on the skin
    ellipse(ctx, -7, -8, 3, 7, 'rgba(255,255,255,.45)', null)
    ctx.restore()
  },
  rug: (ctx, p, t, a) => thornRug(ctx, a, false),
  thornrock: (ctx, p, t, a) => thornRug(ctx, a, true, p),
  tiki: (ctx, p, t) => {
    rr(ctx, -6, -54, 12, 54, 3, '#c49a5c')
    for (const sy of [-12, -24, -36]) line(ctx, [
      [-6, sy],
      [6, sy],
    ], '#8a6a3a', 2)
    rr(ctx, -16, -82, 32, 30, 6, '#8a5a2e')
    // a band of rope around the bowl
    rr(ctx, -16, -70, 32, 6, 2, '#c49a5c', INK, 2)
    // the flame
    const fl = Math.sin(t * 14) * 3
    ctx.beginPath()
    ctx.moveTo(-12, -82)
    ctx.quadraticCurveTo(-14, -100 + fl, 0, -112 + fl)
    ctx.quadraticCurveTo(14, -100 - fl, 12, -82)
    ctx.closePath()
    path(ctx, '#ff8a1f', '#c24a00', 2.5)
    ctx.beginPath()
    ctx.moveTo(-6, -84)
    ctx.quadraticCurveTo(-6, -96, 0, -102 + fl)
    ctx.quadraticCurveTo(6, -96, 6, -84)
    ctx.closePath()
    path(ctx, '#ffe066', null)
  },
  lantern: (ctx, p, t) => {
    ctx.globalAlpha = 0.25 + Math.sin(t * 1.5) * 0.06
    circle(ctx, 0, -50, 40, '#fff3a0', null)
    ctx.globalAlpha = 1
    stem(ctx, 0, -2, 0, -30, 5)
    leaf(ctx, 0, -8, 20, Math.PI * 0.9)
    leaf(ctx, 0, -10, 20, -0.15)
    rr(ctx, -9, -34, 18, 8, 3, '#9aa3ad')
    ctx.beginPath()
    ctx.moveTo(-10, -34)
    ctx.bezierCurveTo(-24, -50, -16, -74, 0, -74)
    ctx.bezierCurveTo(16, -74, 24, -50, 10, -34)
    ctx.closePath()
    path(ctx, '#fff07a')
    line(ctx, [
      [-5, -40],
      [-3, -52],
      [3, -52],
      [5, -40],
    ], '#e0a020', 2)
    face(ctx, 0, -58, 0.7, 'happy')
  },
  prickly: (ctx, p, t, a) => {
    const tall = p?.reaching ? 1 : 0
    ellipse(ctx, 0, -28 - tall * 10, 18, 28 + tall * 10, '#5aae5a')
    ellipse(ctx, -18, -50 - tall * 10, 9, 13, '#5aae5a')
    ellipse(ctx, 18, -44 - tall * 10, 9, 12, '#5aae5a')
    for (const [sx, sy] of [
      [-10, -40],
      [8, -18],
      [-6, -10],
      [12, -46],
      [-16, -56],
      [18, -50],
    ]) line(ctx, [
      [sx, sy - tall * 10],
      [sx + 4, sy - 4 - tall * 10],
    ], '#fff', 2)
    circle(ctx, 0, -60 - tall * 18, 6, '#ff6fa8', INK, 2)
    face(ctx, 0, -30 - tall * 10, 0.85, a.recoil > 0 ? 'focus' : 'happy')
  },
  fan: (ctx, p, t) => {
    stem(ctx, 0, -2, 0, -36, 5)
    leaf(ctx, 0, -8, 20, Math.PI * 0.9)
    leaf(ctx, 0, -10, 20, -0.15)
    const spin = p ? t * (p.blew ? 40 : 3) : 0
    ctx.save()
    ctx.translate(0, -48)
    ctx.rotate(spin)
    for (let i = 0; i < 4; i++) {
      ctx.save()
      ctx.rotate((i / 4) * TAU)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(-12, -10, -8, -26, 0, -22)
      ctx.bezierCurveTo(8, -26, 12, -10, 0, 0)
      path(ctx, '#62c25a')
      ctx.restore()
    }
    circle(ctx, 0, 0, 7, '#d9e7f2')
    ctx.restore()
  },
  anise: (ctx, p, t, a) => {
    ctx.save()
    ctx.translate(0, -36)
    ctx.rotate(Math.sin(t) * 0.1)
    const pts = []
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? 12 : 30
      const ang = (i / 16) * TAU - Math.PI / 2
      pts.push([Math.cos(ang) * r, Math.sin(ang) * r])
    }
    poly(ctx, pts, '#a2622a')
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * TAU - Math.PI / 2
      circle(ctx, Math.cos(ang) * 20, Math.sin(ang) * 20, 3.5, '#e6b06a', INK, 1.5)
    }
    face(ctx, 0, 0, 0.75, a.recoil ? 'focus' : 'happy')
    ctx.restore()
  },
  bunker: (ctx, p, t, a) => bunker(ctx, p, 'back'),
  magnet: (ctx, p, t, a) => magnetMorel(ctx, p, t, a, '#d23b3b'),
  goldmagnet: (ctx, p, t, a) => magnetMorel(ctx, p, t, a, '#e8b62c'),
  lettuce: (ctx, p, t, a) => lobber(ctx, t, a, '#8fd36a', (c) => {
    circle(c, 0, 0, 11, '#b5ea8a')
    line(c, [
      [-6, -2],
      [6, 3],
    ], '#6fb34a', 2)
  }),
  popcorn: (ctx, p, t, a) => {
    rr(ctx, -16, -40, 32, 40, 4, '#fff')
    for (const sx of [-10, 0, 10]) rr(ctx, sx - 3, -40, 6, 40, 0, '#e8322b', null)
    rr(ctx, -16, -40, 32, 40, 4, null)
    for (const [kx, ky] of [
      [-10, -44],
      [0, -48],
      [10, -44],
      [-4, -52],
      [6, -54],
    ]) circle(ctx, kx, ky, 6, '#fff3c8', INK, 2)
    face(ctx, 0, -22, 0.8, 'happy')
    // the throwing arm
    const swing = a.recoil
    ctx.save()
    ctx.translate(-10, -50)
    ctx.rotate(-0.9 + swing * 1.4)
    line(ctx, [
      [0, 0],
      [-26, 0],
    ], '#3f9a3a', 5)
    circle(ctx, -28, 0, 6, '#ffd84a', INK, 2)
    ctx.restore()
  },
  melon: (ctx, p, t, a) => lobber(ctx, t, a, '#5aae5a', (c) => {
    ellipse(c, 0, 0, 15, 12, '#4caf50')
    for (const sx of [-8, 0, 8]) line(c, [
      [sx, -10],
      [sx, 10],
    ], '#2e7d32', 3)
  }, true),
  frostmelon: (ctx, p, t, a) => lobber(ctx, t, a, '#7fc8e8', (c) => {
    ellipse(c, 0, 0, 15, 12, '#9fe6ff')
    for (const sx of [-8, 0, 8]) line(c, [
      [sx, -10],
      [sx, 10],
    ], '#4aa3cf', 3)
  }, true),
  espresso: (ctx, p, t) => {
    ellipse(ctx, 0, -14, 12, 15, '#6b3a1e', INK, 2.5, 0.3)
    line(ctx, [
      [-4, -26],
      [0, -14],
      [-2, -2],
    ], '#3a1a0a', 2.5)
    for (let i = 0; i < 2; i++) {
      const k = (t * 0.7 + i / 2) % 1
      ctx.globalAlpha = 0.7 * (1 - k)
      line(ctx, [
        [-4 + i * 8, -32 - k * 20],
        [0 + i * 8, -38 - k * 20],
        [-4 + i * 8, -44 - k * 20],
      ], '#ddd', 2)
      ctx.globalAlpha = 1
    }
    face(ctx, 4, -14, 0.6, 'happy')
  },
  onion: (ctx, p, t) => {
    const hurtK = p ? 1 - p.hp / p.maxHp : 0
    ctx.beginPath()
    ctx.moveTo(0, -2)
    ctx.bezierCurveTo(-30, -4, -24, -44, 0, -50)
    ctx.bezierCurveTo(24, -44, 30, -4, 0, -2)
    path(ctx, '#b06ac8')
    for (const sx of [-12, 0, 12]) line(ctx, [
      [sx * 0.4, -48],
      [sx, -24],
      [sx * 0.5, -4],
    ], '#8a4aa3', 2)
    line(ctx, [
      [0, -50],
      [-4, -64],
    ], '#5fae4a', 4)
    line(ctx, [
      [0, -50],
      [6, -62],
    ], '#5fae4a', 4)
    face(ctx, 0, -24, 0.85, hurtK > 0.3 ? 'sad' : 'happy')
    if (hurtK > 0.3) ellipse(ctx, -8, -16 + ((t * 30) % 10), 2, 3.5, '#8fd8ff', null)
  },
  parasol: (ctx, p, t) => {
    rr(ctx, -4, -46, 8, 46, 3, '#9a7a4a')
    for (const sy of [-12, -24, -36]) line(ctx, [
      [-4, sy],
      [4, sy - 3],
    ], '#6a5030', 2)
    const open = p?.blockAt != null && t - p.blockAt < 0.6 ? 1.25 : 1
    ctx.save()
    ctx.translate(0, -50)
    ctx.scale(open, open)
    for (let i = -3; i <= 3; i++) leaf(ctx, 0, 0, 34, -Math.PI / 2 + i * 0.42, i % 2 ? '#3f9a3a' : '#5fbf4a')
    ctx.restore()
    face(ctx, 0, -28, 0.6, 'happy')
  },
  bulrush: (ctx, p, t, a) => {
    for (const [x, h, w] of [
      [-12, 56, 6],
      [4, 72, 7],
      [16, 48, 5],
    ]) {
      line(ctx, [
        [x, -2],
        [x + Math.sin(t + x) * 2, -h],
      ], '#4a8a3a', 3)
      rr(ctx, x - w + Math.sin(t + x) * 2, -h - 22, w * 2, 26, w, '#8a5a2a')
    }
    face(ctx, 4, -62, 0.6, a.recoil ? 'focus' : 'happy')
  },
  cannon: (ctx, p, t, a) => {
    const ready = p ? p.timer <= 0 : true
    // spans two tiles: the drawing goes right
    rr(ctx, -30, -24, 150, 22, 8, '#8a6a3a')
    for (const wx of [-14, 104]) circle(ctx, wx, -4, 12, '#5a4020')
    ctx.save()
    ctx.translate(40, -34)
    ctx.rotate(-0.35)
    rr(ctx, -40, -14, 96, 28, 12, '#5fae4a')
    if (ready) {
      rr(ctx, -30, -10, 70, 20, 10, '#ffd84a')
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) circle(ctx, -24 + i * 11, -4 + j * 8, 3, '#e8b62c', null)
    }
    ctx.restore()
    face(ctx, 10, -20, 0.8, ready ? 'happy' : 'sleep')
  },
  copycat: (ctx) => {
    mound(ctx, 16)
    stem(ctx, 0, -2, 0, -24, 4, '#9aa3ad')
    leaf(ctx, 0, -20, 16, -Math.PI * 0.8, '#c9ced6')
    leaf(ctx, 0, -20, 16, -0.2, '#c9ced6')
    face(ctx, 0, -32, 0.6, 'happy')
  },
}

function coconut(ctx, p, tall) {
  const k = p ? p.hp / p.maxHp : 1
  ctx.save()
  ctx.translate(0, -30 * tall)
  ctx.scale(1, tall)
  ellipse(ctx, 0, 0, 28, 30, '#7a4a28', INK, 3 / tall)
  ctx.restore()
  // hairy fibres
  for (let i = 0; i < 9; i++) {
    const ang = -Math.PI * 0.9 + i * 0.22
    const r = 26
    line(ctx, [
      [Math.cos(ang) * r, -30 * tall + Math.sin(ang) * 30 * tall],
      [Math.cos(ang) * (r - 6), -30 * tall + Math.sin(ang) * (30 * tall - 8)],
    ], '#5a3418', 2)
  }
  // the husk's grain
  for (let i = -2; i <= 2; i++) line(ctx, [[i * 7, -48 * tall], [i * 8, -14 * tall]], 'rgba(60,30,14,.35)', 2)
  if (k < 0.66) line(ctx, [
    [-18, -30 * tall - 8],
    [-8, -30 * tall + 2],
    [-14, -30 * tall + 14],
  ], '#f2e6c8', 2.5)
  if (k < 0.33) {
    poly(ctx, [
      [10, -30 * tall - 20],
      [24, -30 * tall - 6],
      [14, -30 * tall + 4],
    ], '#f6f0de', INK, 2)
    line(ctx, [
      [-6, -30 * tall + 16],
      [4, -30 * tall + 6],
      [16, -30 * tall + 18],
    ], '#f2e6c8', 2.5)
  }
}
function puffball(ctx, p, t, a, s) {
  ctx.save()
  ctx.scale(s, s)
  const puff = a.recoil
  ellipse(ctx, 0, -20, 22 + puff * 3, 20 - puff * 2, '#efe6cf')
  for (const [sx, sy] of [
    [-10, -30],
    [8, -32],
    [14, -20],
    [-14, -16],
  ]) circle(ctx, sx, sy, 3, '#d9cba8', null)
  face(ctx, 0, -18, 0.75, a.mood)
  ellipse(ctx, 18, -18, 4 + puff * 2, 4 + puff * 2, '#d9cba8', INK, 2)
  ctx.restore()
}
function thornRug(ctx, a, rock, p) {
  rr(ctx, -34, -10, 68, 12, 4, rock ? '#7a7f88' : '#c46a3a')
  if (!rock) {
    for (let i = -3; i <= 3; i++) rr(ctx, i * 9 - 2, -7, 4, 4, 1, '#ffe0b0', null)
  }
  for (let i = 0; i < 6; i++) {
    const x = -28 + i * 11
    poly(ctx, [
      [x - 4, -9],
      [x, -22 - (rock ? 6 : 0) - (a.recoil ? 4 : 0)],
      [x + 4, -9],
    ], rock ? '#c9ced6' : '#e8e2d0', INK, 2)
  }
  if (rock && p) {
    ctx.font = PIXEL_FONT(8)
    ctx.fillStyle = '#fff'
    ctx.fillText(String(p.uses ?? 9), 28, -12)
  }
}
function bunker(ctx, p, part) {
  const k = p ? p.hp / p.maxHp : 1
  if (part === 'back') {
    ctx.beginPath()
    ctx.ellipse(0, -30, 40, 34, 0, Math.PI, 0)
    path(ctx, '#d9762a')
    rr(ctx, -6, -70, 12, 12, 3, '#5a8a2a')
    return
  }
  // front half, drawn over the plant inside
  ctx.beginPath()
  ctx.ellipse(0, -28, 42, 30, 0, 0.08 * Math.PI, 0.92 * Math.PI)
  ctx.lineTo(-40, -22)
  ctx.quadraticCurveTo(0, -12, 40, -22)
  ctx.closePath()
  path(ctx, k < 0.33 ? '#a8561a' : '#e8862e')
  for (const sx of [-20, 0, 20]) line(ctx, [
    [sx, -16],
    [sx * 1.05, 2],
  ], '#b8601c', 2.5)
  // sandbag rim: it's a bunker
  for (let i = -3; i <= 3; i++) ellipse(ctx, i * 11, -18, 7, 4, '#d8c79a', INK, 1.8)
  if (k < 0.5) line(ctx, [
    [-24, -8],
    [-14, -14],
    [-18, -2],
  ], INK, 2)
}
export function drawShellFront(ctx, p) {
  bunker(ctx, p, 'front')
}
function magnetMorel(ctx, p, t, a, color) {
  mushroom(ctx, { capColor: '#e8e2d6', capDark: '#c9c3b8', w: 22, h: 14, stemH: 22, mood: a.mood, spots: false })
  ctx.save()
  ctx.translate(0, -44)
  ctx.beginPath()
  ctx.arc(0, 0, 16, Math.PI, 0)
  ctx.lineTo(10, 0)
  ctx.arc(0, 0, 6, 0, Math.PI, true)
  ctx.closePath()
  path(ctx, color)
  rr(ctx, -16, -2, 6, 8, 1, '#d9dde3')
  rr(ctx, 10, -2, 6, 8, 1, '#d9dde3')
  ctx.restore()
  if (p?.holding && p.timer > 0) {
    ctx.save()
    ctx.translate(0, -64)
    ctx.font = PIXEL_FONT(8)
    ctx.textAlign = 'center'
    rr(ctx, -20, -10, 40, 14, 4, '#c9ced6', INK, 2)
    ctx.fillStyle = INK
    ctx.fillText(p.holding.split(' ')[0].slice(0, 8), 0, 0)
    ctx.restore()
  }
}
function lobber(ctx, t, a, color, ammo, big = false) {
  // a leafy plant with a vine catapult arm
  ellipse(ctx, 0, -18, 24, 18, color)
  for (let i = -2; i <= 2; i++) leaf(ctx, i * 8, -26, 16, -Math.PI / 2 + i * 0.4, color)
  face(ctx, 0, -18, 0.85, 'happy')
  const swing = a.recoil
  ctx.save()
  ctx.translate(8, -30)
  ctx.rotate(-1.9 + swing * 1.6)
  line(ctx, [
    [0, 0],
    [0, -30],
  ], '#3f9a3a', 5)
  ctx.translate(0, -36)
  ellipse(ctx, 0, 4, big ? 18 : 14, 8, '#6aa63f')
  if (swing < 0.3) ammo(ctx)
  ctx.restore()
}

// ================= Zombies =================
const SKIN = '#9fb88a'
const SKIN_DARK = '#6f8a5e'
/**
 * A zombie: hunched, shambling, arms out in front. o: { shirt, pants, hat(ctx), front(ctx),
 * back(ctx), eat, walk (0..1 cycle), noPhone (hands busy: no reaching arm), scale, bodyless (legs hidden) }
 */
function person(ctx, z, t, o = {}) {
  const walk = o.walk ?? 0
  const eat = o.eat ?? false
  const sw = Math.sin(walk * TAU)
  const lostArm = z && z.hp < z.maxHp * 0.5 && !o.keepArm
  ctx.save()
  if (o.scale) ctx.scale(o.scale, o.scale)
  // legs
  if (!o.bodyless) {
    line(ctx, [
      [4, -46],
      [4 + sw * 8, -24],
      [2 + sw * 12, 0],
    ], INK, 11)
    line(ctx, [
      [4, -46],
      [4 + sw * 8, -24],
      [2 + sw * 12, 0],
    ], o.pants ?? '#3c4a6b', 7)
    line(ctx, [
      [8, -46],
      [8 - sw * 8, -24],
      [10 - sw * 12, 0],
    ], INK, 11)
    line(ctx, [
      [8, -46],
      [8 - sw * 8, -24],
      [10 - sw * 12, 0],
    ], o.pants ?? '#3c4a6b', 7)
    for (const fx of [2 + sw * 12, 10 - sw * 12]) rr(ctx, fx - 8, -4, 14, 6, 3, o.shoes ?? '#e9e6f0', INK, 2)
  }
  if (o.back) o.back(ctx)
  // body (hunched)
  ctx.save()
  ctx.translate(6, -46)
  ctx.rotate(-0.22)
  rr(ctx, -14, -40, 28, 44, 10, o.shirt ?? '#7a5a3a')
  if (o.shirtDetail) o.shirtDetail(ctx)
  else if (!o.shirt) {
    // a torn shirt collar and a red tie
    poly(ctx, [[-8, -40], [0, -32], [8, -40]], '#e8e2d0', INK, 1.5)
    poly(ctx, [[-2, -33], [2, -33], [3, -14], [0, -10], [-3, -14]], '#b8322b', INK, 1.5)
  }
  ctx.restore()
  // back arm
  if (!lostArm) {
    const ay = eat ? Math.sin(t * 12) * 4 : 0
    line(ctx, [
      [8, -80],
      [-8, -84 + ay],
      [-24, -86 + ay],
    ], INK, 10)
    line(ctx, [
      [8, -80],
      [-8, -84 + ay],
      [-24, -86 + ay],
    ], o.sleeve ?? o.shirt ?? '#7a5a3a', 6)
    circle(ctx, -26, -86 + ay, 4, SKIN, INK, 2)
  }
  // head, lolling forward
  const nod = eat ? Math.sin(t * 12) * 2 : Math.sin(walk * TAU * 2) * 1
  ctx.save()
  ctx.translate(-6, -92 + nod)
  if (!(z && z.headless)) {
    ellipse(ctx, 0, 0, 15, 17, z?.hypno ? '#d9c7ff' : SKIN)
    // undead eyes: one wide and staring, one droopy
    circle(ctx, -9, -1, 4.2, '#f4f1dc', INK, 1.5)
    circle(ctx, -10, 0, 1.6, z?.hypno ? '#a24bff' : '#2a2a3a', null)
    ellipse(ctx, -1, 1, 3.4, 2.4, '#f4f1dc', INK, 1.5)
    circle(ctx, -2, 1.5, 1.2, z?.hypno ? '#a24bff' : '#2a2a3a', null)
    // dark rings, a stitch on the cheek
    line(ctx, [
      [-13, 4],
      [-6, 5],
    ], SKIN_DARK, 1.5)
    line(ctx, [
      [5, 4],
      [9, 8],
    ], SKIN_DARK, 1.5)
    // the mouth: slack jaw, a couple of teeth
    const jaw = eat ? 4 + Math.abs(Math.sin(t * 12)) * 3 : 3
    rr(ctx, -15, 8, 11, jaw + 2, 2, '#3a1e24', INK, 1.5)
    rr(ctx, -13, 8, 3, 3, 0.5, '#f4f1dc', null)
    rr(ctx, -8, 8, 3, 3, 0.5, '#f4f1dc', null)
    // hair
    ctx.beginPath()
    ctx.ellipse(3, -8, 13, 9, 0.4, Math.PI * 1.1, Math.PI * 2.05)
    path(ctx, o.hair ?? '#4a3a2e', INK, 2)
    if (o.hat) o.hat(ctx)
  }
  ctx.restore()
  // front arm, reaching out
  if (!o.noPhone) {
    const ay = eat ? Math.sin(t * 12 + 1) * 5 : Math.sin(walk * TAU) * 2
    line(ctx, [
      [0, -78],
      [-16, -76 + ay],
      [-32, -78 + ay],
    ], INK, 10)
    line(ctx, [
      [0, -78],
      [-16, -76 + ay],
      [-32, -78 + ay],
    ], o.sleeve ?? o.shirt ?? '#7a5a3a', 6)
    circle(ctx, -34, -78 + ay, 4.5, SKIN, INK, 2)
  }
  if (o.front) o.front(ctx)
  ctx.restore()
}

/** Draws a Scroller. z: the zombie (or null for an icon), t: game time. */
export function drawZombie(ctx, type, z, t) {
  const f = ZOMBIE_ART[type] ?? ZOMBIE_ART.scroller
  const phase = z ? (t * (z.speed ?? 0.2) * 3.2 + z.id * 0.37) % 1 : 0.25
  const eat = z?.state === 'eat'
  ctx.save()
  if (z?.hypno) ctx.scale(-1, 1)
  f(ctx, z, t, { walk: z && (z.state === 'walk' || z.state === 'run') ? phase : 0.25, eat })
  ctx.restore()
}

const beanie = (color) => (ctx) => {
  ctx.beginPath()
  ctx.ellipse(2, -8, 16, 13, 0.25, Math.PI, 0)
  ctx.closePath()
  path(ctx, color)
  rr(ctx, -14, -10, 32, 7, 3, '#f2f2f2')
  circle(ctx, 6, -24, 5, '#f2f2f2')
}
const ZOMBIE_ART = {
  scroller: (ctx, z, t, a) => person(ctx, z, t, a),
  trend: (ctx, z, t, a) => {
    person(ctx, z, t, {
      ...a,
      back: (c) => {
        line(c, [
          [14, -60],
          [20, -150],
        ], '#7a6a5a', 4)
        const wave = Math.sin(t * 5) * 4
        c.beginPath()
        c.moveTo(20, -150)
        c.quadraticCurveTo(36, -146 + wave, 52, -150)
        c.lineTo(52, -124)
        c.quadraticCurveTo(36, -120 + wave, 20, -124)
        c.closePath()
        path(c, '#b8322b', INK, 2)
        // a torn corner and a skull-ish blot
        poly(c, [[44, -124], [52, -124], [52, -132]], '#7a5a3a', null)
        circle(c, 34, -138, 5, '#f4f1dc', null)
      },
    })
  },
  beanie: (ctx, z, t, a) =>
    person(ctx, z, t, {
      ...a,
      hat:
        z?.helmet === null && z
          ? null
          : (c) => {
              const dent = z?.helmet ? 1 - z.helmet.hp / z.helmet.max : 0
              c.beginPath()
              c.arc(0, -6, 17, Math.PI, 0)
              c.closePath()
              path(c, dent > 0.6 ? '#c9a226' : '#ffd23f')
              rr(c, -22, -8, 44, 5, 2, dent > 0.6 ? '#c9a226' : '#ffd23f')
              rr(c, -3, -22, 6, 15, 2, '#e8b800', null)
              if (dent > 0.3) line(c, [[-8, -18], [-2, -10], [-6, -6]], INK, 1.5)
            },
    }),
  vr: (ctx, z, t, a) =>
    person(ctx, z, t, {
      ...a,
      hat:
        z?.helmet === null && z
          ? null
          : (c) => {
              // a dented cooking pot, upside down
              const dent = z?.helmet ? 1 - z.helmet.hp / z.helmet.max : 0
              rr(c, -18, -30, 36, 26, 4, '#aab2bc')
              rr(c, -22, -8, 44, 6, 2, '#8a929c')
              line(c, [[18, -20], [30, -22]], '#5a5a62', 4)
              if (dent > 0.3) circle(c, -6, -20, 5, '#7a828c', null)
              if (dent > 0.6) circle(c, 8, -14, 6, '#7a828c', null)
            },
    }),
  selfie: (ctx, z, t, a) =>
    person(ctx, z, t, {
      ...a,
      shirt: '#e8e2d0',
      pants: '#b8322b',
      hair: '#e8b04a',
      shirtDetail: (c) => rr(c, -10, -30, 20, 6, 2, '#b8322b', null),
      front:
        z?.lostStick || (z && z.state === 'walk' && !z.def?.vaults)
          ? null
          : (c) => {
              const vault = z?.state === 'vault' ? (t - z.moveStart) / z.moveDur : 0
              c.save()
              c.translate(-20, -84)
              c.rotate(-0.6 - vault * 2)
              line(c, [
                [30, 0],
                [-80, 0],
              ], '#c49a5c', 4)
              c.restore()
            },
    }),
  boomer: (ctx, z, t, a) =>
    person(ctx, z, t, {
      ...a,
      shirt: '#c9b48a',
      hair: '#d9d9d9',
      noPhone: true,
      hat: (c) => {
        circle(c, -10, 0, 5, null, INK, 2)
        circle(c, -1, 0, 5, null, INK, 2)
        if (z?.angry) {
          line(c, [
            [-14, -8],
            [-6, -4],
          ], INK, 2.5)
          c.fillStyle = 'rgba(255,60,60,.35)'
          c.beginPath()
          c.arc(-6, 2, 14, 0, TAU)
          c.fill()
        }
      },
      shirtDetail: (c) => poly(c, [
        [-2, -36],
        [2, -36],
        [3, -8],
        [0, -2],
        [-3, -8],
      ], '#b33', INK, 1.5),
      front:
        z && !z.shield
          ? null
          : (c) => {
              rr(c, -48, -108, 36, 46, 2, '#f4f1e8', INK, 2)
              for (let i = 0; i < 6; i++) line(c, [
                [-44, -100 + i * 7],
                [-16, -100 + i * 7],
              ], '#9a9a9a', 1.5)
            },
    }),
  bigscreen: (ctx, z, t, a) =>
    person(ctx, z, t, {
      ...a,
      shirt: '#5a6b4a',
      front:
        z && !z.shield
          ? null
          : (c) => {
              const dmg = z?.shield ? 1 - z.shield.hp / z.shield.max : 0
              // a screen door: a frame with a wire mesh
              rr(c, -64, -128, 56, 92, 3, '#8a929c', INK, 3)
              rr(c, -58, -122, 44, 80, 1, dmg > 0.6 ? '#4a4f58' : '#6a717c', null)
              c.strokeStyle = 'rgba(30,30,36,.5)'
              c.lineWidth = 1
              for (let i = 0; i < 11; i++) {
                c.beginPath()
                c.moveTo(-58 + i * 4, -122)
                c.lineTo(-58 + i * 4, -42)
                c.stroke()
              }
              for (let i = 0; i < 20; i++) {
                c.beginPath()
                c.moveTo(-58, -122 + i * 4)
                c.lineTo(-14, -122 + i * 4)
                c.stroke()
              }
              rr(c, -60, -86, 6, 10, 2, '#c9a226', INK, 1.5)
              if (dmg > 0.3) line(c, [[-50, -110], [-32, -92], [-44, -70]], INK, 2)
            },
    }),
  cryptobro: (ctx, z, t, a) =>
    person(ctx, z, t, {
      ...a,
      shirt: '#b8322b',
      pants: '#2a2d34',
      shirtDetail: (c) => {
        rr(c, -14, -22, 28, 6, 0, '#f4f1dc', null)
      },
      hat:
        z?.helmet === null && z
          ? null
          : (c) => {
              // a hockey helmet with a cage
              c.beginPath()
              c.arc(0, -2, 18, Math.PI * 0.95, Math.PI * 2.1)
              c.closePath()
              path(c, '#f4f1dc')
              c.strokeStyle = '#8a929c'
              c.lineWidth = 2
              for (let i = 0; i < 4; i++) {
                c.beginPath()
                c.moveTo(-20 + i * 4, -4)
                c.lineTo(-20 + i * 4, 14)
                c.stroke()
              }
              line(c, [[-22, 4], [-6, 4]], '#8a929c', 2)
            },
    }),
  dancer: (ctx, z, t, a) => {
    const bounce = Math.abs(Math.sin(t * 6)) * 4
    ctx.save()
    ctx.translate(0, -bounce)
    person(ctx, z, t, {
      ...a,
      walk: z?.state === 'moonwalk' ? (t * 1.4) % 1 : a.walk,
      shirt: '#9b3cff',
      pants: '#ff3fa8',
      shoes: '#fff',
      hair: '#1a120c',
      hat: (c) => {
        // a big afro
        for (const [hx, hy, hr] of [[2, -14, 14], [-10, -10, 11], [14, -6, 11], [4, -2, 12]]) circle(c, hx, hy, hr, '#1a120c', null)
      },
    })
    ctx.restore()
  },
  backup: (ctx, z, t, a) => {
    const bounce = Math.abs(Math.sin(t * 6 + 1)) * 3
    ctx.save()
    ctx.translate(0, -bounce)
    person(ctx, z, t, { ...a, shirt: '#39e2ff', pants: '#39e2ff', hair: '#2a1a12' })
    ctx.restore()
  },
  floatie: (ctx, z, t, a) => {
    person(ctx, z, t, { ...a, shirt: '#ff9fbf', bodyless: true })
    flamingo(ctx, t)
  },
  scuba: (ctx, z, t, a) => {
    if (z && z.under && !z.surfaced) {
      // just the snorkel poking out
      const bob = Math.sin(t * 3) * 2
      line(ctx, [
        [-4, -14 + bob],
        [-4, -42 + bob],
        [4, -46 + bob],
      ], '#ffd23f', 5)
      ellipse(ctx, 0, -10, 18, 4, 'rgba(255,255,255,.4)', '#3a8bb0', 2)
      return
    }
    person(ctx, z, t, {
      ...a,
      shirt: '#1d3a5a',
      bodyless: true,
      hat: (c) => {
        rr(c, -20, -6, 22, 12, 4, 'rgba(159,231,255,.6)', INK, 2)
        line(c, [
          [8, -2],
          [10, -26],
        ], '#ffd23f', 4)
      },
    })
  },
  slush: (ctx, z, t) => {
    // a little slush truck
    rr(ctx, -54, -62, 96, 48, 8, '#4fb3ff')
    rr(ctx, -44, -96, 40, 36, 6, '#e8f6ff')
    for (const wx of [-36, 24]) {
      circle(ctx, wx, -12, 12, '#2a2d34')
      circle(ctx, wx, -12, 4, '#c9ced6', INK, 1.5)
    }
    // the ice tank on the back, and the scraper at the front
    rr(ctx, 6, -100, 34, 42, 4, '#c9ced6')
    rr(ctx, -62, -24, 12, 18, 2, '#8a929c')
    ctx.save()
    ctx.translate(-30, -100)
    ctx.scale(0.55, 0.55)
    person(ctx, z, t, { shirt: '#4fb3ff', bodyless: true })
    ctx.restore()
  },
  sled: (ctx, z, t, a) => {
    person(ctx, z, t, { ...a, shirt: '#e84a4a', hat: beanie('#2a6bd1'), walk: z?.riding ? 0.25 : a.walk })
    if (z?.riding) rr(ctx, -30, -6, 60, 8, 4, '#c9ced6')
  },
  jetski: (ctx, z, t, a) => {
    const riding = z?.state === 'run' || z?.state === 'vault'
    person(ctx, z, t, { ...a, shirt: '#ffd23f', bodyless: true })
    if (riding) {
      ctx.beginPath()
      ctx.moveTo(-50, -14)
      ctx.quadraticCurveTo(-40, -30, 0, -26)
      ctx.lineTo(40, -26)
      ctx.lineTo(44, -8)
      ctx.lineTo(-40, -6)
      ctx.closePath()
      path(ctx, '#ff3f3f')
      rr(ctx, -10, -36, 20, 10, 3, '#2a2d34')
    }
  },
  powerbank: (ctx, z, t, a) => {
    const swell = z?.boomAt ? Math.max(0, 1 - (z.boomAt - t) / 8) : 0
    person(ctx, z, t, {
      ...a,
      shirt: '#6a3a8a',
      back: (c) => {
        if (z && !z.box) return
        const s = 1 + swell * 0.4 + Math.sin(t * (6 + swell * 30)) * swell * 0.05
        c.save()
        c.translate(22, -80)
        c.scale(s, s)
        // a jack-in-the-box, the crank turning
        rr(c, -16, -18, 32, 32, 3, swell > 0.6 && Math.floor(t * 10) % 2 ? '#ff4d4d' : '#b8322b', INK, 3)
        rr(c, -16, -18, 32, 8, 2, '#ffd23f', null)
        c.save()
        c.translate(18, 0)
        c.rotate(t * 6)
        line(c, [[0, 0], [8, 0]], INK, 3)
        c.restore()
        c.restore()
      },
    })
  },
  drone: (ctx, z, t, a) => {
    const flying = z ? z.balloon > 0 : true
    ctx.save()
    if (flying) ctx.translate(0, -30 + Math.sin(t * 3) * 3)
    person(ctx, z, t, { ...a, shirt: '#3a7a4a', walk: flying ? 0.25 : a.walk })
    if (flying) {
      // hanging off a big red balloon
      line(ctx, [
        [-10, -110],
        [-6, -150],
      ], '#e8e2d0', 2)
      ellipse(ctx, -6, -176, 22, 27, '#e8322b')
      ellipse(ctx, -13, -186, 6, 9, 'rgba(255,255,255,.45)', null)
      poly(ctx, [[-10, -150], [-2, -150], [-6, -145]], '#b8322b', null)
    }
    ctx.restore()
  },
  miner: (ctx, z, t, a) => {
    if (z?.underground) {
      // a moving pile of dirt
      const k = Math.sin(t * 8) * 2
      ellipse(ctx, 0, -8, 28, 12 + k, '#7a5a3a')
      for (const dx of [-14, 0, 12]) circle(ctx, dx, -16 + k, 5, '#8a6a4a', INK, 2)
      return
    }
    person(ctx, z, t, {
      ...a,
      shirt: '#5a4a3a',
      pants: '#4a4a3a',
      hat: (c) => {
        c.beginPath()
        c.arc(0, -4, 17, Math.PI, 0)
        c.closePath()
        path(c, '#ffd23f')
        rr(c, -20, -6, 40, 4, 2, '#ffd23f')
        circle(c, -12, -12, 4, '#fff7c0', INK, 2)
      },
      front:
        z && !z.pickaxe
          ? null
          : (c) => {
              c.save()
              c.translate(10, -90)
              c.rotate(0.8)
              line(c, [
                [0, 0],
                [0, -44],
              ], '#8a6a3a', 4)
              c.beginPath()
              c.moveTo(-18, -40)
              c.quadraticCurveTo(0, -52, 18, -40)
              path(c, null, '#9aa3ad', 5)
              c.restore()
            },
    })
  },
  pogo: (ctx, z, t, a) => {
    const hop = z?.pogo ? Math.abs(Math.sin(t * 7)) * 16 : 0
    ctx.save()
    ctx.translate(0, -hop)
    person(ctx, z, t, {
      ...a,
      shirt: '#2a6bd1',
      hair: '#c9a226',
    })
    if (z?.pogo || !z) {
      line(ctx, [
        [-4, -40],
        [-4, 16],
      ], '#c9ced6', 5)
      line(ctx, [
        [-16, -40],
        [8, -40],
      ], '#c9ced6', 4)
      for (let i = 0; i < 4; i++) line(ctx, [
        [-9, 4 + i * 3],
        [1, 6 + i * 3],
      ], '#9aa3ad', 2)
    }
    ctx.restore()
  },
  sasquatch: (ctx, z, t, a) => {
    ctx.save()
    ctx.scale(1.15, 1.15)
    person(ctx, z, t, { ...a, shirt: '#8a6a4a', pants: '#8a6a4a', hair: '#6a4a2a', shoes: '#6a4a2a' })
    ctx.restore()
  },
  bungee: (ctx, z, t) => {
    // drawn hanging from the top of the screen: the caller handles the cord
    const grab = z?.carrying
    person(ctx, z, t, { shirt: '#3fd17a', noPhone: true, walk: 0.25 })
    if (grab) {
      ctx.save()
      ctx.translate(-20, -40)
      ctx.scale(0.5, 0.5)
      drawPlant(ctx, grab, null, t)
      ctx.restore()
    }
  },
  ladderguy: (ctx, z, t, a) =>
    person(ctx, z, t, {
      ...a,
      shirt: '#e8742e',
      hat: (c) => rr(c, -14, -18, 30, 9, 3, '#ffd23f'),
      back:
        z && !z.shield
          ? null
          : (c) => {
              c.save()
              c.translate(-6, -96)
              c.rotate(-0.2)
              for (const lx of [-34, 34]) line(c, [
                [lx, -16],
                [lx, 16],
              ], '#c9ced6', 4)
              for (let i = -2; i <= 2; i++) line(c, [
                [i * 14, -16],
                [i * 14, 16],
              ], '#9aa3ad', 3)
              line(c, [
                [-34, -16],
                [34, -16],
              ], '#c9ced6', 4)
              line(c, [
                [-34, 16],
                [34, 16],
              ], '#c9ced6', 4)
              c.restore()
            },
    }),
  flinger: (ctx, z, t) => {
    rr(ctx, -50, -50, 104, 38, 8, '#6a5a3a')
    for (const wx of [-30, 34]) {
      circle(ctx, wx, -10, 13, '#2a2d34')
      circle(ctx, wx, -10, 4, '#c9ced6', INK, 1.5)
    }
    const fling = z?.flingAt != null && t > z.flingAt - 0.4 ? 1 : 0
    ctx.save()
    ctx.translate(26, -52)
    ctx.rotate(-0.4 - fling * 1.2)
    line(ctx, [
      [0, 0],
      [-56, 0],
    ], '#8a6a3a', 6)
    rr(ctx, -66, -10, 16, 12, 3, '#6a4a2a')
    if (z?.ammo > 0) circle(ctx, -58, -12, 7, '#8a8a8a', INK, 2)
    ctx.restore()
    ctx.save()
    ctx.translate(-22, -48)
    ctx.scale(0.6, 0.6)
    person(ctx, z, t, { shirt: '#5a6a3a', bodyless: true })
    ctx.restore()
  },
  gigachad: (ctx, z, t, a) => {
    const smash = z?.state === 'smash' ? Math.min(1, 1 - (z.smashAt - t) / 1.3) : 0
    ctx.save()
    ctx.scale(1.7, 1.7)
    person(ctx, z, t, {
      ...a,
      shirt: '#6a5a4a',
      pants: '#3a3a2a',
      noPhone: true,
      keepArm: true,
      hair: '#3a2a1a',
      shirtDetail: (c) => {
        line(c, [
          [-8, -28],
          [-2, -20],
          [8, -28],
        ], '#4a3a2a', 2)
      },
      back:
        z && !z.imp
          ? null
          : (c) => {
              c.save()
              c.translate(20, -84)
              c.scale(0.45, 0.45)
              person(c, null, t, { shirt: '#c9a226', noPhone: true })
              c.restore()
            },
      front: (c) => {
        // the log he swings
        c.save()
        c.translate(-14, -84)
        c.rotate(-0.4 + smash * 1.9)
        rr(c, -8, -62, 14, 66, 5, '#7a5a3a', INK, 2)
        for (let i = 1; i < 4; i++) line(c, [[-6, -14 * i], [2, -14 * i - 4]], '#5a3a1e', 2)
        c.restore()
      },
    })
    ctx.restore()
  },
  ipadkid: (ctx, z, t, a) => {
    ctx.save()
    ctx.scale(0.62, 0.62)
    person(ctx, z, t, {
      ...a,
      shirt: '#c9a226',
      shirtDetail: (c) => line(c, [[-10, -30], [10, -18]], '#7a5a3a', 3),
    })
    ctx.restore()
  },
  algorithm: (ctx, z, t) => algorithmBot(ctx, t, null),
}

function flamingo(ctx, t) {
  const bob = Math.sin(t * 3) * 2
  ctx.save()
  ctx.translate(4, -40 + bob)
  ellipse(ctx, 0, 0, 30, 11, '#ff8fc0')
  ellipse(ctx, 0, -2, 18, 5, 'rgba(0,0,0,.15)', null)
  line(ctx, [
    [-26, -2],
    [-32, -28],
    [-24, -40],
  ], '#ff8fc0', 7)
  line(ctx, [
    [-26, -2],
    [-32, -28],
    [-24, -40],
  ], INK, 1)
  circle(ctx, -22, -42, 6, '#ff8fc0')
  poly(ctx, [
    [-17, -43],
    [-8, -40],
    [-16, -38],
  ], INK, null)
  ctx.restore()
}

/** The final boss: a mad zombie scientist's giant robot. */
export function algorithmBot(ctx, t, boss) {
  const hurt = boss?.hitAt != null && t - boss.hitAt < 0.08
  const head = boss?.head ? 1 : 0
  const dying = boss?.state === 'dying'
  ctx.save()
  if (dying) ctx.translate(Math.sin(t * 50) * 6, 0)
  // legs
  for (const lx of [-70, 40]) {
    rr(ctx, lx, -160, 50, 160, 8, '#3a3f4a')
    for (let i = 0; i < 5; i++) circle(ctx, lx + 12, -140 + i * 28, 4, Math.floor(t * 3 + i) % 2 ? '#3fe06a' : '#1a5a2a', INK, 1.5)
  }
  // body: riveted armour plates
  rr(ctx, -110, -420, 220, 270, 18, hurt ? '#fff' : '#5a6070')
  for (let i = 0; i < 4; i++) {
    rr(ctx, -94, -400 + i * 62, 188, 52, 6, '#4a5060', INK, 2)
    for (let j = 0; j < 8; j++) circle(ctx, -84 + j * 24, -392 + i * 62, 3, '#9aa3ad', null)
  }
  rr(ctx, -40, -330, 80, 60, 10, (Math.floor(t * 3) % 2) ? '#ff4d4d' : '#b8322b', INK, 3)
  // arms
  for (const s of [-1, 1]) {
    line(ctx, [
      [s * 110, -360],
      [s * 150, -290],
      [s * 130, -220],
    ], INK, 30)
    line(ctx, [
      [s * 110, -360],
      [s * 150, -290],
      [s * 130, -220],
    ], '#6a7180', 24)
  }
  // the head: a robot skull with a glass dome, the scientist inside
  ctx.save()
  ctx.translate(-30, -470 + head * 150)
  rr(ctx, -80, -70, 160, 120, 22, '#4a5060')
  const mouthGlow = boss?.ballKind === 'fire' && head ? '#ff6a2a' : boss?.ballKind === 'ice' && head ? '#7fd8ff' : '#2a2d34'
  rr(ctx, -50, 10, 100, 26, 6, mouthGlow, INK, 3)
  for (let i = 0; i < 6; i++) rr(ctx, -46 + i * 16, 10, 10, 10, 2, '#c9ced6', null)
  for (const ex of [-40, 40]) circle(ctx, ex, -24, 16, Math.floor(t * 4) % 2 ? '#ff4d4d' : '#ff8a8a', INK, 3)
  ellipse(ctx, 0, -78, 40, 26, 'rgba(180,230,255,.55)', INK, 3)
  circle(ctx, 0, -78, 14, SKIN, INK, 2)
  ctx.restore()
  ctx.restore()
}

// ================= Drops, shots and the rest =================
export function drawSun(ctx, t, small = false) {
  const s = small ? 0.7 : 1
  ctx.save()
  ctx.scale(s, s)
  ctx.rotate(t * 0.8)
  ctx.globalAlpha = 0.45
  circle(ctx, 0, 0, 30, '#fff3a0', null)
  ctx.globalAlpha = 1
  for (let i = 0; i < 10; i++) {
    ctx.save()
    ctx.rotate((i / 10) * TAU)
    poly(ctx, [
      [-5, -18],
      [0, -29],
      [5, -18],
    ], '#ffc12e', '#e08a00', 2)
    ctx.restore()
  }
  circle(ctx, 0, 0, 18, '#ffd84a', '#e08a00', 3)
  circle(ctx, -5, -5, 6, '#fff3a0', null)
  ctx.restore()
}
export function drawCoin(ctx, kind, t) {
  if (kind === 'diamond') {
    ctx.save()
    ctx.rotate(Math.sin(t * 3) * 0.15)
    poly(ctx, [
      [0, -16],
      [14, -4],
      [0, 16],
      [-14, -4],
    ], '#9ff0ff', '#2a8ab0', 2.5)
    line(ctx, [
      [-14, -4],
      [14, -4],
    ], '#2a8ab0', 1.5)
    ctx.restore()
    return
  }
  const w = Math.abs(Math.cos(t * 3)) * 13 + 2
  ellipse(ctx, 0, 0, w, 14, kind === 'gold' ? '#ffd23f' : '#d9dde3', kind === 'gold' ? '#a87a00' : '#7a808a', 2.5)
  if (w > 8) {
    ctx.font = PIXEL_FONT(16)
    ctx.fillStyle = kind === 'gold' ? '#a87a00' : '#7a808a'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('$', 0, 1)
  }
}
export function drawShot(ctx, s, t) {
  switch (s.kind) {
    case 'pea':
      if (s.fire) {
        const fl = Math.sin(t * 30) * 2
        ellipse(ctx, -6, 0, 14 + fl, 8, 'rgba(255,140,30,.6)', null)
        circle(ctx, 0, 0, 9, '#ff8a1f', '#c24a00', 2.5)
        circle(ctx, 2, -2, 4, '#ffe066', null)
        return
      }
      circle(ctx, 0, 0, 8, '#8be04a', '#3a7a1a', 2.5)
      circle(ctx, -2.5, -2.5, 2.5, 'rgba(255,255,255,.7)', null)
      return
    case 'frost':
      circle(ctx, 0, 0, 8, '#bdf0ff', '#2a8ab0', 2.5)
      line(ctx, [
        [-4, 0],
        [4, 0],
      ], '#fff', 1.5)
      line(ctx, [
        [0, -4],
        [0, 4],
      ], '#fff', 1.5)
      return
    case 'spore':
      ctx.globalAlpha = 0.85
      circle(ctx, 0, 0, 7, '#d9b8ff', '#7a4ab0', 2)
      circle(ctx, -6, 2, 4, '#e9d6ff', null)
      ctx.globalAlpha = 1
      return
    case 'spike':
    case 'homing':
      ctx.save()
      if (s.kind === 'homing' && s.target) ctx.rotate(Math.atan2(s.target.row - s.y, s.target.x - s.x))
      poly(ctx, [
        [-10, -2.5],
        [10, 0],
        [-10, 2.5],
      ], '#e8e2d0', INK, 1.5)
      ctx.restore()
      return
    case 'star': {
      ctx.save()
      ctx.rotate(t * 10)
      const pts = []
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 4 : 10
        const ang = (i / 10) * TAU
        pts.push([Math.cos(ang) * r, Math.sin(ang) * r])
      }
      poly(ctx, pts, '#ffd84a', '#c48a00', 2)
      ctx.restore()
      return
    }
    case 'lettuce':
      circle(ctx, 0, 0, 10, '#b5ea8a', INK, 2.5)
      line(ctx, [
        [-5, -2],
        [5, 3],
      ], '#6fb34a', 2)
      return
    case 'kernel':
      ellipse(ctx, 0, 0, 6, 7, '#ffe066', '#b88a00', 2)
      return
    case 'butter':
      ellipse(ctx, 0, 0, 11, 8, '#c8833a', '#7a4a1a', 2.5)
      circle(ctx, -3, -3, 3, '#e8b06a', null)
      return
    case 'melon':
    case 'frostmelon':
      ellipse(ctx, 0, 0, 15, 12, s.kind === 'melon' ? '#4caf50' : '#9fe6ff', INK, 2.5)
      for (const sx of [-8, 0, 8]) line(ctx, [
        [sx, -10],
        [sx, 10],
      ], s.kind === 'melon' ? '#2e7d32' : '#4aa3cf', 3)
      return
    case 'phone': // (the catapult's ammo: a rock)
      ctx.save()
      ctx.rotate(t * 8)
      poly(ctx, [[-9, -4], [-3, -10], [7, -8], [10, 2], [2, 9], [-8, 6]], '#8a8a8a', INK, 2)
      circle(ctx, -2, -3, 2, '#aaa', null)
      ctx.restore()
      return
    case 'cob':
      ctx.save()
      ctx.rotate(Math.PI / 2)
      rr(ctx, -10, -26, 20, 52, 10, '#ffd84a', '#b88a00', 3)
      ctx.restore()
      return
    case 'roll':
      ctx.save()
      if (s.big) ctx.scale(2, 2)
      ctx.rotate(s.spin ?? 0)
      ellipse(ctx, 0, 0, 24, 24, s.boom ? '#c42c2c' : '#7a4a28')
      for (const ex of [-8, 8]) circle(ctx, ex, -6, 4, '#3a1e0e', INK, 1.5)
      ellipse(ctx, 0, 8, 3, 2.5, '#3a1e0e', INK, 1.5)
      ctx.restore()
      return
    case 'van':
      rr(ctx, -44, -40, 88, 44, 8, '#e8e2d6')
      rr(ctx, -40, -34, 22, 14, 2, '#7fe0ff', INK, 2)
      rr(ctx, -14, -20, 40, 8, 2, '#b8322b', null)
      for (const wx of [-26, 26]) circle(ctx, wx, 4, 10, '#2a2d34')
      return
  }
}
export function drawGrave(ctx, t, seed) {
  ctx.save()
  ctx.rotate(Math.sin(seed) * 0.08)
  ctx.beginPath()
  ctx.moveTo(-20, 0)
  ctx.lineTo(-20, -36)
  ctx.arc(0, -36, 20, Math.PI, 0)
  ctx.lineTo(20, 0)
  ctx.closePath()
  path(ctx, '#8a8f9a')
  // a "no signal" icon carved in
  for (let i = 0; i < 4; i++) rr(ctx, -12 + i * 6, -16 - i * 5, 4, 6 + i * 5, 1, i < 1 ? '#4a4f5a' : 'rgba(74,79,90,.35)', null)
  line(ctx, [
    [-14, -40],
    [12, -18],
  ], '#c33', 2.5)
  ellipse(ctx, 0, 0, 26, 5, '#5a4030', INK, 2)
  ctx.restore()
}
export function drawVase(ctx, v, t) {
  ctx.beginPath()
  ctx.moveTo(-12, -60)
  ctx.lineTo(12, -60)
  ctx.bezierCurveTo(14, -50, 30, -40, 26, -18)
  ctx.bezierCurveTo(22, -2, -22, -2, -26, -18)
  ctx.bezierCurveTo(-30, -40, -14, -50, -12, -60)
  ctx.closePath()
  path(ctx, v.leaf ? '#cfe8b8' : '#d8c7a8')
  line(ctx, [
    [-22, -30],
    [22, -30],
  ], '#a8885a', 3)
  if (v.leaf) leaf(ctx, -4, -40, 16, -0.4, '#5fbf4a')
  else {
    ctx.font = PIXEL_FONT(16)
    ctx.fillStyle = '#a8885a'
    ctx.textAlign = 'center'
    ctx.fillText('?', 0, -36)
  }
}
export function drawMower(ctx, kind, t, running) {
  if (kind === 'pool') {
    ellipse(ctx, 0, -10, 26, 12, '#5fd3ff')
    rr(ctx, -10, -26, 20, 12, 4, '#ff8a3d')
    return
  }
  if (kind === 'roof') {
    rr(ctx, -24, -24, 48, 20, 8, '#ffd23f')
    for (let i = 0; i < 6; i++) line(ctx, [
      [-22 + i * 9, -4],
      [-24 + i * 9, 6],
    ], '#a8885a', 2)
    circle(ctx, 0, -28, 6, '#ff4d4d', INK, 2)
    return
  }
  // a red push mower
  const shake = running ? Math.sin(t * 60) * 1.2 : 0
  ctx.save()
  ctx.translate(0, shake)
  line(ctx, [
    [-14, -22],
    [-34, -52],
  ], '#5a5a5a', 4)
  line(ctx, [
    [-40, -52],
    [-28, -52],
  ], '#2a2a2a', 6)
  rr(ctx, -22, -28, 46, 20, 8, '#d8322a')
  rr(ctx, -14, -36, 26, 10, 4, '#e84a3a')
  rr(ctx, -6, -42, 10, 8, 2, '#3a3a3a')
  for (const wx of [-14, 16]) {
    circle(ctx, wx, -6, 8, '#2a2a2a')
    circle(ctx, wx, -6, 3, '#c9ced6', null)
  }
  ctx.restore()
}
export function drawRake(ctx) {
  line(ctx, [
    [-30, -4],
    [20, -4],
  ], '#8a6a3a', 4)
  for (let i = 0; i < 6; i++) line(ctx, [
    [20, -14 + i * 4],
    [28, -14 + i * 4],
  ], '#9aa3ad', 2)
  line(ctx, [
    [20, -16],
    [20, 8],
  ], '#9aa3ad', 3)
}
export function drawReward(ctx, kind, unlock, t) {
  ctx.save()
  ctx.globalAlpha = 0.4 + Math.sin(t * 4) * 0.15
  circle(ctx, 0, 0, 44, '#fff8b0', null)
  ctx.globalAlpha = 1
  if (kind === 'plant' && unlock) {
    rr(ctx, -26, -34, 52, 66, 6, '#f3ecd2', '#8a6a2a', 3)
    ctx.save()
    ctx.translate(0, 18)
    ctx.scale(0.5, 0.5)
    drawPlant(ctx, unlock, null, t)
    ctx.restore()
  } else if (kind === 'trophy') {
    poly(ctx, [
      [-22, -30],
      [22, -30],
      [14, 2],
      [-14, 2],
    ], '#ffd23f', '#a87a00', 3)
    rr(ctx, -6, 2, 12, 14, 2, '#ffd23f', '#a87a00', 3)
    rr(ctx, -18, 16, 36, 8, 3, '#a87a00', '#7a5a00', 2)
  } else if (kind === 'note') {
    rr(ctx, -24, -30, 48, 58, 3, '#fff', '#8a8f9a', 2)
    for (let i = 0; i < 5; i++) line(ctx, [
      [-16, -18 + i * 9],
      [16, -18 + i * 9],
    ], '#9aa3ad', 2)
  } else if (kind === 'shovel') {
    ctx.rotate(0.6)
    line(ctx, [
      [0, -30],
      [0, 10],
    ], '#8a6a3a', 5)
    poly(ctx, [
      [-12, 8],
      [12, 8],
      [8, 28],
      [-8, 28],
    ], '#c9ced6')
  } else {
    // a money bag
    ctx.beginPath()
    ctx.moveTo(-8, -26)
    ctx.lineTo(8, -26)
    ctx.lineTo(4, -18)
    ctx.bezierCurveTo(30, -10, 30, 24, 0, 26)
    ctx.bezierCurveTo(-30, 24, -30, -10, -4, -18)
    ctx.closePath()
    path(ctx, '#c9a86a')
    ctx.font = PIXEL_FONT(24)
    ctx.fillStyle = '#5a7a2a'
    ctx.textAlign = 'center'
    ctx.fillText('$', 0, 12)
  }
  ctx.restore()
}
