// D: a camera filter. A blocky black bar over your eyes that keeps changing shape, and drawn eyes
// on top that follow your real ones: where they are, how open they are, and where they look.
// Face tracking is MediaPipe's Face Landmarker, served from ./vendor and run entirely in the browser.
import { FaceLandmarker } from './vendor/vision_bundle.mjs'

const VENDOR = new URL('./vendor/', import.meta.url).href
const $ = (id) => document.getElementById(id)
const video = $('cam')
const view = $('view')
const g = view.getContext('2d')
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const ease = (a, b, k) => a + (b - a) * k
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a))
const easeAng = (a, b, k) => a + wrap(b - a) * k
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

// ═══════════ Landmarks (MediaPipe face mesh indices)
const EYES = [
  { outer: 33, inner: 133, lids: [[160, 144], [159, 145], [158, 153]], blink: 'eyeBlinkRight' }, // the person's right eye
  { outer: 263, inner: 362, lids: [[387, 373], [386, 374], [385, 380]], blink: 'eyeBlinkLeft' }, // and their left
]
const IRIS = [468, 473] // the two iris centres
const CHEEKS = [234, 454] // the sides of the face, for its width

// ═══════════ The bar: a grid of blocks laid across the face
const COLS = 32
const ROWS = 24
const EYE_ROW = 9 // the line through the eyes; the rows above it reach the forehead
const CX = COLS / 2
const CELLS_PER_FACE = 17 // a face, cheek to cheek, is this many blocks wide (the bar is wider still)

