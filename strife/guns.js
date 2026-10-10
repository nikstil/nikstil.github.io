// Gun models, built from parts: side profiles extruded to their thickness (receivers, stocks,
// grips, magazines), turned barrels and scopes, rails, sights, suppressors. Every model points
// down -z with the trigger at the origin, in metres. Parts marked `paint` take a weapon skin.

import * as THREE from './lib/three.min.js'

// ---------- materials (shared, so a hundred guns on the floor cost nothing extra)
const matCache = new Map()
/** kind: 'metal' (shiny), 'poly' (matte plastic), 'wood', 'rubber' */
export function gunMat(color, kind = 'metal') {
  const key = color + kind
  if (!matCache.has(key)) {
    const shin = { metal: 70, poly: 12, wood: 18, rubber: 4, glass: 120 }[kind]
    const spec = { metal: '#6a6a6a', poly: '#1c1c1c', wood: '#2a2018', rubber: '#0a0a0a', glass: '#ffffff' }[kind]
    // (glass you can see through: you look through a red dot's window to aim)
    const see = kind === 'glass' ? { transparent: true, opacity: 0.35, depthWrite: false } : {}
    matCache.set(key, new THREE.MeshPhongMaterial({ color, shininess: shin, specular: spec, ...see }))
  }
  return matCache.get(key)
}
const C = {
  black: () => gunMat('#26282b', 'metal'),
  gun: () => gunMat('#3a3d42', 'metal'),
  steel: () => gunMat('#9ea4aa', 'metal'),
  poly: () => gunMat('#2b2c2e', 'poly'),
  rubber: () => gunMat('#1b1b1c', 'rubber'),
  wood: () => gunMat('#7b4a24', 'wood'),
  darkwood: () => gunMat('#5a3418', 'wood'),
  lens: () => gunMat('#2c5d7a', 'glass'),
}

// ---------- geometry caches
const geoCache = new Map()
const cached = (key, make) => {
  if (!geoCache.has(key)) geoCache.set(key, make())
  return geoCache.get(key)
}

/**
 * A side profile: points [u, v] (u forward along the barrel, v up), extruded `w` wide, centred.
 * Bevelled a little so the edges catch the light.
 */
