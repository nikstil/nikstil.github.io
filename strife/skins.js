// Weapon skins: finishes painted procedurally onto a texture (camo, fades, hexes, tiger stripes,
// case hardening...), with rarity and wear like the real thing. Cases hold a set of skins; you get
// cases by playing, open them with keys, and equip what you unbox. Everything is saved locally.

import * as THREE from './lib/three.min.js'
import { WEAPONS } from './weapons.js'

// ---------------- Rarity
export const RARITY = {
  consumer: { name: 'Consumer Grade', color: '#b0c3d9', odds: 0 },
  industrial: { name: 'Industrial Grade', color: '#5e98d9', odds: 0 },
  milspec: { name: 'Mil-Spec', color: '#4b69ff', odds: 0.7992 },
  restricted: { name: 'Restricted', color: '#8847ff', odds: 0.1598 },
  classified: { name: 'Classified', color: '#d32ce6', odds: 0.032 },
  covert: { name: 'Covert', color: '#eb4b4b', odds: 0.0064 },
  gold: { name: '★ Rare Special Item', color: '#e4ae39', odds: 0.0026 },
}
export const RARITY_ORDER = ['consumer', 'industrial', 'milspec', 'restricted', 'classified', 'covert', 'gold']

export const WEAR = [
  { max: 0.07, name: 'Factory New', short: 'FN' },
  { max: 0.15, name: 'Minimal Wear', short: 'MW' },
  { max: 0.38, name: 'Field-Tested', short: 'FT' },
  { max: 0.45, name: 'Well-Worn', short: 'WW' },
  { max: 1.0, name: 'Battle-Scarred', short: 'BS' },
]
export const wearOf = (f) => WEAR.find((w) => f <= w.max) ?? WEAR[4]