// ═══════════ The drawn eyes
const EYE_SCALE = 1.75 // drawn much bigger than the real eye, like the reference stills
const GAZE = 1.3 // the irises move a little further than the real ones, so you can see it
const GAZE_SETTLE = 5 // seconds: how slowly your resting look becomes the new centre
// How shut each eye is: 0 is as open as it usually is. The lid gap and the tracker's blink score both count.
const BLINK_WEIGHT = 0.8 // how much the blink score adds to what the lid gap says
const WINK = 0.6 // when you wink, the tracker half-shuts the open eye too, so the difference between them gets this much extra
const SHUT_FROM = 0.12 // the drawn eye starts to close here
const SHUT_AT = 0.4 // and is shut here
const PAPER = '#f2f1ee'
const INK = '#060607'

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One face's bar: which blocks are filled, and how it keeps changing. */
class Bar {
  constructor(seed) {
    this.rng = mulberry32(seed)
    this.cells = new Uint8Array(COLS * ROWS)
    this.shade = Uint8Array.from({ length: COLS * ROWS }, () => 6 + Math.floor(this.rng() * 5)) // not quite flat black
    this.canvas = document.createElement('canvas')
    this.canvas.width = COLS
    this.canvas.height = ROWS
    this.cx = this.canvas.getContext('2d')
    this.img = this.cx.createImageData(COLS, ROWS)
    this.nextSmall = 0
    this.nextBig = 0
    this.regen()
  }
  ri(a, b) { return a + Math.floor(this.rng() * (b - a + 1)) }
  chance(p) { return this.rng() < p }
  get(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS ? this.cells[y * COLS + x] : 0 }
  rect(x0, y0, x1, y1, v = 1) {
    const xa = Math.max(0, Math.min(x0, x1)), xb = Math.min(COLS - 1, Math.max(x0, x1))
    const ya = Math.max(0, Math.min(y0, y1)), yb = Math.min(ROWS - 1, Math.max(y0, y1))
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) this.cells[y * COLS + x] = v
  }
  shiftRows(y0, y1, dx) {
    for (let y = Math.max(0, y0); y <= Math.min(ROWS - 1, y1); y++) {
      const row = this.cells.slice(y * COLS, (y + 1) * COLS)
      for (let x = 0; x < COLS; x++) { const sx = x - dx; this.cells[y * COLS + x] = sx >= 0 && sx < COLS ? row[sx] : 0 }
    }
  }
  /** Whatever happens to the shape, the eyes and brows stay covered. */
  coverEyes() { this.rect(CX - 10, EYE_ROW - 4, CX + 9, EYE_ROW + 2) }

  /** A whole new shape: a slab over the eyes with ragged edges, maybe a block standing up on a corner,
   *  a chunk hanging down one side, bites out of the bottom, bits breaking off, a slice slid sideways. */
  regen() {
    this.cells.fill(0)
    const half = this.ri(12, 14)
    const left = CX - half, right = CX + half - 1
    const top = EYE_ROW - 6 + this.ri(-1, 1), bottom = EYE_ROW + 4 + this.ri(0, 2)
    for (let y = top; y <= bottom; y++) {
      const jl = this.chance(0.3) ? this.ri(-1, 1) : 0, jr = this.chance(0.3) ? this.ri(-1, 1) : 0
      this.rect(left + jl, y, right + jr, y)
    }
    for (let x = left; x <= right; ) {
      const run = this.ri(2, 6), d = this.ri(0, 5)
      if (d === 0) this.rect(x, top - 1, x + run - 1, top - 1)
      else if (d === 1) this.rect(x, top, x + run - 1, top, 0)
      x += run
    }
    if (this.chance(0.55)) {
      const w = this.ri(3, 8), h = this.ri(1, 3)
      const x0 = this.chance(0.5) ? left + this.ri(-1, 2) : right - w + 1 - this.ri(-1, 2)
      this.rect(x0, top - h, x0 + w - 1, top - 1)
    }
    if (this.chance(0.7)) {
      const atLeft = this.chance(0.5), depth = this.ri(3, 9)
      let w = this.ri(5, 11), edge = atLeft ? left : right
      for (let k = 1; k <= depth && w >= 2; k++) {
        if (atLeft) this.rect(edge, bottom + k, edge + w - 1, bottom + k)
        else this.rect(edge - w + 1, bottom + k, edge, bottom + k)
        if (this.chance(0.4)) w -= this.ri(1, 3)
        if (this.chance(0.25)) edge += atLeft ? 1 : -1
      }
    }
    for (let n = this.ri(0, 3); n > 0; n--) {
      const x0 = this.ri(left + 2, right - 4)
      this.rect(x0, bottom, x0 + this.ri(0, 2), bottom, 0)
    }
    if (this.chance(0.45)) {
      for (let n = this.ri(1, 3); n > 0; n--) {
        const x0 = CX + this.ri(-7, 4), y0 = bottom + this.ri(2, 6)
        this.rect(x0, y0, x0 + this.ri(1, 4), y0)
      }
    }
    if (this.chance(0.3)) {
      const y0 = this.ri(top, bottom - 1)
      this.shiftRows(y0, y0 + this.ri(0, 1), [-2, -1, 1, 2][this.ri(0, 3)])
    }
    this.coverEyes()
    this.dirty = true
  }

  /** A small twitch: a few blocks grow out of an edge or get bitten off it, now and then a row slips. */
  mutate() {
    for (let n = this.ri(1, 3); n > 0; n--) {
      for (let tries = 0; tries < 60; tries++) {
        const x = this.ri(0, COLS - 1), y = this.ri(0, ROWS - 1)
        if (!this.get(x, y)) continue
        const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !this.get(x + dx, y + dy))
        if (!open.length) continue
        const [dx, dy] = open[this.ri(0, open.length - 1)]
        const along = this.ri(1, 4), out = this.ri(1, 2)
        if (this.chance(0.5)) {
          if (dx) this.rect(x + dx, y, x + dx * out, y + along - 1)
          else this.rect(x, y + dy, x + along - 1, y + dy * out)
        } else {
          if (dx) this.rect(x, y, x - dx * (out - 1), y + along - 1, 0)
          else this.rect(x, y, x + along - 1, y - dy * (out - 1), 0)
        }
        break
      }
    }
    if (this.chance(0.12)) {
      const y0 = this.ri(EYE_ROW - 5, EYE_ROW + 4)
      this.shiftRows(y0, y0, this.chance(0.5) ? 1 : -1)
    }
    this.coverEyes()
    this.dirty = true
  }

  /** Twitches every fraction of a second, a whole new shape every couple of seconds. */
  tick(now, morph) {
    if (!morph) return
    if (now >= this.nextBig) {
      this.regen()
      this.nextBig = now + 1600 + this.rng() * 2600
      this.nextSmall = now + 120 + this.rng() * 300
    } else if (now >= this.nextSmall) {
      this.mutate()
      this.nextSmall = now + 110 + this.rng() * 480
    }
  }

  paint() {
    if (!this.dirty) return
    const d = this.img.data
    for (let i = 0; i < COLS * ROWS; i++) {
      const s = this.shade[i]
      d[i * 4] = s
      d[i * 4 + 1] = s
      d[i * 4 + 2] = s + 2
      d[i * 4 + 3] = this.cells[i] ? 255 : 0
    }
    this.cx.putImageData(this.img, 0, 0)
    this.dirty = false
  }
}

