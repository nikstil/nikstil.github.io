// Turning a map into something to look at: procedural textures (painted on canvases at load,
// so there are no image files), the level mesh, sky, sun and shadows, and the radar image.

import * as THREE from './lib/three.min.js'
import { MAT_NAMES, WALL_H, INF, MAXS } from './maps.js'

// ================= Textures =================
function rng(seed) {
  let s = seed >>> 0 || 1
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}
const hex = (c) => new THREE.Color(c)
function shade(c, k) {
  const col = hex(c).multiplyScalar(k)
  return `rgb(${Math.min(255, col.r * 255) | 0},${Math.min(255, col.g * 255) | 0},${Math.min(255, col.b * 255) | 0})`
}
function speckle(g, S, rand, base, n, spread, size = 2) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = shade(base, 1 + (rand() - 0.5) * spread)
    const s = 1 + rand() * size
    g.fillRect(rand() * S, rand() * S, s, s)
  }
}
const PAINT = {
  /** Sandy ground with pebbles. */
  sand(g, S, rand, c) {
    g.fillStyle = c.base
    g.fillRect(0, 0, S, S)
    for (let i = 0; i < 18; i++) {
      g.fillStyle = shade(c.base, 0.9 + rand() * 0.2)
      g.globalAlpha = 0.35
      g.beginPath()
      g.ellipse(rand() * S, rand() * S, 20 + rand() * 60, 10 + rand() * 30, rand() * 3, 0, 7)
      g.fill()
    }
    g.globalAlpha = 1
    speckle(g, S, rand, c.base, 2200, 0.18, 2)
    speckle(g, S, rand, c.base, 90, 0.35, 4)
  },
  /** Blocks laid in courses (sandstone walls). */
  blocks(g, S, rand, c) {
    g.fillStyle = c.mortar
    g.fillRect(0, 0, S, S)
    const rows = c.rows ?? 4
    const rh = S / rows
    for (let r = 0; r < rows; r++) {
      const n = c.cols ?? 3
      const off = (r % 2) * (S / n / 2)
      for (let k = -1; k < n; k++) {
        const x = off + (k * S) / n
        g.fillStyle = shade(c.base, 0.93 + rand() * 0.12)
        g.fillRect(x + 2, r * rh + 2, S / n - 4, rh - 4)
        g.fillStyle = shade(c.base, 1.06)
        g.fillRect(x + 2, r * rh + 2, S / n - 4, 2)
      }
    }
    speckle(g, S, rand, c.base, 1400, 0.16, 2)
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = shade(c.base, 0.6)
      g.globalAlpha = 0.25
      g.beginPath()
      let x = rand() * S
      let y = rand() * S
      g.moveTo(x, y)
      for (let k = 0; k < 4; k++) g.lineTo((x += (rand() - 0.5) * 30), (y += rand() * 20))
      g.stroke()
    }
    g.globalAlpha = 1
  },
  /** Smooth plaster with a stone base band and stains. */
  plaster(g, S, rand, c) {
    g.fillStyle = c.base
    g.fillRect(0, 0, S, S)
    for (let i = 0; i < 30; i++) {
      g.fillStyle = shade(c.base, 0.93 + rand() * 0.1)
      g.globalAlpha = 0.14
      g.beginPath()
      g.ellipse(rand() * S, rand() * S, 10 + rand() * 50, 6 + rand() * 30, rand() * 3, 0, 7)
      g.fill()
    }
    g.globalAlpha = 1
    speckle(g, S, rand, c.base, 900, 0.1, 2)
    if (c.band) {
      g.fillStyle = c.band
      g.fillRect(0, S - S / 6, S, S / 6)
      g.fillStyle = shade(c.band, 0.8)
      g.fillRect(0, S - S / 6, S, 3)
    }
  },
  /** Worn floor tiles / flagstones. */
  tiles(g, S, rand, c) {
    g.fillStyle = c.mortar
    g.fillRect(0, 0, S, S)
    const n = c.n ?? 4
    const t = S / n
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        g.fillStyle = c.alt && (x + y) % 2 ? shade(c.alt, 0.9 + rand() * 0.2) : shade(c.base, 0.88 + rand() * 0.22)
        g.fillRect(x * t + 2, y * t + 2, t - 4, t - 4)
        if (c.pattern) {
          g.strokeStyle = c.pattern
          g.lineWidth = 3
          g.beginPath()
          g.moveTo(x * t + t / 2, y * t + 8)
          g.lineTo(x * t + t - 8, y * t + t / 2)
          g.lineTo(x * t + t / 2, y * t + t - 8)
          g.lineTo(x * t + 8, y * t + t / 2)
          g.closePath()
          g.stroke()
        }
      }
    speckle(g, S, rand, c.base, 1500, 0.3, 2)
  },
  /** A wooden crate: frame, planks and a cross brace. */
  crate(g, S, rand, c) {
    g.fillStyle = c.base
    g.fillRect(0, 0, S, S)
    for (let i = 0; i < 6; i++) {
      g.fillStyle = shade(c.base, 0.85 + rand() * 0.25)
      g.fillRect(0, (i * S) / 6 + 1, S, S / 6 - 2)
    }
    speckle(g, S, rand, c.base, 900, 0.3, 3)
    g.strokeStyle = shade(c.base, 0.55)
    g.lineWidth = S / 14
    g.strokeRect(S / 28, S / 28, S - S / 14, S - S / 14)
    g.beginPath()
    g.moveTo(S / 14, S / 14)
    g.lineTo(S - S / 14, S - S / 14)
    g.stroke()
    g.strokeStyle = shade(c.base, 1.15)
    g.lineWidth = 3
    g.strokeRect(S / 14, S / 14, S - S / 7, S - S / 7)
  },
  /** Painted planks (the blue doors). */
  planks(g, S, rand, c) {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = shade(c.base, 0.85 + rand() * 0.25)
      g.fillRect((i * S) / 8, 0, S / 8, S)
      g.fillStyle = shade(c.base, 0.6)
      g.fillRect((i * S) / 8, 0, 2, S)
    }
    speckle(g, S, rand, c.base, 1200, 0.45, 3)
    // paint wear
    for (let i = 0; i < 40; i++) {
      g.fillStyle = c.wear ?? '#9a7a55'
      g.globalAlpha = 0.5
      g.fillRect(rand() * S, rand() * S, 2 + rand() * 12, 2 + rand() * 5)
    }
    g.globalAlpha = 1
  },
  /** A ribbed shipping container. */
  ribs(g, S, rand, c) {
    for (let i = 0; i < 16; i++) {
      g.fillStyle = shade(c.base, i % 2 ? 0.8 : 1.05)
      g.fillRect((i * S) / 16, 0, S / 16, S)
    }
    for (let i = 0; i < 60; i++) {
      g.fillStyle = '#8a5a36'
      g.globalAlpha = 0.4
      g.fillRect(rand() * S, rand() * S, 1 + rand() * 6, 3 + rand() * 18)
    }
    g.globalAlpha = 1
  },
  /** A car / van body. */
  body(g, S, rand, c) {
    g.fillStyle = c.base
    g.fillRect(0, 0, S, S)
    g.fillStyle = shade(c.base, 0.5)
    g.fillRect(0, S * 0.15, S, S * 0.3) // windows band
    g.fillStyle = 'rgba(160,200,220,0.6)'
    g.fillRect(S * 0.05, S * 0.18, S * 0.4, S * 0.24)
    g.fillRect(S * 0.55, S * 0.18, S * 0.4, S * 0.24)
    g.fillStyle = '#222'
    g.fillRect(0, S * 0.85, S, S * 0.15)
    for (let i = 0; i < 80; i++) {
      g.fillStyle = '#7a4a2a'
      g.globalAlpha = 0.35
      g.fillRect(rand() * S, S * 0.45 + rand() * S * 0.4, 2 + rand() * 10, 1 + rand() * 6)
    }
    g.globalAlpha = 1
  },
}