// ---------------- The skins: weapon | name, a pattern and its colours
// Patterns: solid, camo, digital, hex, tiger, fade, marble, hardened, damascus, carbon, splatter,
// blocks (big flat graphic panels), stripes, scales, circuit, waves.
const S = (weapon, name, pattern, colors, rarity) => ({ id: `${weapon}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, weapon, name, pattern, colors, rarity })
export const SKINS = [
  // ---- the Synergy Case
  S('ak47', 'Q3 Earnings', 'blocks', ['#1d1d1f', '#c22a2a', '#e8e3d7'], 'classified'),
  S('awp', 'Dragon Synergy', 'scales', ['#2e6a3c', '#d9b54a', '#7a1f1a'], 'covert'),
  S('m4a4', 'Howl of the Intern', 'blocks', ['#e85d1e', '#1c1c1c', '#f2e9da'], 'covert'),
  S('deagle', 'Blaze of Overtime', 'fade', ['#ff4a1c', '#ffcf3a', '#1a1a1a'], 'classified'),
  S('glock', 'Fade to Friday', 'fade', ['#ff69b4', '#ffd23a', '#3ab0ff'], 'restricted'),
  S('usp', 'Kill Confirmed Meeting', 'splatter', ['#2a2c2f', '#c33', '#e0e0e0'], 'restricted'),
  S('m4a1s', 'Hyper Beast Mode', 'splatter', ['#26b3a8', '#ff5ea8', '#1d1d24'], 'restricted'),
  S('p90', 'Asii-move Fast', 'blocks', ['#f0f0f0', '#ff7a00', '#111111'], 'milspec'),
  S('mac10', 'Neon Standup', 'stripes', ['#16161c', '#38ffc8', '#ff3ac0'], 'milspec'),
  S('galil', 'Cerberus Compliance', 'tiger', ['#2b2b2b', '#d4682c'], 'milspec'),
  S('famas', 'Djinn Detergent', 'waves', ['#1d3b6e', '#6fd2ff', '#f5f0e6'], 'milspec'),
  S('nova', 'Hyper Graveyard Shift', 'digital', ['#3a3f47', '#6e7b8c', '#a8b4c4'], 'milspec'),
  S('p250', 'See Ya Monday', 'hex', ['#1e2330', '#ffb000'], 'milspec'),
  S('mp9', 'Hot Rod Desk', 'solid', ['#c8102e'], 'milspec'),
  S('knife', 'Case Hardened', 'hardened', ['#3a62c4', '#d8a23a', '#9aa0a6'], 'gold'),
  S('knife', 'Fade', 'fade', ['#ff4fb8', '#ffd23a', '#5b8cff'], 'gold'),
  // ---- the Quarterly Case
  S('ak47', 'Fire Serpent Retreat', 'scales', ['#2c5a2a', '#d8c27a', '#8b1d1d'], 'covert'),
  S('awp', 'Lightning Strike Bonus', 'circuit', ['#1a0f2a', '#b05bff', '#e9d9ff'], 'classified'),
  S('m4a1s', 'Golden Parachute', 'damascus', ['#7a5a1a', '#e4c76a'], 'covert'),
  S('ssg08', 'Blood in the Water Cooler', 'waves', ['#0d3a5c', '#d9e8f5', '#c22'], 'classified'),
  S('ump45', 'Primal Spreadsheet', 'camo', ['#4b5a2c', '#7e8a4a', '#2c3018', '#a8a26a'], 'milspec'),
  S('famas', 'Roll Cage Commute', 'stripes', ['#f2c230', '#1c1c1c', '#2b6cd6'], 'restricted'),
  S('aug', 'Akihabara Accept', 'blocks', ['#f6e9ef', '#ff6fa8', '#28324a'], 'covert'),
  S('fiveseven', 'Case Hardened', 'hardened', ['#3a62c4', '#d8a23a', '#9aa0a6'], 'restricted'),
  S('tec9', 'Fuel Injector', 'carbon', ['#1b1b1d', '#ff7b00'], 'restricted'),
  S('xm1014', 'Tranquility (Pending)', 'marble', ['#e9eef2', '#7b8a99', '#33414f'], 'milspec'),
  S('mp7', 'Nemesis Neighbour', 'hex', ['#e6e6e6', '#7ad8ff'], 'milspec'),
  S('negev', 'Power Loader', 'blocks', ['#f2c230', '#1c1c1c', '#7b7b7b'], 'milspec'),
  S('mag7', 'Heat Wave', 'fade', ['#ff2a00', '#ffb300', '#3b0a00'], 'milspec'),
  S('cz75', 'Victoria Secretary', 'damascus', ['#2b1b0f', '#c9a25a'], 'milspec'),
  S('knife', 'Doppler', 'marble', ['#2a0f45', '#9b3bff', '#ff4fb8'], 'gold'),
  S('knife', 'Tiger Tooth', 'tiger', ['#e8a21a', '#5a2a00'], 'gold'),
  // ---- the Overtime Case
  S('ak47', 'Vulcan Vacation', 'stripes', ['#f2f2f2', '#2a6fd6', '#111'], 'covert'),
  S('awp', 'Hyper Beast Mode', 'splatter', ['#26b3a8', '#ff5ea8', '#1d1d24'], 'covert'),
  S('m4a4', 'Desolate Spacebar', 'circuit', ['#0b1d2a', '#ff5a1f', '#f2e9da'], 'classified'),
  S('deagle', 'Printstream Printer', 'marble', ['#f5f5f5', '#cfcfd4', '#151515'], 'classified'),
  S('usp', 'Cortex Calendar', 'waves', ['#1b1b29', '#e44', '#f0e6d2'], 'restricted'),
  S('glock', 'Water Elemental Cooler', 'waves', ['#a52a1a', '#2b7bd6', '#f2f2f2'], 'restricted'),
  S('sg553', 'Integrale Expense', 'stripes', ['#ececec', '#c8102e', '#1a3a8a'], 'restricted'),
  S('p2000', 'Ocean Foam Party', 'fade', ['#e8f6ff', '#3ec2ff', '#1258a8'], 'milspec'),
  S('bizon', 'Judgement of Review', 'hex', ['#3a1a1a', '#e5b73b'], 'milspec'),
  S('mp5', 'Lab Rats', 'digital', ['#dedede', '#9fd56b', '#2a2a2a'], 'milspec'),
  S('m249', 'Spectre Sprint', 'carbon', ['#222', '#7a7af0'], 'milspec'),
  S('g3sg1', 'Flux Capacitor', 'circuit', ['#141414', '#00e0ff', '#444'], 'milspec'),
  S('scar20', 'Cyrex Firewall', 'blocks', ['#e8e8e8', '#e01b24', '#1a1a1a'], 'milspec'),
  S('r8', 'Fade', 'fade', ['#ff4fb8', '#ffd23a', '#5b8cff'], 'milspec'),
  S('dualies', 'Twin Turbo Reports', 'stripes', ['#1a1a1a', '#e01b24', '#ffd23a'], 'milspec'),
  S('sawedoff', 'The Kraken Meeting', 'scales', ['#14404a', '#59c2a8', '#e8d9a8'], 'milspec'),
  S('zeus', 'Static Discharge', 'circuit', ['#1a1a1a', '#ffe14d', '#555'], 'milspec'),
  S('knife', 'Crimson Web', 'damascus', ['#4a0a0a', '#e52a2a'], 'gold'),
  S('knife', 'Slaughter', 'splatter', ['#e9d5d5', '#c22', '#7a1414'], 'gold'),
]
export const skinById = Object.fromEntries(SKINS.map((s) => [s.id, s]))

export const CASES = [
  { id: 'synergy', name: 'Synergy Case', color: '#c22a2a', skins: SKINS.slice(0, 16).map((s) => s.id) },
  { id: 'quarterly', name: 'Quarterly Case', color: '#2e6a3c', skins: SKINS.slice(16, 32).map((s) => s.id) },
  { id: 'overtime', name: 'Overtime Case', color: '#2a6fd6', skins: SKINS.slice(32).map((s) => s.id) },
]
export const caseById = Object.fromEntries(CASES.map((c) => [c.id, c]))
export const KEY_PRICE = 25 // credits

// ---------------- Rolling
/** Picks what comes out of a case: rarity by the classic odds, then a skin of that rarity. */
export function rollCase(caseId, rand = Math.random) {
  const c = caseById[caseId]
  const pool = c.skins.map((id) => skinById[id])
  const present = RARITY_ORDER.filter((r) => pool.some((s) => s.rarity === r))
  const total = present.reduce((s, r) => s + RARITY[r].odds, 0)
  let r = rand() * total
  let rarity = present[0]
  for (const k of present) {
    r -= RARITY[k].odds
    if (r <= 0) {
      rarity = k
      break
    }
  }
  const of = pool.filter((s) => s.rarity === rarity)
  const skin = of[Math.floor(rand() * of.length)]
  return makeItem(skin.id, rand)
}
/** A concrete item: a skin plus its float (wear), pattern seed and maybe StatTrak™. */
export function makeItem(skinId, rand = Math.random) {
  // floats cluster in Field-Tested like the real thing
  const wear = Math.min(0.999, Math.max(0.0001, Math.pow(rand(), 1.6) * 0.8 + rand() * 0.06))
  return { skin: skinId, r: skinById[skinId]?.rarity, wear: Number(wear.toFixed(4)), seed: Math.floor(rand() * 1000), st: rand() < 0.1 ? 0 : null }
}
export function itemName(it) {
  const s = skinById[it.skin]
  const w = WEAPONS[s.weapon]
  return `${s.rarity === 'gold' ? '★ ' : ''}${it.st != null ? 'StatTrak™ ' : ''}${w.name} | ${s.name}`
}

// ---------------- Painting the textures
function rng(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (p, k) => (p >> k) & 255
  const c = (k) => Math.round(ch(pa, k) + (ch(pb, k) - ch(pa, k)) * t)
  return `rgb(${c(16)},${c(8)},${c(0)})`
}
const hex6 = (c) => (c.length === 4 ? '#' + [...c.slice(1)].map((x) => x + x).join('') : c)

/** Paints a skin's pattern onto a canvas (size × size). */
export function paintSkin(skin, seed = 1, wear = 0.1, size = 256) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const g = cv.getContext('2d')
  const R = rng(seed * 7919 + skin.id.length * 31)
  const col = skin.colors.map(hex6)
  const [c0, c1 = c0, c2 = c1, c3 = c2] = col
  const N = size
  g.fillStyle = c0
  g.fillRect(0, 0, N, N)
  switch (skin.pattern) {
    case 'solid':
      for (let i = 0; i < 400; i++) {
        g.fillStyle = `rgba(255,255,255,${R() * 0.04})`
        g.fillRect(R() * N, R() * N, 2, 2)
      }
      break
    case 'camo':
      for (const c of [c1, c2, c3]) {
        g.fillStyle = c
        for (let i = 0; i < 9; i++) {
          g.beginPath()
          const x = R() * N
          const y = R() * N
          for (let k = 0; k < 9; k++) {
            const a = (k / 9) * Math.PI * 2
            const r = N * (0.06 + R() * 0.08)
            k ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
          }
          g.fill()
        }
      }
      break
    case 'digital': {
      const px = N / 32
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++) {
          const v = Math.sin(x * 0.5 + seed) + Math.cos(y * 0.6 - seed * 0.3) + R() * 1.4
          g.fillStyle = v > 1.4 ? c2 : v > 0.4 ? c1 : c0
          g.fillRect(x * px, y * px, px, px)
        }
      break
    }
    case 'hex': {
      const r = N / 14
      g.strokeStyle = c1
      g.lineWidth = 2
      for (let row = -1; row < 16; row++)
        for (let q = -1; q < 12; q++) {
          const x = q * r * 1.75 + (row % 2) * r * 0.87
          const y = row * r * 1.5
          g.beginPath()
          for (let k = 0; k < 7; k++) {
            const a = (k / 6) * Math.PI * 2 + Math.PI / 6
            k ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
          }
          if (R() < 0.18) {
            g.fillStyle = c1
            g.fill()
          }
          g.stroke()
        }
      break
    }
    case 'tiger':
      g.fillStyle = c1
      for (let i = 0; i < 16; i++) {
        const x = R() * N
        g.beginPath()
        g.moveTo(x, -10)
        for (let y = 0; y <= N + 10; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 14 + (R() - 0.5) * 8, y)
        for (let y = N + 10; y >= 0; y -= 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 14 + 6 + R() * 10, y)
        g.fill()
      }
      break
    case 'fade': {
      const gr = g.createLinearGradient(0, 0, N, N * 0.35)
      gr.addColorStop(0, c0)
      gr.addColorStop(0.5, c1)
      gr.addColorStop(1, c2)
      g.fillStyle = gr
      g.fillRect(0, 0, N, N)
      break
    }
    case 'marble': {
      const img = g.createImageData(N, N)
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const v = Math.sin((x + Math.sin(y * 0.05 + seed) * 30 + Math.sin(x * 0.031 + y * 0.017) * 40) * 0.05) * 0.5 + 0.5
          const a = v < 0.5 ? mix(c0, c1, v * 2) : mix(c1, c2, (v - 0.5) * 2)
          const m = a.match(/\d+/g)
          const i = (y * N + x) * 4
          img.data[i] = +m[0]
          img.data[i + 1] = +m[1]
          img.data[i + 2] = +m[2]
          img.data[i + 3] = 255
        }
      g.putImageData(img, 0, 0)
      break
    }
    case 'hardened': {
      // blue, gold and steel in rippling blotches (the "blue gem" depends on the seed)
      const img = g.createImageData(N, N)
      const ph = R() * 10
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const v = Math.sin(x * 0.04 + ph) * Math.cos(y * 0.05 - ph) + Math.sin((x + y) * 0.021 + ph * 2) * 0.7 + Math.sin(x * 0.13) * 0.15
          const c = v > 0.35 ? c0 : v < -0.45 ? c1 : c2
          const m = parseInt(c.slice(1), 16)
          const i = (y * N + x) * 4
          const sh = 0.8 + 0.2 * Math.sin(x * 0.3 + y * 0.2)
          img.data[i] = ((m >> 16) & 255) * sh
          img.data[i + 1] = ((m >> 8) & 255) * sh
          img.data[i + 2] = (m & 255) * sh
          img.data[i + 3] = 255
        }
      g.putImageData(img, 0, 0)
      break
    }
    case 'damascus':
      g.strokeStyle = c1
      g.lineWidth = 2
      for (let k = 0; k < 40; k++) {
        g.beginPath()
        for (let x = 0; x <= N; x += 4) {
          const y = k * 7 + Math.sin(x * 0.04 + k * 0.4 + seed) * 10 + Math.sin(x * 0.11) * 3
          x ? g.lineTo(x, y) : g.moveTo(x, y)
        }
        g.stroke()
      }
      break
    case 'carbon': {
      const s = 8
      for (let y = 0; y < N; y += s)
        for (let x = 0; x < N; x += s) {
          const gr = g.createLinearGradient(x, y, x + s, y + s)
          const on = ((x + y) / s) % 2
          gr.addColorStop(0, on ? '#2a2a2e' : '#141416')
          gr.addColorStop(1, on ? '#141416' : '#2a2a2e')
          g.fillStyle = gr
          g.fillRect(x, y, s, s)
        }
      g.fillStyle = c1
      g.fillRect(0, N * 0.45, N, N * 0.06)
      break
    }
    case 'splatter':
      for (const [c, n] of [[c1, 30], [c2, 22]]) {
        g.fillStyle = c
        for (let i = 0; i < n; i++) {
          const x = R() * N
          const y = R() * N
          const r = 3 + R() * 18
          g.beginPath()
          g.arc(x, y, r, 0, 7)
          g.fill()
          for (let d = 0; d < 5; d++) {
            g.beginPath()
            g.arc(x + (R() - 0.5) * r * 4, y + (R() - 0.5) * r * 4, 1 + R() * 3, 0, 7)
            g.fill()
          }
        }
      }
      break
    case 'blocks':
      // big flat graphic panels, like the poster-art skins
      for (let i = 0; i < 9; i++) {
        g.fillStyle = [c1, c2, c0][i % 3]
        g.save()
        g.translate(R() * N, R() * N)
        g.rotate(Math.floor(R() * 4) * (Math.PI / 4))
        g.fillRect(-N * 0.25, -N * 0.06, N * (0.25 + R() * 0.4), N * (0.06 + R() * 0.12))
        g.restore()
      }
      g.strokeStyle = c2
      g.lineWidth = 3
      for (let i = 0; i < 5; i++) {
        g.beginPath()
        const y = R() * N
        g.moveTo(0, y)
        g.lineTo(N, y + (R() - 0.5) * 40)
        g.stroke()
      }
      break
    case 'stripes':
      for (let i = -N; i < N * 2; i += 36) {
        g.fillStyle = c1
        g.beginPath()
        g.moveTo(i, 0)
        g.lineTo(i + 14, 0)
        g.lineTo(i + 14 - N * 0.6, N)
        g.lineTo(i - N * 0.6, N)
        g.fill()
        g.fillStyle = c2
        g.fillRect(i - N * 0.3 + 18, N * 0.48, 8, N * 0.04)
      }
      break
    case 'scales':
      for (let y = 0; y < N + 16; y += 14)
        for (let x = 0; x < N + 16; x += 16) {
          const ox = (y / 14) % 2 ? 8 : 0
          const gr = g.createRadialGradient(x + ox, y, 2, x + ox, y, 12)
          gr.addColorStop(0, c1)
          gr.addColorStop(1, c0)
          g.fillStyle = gr
          g.beginPath()
          g.arc(x + ox, y, 10, 0, Math.PI)
          g.fill()
        }
      g.fillStyle = c2
      for (let i = 0; i < 4; i++) {
        g.beginPath()
        g.arc(R() * N, R() * N, 10 + R() * 20, 0, 7)
        g.globalAlpha = 0.7
        g.fill()
        g.globalAlpha = 1
      }
      break
    case 'circuit':
      g.strokeStyle = c1
      g.lineWidth = 2
      for (let i = 0; i < 40; i++) {
        let x = Math.round((R() * N) / 8) * 8
        let y = Math.round((R() * N) / 8) * 8
        g.beginPath()
        g.moveTo(x, y)
        for (let k = 0; k < 5; k++) {
          if (R() < 0.5) x += (R() < 0.5 ? -1 : 1) * 8 * (1 + Math.floor(R() * 4))
          else y += (R() < 0.5 ? -1 : 1) * 8 * (1 + Math.floor(R() * 4))
          g.lineTo(x, y)
        }
        g.stroke()
        g.fillStyle = c2
        g.fillRect(x - 3, y - 3, 6, 6)
      }
      break
    case 'waves':
      for (let k = 0; k < 14; k++) {
        g.fillStyle = k % 2 ? c1 : c2
        g.beginPath()
        g.moveTo(0, N)
        for (let x = 0; x <= N; x += 6) g.lineTo(x, k * 20 + Math.sin(x * 0.05 + k) * 8)
        g.lineTo(N, N)
        g.globalAlpha = 0.55
        g.fill()
        g.globalAlpha = 1
      }
      break
  }
  // Wear: scratches and chipped paint showing grey metal, more the higher the float.
  const scratches = Math.floor(wear * 900)
  for (let i = 0; i < scratches; i++) {
    g.strokeStyle = `rgba(150,155,160,${0.25 + R() * 0.5})`
    g.lineWidth = R() < 0.8 ? 1 : 2
    g.beginPath()
    const x = R() * N
    const y = R() * N
    g.moveTo(x, y)
    g.lineTo(x + (R() - 0.5) * 18, y + (R() - 0.5) * 6)
    g.stroke()
  }
  if (wear > 0.38) {
    for (let i = 0; i < wear * 80; i++) {
      g.fillStyle = `rgba(120,124,130,${0.4 + R() * 0.4})`
      g.beginPath()
      g.arc(R() * N, R() * N, 2 + R() * 7 * wear, 0, 7)
      g.fill()
    }
  }
  // grime
  g.fillStyle = `rgba(40,32,24,${wear * 0.25})`
  g.fillRect(0, 0, N, N)
  return cv
}

const matCache = new Map()
/** A material for an item: { skin, wear, seed } (cached). */
export function skinMaterial(item) {
  if (!item || !skinById[item.skin] || typeof document === 'undefined') return null
  const key = `${item.skin}|${item.seed}|${Math.round(item.wear * 50)}`
  if (!matCache.has(key)) {
    const skin = skinById[item.skin]
    const tex = new THREE.CanvasTexture(paintSkin(skin, item.seed, item.wear))
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(3.2, 3.2) // extruded parts are UV-mapped in metres
    tex.anisotropy = 4
    const metal = skin.pattern === 'fade' || skin.pattern === 'marble' || skin.pattern === 'hardened' || skin.pattern === 'damascus'
    matCache.set(key, new THREE.MeshPhongMaterial({ map: tex, shininess: metal ? 90 : 30, specular: metal ? '#8a8a8a' : '#2a2a2a' }))
  }
  return matCache.get(key)
}
export const itemKey = (it) => (it ? `${it.skin}|${it.seed}|${Math.round(it.wear * 50)}` : '')

// ---------------- The inventory (saved in localStorage)
const KEY = 'strife-inventory'
function blank() {
  return { items: [], equipped: {}, credits: 0, keys: 1, cases: { synergy: 1 }, nextUid: 1, opened: 0 }
}
export function loadInventory() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (v && Array.isArray(v.items)) return { ...blank(), ...v }
  } catch {}
  return blank()
}
export function saveInventory(inv) {
  try {
    localStorage.setItem(KEY, JSON.stringify(inv))
  } catch {}
}
export function addItem(inv, item) {
  const it = { ...item, uid: inv.nextUid++, at: Date.now() }
  inv.items.unshift(it)
  return it
}
/** Equip (or unequip) an item for its weapon. */
export function toggleEquip(inv, uid) {
  const it = inv.items.find((x) => x.uid === uid)
  if (!it) return
  const w = skinById[it.skin].weapon
  if (inv.equipped[w] === uid) delete inv.equipped[w]
  else inv.equipped[w] = uid
}
export function equippedFor(inv, weaponId) {
  const uid = inv.equipped[weaponId]
  return uid ? inv.items.find((x) => x.uid === uid) ?? null : null
}
/** A skin descriptor for a gun in play (small, serialisable). */
export const skinDesc = (it) => (it ? { skin: it.skin, wear: it.wear, seed: it.seed, key: itemKey(it), uid: it.uid } : null)

/** Random skins for bots, so the server looks lived-in. */
export function randomSkinFor(weaponId, rand = Math.random) {
  const pool = SKINS.filter((s) => s.weapon === weaponId)
  if (!pool.length) return null
  const it = makeItem(pool[Math.floor(rand() * pool.length)].id, rand)
  return skinDesc({ ...it, uid: 0 })
}
