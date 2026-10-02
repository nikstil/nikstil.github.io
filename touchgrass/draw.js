// TOUCHGRASS.EXE: draws a game (sim.js) onto a canvas: the area, the seed bank, plants,
// Scrollers, shots, sun, fog and banners. Everything is in a fixed 960×620 space; app.js scales
// the canvas to fit.

import { PLANT_BY_ID } from './data.js'
import { INK, circle, rr, drawPlant, drawShellFront, drawZombie, drawSun, drawCoin, drawShot, drawGrave, drawVase, drawMower, drawRake, drawReward, algorithmBot } from './art.js'

export const W = 960
export const H = 620
export const BANK = { x: 6, y: 4, h: 86, sunW: 74, seedX: 88, seedW: 56, seedGap: 4, shovelW: 64 }

/** Where the lawn is: x0/y0 its top-left corner, tw/th one tile. */
export function layout(g) {
  const rows = g?.rows ?? 5
  const th = 500 / rows
  return { x0: 112, y0: 100, tw: 82, th, rows }
}
/** Screen → lawn: { x (tiles), y (rows, fractional), r, c } or null outside the lawn. */
export function toLawn(g, px, py) {
  const L = layout(g)
  const x = (px - L.x0) / L.tw
  const y = (py - L.y0) / L.th - 0.5
  const c = Math.floor(x)
  const r = Math.floor((py - L.y0) / L.th)
  return { x, y, r, c, inside: c >= 0 && c < 9 && r >= 0 && r < L.rows }
}
export function seedRect(i) {
  return { x: BANK.seedX + i * (BANK.seedW + BANK.seedGap), y: BANK.y + 6, w: BANK.seedW, h: 74 }
}
export function shovelRect(g) {
  const n = g.belt ? 10 : Math.max(6, g.seeds.length)
  return { x: BANK.seedX + n * (BANK.seedW + BANK.seedGap) + 8, y: BANK.y + 6, w: BANK.shovelW, h: 74 }
}
export function beltRect(i, item) {
  return { x: BANK.seedX + item.x * (BANK.seedW + BANK.seedGap), y: BANK.y + 8, w: BANK.seedW, h: 70 }
}

