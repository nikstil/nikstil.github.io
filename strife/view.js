// What you see: the soldiers (built from boxes), the gun in your hands, and the effects: tracers,
// muzzle flashes, bullet holes, dust and blood, smoke clouds, explosions, the bomb.

import * as THREE from './lib/three.min.js'
import { buildLevel, buildSky } from './render.js'
import { WEAPONS } from './weapons.js'
import { eyeOf, weaponOf } from './game.js'

const lerp = (a, b, t) => a + (b - a) * t

// ================= Shared bits =================
function softTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 64) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, inner)
  grd.addColorStop(1, outer)
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
function smokeTex() {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  for (let i = 0; i < 26; i++) {
    const x = S / 2 + (Math.random() - 0.5) * S * 0.45
    const y = S / 2 + (Math.random() - 0.5) * S * 0.45
    const r = S * (0.14 + Math.random() * 0.2)
    const grd = g.createRadialGradient(x, y, 0, x, y, r)
    const l = 200 + Math.random() * 40
    grd.addColorStop(0, `rgba(${l},${l},${l},0.55)`)
    grd.addColorStop(1, `rgba(${l},${l},${l},0)`)
    g.fillStyle = grd
    g.fillRect(0, 0, S, S)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
function flashTex() {
  const S = 64
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  g.translate(S / 2, S / 2)
  for (let k = 0; k < 6; k++) {
    g.rotate(Math.PI / 3)
    const grd = g.createLinearGradient(0, 0, S / 2, 0)
    grd.addColorStop(0, 'rgba(255,240,180,1)')
    grd.addColorStop(1, 'rgba(255,160,40,0)')
    g.fillStyle = grd
    g.beginPath()
    g.moveTo(0, -4)
    g.lineTo(S / 2, 0)
    g.lineTo(0, 4)
    g.fill()
  }
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, S / 3)
  grd.addColorStop(0, 'rgba(255,255,230,1)')
  grd.addColorStop(1, 'rgba(255,190,80,0)')
  g.fillStyle = grd
  g.fillRect(-S / 2, -S / 2, S, S)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
function holeTex() {
  const S = 32
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grd.addColorStop(0, 'rgba(20,15,10,1)')
  grd.addColorStop(0.35, 'rgba(30,22,15,0.9)')
  grd.addColorStop(0.55, 'rgba(60,45,30,0.35)')
  grd.addColorStop(1, 'rgba(60,45,30,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, S, S)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  return m
}
const lam = (color) => new THREE.MeshLambertMaterial({ color })

// ================= Guns =================
/** A gun model (for hands, the floor, or first person). Points down -z, grip at the origin. */
export function gunModel(id, detail = 1) {
  const g = new THREE.Group()
  const black = lam('#303237')
  const dark = lam('#474a50')
  const wood = lam('#7a4a26')
  const steel = lam('#9aa0a6')
  const w = WEAPONS[id]
  const kind = w?.kind ?? 'pistol'
  if (id === 'ak47') {
    g.add(box(0.06, 0.07, 0.42, dark, 0, 0.04, -0.2)) // receiver
    g.add(box(0.025, 0.025, 0.42, black, 0, 0.06, -0.6)) // barrel
    g.add(box(0.05, 0.05, 0.22, wood, 0, 0.03, -0.42)) // handguard
    g.add(box(0.055, 0.09, 0.3, wood, 0, 0.0, 0.17)) // stock
    const mag = box(0.04, 0.16, 0.07, lam('#7a4a26'), 0, -0.06, -0.24)
    mag.rotation.x = 0.35
    g.add(mag)
    g.add(box(0.035, 0.09, 0.04, wood, 0, -0.04, -0.02)) // grip
    g.add(box(0.012, 0.04, 0.012, black, 0, 0.09, -0.75)) // front sight
  } else if (id === 'm4') {
    g.add(box(0.06, 0.08, 0.4, black, 0, 0.04, -0.2))
    g.add(box(0.024, 0.024, 0.4, black, 0, 0.05, -0.58))
    g.add(box(0.06, 0.06, 0.24, dark, 0, 0.04, -0.46))
    g.add(box(0.05, 0.08, 0.26, black, 0, 0.02, 0.15))
    g.add(box(0.035, 0.03, 0.18, black, 0, 0.1, -0.16)) // carry rail
    g.add(box(0.035, 0.15, 0.06, dark, 0, -0.07, -0.24))
    g.add(box(0.035, 0.09, 0.04, black, 0, -0.04, -0.02))
  } else if (id === 'awp') {
    const green = lam('#4c5a3a')
    g.add(box(0.07, 0.09, 0.62, green, 0, 0.03, -0.15))
    g.add(box(0.03, 0.03, 0.55, black, 0, 0.05, -0.72))
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 10), black)
    scope.rotation.x = Math.PI / 2
    scope.position.set(0, 0.13, -0.15)
    g.add(scope)
    g.add(box(0.04, 0.1, 0.06, black, 0, -0.05, -0.12))
    g.add(box(0.05, 0.11, 0.06, green, 0, -0.05, 0.08))
  } else if (id === 'smg') {
    g.add(box(0.055, 0.08, 0.32, black, 0, 0.04, -0.14))
    g.add(box(0.025, 0.025, 0.16, black, 0, 0.05, -0.38))
    g.add(box(0.035, 0.18, 0.045, dark, 0, -0.08, -0.04))
    g.add(box(0.04, 0.03, 0.2, dark, 0, 0.02, 0.12))
  } else if (kind === 'pistol') {
    const mat = id === 'deagle' ? steel : black
    g.add(box(0.035, 0.05, id === 'deagle' ? 0.24 : 0.18, mat, 0, 0.04, -0.07))
    g.add(box(0.03, 0.1, 0.045, dark, 0, -0.03, 0.01))
    if (id === 'usp') {
      const sup = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), dark)
      sup.rotation.x = Math.PI / 2
      sup.position.set(0, 0.045, -0.23)
      g.add(sup)
    }
  } else if (kind === 'knife') {
    g.add(box(0.025, 0.035, 0.11, black, 0, 0, 0.02))
    const blade = box(0.006, 0.035, 0.17, steel, 0, 0.01, -0.12)
    g.add(blade)
  } else if (kind === 'grenade') {
    const col = w.nade === 'he' ? '#4b5a33' : w.nade === 'flash' ? '#8a8f94' : '#6f7378'
    const body = w.nade === 'smoke' ? new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 10), lam(col)) : new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), lam(col))
    g.add(body)
    g.add(box(0.015, 0.03, 0.04, steel, 0, 0.06, 0))
  } else if (kind === 'bomb') {
    g.add(box(0.2, 0.09, 0.14, lam('#6b5a3a'), 0, 0, 0))
    g.add(box(0.08, 0.02, 0.06, lam('#2c3a2c'), 0.03, 0.055, 0))
    g.add(box(0.04, 0.03, 0.03, lam('#c0392b'), -0.06, 0.055, 0.03))
  }
  return g
}