/** Each map's look: which painter and colours each material uses, and how big a tile is (m). */
const LOOKS = {
  dust: {
    wall: { paint: 'blocks', base: '#dcc492', mortar: '#c4ad80', rows: 4, cols: 2, size: 3.2 },
    ground: { paint: 'sand', base: '#d4b888', size: 6 },
    path: { paint: 'tiles', base: '#cfb98f', mortar: '#b9a27a', n: 3, size: 4 },
    step: { paint: 'tiles', base: '#c9b083', mortar: '#a8916a', n: 2, size: 2 },
    crate: { paint: 'crate', base: '#a8763e', size: 1.1 },
    door: { paint: 'planks', base: '#2d6fa8', wear: '#8f7653', size: 2.8 },
    metal: { paint: 'ribs', base: '#3d6f96', size: 2.6 },
    car: { paint: 'body', base: '#7f8f6a', size: 1.6 },
    low: { paint: 'blocks', base: '#e2cc9e', mortar: '#c4ad80', rows: 3, cols: 2, size: 1.5 },
    tile: { paint: 'tiles', base: '#c7ab7f', mortar: '#9b7f57', n: 4, size: 3 },
    wood: { paint: 'planks', base: '#7d5634', wear: '#5a3a20', size: 2 },
    trim: { paint: 'plaster', base: '#d9c7a1', size: 3 },
  },
  nuke: {
    wall: { paint: 'blocks', base: '#c9cdd0', mortar: '#a9aeb2', rows: 3, cols: 2, size: 3 },
    ground: { paint: 'sand', base: '#8e9294', size: 6 },
    path: { paint: 'tiles', base: '#b9bcbd', mortar: '#9a9ea0', n: 2, size: 3 },
    step: { paint: 'tiles', base: '#a8acad', mortar: '#7d8183', n: 2, size: 2 },
    crate: { paint: 'crate', base: '#5f7f5a', size: 1.1 },
    door: { paint: 'planks', base: '#c9a227', wear: '#6b6b6b', size: 2.8 },
    metal: { paint: 'ribs', base: '#3f6f9a', size: 2.6 },
    car: { paint: 'body', base: '#d8d2c0', size: 1.8 },
    low: { paint: 'blocks', base: '#d2d6d8', mortar: '#a9aeb2', rows: 2, cols: 2, size: 1.5 },
    tile: { paint: 'tiles', base: '#d9dedf', alt: '#c3cfd2', mortar: '#9aa6aa', n: 4, size: 2.4 },
    wood: { paint: 'planks', base: '#8a6a44', wear: '#5a4026', size: 2 },
    trim: { paint: 'plaster', base: '#e0e4e6', band: '#c9a227', size: 3 },
  },
  mirage: {
    wall: { paint: 'plaster', base: '#e6d4b0', band: '#b99b72', size: 4 },
    ground: { paint: 'sand', base: '#cdb08a', size: 6 },
    path: { paint: 'tiles', base: '#d6bf98', alt: '#c9ab84', mortar: '#a8916f', n: 4, size: 3 },
    step: { paint: 'tiles', base: '#d4bd96', mortar: '#a48c6a', n: 2, size: 2 },
    crate: { paint: 'crate', base: '#a07448', size: 1.1 },
    door: { paint: 'planks', base: '#3a8a7f', wear: '#c9b28a', size: 2.8 },
    metal: { paint: 'ribs', base: '#8a8f94', size: 2.6 },
    car: { paint: 'body', base: '#e4dfd2', size: 1.8 },
    low: { paint: 'plaster', base: '#ead9b6', size: 2 },
    tile: { paint: 'tiles', base: '#c98a62', alt: '#e3d6bc', mortar: '#8c6a50', pattern: 'rgba(40,90,110,0.45)', n: 4, size: 2.4 },
    wood: { paint: 'planks', base: '#6e4a2c', wear: '#4a2f1a', size: 2 },
    trim: { paint: 'plaster', base: '#d9e4e3', band: '#3a7f88', size: 3 },
  },
}