// ================= Backgrounds =================
const bgCache = new Map()
function background(g) {
  const key = `${g.level.area}:${g.rows}:${(g.sod ?? []).join('')}:${g.special}`
  if (bgCache.has(key)) return bgCache.get(key)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  paintBackground(ctx, g)
  bgCache.set(key, c)
  return c
}
function paintBackground(ctx, g) {
  const area = g.area
  const L = layout(g)
  const night = area.night
  // sky / street beyond the lawn
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  if (area.roof) {
    sky.addColorStop(0, '#8fd0ff')
    sky.addColorStop(1, '#d8f0ff')
  } else if (night) {
    sky.addColorStop(0, '#0b1430')
    sky.addColorStop(1, '#1b2a4a')
  } else {
    sky.addColorStop(0, '#9fd8ff')
    sky.addColorStop(1, '#e6f6ff')
  }
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  if (area.roof) return paintRoof(ctx, g, L)

  // the street on the right
  ctx.fillStyle = night ? '#2a2f3a' : '#8a8f9a'
  ctx.fillRect(L.x0 + 9 * L.tw + 18, L.y0 - 10, W, H)
  ctx.fillStyle = night ? '#3a404c' : '#b8bec8'
  ctx.fillRect(L.x0 + 9 * L.tw + 4, L.y0 - 10, 16, H)
  ctx.strokeStyle = night ? '#5a5f6a' : '#f2f2f2'
  ctx.setLineDash([18, 16])
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(W - 34, L.y0)
  ctx.lineTo(W - 34, H)
  ctx.stroke()
  ctx.setLineDash([])

  // the lawn: diagonal mowing stripes in two greens, flowers here and there
  for (let r = 0; r < g.rows; r++) {
    const water = g.isWater(r)
    const sod = !g.sod || g.sod.includes(r)
    for (let col = 0; col < 9; col++) {
      const x = L.x0 + col * L.tw
      const y = L.y0 + r * L.th
      if (water) {
        ctx.fillStyle = night ? ((r + col) % 2 ? '#1f4f6a' : '#245a78') : (r + col) % 2 ? '#3fb8e0' : '#4cc4ea'
        ctx.fillRect(x, y, L.tw, L.th)
        continue
      }
      if (!sod) {
        ctx.fillStyle = night ? '#3a3020' : '#a8865a'
        ctx.fillRect(x, y, L.tw, L.th)
        ctx.fillStyle = night ? '#433826' : '#b8966a'
        for (let i = 0; i < 6; i++) ctx.fillRect(x + ((i * 37) % L.tw), y + ((i * 53) % L.th), 6, 3)
        continue
      }
      const even = (r + col) % 2 === 0
      ctx.fillStyle = night ? (even ? '#1f4a33' : '#24563b') : even ? '#5cc46a' : '#6fd27b'
      ctx.fillRect(x, y, L.tw, L.th)
      // mowing stripes
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, L.tw, L.th)
      ctx.clip()
      ctx.strokeStyle = night ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.12)'
      ctx.lineWidth = 8
      for (let k = -L.th; k < L.tw; k += 22) {
        ctx.beginPath()
        ctx.moveTo(x + k, y + L.th)
        ctx.lineTo(x + k + L.th, y)
        ctx.stroke()
      }
      ctx.restore()
      // a daisy now and then
      if ((r * 7 + col * 13) % 9 === 0) {
        circle(ctx, x + 14 + ((col * 31) % 50), y + L.th - 16, 3, night ? '#9aa' : '#fff', null)
        circle(ctx, x + 14 + ((col * 31) % 50), y + L.th - 16, 1.4, '#ffd23f', null)
      }
    }
    // pool edges
    if (water) {
      ctx.fillStyle = night ? '#6a7a8a' : '#e8eef2'
      if (!g.isWater(r - 1)) ctx.fillRect(L.x0 - 4, L.y0 + r * L.th - 3, 9 * L.tw + 8, 6)
      if (!g.isWater(r + 1)) ctx.fillRect(L.x0 - 4, L.y0 + (r + 1) * L.th - 3, 9 * L.tw + 8, 6)
      ctx.strokeStyle = 'rgba(255,255,255,.25)'
      ctx.lineWidth = 2
      for (let i = 0; i < 9; i++) {
        ctx.beginPath()
        ctx.moveTo(L.x0 + i * L.tw + 10, L.y0 + r * L.th + L.th / 2)
        ctx.quadraticCurveTo(L.x0 + i * L.tw + 30, L.y0 + r * L.th + L.th / 2 - 6, L.x0 + i * L.tw + 50, L.y0 + r * L.th + L.th / 2)
        ctx.stroke()
      }
    }
  }
  // a fence along the top
  ctx.fillStyle = night ? '#4a3a2a' : '#f2e6d0'
  for (let x = L.x0 - 10; x < L.x0 + 9 * L.tw + 10; x += 22) {
    ctx.beginPath()
    ctx.moveTo(x, L.y0 - 2)
    ctx.lineTo(x, L.y0 - 34)
    ctx.lineTo(x + 8, L.y0 - 42)
    ctx.lineTo(x + 16, L.y0 - 34)
    ctx.lineTo(x + 16, L.y0 - 2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
  // night: a moon and stars
  if (night) {
    for (let i = 0; i < 40; i++) circle(ctx, (i * 197) % W, (i * 89) % 60 + 4, 1.2, '#fff', null)
    circle(ctx, W - 80, 40, 22, '#f6f2d8', null)
    circle(ctx, W - 70, 34, 20, '#1b2a4a', null)
  }
  paintHouse(ctx, g, L)
}
function paintHouse(ctx, g, L) {
  const night = g.area.night
  // a pastel house wall with a door, and the Wi-Fi router everyone's after
  ctx.fillStyle = night ? '#4a4060' : '#f7d6e0'
  ctx.fillRect(0, L.y0 - 30, L.x0 - 34, H)
  ctx.fillStyle = night ? '#3a3050' : '#eec4d2'
  for (let y = L.y0 - 30; y < H; y += 18) ctx.fillRect(0, y, L.x0 - 34, 2)
  // porch
  ctx.fillStyle = night ? '#5a4a3a' : '#c8a070'
  ctx.fillRect(L.x0 - 34, L.y0 - 30, 30, H)
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.strokeRect(L.x0 - 34, L.y0 - 30, 30, H)
  // the door
  rr(ctx, 12, L.y0 + 2.2 * L.th - 40, 46, 110, 6, night ? '#2a3a6a' : '#5a8ad8')
  circle(ctx, 50, L.y0 + 2.2 * L.th + 18, 3.5, '#ffd23f', INK, 1.5)
  // the router
  rr(ctx, 14, L.y0 + 0.6 * L.th, 46, 18, 4, '#f2f2f2')
  for (const ax of [20, 36, 52]) {
    ctx.strokeStyle = INK
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(ax, L.y0 + 0.6 * L.th)
    ctx.lineTo(ax - 2, L.y0 + 0.6 * L.th - 18)
    ctx.stroke()
  }
  for (let i = 0; i < 4; i++) circle(ctx, 22 + i * 9, L.y0 + 0.6 * L.th + 9, 2, i % 2 ? '#3fe06a' : '#7fe0ff', null)
  ctx.font = 'bold 9px Verdana, sans-serif'
  ctx.fillStyle = night ? '#ccc' : '#6a5a6a'
  ctx.textAlign = 'center'
  ctx.fillText('WI-FI', 37, L.y0 + 0.6 * L.th + 34)
}
function paintRoof(ctx, g, L) {
  // a roof with solar panels; the left five columns slope up
  ctx.fillStyle = '#c8d6e6'
  ctx.fillRect(0, 0, W, 90)
  for (let r = 0; r < g.rows; r++) {
    for (let col = 0; col < 9; col++) {
      const x = L.x0 + col * L.tw
      const y = L.y0 + r * L.th
      const slope = col < 5
      ctx.fillStyle = slope ? ((r + col) % 2 ? '#4a5878' : '#53628a') : (r + col) % 2 ? '#5a6a8a' : '#64759a'
      ctx.fillRect(x, y, L.tw, L.th)
      if (!slope && (r + col) % 3 === 0) {
        // a solar panel
        rr(ctx, x + 8, y + 12, L.tw - 16, L.th - 28, 3, '#1f3a6a', '#9ab0d0', 2)
        ctx.strokeStyle = '#3a5a9a'
        ctx.lineWidth = 1
        for (let k = 1; k < 3; k++) {
          ctx.beginPath()
          ctx.moveTo(x + 8 + ((L.tw - 16) * k) / 3, y + 12)
          ctx.lineTo(x + 8 + ((L.tw - 16) * k) / 3, y + L.th - 16)
          ctx.stroke()
        }
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,.18)'
        ctx.lineWidth = 2
        for (let k = 1; k < 4; k++) {
          ctx.beginPath()
          ctx.moveTo(x, y + (L.th * k) / 4)
          ctx.lineTo(x + L.tw, y + (L.th * k) / 4)
          ctx.stroke()
        }
      }
    }
  }
  // the ridge where the slope ends
  ctx.fillStyle = '#3a4560'
  ctx.fillRect(L.x0 + 5 * L.tw - 3, L.y0, 6, 5 * L.th)
  // the chimney / house side on the left
  ctx.fillStyle = '#b8603a'
  ctx.fillRect(0, L.y0 - 20, L.x0 - 6, H)
  for (let y = L.y0 - 20; y < H; y += 14) for (let x = (y / 14) % 2 ? 0 : 14; x < L.x0 - 6; x += 28) {
    ctx.strokeStyle = '#8a4020'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, 28, 14)
  }
  // the street far below, on the right
  ctx.fillStyle = '#9fb3c8'
  ctx.fillRect(L.x0 + 9 * L.tw + 4, L.y0 - 10, W, H)
}

