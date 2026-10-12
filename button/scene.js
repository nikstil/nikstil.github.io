// THE BUTTON: the picture above the action bar. Simple canvas animations, one per scene; the warhead
// in the sky gets closer as the clock runs down.

const TAU = Math.PI * 2
const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))

// a cheap repeatable random (for skylines and crowds that don't jump about each frame)
function rng(seed) {
  let s = seed >>> 0 || 1
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

export class Scene {
  constructor(canvas) {
    this.c = canvas
    this.g = canvas.getContext('2d')
    this.w = this.h = 0
    this.name = 'title'
    this.since = 0
    this.city = []
    this.resize()
    addEventListener('resize', () => this.resize())
  }
  resize() {
    const r = this.c.getBoundingClientRect()
    const dpr = Math.min(2, devicePixelRatio || 1)
    this.w = Math.max(1, r.width)
    this.h = Math.max(1, r.height)
    this.c.width = Math.round(this.w * dpr)
    this.c.height = Math.round(this.h * dpr)
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0)
    // a skyline: building widths and heights, and which windows are lit
    const r2 = rng(7)
    this.city = []
    for (let x = -10; x < this.w + 40; ) {
      const bw = 18 + r2() * 46
      this.city.push({ x, w: bw, h: 0.12 + r2() * 0.3 + (r2() < 0.12 ? 0.18 : 0), lit: Array.from({ length: 40 }, () => r2() < 0.35) })
      x += bw + 2 + r2() * 6
    }
  }
  set(name, now) {
    if (name !== this.name) this.since = now
    this.name = name
  }
  /** One frame. st: { t (s), m (0..1, how close the warhead is), f (flags), danger (0..1) } */
  draw(st) {
    const { g, w, h } = this
    const k = st.t - this.since
    g.save()
    g.clearRect(0, 0, w, h)
    const fn = DRAW[this.name] ?? DRAW.title
    fn.call(this, g, w, h, st, k)
    g.restore()
  }

  // ---- pieces
  sky(top, bottom, horizon = 1) {
    const g = this.g
    const gr = g.createLinearGradient(0, 0, 0, this.h * horizon)
    gr.addColorStop(0, top)
    gr.addColorStop(1, bottom)
    g.fillStyle = gr
    g.fillRect(0, 0, this.w, this.h)
  }
  stars(n, a = 1, seed = 3, drift = 0, t = 0) {
    const g = this.g
    const r = rng(seed)
    g.fillStyle = '#fff'
    for (let i = 0; i < n; i++) {
      const x = (r() * this.w + drift * t * (0.3 + r())) % this.w
      const y = r() * this.h
      g.globalAlpha = a * (0.3 + 0.7 * r()) * (0.75 + 0.25 * Math.sin(t * 2 + i))
      g.fillRect(x, y, 1.4, 1.4)
    }
    g.globalAlpha = 1
  }
  skyline(base, scale, color, lit = 0, t = 0) {
    const g = this.g
    for (const b of this.city) {
      const bh = b.h * this.h * scale
      g.fillStyle = color
      g.fillRect(b.x, base - bh, b.w, bh)
      if (lit) {
        let i = 0
        for (let wy = base - bh + 6; wy < base - 6; wy += 9)
          for (let wx = b.x + 4; wx < b.x + b.w - 5; wx += 8) {
            if (b.lit[i++ % 40]) {
              g.fillStyle = `rgba(255, ${190 + ((i * 37) % 50)}, 120, ${lit * (0.55 + 0.45 * Math.sin(t * 0.7 + i))})`
              g.fillRect(wx, wy, 3, 4)
            }
          }
      }
    }
  }
  /** The warhead: a bright head and a long tail, arcing down towards the city as m goes 0 → 1. */
  missile(m, t, { x0 = 1.02, y0 = 0.06, x1 = 0.5, y1 = 0.72, split = false } = {}) {
    const g = this.g
    const at = (p) => [this.w * lerp(x0, x1, p), this.h * (y0 + (y1 - y0) * p * p)]
    const head = clamp(0.15 + m * 0.8, 0, 0.98)
    const tails = split && m > 0.3 ? [0, 0.04, -0.04] : [0]
    for (const off of tails) {
      g.beginPath()
      for (let i = 0; i <= 24; i++) {
        const p = head - 0.35 + (0.35 * i) / 24
        const [x, y] = at(Math.max(0, p))
        const dx = off * this.w * (1 - (head - p) * 2)
        i ? g.lineTo(x + dx, y) : g.moveTo(x + dx, y)
      }
      const [hx, hy] = at(head)
      const gr = g.createLinearGradient(...at(Math.max(0, head - 0.35)), hx, hy)
      gr.addColorStop(0, 'rgba(255,240,220,0)')
      gr.addColorStop(1, off ? 'rgba(255,230,200,.45)' : 'rgba(255,250,235,.95)')
      g.strokeStyle = gr
      g.lineWidth = off ? 1.5 : 2.5
      g.stroke()
      const glow = g.createRadialGradient(hx + off * this.w, hy, 0, hx + off * this.w, hy, off ? 8 : 16 + 4 * Math.sin(t * 9))
      glow.addColorStop(0, off ? 'rgba(255,240,220,.6)' : 'rgba(255,255,255,1)')
      glow.addColorStop(1, 'rgba(255,200,150,0)')
      g.fillStyle = glow
      g.beginPath()
      g.arc(hx + off * this.w, hy, 24, 0, TAU)
      g.fill()
    }
  }
  /** Red light washing in, like sirens. */
  siren(t, a = 0.35, x = 0.5, y = 1.1) {
    const g = this.g
    const p = 0.5 + 0.5 * Math.sin(t * 4.2)
    const gr = g.createRadialGradient(this.w * x, this.h * y, 0, this.w * x, this.h * y, Math.max(this.w, this.h) * 0.9)
    gr.addColorStop(0, `rgba(255, 30, 20, ${a * p})`)
    gr.addColorStop(1, 'rgba(255, 30, 20, 0)')
    g.fillStyle = gr
    g.fillRect(0, 0, this.w, this.h)
  }
  crowd(n, t, { y0 = 0.7, y1 = 0.95, speed = 40, dir = 1, color = '#0b0c10', seed = 11, size = 1 } = {}) {
    const g = this.g
    const r = rng(seed)
    g.fillStyle = color
    for (let i = 0; i < n; i++) {
      const y = lerp(y0, y1, r()) * this.h
      const sp = speed * (0.6 + r() * 0.8)
      const x = (((r() * this.w + dir * sp * t) % (this.w + 40)) + this.w + 40) % (this.w + 40) - 20
      const s = (4 + (y / this.h) * 6) * size
      const bob = Math.sin(t * 9 + i) * 1.2
      g.beginPath()
      g.arc(x, y - s * 2.2 + bob, s * 0.55, 0, TAU)
      g.fill()
      g.fillRect(x - s * 0.5, y - s * 1.7 + bob, s, s * 1.7)
    }
  }
  person(x, y, s, color = '#0b0c10') {
    const g = this.g
    g.fillStyle = color
    g.beginPath()
    g.arc(x, y - s * 2.3, s * 0.55, 0, TAU)
    g.fill()
    g.fillRect(x - s * 0.5, y - s * 1.75, s, s * 1.75)
  }
  glowFigure(x, y, s, t, a = 1) {
    const g = this.g
    const gr = g.createRadialGradient(x, y - s * 1.6, 0, x, y - s * 1.6, s * 4)
    gr.addColorStop(0, `rgba(180, 230, 255, ${0.55 * a})`)
    gr.addColorStop(1, 'rgba(120, 200, 255, 0)')
    g.fillStyle = gr
    g.fillRect(x - s * 5, y - s * 6, s * 10, s * 7)
    g.globalAlpha = a * (0.85 + 0.15 * Math.sin(t * 13))
    this.person(x, y, s, '#dff4ff')
    g.globalAlpha = 1
    for (let i = 0; i < 10; i++) {
      const p = (t * 0.4 + i / 10) % 1
      g.fillStyle = `rgba(200, 240, 255, ${(1 - p) * 0.8 * a})`
      g.fillRect(x + Math.sin(i * 7.3 + t) * s * 1.2, y - p * s * 4, 2, 2)
    }
  }
  dish(x, y, r, t) {
    const g = this.g
    g.save()
    g.translate(x, y)
    g.strokeStyle = '#2b2f36'
    g.lineWidth = r * 0.12
    g.beginPath()
    g.moveTo(-r * 0.3, 0)
    g.lineTo(0, -r * 0.7)
    g.lineTo(r * 0.3, 0)
    g.stroke()
    g.rotate(-0.6 + Math.sin(t * 0.3) * 0.05)
    g.fillStyle = '#3a3f47'
    g.beginPath()
    g.ellipse(0, -r * 0.9, r, r * 0.45, 0, 0, Math.PI)
    g.fill()
    g.strokeStyle = '#59606a'
    g.lineWidth = 2
    g.stroke()
    g.restore()
  }
  screen(x, y, w, h, t, lines = 6, color = '#4cff7a') {
    const g = this.g
    g.fillStyle = '#04110a'
    g.fillRect(x, y, w, h)
    g.fillStyle = color
    g.globalAlpha = 0.9
    const lh = h / (lines + 1)
    for (let i = 0; i < lines; i++) {
      const len = ((Math.sin(i * 12.9 + Math.floor(t * 2)) + 1) / 2) * 0.7 + 0.2
      g.fillRect(x + 6, y + lh * (i + 0.6), (w - 12) * len, Math.max(2, lh * 0.35))
    }
    if (Math.floor(t * 2) % 2) g.fillRect(x + 6, y + lh * (lines + 0.2), 8, Math.max(2, lh * 0.5))
    g.globalAlpha = 0.15
    g.fillRect(x, y + ((t * 40) % h), w, 3)
    g.globalAlpha = 1
  }
  /** From the driver's seat: the road rushing at you and the dashboard (with the van's two choices on it). */
  drive(st, labels) {
    const { g, w, h } = this
    g.fillStyle = '#3a3b40'
    g.beginPath()
    g.moveTo(w * 0.1, h)
    g.lineTo(w * 0.48, h * 0.55)
    g.lineTo(w * 0.52, h * 0.55)
    g.lineTo(w * 0.9, h)
    g.fill()
    g.fillStyle = '#e8e2c8'
    for (let i = 0; i < 6; i++) {
      const p = (i / 6 + st.t * 0.6) % 1
      const y = lerp(h * 0.56, h, p * p)
      const s = 2 + p * 10
      g.fillRect(w / 2 - s / 4, y, s / 2, s * 2)
    }
    // the dashboard and its two glowing options
    g.fillStyle = '#101114'
    g.fillRect(0, h * 0.72, w, h * 0.28)
    g.fillStyle = '#0a2a3a'
    g.fillRect(w * 0.3, h * 0.78, w * 0.4, h * 0.16)
    if (!labels) return
    g.fillStyle = '#6ad7ff'
    g.font = `bold ${Math.round(h * 0.035)}px ui-monospace, Menlo, monospace`
    g.fillText('METRO 4 · 2 MIN', w * 0.32, h * 0.84)
    g.fillText('OBSERVATORY · 14 KM', w * 0.32, h * 0.9)
  }
  vignette(a = 0.6) {
    const g = this.g
    const gr = g.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.25, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75)
    gr.addColorStop(0, 'rgba(0,0,0,0)')
    gr.addColorStop(1, `rgba(0,0,0,${a})`)
    g.fillStyle = gr
    g.fillRect(0, 0, this.w, this.h)
  }
}