// ═══════════ Faces: what the tracker sees, smoothed into what gets drawn
const slots = [] // one per face on screen, so each keeps its own bar
let detections = 0
let emptyDetections = 0 // frames the tracker found no face in (for testing)
let seed = (Math.random() * 1e9) | 0

/** Pixel positions of what we need from one face's 478 landmarks, and how shut its eyes look. */
function measure(lm, w, h, shapes) {
  const P = (i) => ({ x: lm[i].x * w, y: lm[i].y * h })
  // the lid gap is measured in 3D, so turning or tipping your head doesn't squash an eye shut
  const D3 = (a, b) => Math.hypot((lm[a].x - lm[b].x) * w, (lm[a].y - lm[b].y) * h, ((lm[a].z || 0) - (lm[b].z || 0)) * w)
  const score = (name) => shapes?.categories?.find((c) => c.categoryName === name)?.score ?? 0
  const eyes = EYES.map((e) => {
    const outer = P(e.outer), inner = P(e.inner)
    const width = Math.max(1, dist(outer, inner))
    const gap = e.lids.reduce((sum, [u, l]) => sum + D3(u, l), 0) / e.lids.length
    return { outer, inner, c: mid(outer, inner), width, ratio: gap / Math.max(1e-6, D3(e.outer, e.inner)), blink: score(e.blink) }
  })
  if (lm.length > IRIS[1]) {
    const a = P(IRIS[0]), b = P(IRIS[1])
    const aFirst = dist(a, eyes[0].c) <= dist(a, eyes[1].c)
    eyes[0].iris = aFirst ? a : b
    eyes[1].iris = aFirst ? b : a
  } else for (const e of eyes) e.iris = e.c
  const ang = Math.atan2(eyes[1].c.y - eyes[0].c.y, eyes[1].c.x - eyes[0].c.x) // across the face
  return { m: mid(eyes[0].c, eyes[1].c), ang, faceW: Math.max(10, dist(P(CHEEKS[0]), P(CHEEKS[1]))), eyes }
}

function newSlot(d, now) {
  return {
    bar: new Bar(seed++),
    target: d, seen: now, lostAt: 0, alpha: 0,
    m: { ...d.m }, ang: d.ang, faceW: d.faceW,
    eyes: d.eyes.map((e) => ({
      c: { ...e.c }, ax: Math.atan2(e.outer.y - e.inner.y, e.outer.x - e.inner.x), width: e.width,
      open: 1, base: Math.max(0.2, e.ratio), bbase: Math.min(0.35, e.blink), // its usual lid gap and blink score
    })),
    gaze: null, // where both eyes look, and their resting centre: { x, y, bx, by }
  }
}

/** Matches this frame's faces to the ones already on screen (nearest first), so bars don't swap faces. */
function track(dets, now) {
  detections++
  const used = new Set()
  for (const d of dets) {
    let best = null, bd = Infinity
    for (const s of slots) {
      if (used.has(s)) continue
      const dd = dist(s.m, d.m)
      if (dd < bd) { bd = dd; best = s }
    }
    if (best && bd < d.faceW * 0.9) {
      used.add(best)
      best.target = d
      best.seen = now
    } else {
      const s = newSlot(d, now)
      slots.push(s)
      used.add(s)
    }
  }
  for (const s of slots) {
    if (used.has(s)) { s.lostAt = 0; s.misses = 0 }
    else { s.misses = (s.misses || 0) + 1; if (!s.lostAt) s.lostAt = now }
  }
}