// ================= The scene =================
/**
 * ui: { hover: {r, c, inside}, mouse: {x, y}, holding: { id, from: 'seed'|'belt', index } |
 * { tool: 'shovel' | 'cannon' | 'mallet' }, banners: [{ text, kind, until }], now, paused,
 * shovel: whether the shovel is unlocked, flash: lawn cell to flash }
 */
export function drawGame(ctx, g, ui) {
  const L = layout(g)
  const t = g.t
  ctx.drawImage(background(g), 0, 0)

  // ground details: craters, slush, ladders, rakes
  for (const cr of g.craters) {
    if (cr.until <= t) continue
    const x = L.x0 + (cr.col + 0.5) * L.tw
    const y = L.y0 + (cr.row + 0.7) * L.th
    ctx.fillStyle = 'rgba(40,25,15,.85)'
    ctx.beginPath()
    ctx.ellipse(x, y, L.tw * 0.42, L.th * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let r = 0; r < g.rows; r++) {
    const ice = g.ice[r]
    if (ice.start === Infinity) continue
    const x = L.x0 + Math.max(0, ice.start) * L.tw
    ctx.fillStyle = 'rgba(160,220,255,.75)'
    ctx.fillRect(x, L.y0 + r * L.th + L.th * 0.55, L.x0 + 9 * L.tw + 30 - x, L.th * 0.4)
  }
  for (const rk of g.rakes ?? []) {
    if (rk.used) continue
    ctx.save()
    ctx.translate(L.x0 + rk.x * L.tw, L.y0 + (rk.row + 0.85) * L.th)
    drawRake(ctx)
    ctx.restore()
  }

  const ps = L.th * 0.78 / 80 // plant scale
  const zs = (L.th * 1.12) / 120 // Scroller scale

  // rows, top to bottom (lower rows overlap higher ones)
  for (let r = 0; r < g.rows; r++) {
    const rowY = L.y0 + (r + 1) * L.th - L.th * 0.1
    for (const gr of g.graves) if (gr.row === r) {
      ctx.save()
      ctx.translate(L.x0 + (gr.col + 0.5) * L.tw, rowY)
      ctx.scale(ps, ps)
      drawGrave(ctx, t, gr.id)
      ctx.restore()
    }
    for (const v of g.vases) if (v.row === r) {
      ctx.save()
      ctx.translate(L.x0 + (v.col + 0.5) * L.tw, rowY)
      ctx.scale(ps, ps)
      drawVase(ctx, v, t)
      ctx.restore()
    }
    for (const key of g.ladders) {
      const [lr, lc] = key.split(',').map(Number)
      if (lr !== r) continue
      ctx.save()
      ctx.translate(L.x0 + (lc + 0.75) * L.tw, rowY)
      ctx.strokeStyle = '#c9ced6'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(-8, 0)
      ctx.lineTo(4, -L.th * 0.8)
      ctx.moveTo(8, 0)
      ctx.lineTo(18, -L.th * 0.8)
      for (let k = 1; k < 5; k++) {
        ctx.moveTo(-8 + k * 2.4, -k * L.th * 0.16)
        ctx.lineTo(8 + k * 2, -k * L.th * 0.16)
      }
      ctx.stroke()
      ctx.restore()
    }
    // plants in this row
    for (let col = 0; col < 9; col++) {
      const ce = g.cells[r][col]
      const x = L.x0 + (col + 0.5) * L.tw
      let y = rowY
      const water = g.isWater(r)
      if (ce.base && ce.base.col === col) drawP(ctx, ce.base, x, y + (water ? 2 : 0), ps, t)
      if (ce.base) y -= (ce.base.def.base === 'roof' ? 26 : 6) * ps
      if (ce.shell && ce.shell.col === col) drawP(ctx, ce.shell, x, y, ps, t)
      if (ce.main && ce.main.col === col) {
        const p = ce.main
        drawP(ctx, p, x, y + (p.def.aquatic && water && !ce.base ? 4 : 0), ps, t)
      }
      if (ce.coffee) drawP(ctx, ce.coffee, x + 10, y - 40 * ps, ps * 0.8, t)
      if (ce.shell && ce.shell.col === col) {
        ctx.save()
        ctx.translate(x, y)
        ctx.scale(ps, ps)
        drawShellFront(ctx, ce.shell)
        ctx.restore()
      }
    }
    // Scrollers in this row, back to front
    const zsRow = g.zombies.filter((z) => z.row === r && !z.gone).sort((a, b) => b.x - a.x)
    for (const z of zsRow) drawZ(ctx, g, z, L, zs, t)
    // mowers
    for (const m of g.mowers) if (m.row === r && m.state !== 'used') {
      ctx.save()
      ctx.translate(L.x0 + m.x * L.tw, rowY)
      ctx.scale(ps, ps)
      drawMower(ctx, m.kind, t, m.state === 'running')
      ctx.restore()
    }
  }

  // the boss
  if (g.boss && g.boss.state !== 'gone') {
    ctx.save()
    ctx.translate(L.x0 + 7.9 * L.tw, L.y0 + 5 * L.th)
    ctx.scale(0.62, 0.62)
    algorithmBot(ctx, t, g.boss)
    ctx.restore()
    if (g.boss.ball) {
      const b = g.boss.ball
      ctx.save()
      ctx.translate(L.x0 + b.x * L.tw, L.y0 + (b.row + 0.55) * L.th)
      ctx.rotate(-t * 6)
      circle(ctx, 0, 0, 30, b.kind === 'fire' ? '#ff6a1f' : '#9fe6ff', b.kind === 'fire' ? '#c23a00' : '#2a8ab0', 4)
      circle(ctx, -8, -8, 10, b.kind === 'fire' ? '#ffd84a' : '#fff', null)
      ctx.restore()
    }
  }

  // shots
  for (const s of g.shots) {
    if (s.kind === 'cob') {
      const k = Math.min(1, s.k ?? 0)
      const fx = L.x0 + (s.from.x + (s.tx - s.from.x) * k) * L.tw
      const fy = L.y0 + (s.from.y + 0.5 + (s.ty - s.from.y) * k) * L.th - Math.sin(k * Math.PI) * 420
      ctx.save()
      ctx.translate(fx, fy)
      drawShot(ctx, s, t)
      ctx.restore()
      // where it'll land
      ctx.strokeStyle = 'rgba(255,60,60,.6)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(L.x0 + s.tx * L.tw, L.y0 + (s.ty + 0.6) * L.th, 30, 12, 0, 0, Math.PI * 2)
      ctx.stroke()
      continue
    }
    const sx = L.x0 + s.x * L.tw
    let sy = L.y0 + (s.y + 0.42) * L.th
    if (s.lob || s.kind === 'phone') sy -= (s.h ?? 0) * L.th
    if (s.kind === 'roll') sy = L.y0 + (s.y + 0.7) * L.th
    if (s.kind === 'van') sy = L.y0 + (s.y + 0.85) * L.th
    ctx.save()
    ctx.translate(sx, sy)
    ctx.scale(L.th / 100 + 0.1, L.th / 100 + 0.1)
    drawShot(ctx, s, t)
    ctx.restore()
  }

  // effects
  for (const f of g.fx) drawFx(ctx, g, f, L, t)

  // fog over the right of the lawn (lit up around Bulb Lanterns)
  if (g.area.fog) drawFog(ctx, g, L)

  // sun, coins and the reward
  for (const d of g.drops) {
    let x = L.x0 + d.x * L.tw
    let y = L.y0 + (d.y + 0.35) * L.th
    if (d.collected && d.collected !== 'expired') {
      // fly to the sun counter (or the coin purse)
      const k = Math.min(1, (t - d.collectedAt) / 0.6)
      const tx = d.kind === 'sun' ? BANK.x + 36 : 40
      const ty = d.kind === 'sun' ? BANK.y + 34 : H - 30
      x += (tx - x) * k
      y += (ty - y) * k
      ctx.globalAlpha = 1 - k * 0.6
    } else if (d.landed && d.life !== Infinity && t - d.landedAt > d.life - 3) ctx.globalAlpha = Math.floor(t * 6) % 2 ? 0.45 : 1
    ctx.save()
    ctx.translate(x, y)
    if (d.kind === 'sun') drawSun(ctx, t, d.small)
    else if (d.kind === 'coin') drawCoin(ctx, d.coin, t)
    else drawReward(ctx, d.reward ?? 'plant', d.unlock, t)
    ctx.restore()
    ctx.globalAlpha = 1
  }

  // what you're holding, over the tile it would go on
  drawHolding(ctx, g, ui, L, ps)

  drawBank(ctx, g, ui)
  drawProgress(ctx, g)
  drawBanners(ctx, g, ui)
}

function drawP(ctx, p, x, y, s, t) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  if (p.hitAt != null && t - p.hitAt < 0.06 && ctx.filter !== undefined) ctx.filter = 'brightness(1.5)'
  drawPlant(ctx, p.type, p, t)
  ctx.restore()
}