// ================= Soldiers =================
const SKIN = '#c08a62'
function soldier(team) {
  const T = team === 'T'
  const jacket = lam(T ? '#8a7350' : '#2e4060')
  const vest = lam(T ? '#5d4d36' : '#1f2b3d')
  const pants = lam(T ? '#4b4235' : '#2a3242')
  const boots = lam('#1d1a17')
  const head = lam(T ? '#2b2b2b' : SKIN)
  const helmet = lam(T ? '#3a3328' : '#2a3528')
  const glove = lam('#1f1f1f')
  const root = new THREE.Group()
  const hips = new THREE.Group()
  hips.position.y = 0.92
  root.add(hips)
  const torso = new THREE.Group()
  hips.add(torso)
  torso.add(box(0.42, 0.56, 0.24, jacket, 0, 0.3, 0))
  torso.add(box(0.44, 0.36, 0.27, vest, 0, 0.34, 0))
  const neck = new THREE.Group()
  neck.position.y = 0.6
  torso.add(neck)
  neck.add(box(0.22, 0.25, 0.24, head, 0, 0.14, 0))
  if (T) neck.add(box(0.23, 0.05, 0.25, lam('#c9a37a'), 0, 0.17, -0.005)) // eye slit
  else {
    neck.add(box(0.26, 0.11, 0.28, helmet, 0, 0.27, 0))
    neck.add(box(0.2, 0.05, 0.03, lam('#111'), 0, 0.17, -0.13)) // goggles
  }
  const legs = []
  for (const s of [-1, 1]) {
    const thigh = new THREE.Group()
    thigh.position.set(s * 0.11, 0, 0)
    hips.add(thigh)
    thigh.add(box(0.16, 0.46, 0.18, pants, 0, -0.23, 0))
    const shin = new THREE.Group()
    shin.position.y = -0.46
    thigh.add(shin)
    shin.add(box(0.15, 0.44, 0.16, pants, 0, -0.22, 0))
    shin.add(box(0.16, 0.08, 0.26, boots, 0, -0.42, -0.04))
    legs.push({ thigh, shin })
  }
  // Arms reach forward to hold the gun.
  const arms = new THREE.Group()
  arms.position.set(0, 0.48, -0.05)
  torso.add(arms)
  const armR = box(0.11, 0.11, 0.42, jacket, 0.17, 0, -0.18)
  armR.rotation.y = 0.25
  const armL = box(0.11, 0.11, 0.48, jacket, -0.12, 0, -0.26)
  armL.rotation.y = -0.45
  arms.add(armR, armL, box(0.1, 0.1, 0.1, glove, 0.1, -0.02, -0.38), box(0.1, 0.1, 0.1, glove, -0.02, -0.02, -0.5))
  const hand = new THREE.Group()
  hand.position.set(0.08, -0.02, -0.38)
  arms.add(hand)
  // A soft dark blob under them (the level's shadows are baked once, so people need their own).
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.28, depthWrite: false }))
  blob.rotation.x = -Math.PI / 2
  blob.position.y = 0.02
  root.add(blob)
  return { root, hips, torso, neck, legs, arms, hand, blob, gunId: null, phase: Math.random() * 6, fall: 0, fallDir: Math.random() < 0.5 ? -1 : 1 }
}