// ================= The scenes =================
const DRAW = {
  title(g, w, h, st) {
    this.sky('#0b0406', '#3b0c10')
    this.stars(60, 0.5, 5)
    this.skyline(h, 0.9, '#080306', 0.4, st.t)
    this.siren(st.t, 0.45)
    this.vignette(0.7)
  },

  room(g, w, h, st) {
    g.fillStyle = '#16171d'
    g.fillRect(0, 0, w, h)
    // the window
    const wx = w * 0.12, wy = h * 0.1, ww = w * 0.46, wh = h * 0.55
    g.save()
    g.beginPath()
    g.rect(wx, wy, ww, wh)
    g.clip()
    this.sky('#1a1830', '#c4573f')
    this.skyline(wy + wh, 0.55, '#120c14', 0.6, st.t)
    this.missile(st.m, st.t, { x0: 0.62, y0: 0.08, x1: 0.2, y1: 0.5 })
    g.restore()
    g.strokeStyle = '#2c2e38'
    g.lineWidth = 6
    g.strokeRect(wx, wy, ww, wh)
    g.beginPath()
    g.moveTo(wx + ww / 2, wy)
    g.lineTo(wx + ww / 2, wy + wh)
    g.stroke()
    // the bed, the phone, and two eyes under it
    g.fillStyle = '#262734'
    g.fillRect(w * 0.55, h * 0.72, w * 0.42, h * 0.16)
    g.fillStyle = '#353748'
    g.fillRect(w * 0.55, h * 0.66, w * 0.42, h * 0.08)
    const ph = 0.6 + 0.4 * Math.sin(st.t * 6)
    g.fillStyle = `rgba(255, 60, 50, ${ph})`
    g.fillRect(w * 0.7, h * 0.655, w * 0.04, h * 0.02)
    if (!st.f.cat) {
      const blink = Math.sin(st.t * 1.3) > 0.95 ? 0.1 : 1
      g.fillStyle = '#ffd23f'
      g.fillRect(w * 0.78, h * 0.85, 4, 3 * blink)
      g.fillRect(w * 0.78 + 10, h * 0.85, 4, 3 * blink)
    }
    this.siren(st.t, 0.32, 0.35, 0.4)
    this.vignette(0.6)
  },

  tv(g, w, h, st, k) {
    g.fillStyle = '#121318'
    g.fillRect(0, 0, w, h)
    const tw = Math.min(w * 0.6, h * 1.1), th = tw * 0.58
    const x = (w - tw) / 2, y = (h - th) / 2 - h * 0.04
    g.fillStyle = '#05060a'
    g.fillRect(x - 10, y - 10, tw + 20, th + 20)
    // the anchor, then static and the other voice
    if (k < 2.2) {
      g.fillStyle = '#1b3a6b'
      g.fillRect(x, y, tw, th)
      this.person(x + tw / 2, y + th * 1.05, th * 0.2, '#c9b8a6')
      g.fillStyle = '#c0182b'
      g.fillRect(x, y + th * 0.8, tw, th * 0.12)
      g.fillStyle = '#fff'
      g.font = `bold ${Math.round(th * 0.07)}px system-ui, sans-serif`
      g.fillText('LIVE · WARHEAD INBOUND', x + 10, y + th * 0.885)
    } else {
      const img = g.createImageData(64, 36)
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v
        img.data[i + 3] = 255
      }
      const tmp = this.tmp ?? (this.tmp = document.createElement('canvas'))
      tmp.width = 64
      tmp.height = 36
      tmp.getContext('2d').putImageData(img, 0, 0)
      g.imageSmoothingEnabled = false
      g.drawImage(tmp, x, y, tw, th)
      g.fillStyle = 'rgba(120,200,255,.25)'
      g.fillRect(x, y, tw, th)
    }
    const gl = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6)
    gl.addColorStop(0, 'rgba(120,160,255,.08)')
    gl.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gl
    g.fillRect(0, 0, w, h)
    this.siren(st.t, 0.18)
    this.vignette(0.6)
  },

  hall(g, w, h, st) {
    g.fillStyle = '#1c1a1e'
    g.fillRect(0, 0, w, h)
    const vx = w / 2, vy = h * 0.45
    g.strokeStyle = '#2f2c33'
    g.lineWidth = 2
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(vx, vy)
      g.stroke()
    }
    g.fillStyle = '#0d0c0f'
    g.fillRect(vx - w * 0.06, vy - h * 0.12, w * 0.12, h * 0.2)
    // doors down both walls
    for (let i = 0; i < 4; i++) {
      const p = 0.15 + i * 0.2
      const dx = lerp(0, vx - w * 0.06, p)
      const top = lerp(h * 0.1, vy - h * 0.1, p), bot = lerp(h * 0.95, vy + h * 0.08, p)
      g.fillStyle = i % 2 ? '#3d2a22' : '#33241d'
      g.fillRect(dx, top, w * 0.05 * (1 - p), bot - top)
      g.fillRect(w - dx - w * 0.05 * (1 - p), top, w * 0.05 * (1 - p), bot - top)
    }
    this.crowd(7, st.t, { y0: 0.75, y1: 0.98, speed: 70, dir: 1, seed: 4, color: '#09080a', size: 1.6 })
    // the red beacon sweeping
    const a = st.t * 3
    const gr = g.createRadialGradient(vx + Math.cos(a) * w * 0.3, h * 0.1, 0, vx + Math.cos(a) * w * 0.3, h * 0.1, w * 0.5)
    gr.addColorStop(0, 'rgba(255,40,30,.4)')
    gr.addColorStop(1, 'rgba(255,40,30,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, w, h)
    this.vignette(0.65)
  },

  flat(g, w, h, st) {
    g.fillStyle = '#16141a'
    g.fillRect(0, 0, w, h)
    // star charts on the wall
    const r = rng(9)
    g.strokeStyle = 'rgba(160, 190, 255, .35)'
    g.fillStyle = 'rgba(220, 230, 255, .8)'
    for (let c = 0; c < 4; c++) {
      const cx = w * (0.12 + c * 0.24), cy = h * (0.25 + (c % 2) * 0.12)
      g.strokeRect(cx - w * 0.09, cy - h * 0.14, w * 0.18, h * 0.28)
      let px = cx, py = cy
      for (let i = 0; i < 6; i++) {
        const nx = cx + (r() - 0.5) * w * 0.15, ny = cy + (r() - 0.5) * h * 0.22
        g.beginPath()
        g.moveTo(px, py)
        g.lineTo(nx, ny)
        g.stroke()
        g.fillRect(nx - 1.5, ny - 1.5, 3, 3)
        px = nx
        py = ny
      }
    }
    // the steel case and its screen
    g.fillStyle = '#5b626b'
    g.fillRect(w * 0.32, h * 0.62, w * 0.36, h * 0.3)
    this.screen(w * 0.35, h * 0.65, w * 0.3, h * 0.2, st.t, 4)
    this.siren(st.t, 0.15)
    this.vignette(0.6)
  },

  stairs(g, w, h, st, k, dark = false) {
    g.fillStyle = dark ? '#07090a' : '#0e1a14'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = dark ? '#1c2522' : '#2a4a3a'
    g.lineWidth = 3
    for (let f = 0; f < 4; f++) {
      const y0 = h * (0.1 + f * 0.24)
      g.beginPath()
      for (let i = 0; i <= 8; i++) {
        const x = f % 2 ? w * 0.2 + i * w * 0.075 : w * 0.8 - i * w * 0.075
        const y = y0 + i * h * 0.025
        g.lineTo(x, y)
        g.lineTo(x + (f % 2 ? w * 0.075 : -w * 0.075), y)
      }
      g.stroke()
    }
    if (!dark) {
      // people pouring down
      const r = rng(21)
      g.fillStyle = '#050807'
      for (let i = 0; i < 16; i++) {
        const p = (st.t * 0.12 + r()) % 1
        const f = Math.floor(p * 4), q = (p * 4) % 1
        const x = f % 2 ? w * 0.2 + q * w * 0.6 : w * 0.8 - q * w * 0.6
        const y = h * (0.1 + f * 0.24) + q * h * 0.2
        this.person(x, y, 6, '#050807')
      }
      const gl = 0.15 + 0.05 * Math.sin(st.t * 30)
      g.fillStyle = `rgba(60, 255, 140, ${gl})`
      g.fillRect(0, 0, w, h)
    } else {
      // a torch beam
      const a = Math.sin(st.t * 0.9) * 0.3 - 1.2
      g.fillStyle = 'rgba(255, 240, 200, .14)'
      g.beginPath()
      g.moveTo(w * 0.5, h)
      g.lineTo(w * 0.5 + Math.cos(a - 0.2) * h * 1.3, h + Math.sin(a - 0.2) * h * 1.3)
      g.lineTo(w * 0.5 + Math.cos(a + 0.2) * h * 1.3, h + Math.sin(a + 0.2) * h * 1.3)
      g.fill()
      g.fillStyle = 'rgba(60, 255, 140, .08)'
      g.fillRect(0, 0, w, h)
    }
    this.vignette(0.7)
  },
  stairsDark(g, w, h, st, k) {
    DRAW.stairs.call(this, g, w, h, st, k, true)
  },

  door(g, w, h, st, k) {
    this.sky('#25222e', '#a5523d')
    this.missile(st.m, st.t)
    g.fillStyle = '#0d0d10'
    g.fillRect(0, 0, w * 0.3, h)
    g.fillRect(w * 0.7, 0, w * 0.3, h)
    g.fillRect(0, 0, w, h * 0.12)
    // the door, swinging in the wind
    const sw = Math.min(1, k * 2) * (0.85 + 0.1 * Math.sin(st.t * 3))
    g.fillStyle = '#4a4f55'
    g.beginPath()
    g.moveTo(w * 0.7, h * 0.12)
    g.lineTo(w * 0.7 + sw * w * 0.2, h * 0.05)
    g.lineTo(w * 0.7 + sw * w * 0.2, h * 1.05)
    g.lineTo(w * 0.7, h)
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,.25)'
    for (let i = 0; i < 8; i++) {
      const y = ((i * 97 + st.t * 260) % h)
      g.beginPath()
      g.moveTo(w * 0.32, y)
      g.lineTo(w * 0.32 + 40, y - 6)
      g.stroke()
    }
    this.vignette(0.6)
  },

  machine(g, w, h, st) {
    g.fillStyle = '#121214'
    g.fillRect(0, 0, w, h)
    const cx = w * 0.45, cy = h * 0.4, r = Math.min(w, h) * 0.2
    g.strokeStyle = '#3d3f45'
    g.lineWidth = r * 0.12
    g.beginPath()
    g.arc(cx, cy, r, 0, TAU)
    g.stroke()
    g.lineWidth = 3
    for (let i = 0; i < 6; i++) {
      const a = i * (TAU / 6) + st.t * 0.2
      g.beginPath()
      g.moveTo(cx, cy)
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
      g.stroke()
    }
    g.strokeStyle = '#26282c'
    g.lineWidth = 4
    for (const dx of [-r, r]) {
      g.beginPath()
      g.moveTo(cx + dx, cy)
      g.lineTo(cx + dx, h)
      g.stroke()
    }
    // the toolbox, and a lanyard swinging on its hook
    g.fillStyle = '#b3241b'
    g.fillRect(w * 0.7, h * 0.78, w * 0.16, h * 0.12)
    const a = Math.sin(st.t * 1.6) * 0.3
    g.strokeStyle = '#2a6fd6'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(w * 0.15, h * 0.2)
    g.lineTo(w * 0.15 + Math.sin(a) * h * 0.2, h * 0.2 + Math.cos(a) * h * 0.2)
    g.stroke()
    g.fillStyle = '#e8e8e8'
    g.fillRect(w * 0.15 + Math.sin(a) * h * 0.2 - 10, h * 0.2 + Math.cos(a) * h * 0.2, 20, 14)
    const dust = rng(5)
    g.fillStyle = 'rgba(255,255,255,.3)'
    for (let i = 0; i < 30; i++) g.fillRect((dust() * w + st.t * 6) % w, (dust() * h + st.t * 3) % h, 1.5, 1.5)
    this.vignette(0.75)
  },

  roof(g, w, h, st) {
    this.sky('#1c2240', '#d96b45', 0.8)
    this.stars(20, 0.4 * (1 - st.m))
    this.missile(st.m, st.t)
    this.skyline(h * 0.82, 0.55, '#1a1220', 0.35, st.t)
    g.fillStyle = '#0c0b10'
    g.fillRect(0, h * 0.82, w, h * 0.18)
    this.dish(w * 0.22, h * 0.84, Math.min(w, h) * 0.16, st.t)
    if (!st.f.courierGone) this.glowFigure(w * 0.78, h * 0.83, Math.min(w, h) * 0.035, st.t)
    this.siren(st.t, 0.18, 0.5, 1)
    this.vignette(0.5)
  },

  courier(g, w, h, st) {
    this.sky('#081322', '#1f3e5a')
    this.stars(80, 0.6, 8, 4, st.t)
    this.glowFigure(w / 2, h * 0.95, Math.min(w, h) * 0.12, st.t)
    // the shard
    const p = 0.6 + 0.4 * Math.sin(st.t * 3)
    g.fillStyle = `rgba(190, 240, 255, ${p})`
    g.beginPath()
    g.moveTo(w * 0.62, h * 0.55)
    g.lineTo(w * 0.65, h * 0.5)
    g.lineTo(w * 0.66, h * 0.6)
    g.fill()
    this.vignette(0.55)
  },

  fly(g, w, h, st) {
    this.sky('#355a8c', '#f2a36b')
    this.missile(st.m, st.t, { x1: 0.75 })
    // the city far below, sliding past
    g.save()
    g.translate(-((st.t * 30) % 200), 0)
    g.globalAlpha = 0.6
    this.skyline(h, 0.25, '#2a2238')
    g.restore()
    g.globalAlpha = 1
    // clouds rushing by
    const r = rng(17)
    for (let i = 0; i < 9; i++) {
      const y = r() * h * 0.8
      const sp = 80 + r() * 160
      const x = w - (((st.t * sp + r() * w * 2) % (w * 1.6)) - w * 0.3)
      g.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.25})`
      g.beginPath()
      g.ellipse(x, y, 60 + r() * 80, 12 + r() * 10, 0, 0, TAU)
      g.fill()
    }
    // the dome on the horizon
    g.fillStyle = '#f3efe8'
    g.beginPath()
    g.arc(w * 0.82, h * 0.9, Math.min(w, h) * 0.05, Math.PI, 0)
    g.fill()
    this.glowFigure(w * 0.35, h * 0.62, Math.min(w, h) * 0.04, st.t)
    this.person(w * 0.42, h * 0.64, Math.min(w, h) * 0.04, '#141218')
  },

  dish(g, w, h, st) {
    this.sky('#232849', '#d77450', 0.8)
    this.missile(st.m, st.t, { x1: 0.4 })
    this.skyline(h * 0.82, 0.4, '#1a1220', 0.2, st.t)
    g.fillStyle = '#0c0b10'
    g.fillRect(0, h * 0.82, w, h * 0.18)
    this.dish(w * 0.5, h * 0.86, Math.min(w, h) * 0.3, st.t)
    g.fillStyle = '#5b626b'
    g.fillRect(w * 0.72, h * 0.74, w * 0.14, h * 0.1)
    this.screen(w * 0.735, h * 0.755, w * 0.11, h * 0.065, st.t, 3)
    this.siren(st.t, 0.15, 0.5, 1)
    this.vignette(0.5)
  },

  terminal(g, w, h, st) {
    g.fillStyle = '#020604'
    g.fillRect(0, 0, w, h)
    const pad = Math.min(w, h) * 0.08
    const fs = Math.round(Math.min(w, h) * 0.08)
    g.fillStyle = '#04110a'
    g.fillRect(pad, pad, w - pad * 2, h - pad * 2)
    this.screen(pad, pad + fs * 1.6, w - pad * 2, h - pad * 2 - fs * 1.6, st.t, 8)
    g.fillStyle = '#4cff7a'
    g.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`
    g.globalAlpha = 0.9
    g.fillText('AEGIS-7', pad * 1.4, pad + fs * 1.25)
    g.globalAlpha = 0.06
    for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1)
    g.globalAlpha = 1
    this.vignette(0.7)
  },

  radar(g, w, h, st) {
    g.fillStyle = '#020a06'
    g.fillRect(0, 0, w, h)
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.42
    g.strokeStyle = 'rgba(76, 255, 122, .35)'
    g.lineWidth = 1
    for (let i = 1; i <= 4; i++) {
      g.beginPath()
      g.arc(cx, cy, (r * i) / 4, 0, TAU)
      g.stroke()
    }
    g.beginPath()
    g.moveTo(cx - r, cy)
    g.lineTo(cx + r, cy)
    g.moveTo(cx, cy - r)
    g.lineTo(cx, cy + r)
    g.stroke()
    const a = st.t * 1.6
    const sweep = g.createConicGradient ? g.createConicGradient(a - 0.8, cx, cy) : null
    if (sweep) {
      sweep.addColorStop(0, 'rgba(76,255,122,0)')
      sweep.addColorStop(0.12, 'rgba(76,255,122,.35)')
      sweep.addColorStop(0.13, 'rgba(76,255,122,0)')
      g.fillStyle = sweep
      g.beginPath()
      g.arc(cx, cy, r, 0, TAU)
      g.fill()
    }
    // three tracks: two loud, one quiet
    const tracks = [
      [-0.3, -0.25, 1],
      [0.25, -0.35, 1],
      [0.05, 0.1, 0.25],
    ]
    for (const [dx, dy, loud] of tracks) {
      const x = cx + dx * r + Math.sin(st.t * 0.5 + dx) * 4, y = cy + dy * r + st.m * r * 0.2
      const p = loud === 1 ? 0.6 + 0.4 * Math.sin(st.t * 7 + dx * 10) : 0.25 + 0.15 * Math.sin(st.t * 2)
      g.fillStyle = `rgba(160, 255, 180, ${p})`
      g.beginPath()
      g.arc(x, y, loud === 1 ? 7 : 3, 0, TAU)
      g.fill()
      if (loud === 1) {
        g.strokeStyle = `rgba(160,255,180,${p * 0.5})`
        g.beginPath()
        g.arc(x, y, 12 + 4 * Math.sin(st.t * 7), 0, TAU)
        g.stroke()
      }
    }
    this.vignette(0.6)
  },

  lobby(g, w, h, st) {
    this.sky('#2a2c3e', '#c06a4c', 0.6)
    this.skyline(h * 0.6, 0.6, '#1d1622', 0.3, st.t)
    g.fillStyle = '#2b2d33'
    g.fillRect(0, h * 0.6, w, h * 0.4)
    this.crowd(26, st.t, { y0: 0.62, y1: 0.72, speed: 90, dir: 1, seed: 3, color: '#0c0b0f' })
    // the van at the kerb
    g.fillStyle = '#d9d9d9'
    g.fillRect(w * 0.62, h * 0.66, w * 0.24, h * 0.1)
    g.fillStyle = '#6aa3ff'
    g.fillRect(w * 0.8, h * 0.675, w * 0.05, h * 0.035)
    // the lobby glass, with a frame
    g.fillStyle = 'rgba(140, 180, 220, .12)'
    g.fillRect(0, 0, w, h * 0.85)
    g.fillStyle = '#121216'
    g.fillRect(0, h * 0.85, w, h * 0.15)
    for (let x = 0; x <= w; x += w / 4) g.fillRect(x - 3, 0, 6, h * 0.85)
    this.siren(st.t, 0.2, 0.5, 0.6)
    this.vignette(0.55)
  },

  street(g, w, h, st) {
    this.sky('#2a2c44', '#cf6d4a', 0.55)
    this.missile(st.m, st.t, { x1: 0.3, y1: 0.45 })
    this.skyline(h * 0.55, 0.7, '#1b1520', 0.3, st.t)
    g.fillStyle = '#29262b'
    g.beginPath()
    g.moveTo(0, h)
    g.lineTo(w * 0.4, h * 0.55)
    g.lineTo(w * 0.6, h * 0.55)
    g.lineTo(w, h)
    g.fill()
    this.crowd(40, st.t, { y0: 0.6, y1: 1, speed: 110, dir: -1, seed: 8, color: '#0a090c' })
    // the boy and his scooter
    this.person(w * 0.5, h * 0.92, 7, '#3a2a55')
    g.strokeStyle = '#ffcf3f'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(w * 0.53, h * 0.94)
    g.lineTo(w * 0.6, h * 0.92)
    g.stroke()
    this.siren(st.t, 0.2)
    this.vignette(0.55)
  },

  van(g, w, h, st) {
    this.sky('#3b4970', '#f0a070', 0.6)
    this.drive(st, true)
  },

  road(g, w, h, st, k) {
    this.sky('#3a4f80', '#f2b07a', 0.6)
    this.missile(st.m, st.t, { x1: 0.65, y1: 0.5 })
    g.fillStyle = '#2b3a2e'
    g.beginPath()
    g.moveTo(0, h * 0.62)
    g.quadraticCurveTo(w * 0.3, h * 0.48, w * 0.6, h * 0.6)
    g.quadraticCurveTo(w * 0.8, h * 0.5, w, h * 0.6)
    g.lineTo(w, h)
    g.lineTo(0, h)
    g.fill()
    const dr = Math.min(w, h) * (0.03 + Math.min(0.05, k * 0.004))
    g.fillStyle = '#f3efe8'
    g.beginPath()
    g.arc(w * 0.62, h * 0.56, dr, Math.PI, 0)
    g.fill()
    this.drive(st, false)
  },

  quarry(g, w, h, st) {
    this.sky('#4a4a6a', '#e6a36f', 0.6)
    g.fillStyle = '#6b5a48'
    g.fillRect(0, h * 0.55, w, h * 0.45)
    g.fillStyle = '#4a3e33'
    g.beginPath()
    g.moveTo(w * 0.2, h)
    g.lineTo(w * 0.45, h * 0.55)
    g.lineTo(w * 0.55, h * 0.55)
    g.lineTo(w * 0.8, h)
    g.fill()
    // the pylon across the road, spitting sparks
    g.strokeStyle = '#1b1b1f'
    g.lineWidth = 6
    g.beginPath()
    g.moveTo(w * 0.1, h * 0.7)
    g.lineTo(w * 0.9, h * 0.78)
    g.stroke()
    g.lineWidth = 2
    for (let i = 0; i < 8; i++) {
      g.beginPath()
      g.moveTo(w * (0.1 + i * 0.1), h * (0.7 + i * 0.01))
      g.lineTo(w * (0.15 + i * 0.1), h * (0.64 + i * 0.01))
      g.stroke()
    }
    for (let i = 0; i < 14; i++) {
      const p = (st.t * 2 + i / 14) % 1
      g.fillStyle = `rgba(255, 220, 120, ${1 - p})`
      g.fillRect(w * 0.55 + Math.cos(i * 2.1) * p * 60, h * 0.745 - p * 50 + p * p * 70, 2.5, 2.5)
    }
    this.vignette(0.5)
  },

  metro(g, w, h, st, k) {
    g.fillStyle = '#18181a'
    g.fillRect(0, 0, w, h)
    // the blast door, closing
    const gap = Math.max(0.03, 0.22 - k * 0.012)
    const stripes = (x0, x1) => {
      g.save()
      g.beginPath()
      g.rect(x0, h * 0.1, x1 - x0, h * 0.9)
      g.clip()
      g.fillStyle = '#4b4e53'
      g.fillRect(x0, h * 0.1, x1 - x0, h)
      g.fillStyle = '#e8b818'
      for (let y = -w; y < h; y += 40) {
        g.beginPath()
        g.moveTo(x0, h * 0.1 + y)
        g.lineTo(x1, h * 0.1 + y + (x1 - x0))
        g.lineTo(x1, h * 0.1 + y + (x1 - x0) + 16)
        g.lineTo(x0, h * 0.1 + y + 16)
        g.fill()
      }
      g.restore()
    }
    g.fillStyle = '#d9f2ff'
    g.fillRect(w * (0.5 - gap / 2), h * 0.1, w * gap, h * 0.9)
    this.person(w * 0.5, h * 0.95, Math.min(w, h) * 0.05, '#2b3a2a')
    stripes(0, w * (0.5 - gap / 2))
    stripes(w * (0.5 + gap / 2), w)
    this.crowd(14, st.t, { y0: 0.9, y1: 1.05, speed: 30, dir: 1, seed: 6, color: '#060607', size: 2 })
    const a = 0.5 + 0.5 * Math.sin(st.t * 8)
    g.fillStyle = `rgba(255, 150, 0, ${0.25 * a})`
    g.fillRect(0, 0, w, h)
    this.vignette(0.6)
  },

  metroOut(g, w, h, st) {
    this.sky('#2c2a40', '#d3593d', 0.7)
    this.missile(st.m, st.t, { x1: 0.4, y1: 0.55 })
    this.skyline(h * 0.7, 0.6, '#1b1520', 0.1, st.t)
    g.fillStyle = '#262629'
    g.fillRect(0, h * 0.7, w, h * 0.3)
    g.fillStyle = '#4b4e53'
    g.fillRect(w * 0.3, h * 0.45, w * 0.4, h * 0.35)
    g.fillStyle = '#e8b818'
    g.fillRect(w * 0.3, h * 0.45, w * 0.4, h * 0.03)
    g.fillStyle = '#1a1a1c'
    g.fillRect(w * 0.78, h * 0.62, w * 0.1, h * 0.12)
    g.strokeStyle = '#555'
    for (let x = w * 0.79; x < w * 0.88; x += 6) {
      g.beginPath()
      g.moveTo(x, h * 0.62)
      g.lineTo(x, h * 0.74)
      g.stroke()
    }
    this.vignette(0.55)
  },

  tunnel(g, w, h, st) {
    g.fillStyle = '#030304'
    g.fillRect(0, 0, w, h)
    const cx = w / 2, cy = h * 0.5
    for (let i = 8; i > 0; i--) {
      const p = ((i + st.t * 0.6) % 8) / 8
      g.strokeStyle = `rgba(90, 90, 100, ${0.5 * p})`
      g.lineWidth = 2
      g.beginPath()
      g.arc(cx, cy, p * Math.max(w, h) * 0.6, 0, TAU)
      g.stroke()
    }
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.12)
    gr.addColorStop(0, 'rgba(255, 220, 160, .8)')
    gr.addColorStop(1, 'rgba(255, 220, 160, 0)')
    g.fillStyle = gr
    g.fillRect(0, 0, w, h)
  },

  deep(g, w, h, st) {
    g.fillStyle = '#0c0d10'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#16171c'
    g.fillRect(0, h * 0.62, w, h * 0.38)
    g.fillStyle = '#e8b818'
    g.fillRect(0, h * 0.62, w, 4)
    // lights along the roof, one flickering
    for (let i = 0; i < 6; i++) {
      const x = w * (0.1 + i * 0.16)
      const on = i === 3 ? (Math.sin(st.t * 23) > 0 ? 1 : 0.2) : 1
      const gr = g.createRadialGradient(x, h * 0.1, 0, x, h * 0.1, h * 0.5)
      gr.addColorStop(0, `rgba(255, 210, 150, ${0.35 * on})`)
      gr.addColorStop(1, 'rgba(255, 210, 150, 0)')
      g.fillStyle = gr
      g.fillRect(x - h * 0.5, 0, h, h)
    }
    const r = rng(31)
    for (let i = 0; i < 70; i++) {
      const x = r() * w + Math.sin(st.t * 0.6 + i) * 2
      const y = h * (0.66 + r() * 0.34)
      this.person(x, y, 3 + (y / h) * 4, '#050506')
    }
    // the intake shaft, roaring
    g.fillStyle = '#000'
    g.fillRect(w * 0.82, 0, w * 0.1, h * 0.45)
    g.strokeStyle = 'rgba(200,200,220,.2)'
    for (let i = 0; i < 6; i++) {
      const y = (i * 23 + st.t * 120) % (h * 0.45)
      g.beginPath()
      g.moveTo(w * 0.83, y)
      g.lineTo(w * 0.91, y + 8)
      g.stroke()
    }
    this.vignette(0.7)
  },

  vent(g, w, h, st, k) {
    g.fillStyle = '#060607'
    g.fillRect(0, 0, w, h)
    // the shaft going up to a square of sky that's getting brighter
    const glow = clamp(0.3 + st.m * 0.6 + k * 0.01)
    for (let i = 0; i < 6; i++) {
      const s = 1 - i * 0.15
      g.strokeStyle = `rgba(70, 70, 80, ${0.8 - i * 0.12})`
      g.strokeRect(w / 2 - (w * s) / 2, h / 2 - (h * s) / 2, w * s, h * s)
    }
    g.fillStyle = `rgba(255, 252, 240, ${glow})`
    g.fillRect(w / 2 - w * 0.08, h / 2 - h * 0.1, w * 0.16, h * 0.2)
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.5)
    gr.addColorStop(0, `rgba(255,250,230,${glow * 0.4})`)
    gr.addColorStop(1, 'rgba(255,250,230,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, w, h)
    // the ladder and the valve wheel
    g.strokeStyle = '#3a3c42'
    g.lineWidth = 4
    for (const x of [0.3, 0.42]) {
      g.beginPath()
      g.moveTo(w * x, h)
      g.lineTo(w * x, 0)
      g.stroke()
    }
    for (let y = h; y > 0; y -= h / 9) {
      g.beginPath()
      g.moveTo(w * 0.3, y)
      g.lineTo(w * 0.42, y)
      g.stroke()
    }
    const r = Math.min(w, h) * 0.13
    g.save()
    g.translate(w * 0.68, h * 0.62)
    g.rotate(Math.sin(st.t * 3) * 0.04)
    g.strokeStyle = '#8a3b1d'
    g.lineWidth = r * 0.16
    g.beginPath()
    g.arc(0, 0, r, 0, TAU)
    g.stroke()
    for (let i = 0; i < 4; i++) {
      g.rotate(TAU / 4)
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(r, 0)
      g.stroke()
    }
    g.restore()
  },

  observatory(g, w, h, st) {
    this.sky('#3c3a6a', '#f3a6a0', 0.7)
    this.missile(st.m, st.t, { x1: 0.2, y1: 0.6 })
    g.fillStyle = '#26352a'
    g.beginPath()
    g.moveTo(0, h)
    g.quadraticCurveTo(w * 0.5, h * 0.45, w, h)
    g.fill()
    const r = Math.min(w, h) * 0.2
    g.fillStyle = '#f5f1ea'
    g.beginPath()
    g.arc(w / 2, h * 0.72, r, Math.PI, 0)
    g.fill()
    g.fillStyle = '#d9d2c7'
    g.fillRect(w / 2 - r, h * 0.72, r * 2, r * 0.4)
    g.fillStyle = '#2a2a33'
    g.fillRect(w / 2 - r * 0.06, h * 0.72 - r, r * 0.12, r)
    const p = Math.sin(st.t * 4) > 0
    g.fillStyle = p ? '#ff3b30' : '#5a1512'
    g.fillRect(w / 2 + r * 0.5, h * 0.72 + r * 0.12, 6, 6)
    this.vignette(0.45)
  },

  domeTop(g, w, h, st) {
    this.sky('#2a2f58', '#f0a57f')
    this.stars(25, 0.3)
    this.missile(Math.max(st.m, 0.45), st.t, { x1: 0.45, y1: 0.7, split: true })
    g.fillStyle = '#f2eee6'
    g.beginPath()
    g.ellipse(w / 2, h * 1.25, w * 0.75, h * 0.45, 0, Math.PI, 0)
    g.fill()
    g.fillStyle = 'rgba(90, 160, 255, .55)'
    g.fillRect(w * 0.47, h * 0.82, w * 0.06, h * 0.2)
    this.vignette(0.45)
  },

  domeIn(g, w, h, st) {
    g.fillStyle = '#0d0f17'
    g.fillRect(0, 0, w, h)
    // the slit of sky, and the telescope
    g.fillStyle = '#e59a7a'
    g.fillRect(w * 0.46, 0, w * 0.08, h * 0.3)
    g.save()
    g.translate(w * 0.4, h * 0.7)
    g.rotate(-0.9)
    g.fillStyle = '#2b2f3c'
    g.fillRect(0, -h * 0.06, h * 0.7, h * 0.12)
    g.restore()
    g.fillStyle = '#1b1e28'
    g.fillRect(w * 0.36, h * 0.66, w * 0.08, h * 0.2)
    // the seam in the floor, glowing
    const p = 0.5 + 0.5 * Math.sin(st.t * 2)
    g.strokeStyle = `rgba(110, 190, 255, ${0.5 + 0.5 * p})`
    g.lineWidth = 3
    g.shadowColor = '#6ab8ff'
    g.shadowBlur = 18
    g.strokeRect(w * 0.55, h * 0.84, w * 0.2, h * 0.1)
    g.shadowBlur = 0
    if (st.f.cat) {
      g.fillStyle = '#111'
      g.beginPath()
      g.ellipse(w * 0.65, h * 0.86, 12, 9, 0, 0, TAU)
      g.fill()
      g.beginPath()
      g.arc(w * 0.65 + 9, h * 0.83, 6, 0, TAU)
      g.fill()
    }
    this.vignette(0.65)
  },

  telescope(g, w, h, st) {
    g.fillStyle = '#000'
    g.fillRect(0, 0, w, h)
    const r = Math.min(w, h) * 0.42
    g.save()
    g.beginPath()
    g.arc(w / 2, h / 2, r, 0, TAU)
    g.clip()
    g.fillStyle = '#0f1424'
    g.fillRect(0, 0, w, h)
    this.stars(40, 0.5, 2)
    // the warhead, close enough to read
    g.translate(w / 2 + Math.sin(st.t * 0.7) * 6, h / 2 + Math.cos(st.t * 0.5) * 4)
    g.rotate(0.5)
    g.fillStyle = '#9aa0a8'
    g.fillRect(-r * 0.6, -r * 0.12, r * 1.1, r * 0.24)
    g.beginPath()
    g.moveTo(r * 0.5, -r * 0.12)
    g.lineTo(r * 0.8, 0)
    g.lineTo(r * 0.5, r * 0.12)
    g.fill()
    g.fillStyle = '#1b1d22'
    g.font = `bold ${Math.round(r * 0.12)}px ui-monospace, Menlo, monospace`
    g.fillText('HALCYON', -r * 0.45, r * 0.045)
    g.restore()
    g.strokeStyle = 'rgba(255,255,255,.15)'
    g.beginPath()
    g.moveTo(w / 2 - r, h / 2)
    g.lineTo(w / 2 + r, h / 2)
    g.moveTo(w / 2, h / 2 - r)
    g.lineTo(w / 2, h / 2 + r)
    g.stroke()
  },

  cavern(g, w, h, st) {
    g.fillStyle = '#05060a'
    g.fillRect(0, 0, w, h)
    const cx = w / 2, cy = h * 0.48 + Math.sin(st.t * 0.8) * 6
    const rw = Math.min(w * 0.36, h * 0.6), rh = rw * 0.32
    for (let i = 0; i < 4; i++) {
      const p = (st.t * 0.5 + i / 4) % 1
      g.strokeStyle = `rgba(140, 200, 255, ${0.4 * (1 - p)})`
      g.lineWidth = 2
      g.beginPath()
      g.ellipse(cx, cy, rw * (1 + p), rh * (1 + p), 0, 0, TAU)
      g.stroke()
    }
    const gr = g.createLinearGradient(0, cy - rh, 0, cy + rh)
    gr.addColorStop(0, '#d9e6f2')
    gr.addColorStop(1, '#5f6f86')
    g.fillStyle = gr
    g.beginPath()
    g.ellipse(cx, cy, rw, rh, 0, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(255, 245, 200, .9)'
    g.beginPath()
    g.ellipse(cx, cy + rh * 0.2, rw * 0.12, rh * 0.35, 0, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(255,245,200,.08)'
    g.beginPath()
    g.moveTo(cx - rw * 0.1, cy + rh * 0.3)
    g.lineTo(cx - rw * 0.4, h)
    g.lineTo(cx + rw * 0.4, h)
    g.lineTo(cx + rw * 0.1, cy + rh * 0.3)
    g.fill()
    this.vignette(0.75)
  },

  // ---- endings
  flash(g, w, h, st, k) {
    // white, then the slow grey after
    const white = clamp(1 - (k - 0.4) / 2.5)
    g.fillStyle = '#7d7672'
    g.fillRect(0, 0, w, h)
    this.skyline(h, 0.4 * clamp(k / 3), '#3a3532')
    const r = rng(41)
    g.fillStyle = 'rgba(230, 220, 210, .5)'
    for (let i = 0; i < 60; i++) {
      const x = (r() * w + Math.sin(st.t * 0.3 + i) * 20) % w
      const y = (r() * h + st.t * (8 + r() * 10)) % h
      g.fillRect(x, y, 2, 2)
    }
    g.fillStyle = `rgba(255, 255, 255, ${white})`
    g.fillRect(0, 0, w, h)
  },
  below(g, w, h, st) {
    DRAW.deep.call(this, g, w, h, { ...st, t: st.t * 0.3 })
    g.fillStyle = 'rgba(255, 180, 90, .08)'
    g.fillRect(0, 0, w, h)
  },
  dawn(g, w, h, st, k) {
    this.sky('#4a76b8', '#ffd2a0')
    const sun = g.createRadialGradient(w * 0.7, h * 0.85, 0, w * 0.7, h * 0.85, h * 0.6)
    sun.addColorStop(0, 'rgba(255, 240, 200, .9)')
    sun.addColorStop(1, 'rgba(255, 240, 200, 0)')
    g.fillStyle = sun
    g.fillRect(0, 0, w, h)
    // the new star
    const st2 = clamp(1 - k / 6)
    g.fillStyle = `rgba(255,255,255,${0.4 + st2 * 0.6})`
    g.beginPath()
    g.arc(w * 0.35, h * 0.2, 2 + st2 * 8 + Math.sin(st.t * 5), 0, TAU)
    g.fill()
    this.skyline(h, 0.55, '#2c2a3c', 0.5, st.t)
    g.globalAlpha = 0.6
    this.dish(w * 0.15, h, Math.min(w, h) * 0.2, st.t)
    g.globalAlpha = 1
  },
  space(g, w, h, st) {
    g.fillStyle = '#02030a'
    g.fillRect(0, 0, w, h)
    this.stars(140, 0.9, 6, -20, st.t)
    const R = w * 1.4
    const earth = g.createRadialGradient(w * 0.5, h + R * 0.86, R * 0.7, w * 0.5, h + R * 0.86, R)
    earth.addColorStop(0, '#1d4f8f')
    earth.addColorStop(0.97, '#5aa0e6')
    earth.addColorStop(1, 'rgba(120,180,255,0)')
    g.fillStyle = earth
    g.beginPath()
    g.arc(w * 0.5, h + R * 0.86, R, 0, TAU)
    g.fill()
    const p = 0.5 + 0.5 * Math.sin(st.t * 1.5)
    g.fillStyle = `rgba(255, 245, 230, ${0.5 + 0.5 * p})`
    g.beginPath()
    g.arc(w * 0.42, h - R * 0.14 + h * 0.02, 3 + p * 3, 0, TAU)
    g.fill()
  },
  loop(g, w, h, st, k) {
    g.fillStyle = '#05050a'
    g.fillRect(0, 0, w, h)
    const cx = w / 2, cy = h / 2
    for (let i = 0; i < 160; i++) {
      const a = i * 0.35 - st.t * 2.2
      const r = (i / 160) * Math.max(w, h) * 0.6
      g.fillStyle = `hsla(${200 + i}, 80%, 70%, ${1 - i / 160})`
      g.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3, 3)
    }
    // a clock face running backwards
    const R = Math.min(w, h) * 0.18
    g.strokeStyle = 'rgba(255,255,255,.8)'
    g.lineWidth = 3
    g.beginPath()
    g.arc(cx, cy, R, 0, TAU)
    g.stroke()
    const ha = -st.t * 6
    g.beginPath()
    g.moveTo(cx, cy)
    g.lineTo(cx + Math.cos(ha) * R * 0.8, cy + Math.sin(ha) * R * 0.8)
    g.moveTo(cx, cy)
    g.lineTo(cx + Math.cos(ha / 12) * R * 0.5, cy + Math.sin(ha / 12) * R * 0.5)
    g.stroke()
    g.fillStyle = `rgba(255,255,255,${clamp(k / 4)})`
    g.font = `bold ${Math.round(R * 0.35)}px ui-monospace, Menlo, monospace`
    g.textAlign = 'center'
    g.fillText('06:42', cx, cy + R * 1.6)
  },
}