function profile(pts, w, mat, { x = 0, bevel = 0.0025, hole = null, paint = false } = {}) {
  const key = 'p' + JSON.stringify(pts) + w + bevel + JSON.stringify(hole)
  const geo = cached(key, () => {
    const s = new THREE.Shape()
    s.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1])
    s.closePath()
    if (hole) {
      const h = new THREE.Path()
      h.moveTo(hole[0][0], hole[0][1])
      for (let i = 1; i < hole.length; i++) h.lineTo(hole[i][0], hole[i][1])
      h.closePath()
      s.holes.push(h)
    }
    const b = Math.min(bevel, w * 0.3)
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, w - b * 2), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 6 })
    g.translate(0, 0, -(w - b * 2) / 2)
    g.rotateY(Math.PI / 2) // u -> -z, extrusion -> x
    g.computeVertexNormals()
    return g
  })
  const m = new THREE.Mesh(geo, mat)
  m.position.x = x
  if (paint) m.userData.paint = true
  return m
}
/** A cylinder along the barrel from u0 to u1 at height v. */
function tube(r, u0, u1, v, mat, { x = 0, seg = 12, r1 = r, paint = false } = {}) {
  const len = Math.abs(u1 - u0)
  const geo = cached(`t${r}|${r1}|${len}|${seg}`, () => {
    const g = new THREE.CylinderGeometry(r1, r, len, seg)
    g.rotateX(-Math.PI / 2) // +y -> -z: r at u0 end, r1 at u1 end
    return g
  })
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, v, -(u0 + u1) / 2)
  if (paint) m.userData.paint = true
  return m
}
/** A box from (u0..u1, v0..v1), w wide. */
function blk(u0, u1, v0, v1, w, mat, { x = 0, paint = false } = {}) {
  const geo = cached(`b${(u1 - u0).toFixed(4)}|${(v1 - v0).toFixed(4)}|${w}`, () => new THREE.BoxGeometry(w, v1 - v0, u1 - u0))
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, (v0 + v1) / 2, -(u0 + u1) / 2)
  if (paint) m.userData.paint = true
  return m
}
/** A Picatinny rail: a flat bar with cross slots along it. */
function rail(u0, u1, v, g, w = 0.022, detail = 1) {
  g.add(blk(u0, u1, v, v + 0.008, w, C.black()))
  if (detail < 2) return
  const n = Math.floor((u1 - u0) / 0.01)
  for (let i = 0; i < n; i++) g.add(blk(u0 + i * 0.01 + 0.002, u0 + i * 0.01 + 0.006, v + 0.008, v + 0.012, w, C.black()))
}
/** A trigger guard (a loop) and the trigger inside it. */
function triggerGuard(u0, u1, v, g, mat = C.black(), depth = 0.036) {
  const o = [[u0, v], [u1, v], [u1, v - depth + 0.008], [u1 - 0.008, v - depth], [u0 + 0.004, v - depth], [u0, v - depth + 0.01]]
  const t = 0.005
  const h = [[u0 + t, v - 0.001], [u1 - t, v - 0.001], [u1 - t, v - depth + 0.01], [u1 - 0.01, v - depth + t], [u0 + t + 0.002, v - depth + t], [u0 + t, v - depth + 0.012]]
  g.add(profile(o, 0.012, mat, { hole: h, bevel: 0.001 }))
  const tr = profile([[0, 0], [0.006, 0], [0.002, -0.022], [-0.004, -0.024], [-0.002, -0.02]], 0.006, C.steel(), { bevel: 0.001 })
  tr.position.y = v
  tr.position.z = -(u0 + (u1 - u0) * 0.55)
  g.add(tr)
}
/** A pistol grip, raked back. */
function pistolGrip(u, v, g, mat, { len = 0.1, w = 0.032, rake = 0.035, thick = 0.042, paint = false } = {}) {
  const pts = [[u + 0.012, v], [u - thick + 0.012, v], [u - thick - rake + 0.006, v - len + 0.01], [u - thick - rake + 0.012, v - len], [u - rake + 0.012, v - len], [u - rake + 0.016, v - len + 0.012]]
  g.add(profile(pts, w, mat, { paint, bevel: 0.004 }))
  // stippling bands
  g.add(profile([[u - 0.004, v - 0.02], [u - thick + 0.008, v - 0.02], [u - thick - rake * 0.6 + 0.01, v - len * 0.7], [u - rake * 0.6 + 0.006, v - len * 0.7]], w + 0.002, C.rubber(), { bevel: 0.001 }))
}
/** A magazine: straight or curved (banana) from the magwell at u, v. */
function magazine(u, v, g, mat, { len = 0.16, w = 0.03, d = 0.06, curve = 0, rake = 0.02, ribs = 0, paint = false } = {}) {
  const pts = []
  const n = 6
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push([u + rake * t + curve * t * t, v - len * t])
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n
    pts.push([u - d + rake * t + curve * t * t * 1.15 - (curve ? 0.004 * t : 0), v - len * t - (curve ? 0.004 * t : 0)])
  }
  g.add(profile(pts, w, mat, { paint, bevel: 0.002 }))
  // base plate
  const t = 1
  const bu = u + rake + curve - d / 2
  g.add(blk(bu - d / 2 - 0.004, bu + d / 2 + 0.004, v - len - 0.008, v - len + 0.002, w + 0.006, C.black()))
  for (let i = 1; i <= ribs; i++) {
    const tt = i / (ribs + 1)
    const ru = u + rake * tt + curve * tt * tt - d / 2
    g.add(blk(ru - 0.01, ru + 0.01, v - len * tt - 0.004, v - len * tt, w + 0.003, mat))
  }
}
/** A telescopic sight with bells, turrets and glass, centred over u0..u1 at height v. */
function scope(u0, u1, v, g, { r = 0.017, bell = 0.026, mat = C.black(), mount = true } = {}) {
  const L = u1 - u0
  g.add(tube(r, u0 + L * 0.2, u1 - L * 0.25, v, mat))
  g.add(tube(r, u0 + L * 0.08, u0 + L * 0.2, v, mat, { r1: r * 1.02 }))
  g.add(tube(bell * 0.9, u0, u0 + L * 0.08, v, mat, { r1: r }))
  g.add(tube(r, u1 - L * 0.25, u1 - L * 0.08, v, mat, { r1: bell }))
  g.add(tube(bell, u1 - L * 0.08, u1, v, mat))
  g.add(tube(bell * 0.86, u1 - 0.002, u1 + 0.001, v, C.lens(), { seg: 14 }))
  g.add(tube(bell * 0.8, u0 - 0.001, u0 + 0.002, v, C.lens(), { seg: 14 }))
  // turrets
  const mid = (u0 + u1) / 2 - L * 0.03
  const top = tube(0.011, 0, 0.022, 0, mat, { seg: 10 })
  top.rotation.x = Math.PI / 2
  top.position.set(0, v + r + 0.01, -mid)
  g.add(top)
  const side = tube(0.011, 0, 0.02, 0, mat, { seg: 10 })
  side.rotation.y = Math.PI / 2
  side.position.set(r + 0.009, v, -mid)
  g.add(side)
  if (mount) {
    g.add(blk(u0 + L * 0.22, u0 + L * 0.3, v - r - 0.02, v - r * 0.3, 0.018, C.black()))
    g.add(blk(u1 - L * 0.38, u1 - L * 0.3, v - r - 0.02, v - r * 0.3, 0.018, C.black()))
  }
}
const DOT = new THREE.MeshBasicMaterial({ color: '#ff2a3a' })
/** A red-dot / holo sight: an open hood (you look through it to aim) with the glass and the dot. */
function redDot(u, v, g) {
  const M = C.black()
  g.add(blk(u - 0.04, u + 0.03, v, v + 0.012, 0.03, M))
  const side = [[u - 0.034, v + 0.012], [u + 0.03, v + 0.012], [u + 0.03, v + 0.048], [u + 0.022, v + 0.052], [u - 0.028, v + 0.052], [u - 0.034, v + 0.046]]
  for (const x of [-0.0145, 0.0145]) g.add(profile(side, 0.005, M, { x }))
  g.add(blk(u - 0.028, u + 0.022, v + 0.047, v + 0.053, 0.034, M)) // the roof
  g.add(blk(u + 0.02, u + 0.024, v + 0.014, v + 0.047, 0.024, C.lens()))
  g.add(blk(u + 0.0185, u + 0.0195, v + 0.0295, v + 0.0325, 0.003, DOT)) // the dot
  g.userData.dot = v + 0.031 // aiming down the sights, you look through the middle of the window
}
/** Front sight post (A-frame or a simple blade). */
function frontPost(u, v, g, h = 0.035, frame = true) {
  if (frame) g.add(profile([[u - 0.012, v], [u + 0.012, v], [u + 0.006, v + h], [u - 0.006, v + h]], 0.02, C.black(), { hole: [[u - 0.006, v + 0.006], [u + 0.006, v + 0.006], [u + 0.003, v + h - 0.008], [u - 0.003, v + h - 0.008]] }))
  g.add(blk(u - 0.002, u + 0.002, v + h - 0.012, v + h + 0.002, 0.004, C.black()))
}
/** A suppressor (with a few rings) from u0 to u1. */
function suppressor(u0, u1, v, g, r = 0.019) {
  g.add(tube(r, u0 + 0.01, u1 - 0.006, v, C.gun(), { seg: 16 }))
  g.add(tube(r * 0.85, u0, u0 + 0.012, v, C.black(), { seg: 16, r1: r }))
  g.add(tube(r, u1 - 0.008, u1, v, C.black(), { seg: 16, r1: r * 0.85 }))
  for (let k = 1; k < 4; k++) g.add(tube(r + 0.0015, u0 + (u1 - u0) * k * 0.22, u0 + (u1 - u0) * k * 0.22 + 0.004, v, C.black(), { seg: 16 }))
}
/** A muzzle device: birdcage, brake or compensator. */
function muzzle(kind, u, v, g, r = 0.012) {
  if (kind === 'cage') {
    g.add(tube(r, u, u + 0.05, v, C.black()))
    for (let k = 0; k < 3; k++) g.add(blk(u + 0.01 + k * 0.012, u + 0.016 + k * 0.012, v + r * 0.4, v + r + 0.001, 0.006, C.poly()))
  } else if (kind === 'brake') {
    g.add(tube(r * 1.25, u, u + 0.045, v, C.black()))
    g.add(blk(u + 0.012, u + 0.022, v - r * 1.3, v + r * 1.3, r * 2.7, C.poly()))
    g.add(blk(u + 0.028, u + 0.038, v - r * 1.3, v + r * 1.3, r * 2.7, C.poly()))
  } else if (kind === 'ak') {
    const m = tube(r * 1.2, u, u + 0.04, v, C.black(), { r1: r * 1.1 })
    g.add(m)
    g.add(blk(u + 0.03, u + 0.04, v + r * 0.3, v + r * 1.2, 0.012, C.black()))
  }
}
/** A buffer tube with a collapsible stock (M4 family). */
function m4Stock(u, v, g, mat, paint) {
  g.add(tube(0.016, u - 0.2, u, v, C.black()))
  g.add(profile([[u - 0.12, v + 0.024], [u - 0.29, v + 0.03], [u - 0.3, v + 0.02], [u - 0.3, v - 0.09], [u - 0.27, v - 0.095], [u - 0.2, v - 0.03], [u - 0.12, v - 0.02]], 0.044, mat, { paint }))
  g.add(blk(u - 0.302, u - 0.29, v - 0.094, v + 0.03, 0.046, C.rubber()))
}
/** A skeleton/folding stock: a frame of bars. */
function skeletonStock(u, v, g, mat, { len = 0.26, drop = 0.08 } = {}) {
  const t = 0.012
  g.add(profile([[u, v], [u - len, v - drop * 0.15], [u - len, v - drop - 0.03], [u - len + 0.02, v - drop - 0.03], [u, v - 0.035]], 0.03, mat, { hole: [[u - 0.02, v - t], [u - len + t, v - drop * 0.15 - t], [u - len + t, v - drop - 0.03 + t], [u - len + 0.024, v - drop - 0.03 + t], [u - 0.02, v - 0.035 + t]] }))
  g.add(blk(u - len - 0.008, u - len + 0.004, v - drop - 0.034, v - drop * 0.15 + 0.004, 0.034, C.rubber()))
}
/** A folded wire stock along the side (MAC-10, MP9). */
function wireStock(u0, u1, v, g, x = 0.024) {
  g.add(tube(0.004, u0, u1, v, C.steel(), { x, seg: 6 }))
  g.add(tube(0.004, u0, u1, v - 0.03, C.steel(), { x, seg: 6 }))
  g.add(blk(u1 - 0.006, u1, v - 0.034, v + 0.004, 0.006, C.steel(), { x }))
}