function drawZ(ctx, g, z, L, zs, t) {
  let x = L.x0 + z.x * L.tw
  let y = L.y0 + (z.row + 1) * L.th - L.th * 0.12
  const s = zs * (z.tiny ? 0.62 : 1)
  ctx.save()
  // bungee thieves hang from a cord
  if (z.bungee) {
    let h = 0
    if (z.bungee === 'aim') {
      // a target on the ground, and the thief high above
      ctx.strokeStyle = 'rgba(255,60,60,.8)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(L.x0 + (z.col + 0.5) * L.tw, y - 6, 28, 10, 0, 0, Math.PI * 2)
      ctx.stroke()
      h = 260 + Math.max(0, z.aimUntil - g.t) * 20
    } else if (z.bungee === 'down') h = Math.max(0, 260 * (1 - (g.t - z.downAt) / 0.6))
    else h = Math.min(500, (g.t - z.upAt) * 500)
    ctx.strokeStyle = '#2a2d34'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, y - h - 110 * s)
    ctx.stroke()
    y -= h
  }
  if (z.balloon > 0) y -= 10
  // in the water, only the top half shows
  const inWater = g.isWater(z.row) && !z.bungee
  if (inWater) {
    ctx.beginPath()
    ctx.rect(x - 200, 0, 400, y - (z.type === 'floatie' || z.floatie ? 10 : 34) * s)
    ctx.clip()
  }
  ctx.translate(x, y)
  // dying: tip over and fade; ash: a dark silhouette
  if (z.dying) {
    const k = Math.min(1, (g.t - z.diedAt) / 1.2)
    if (z.dying === 'ash') {
      if (ctx.filter !== undefined) ctx.filter = 'brightness(0.15)'
      ctx.globalAlpha = 1 - k
      ctx.translate(0, k * 10)
    } else if (z.dying === 'mowed') {
      ctx.scale(1, 1 - k * 0.8)
      ctx.globalAlpha = 1 - k
    } else {
      ctx.rotate(k * 1.3)
      ctx.globalAlpha = 1 - k * k
    }
  }
  ctx.scale(s, s)
  const frozen = g.t < z.frozenUntil
  const slowed = g.t < z.slowUntil
  if (ctx.filter !== undefined && !z.dying) {
    if (frozen) ctx.filter = 'sepia(1) hue-rotate(170deg) saturate(3) brightness(1.15)'
    else if (slowed) ctx.filter = 'sepia(.6) hue-rotate(170deg) saturate(2)'
    if (z.hitAt != null && g.t - z.hitAt < 0.06) ctx.filter = (frozen || slowed ? ctx.filter + ' ' : '') + 'brightness(1.6)'
  }
  // a little hop while rising out of a grave
  if (z.state === 'rising' && z.risingUntil) {
    const k = Math.max(0, (z.risingUntil - g.t) / 1.5)
    ctx.translate(0, k * 60)
  }
  if (z.state === 'vault' || z.state === 'hop' || z.state === 'climb') {
    const k = Math.min(1, (g.t - z.moveStart) / z.moveDur)
    ctx.translate(0, -Math.sin(k * Math.PI) * (z.state === 'climb' ? 60 : 90))
  }
  if (inWater && !(z.type === 'floatie' || z.floatie) && z.type !== 'scuba') ctx.translate(0, 26)
  drawZombie(ctx, z.floatie && z.type !== 'floatie' ? z.type : z.type, z, g.t)
  if (z.floatie && z.type !== 'floatie') {
    // basic Scrollers in the pool get a flamingo float
    ctx.save()
    ctx.translate(4, -12)
    ctx.restore()
  }
  if (z.buttered && g.t < z.buttered) {
    ctx.fillStyle = '#c8833a'
    ctx.strokeStyle = INK
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(-6, -112, 16, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
  if (inWater && !z.bungee) {
    ctx.strokeStyle = 'rgba(255,255,255,.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(x, y - (z.floatie || z.type === 'floatie' ? 8 : 32) * s, 26 * s, 6 * s, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function drawFx(ctx, g, f, L, t) {
  const k = (t - f.t) / f.life
  const x = L.x0 + (f.x ?? 0) * L.tw
  const y = L.y0 + ((f.y ?? 0) + 0.5) * L.th
  ctx.save()
  ctx.globalAlpha = Math.max(0, 1 - k)
  switch (f.kind) {
    case 'splat': {
      const col = { pea: '#8be04a', frost: '#bdf0ff', fire: '#ff8a1f', spore: '#d9b8ff', star: '#ffd84a', lettuce: '#b5ea8a', kernel: '#ffe066', butter: '#c8833a', melon: '#4caf50', frostmelon: '#9fe6ff' }[f.color] ?? '#8be04a'
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3
        circle(ctx, x + Math.cos(a) * k * 18, y - 10 + Math.sin(a) * k * 18, 4 * (1 - k) + 1, col, null)
      }
      break
    }
    case 'boom':
    case 'mine':
    case 'squash': {
      const R = (f.radius ?? 0.8) * L.tw * (0.4 + k * 0.8)
      const grad = ctx.createRadialGradient(x, y, 0, x, y, R)
      grad.addColorStop(0, f.enemy ? '#fff' : '#fff6c8')
      grad.addColorStop(0.4, f.kind === 'squash' ? '#7fbf4a' : '#ff9a2a')
      grad.addColorStop(1, 'rgba(120,40,10,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.ellipse(x, y, R, R * 0.75, 0, 0, Math.PI * 2)
      ctx.fill()
      if (f.kind !== 'squash' && k < 0.3) {
        ctx.font = `bold ${30 + k * 30}px Impact, 'Arial Black', sans-serif`
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = INK
        ctx.lineWidth = 4
        ctx.textAlign = 'center'
        ctx.strokeText(f.kind === 'mine' ? 'SPUD!' : 'BOOM', x, y - 20)
        ctx.fillText(f.kind === 'mine' ? 'SPUD!' : 'BOOM', x, y - 20)
      }
      break
    }
    case 'cloud': {
      const R = 2.8 * L.tw * (0.3 + k)
      const grad = ctx.createRadialGradient(x, y, 0, x, y, R)
      grad.addColorStop(0, '#fffbe0')
      grad.addColorStop(0.3, '#ff7a2a')
      grad.addColorStop(0.7, 'rgba(90,60,60,.6)')
      grad.addColorStop(1, 'rgba(40,30,30,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, R, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'fireline': {
      const yy = L.y0 + (f.y + 0.55) * L.th
      for (let i = 0; i < 14; i++) {
        const fx = L.x0 + (i / 13) * 9.4 * L.tw
        const h = 40 + Math.sin(i * 2 + t * 20) * 14
        ctx.fillStyle = i % 2 ? '#ff8a1f' : '#ffd23f'
        ctx.beginPath()
        ctx.moveTo(fx - 28, yy + 20)
        ctx.quadraticCurveTo(fx, yy - h * (1 - k * 0.5), fx + 28, yy + 20)
        ctx.fill()
      }
      break
    }
    case 'freeze':
      ctx.globalAlpha = 0.45 * (1 - k)
      ctx.fillStyle = '#bdf0ff'
      ctx.fillRect(0, 0, W, H)
      break
    case 'fume':
    case 'gloom': {
      const len = f.kind === 'fume' ? f.len * L.tw : L.tw * 1.4
      for (let i = 0; i < 9; i++) {
        const fx = f.kind === 'fume' ? x + (i / 8) * len * Math.min(1, k * 3) : x + Math.cos(i * 0.7) * len * Math.min(1, k * 3)
        const fy = f.kind === 'fume' ? y - 14 + Math.sin(i * 2) * 6 : y - 10 + Math.sin(i * 0.7) * len * 0.8 * Math.min(1, k * 3)
        circle(ctx, fx, fy, 12 + i, f.kind === 'fume' ? 'rgba(190,160,220,.5)' : 'rgba(120,80,160,.5)', null)
      }
      break
    }
    case 'drop':
      ctx.font = 'bold 12px Verdana, sans-serif'
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = INK
      ctx.lineWidth = 3
      ctx.textAlign = 'center'
      ctx.strokeText(f.item ?? '', x + 10, y - 60 - k * 30)
      ctx.fillText(f.item ?? '', x + 10, y - 60 - k * 30)
      break
    case 'smash':
    case 'shards':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        ctx.fillStyle = f.kind === 'shards' ? '#d8c7a8' : '#6b4a2e'
        ctx.fillRect(x + Math.cos(a) * k * 40, y + Math.sin(a) * k * 30 - 10, 6, 6)
      }
      break
    case 'whack':
      ctx.font = 'bold 26px Impact, sans-serif'
      ctx.fillStyle = '#ffd23f'
      ctx.strokeStyle = INK
      ctx.lineWidth = 4
      ctx.textAlign = 'center'
      ctx.strokeText('WHACK!', x, y - 50)
      ctx.fillText('WHACK!', x, y - 50)
      break
    case 'bonk':
    case 'bounce':
      ctx.font = 'bold 18px Impact, sans-serif'
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = INK
      ctx.lineWidth = 3
      ctx.textAlign = 'center'
      ctx.strokeText(f.kind === 'bonk' ? 'BONK' : 'BOING', x, y - 70 - k * 20)
      ctx.fillText(f.kind === 'bonk' ? 'BONK' : 'BOING', x, y - 70 - k * 20)
      break
    case 'stomp':
      for (const r of f.rows) {
        ctx.fillStyle = 'rgba(80,60,40,.5)'
        ctx.beginPath()
        ctx.ellipse(L.x0 + 6 * L.tw, L.y0 + (r + 0.7) * L.th, L.tw * 1.4 * (0.5 + k), 16, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      break
  }
  ctx.restore()
}

const fogCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
function drawFog(ctx, g, L) {
  if (g.t < g.fogClearUntil) {
    // fog drifting back in at the end
    const left = g.fogClearUntil - g.t
    if (left > 3) return
  }
  const fc = fogCanvas
  fc.width = W
  fc.height = H
  const f = fc.getContext('2d')
  const start = 9 - g.area.fog
  const left = L.x0 + start * L.tw - 20
  const grad = f.createLinearGradient(left, 0, left + 60, 0)
  grad.addColorStop(0, 'rgba(200,210,225,0)')
  grad.addColorStop(1, 'rgba(200,210,225,.97)')
  f.fillStyle = grad
  f.fillRect(left, L.y0 - 20, W - left, g.rows * L.th + 40)
  // puffs, so it looks like fog and not a wall
  for (let i = 0; i < 24; i++) {
    const px = left + 30 + ((i * 97 + g.t * 6) % (W - left))
    const py = L.y0 + ((i * 61) % (g.rows * L.th))
    f.fillStyle = 'rgba(225,232,242,.6)'
    f.beginPath()
    f.arc(px, py, 40 + (i % 3) * 12, 0, Math.PI * 2)
    f.fill()
  }
  // lanterns cut holes in it
  f.globalCompositeOperation = 'destination-out'
  for (const p of g.plants) {
    if (p.def.kind !== 'lantern') continue
    const cx = L.x0 + (p.col + 0.5) * L.tw
    const cy = L.y0 + (p.row + 0.5) * L.th
    const R = p.def.light * L.tw
    const rg = f.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 1.1)
    rg.addColorStop(0, 'rgba(0,0,0,1)')
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    f.fillStyle = rg
    f.beginPath()
    f.arc(cx, cy, R * 1.1, 0, Math.PI * 2)
    f.fill()
  }
  f.globalCompositeOperation = 'source-over'
  if (g.t < g.fogClearUntil) ctx.globalAlpha = 1 - (g.fogClearUntil - g.t) / 3
  ctx.drawImage(fc, 0, 0)
  ctx.globalAlpha = 1
}

function drawHolding(ctx, g, ui, L, ps) {
  const h = ui.holding
  if (!h || !ui.mouse) return
  const hv = ui.hover
  if (h.id) {
    if (hv?.inside) {
      const ok = h.id.startsWith('bowl') ? hv.c <= 2 : !g.whyNot(h.id, hv.r, hv.c)
      if (ok) {
        const ce = g.cells[hv.r][hv.c]
        let y = L.y0 + (hv.r + 1) * L.th - L.th * 0.1
        if (ce.base && !PLANT_BY_ID[h.id]?.base) y -= (ce.base.def.base === 'roof' ? 26 : 6) * ps
        ctx.save()
        ctx.globalAlpha = 0.45
        ctx.translate(L.x0 + (hv.c + 0.5) * L.tw, y)
        ctx.scale(ps, ps)
        if (h.id.startsWith('bowl')) drawShot(ctx, { kind: 'roll', boom: h.id === 'bowlBoom', big: h.id === 'bowlBig' }, 0)
        else drawPlant(ctx, h.id, null, g.t)
        ctx.restore()
      }
    }
    ctx.save()
    ctx.translate(ui.mouse.x, ui.mouse.y + 20)
    ctx.scale(ps * 0.8, ps * 0.8)
    if (h.id.startsWith('bowl')) drawShot(ctx, { kind: 'roll', boom: h.id === 'bowlBoom', big: h.id === 'bowlBig' }, 0)
    else drawPlant(ctx, h.id, { imitated: h.imitated }, g.t)
    ctx.restore()
    return
  }
  if (h.tool === 'shovel') {
    if (hv?.inside) {
      ctx.fillStyle = 'rgba(255,255,255,.25)'
      ctx.fillRect(L.x0 + hv.c * L.tw, L.y0 + hv.r * L.th, L.tw, L.th)
    }
    ctx.save()
    ctx.translate(ui.mouse.x, ui.mouse.y)
    drawShovelIcon(ctx)
    ctx.restore()
    return
  }
  if (h.tool === 'cannon') {
    ctx.strokeStyle = 'rgba(255,40,40,.9)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(ui.mouse.x, ui.mouse.y, 26, 0, Math.PI * 2)
    ctx.moveTo(ui.mouse.x - 36, ui.mouse.y)
    ctx.lineTo(ui.mouse.x + 36, ui.mouse.y)
    ctx.moveTo(ui.mouse.x, ui.mouse.y - 36)
    ctx.lineTo(ui.mouse.x, ui.mouse.y + 36)
    ctx.stroke()
  }
  if (h.tool === 'mallet') {
    ctx.save()
    ctx.translate(ui.mouse.x, ui.mouse.y)
    ctx.rotate(ui.malletDown ? 0.2 : -0.5)
    rr(ctx, -6, 0, 12, 50, 4, '#8a6a3a')
    rr(ctx, -26, -18, 52, 26, 8, '#c42c2c')
    ctx.restore()
  }
}
export function drawShovelIcon(ctx) {
  ctx.save()
  ctx.rotate(-0.7)
  rr(ctx, -3, -34, 6, 34, 2, '#8a6a3a')
  rr(ctx, -9, -40, 18, 8, 3, '#8a6a3a')
  ctx.beginPath()
  ctx.moveTo(-12, 0)
  ctx.lineTo(12, 0)
  ctx.lineTo(8, 22)
  ctx.quadraticCurveTo(0, 30, -8, 22)
  ctx.closePath()
  ctx.fillStyle = '#c9ced6'
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.restore()
}

// ================= The seed bank =================
export function drawPacket(ctx, id, x, y, w, h, { cost = null, ready = 1, affordable = true, selected = false, imitated = false, t = 0 } = {}) {
  ctx.save()
  ctx.translate(x, y + (selected ? -4 : 0))
  rr(ctx, 0, 0, w, h, 6, imitated ? '#d6d6d6' : '#f6eccb', '#8a6a2a', 2.5)
  rr(ctx, 4, 4, w - 8, h - (cost != null ? 24 : 8), 4, imitated ? '#bfc3c8' : '#bfe39a', null)
  ctx.save()
  ctx.beginPath()
  ctx.rect(4, 4, w - 8, h - (cost != null ? 24 : 8))
  ctx.clip()
  ctx.translate(w / 2, h - (cost != null ? 24 : 8) + 2)
  const s = id.startsWith('bowl') ? 0.5 : 0.48
  ctx.scale(s, s)
  if (id.startsWith('bowl')) {
    ctx.translate(0, -30)
    drawShot(ctx, { kind: 'roll', boom: id === 'bowlBoom', big: false }, 0)
  } else drawPlant(ctx, id, imitated ? { imitated: true } : null, t)
  ctx.restore()
  if (cost != null) {
    ctx.font = 'bold 13px Verdana, sans-serif'
    ctx.fillStyle = affordable ? INK : '#b33'
    ctx.textAlign = 'center'
    ctx.fillText(String(cost), w / 2, h - 7)
  }
  if (ready < 1) {
    ctx.fillStyle = 'rgba(20,20,30,.55)'
    ctx.fillRect(2, 2, w - 4, (h - 4) * (1 - ready))
  }
  if (!affordable && ready >= 1) {
    ctx.fillStyle = 'rgba(20,20,30,.3)'
    ctx.fillRect(2, 2, w - 4, h - 4)
  }
  if (selected) {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.strokeRect(1, 1, w - 2, h - 2)
  }
  ctx.restore()
}

function drawBank(ctx, g, ui) {
  const n = g.belt ? 10 : Math.max(6, g.seeds.length)
  const width = BANK.seedX + n * (BANK.seedW + BANK.seedGap) + (ui.shovel ? BANK.shovelW + 16 : 8)
  rr(ctx, BANK.x, BANK.y, width, BANK.h, 10, '#7a5230', INK, 3)
  rr(ctx, BANK.x + 4, BANK.y + 4, width - 8, BANK.h - 8, 8, '#93663c', null)
  // the sun counter (no sun on belt levels)
  if (!g.belt) {
    rr(ctx, BANK.x + 6, BANK.y + 6, BANK.sunW, BANK.h - 12, 8, '#f6eccb', '#8a6a2a', 2)
    ctx.save()
    ctx.translate(BANK.x + 6 + BANK.sunW / 2, BANK.y + 32)
    ctx.scale(0.75, 0.75)
    drawSun(ctx, g.t)
    ctx.restore()
    ctx.font = 'bold 16px Verdana, sans-serif'
    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.fillText(String(g.sun), BANK.x + 6 + BANK.sunW / 2, BANK.y + BANK.h - 14)
  }
  if (g.belt) {
    // a conveyor belt
    const x0 = BANK.seedX - 4
    const x1 = BANK.seedX + 10 * (BANK.seedW + BANK.seedGap)
    rr(ctx, x0, BANK.y + 6, x1 - x0, 74, 6, '#4a4f5a', INK, 2)
    ctx.strokeStyle = '#6a707c'
    ctx.lineWidth = 2
    for (let x = x0 + ((-g.t * 40) % 20) + 20; x < x1; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, BANK.y + 8)
      ctx.lineTo(x, BANK.y + 78)
      ctx.stroke()
    }
    g.belt.items.forEach((it, i) => {
      const r = beltRect(i, it)
      if (r.x > x1) return
      drawPacket(ctx, it.id, r.x, r.y, r.w, r.h, { selected: ui.holding?.from === 'belt' && ui.holding.index === i, t: g.t })
    })
  } else {
    g.seeds.forEach((s, i) => {
      const def = PLANT_BY_ID[s.id]
      const r = seedRect(i)
      const ready = s.readyAt <= g.t ? 1 : 1 - (s.readyAt - g.t) / (s.total || 1)
      drawPacket(ctx, s.id, r.x, r.y, r.w, r.h, { cost: def.cost, ready, affordable: g.sun >= def.cost, selected: ui.holding?.from === 'seed' && ui.holding.index === i, imitated: s.imitated, t: g.t })
    })
  }
  if (ui.shovel) {
    const r = shovelRect(g)
    rr(ctx, r.x, r.y, r.w, r.h, 8, ui.holding?.tool === 'shovel' ? '#5a4030' : '#c8a070', '#5a4030', 2.5)
    if (ui.holding?.tool !== 'shovel') {
      ctx.save()
      ctx.translate(r.x + r.w / 2 + 6, r.y + r.h / 2 + 6)
      drawShovelIcon(ctx)
      ctx.restore()
    }
  }
}

function drawProgress(ctx, g) {
  const x = W - 236
  const y = H - 24
  const w = 160
  ctx.font = 'bold 13px Verdana, sans-serif'
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.textAlign = 'right'
  const label = `Level ${g.level.id}`
  ctx.strokeText(label, x - 10, y + 12)
  ctx.fillText(label, x - 10, y + 12)
  if (!g.waves.total && !g.vases.length && !g.boss) return
  rr(ctx, x, y, w, 16, 8, '#3a3a3a', INK, 2)
  const k = g.progress()
  rr(ctx, x + 2, y + 2, Math.max(0, (w - 4) * k), 12, 6, '#7fd84a', null)
  for (const f of g.waves.flags ?? []) {
    const fx = x + w - (w * f) / (g.waves.total || 1)
    ctx.fillStyle = '#c33'
    ctx.fillRect(x + w - (w - 4) * (1 - f / g.waves.total) - 2, y - 10, 2, 22)
    ctx.beginPath()
    ctx.moveTo(x + w - (w - 4) * (1 - f / g.waves.total), y - 10)
    ctx.lineTo(x + w - (w - 4) * (1 - f / g.waves.total) + 12, y - 6)
    ctx.lineTo(x + w - (w - 4) * (1 - f / g.waves.total), y - 2)
    ctx.fill()
    void fx
  }
  // a little phone-zombie head showing how far along it is
  circle(ctx, x + 2 + (w - 4) * (1 - k), y + 8, 9, '#c7c2d6', INK, 2)
}

function drawBanners(ctx, g, ui) {
  const text = []
  if (g.phase === 'intro') {
    const k = g.introLeft
    text.push({ text: k > 1.7 ? 'READY…' : k > 0.8 ? 'SET…' : 'PLANT!', kind: k > 0.8 ? 'info' : 'go', size: 54 })
  }
  for (const b of ui.banners ?? []) text.push({ ...b, size: b.kind === 'final' ? 64 : b.kind === 'huge' ? 30 : 40 })
  let y = H / 2 - 10
  for (const b of text.slice(-2)) {
    ctx.save()
    ctx.font = `bold ${b.size}px Impact, 'Arial Black', sans-serif`
    ctx.textAlign = 'center'
    ctx.lineWidth = 7
    ctx.strokeStyle = INK
    ctx.fillStyle = b.kind === 'huge' || b.kind === 'final' ? '#ff4040' : b.kind === 'go' ? '#ffe14a' : '#fff'
    ctx.strokeText(b.text, W / 2, y)
    ctx.fillText(b.text, W / 2, y)
    ctx.restore()
    y += b.size + 8
  }
}

// For the Almanac and the seed picker: a plant or Scroller on its own.
export function drawPlantCard(ctx, id, x, y, s, t = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  drawPlant(ctx, id, null, t)
  ctx.restore()
}
export function drawZombieCard(ctx, id, x, y, s, t = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  if (id === 'algorithm') {
    ctx.scale(0.28, 0.28)
    algorithmBot(ctx, t, null)
  } else drawZombie(ctx, id, null, t)
  ctx.restore()
}