function makeTexture(spec, seed, anisotropy) {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  PAINT[spec.paint](g, S, rng(seed), spec)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = anisotropy
  return t
}

// ================= The level mesh =================
/**
 * Builds the level: one mesh per material, faces only where they can be seen (tops of floors,
 * the sides where a neighbour is lower, ceilings, and the wall above a doorway). Vertex colours
 * darken corners, wall bottoms and anything under a roof (cheap ambient occlusion).
 */
export function buildLevel(map, renderer, quality) {
  const look = LOOKS[map.look]
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  const { w, d } = map
  const spans = (x, z) => {
    if (x < 0 || z < 0 || x >= w || z >= d) return null
    const c = z * w + x
    const out = []
    for (let k = 0; k < map.sc[c]; k++) out.push([map.sb[c * MAXS + k], map.st[c * MAXS + k], map.sm[c * MAXS + k]])
    return out
  }
  const solidAt = (x, z, y) => {
    const sp = spans(x, z)
    return !sp || sp.some(([b, t]) => y > b && y < t)
  }
  /** The open gaps in a column: [bottom, top, roofed?]. */
  const gaps = (sp) => {
    const out = []
    for (let k = 0; k < sp.length; k++) {
      const lo = sp[k][1]
      const hi = k + 1 < sp.length ? sp[k + 1][0] : INF
      if (hi > lo) out.push([lo, hi, k + 1 < sp.length])
    }
    return out
  }
  const buckets = MAT_NAMES.map(() => ({ pos: [], nor: [], uv: [], col: [] }))
  const rand = rng(7)
  const quad = (b, verts, normal, uvs, cols) => {
    const order = [0, 1, 2, 0, 2, 3]
    for (const k of order) {
      b.pos.push(...verts[k])
      b.nor.push(...normal)
      b.uv.push(...uvs[k])
      b.col.push(cols[k], cols[k], cols[k])
    }
  }
  const size = (m) => look[MAT_NAMES[m]].size
  const STEP_MAT = MAT_NAMES.indexOf('step')
  const groundish = new Set([MAT_NAMES.indexOf('ground'), MAT_NAMES.indexOf('path')])
  const LOW = -9 // nothing is ever seen below this (Nuke B sits at -5)
  for (let z = 0; z < d; z++)
    for (let x = 0; x < w; x++) {
      const col = spans(x, z)
      col.forEach(([b, t, m], k) => {
        const roofed = k + 1 < col.length
        const lit = roofed ? 0.62 : 1
        // Top face (a floor, a crate top, a slab you walk on)
        if (t < WALL_H - 0.01) {
          const s = size(m)
          const corner = (ox, oz) => {
            let occ = 0
            for (const [a2, b2] of [[ox - 1, oz - 1], [ox, oz - 1], [ox - 1, oz], [ox, oz]]) if (solidAt(x + a2, z + b2, t + 0.25)) occ++
            return lit * (1 - occ * 0.14) * (0.95 + rand() * 0.08)
          }
          quad(
            buckets[m],
            [[x, t, z], [x, t, z + 1], [x + 1, t, z + 1], [x + 1, t, z]],
            [0, 1, 0],
            [[x / s, z / s], [x / s, (z + 1) / s], [(x + 1) / s, (z + 1) / s], [(x + 1) / s, z / s]],
            [corner(0, 0), corner(0, 1), corner(1, 1), corner(1, 0)],
          )
        }
        // Bottom face (a ceiling, the underside of an upper floor)
        if (b > LOW && b < WALL_H) {
          const s = size(0)
          quad(
            buckets[0],
            [[x, b, z], [x + 1, b, z], [x + 1, b, z + 1], [x, b, z + 1]],
            [0, -1, 0],
            [[x / s, z / s], [(x + 1) / s, z / s], [(x + 1) / s, (z + 1) / s], [x / s, (z + 1) / s]],
            [0.5, 0.5, 0.5, 0.5],
          )
        }
        // Sides: wherever the neighbour has air next to this solid
        const lo = Math.max(b, LOW)
        const hi = Math.min(t, WALL_H)
        if (hi <= lo) return
        const tall = t >= WALL_H - 0.01 || t >= INF / 2
        const sm = tall ? 0 : groundish.has(m) ? STEP_MAT : m
        const s = size(sm)
        for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ncol = spans(x + nx, z + nz)
          if (!ncol) continue
          for (const [g0, g1, capped] of gaps(ncol)) {
            const a0 = Math.max(lo, g0)
            const a1 = Math.min(hi, g1)
            if (a1 - a0 < 0.005) continue
            let p0
            let p1
            if (nx) {
              const ex = nx > 0 ? x + 1 : x
              p0 = nx > 0 ? [ex, z] : [ex, z + 1]
              p1 = nx > 0 ? [ex, z + 1] : [ex, z]
            } else {
              const ez = nz > 0 ? z + 1 : z
              p0 = nz > 0 ? [x + 1, ez] : [x, ez]
              p1 = nz > 0 ? [x, ez] : [x + 1, ez]
            }
            const u0 = (nx ? p0[1] : p0[0]) / s
            const u1 = (nx ? p1[1] : p1[0]) / s
            const kk = capped ? 0.62 : 1
            const bottomShade = a0 <= g0 + 0.01 ? 0.68 : 0.8 // darker where it meets the floor
            const loC = kk * bottomShade
            const hiC = kk * (a1 - a0 > 2.5 ? 1 : 0.92)
            quad(
              buckets[sm],
              [[p0[0], a0, p0[1]], [p0[0], a1, p0[1]], [p1[0], a1, p1[1]], [p1[0], a0, p1[1]]],
              [nx, 0, nz],
              [[u0, a0 / s], [u0, a1 / s], [u1, a1 / s], [u1, a0 / s]],
              [loC, hiC, hiC, loC],
            )
          }
        }
      })
    }
  const group = new THREE.Group()
  const textures = {}
  MAT_NAMES.forEach((name, k) => {
    const b = buckets[k]
    if (!b.pos.length) return
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3))
    textures[name] = makeTexture(look[name], 11 + k * 97, aniso)
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: textures[name], vertexColors: true }))
    mesh.castShadow = quality.shadows
    mesh.receiveShadow = quality.shadows
    group.add(mesh)
  })
  for (const p of map.props ?? []) group.add(buildProp(p, look, textures, aniso))
  return { group, textures, look }
}