// ================= Rifles =================
function ak(g, d, o) {
  const wood = o.galil ? C.poly() : C.wood()
  const recv = C.gun()
  g.add(profile([[-0.12, 0], [0.28, 0], [0.28, 0.052], [0.22, 0.066], [-0.09, 0.066], [-0.12, 0.05]], 0.05, recv, { paint: true }))
  g.add(tube(0.024, -0.09, 0.22, 0.062, recv, { paint: true, seg: 14 })) // dust cover
  g.add(profile([[0.28, 0.004], [0.5, 0.008], [0.5, 0.046], [0.28, 0.05]], 0.054, wood, { paint: true })) // lower handguard
  g.add(tube(0.016, 0.3, 0.48, 0.07, wood, { paint: true })) // gas tube cover
  g.add(tube(0.01, 0.48, 0.6, 0.07, C.black()))
  g.add(blk(0.58, 0.62, 0.035, 0.08, 0.026, C.black())) // gas block
  g.add(tube(0.012, 0.28, o.short ? 0.66 : 0.8, 0.04, C.black()))
  frontPost(o.short ? 0.62 : 0.76, 0.04, g, 0.05)
  muzzle(o.galil ? 'cage' : 'ak', o.short ? 0.66 : 0.8, 0.04, g)
  g.add(blk(0.22, 0.27, 0.066, 0.08, 0.03, C.black())) // rear sight block
  g.add(blk(0.235, 0.26, 0.08, 0.088, 0.024, C.steel()))
  g.add(blk(-0.03, 0.04, 0.03, 0.04, 0.012, C.steel(), { x: 0.03 })) // charging handle
  g.add(blk(-0.08, 0.05, 0.012, 0.022, 0.004, C.black(), { x: 0.027 })) // selector lever
  triggerGuard(0.0, 0.07, 0, g)
  pistolGrip(0.0, 0, g, o.galil ? C.poly() : C.darkwood(), { paint: !o.galil })
  magazine(0.18, 0, g, o.galil ? C.black() : gunMat('#8b4c22', 'poly'), { len: o.galil ? 0.17 : 0.18, d: 0.055, w: 0.032, curve: 0.07, rake: 0.01, ribs: 3, paint: !o.galil })
  if (o.galil) skeletonStock(-0.12, 0.05, g, C.black(), { len: 0.27, drop: 0.07 })
  else {
    g.add(profile([[-0.12, 0.052], [-0.12, 0.0], [-0.2, -0.02], [-0.44, -0.065], [-0.45, -0.065], [-0.45, 0.048], [-0.42, 0.054]], 0.046, wood, { paint: true }))
    g.add(blk(-0.458, -0.448, -0.067, 0.05, 0.048, C.black()))
  }
}
function m4(g, d, o) {
  const recv = o.color ? gunMat(o.color, 'metal') : C.black()
  // upper and lower receivers, magwell
  g.add(profile([[-0.11, 0.0], [0.22, 0.0], [0.22, 0.058], [-0.11, 0.058]], 0.05, recv, { paint: true }))
  g.add(profile([[-0.09, 0.0], [0.17, 0.0], [0.17, -0.03], [0.08, -0.032], [0.06, -0.012], [-0.04, -0.012], [-0.09, -0.02]], 0.046, recv, { paint: true }))
  rail(-0.1, 0.22, 0.058, g, 0.022, d)
  g.add(blk(0.02, 0.09, 0.026, 0.05, 0.004, C.black(), { x: 0.026 })) // ejection port cover
  g.add(tube(0.008, 0.03, 0.05, 0.035, C.black(), { x: 0.026, seg: 8 })) // forward assist
  g.add(blk(-0.12, -0.1, 0.045, 0.06, 0.04, C.black())) // charging handle
  if (o.silenced) {
    g.add(tube(0.024, 0.22, 0.46, 0.035, recv, { paint: true, seg: 14 }))
    for (let k = 0; k < 6; k++) g.add(blk(0.25 + k * 0.035, 0.265 + k * 0.035, 0.05, 0.062, 0.012, C.black()))
    g.add(tube(0.011, 0.46, 0.52, 0.035, C.black()))
    if (o.supp) suppressor(0.5, 0.74, 0.035, g, 0.019)
    else muzzle('cage', 0.52, 0.035, g, 0.011)
  } else {
    // quad rail handguard
    g.add(blk(0.22, 0.5, 0.008, 0.062, 0.05, recv, { paint: true }))
    rail(0.22, 0.5, 0.062, g, 0.022, d)
    for (const s of [-1, 1]) g.add(blk(0.24, 0.48, 0.022, 0.048, 0.008, C.black(), { x: s * 0.028 }))
    g.add(blk(0.24, 0.48, -0.006, 0.008, 0.022, C.black()))
    g.add(tube(0.011, 0.5, 0.74, 0.035, C.black()))
    muzzle('cage', 0.74, 0.035, g, 0.012)
  }
  // flip-up sights
  g.add(profile([[-0.08, 0.066], [-0.05, 0.066], [-0.055, 0.09], [-0.072, 0.09]], 0.026, C.black(), { hole: [[-0.07, 0.072], [-0.058, 0.072], [-0.06, 0.084], [-0.068, 0.084]] }))
  if (!o.silenced) frontPost(0.47, 0.07, g, 0.03)
  triggerGuard(0.0, 0.075, -0.012, g)
  pistolGrip(0.0, -0.012, g, C.poly())
  magazine(0.16, -0.03, g, C.gun(), { len: o.short ? 0.12 : 0.15, d: 0.06, w: 0.026, curve: o.short ? 0.01 : 0.025, rake: 0.012, ribs: 2 })
  m4Stock(-0.11, 0.035, g, C.poly(), false)
}
function famas(g, d) {
  const body = gunMat('#2f3437', 'poly')
  g.add(profile([[-0.32, -0.04], [0.26, -0.01], [0.3, 0.02], [0.3, 0.06], [-0.32, 0.06], [-0.34, 0.03]], 0.056, body, { paint: true }))
  // the long carry handle with sights
  g.add(profile([[-0.24, 0.06], [0.24, 0.06], [0.24, 0.12], [0.2, 0.13], [-0.2, 0.13], [-0.24, 0.12]], 0.022, C.black(), { hole: [[-0.18, 0.066], [0.17, 0.066], [0.17, 0.112], [-0.18, 0.112]] }))
  g.add(tube(0.012, 0.28, 0.62, 0.035, C.black()))
  muzzle('cage', 0.62, 0.035, g)
  g.add(profile([[-0.36, 0.06], [-0.32, 0.06], [-0.32, -0.08], [-0.37, -0.08]], 0.05, C.rubber())) // butt pad
  triggerGuard(0.0, 0.12, -0.012, g, C.poly(), 0.045)
  pistolGrip(0.0, -0.012, g, C.poly())
  magazine(-0.12, -0.03, g, C.gun(), { len: 0.13, d: 0.055, w: 0.026, rake: 0.01, ribs: 2 })
  // bipod legs folded under the handguard
  for (const s of [-1, 1]) g.add(blk(0.06, 0.26, -0.008, 0.002, 0.008, C.black(), { x: s * 0.025 }))
}
function aug(g, d, o) {
  const body = gunMat(o.color ?? '#4a5a3c', 'poly')
  g.add(profile([[-0.34, -0.05], [-0.06, -0.03], [0.02, -0.02], [0.26, 0.0], [0.28, 0.05], [-0.34, 0.06], [-0.36, 0.02]], 0.06, body, { paint: true }))
  // the big trigger guard wrapped around the hand
  g.add(profile([[-0.03, -0.02], [0.14, 0.0], [0.13, -0.11], [-0.07, -0.12], [-0.06, -0.08]], 0.034, body, { hole: [[-0.02, -0.03], [0.12, -0.012], [0.11, -0.1], [-0.05, -0.105], [-0.04, -0.07]], paint: true }))
  pistolGrip(0.0, -0.02, g, body, { paint: true })
  g.add(profile([[0.18, 0.0], [0.22, 0.0], [0.2, -0.1], [0.16, -0.1]], 0.03, body, { paint: true })) // foregrip
  g.add(tube(0.012, 0.28, 0.6, 0.03, C.black()))
  muzzle('cage', 0.6, 0.03, g)
  scope(-0.12, 0.18, 0.11, g, { r: 0.022, bell: 0.026, mat: body, mount: false })
  g.add(profile([[-0.1, 0.06], [0.14, 0.06], [0.12, 0.09], [-0.08, 0.09]], 0.03, body))
  magazine(-0.14, -0.03, g, gunMat('#6c7a6a', 'poly'), { len: 0.14, d: 0.055, w: 0.026, curve: 0.02, rake: 0.01 })
}
function sg553(g, d) {
  const body = C.black()
  g.add(profile([[-0.12, -0.01], [0.24, -0.01], [0.24, 0.06], [-0.12, 0.06]], 0.05, body, { paint: true }))
  g.add(profile([[0.24, -0.005], [0.48, 0.0], [0.48, 0.055], [0.24, 0.06]], 0.054, gunMat('#2d2f31', 'poly'), { paint: true }))
  for (let k = 0; k < 5; k++) g.add(blk(0.27 + k * 0.04, 0.285 + k * 0.04, 0.0, 0.05, 0.056, C.black()))
  g.add(tube(0.011, 0.48, 0.66, 0.03, C.black()))
  muzzle('cage', 0.66, 0.03, g)
  scope(-0.06, 0.2, 0.1, g, { r: 0.016, bell: 0.022 })
  triggerGuard(0.0, 0.075, -0.01, g)
  pistolGrip(0.0, -0.01, g, C.poly())
  magazine(0.17, -0.01, g, gunMat('#c8a868', 'poly'), { len: 0.16, d: 0.06, w: 0.028, curve: 0.05, rake: 0.01, ribs: 2 })
  skeletonStock(-0.12, 0.05, g, C.black(), { len: 0.28, drop: 0.09 })
}

