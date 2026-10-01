// nikstil.com profile pictures: a detailed 32×32 pixel-art portrait generated from a seed (the
// player's avatar code, or their username until they pick one). No uploads, nothing to moderate.
// window.nikstilAvatar.url(seed) gives a PNG data URL (cached); .randomSeed() a new code.
;(() => {
  'use strict'
  if (window.nikstilAvatar) return

  const N = 32
  const cache = new Map()

  // A small seeded random number generator (the same seed always draws the same face).
  function rng(seed) {
    let h = 1779033703 ^ seed.length
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
      h = (h << 13) | (h >>> 19)
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507)
      h = Math.imul(h ^ (h >>> 13), 3266489909)
      return ((h ^= h >>> 16) >>> 0) / 4294967296
    }
  }

  const SKIN = [
    ['#ffdfc4', '#f0c8a8', '#d9a888'],
    ['#f1c27d', '#dba968', '#b98a4f'],
    ['#e0ac69', '#c99255', '#a5743e'],
    ['#c68642', '#a96d33', '#875426'],
    ['#8d5524', '#73441c', '#5a3414'],
    ['#5c3a1e', '#4a2e17', '#382210'],
    ['#9be37a', '#7cc45d', '#5ea443'], // the occasional alien
    ['#a7c7ff', '#86a8e6', '#6788c7'],
  ]
  const HAIR = ['#1b1b1b', '#3b2416', '#6b4423', '#a0662e', '#d9b45a', '#f1e3a6', '#c0392b', '#e86fb0', '#5ea9ff', '#7a5cff', '#2ecc71', '#ececec']
  const SHIRT = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#34495e', '#ecf0f1', '#ff6fb5', '#222']
  const BG = [
    ['#7fd3ff', '#4fa8e8'],
    ['#ffd36e', '#f2a93b'],
    ['#b5f28a', '#78c94f'],
    ['#ff9ec7', '#e8679f'],
    ['#c7a6ff', '#9673e6'],
    ['#9ff0e0', '#5cc9b4'],
    ['#ffb38a', '#f07f4a'],
    ['#d0d6e0', '#a4aebd'],
  ]
  const EYES = ['#2b2b2b', '#3c6fd6', '#2e8b57', '#7a4a1f', '#8e44ad', '#c0392b']

  function draw(seed) {
    const r = rng(String(seed))
    const pick = (list) => list[Math.floor(r() * list.length)]
    const chance = (p) => r() < p
    const c = document.createElement('canvas')
    c.width = c.height = N
    const g = c.getContext('2d')
    const px = (x, y, col, w = 1, h = 1) => {
      g.fillStyle = col
      g.fillRect(x, y, w, h)
    }

    // Background: a two-tone dither with a few sparkles.
    const [bg1, bg2] = pick(BG)
    px(0, 0, bg1, N, N)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (y > 14 && (x + y) % 2 === 0 && r() < (y - 14) / 22) px(x, y, bg2)
    for (let i = 0; i < 4; i++) if (chance(0.6)) px(Math.floor(r() * N), Math.floor(r() * 10), '#ffffffaa')

    const [skin, skinMid, skinDark] = pick(SKIN)
    const hair = pick(HAIR)
    const shirt = pick(SHIRT)
    const eye = pick(EYES)
    const outline = '#1a1a1a'

    // Shoulders and shirt, with a collar or a hoodie.
    const hoodie = chance(0.35)
    for (let y = 25; y < N; y++) {
      const half = 7 + (y - 25)
      px(16 - half, y, shirt, half * 2, 1)
    }
    px(16 - 7, 25, outline, 14, 1)
    if (hoodie) {
      px(12, 25, '#00000033', 8, 3)
      px(14, 27, '#ffffffcc', 1, 3)
      px(17, 27, '#ffffffcc', 1, 3)
    } else {
      px(13, 25, '#ffffff', 2, 2)
      px(17, 25, '#ffffff', 2, 2)
      px(15, 25, skinMid, 2, 2)
    }
    // Neck.
    px(14, 23, skinDark, 4, 2)

    // Head: a rounded box with shading on one side and an outline.
    const top = 7
    const rows = [
      [11, 21],
      [10, 22],
      [9, 23],
      [9, 23],
      [9, 23],
      [9, 23],
      [9, 23],
      [9, 23],
      [9, 23],
      [9, 23],
      [10, 22],
      [10, 22],
      [11, 21],
      [12, 20],
      [13, 19],
    ]
    rows.forEach(([a, b], i) => {
      const y = top + i
      px(a, y, skin, b - a, 1)
      px(b - 2, y, skinMid, 2, 1)
      px(a - 1, y, outline)
      px(b, y, outline)
    })
    px(11, top - 1, outline, 10, 1)
    px(13, top + rows.length, outline, 6, 1)
    // Ears.
    px(8, top + 5, skinMid, 1, 3)
    px(23, top + 5, skinDark, 1, 3)
    px(7, top + 5, outline, 1, 3)
    px(24, top + 5, outline, 1, 3)

    // Hair: one of several styles.
    const style = Math.floor(r() * 7)
    const hairShade = '#00000040'
    if (style === 0) {
      // short and tidy
      px(10, top - 1, hair, 12, 3)
      px(9, top + 1, hair, 2, 3)
      px(21, top + 1, hair, 2, 3)
      px(12, top + 2, hair, 6, 1)
    } else if (style === 1) {
      // long, past the shoulders
      px(9, top - 1, hair, 14, 4)
      px(7, top + 1, hair, 3, 17)
      px(22, top + 1, hair, 3, 17)
      px(22, top + 1, hairShade, 3, 17)
    } else if (style === 2) {
      // spiky
      px(10, top - 1, hair, 12, 3)
      for (let x = 10; x < 22; x += 3) px(x, top - 3, hair, 2, 2)
      px(9, top + 1, hair, 1, 2)
      px(22, top + 1, hair, 1, 2)
    } else if (style === 3) {
      // a big afro
      g.fillStyle = hair
      g.beginPath()
      g.ellipse(16, top + 3, 11, 8, 0, Math.PI, 2 * Math.PI)
      g.fill()
      px(6, top + 3, hair, 4, 6)
      px(22, top + 3, hair, 4, 6)
    } else if (style === 4) {
      // side part with a fringe
      px(10, top - 1, hair, 12, 3)
      px(10, top + 2, hair, 7, 2)
      px(9, top + 1, hair, 2, 5)
    } else if (style === 5) {
      // buzz cut
      for (let x = 10; x < 22; x++) if ((x + top) % 2) px(x, top - 1, hair)
      px(10, top, hair, 12, 1)
    } else {
      // bun on top
      px(10, top - 1, hair, 12, 3)
      px(13, top - 5, hair, 6, 4)
      px(14, top - 4, hairShade, 2, 1)
      px(9, top + 1, hair, 2, 3)
      px(21, top + 1, hair, 2, 3)
    }
    if (style !== 5) px(11, top - 1, '#ffffff55', 3, 1) // shine

    // Eyebrows, eyes (with a highlight), nose, cheeks and a mouth.
    const ey = top + 6
    const browUp = chance(0.3) ? -1 : 0
    px(11, ey - 2 + browUp, hair === '#ececec' ? '#888' : hair, 3, 1)
    px(18, ey - 2, hair === '#ececec' ? '#888' : hair, 3, 1)
    const sleepy = chance(0.15)
    for (const ex of [11, 18]) {
      if (sleepy) {
        px(ex, ey + 1, outline, 3, 1)
      } else {
        px(ex, ey, '#ffffff', 3, 2)
        px(ex + 1, ey, eye, 2, 2)
        px(ex + 1, ey, outline, 1, 1)
        px(ex + 2, ey, '#ffffff', 1, 1)
      }
    }
    px(15, ey + 3, skinDark, 2, 1)
    if (chance(0.55)) {
      px(10, ey + 4, '#ff7b7b66', 2, 1)
      px(20, ey + 4, '#ff7b7b66', 2, 1)
    }
    const mouth = Math.floor(r() * 5)
    const my = ey + 6
    if (mouth === 0) {
      px(13, my, outline, 6, 1)
      px(12, my - 1, outline)
      px(19, my - 1, outline)
    } else if (mouth === 1) {
      px(13, my - 1, outline, 6, 1)
      px(13, my, '#b0303a', 6, 1)
      px(14, my, '#ffffff', 4, 1)
    } else if (mouth === 2) {
      px(14, my, outline, 4, 1)
    } else if (mouth === 3) {
      px(15, my - 1, outline, 2, 2)
    } else {
      px(13, my, outline, 6, 1)
      px(17, my + 1, '#ff6f91', 2, 1) // tongue out
    }
    if (chance(0.15)) {
      // freckles
      for (let i = 0; i < 5; i++) px(10 + Math.floor(r() * 12), ey + 3 + Math.floor(r() * 2), skinDark)
    }

    // Accessories.
    if (chance(0.3)) {
      // glasses
      const frame = pick(['#1a1a1a', '#c0392b', '#d4a017', '#3498db'])
      px(10, ey - 1, frame, 5, 1)
      px(17, ey - 1, frame, 5, 1)
      px(10, ey + 2, frame, 5, 1)
      px(17, ey + 2, frame, 5, 1)
      px(10, ey - 1, frame, 1, 4)
      px(14, ey - 1, frame, 1, 4)
      px(17, ey - 1, frame, 1, 4)
      px(21, ey - 1, frame, 1, 4)
      px(15, ey, frame, 2, 1)
      if (chance(0.4)) {
        px(11, ey, '#111a', 3, 2)
        px(18, ey, '#111a', 3, 2)
      }
    }
    if (chance(0.22)) {
      // a cap
      const cap = pick(SHIRT)
      px(9, top - 3, cap, 14, 4)
      px(9, top + 1, cap, 17, 1)
      px(10, top - 3, '#ffffff44', 4, 1)
    } else if (chance(0.15)) {
      // headphones
      px(9, top - 3, '#333', 14, 2)
      px(6, top + 3, '#333', 3, 6)
      px(23, top + 3, '#333', 3, 6)
      px(6, top + 4, pick(['#e74c3c', '#3498db', '#2ecc71']), 1, 4)
    }
    if (chance(0.2)) px(8, top + 8, '#ffd700', 1, 1) // earring
    if (chance(0.12)) {
      // a little moustache
      px(13, my - 2, hair, 6, 1)
    }

    return c.toDataURL('image/png')
  }

  function url(seed) {
    const key = String(seed || 'guest')
    if (!cache.has(key)) cache.set(key, draw(key))
    return cache.get(key)
  }
  const CHARS = 'abcdefghijkmnopqrstuvwxyz23456789'
  function randomSeed() {
    let s = ''
    const bytes = crypto.getRandomValues(new Uint8Array(10))
    for (const b of bytes) s += CHARS[b % CHARS.length]
    return s
  }
  /** An <img> of a player's avatar. `who` is a profile ({ username, avatar }) or a seed. */
  function img(who, size = 40, className = 'avatar') {
    const el = document.createElement('img')
    el.className = className
    el.alt = ''
    el.width = el.height = size
    el.decoding = 'async'
    el.src = url(typeof who === 'string' ? who : who?.avatar || who?.username?.toLowerCase())
    return el
  }

  window.nikstilAvatar = { url, img, randomSeed }
})()
