// Character models: the soldiers (several outfits per side) and the arms you see in first person.
// Built from rounded parts (capsules, spheres, extruded profiles), then merged per material inside
// each moving part so a soldier is a couple of dozen draw calls, not hundreds.

import * as THREE from './lib/three.min.js'

// ---------------- materials and fabric textures
const mats = new Map()
function fabricTex(base, accent, kind) {
  const S = 64
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  g.fillStyle = base
  g.fillRect(0, 0, S, S)
  let s = 7
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  if (kind === 'camo') {
    for (const col of accent)
      for (let i = 0; i < 7; i++) {
        g.fillStyle = col
        g.beginPath()
        g.ellipse(r() * S, r() * S, 4 + r() * 9, 3 + r() * 6, r() * 3, 0, 7)
        g.fill()
      }
  } else if (kind === 'digital') {
    for (const col of accent)
      for (let i = 0; i < 40; i++) {
        g.fillStyle = col
        g.fillRect(Math.floor(r() * 16) * 4, Math.floor(r() * 16) * 4, 4 + Math.floor(r() * 2) * 4, 4)
      }
  } else if (kind === 'knit') {
    g.strokeStyle = accent[0]
    for (let y = 0; y < S; y += 3) {
      g.beginPath()
      for (let x = 0; x <= S; x += 3) g.lineTo(x, y + ((x / 3) % 2))
      g.stroke()
    }
  }
  // weave
  g.globalAlpha = 0.12
  g.fillStyle = '#000'
  for (let y = 0; y < S; y += 2) g.fillRect(0, y, S, 1)
  g.globalAlpha = 1
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(3, 3)
  return t
}
function mat(key, make) {
  if (!mats.has(key)) mats.set(key, make())
  return mats.get(key)
}
const lam = (c) => mat('l' + c, () => new THREE.MeshLambertMaterial({ color: c }))
const shiny = (c, sh = 40) => mat('p' + c + sh, () => new THREE.MeshPhongMaterial({ color: c, shininess: sh, specular: '#444' }))
const cloth = (base, accent, kind) => mat(`c${base}${accent}${kind}`, () => new THREE.MeshLambertMaterial({ map: fabricTex(base, accent, kind) }))