// ================= Snipers =================
function bolt(g, d, o) {
  const body = gunMat(o.color, 'poly')
  const L = o.len
  // stock + chassis with a thumbhole
  g.add(profile([[-0.46, 0.04], [-0.46, -0.1], [-0.42, -0.1], [-0.2, -0.04], [-0.06, -0.02], [0.02, -0.02], [0.3, 0.0], [0.34, 0.03], [0.34, 0.06], [-0.06, 0.06], [-0.2, 0.07], [-0.42, 0.07]], 0.052, body, { paint: true, hole: o.thumb ? [[-0.16, 0.035], [-0.04, 0.03], [-0.06, -0.008], [-0.16, -0.02]] : null }))
  g.add(blk(-0.47, -0.458, -0.1, 0.07, 0.054, C.rubber()))
  g.add(profile([[-0.36, 0.07], [-0.2, 0.07], [-0.22, 0.09], [-0.34, 0.09]], 0.03, body, { paint: true })) // cheek rest
  g.add(tube(0.022, -0.06, 0.2, 0.05, C.gun(), { seg: 14 })) // action
  // the bolt handle
  const bh = tube(0.004, 0, 0.05, 0, C.steel(), { seg: 6 })
  bh.rotation.y = Math.PI / 2
  bh.rotation.z = -0.5
  bh.position.set(0.035, 0.04, 0.03)
  g.add(bh)
  const knob = new THREE.Mesh(cached('knob', () => new THREE.SphereGeometry(0.009, 8, 6)), C.black())
  knob.position.set(0.06, 0.025, 0.03)
  g.add(knob)
  g.add(tube(o.barrel, 0.2, L, 0.045, C.black(), { r1: o.barrel * 0.8 }))
  if (o.flutes && d > 1) for (let k = 0; k < 4; k++) g.add(blk(0.36, L - 0.12, 0.045 + Math.sin(k * 1.57) * o.barrel * 0.9 - 0.0015, 0.045 + Math.sin(k * 1.57) * o.barrel * 0.9 + 0.0015, 0.003, C.gun(), { x: Math.cos(k * 1.57) * o.barrel * 0.9 }))
  muzzle('brake', L, 0.045, g, o.barrel * 0.85)
  triggerGuard(0.0, 0.07, -0.02, g, C.black())
  magazine(0.1, -0.02, g, C.black(), { len: 0.06, d: 0.06, w: 0.03 })
  scope(-0.12, 0.22, 0.115, g, { r: 0.017, bell: o.bell ?? 0.03 })
  if (o.bipod) for (const s of [-1, 1]) g.add(blk(0.24, 0.4, -0.012, -0.002, 0.008, C.black(), { x: s * 0.026 }))
}
function autoSniper(g, d, o) {
  const body = gunMat(o.color, 'poly')
  g.add(profile([[-0.14, -0.01], [0.3, -0.01], [0.3, 0.065], [-0.14, 0.065]], 0.054, o.scar ? body : C.black(), { paint: true }))
  rail(-0.12, 0.3, 0.065, g, 0.022, d)
  g.add(profile([[0.3, -0.005], [0.58, 0.0], [0.58, 0.06], [0.3, 0.065]], 0.056, body, { paint: true }))
  for (let k = 0; k < 6; k++) g.add(blk(0.33 + k * 0.04, 0.345 + k * 0.04, 0.008, 0.05, 0.058, C.black()))
  g.add(tube(0.013, 0.58, 0.86, 0.035, C.black()))
  muzzle(o.scar ? 'brake' : 'cage', 0.86, 0.035, g, 0.013)
  scope(-0.06, 0.26, 0.115, g, { r: 0.018, bell: 0.028 })
  triggerGuard(0.0, 0.075, -0.01, g)
  pistolGrip(0.0, -0.01, g, C.poly())
  magazine(0.2, -0.01, g, C.black(), { len: 0.1, d: 0.065, w: 0.03, rake: 0.008, ribs: 1 })
  g.add(profile([[-0.14, 0.06], [-0.44, 0.06], [-0.46, 0.04], [-0.46, -0.1], [-0.42, -0.1], [-0.28, -0.04], [-0.14, -0.01]], 0.05, body, { paint: true, hole: [[-0.38, 0.03], [-0.2, 0.03], [-0.22, 0.0], [-0.36, -0.03]] }))
  g.add(blk(-0.47, -0.458, -0.1, 0.062, 0.052, C.rubber()))
}