/** Each frame: ease towards the latest measurements, fade faces in and out, let the bars morph. */
function step(now, dt) {
  const kPos = 1 - Math.exp(-dt / 0.05)
  const kEye = 1 - Math.exp(-dt / 0.035)
  const kOpen = 1 - Math.exp(-dt / 0.03)
  const kUp = 1 - Math.exp(-dt / 0.3), kDown = 1 - Math.exp(-dt / 3)
  for (let i = slots.length - 1; i >= 0; i--) {
    const s = slots[i], d = s.target
    // a few missed frames don't make it blink, however slowly the device tracks
    const live = !s.lostAt || s.misses < 3 || now - s.lostAt < 200
    s.alpha = clamp(s.alpha + (live ? dt * 8 : -dt * 4))
    if (!live && s.alpha <= 0) { slots.splice(i, 1); continue }
    s.m.x = ease(s.m.x, d.m.x, kPos)
    s.m.y = ease(s.m.y, d.m.y, kPos)
    s.ang = easeAng(s.ang, d.ang, kPos)
    s.faceW = ease(s.faceW, d.faceW, kPos)
    const ux = Math.cos(d.ang), uy = Math.sin(d.ang), vx = -uy, vy = ux
    const shut = d.eyes.map((e, j) => {
      const se = s.eyes[j]
      se.c.x = ease(se.c.x, e.c.x, kEye)
      se.c.y = ease(se.c.y, e.c.y, kEye)
      se.ax = easeAng(se.ax, Math.atan2(e.outer.y - e.inner.y, e.outer.x - e.inner.x), kEye)
      se.width = ease(se.width, e.width, kEye)
      // this eye's usual lid gap: quick to rise, slow to sink, and blinks and winks don't drag it down
      if (e.ratio > se.base) se.base = ease(se.base, e.ratio, kUp)
      else if (e.ratio > se.base * 0.75) se.base = ease(se.base, e.ratio, kDown)
      // and its usual blink score, the other way up
      if (e.blink < se.bbase) se.bbase = ease(se.bbase, e.blink, kUp)
      else if (e.blink < se.bbase + 0.1) se.bbase = ease(se.bbase, e.blink, kDown)
      return Math.max(0, 1 - e.ratio / se.base) + BLINK_WEIGHT * Math.max(0, e.blink - se.bbase)
    })
    // One eye shutting more than the other is a wink: it shuts further, and the other opens back up.
    s.eyes.forEach((se, j) => {
      const sh = shut[j] + WINK * (shut[j] - shut[1 - j])
      se.open = ease(se.open, clamp(1 - (sh - SHUT_FROM) / (SHUT_AT - SHUT_FROM)), kOpen)
    })
    // where they look: each iris against the middle of its eye, along and across the face, in eye-widths,
    // counted by how open the eye is (a shut eye's iris is only a guess)
    let gx = 0, gy = 0, gw = 0
    d.eyes.forEach((e, j) => {
      const dx = e.iris.x - e.c.x, dy = e.iris.y - e.c.y, wt = 0.05 + s.eyes[j].open
      gx += ((dx * ux + dy * uy) / e.width) * wt
      gy += ((dx * vx + dy * vy) / e.width) * wt
      gw += wt
    })
    gx /= gw
    gy /= gw
    // Both drawn eyes share one gaze, the average of the two. Real eyes turn inwards to look at a
    // screen near the camera; copied eye by eye (and exaggerated) that reads as cross-eyed. The
    // centre is wherever you've been looking lately, so only real glances move the irises.
    if (!s.gaze) s.gaze = { x: gx, y: gy, bx: gx, by: gy }
    const gz = s.gaze, kBase = 1 - Math.exp(-dt / GAZE_SETTLE)
    gz.x = ease(gz.x, gx, kEye)
    gz.y = ease(gz.y, gy, kEye)
    gz.bx = ease(gz.bx, gx, kBase)
    gz.by = ease(gz.by, gy, kBase)
    s.bar.tick(now, morph)
  }
}

// ═══════════ Drawing
function drawFace(s) {
  const c = s.faceW / CELLS_PER_FACE
  const ux = Math.cos(s.ang), uy = Math.sin(s.ang), vx = -uy, vy = ux
  s.bar.paint()
  g.save()
  g.globalAlpha = s.alpha
  // the grid's own space: one unit is one block, laid along the line of the eyes
  g.transform(ux * c, uy * c, vx * c, vy * c, s.m.x - (ux * CX + vx * EYE_ROW) * c, s.m.y - (uy * CX + vy * EYE_ROW) * c)
  g.imageSmoothingEnabled = false
  g.drawImage(s.bar.canvas, 0, 0)
  g.restore()
  g.save()
  g.globalAlpha = s.alpha
  const look = s.gaze ? { x: s.gaze.x - s.gaze.bx, y: s.gaze.y - s.gaze.by } : { x: 0, y: 0 }
  for (const e of s.eyes) drawEye(e, s.ang, look)
  g.restore()
}