// ================= The view =================
export class View {
  constructor(renderer, quality) {
    this.r = renderer
    this.quality = quality
    this.scene = null
    this.camera = new THREE.PerspectiveCamera(74, 16 / 9, 0.04, 700)
    this.camera.rotation.order = 'YXZ'
    this.vmScene = new THREE.Scene()
    this.vmCam = new THREE.PerspectiveCamera(54, 16 / 9, 0.01, 10)
    this.vmScene.add(new THREE.HemisphereLight('#fff7e8', '#6b5a48', 2.2))
    const key = new THREE.DirectionalLight('#fff3dc', 1.6)
    key.position.set(-1, 2, 1)
    this.vmScene.add(key)
    this.vm = new THREE.Group()
    this.vmScene.add(this.vm)
    this.vmGunId = null
    this.vmState = { kick: 0, swayX: 0, swayY: 0, lastYaw: 0, lastPitch: 0, bob: 0, draw: 0, slash: 0, flash: 0 }
    this.tex = { soft: softTex(), smoke: smokeTex(), flash: flashTex(), hole: holeTex() }
  }

  /** Builds everything for a match. */
  load(game) {
    this.game = game
    const scene = new THREE.Scene()
    this.scene = scene
    const level = buildLevel(game.map, this.r, this.quality)
    scene.add(level.group)
    const sky = buildSky(game.map, this.quality)
    scene.add(sky.group)
    scene.fog = sky.fog
    this.sun = sky.sun
    this.soldiers = new Map()
    for (const a of game.actors) this.addSoldier(a)
    // pools
    this.fx = []
    this.tracers = []
    const tg = new THREE.BufferGeometry()
    tg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(64 * 6), 3))
    tg.attributes.position.setUsage(THREE.DynamicDrawUsage)
    this.tracerMesh = new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: '#ffe7a0', transparent: true, opacity: 0.85, fog: false }))
    this.tracerMesh.frustumCulled = false
    scene.add(this.tracerMesh)
    // bullet holes
    this.holes = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.11, 0.11),
      new THREE.MeshBasicMaterial({ map: this.tex.hole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      220,
    )
    this.holes.count = 0
    this.holeNext = 0
    this.holes.frustumCulled = false
    scene.add(this.holes)
    // one light for muzzle flashes and explosions (never removed: adding lights recompiles shaders)
    this.flashLight = new THREE.PointLight('#ffcf80', 0, 9, 2)
    scene.add(this.flashLight)
    this.bombModel = gunModel('bomb')
    this.bombModel.scale.setScalar(1.6)
    this.bombModel.visible = false
    this.bombLed = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.soft, color: '#ff3020', transparent: true, depthWrite: false }))
    this.bombLed.scale.setScalar(0.25)
    this.bombLed.position.set(-0.06, 0.1, 0.03)
    this.bombModel.add(this.bombLed)
    scene.add(this.bombModel)
    this.drops = new Map()
    this.nadeMeshes = new Map()
    this.smokeClouds = new Map()
  }
  addSoldier(a) {
    const s = soldier(a.team)
    s.team = a.team
    this.scene.add(s.root)
    this.soldiers.set(a.id, s)
  }
  dispose() {
    this.scene?.traverse((o) => {
      o.geometry?.dispose?.()
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.map?.dispose?.(), m.dispose?.()))
    })
    this.scene = null
  }
  resize(w, h) {
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.vmCam.aspect = w / h
    this.vmCam.updateProjectionMatrix()
  }

  // ================= Effects (called from the game's hooks) =================
  sprite(tex, color, pos, size, life, opts = {}) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: opts.add ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: opts.opacity ?? 1 }))
    m.position.set(pos.x, pos.y, pos.z)
    m.scale.setScalar(size)
    m.material.rotation = Math.random() * 6.28
    this.scene.add(m)
    this.fx.push({ m, life, t: 0, grow: opts.grow ?? 0, fade: opts.fade ?? true, vy: opts.vy ?? 0, size })
    return m
  }
  tracer(from, to, mine) {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dz = to.z - from.z
    const len = Math.hypot(dx, dy, dz)
    if (len < 2) return
    // Your own tracers start a little in front of you (from the gun, not your eye).
    const start = mine ? 1.2 : 0.3
    this.tracers.push({ from: { ...from }, dir: { x: dx / len, y: dy / len, z: dz / len }, len, head: start, mine })
    if (this.tracers.length > 32) this.tracers.shift()
  }
  impact(at, n, soft) {
    // bullet hole
    if (!soft) {
      const k = this.holeNext++ % 220
      const o = new THREE.Object3D()
      o.position.set(at.x + n.x * 0.012, at.y + n.y * 0.012, at.z + n.z * 0.012)
      o.lookAt(at.x + n.x, at.y + n.y, at.z + n.z)
      o.rotateZ(Math.random() * 6.28)
      const sc = 0.7 + Math.random() * 0.6
      o.scale.set(sc, sc, sc)
      o.updateMatrix()
      this.holes.setMatrixAt(k, o.matrix)
      this.holes.count = Math.min(220, Math.max(this.holes.count, k + 1))
      this.holes.instanceMatrix.needsUpdate = true
    }
    const p = { x: at.x + n.x * 0.1, y: at.y + n.y * 0.1, z: at.z + n.z * 0.1 }
    this.sprite(this.tex.soft, '#c9b08a', p, 0.35, 0.5, { grow: 1.6, opacity: 0.8, vy: 0.4 })
    this.sprite(this.tex.flash, '#ffd890', p, 0.18, 0.06, { add: true })
  }
  blood(at, dir) {
    for (let k = 0; k < 3; k++) {
      const p = { x: at.x + (dir?.x ?? 0) * 0.2 * k, y: at.y + (Math.random() - 0.3) * 0.15, z: at.z + (dir?.z ?? 0) * 0.2 * k }
      this.sprite(this.tex.soft, '#8a0f0f', p, 0.25 + k * 0.1, 0.45, { grow: 1.2, opacity: 0.9, vy: -0.6 })
    }
  }
  muzzle(a) {
    const s = this.soldiers.get(a.id)
    if (!s) return
    const p = new THREE.Vector3(0, 0.05, -0.75)
    s.hand.localToWorld(p)
    this.sprite(this.tex.flash, '#ffe6a0', p, 0.45, 0.05, { add: true })
    this.light(p, 3, 0.06)
  }
  light(p, intensity, life) {
    this.flashLight.position.copy(p)
    this.flashLight.intensity = intensity
    this.flashLife = life
  }
  explosion(pos, kind) {
    const p = { x: pos.x, y: pos.y + 0.6, z: pos.z }
    if (kind === 'flash') {
      this.sprite(this.tex.soft, '#ffffff', p, 6, 0.25, { add: true, grow: 2 })
      this.light(new THREE.Vector3(p.x, p.y, p.z), 40, 0.2)
      return
    }
    const big = kind === 'bomb'
    this.sprite(this.tex.flash, '#ffb050', p, big ? 14 : 5, big ? 0.6 : 0.35, { add: true, grow: 2.2 })
    this.sprite(this.tex.soft, '#ff8a30', p, big ? 10 : 3.5, big ? 0.8 : 0.4, { add: true, grow: 1.8 })
    for (let k = 0; k < (big ? 14 : 6); k++) {
      const q = { x: p.x + (Math.random() - 0.5) * (big ? 8 : 3), y: p.y + Math.random() * (big ? 4 : 1.5), z: p.z + (Math.random() - 0.5) * (big ? 8 : 3) }
      this.sprite(this.tex.smoke, '#4a4038', q, big ? 5 : 2.4, big ? 3 : 1.6, { grow: 1.2, opacity: 0.8, vy: 0.8 })
    }
    this.light(new THREE.Vector3(p.x, p.y + 1, p.z), big ? 80 : 30, big ? 0.5 : 0.25)
  }
  addDrop(d) {
    const m = gunModel(d.id)
    m.scale.setScalar(1.4)
    m.position.set(d.pos.x, d.pos.y + 0.06, d.pos.z)
    m.rotation.set(0, d.yaw, Math.PI / 2)
    this.scene.add(m)
    this.drops.set(d, m)
  }
  removeDrop(d) {
    const m = this.drops.get(d)
    if (m) this.scene.remove(m)
    this.drops.delete(d)
  }

  // ================= Every frame =================
  /** Syncs the scene with the game. `me` is whose eyes we see through (null: free camera). */
  update(dt, game, me) {
    const now = game.time
    // Soldiers
    for (const a of game.actors) {
      const s = this.soldiers.get(a.id)
      if (!s) continue
      if (s.team !== a.team) {
        // they swapped sides at halftime: new uniform
        this.scene.remove(s.root)
        this.addSoldier(a)
        continue
      }
      s.root.visible = a !== me || !a.alive
      if (!s.root.visible) continue
      s.root.position.set(a.pos.x, a.pos.y, a.pos.z)
      s.root.rotation.y = a.yaw
      // gun in hand
      const w = weaponOf(a)
      const gid = a.alive ? w?.id ?? null : null
      if (gid !== s.gunId) {
        if (s.gun) s.hand.remove(s.gun)
        s.gun = gid ? gunModel(gid) : null
        if (s.gun) {
          s.gun.scale.setScalar(1.3)
          s.hand.add(s.gun)
        }
        s.gunId = gid
      }
      if (!a.alive) {
        s.fall = Math.min(1, s.fall + dt * 3)
        const f = s.fall * s.fall
        s.root.rotation.x = -f * 1.45
        s.root.rotation.z = f * 0.3 * s.fallDir
        s.root.position.y = a.pos.y + 0.05 - f * 0.1
        s.blob.visible = false
        continue
      }
      s.fall = 0
      s.root.rotation.x = 0
      s.root.rotation.z = 0
      s.blob.visible = true
      const speed = Math.hypot(a.vel.x, a.vel.z)
      s.phase += dt * speed * 1.9
      const swing = Math.min(1, speed / 4) * 0.7
      const c = a.crouch
      s.hips.position.y = 0.92 - c * 0.44 + (a.onGround ? Math.abs(Math.sin(s.phase)) * 0.03 * swing : 0)
      s.legs.forEach((l, k) => {
        const sw = Math.sin(s.phase + k * Math.PI) * swing
        l.thigh.rotation.x = sw * (1 - c * 0.6) - c * 1.25
        l.shin.rotation.x = Math.max(0, -sw) * 0.9 + c * 2.1
      })
      s.torso.rotation.x = -a.pitch * 0.35 + c * 0.15
      s.neck.rotation.x = -a.pitch * 0.4
      s.arms.rotation.x = a.pitch * 0.9 - c * 0.1
    }
    // Tracers: bright streaks that race along the bullet's path.
    const pos = this.tracerMesh.geometry.attributes.position
    let n = 0
    for (let k = this.tracers.length - 1; k >= 0; k--) {
      const t = this.tracers[k]
      t.head += dt * 320
      const tail = t.head - 5
      if (tail > t.len) {
        this.tracers.splice(k, 1)
        continue
      }
      const h = Math.min(t.head, t.len)
      const tl = Math.max(t.mine ? 1.2 : 0.3, tail)
      pos.setXYZ(n++, t.from.x + t.dir.x * tl, t.from.y + t.dir.y * tl - (t.mine ? 0.12 : 0), t.from.z + t.dir.z * tl)
      pos.setXYZ(n++, t.from.x + t.dir.x * h, t.from.y + t.dir.y * h, t.from.z + t.dir.z * h)
    }
    this.tracerMesh.geometry.setDrawRange(0, n)
    pos.needsUpdate = true
    // Sprites
    for (let k = this.fx.length - 1; k >= 0; k--) {
      const f = this.fx[k]
      f.t += dt
      const u = f.t / f.life
      if (u >= 1) {
        this.scene.remove(f.m)
        f.m.material.dispose()
        this.fx.splice(k, 1)
        continue
      }
      if (f.grow) f.m.scale.setScalar(f.size * (1 + f.grow * u))
      if (f.fade) f.m.material.opacity = (f.m.material.userData.o0 ??= f.m.material.opacity) * (1 - u)
      f.m.position.y += f.vy * dt
    }
    if (this.flashLife > 0) {
      this.flashLife -= dt
      if (this.flashLife <= 0) this.flashLight.intensity = 0
      else this.flashLight.intensity *= 0.85
    }
    // Grenades in flight
    const live = new Set()
    for (const nd of game.nades) {
      live.add(nd)
      let m = this.nadeMeshes.get(nd)
      if (!m) {
        m = gunModel(nd.type === 'he' ? 'he' : nd.type === 'flash' ? 'flash' : 'smoke')
        m.scale.setScalar(1.4)
        this.scene.add(m)
        this.nadeMeshes.set(nd, m)
      }
      m.position.set(nd.pos.x, nd.pos.y, nd.pos.z)
      m.rotation.x += dt * 8
    }
    for (const [nd, m] of this.nadeMeshes)
      if (!live.has(nd)) {
        this.scene.remove(m)
        this.nadeMeshes.delete(nd)
      }
    // Smoke clouds
    const smokes = new Set(game.world.smokes)
    for (const sm of game.world.smokes) {
      let cl = this.smokeClouds.get(sm)
      if (!cl) {
        cl = []
        for (let k = 0; k < 22; k++) {
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.smoke, color: '#c9c6c0', transparent: true, depthWrite: false, opacity: 0.95 }))
          const a = Math.random() * 6.28
          const r = Math.sqrt(Math.random())
          sp.userData = { ox: Math.cos(a) * r, oy: (Math.random() - 0.35) * 0.7, oz: Math.sin(a) * r, s: 0.9 + Math.random() * 0.5, spin: (Math.random() - 0.5) * 0.2 }
          sp.material.rotation = Math.random() * 6.28
          this.scene.add(sp)
          cl.push(sp)
        }
        this.smokeClouds.set(sm, cl)
      }
      for (const sp of cl) {
        const u = sp.userData
        sp.position.set(sm.x + u.ox * sm.r * 0.75, sm.y + u.oy * sm.r * 0.8, sm.z + u.oz * sm.r * 0.75)
        sp.scale.setScalar(Math.max(0.1, sm.r * 1.25 * u.s))
        sp.material.rotation += u.spin * dt
        sp.material.opacity = Math.min(0.95, sm.r / 3)
      }
    }
    for (const [sm, cl] of this.smokeClouds)
      if (!smokes.has(sm)) {
        for (const sp of cl) {
          this.scene.remove(sp)
          sp.material.dispose()
        }
        this.smokeClouds.delete(sm)
      }
    // The bomb (on the floor or planted)
    const b = game.bomb
    const showBomb = b && (b.state === 'dropped' || b.state === 'planted')
    this.bombModel.visible = !!showBomb
    if (showBomb) {
      this.bombModel.position.set(b.pos.x, b.pos.y + 0.08, b.pos.z)
      this.bombLed.visible = b.state === 'planted' && now % 1 < (b.explodeAt - now < 10 ? 0.15 : 0.1)
    }
  }

  // ================= First person =================
  /** The gun in your hands: its model, sway, bob, kick, reload and draw animations. */
  updateViewmodel(dt, a, game) {
    const st = this.vmState
    const w = a && a.alive ? weaponOf(a) : null
    const id = w?.id ?? null
    if (id !== this.vmGunId) {
      this.vm.clear()
      this.vmGunId = id
      if (id) {
        const g = gunModel(id, 2)
        const arms = new THREE.Group()
        const sleeve = lam(a.team === 'T' ? '#8a7350' : '#2e4060')
        const glove = lam('#1e1e1e')
        // right hand on the grip, its forearm running back and down out of view
        const rArm = box(0.075, 0.075, 0.42, sleeve, 0.05, -0.17, 0.2)
        rArm.rotation.x = 0.55
        arms.add(rArm, box(0.06, 0.07, 0.09, glove, 0.0, -0.06, 0.0))
        if (w.kind === 'rifle' || w.kind === 'smg' || w.kind === 'sniper') {
          // the left hand holds the front, its arm coming in from the lower left
          const fore = w.kind === 'smg' ? -0.2 : -0.36
          const lArm = box(0.075, 0.075, 0.45, sleeve, -0.13, -0.17, fore + 0.18)
          lArm.rotation.set(0.5, -0.55, 0)
          arms.add(lArm, box(0.06, 0.07, 0.09, glove, -0.02, -0.03, fore))
        }
        const holder = new THREE.Group()
        const sc = w.kind === 'rifle' || w.kind === 'sniper' ? 0.78 : w.kind === 'smg' ? 0.85 : 1
        g.scale.setScalar(sc)
        arms.scale.setScalar(sc)
        holder.add(g, arms)
        this.vm.add(holder)
        this.vmGun = g
        this.vmHolder = holder
        // muzzle flash sprite at the barrel
        const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.flash, color: '#ffe8b0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
        flash.scale.setScalar(0.28)
        flash.position.set(0, 0.05, w.kind === 'pistol' ? (id === 'usp' ? -0.3 : -0.22) : w.kind === 'smg' ? -0.48 : -0.82)
        flash.visible = false
        g.add(flash)
        this.vmFlash = flash
        st.draw = 0
      }
    }
    if (!id) return
    const now = game.time
    // draw (switch) animation
    st.draw = Math.min(1, st.draw + dt / Math.max(0.2, (a.switchEnd - (now - dt)) || 0.4))
    if (now >= a.switchEnd) st.draw = 1
    // bob and sway
    const speed = Math.hypot(a.vel.x, a.vel.z)
    st.bob += dt * speed * 1.8
    const bobA = a.onGround ? Math.min(1, speed / 5) : 0.2
    const dYaw = Math.atan2(Math.sin(a.yaw - st.lastYaw), Math.cos(a.yaw - st.lastYaw))
    const dPitch = a.pitch - st.lastPitch
    st.lastYaw = a.yaw
    st.lastPitch = a.pitch
    st.swayX = lerp(st.swayX, Math.max(-0.05, Math.min(0.05, dYaw * 0.6)), Math.min(1, dt * 10))
    st.swayY = lerp(st.swayY, Math.max(-0.05, Math.min(0.05, -dPitch * 0.6)), Math.min(1, dt * 10))
    st.kick = Math.max(0, st.kick - dt * 6)
    const reloading = a.reloadEnd > now
    const rl = reloading ? Math.sin(Math.min(1, 1 - (a.reloadEnd - now) / WEAPONS[id].reload) * Math.PI) : 0
    st.slash = Math.max(0, st.slash - dt * 3.5)
    const h = this.vmHolder
    const crouchDip = a.crouch * 0.01
    const kind = WEAPONS[id].kind
    const base = kind === 'pistol' ? [0.13, -0.14, -0.36] : kind === 'knife' ? [0.15, -0.15, -0.34] : kind === 'grenade' || kind === 'bomb' ? [0.14, -0.15, -0.36] : [0.12, -0.13, -0.36]
    h.position.set(
      base[0] + Math.sin(st.bob) * 0.008 * bobA + st.swayX,
      base[1] - Math.abs(Math.cos(st.bob)) * 0.007 * bobA + st.swayY - (1 - st.draw) * 0.25 - rl * 0.1 - crouchDip,
      base[2] + st.kick * 0.035,
    )
    h.rotation.set(st.kick * 0.1 + rl * 0.5 - (1 - st.draw) * 0.6, 0.06 + st.swayX * 2 + Math.sin(st.slash * Math.PI) * 0.8, rl * 0.4 + Math.sin(st.slash * Math.PI) * -0.6)
    if (st.flash > 0) {
      st.flash -= dt
      this.vmFlash.visible = st.flash > 0
      this.vmFlash.material.rotation = Math.random() * 6
    }
    this.vm.visible = !(w.zoom && a.scope)
  }
  kick(w) {
    this.vmState.kick = Math.min(1, this.vmState.kick + (w.kind === 'sniper' ? 1 : w.kind === 'pistol' ? 0.7 : 0.45))
    this.vmState.flash = w.sound === 'silenced' ? 0 : 0.05
  }
  slash() {
    this.vmState.slash = 1
  }

  /** Draws the frame. `cam` = { x, y, z, yaw, pitch, fov }. */
  render(cam, showVm) {
    const c = this.camera
    c.position.set(cam.x, cam.y, cam.z)
    c.rotation.set(cam.pitch, cam.yaw, cam.roll ?? 0)
    if (c.fov !== cam.fov) {
      c.fov = cam.fov
      c.updateProjectionMatrix()
    }
    this.r.autoClear = true
    this.r.render(this.scene, c)
    if (showVm && this.vm.children.length && this.vm.visible) {
      this.r.autoClear = false
      this.r.clearDepth()
      this.r.render(this.vmScene, this.vmCam)
    }
  }
}

export { eyeOf }