// ================= SMGs =================
function smg(g, d, o) {
  const body = gunMat(o.color ?? '#2a2b2d', o.metal ? 'metal' : 'poly')
  const L = o.len ?? 0.24
  g.add(profile(o.shape ?? [[-0.08, -0.01], [L, -0.01], [L, 0.06], [-0.08, 0.06]], o.w ?? 0.05, body, { paint: true }))
  if (o.rail) rail(-0.06, L - 0.02, 0.06, g, 0.02, d)
  if (o.supp) suppressor(L - 0.02, L + 0.2, 0.03, g, 0.024)
  else {
    g.add(tube(0.01, L, L + (o.barrel ?? 0.06), 0.03, C.black()))
    if (o.muzzle) muzzle(o.muzzle, L + (o.barrel ?? 0.06), 0.03, g, 0.011)
  }
  triggerGuard(0.0, 0.07, -0.01, g)
  if (o.magInGrip) {
    pistolGrip(0.0, -0.01, g, body, { len: 0.11, thick: 0.045, rake: 0.01, paint: true })
    g.add(blk(-0.038, -0.002, -0.13, -0.1, 0.03, C.black()))
  } else {
    pistolGrip(0.0, -0.01, g, C.poly())
    magazine(o.magU ?? 0.13, -0.01, g, C.black(), { len: o.magLen ?? 0.15, d: 0.04, w: 0.024, curve: o.magCurve ?? 0, rake: 0.004, ribs: 1 })
  }
  if (o.vgrip) g.add(profile([[L - 0.07, -0.01], [L - 0.04, -0.01], [L - 0.045, -0.09], [L - 0.07, -0.09]], 0.026, C.poly()))
  if (o.stock === 'wire') wireStock(-0.08, -0.26, 0.04, g)
  else if (o.stock === 'skeleton') skeletonStock(-0.08, 0.055, g, C.black(), { len: 0.24, drop: 0.07 })
  else if (o.stock === 'fold') g.add(profile([[-0.08, 0.05], [-0.08, -0.02], [-0.11, -0.02], [-0.11, 0.05]], 0.05, C.poly()))
  else if (o.stock === 'm4') m4Stock(-0.08, 0.03, g, C.poly(), false)
  if (o.dot) redDot(0.05, 0.06, g)
  else g.add(blk(-0.06, -0.04, 0.06, 0.075, 0.02, C.black()))
}
function p90(g, d) {
  const body = gunMat('#2e3134', 'poly')
  g.add(profile([[-0.34, -0.08], [-0.3, -0.12], [-0.12, -0.12], [-0.08, -0.05], [0.02, -0.05], [0.04, -0.12], [0.1, -0.12], [0.14, -0.03], [0.2, 0.0], [0.22, 0.05], [-0.34, 0.06]], 0.06, body, { paint: true, hole: [[-0.06, -0.015], [0.08, -0.015], [0.1, -0.08], [0.07, -0.1], [-0.04, -0.1], [-0.06, -0.06]] }))
  g.add(profile([[-0.24, 0.06], [0.16, 0.06], [0.14, 0.085], [-0.22, 0.085]], 0.05, gunMat('#4b5054', 'poly'))) // top mag
  g.add(blk(-0.2, 0.12, 0.068, 0.082, 0.054, gunMat('#a8b2a8', 'glass')))
  redDot(0.1, 0.085, g)
  g.add(tube(0.01, 0.22, 0.28, 0.03, C.black()))
}
function bizon(g, d) {
  smg(g, d, { len: 0.22, barrel: 0.1, stock: 'fold', color: '#2a2b2d', magInGrip: false, magLen: 0.0001 })
  g.add(tube(0.028, 0.04, 0.32, -0.03, C.black(), { seg: 14 })) // the helical magazine
  for (let k = 0; k < 6; k++) g.add(tube(0.03, 0.06 + k * 0.045, 0.07 + k * 0.045, -0.03, C.gun(), { seg: 14 }))
  frontPost(0.3, 0.06, g, 0.02, false)
}