function drawEye(e, faceAng, look) {
  const w = e.width * EYE_SCALE
  const ax = Math.cos(e.ax), ay = Math.sin(e.ax) // inner corner → outer corner
  const ux = Math.cos(faceAng), uy = Math.sin(faceAng), vx = -uy, vy = ux // across the face, and down it
  const A = { x: e.c.x - (ax * w) / 2, y: e.c.y - (ay * w) / 2 }
  const B = { x: e.c.x + (ax * w) / 2, y: e.c.y + (ay * w) / 2 }
  if (e.open < 0.16) {
    // shut: a thin curved line
    g.beginPath()
    g.moveTo(A.x, A.y)
    g.quadraticCurveTo(e.c.x + vx * w * 0.07, e.c.y + vy * w * 0.07, B.x, B.y)
    g.strokeStyle = PAPER
    g.lineWidth = Math.max(1.5, w * 0.045)
    g.lineCap = 'round'
    g.stroke()
    return
  }
  const up = w * 0.42 * e.open, lo = w * 0.28 * e.open
  const upC = { x: e.c.x - vx * up + ax * w * 0.06, y: e.c.y - vy * up + ay * w * 0.06 } // the lid peaks a little towards the outer corner
  const loC = { x: e.c.x + vx * lo - ax * w * 0.04, y: e.c.y + vy * lo - ay * w * 0.04 }
  const eye = new Path2D()
  eye.moveTo(A.x, A.y)
  eye.quadraticCurveTo(upC.x, upC.y, B.x, B.y)
  eye.quadraticCurveTo(loC.x, loC.y, A.x, A.y)
  eye.closePath()
  g.fillStyle = PAPER
  g.fill(eye)
  // the iris goes where they're looking, and the lids cut it off
  g.save()
  g.clip(eye)
  const r = w * 0.17
  const ox = clamp(look.x * w * GAZE, -w * 0.28, w * 0.28), oy = clamp(look.y * w * GAZE, -w * 0.1, w * 0.1)
  const ix = e.c.x + ux * ox + vx * oy, iy = e.c.y + uy * ox + vy * oy
  g.beginPath()
  g.arc(ix, iy, r, 0, Math.PI * 2)
  g.fillStyle = '#b81f28'
  g.fill()
  g.lineWidth = r * 0.3
  g.strokeStyle = '#5e0a0f'
  g.stroke()
  g.beginPath()
  g.arc(ix, iy, r * 0.46, 0, Math.PI * 2)
  g.fillStyle = '#220405'
  g.fill()
  g.beginPath()
  g.arc(ix - r * 0.3, iy - r * 0.34, r * 0.15, 0, Math.PI * 2)
  g.fillStyle = 'rgba(255, 255, 255, 0.85)'
  g.fill()
  g.restore()
  // the line of the upper lid
  g.beginPath()
  g.moveTo(A.x, A.y)
  g.quadraticCurveTo(upC.x, upC.y, B.x, B.y)
  g.strokeStyle = INK
  g.lineWidth = Math.max(1.5, w * 0.05)
  g.lineCap = 'round'
  g.stroke()
}

// ═══════════ Camera and tracker
let stream = null
let tracker = null
let facing = 'user'
let mirror = true
let running = false
let morph = true

function loadTracker() {
  const fileset = { wasmLoaderPath: VENDOR + 'vision_wasm_internal.js', wasmBinaryPath: VENDOR + 'vision_wasm_internal.wasm' }
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: VENDOR + 'face_landmarker.task', delegate },
    runningMode: 'VIDEO',
    numFaces: 3,
    outputFaceBlendshapes: true, // its eyeBlink scores help tell a wink
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
  // the GPU if the browser lets us, otherwise the CPU
  return FaceLandmarker.createFromOptions(fileset, options('GPU')).catch(() => FaceLandmarker.createFromOptions(fileset, options('CPU')))
}

function stopCamera() {
  if (stream) for (const t of stream.getTracks()) t.stop()
  stream = null
}

async function startCamera(want) {
  stopCamera()
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: want, width: { ideal: 1280 }, height: { ideal: 720 } },
  })
  video.srcObject = stream
  await video.play()
  const settings = stream.getVideoTracks()[0]?.getSettings?.() || {}
  mirror = (settings.facingMode || want) !== 'environment' // a selfie camera shows you like a mirror
  slots.length = 0
}

function cameraError(e) {
  const n = e && e.name
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Camera access was blocked. Allow it for this site in your browser’s settings, then try again.'
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No camera was found on this device.'
  if (n === 'NotReadableError' || n === 'AbortError') return 'The camera is busy. Close any other app or tab that’s using it, then try again.'
  return 'The camera couldn’t start' + (e && e.message ? ': ' + e.message : '.')
}

async function showFlip() {
  try {
    const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput')
    $('flip').hidden = cams.length < 2
  } catch (e) {}
}