// ================= Props =================
function buildProp(p, look, textures, aniso) {
  const g = new THREE.Group()
  if (p.type === 'doors') {
    // Two door leaves swung open against the sides of the doorway.
    const tex = textures.door ?? makeTexture(look.door, 99, aniso)
    const m = new THREE.MeshLambertMaterial({ map: tex })
    const half = p.w / 2 - 0.2
    for (const side of [0, 1]) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(half, p.h, 0.12), m)
      leaf.castShadow = leaf.receiveShadow = true
      const along = side ? p.w - half / 2 - 0.15 : half / 2 + 0.15
      if (p.axis === 'x') {
        leaf.position.set(p.x + along, p.y + p.h / 2, p.z + (side ? -1.2 : -1.2))
        leaf.rotation.y = side ? -1.2 : 1.2
        leaf.position.x = p.x + (side ? p.w - 0.15 : 0.15) + (side ? -1 : 1) * Math.cos(1.2) * half * 0.5
        leaf.position.z = p.z - Math.sin(1.2) * half * 0.5
      } else {
        leaf.rotation.y = Math.PI / 2 + (side ? -1.2 : 1.2)
        leaf.position.set(p.x + Math.sin(1.2) * half * 0.5, p.y + p.h / 2, p.z + (side ? p.w - 0.15 : 0.15) + (side ? -1 : 1) * Math.cos(1.2) * half * 0.5)
      }
      g.add(leaf)
    }
  } else if (p.type === 'palm') {
    const trunkM = new THREE.MeshLambertMaterial({ color: '#8b6a45' })
    const leafM = new THREE.MeshLambertMaterial({ color: '#4f7a33', side: THREE.DoubleSide })
    let x = p.x
    let y = p.y
    let lean = 0
    for (let k = 0; k < 6; k++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - k * 0.012, 0.2 - k * 0.012, 1.4, 7), trunkM)
      seg.position.set(x, y + 0.7, p.z)
      seg.rotation.z = -lean
      seg.castShadow = true
      g.add(seg)
      x += Math.sin(lean) * 1.3
      y += Math.cos(lean) * 1.3
      lean += 0.05
    }
    for (let k = 0; k < 8; k++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.2), leafM)
      leaf.position.set(x, y, p.z)
      leaf.rotation.set(-1.0, (k / 8) * Math.PI * 2, 0, 'YXZ')
      leaf.translateY(1.4)
      leaf.castShadow = true
      g.add(leaf)
    }
  } else if (p.type === 'awning') {
    const cloth = new THREE.MeshLambertMaterial({ color: p.color, side: THREE.DoubleSide })
    const a = new THREE.Mesh(new THREE.PlaneGeometry(p.w, 1.6, 8, 1), cloth)
    const pos = a.geometry.attributes.position
    for (let k = 0; k < pos.count; k++) pos.setZ(k, ((pos.getX(k) % 1) + 1) % 1 > 0.5 ? 0.08 : 0)
    a.geometry.computeVertexNormals()
    a.rotation.x = -Math.PI / 2 + (p.flip ? -0.45 : 0.45)
    a.position.set(p.x + p.w / 2, p.y, p.z + (p.flip ? 0.7 : -0.7))
    a.castShadow = true
    g.add(a)
  }
  return g
}