// ================= Shotguns and machine guns =================
function shotgun(g, d, o) {
  const body = gunMat(o.color ?? '#2a2b2d', 'poly')
  const L = o.len ?? 0.7
  g.add(profile([[-0.1, -0.01], [0.2, -0.01], [0.2, 0.055], [-0.1, 0.06]], 0.052, C.black(), { paint: true }))
  g.add(tube(0.013, 0.2, L, 0.045, C.black()))
  g.add(tube(0.012, 0.2, L - 0.06, 0.015, C.gun()))
  if (o.pump) g.add(profile([[o.pump, -0.005], [o.pump + 0.14, 0.0], [o.pump + 0.14, 0.035], [o.pump, 0.035]], 0.05, o.wood ? C.wood() : body, { paint: true }))
  if (o.pump && d > 1) for (let k = 0; k < 5; k++) g.add(blk(o.pump + 0.02 + k * 0.024, o.pump + 0.03 + k * 0.024, -0.007, 0.037, 0.052, C.rubber()))
  frontPost(L - 0.02, 0.058, g, 0.01, false)
  triggerGuard(0.0, 0.075, -0.01, g)
  if (o.stock === 'wood') {
    g.add(profile([[-0.1, 0.055], [-0.1, -0.01], [-0.06, -0.1], [-0.1, -0.112], [-0.15, -0.04], [-0.13, 0.05]], 0.044, C.wood(), { paint: true }))
  } else if (o.stock === 'magpistol') {
    pistolGrip(0.0, -0.01, g, body, { len: 0.12, thick: 0.05, rake: 0.01, paint: true })
    g.add(profile([[-0.1, 0.05], [-0.1, -0.01], [-0.2, 0.03], [-0.2, 0.05]], 0.04, body))
  } else {
    pistolGrip(0.0, -0.01, g, body, { paint: true })
    g.add(profile([[-0.1, 0.05], [-0.42, 0.02], [-0.44, 0.01], [-0.44, -0.12], [-0.4, -0.12], [-0.24, -0.05], [-0.1, -0.02]], 0.046, body, { paint: true, hole: o.hole ? [[-0.36, 0.0], [-0.18, 0.012], [-0.2, -0.02], [-0.34, -0.06]] : null }))
    g.add(blk(-0.452, -0.44, -0.12, 0.022, 0.048, C.rubber()))
  }
  if (o.rail) rail(-0.08, 0.18, 0.055, g, 0.02, d)
}
function mg(g, d, o) {
  const body = o.negev ? gunMat('#33302a', 'metal') : C.black()
  g.add(profile([[-0.14, -0.02], [0.24, -0.02], [0.24, 0.07], [-0.14, 0.07]], 0.07, body, { paint: true }))
  g.add(profile([[-0.12, 0.07], [0.2, 0.07], [0.18, 0.09], [-0.1, 0.09]], 0.064, body, { paint: true })) // top cover
  rail(-0.08, 0.18, 0.09, g, 0.022, d)
  g.add(tube(0.016, 0.24, o.negev ? 0.72 : 0.78, 0.04, C.black()))
  g.add(tube(0.024, 0.24, 0.44, 0.04, gunMat('#2e2f31', 'poly'), { seg: 14 })) // heat shield / handguard
  if (d > 1) for (let k = 0; k < 6; k++) g.add(tube(0.025, 0.26 + k * 0.03, 0.27 + k * 0.03, 0.04, C.black(), { seg: 14 }))
  muzzle('cage', o.negev ? 0.72 : 0.78, 0.04, g, 0.016)
  frontPost(0.68, 0.055, g, 0.03)
  // carry handle
  g.add(profile([[0.2, 0.07], [0.3, 0.07], [0.3, 0.12], [0.28, 0.13], [0.22, 0.13], [0.2, 0.12]], 0.014, C.black(), { hole: [[0.215, 0.074], [0.285, 0.074], [0.285, 0.114], [0.215, 0.114]] }))
  // box magazine on the side/below
  g.add(profile([[0.04, -0.02], [0.2, -0.02], [0.21, -0.16], [0.03, -0.16]], 0.09, gunMat(o.negev ? '#4b4a3a' : '#465039', 'poly'), { x: -0.02 }))
  triggerGuard(0.0, 0.08, -0.02, g)
  pistolGrip(0.0, -0.02, g, C.poly())
  // bipod folded
  for (const s of [-1, 1]) g.add(blk(0.42, 0.66, 0.016, 0.026, 0.008, C.black(), { x: s * 0.022 }))
  g.add(profile([[-0.14, 0.06], [-0.44, 0.04], [-0.46, 0.02], [-0.46, -0.1], [-0.42, -0.1], [-0.24, -0.05], [-0.14, -0.02]], 0.05, body, { paint: true }))
}

// ================= Pistols =================
function pistol(g, d, o) {
  const slide = o.slideColor ? gunMat(o.slideColor, 'metal') : C.black()
  const frame = o.frameColor ? gunMat(o.frameColor, o.metalFrame ? 'metal' : 'poly') : C.poly()
  const L = o.len ?? 0.17
  const H = o.h ?? 0.035
  // the slide, with serrations at the back
  g.add(profile([[-0.05, 0.012], [L - 0.05, 0.012], [L - 0.05, 0.012 + H - 0.006], [L - 0.056, 0.012 + H], [-0.046, 0.012 + H], [-0.05, 0.012 + H - 0.006]], o.w ?? 0.028, slide, { paint: true }))
  if (d > 1) for (let k = 0; k < 6; k++) g.add(blk(-0.044 + k * 0.006, -0.042 + k * 0.006, 0.016, 0.012 + H - 0.004, (o.w ?? 0.028) + 0.002, C.black()))
  g.add(blk(0.0, 0.04, 0.02, 0.012 + H - 0.008, 0.004, C.black(), { x: (o.w ?? 0.028) / 2 })) // ejection port
  // frame + dust cover + rail
  g.add(profile([[-0.045, 0.012], [L - 0.06, 0.012], [L - 0.06, -0.002], [0.06, -0.006], [-0.03, -0.006]], (o.w ?? 0.028) - 0.003, frame, { paint: o.paintFrame }))
  triggerGuard(-0.01, 0.055, 0.0, g, frame, 0.032)
  pistolGrip(-0.01, 0.0, g, frame, { len: o.gripLen ?? 0.1, thick: 0.038, rake: 0.025, w: (o.w ?? 0.028) + 0.002, paint: o.paintFrame })
  // sights
  g.add(blk(L - 0.068, L - 0.062, 0.012 + H, 0.012 + H + 0.007, 0.004, C.black()))
  g.add(blk(-0.044, -0.034, 0.012 + H, 0.012 + H + 0.007, 0.018, C.black()))
  // the hammer
  if (o.hammer) g.add(profile([[-0.05, 0.02], [-0.06, 0.04], [-0.066, 0.042], [-0.058, 0.018]], 0.008, C.steel()))
  g.add(tube(0.006, L - 0.05, L - 0.046, 0.012 + H * 0.45, C.black())) // muzzle
  if (o.supp) suppressor(L - 0.05, L + 0.1, 0.012 + H * 0.45, g, 0.016)
}
function deagle(g, d) {
  const steel = C.steel()
  g.add(profile([[-0.06, 0.014], [0.2, 0.014], [0.2, 0.05], [0.19, 0.058], [-0.05, 0.058], [-0.06, 0.048]], 0.034, steel, { paint: true }))
  g.add(profile([[0.04, 0.058], [0.2, 0.058], [0.2, 0.066], [0.04, 0.066]], 0.014, steel, { paint: true })) // the triangular barrel's top rib
  g.add(blk(0.18, 0.192, 0.066, 0.076, 0.004, C.black()))
  g.add(profile([[-0.06, 0.014], [0.16, 0.014], [0.16, -0.004], [0.06, -0.008], [-0.04, -0.008]], 0.032, steel, { paint: true }))
  triggerGuard(-0.01, 0.06, 0.0, g, steel, 0.034)
  pistolGrip(-0.01, 0.0, g, C.rubber(), { len: 0.11, thick: 0.042, rake: 0.028, w: 0.036 })
  g.add(profile([[-0.06, 0.03], [-0.072, 0.05], [-0.078, 0.05], [-0.068, 0.026]], 0.01, C.black()))
  g.add(tube(0.008, 0.2, 0.204, 0.036, C.black()))
}
function revolver(g, d) {
  const steel = gunMat('#5c6066', 'metal')
  g.add(profile([[-0.05, 0.0], [0.04, 0.0], [0.05, 0.05], [-0.04, 0.06], [-0.06, 0.04]], 0.034, steel, { paint: true }))
  g.add(tube(0.024, 0.0, 0.05, 0.03, gunMat('#7a7f86', 'metal'), { seg: 6 })) // cylinder
  if (d > 1) for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    g.add(tube(0.005, 0.049, 0.052, 0.03 + Math.sin(a) * 0.014, C.black(), { x: Math.cos(a) * 0.014, seg: 6 }))
  }
  g.add(tube(0.011, 0.05, 0.2, 0.04, steel, { paint: true }))
  g.add(blk(0.05, 0.2, 0.046, 0.056, 0.014, steel, { paint: true }))
  g.add(blk(0.05, 0.16, 0.018, 0.028, 0.012, C.black())) // ejector rod
  g.add(blk(0.188, 0.196, 0.056, 0.066, 0.004, C.black()))
  triggerGuard(-0.02, 0.04, 0.0, g, steel, 0.03)
  pistolGrip(-0.02, 0.0, g, C.darkwood(), { len: 0.1, thick: 0.04, rake: 0.03, w: 0.034 })
  g.add(profile([[-0.05, 0.04], [-0.07, 0.06], [-0.076, 0.058], [-0.06, 0.034]], 0.008, C.black()))
}
function tec9(g, d) {
  const body = gunMat('#26282a', 'metal')
  g.add(profile([[-0.08, 0.0], [0.12, 0.0], [0.12, 0.05], [-0.08, 0.05]], 0.04, body, { paint: true }))
  g.add(tube(0.016, 0.12, 0.22, 0.03, C.black(), { seg: 10 })) // vented barrel shroud
  if (d > 1) for (let k = 0; k < 4; k++) g.add(blk(0.13 + k * 0.022, 0.14 + k * 0.022, 0.04, 0.047, 0.014, C.poly()))
  triggerGuard(-0.02, 0.06, 0.0, g, body, 0.03)
  pistolGrip(-0.02, 0.0, g, C.poly(), { len: 0.09 })
  magazine(0.1, 0.0, g, C.black(), { len: 0.13, d: 0.034, w: 0.022, rake: 0.0 }) // mag ahead of the trigger
  g.add(blk(-0.06, 0.06, 0.05, 0.058, 0.01, C.black()))
}
function dualies(g, d) {
  const one = new THREE.Group()
  pistol(one, d, { slideColor: '#9aa0a6', frameColor: '#1f1f21', len: 0.18, hammer: true })
  one.position.x = 0.0
  const two = one.clone()
  two.position.set(-0.22, 0.0, 0.02)
  two.userData.offhand = true
  g.add(one, two)
}
function zeus(g) {
  const y = gunMat('#d8b026', 'poly')
  g.add(profile([[-0.05, 0.0], [0.12, 0.0], [0.14, 0.02], [0.14, 0.05], [-0.04, 0.05], [-0.05, 0.04]], 0.04, C.poly(), { paint: true }))
  g.add(profile([[0.12, 0.0], [0.15, 0.01], [0.15, 0.055], [0.12, 0.05]], 0.042, y))
  for (const s of [-1, 1]) g.add(blk(0.15, 0.156, 0.022, 0.03, 0.006, C.steel(), { x: s * 0.012 }))
  pistolGrip(-0.01, 0.0, g, C.poly(), { len: 0.09 })
  triggerGuard(-0.01, 0.05, 0.0, g, C.poly(), 0.028)
  g.add(blk(-0.03, 0.08, 0.05, 0.054, 0.024, y))
}