// ---------------- geometry helpers
const geos = new Map()
const geo = (key, make) => {
  if (!geos.has(key)) geos.set(key, make())
  return geos.get(key)
}
const capsule = (r, len, seg = 8) => geo(`cap${r}|${len}|${seg}`, () => new THREE.CapsuleGeometry(r, len, 3, seg))
const sphere = (r, w = 12, h = 9) => geo(`sph${r}|${w}`, () => new THREE.SphereGeometry(r, w, h))
const boxG = (w, h, d) => geo(`box${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d))
const cyl = (r0, r1, h, seg = 10) => geo(`cyl${r0}|${r1}|${h}|${seg}`, () => new THREE.CylinderGeometry(r0, r1, h, seg))

function mesh(g, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const o = new THREE.Mesh(g, m)
  o.position.set(x, y, z)
  o.rotation.set(rx, ry, rz)
  o.scale.set(sx, sy, sz)
  return o
}
/** A capsule (a limb) from point a to point b. */
function limb(a, b, r, m) {
  const A = new THREE.Vector3(...a)
  const B = new THREE.Vector3(...b)
  const len = A.distanceTo(B)
  const o = new THREE.Mesh(capsule(r, Math.max(0.001, len - r * 0.6)), m)
  o.position.copy(A).add(B).multiplyScalar(0.5)
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize())
  return o
}
/** A boot: an extruded side profile with a sole. */
function boot(m, sole) {
  const g = new THREE.Group()
  const s = new THREE.Shape()
  const pts = [[-0.06, 0], [0.16, 0], [0.17, 0.035], [0.12, 0.07], [0.05, 0.09], [0.04, 0.17], [-0.06, 0.17], [-0.07, 0.08]]
  s.moveTo(...pts[0])
  for (const p of pts.slice(1)) s.lineTo(...p)
  const eg = geo('boot', () => {
    const e = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 })
    e.translate(0, 0, -0.05)
    e.rotateY(-Math.PI / 2)
    return e
  })
  g.add(mesh(eg, m, 0, 0.012, 0))
  g.add(mesh(boxG(0.13, 0.025, 0.26), sole, 0, 0.0, -0.05))
  return g
}

// ---------------- merging (per material, inside one moving part)
function mergeGroup(group) {
  group.updateMatrixWorld(true)
  const inv = group.matrixWorld.clone().invert()
  const byMat = new Map()
  const collect = (o) => {
    const rel = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)
    const list = byMat.get(o.material) ?? []
    list.push({ geometry: o.geometry, matrix: rel })
    byMat.set(o.material, list)
  }
  for (const ch of [...group.children]) {
    if (ch.isMesh && !ch.userData.keep) {
      collect(ch)
      group.remove(ch)
    } else if (ch.userData.flatten) {
      // a static sub-assembly: bake it into this part
      ch.traverse((m) => m.isMesh && collect(m))
      group.remove(ch)
    }
  }
  for (const [m, list] of byMat) {
    const parts = list.map(({ geometry, matrix }) => {
      const g = geometry.index ? geometry.toNonIndexed() : geometry.clone()
      g.applyMatrix4(matrix)
      return g
    })
    group.add(new THREE.Mesh(concat(parts), m))
  }
  return group
}
function concat(geos) {
  let n = 0
  for (const g of geos) n += g.attributes.position.count
  const pos = new Float32Array(n * 3)
  const nor = new Float32Array(n * 3)
  const uv = new Float32Array(n * 2)
  let o = 0
  for (const g of geos) {
    const c = g.attributes.position.count
    pos.set(g.attributes.position.array, o * 3)
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3)
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2)
    o += c
    g.dispose()
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  out.computeBoundingSphere()
  return out
}

// ---------------- the outfits
const OUTFITS = {
  T: [
    { name: 'balaclava', jacket: ['#8a7350', ['#6e5a3c', '#a28b62'], 'camo'], pants: ['#5a4c38', ['#46392a'], 'camo'], vest: '#4a3f2e', head: 'balaclava', pack: false },
    { name: 'shemagh', jacket: ['#6f6a55', ['#5a5644', '#85806a'], 'camo'], pants: ['#3f3a30', ['#2e2a22'], 'camo'], vest: '#3b3a2c', head: 'shemagh', pack: true },
    { name: 'leader', jacket: ['#2f2f2f', ['#3c3c3c'], 'knit'], pants: ['#3a3f4a', ['#2c3038'], 'camo'], vest: '#2a2a26', head: 'beanie', pack: false },
  ],
  CT: [
    { name: 'swat', jacket: ['#2e4060', ['#25344e', '#3a4e70'], 'digital'], pants: ['#2a3242', ['#222a38'], 'digital'], vest: '#1f2b3d', head: 'helmet', pack: false },
    { name: 'gign', jacket: ['#3b4250', ['#30363f', '#4a5160'], 'digital'], pants: ['#2c2f36', ['#24272c'], 'digital'], vest: '#262a30', head: 'gasmask', pack: true },
    { name: 'seal', jacket: ['#4d5a3f', ['#3e4933', '#5f6c4c'], 'camo'], pants: ['#3d4632', ['#323a29'], 'camo'], vest: '#3a4230', head: 'cap', pack: false },
  ],
}
const SKINS = ['#c08a62', '#8d5a3b', '#e0b18f', '#a8754f']

/**
 * A soldier, standing at the origin facing -z. Returns the parts the view animates:
 * { root, hips, torso, neck, legs: [{ thigh, shin }], arms, hand, blob }.
 * look: an agent's outfit (skins.js AGENTS) instead of one of the side's standard ones.
 */
export function buildSoldier(team, seed = 0, look = null) {
  const T = team === 'T'
  const outfit = look ?? OUTFITS[T ? 'T' : 'CT'][seed % 3]
  const skin = lam(outfit.skin ?? SKINS[(seed >> 2) % SKINS.length])
  const jacket = cloth(...outfit.jacket)
  const pants = cloth(...outfit.pants)
  const vest = lam(outfit.vest)
  const strap = lam('#1c1c1a')
  const metal = shiny('#4a4d52', 60)
  const glove = lam('#1b1b1b')
  const leather = lam('#2a2219')
  const sole = lam('#111')
  const patch = lam(T ? '#c9862a' : '#3b7bd6')
  const root = new THREE.Group()
  const hips = new THREE.Group()
  hips.position.y = 0.92
  root.add(hips)

  // ---- hips: belt, pouches, holster
  hips.add(mesh(capsule(0.15, 0.12), pants, 0, -0.02, 0, 0, 0, Math.PI / 2, 1, 1, 0.75))
  hips.add(mesh(cyl(0.165, 0.165, 0.06, 14), strap, 0, 0.05, 0, 0, 0, 0, 1, 1, 0.78))
  hips.add(mesh(boxG(0.06, 0.045, 0.02), metal, 0, 0.05, -0.13))
  for (const s of [-1, 1]) hips.add(mesh(boxG(0.07, 0.09, 0.05), vest, s * 0.12, 0.0, -0.1, 0, s * 0.3))
  hips.add(mesh(boxG(0.08, 0.1, 0.08), vest, 0, 0.02, 0.14)) // dump pouch
  // thigh holster (a pistol grip sticking out)
  const holster = new THREE.Group()
  holster.position.set(0.19, -0.14, 0)
  holster.add(mesh(boxG(0.05, 0.2, 0.11), leather, 0, 0, 0))
  holster.add(mesh(boxG(0.035, 0.08, 0.05), lam('#222'), 0, 0.12, 0.02, 0.3))
  holster.userData.flatten = true
  hips.add(holster)

  // ---- torso
  const torso = new THREE.Group()
  hips.add(torso)
  torso.add(mesh(capsule(0.17, 0.26, 12), jacket, 0, 0.31, 0, 0, 0, 0, 1.18, 1, 0.7))
  // vest plate carrier with mag pouches and straps
  torso.add(mesh(boxG(0.36, 0.34, 0.08), vest, 0, 0.33, -0.1))
  torso.add(mesh(boxG(0.36, 0.34, 0.07), vest, 0, 0.33, 0.1))
  for (const s of [-1, 1]) torso.add(mesh(boxG(0.07, 0.08, 0.2), vest, s * 0.17, 0.52, 0)) // shoulder straps
  for (let k = 0; k < 3; k++) {
    torso.add(mesh(boxG(0.085, 0.12, 0.05), vest, -0.1 + k * 0.1, 0.27, -0.155))
    torso.add(mesh(boxG(0.07, 0.03, 0.035), lam('#2b2b2b'), -0.1 + k * 0.1, 0.345, -0.155)) // mags peeking out
  }
  torso.add(mesh(boxG(0.16, 0.06, 0.02), patch, 0, 0.44, -0.145)) // name tape
  if (outfit.tie) {
    // a tie (it's a corporate job), down the front of the vest
    torso.add(mesh(boxG(0.03, 0.03, 0.02), lam(outfit.tie), 0, 0.53, -0.13))
    torso.add(mesh(boxG(0.045, 0.2, 0.015), lam(outfit.tie), 0, 0.41, -0.15, 0, 0, 0.04))
  }
  torso.add(mesh(boxG(0.05, 0.13, 0.04), strap, 0.13, 0.42, -0.15)) // radio
  torso.add(mesh(cyl(0.005, 0.005, 0.16, 4), strap, 0.13, 0.55, -0.15)) // antenna
  if (outfit.pack) {
    torso.add(mesh(boxG(0.3, 0.36, 0.14), lam(T ? '#4a4030' : '#2b3038'), 0, 0.32, 0.2))
    torso.add(mesh(capsule(0.06, 0.2), lam(T ? '#5a4d38' : '#363b44'), 0, 0.52, 0.2, 0, 0, Math.PI / 2))
  }
  // collar
  torso.add(mesh(cyl(0.085, 0.1, 0.06, 12), jacket, 0, 0.54, 0))

  // ---- head
  const neck = new THREE.Group()
  neck.position.y = 0.57
  torso.add(neck)
  neck.add(mesh(cyl(0.05, 0.055, 0.08, 10), skin, 0, 0.03, 0))
  neck.add(mesh(sphere(0.105, 14, 12), skin, 0, 0.16, 0, 0, 0, 0, 0.95, 1.15, 1.05))
  // face: ears, nose, eyes
  for (const s of [-1, 1]) neck.add(mesh(sphere(0.025, 6, 5), skin, s * 0.1, 0.16, 0.0, 0, 0, 0, 0.5, 1, 0.8))
  neck.add(mesh(boxG(0.025, 0.04, 0.03), skin, 0, 0.15, -0.105, -0.2))
  for (const s of [-1, 1]) neck.add(mesh(sphere(0.012, 6, 5), lam('#1a1410'), s * 0.038, 0.18, -0.095))
  const h = outfit.head
  if (h === 'balaclava') {
    neck.add(mesh(sphere(0.112, 14, 12), cloth('#1d1d1d', ['#2a2a2a'], 'knit'), 0, 0.165, 0.004, 0, 0, 0, 0.97, 1.17, 1.06))
    neck.add(mesh(boxG(0.13, 0.04, 0.03), skin, 0, 0.18, -0.108)) // the eye slit shows skin
    for (const s of [-1, 1]) neck.add(mesh(sphere(0.013, 6, 5), lam('#1a1410'), s * 0.038, 0.18, -0.118))
  } else if (h === 'shemagh') {
    const cl = cloth('#c9b48a', ['#a8926a'], 'knit')
    neck.add(mesh(sphere(0.113, 14, 12), cl, 0, 0.19, 0.01, 0, 0, 0, 0.98, 1.0, 1.06))
    neck.add(mesh(cyl(0.1, 0.11, 0.08, 12), cl, 0, 0.09, -0.005)) // lower face wrap
    neck.add(mesh(boxG(0.17, 0.04, 0.04), lam('#222'), 0, 0.235, -0.09)) // goggles on the forehead
    for (const s of [-1, 1]) neck.add(mesh(cyl(0.022, 0.022, 0.02, 10), shiny('#556070', 90), s * 0.045, 0.235, -0.112, Math.PI / 2))
  } else if (h === 'beanie') {
    neck.add(mesh(sphere(0.112, 14, 8), cloth('#2d2d2d', ['#3a3a3a'], 'knit'), 0, 0.2, 0.005, 0, 0, 0, 0.98, 0.8, 1.06))
    neck.add(mesh(cyl(0.1, 0.105, 0.07, 12), lam('#5a1e1e'), 0, 0.1, -0.006)) // bandana over the mouth
  } else if (h === 'helmet') {
    const hm = shiny('#2a3528', 15)
    neck.add(mesh(geo('helm', () => new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)), hm, 0, 0.17, 0.01, 0, 0, 0, 1, 1, 1.08))
    neck.add(mesh(boxG(0.05, 0.05, 0.03), metal, 0, 0.27, -0.12, -0.4)) // NVG mount
    for (const s of [-1, 1]) neck.add(mesh(boxG(0.012, 0.12, 0.02), strap, s * 0.105, 0.1, 0.0))
    neck.add(mesh(boxG(0.19, 0.045, 0.04), lam('#111'), 0, 0.19, -0.1)) // goggles
    neck.add(mesh(boxG(0.17, 0.035, 0.01), shiny('#3a5a70', 120), 0, 0.19, -0.121))
  } else if (h === 'gasmask') {
    const rub = lam('#202224')
    neck.add(mesh(sphere(0.11, 12, 10), rub, 0, 0.15, -0.025, 0, 0, 0, 0.92, 1.05, 0.95))
    for (const s of [-1, 1]) neck.add(mesh(cyl(0.032, 0.032, 0.02, 12), shiny('#6a8090', 120), s * 0.042, 0.18, -0.115, Math.PI / 2))
    neck.add(mesh(cyl(0.035, 0.04, 0.06, 12), metal, 0, 0.1, -0.13, Math.PI / 2.4))
    neck.add(mesh(geo('helm2', () => new THREE.SphereGeometry(0.125, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45)), shiny('#262a30', 20), 0, 0.18, 0.015))
  } else if (h === 'bare') {
    // just hair
    neck.add(mesh(geo('hair', () => new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5)), lam(outfit.hair ?? '#3a2a1a'), 0, 0.17, 0.008, -0.12, 0, 0, 1, 1.05, 1.08))
  } else if (h === 'beret') {
    neck.add(mesh(geo('hair', () => new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5)), lam(outfit.hair ?? '#2a1e14'), 0, 0.17, 0.008, -0.12, 0, 0, 1, 1.05, 1.08))
    neck.add(mesh(cyl(0.125, 0.115, 0.04, 16), lam(outfit.hat ?? '#7a1a2a'), 0.015, 0.265, 0.005, -0.08, 0, -0.22))
    neck.add(mesh(sphere(0.012, 6, 5), shiny('#d9b54a', 80), -0.085, 0.255, -0.06)) // badge
  } else if (h === 'hood') {
    const cl = cloth(outfit.hat ?? '#1a1f26', [outfit.hat ?? '#1a1f26'], 'knit')
    neck.add(mesh(sphere(0.13, 14, 12), cl, 0, 0.18, 0.025, 0, 0, 0, 1, 1.1, 1.08))
    neck.add(mesh(boxG(0.15, 0.17, 0.04), skin, 0, 0.15, -0.105)) // the face, in the hood's opening
    for (const s of [-1, 1]) neck.add(mesh(sphere(0.012, 6, 5), lam('#1a1410'), s * 0.038, 0.18, -0.125))
  } else if (h === 'cowboy') {
    const felt = lam(outfit.hat ?? '#3a2a1a')
    neck.add(mesh(cyl(0.2, 0.2, 0.012, 20), felt, 0, 0.25, 0.005, -0.05))
    neck.add(mesh(cyl(0.085, 0.1, 0.11, 14), felt, 0, 0.31, 0.005, -0.05))
    neck.add(mesh(cyl(0.101, 0.101, 0.02, 14), lam('#111'), 0, 0.27, 0.005, -0.05)) // band
  } else if (h === 'cap') {
    neck.add(mesh(geo('cap', () => new THREE.SphereGeometry(0.115, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5)), lam(outfit.hat ?? '#3d4632'), 0, 0.19, 0.005, 0, 0, 0, 1, 0.9, 1.05))
    neck.add(mesh(boxG(0.16, 0.012, 0.09), lam(outfit.hat ?? '#3d4632'), 0, 0.2, -0.12, -0.1)) // brim
    for (const s of [-1, 1]) neck.add(mesh(cyl(0.04, 0.04, 0.03, 12), lam('#222'), s * 0.112, 0.16, 0, 0, 0, Math.PI / 2)) // headset
    neck.add(mesh(cyl(0.006, 0.006, 0.23, 4), lam('#222'), 0, 0.29, 0, 0, 0, Math.PI / 2))
  }
  if (outfit.shades) {
    // sunglasses (agents are cool)
    neck.add(mesh(boxG(0.17, 0.035, 0.03), shiny('#0a0a0a', 120), 0, 0.18, -0.108))
    for (const s of [-1, 1]) neck.add(mesh(boxG(0.012, 0.012, 0.11), lam('#111'), s * 0.09, 0.185, -0.055))
  }

  // ---- legs
  const legs = []
  for (const s of [-1, 1]) {
    const thigh = new THREE.Group()
    thigh.position.set(s * 0.1, -0.04, 0)
    hips.add(thigh)
    thigh.add(limb([0, 0, 0], [0, -0.44, 0], 0.085, pants))
    thigh.add(mesh(boxG(0.09, 0.11, 0.05), vest, s * 0.07, -0.22, -0.02, 0, s * 0.5)) // cargo pocket
    const shin = new THREE.Group()
    shin.position.y = -0.44
    thigh.add(shin)
    shin.add(mesh(sphere(0.075, 10, 8), lam('#1f1f1f'), 0, 0, -0.045, 0, 0, 0, 1, 1.1, 0.6)) // knee pad
    shin.add(limb([0, 0, 0], [0, -0.38, 0], 0.07, pants))
    const b = boot(lam('#2a241d'), sole)
    b.position.set(0, -0.44, 0.03)
    b.userData.flatten = true
    shin.add(b)
    legs.push({ thigh, shin })
  }

  // ---- arms, holding the gun (the hand group is where the gun goes)
  const arms = new THREE.Group()
  arms.position.set(0, 0.48, -0.05)
  torso.add(arms)
  const sR = [0.19, 0.0, 0.05]
  const hR = [0.08, -0.02, -0.38]
  const sL = [-0.19, 0.0, 0.05]
  const hL = [-0.02, -0.02, -0.52]
  const elbowR = [0.21, -0.2, -0.12]
  const elbowL = [-0.2, -0.18, -0.22]
  arms.add(limb(sR, elbowR, 0.058, jacket), limb(elbowR, hR, 0.05, jacket), limb(sL, elbowL, 0.058, jacket), limb(elbowL, hL, 0.05, jacket))
  for (const s of [sR, sL]) arms.add(mesh(sphere(0.075, 10, 8), jacket, ...s))
  arms.add(mesh(boxG(0.06, 0.06, 0.004), patch, sR[0] + 0.035, sR[1] - 0.06, sR[2] - 0.02, 0, Math.PI / 2))
  arms.add(mesh(boxG(0.06, 0.06, 0.004), patch, sL[0] - 0.035, sL[1] - 0.06, sL[2] - 0.02, 0, Math.PI / 2))
  for (const p of [hR, hL]) {
    arms.add(mesh(sphere(0.045, 10, 8), glove, p[0], p[1], p[2], 0, 0, 0, 0.9, 1.1, 1.2))
    for (let f = 0; f < 3; f++) arms.add(mesh(capsule(0.012, 0.03, 6), glove, p[0] - 0.02 + f * 0.018, p[1] - 0.035, p[2] - 0.02, 0.4))
  }
  const hand = new THREE.Group()
  hand.position.set(...hR)
  hand.userData.keep = true
  arms.add(hand)

  for (const g of [hips, torso, neck, arms, ...legs.flatMap((l) => [l.thigh, l.shin])]) mergeGroup(g)

  // a soft shadow under them (the level's shadows are baked once)
  const blob = new THREE.Mesh(
    geo('blob', () => new THREE.CircleGeometry(0.42, 16)),
    mat('blob', () => new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.28, depthWrite: false })),
  )
  blob.rotation.x = -Math.PI / 2
  blob.position.y = 0.02
  root.add(blob)
  return { root, hips, torso, neck, legs, arms, hand, blob, gunId: null, phase: Math.random() * 6, fall: 0, fallDir: Math.random() < 0.5 ? -1 : 1, outfit: outfit.name }
}

// ---------------- first person
/**
 * The arms you see: sleeves, cuffs, gloves with fingers wrapped round the grip, a watch.
 * right/left: [x, y, z] of each hand in the gun's space; left may be null (pistols, knife).
 */
export function buildViewArms(team, seed, right, left, look = null) {
  const T = team === 'T'
  const outfit = look ?? OUTFITS[T ? 'T' : 'CT'][seed % 3]
  const sleeve = cloth(...outfit.jacket)
  const cuff = lam(outfit.vest)
  const glove = lam('#1d1d1d')
  const knuckle = lam('#2b2b2b')
  const g = new THREE.Group()
  const hand = (p, side, grip) => {
    const [x, y, z] = p
    // forearm comes in from below and behind, towards the camera's edge
    const elbow = [x + side * 0.16, y - 0.24, z + 0.32]
    g.add(limb(elbow, [x + side * 0.01, y - 0.03, z + 0.07], 0.042, sleeve))
    g.add(mesh(cyl(0.046, 0.046, 0.05, 12), cuff, x + side * 0.012, y - 0.04, z + 0.08, -0.9, 0, side * 0.3))
    // the palm and the back of the hand
    g.add(mesh(capsule(0.024, 0.03, 8), glove, x, y - 0.01, z + 0.015, 0.25, 0, 0, 1, 1, 1.15))
    g.add(mesh(boxG(0.04, 0.014, 0.04), knuckle, x - side * 0.004, y + 0.026, z, 0.25))
    // fingers wrapped forward round the grip
    for (let f = 0; f < 4; f++) {
      const fy = y + 0.015 - f * 0.018
      g.add(limb([x - side * 0.03, fy, z - 0.005], [x - side * 0.035, fy - 0.004, z - 0.04], 0.0095, glove))
      g.add(limb([x - side * 0.035, fy - 0.004, z - 0.04], [x - side * 0.005, fy - 0.006, z - 0.055], 0.009, glove))
    }
    // thumb
    g.add(limb([x - side * 0.02, y + 0.035, z + 0.02], [x - side * 0.035, y + 0.045, z - 0.03], 0.011, glove))
    if (grip === 'watch') {
      g.add(mesh(cyl(0.048, 0.048, 0.02, 14), lam('#111'), x + side * 0.02, y - 0.06, z + 0.11, -0.9, 0, side * 0.3))
      g.add(mesh(boxG(0.03, 0.006, 0.03), shiny('#9fd0ff', 100), x + side * 0.03, y - 0.04, z + 0.1, -0.9))
    }
  }
  hand(right, 1, null)
  if (left) hand(left, -1, 'watch')
  mergeGroup(g)
  return g
}
export { mergeGroup }