// ================= Sky and light =================
export function buildSky(map, quality) {
  const sky = map.sky
  const group = new THREE.Group()
  const geo = new THREE.SphereGeometry(450, 24, 12)
  const top = hex(sky.top)
  const bottom = hex(sky.bottom)
  const cols = []
  const pos = geo.attributes.position
  for (let k = 0; k < pos.count; k++) {
    const t = Math.max(0, Math.min(1, pos.getY(k) / 450 + 0.1))
    const c = bottom.clone().lerp(top, Math.pow(t, 0.6))
    cols.push(c.r, c.g, c.b)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
  const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }))
  dome.position.set(map.w / 2, 0, map.d / 2)
  dome.renderOrder = -1
  group.add(dome)
  // The sun
  const sunDir = new THREE.Vector3(-0.45, 0.8, 0.38).normalize()
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(18, 24), new THREE.MeshBasicMaterial({ color: '#fff6dc', fog: false }))
  sunDisc.position.copy(sunDir).multiplyScalar(400).add(new THREE.Vector3(map.w / 2, 0, map.d / 2))
  sunDisc.lookAt(map.w / 2, 0, map.d / 2)
  group.add(sunDisc)

  const hemi = new THREE.HemisphereLight('#dfe8f5', sky.ground, 2.3)
  const sun = new THREE.DirectionalLight(sky.sun, quality.shadows ? 2.1 : 1.6)
  sun.position.copy(sunDir).multiplyScalar(120).add(new THREE.Vector3(map.w / 2, 0, map.d / 2))
  sun.target.position.set(map.w / 2, 0, map.d / 2)
  if (quality.shadows) {
    sun.castShadow = true
    const half = Math.max(map.w, map.d) * 0.62
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 10, far: 260 })
    sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize)
    sun.shadow.bias = -0.0004
    sun.shadow.normalBias = 0.04
    sun.shadow.autoUpdate = false // the level never moves: draw the shadows once
    sun.shadow.needsUpdate = true
  }
  group.add(hemi, sun, sun.target)
  return { group, sun, hemi, fog: new THREE.Fog(sky.fog, 50, 260) }
}