// ================= Knife, grenades, the bomb =================
function knife(g) {
  g.add(profile([[-0.12, -0.012], [0.0, -0.014], [0.0, 0.016], [-0.12, 0.012], [-0.125, 0.0]], 0.024, C.rubber(), { bevel: 0.005 }))
  g.add(profile([[0.0, -0.022], [0.014, -0.022], [0.014, 0.024], [0.0, 0.024]], 0.03, C.steel()))
  g.add(profile([[0.014, -0.012], [0.16, -0.008], [0.2, 0.004], [0.17, 0.016], [0.014, 0.018]], 0.006, gunMat('#c9ced3', 'metal'), { paint: true, bevel: 0.0015 }))
  g.add(profile([[0.03, 0.014], [0.12, 0.014], [0.12, 0.018], [0.03, 0.018]], 0.0072, C.black()))
}
function grenade(g, nade) {
  const lathe = (pts, mat) => {
    const geo = cached('l' + JSON.stringify(pts), () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 14))
    return new THREE.Mesh(geo, mat)
  }
  const spoon = () => {
    g.add(profile([[-0.006, 0.06], [0.008, 0.06], [0.03, 0.0], [0.024, -0.02], [0.022, 0.0]], 0.012, C.steel()))
    const ring = new THREE.Mesh(cached('ring', () => new THREE.TorusGeometry(0.012, 0.002, 6, 14)), C.steel())
    ring.position.set(0.02, 0.066, 0)
    g.add(ring)
  }
  if (nade === 'he') {
    g.add(lathe([[0, -0.05], [0.03, -0.045], [0.044, -0.02], [0.046, 0.01], [0.036, 0.04], [0.016, 0.05], [0, 0.05]], gunMat('#4b5a33', 'poly')))
    const fuse = tube(0.012, 0, 0.018, 0, C.steel())
    fuse.rotation.x = Math.PI / 2
    fuse.position.set(0, 0.058, 0)
    g.add(fuse)
    spoon()
  } else if (nade === 'flash') {
    g.add(lathe([[0, -0.06], [0.03, -0.06], [0.03, 0.05], [0.016, 0.06], [0, 0.06]], gunMat('#8a8f94', 'metal')))
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      const h = blk(-0.004, 0.004, -0.03, 0.03, 0.006, C.black())
      h.position.set(Math.cos(a) * 0.029, 0, Math.sin(a) * 0.029)
      h.rotation.y = -a
      g.add(h)
    }
    spoon()
  } else if (nade === 'smoke' || nade === 'incendiary' || nade === 'decoy') {
    const col = nade === 'smoke' ? '#6f7378' : nade === 'decoy' ? '#4e5a3c' : '#77797c'
    const band = nade === 'smoke' ? '#c9c9c9' : nade === 'decoy' ? '#d8b026' : '#b23a2a'
    g.add(lathe([[0, -0.065], [0.032, -0.065], [0.032, 0.05], [0.018, 0.062], [0, 0.062]], gunMat(col, 'metal')))
    g.add(lathe([[0.0325, -0.02], [0.0325, 0.0]], gunMat(band, 'poly')))
    spoon()
  } else if (nade === 'molotov') {
    g.add(lathe([[0, -0.07], [0.03, -0.07], [0.032, 0.0], [0.014, 0.04], [0.011, 0.08], [0, 0.08]], gunMat('#5b6b3a', 'glass')))
    const rag = blk(-0.01, 0.01, 0.07, 0.12, 0.018, gunMat('#c9b78f', 'poly'))
    rag.rotation.z = 0.3
    g.add(rag)
  }
}
function c4(g) {
  for (let k = 0; k < 3; k++) g.add(blk(-0.1, 0.1, -0.045, 0.045, 0.045, gunMat('#c7b48a', 'poly'), { x: -0.05 + k * 0.05 }))
  g.add(blk(-0.05, 0.05, 0.045, 0.06, 0.1, C.black()))
  g.add(blk(-0.04, 0.0, 0.06, 0.064, 0.06, gunMat('#4caf50', 'glass')))
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) g.add(blk(0.008 + i * 0.012, 0.016 + i * 0.012, 0.06, 0.066, 0.008, C.steel(), { x: -0.02 + j * 0.014 }))
  g.add(tube(0.003, -0.1, 0.1, 0.05, gunMat('#c0392b', 'poly'), { x: 0.06, seg: 6 }))
  g.add(tube(0.003, -0.1, 0.1, 0.05, gunMat('#2e6fd8', 'poly'), { x: -0.06, seg: 6 }))
}