// ═══════════ Every frame
let last = performance.now()
let lastVideoTime = -1
let lastStamp = 0
let lastFaceAt = 0
let trackerFailed = false
const hint = $('hint')

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
  last = now
  if (!running || video.readyState < 2 || !video.videoWidth) return
  const w = video.videoWidth, h = video.videoHeight
  if (view.width !== w || view.height !== h) { view.width = w; view.height = h }
  if (tracker && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime
    lastStamp = Math.max(now, lastStamp + 1)
    try {
      const res = tracker.detectForVideo(video, lastStamp)
      const faces = res.faceLandmarks || []
      if (faces.length) lastFaceAt = now
      else emptyDetections++
      track(faces.map((lm, i) => measure(lm, w, h, res.faceBlendshapes?.[i])), now)
    } catch (e) {
      console.warn('D: tracking failed on a frame', e)
    }
  }
  step(now, dt)
  g.setTransform(mirror ? -1 : 1, 0, 0, 1, mirror ? w : 0, 0)
  g.drawImage(video, 0, 0, w, h)
  for (const s of slots) if (s.alpha > 0.01) drawFace(s)
  g.setTransform(1, 0, 0, 1, 0, 0)

  const msg = trackerFailed ? 'The face tracker didn’t load. Check your connection and reload.' : !tracker ? 'Loading the face tracker…' : now - lastFaceAt > 900 ? 'Looking for a face…' : ''
  if (msg) hint.textContent = msg
  hint.classList.toggle('off', !msg)
}
requestAnimationFrame(frame)

// ═══════════ Controls
const startBtn = $('start')
const errBox = $('err')
const ownTab = $('own')
let framed = true
try { framed = window.self !== window.top } catch (e) {}
// Some browsers won't give a camera to a page inside a window like the nikstil.com desktop's.
// There, a way out to D's own tab is always on offer.
if (framed && ownTab) ownTab.hidden = false
let trackerLoading = null

startBtn.addEventListener('click', async () => {
  errBox.textContent = ''
  if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    errBox.textContent = 'The camera needs a secure (https) page in a browser that supports it.'
    return
  }
  startBtn.disabled = true
  startBtn.textContent = 'Starting…'
  // load the tracker while the camera asks for permission
  if (!trackerLoading) {
    trackerLoading = loadTracker()
      .then((t) => { tracker = t })
      .catch((e) => { trackerFailed = true; console.error('D: the face tracker failed to load', e) })
  }
  try {
    await startCamera(facing)
  } catch (e) {
    stopCamera()
    errBox.textContent = cameraError(e) + (framed ? ' If it still won’t start here, open D in its own tab.' : '')
    startBtn.disabled = false
    startBtn.textContent = 'Turn on camera'
    return
  }
  $('intro').hidden = true
  $('ui').hidden = false
  running = true
  lastFaceAt = performance.now()
  showFlip()
})

$('flip').addEventListener('click', async () => {
  const before = facing
  facing = facing === 'user' ? 'environment' : 'user'
  try {
    await startCamera(facing)
  } catch (e) {
    facing = before
    try { await startCamera(facing) } catch (e2) {}
  }
})

$('snap').addEventListener('click', () => {
  if (!running || !view.width) return
  const flash = $('flash')
  flash.classList.remove('on')
  void flash.offsetWidth
  flash.classList.add('on')
  view.toBlob((blob) => {
    if (!blob) return
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `D-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 10000)
  }, 'image/png')
})

$('shuffle').addEventListener('click', () => {
  const now = performance.now()
  for (const s of slots) {
    s.bar.regen()
    s.bar.nextBig = now + 2500
  }
})

$('morph').addEventListener('click', (e) => {
  morph = !morph
  e.currentTarget.setAttribute('aria-pressed', String(morph))
  e.currentTarget.textContent = morph ? 'MORPH ON' : 'MORPH OFF'
})

// the camera stops when the tab goes away for good
window.addEventListener('pagehide', stopCamera)

// (for testing from the console: read-only)
window.D = {
  get state() {
    return {
      running, tracker: !!tracker, trackerFailed, mirror, morph, width: view.width, height: view.height, detections, emptyDetections,
      faces: slots.map((s) => ({
        alpha: s.alpha, m: { ...s.m }, ang: s.ang, faceW: s.faceW,
        shape: Array.from(s.bar.cells).join(''),
        look: s.gaze ? { x: s.gaze.x - s.gaze.bx, y: s.gaze.y - s.gaze.by } : null,
        eyes: s.eyes.map((e) => ({ c: { ...e.c }, width: e.width, open: e.open })),
      })),
    }
  },
}