// ================= Radar =================
/**
 * A top-down picture of the map for the radar (8 px a metre). Maps with a basement (Nuke) have
 * two: `lower` shows the floors below map.radarSplit, the default the ones above.
 */
export function radarImage(map, lower = false) {
  const S = 8
  const c = document.createElement('canvas')
  c.width = map.w * S
  c.height = map.d * S
  const g = c.getContext('2d')
  const { w, d } = map
  const split = map.radarSplit ?? -INF
  // the floor to show in each cell (NaN: none)
  const floorOf = new Float32Array(w * d).fill(NaN)
  const roofed = new Uint8Array(w * d)
  for (let i = 0; i < w * d; i++) {
    for (let k = map.sc[i] - 1; k >= 0; k--) {
      const t = map.st[i * MAXS + k]
      if (t >= WALL_H - 0.1) continue
      const above = k + 1 < map.sc[i] ? map.sb[i * MAXS + k + 1] : INF
      if (above - t < 1.6) continue
      if (lower ? t >= split : t < split && map.radarSplit !== undefined) continue
      floorOf[i] = t
      roofed[i] = above < INF / 2 ? 1 : 0
      break
    }
  }
  const has = (x, z) => x >= 0 && z >= 0 && x < w && z < d && !Number.isNaN(floorOf[z * w + x])
  for (let z = 0; z < d; z++)
    for (let x = 0; x < w; x++) {
      if (!has(x, z)) continue
      const h = floorOf[z * w + x]
      const l = Math.round(70 + Math.max(-1, Math.min(4, h - (lower ? split - 3 : 0))) * 18)
      g.fillStyle = roofed[z * w + x] ? `rgb(${l - 14},${l - 10},${l + 6})` : `rgb(${l + 8},${l + 4},${l - 6})`
      g.fillRect(x * S, z * S, S, S)
    }
  g.strokeStyle = 'rgba(255,255,255,0.55)'
  g.lineWidth = 2
  g.beginPath()
  for (let z = 0; z < d; z++)
    for (let x = 0; x < w; x++) {
      if (!has(x, z)) continue
      if (!has(x - 1, z)) (g.moveTo(x * S, z * S), g.lineTo(x * S, (z + 1) * S))
      if (!has(x + 1, z)) (g.moveTo((x + 1) * S, z * S), g.lineTo((x + 1) * S, (z + 1) * S))
      if (!has(x, z - 1)) (g.moveTo(x * S, z * S), g.lineTo((x + 1) * S, z * S))
      if (!has(x, z + 1)) (g.moveTo(x * S, (z + 1) * S), g.lineTo((x + 1) * S, (z + 1) * S))
    }
  g.stroke()
  // Bomb site letters (on the floor they're on)
  g.font = `bold ${S * 7}px system-ui, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  for (const [k, rr] of Object.entries(map.sites)) {
    const mid = ((rr.y0 ?? -INF) + (rr.y1 ?? INF)) / 2
    if (map.radarSplit !== undefined && rr.y0 !== undefined && rr.y0 > -INF / 2 && (lower ? mid >= split : mid < split)) continue
    g.fillStyle = 'rgba(255,90,60,0.18)'
    g.fillRect(rr.x0 * S, rr.z0 * S, (rr.x1 - rr.x0) * S, (rr.z1 - rr.z0) * S)
    g.fillStyle = 'rgba(255,120,90,0.9)'
    g.fillText(k, ((rr.x0 + rr.x1) / 2) * S, ((rr.z0 + rr.z1) / 2) * S)
  }
  return c
}