// ================= The catalogue =================
const BUILD = {
  ak47: (g, d) => ak(g, d, {}),
  galil: (g, d) => ak(g, d, { galil: true, short: true }),
  m4a4: (g, d) => m4(g, d, {}),
  m4a1s: (g, d, s) => m4(g, d, { silenced: true, supp: s.silenced !== false, short: true }),
  famas,
  aug: (g, d) => aug(g, d, {}),
  sg553,
  awp: (g, d) => bolt(g, d, { color: '#3f4f35', len: 0.86, barrel: 0.016, thumb: true, bipod: true, bell: 0.034 }),
  ssg08: (g, d) => bolt(g, d, { color: '#2f3a44', len: 0.78, barrel: 0.012, flutes: true }),
  g3sg1: (g, d) => autoSniper(g, d, { color: '#2a2b2d' }),
  scar20: (g, d) => autoSniper(g, d, { color: '#9c8664', scar: true }),
  mac10: (g, d) => smg(g, d, { len: 0.16, barrel: 0.03, color: '#3a3c40', metal: true, magInGrip: true, stock: 'wire', w: 0.054, shape: [[-0.09, -0.01], [0.16, -0.01], [0.16, 0.07], [-0.09, 0.07]] }),
  mp9: (g, d) => smg(g, d, { len: 0.2, barrel: 0.04, magInGrip: true, stock: 'wire', vgrip: true, rail: true, shape: [[-0.08, -0.01], [0.2, -0.01], [0.2, 0.055], [-0.08, 0.06]] }),
  mp7: (g, d) => smg(g, d, { len: 0.2, barrel: 0.05, magInGrip: true, stock: 'fold', vgrip: true, rail: true, dot: true }),
  mp5: (g, d) => smg(g, d, { len: 0.26, supp: true, color: '#26282b', metal: true, stock: 'm4', magU: 0.16, magCurve: 0.04, magLen: 0.15 }),
  ump45: (g, d) => smg(g, d, { len: 0.3, barrel: 0.05, stock: 'skeleton', rail: true, magU: 0.17, magLen: 0.16, muzzle: 'cage', shape: [[-0.08, -0.015], [0.3, -0.015], [0.3, 0.065], [-0.08, 0.065]] }),
  p90,
  bizon,
  nova: (g, d) => shotgun(g, d, { len: 0.72, pump: 0.28, hole: true }),
  xm1014: (g, d) => shotgun(g, d, { len: 0.68, rail: true, color: '#2a2b2d' }),
  sawedoff: (g, d) => shotgun(g, d, { len: 0.42, pump: 0.22, wood: true, stock: 'wood', color: '#5b3b20' }),
  mag7: (g, d) => shotgun(g, d, { len: 0.42, pump: 0.2, stock: 'magpistol', color: '#2e3134' }),
  m249: (g, d) => mg(g, d, {}),
  negev: (g, d) => mg(g, d, { negev: true }),
  glock: (g, d) => pistol(g, d, { len: 0.17, frameColor: '#2a2b2d', slideColor: '#2e3033' }),
  usp: (g, d, s) => pistol(g, d, { len: 0.18, slideColor: '#2b2d30', frameColor: '#26272a', hammer: true, supp: s.silenced !== false }),
  p2000: (g, d) => pistol(g, d, { len: 0.17, slideColor: '#303236', frameColor: '#26272a', hammer: true }),
  p250: (g, d) => pistol(g, d, { len: 0.17, slideColor: '#3a3d42', frameColor: '#26272a' }),
  fiveseven: (g, d) => pistol(g, d, { len: 0.19, slideColor: '#2c2e31', frameColor: '#3a3b33', h: 0.032, gripLen: 0.11 }),
  cz75: (g, d) => pistol(g, d, { len: 0.18, slideColor: '#3b3e43', frameColor: '#3b3e43', metalFrame: true, hammer: true, paintFrame: true }),
  dualies,
  deagle,
  r8: revolver,
  tec9,
  zeus,
  knife,
  he: (g) => grenade(g, 'he'),
  flash: (g) => grenade(g, 'flash'),
  smoke: (g) => grenade(g, 'smoke'),
  molotov: (g) => grenade(g, 'molotov'),
  incendiary: (g) => grenade(g, 'incendiary'),
  decoy: (g) => grenade(g, 'decoy'),
  bomb: c4,
}
// Where each gun's muzzle is (for the flash), in metres forward of the trigger.
export function muzzleOf(g) {
  const b = new THREE.Box3().setFromObject(g)
  return -b.min.z
}
/** How high the line of sight is above the bore (to aim down the sights): a red dot's window, or the top of the sights. */
export function sightOf(g) {
  if (g.userData.dot != null) return g.userData.dot
  g.updateMatrixWorld(true)
  const box = new THREE.Box3()
  let top = -Infinity
  g.traverse((m) => {
    if (!m.isMesh || m.userData.offhand) return
    box.setFromObject(m)
    if (Math.abs(box.min.x + box.max.x) / 2 < 0.03) top = Math.max(top, box.max.y)
  })
  return Number.isFinite(top) ? top : 0.05
}

/** Up to four stickers along the right side of the receiver. */
const stickerGeo = new THREE.PlaneGeometry(1, 1)
function applyStickers(g, mats) {
  const box = new THREE.Box3()
  g.updateMatrixWorld(true)
  g.traverse((m) => m.isMesh && m.userData.paint && box.expandByObject(m))
  if (box.isEmpty()) return
  const len = box.max.z - box.min.z
  const h = box.max.y - box.min.y
  const size = Math.min(0.05, h * 0.7, len / 5)
  // On both sides: the icons show the right side, the first-person view the left
  mats.slice(0, 4).forEach((m, k) => {
    if (!m) return
    for (const side of [1, -1]) {
      const p = new THREE.Mesh(stickerGeo, m)
      p.scale.set(size, size, 1)
      p.position.set(side > 0 ? box.max.x + 0.0015 : box.min.x - 0.0015, box.min.y + h * 0.55, box.max.z - len * (0.22 + k * 0.17))
      p.rotation.y = (side * Math.PI) / 2
      g.add(p)
    }
  })
}

/**
 * A gun model. opts: { detail: 1 (world) | 2 (first person), silenced, skin: Material }.
 * Old models are scaled to roughly the size the rest of the game expects.
 */
export function buildGun(id, opts = {}) {
  const g = new THREE.Group()
  const make = BUILD[id]
  if (!make) return g
  make(g, opts.detail ?? 1, { silenced: opts.silenced })
  if (opts.skin) g.traverse((m) => m.isMesh && m.userData.paint && (m.material = opts.skin))
  g.userData.muzzle = muzzleOf(g)
  g.userData.sight = sightOf(g)
  if (opts.stickers?.length) applyStickers(g, opts.stickers)
  return g
}
export const HAS_MODEL = (id) => !!BUILD[id]
