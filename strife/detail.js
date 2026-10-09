// Set dressing, worked out from the map's own layout so every map gets it: skirting along the
// foot of walls and coping along their tops, windows with shutters, roof beams, lamps and pipes,
// cables strung across alleys, barrels and pots tucked into corners, pebbles and grass tufts,
// metal corners on crates, and spray-painted site letters. Purely visual (nothing here blocks
// you), and merged per material so it costs a handful of draw calls.

import * as THREE from './lib/three.min.js'
import { MAT_NAMES, WALL_H, INF, MAXS } from './maps.js'
import { mergeGroup } from './models.js'

const STYLE = {
  dust: { skirting: '#b8a274', coping: '#e8d6aa', shutter: '#2d6fa8', frame: '#8a6a44', beams: true, cables: true, corner: 'barrel', barrel: '#6e7a4a', tufts: '#9a8a52', lamp: false, pipes: false, sill: '#d8c79d' },
  mirage: { skirting: '#c9b28c', coping: '#f0e2c2', shutter: '#3a8a7f', frame: '#6e4a2c', beams: true, cables: true, corner: 'pot', barrel: '#b8643c', tufts: '#7a8a46', lamp: true, pipes: false, sill: '#e8dcc0' },
  inferno: { skirting: '#7a5a42', coping: '#b8643c', shutter: '#4a6b3a', frame: '#5a3a22', beams: true, cables: true, corner: 'pot', barrel: '#b8643c', tufts: '#6a7a3a', lamp: true, pipes: false, sill: '#e6d6b8' },
  overpass: { skirting: '#8a877c', coping: '#d0cdc2', shutter: null, frame: '#4a5a62', beams: false, cables: false, corner: 'barrel', barrel: '#3d6f96', tufts: '#5f7a3a', lamp: true, pipes: true, sill: '#c2bfb3' },
  vertigo: { skirting: '#d07a2a', coping: '#9a968e', shutter: null, frame: '#6b6f74', beams: false, cables: true, corner: 'barrel', barrel: '#d07a2a', tufts: null, lamp: true, pipes: true, sill: '#a19d95' },
  nuke: { skirting: '#c9a227', coping: '#b5babd', shutter: null, frame: '#6b7378', beams: false, cables: false, corner: 'barrel', barrel: '#d9b52a', tufts: null, lamp: true, pipes: true, sill: '#9aa2a6' },
}
const hash = (...n) => {
  let h = 2166136261
  for (const v of n) {
    h ^= Math.floor(v * 73856093) & 0xffffffff
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}
const mats = new Map()
const lam = (c, extra = {}) => {
  const k = c + JSON.stringify(extra)
  if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: c, ...extra }))
  return mats.get(k)
}
const basic = (c) => {
  const k = 'b' + c
  if (!mats.has(k)) mats.set(k, new THREE.MeshBasicMaterial({ color: c }))
  return mats.get(k)
}
const phong = (c, sh) => {
  const k = 'p' + c + sh
  if (!mats.has(k)) mats.set(k, new THREE.MeshPhongMaterial({ color: c, shininess: sh, specular: '#555' }))
  return mats.get(k)
}
function box(w, h, d, m, x, y, z, ry = 0) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
  o.position.set(x, y, z)
  o.rotation.y = ry
  return o
}
function cylinder(r0, r1, h, m, x, y, z, seg = 10) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m)
  o.position.set(x, y, z)
  return o
}
function letterTexture(letter, color) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  g.clearRect(0, 0, 256, 256)
  g.font = '900 210px Impact, "Arial Black", sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  // spray paint: a soft halo, drips, then the letter
  g.shadowColor = color
  g.shadowBlur = 14
  g.fillStyle = color
  g.fillText(letter, 128, 136)
  g.shadowBlur = 0
  for (let i = 0; i < 6; i++) {
    const x = 70 + Math.random() * 116
    g.fillRect(x, 170 + Math.random() * 20, 4, 20 + Math.random() * 40)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function decorate(map, lookName) {
  const st = STYLE[lookName] ?? STYLE.dust
  const { w, d } = map
  const spans = (x, z) => {
    if (x < 0 || z < 0 || x >= w || z >= d) return null
    const c = z * w + x
    const out = []
    for (let k = 0; k < map.sc[c]; k++) out.push([map.sb[c * MAXS + k], map.st[c * MAXS + k], map.sm[c * MAXS + k]])
    return out
  }
  const gaps = (sp) => {
    const out = []
    for (let k = 0; k < sp.length; k++) {
      const lo = sp[k][1]
      const hi = k + 1 < sp.length ? sp[k + 1][0] : INF
      if (hi > lo) out.push([lo, hi, k + 1 < sp.length])
    }
    return out
  }
  const solidAt = (x, z, y) => {
    const sp = spans(x, z)
    return !sp || sp.some(([b, t]) => y > b && y < t)
  }
  const tallAt = (x, z) => {
    const sp = spans(x, z)
    return !sp || sp.some(([b, t]) => t >= WALL_H - 0.01 && b < 1)
  }
  const CRATE = MAT_NAMES.indexOf('crate')
  const GROUND = MAT_NAMES.indexOf('ground')
  const g = new THREE.Group()
  const skirt = lam(st.skirting)
  const coping = lam(st.coping)
  const frame = lam(st.frame)
  const glass = phong('#1c2430', 90)
  const sill = lam(st.sill)
  const shutter = st.shutter ? lam(st.shutter) : null
  const beam = lam('#6b4a2a')
  const steel = phong('#7b8288', 50)
  const lampM = basic('#fff1c4')
  const pipeM = phong(lookName === 'nuke' ? '#5b7c99' : '#777', 40)
  const cableM = lam('#1b1b1b')

  for (let z = 0; z < d; z++)
    for (let x = 0; x < w; x++) {
      const col = spans(x, z)
      for (const [b, t, m] of col) {
        const tall = t >= WALL_H - 0.01 && t < INF / 2
        // ---- crates: metal corners
        if (m === CRATE && t < WALL_H - 0.01) {
          for (const [cx, cz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
            const ox = cx ? 1 : -1
            const oz = cz ? 1 : -1
            const nbX = spans(x + ox, z)?.some(([b2, t2, m2]) => m2 === CRATE && Math.abs(t2 - t) < 0.05)
            const nbZ = spans(x, z + oz)?.some(([b2, t2, m2]) => m2 === CRATE && Math.abs(t2 - t) < 0.05)
            if (nbX || nbZ) continue
            g.add(box(0.1, Math.min(1.2, t - b), 0.1, steel, x + cx - ox * 0.04, b + Math.min(1.2, t - b) / 2, z + cz - oz * 0.04))
          }
          continue
        }
        if (!tall) continue
        // ---- the faces of tall walls
        for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ncol = spans(x + nx, z + nz)
          if (!ncol) continue
          for (const [g0, g1, capped] of gaps(ncol)) {
            if (g0 >= t || g1 <= b) continue
            const floorY = Math.max(g0, b)
            const topY = Math.min(t, g1)
            if (topY - floorY < 1.5) continue
            const cx = x + 0.5 + nx * 0.5
            const cz = z + 0.5 + nz * 0.5
            const along = nx ? 0 : Math.PI / 2 // the face runs along z when nx != 0
            const out = (dist) => [cx + nx * dist, cz + nz * dist]
            const wide = (len, h, depth, m2, dist, y) => {
              const [px, pz] = out(dist)
              return nx ? box(depth, h, len, m2, px, y, pz) : box(len, h, depth, m2, px, y, pz)
            }
            // skirting at the foot, coping along an open top
            g.add(wide(1.0, 0.2, 0.05, skirt, 0.025, floorY + 0.1))
            if (!capped && g1 > WALL_H && Math.abs(t - WALL_H) < 0.02) g.add(wide(1.0, 0.14, 0.1, coping, 0.04, WALL_H - 0.07))
            const lineId = nx ? x * 2 + (nx > 0 ? 1 : 0) : z * 2 + (nz > 0 ? 1 : 0)
            const r = hash(x, z, nx, nz, floorY)
            // does the wall carry on either side of this cell (so things aren't hung on corners)?
            const sideA = nx ? tallAt(x, z - 1) && !solidAt(x + nx, z - 1, floorY + 1) : tallAt(x - 1, z) && !solidAt(x - 1, z + nz, floorY + 1)
            const sideB = nx ? tallAt(x, z + 1) && !solidAt(x + nx, z + 1, floorY + 1) : tallAt(x + 1, z) && !solidAt(x + 1, z + nz, floorY + 1)
            const mid = sideA && sideB
            const room = topY - floorY
            // ---- windows
            if (mid && !capped && room > 4.4 && r < 0.11) {
              const wy = floorY + 3.3
              g.add(wide(0.62, 0.9, 0.02, glass, 0.012, wy))
              for (const s of [-1, 1]) {
                const [px, pz] = out(0.03)
                const ox = nx ? 0 : s * 0.34
                const oz = nx ? s * 0.34 : 0
                g.add(nx ? box(0.06, 1.0, 0.06, frame, px, wy, pz + oz) : box(0.06, 1.0, 0.06, frame, px + ox, wy, pz))
                if (shutter) {
                  // shutters swung open against the wall
                  const [sx, sz] = out(0.03)
                  g.add(nx ? box(0.03, 0.95, 0.34, shutter, sx, wy, sz + s * 0.53) : box(0.34, 0.95, 0.03, shutter, sx + s * 0.53, wy, sz))
                }
              }
              g.add(wide(0.74, 0.06, 0.06, frame, 0.03, wy + 0.5))
              g.add(wide(0.84, 0.07, 0.16, sill, 0.07, wy - 0.5))
              if (lookName === 'mirage') g.add(wide(0.7, 0.18, 0.05, frame, 0.03, wy + 0.62))
            }
            // ---- roof beams poking out under the top
            if (st.beams && !capped && g1 > WALL_H && hash(lineId, x + z) < 0.3 && Math.abs(t - WALL_H) < 0.02) {
              const [px, pz] = out(0.2)
              const bm = cylinder(0.07, 0.07, 0.4, beam, px, WALL_H - 0.45, pz, 7)
              bm.rotation.set(nx ? 0 : Math.PI / 2, 0, nx ? Math.PI / 2 : 0)
              g.add(bm)
            }
            // ---- lamps
            if (st.lamp && mid && r > 0.93 && room > 3) {
              const ly = floorY + 2.6
              g.add(wide(0.12, 0.12, 0.2, steel, 0.1, ly))
              g.add(wide(0.2, 0.12, 0.16, lampM, 0.22, ly - 0.1))
              if (lookName === 'mirage') g.add(wide(0.24, 0.3, 0.24, frame, 0.24, ly - 0.05))
            }
            // ---- pipes: whole lengths of wall get them
            if (st.pipes && room > 3.5 && hash(lineId, nx, nz, 7) < 0.35) {
              const [px, pz] = out(0.12)
              const p = cylinder(0.07, 0.07, 1.0, pipeM, px, floorY + 3.1, pz, 8)
              p.rotation.set(nx ? Math.PI / 2 : 0, 0, nx ? 0 : Math.PI / 2)
              g.add(p)
              if (hash(x, z, 3) < 0.3) g.add(wide(0.08, 0.2, 0.14, steel, 0.07, floorY + 3.1))
            }
            // ---- a cable strung across to the wall opposite
            if (st.cables && !capped && r > 0.965 && room > 5) {
              let dist = 0
              for (let k = 1; k <= 7; k++) {
                if (solidAt(x + nx * k, z + nz * k, floorY + 5.4)) {
                  dist = k - 1
                  break
                }
              }
              if (dist >= 2) {
                const a = new THREE.Vector3(cx, floorY + 5.4, cz)
                const e = new THREE.Vector3(cx + nx * dist, floorY + 5.4, cz + nz * dist)
                const mid3 = a.clone().lerp(e, 0.5)
                mid3.y -= 0.35 + dist * 0.08
                const curve = new THREE.CatmullRomCurve3([a, a.clone().lerp(mid3, 0.5).setY(floorY + 5.25), mid3, e.clone().lerp(mid3, 0.5).setY(floorY + 5.25), e])
                g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.02, 4), cableM))
              }
            }
          }
        }
      }
    }

  // ---- floors: corner props, pebbles and tufts
  const barrelM = lam(st.barrel)
  const ringM = lam('#3a3a36')
  const tuftM = st.tufts ? lam(st.tufts, { side: THREE.DoubleSide }) : null
  const rockM = lam(lookName === 'nuke' ? '#7d8183' : '#b49c74')
  for (let z = 0; z < d; z++)
    for (let x = 0; x < w; x++) {
      const col = spans(x, z)
      for (const [, , capped] of gaps(col)) void capped
      const top = col[0]
      if (!top) continue
      const floorY = top[1]
      if (floorY >= WALL_H - 0.01 || solidAt(x, z, floorY + 0.5)) continue
      const r = hash(x, z, 11)
      // an inside corner: walls on two sides that meet
      const wallE = solidAt(x + 1, z, floorY + 1.2)
      const wallW = solidAt(x - 1, z, floorY + 1.2)
      const wallN = solidAt(x, z - 1, floorY + 1.2)
      const wallS = solidAt(x, z + 1, floorY + 1.2)
      const corners = []
      if (wallE && wallN) corners.push([0.68, 0.32])
      if (wallE && wallS) corners.push([0.68, 0.68])
      if (wallW && wallN) corners.push([0.32, 0.32])
      if (wallW && wallS) corners.push([0.32, 0.68])
      if (corners.length === 1 && r < 0.4) {
        const [ox, oz] = corners[0]
        const px = x + ox
        const pz = z + oz
        if (st.corner === 'barrel') {
          g.add(cylinder(0.27, 0.27, 0.88, barrelM, px, floorY + 0.44, pz, 14))
          for (const y of [0.22, 0.66]) g.add(cylinder(0.28, 0.28, 0.04, ringM, px, floorY + y, pz, 14))
          g.add(cylinder(0.24, 0.24, 0.02, ringM, px, floorY + 0.89, pz, 14))
        } else {
          // a terracotta pot with a little bush
          g.add(cylinder(0.2, 0.14, 0.42, barrelM, px, floorY + 0.21, pz, 12))
          g.add(cylinder(0.23, 0.23, 0.06, barrelM, px, floorY + 0.42, pz, 12))
          const bush = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), lam('#4f7a33'))
          bush.position.set(px, floorY + 0.62, pz)
          bush.scale.set(1, 0.8, 1)
          g.add(bush)
        }
      }
      // pebbles and tufts on open ground near walls
      if (top[2] === GROUND && (wallE || wallW || wallN || wallS)) {
        if (r > 0.82) {
          const rock = new THREE.Mesh(new THREE.SphereGeometry(0.07 + r * 0.05, 5, 4), rockM)
          rock.position.set(x + 0.2 + hash(x, z, 2) * 0.6, floorY + 0.02, z + 0.2 + hash(x, z, 3) * 0.6)
          rock.scale.set(1.3, 0.55, 1)
          g.add(rock)
        }
        if (tuftM && r > 0.55 && r < 0.68) {
          const px = x + (wallE ? 0.85 : wallW ? 0.15 : 0.5)
          const pz = z + (wallS ? 0.85 : wallN ? 0.15 : 0.5)
          for (let k = 0; k < 3; k++) {
            const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.3), tuftM)
            blade.position.set(px, floorY + 0.14, pz)
            blade.rotation.set(0, (k / 3) * Math.PI, (hash(x, z, k) - 0.5) * 0.4)
            g.add(blade)
          }
        }
      }
    }
  mergeGroup(g)
  for (const m of g.children) {
    m.castShadow = false
    m.receiveShadow = true
  }

  // ---- the site letters, sprayed on a wall that faces each site
  for (const [name, rr] of Object.entries(map.sites ?? {})) {
    const sx = (rr.x0 + rr.x1) / 2
    const sz = (rr.z0 + rr.z1) / 2
    const floor = rr.y0 > -INF / 2 && rr.y1 < INF / 2 ? (rr.y0 + rr.y1) / 2 - 0.5 : 0
    let best = null
    for (let z = Math.floor(rr.z0) - 1; z <= Math.ceil(rr.z1); z++)
      for (let x = Math.floor(rr.x0) - 1; x <= Math.ceil(rr.x1); x++) {
        if (!tallAt(x, z)) continue
        for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ncol = spans(x + nx, z + nz)
          if (!ncol) continue
          const gp = gaps(ncol).find(([g0, g1]) => g1 - g0 > 3 && Math.abs(g0 - Math.max(floor, -6)) < 2.5)
          if (!gp) continue
          const fx = x + 0.5 + nx * 0.5
          const fz = z + 0.5 + nz * 0.5
          // facing the middle of the site, and as close to it as possible
          const toward = (sx - fx) * nx + (sz - fz) * nz
          if (toward <= 0) continue
          const dist = Math.hypot(sx - fx, sz - fz)
          if (!best || dist < best.dist) best = { fx, fz, nx, nz, y: gp[0], dist }
        }
      }
    if (!best) continue
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.9),
      new THREE.MeshLambertMaterial({ map: letterTexture(name, lookName === 'nuke' ? '#d23b2b' : '#c8102e'), transparent: true, depthWrite: false }),
    )
    plane.position.set(best.fx + best.nx * 0.02, best.y + 2.1, best.fz + best.nz * 0.02)
    plane.rotation.y = Math.atan2(best.nx, best.nz)
    g.add(plane)
  }
  return g
}
