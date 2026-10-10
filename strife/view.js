// What you see: the soldiers (built from boxes), the gun in your hands, and the effects: tracers,
// muzzle flashes, bullet holes, dust and blood, smoke clouds, explosions, the bomb.

import * as THREE from './lib/three.min.js'
import { buildLevel, buildSky } from './render.js'
import { WEAPONS, adsOf } from './weapons.js'
import { buildGun } from './guns.js'
import { buildSoldier, buildViewArms } from './models.js'
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
/** A gun model (for hands, the floor, or first person). Points down -z, trigger at the origin. */
export function gunModel(id, detail = 1, opts = {}) {
  const inner = buildGun(id, { detail, silenced: opts.silenced, skin: opts.skin, stickers: opts.stickers })
  const k = WEAPONS[id]?.kind
  const sc = k === 'pistol' || k === 'taser' ? 0.82 : k === 'grenade' || k === 'knife' || k === 'bomb' ? 1 : 0.72
  inner.scale.setScalar(sc)
  const g = new THREE.Group()
  g.add(inner)
  g.userData.muzzle = (inner.userData.muzzle ?? 0.3) * sc
  g.userData.sight = (inner.userData.sight ?? 0.05) * sc
  return g
}

/**
 * A knife in a fist: the handle runs up through the hand like a pistol grip (so the fingers wrap
 * round it), and the blade comes out of the top, pointing up and forward, edge first.
 * `hand`: where the fist is, in the holder's space. (The model points down -z from the guard,
 * the handle behind it.)
 */
const KNIFE_TILT = 0.82 // how far the blade is raised from pointing straight ahead
function holdKnife(g, hand) {
  const handle = new THREE.Vector3(0, 0, 0.06) // the middle of the handle
  g.rotation.set(KNIFE_TILT, 0.3, -0.3, 'XYZ')
  g.updateMatrix()
  const mid = handle.clone().applyMatrix4(g.matrix)
  g.position.set(hand[0] - 0.012 - mid.x, hand[1] - 0.012 - mid.y, hand[2] - 0.03 - mid.z)
}
/** The same, for a soldier's hand (third person). */
function holdKnifeTp(g) {
  g.rotation.set(0.7, 0, 0)
  g.updateMatrix()
  const mid = new THREE.Vector3(0, 0, 0.06).applyMatrix4(g.matrix)
  g.position.sub(mid)
}

// ================= Inspecting (F) =================
// Key poses over the animation (0 to 1), as offsets from how it's normally held: x, y, z move it
// (toward the middle, up, nearer), rx tilts the muzzle up, ry turns it to show its side, rz rolls
// it over. Between poses it eases.
const INSPECT = {
  gun: {
    secs: 3.6,
    keys: [
      [0, {}],
      [0.16, { x: -0.09, y: 0.06, z: 0.02, rx: 0.1, ry: 1.0, rz: -0.22 }], // turned to show its side
      [0.48, { x: -0.085, y: 0.055, z: 0.015, rx: 0.05, ry: 1.08, rz: -0.16 }],
      [0.64, { x: -0.07, y: 0.075, z: 0.02, rx: -0.2, ry: 0.5, rz: 1.3 }], // rolled over: the other side, the top
      [0.84, { x: -0.068, y: 0.07, z: 0.018, rx: -0.16, ry: 0.46, rz: 1.22 }],
      [1, {}],
    ],
  },
  knife: {
    secs: 3.0,
    keys: [
      [0, {}],
      [0.18, { x: -0.07, y: 0.03, z: 0.05, rx: -0.25, ry: 0.9, rz: -0.5 }], // the blade, side on
      [0.45, { x: -0.065, y: 0.035, z: 0.05, rx: -0.2, ry: 0.95, rz: -0.42 }],
      [0.62, { x: -0.06, y: 0.06, z: 0.04, rx: -0.3, ry: 0.4, rz: 2.5 }], // a flip of the wrist: the other side
      [0.8, { x: -0.06, y: 0.055, z: 0.04, rx: -0.25, ry: 0.35, rz: 2.4 }],
      [1, {}],
    ],
  },
}
const INSPECT_KEYS = ['x', 'y', 'z', 'rx', 'ry', 'rz']
function inspectPose(keys, t) {
  let i = 0
  while (i < keys.length - 2 && t > keys[i + 1][0]) i++
  const [t0, a] = keys[i]
  const [t1, b] = keys[i + 1]
  const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))
  const e = u * u * (3 - 2 * u)
  const o = {}
  for (const k of INSPECT_KEYS) o[k] = (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * e
  return o
}

// ================= Soldiers (models.js) =================
const soldier = (team, seed) => buildSoldier(team, seed)

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
    this.vmState = { kick: 0, swayX: 0, swayY: 0, lastYaw: 0, lastPitch: 0, bob: 0, draw: 0, slash: 0, flash: 0, inspect: -1, inspectOut: 0 }
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
    const s = soldier(a.team, a.id * 7 + (a.isBot ? 0 : 1))
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
    const m = gunModel(d.id, 1, { silenced: d.silenced, skin: this.skinMat?.(d.skin), stickers: (d.skin?.stickers ?? []).map((k) => this.stickerMat?.(k)) })
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
      const sl = a.inv?.[a.active]
      const gid = a.alive && w ? `${w.id}|${sl?.silenced}|${sl?.skin?.key ?? ''}` : null
      if (gid !== s.gunId) {
        if (s.gun) s.hand.remove(s.gun)
        s.gun = gid ? gunModel(w.id, 1, { silenced: sl?.silenced, skin: this.skinMat?.(sl?.skin), stickers: (sl?.skin?.stickers ?? []).map((k) => this.stickerMat?.(k)) }) : null
        if (s.gun) {
          s.gun.scale.setScalar(1.3)
          if (w.kind === 'knife') holdKnifeTp(s.gun)
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
        m = gunModel(nd.item ?? (nd.type === 'he' ? 'he' : nd.type === 'flash' ? 'flash' : 'smoke'))
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
    // Molotov fires: flickering flames over a glowing patch of floor
    this.fireFx ??= new Map()
    const fires = new Set(game.world.fires)
    for (const f of game.world.fires) {
      let fx = this.fireFx.get(f)
      if (!fx) {
        fx = { flames: [], glow: null }
        const glow = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ map: this.tex.soft, color: '#ff7a20', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }))
        glow.rotation.x = -Math.PI / 2
        glow.position.set(f.x, f.y + 0.03, f.z)
        this.scene.add(glow)
        fx.glow = glow
        for (let k = 0; k < 26; k++) {
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.flash, color: k % 3 ? '#ff8c2a' : '#ffd060', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
          const ang = Math.random() * 6.28
          sp.userData = { a: ang, r: Math.sqrt(Math.random()), ph: Math.random() * 6.28, sp: 6 + Math.random() * 6 }
          this.scene.add(sp)
          fx.flames.push(sp)
        }
        this.fireFx.set(f, fx)
      }
      fx.glow.scale.setScalar(f.r * 1.3)
      const fade = Math.min(1, (f.until - now) / 1.2)
      for (const sp of fx.flames) {
        const u = sp.userData
        const t = (now * u.sp + u.ph) % 6.28
        const h = 0.4 + 0.5 * Math.abs(Math.sin(t))
        sp.position.set(f.x + Math.cos(u.a) * u.r * f.r, f.y + h * 0.5, f.z + Math.sin(u.a) * u.r * f.r)
        sp.scale.set(0.7 * fade, h * 1.4 * fade, 1)
        sp.material.opacity = 0.75 * fade
      }
    }
    for (const [f, fx] of this.fireFx)
      if (!fires.has(f)) {
        this.scene.remove(fx.glow)
        for (const sp of fx.flames) {
          this.scene.remove(sp)
          sp.material.dispose()
        }
        this.fireFx.delete(f)
      }
    // Decoys lying on the floor
    this.decoyFx ??= new Map()
    const decoys = new Set(game.decoys)
    for (const d of game.decoys)
      if (!this.decoyFx.has(d)) {
        const m = gunModel('decoy')
        m.scale.setScalar(1.4)
        m.rotation.z = Math.PI / 2
        m.position.set(d.pos.x, d.pos.y + 0.04, d.pos.z)
        this.scene.add(m)
        this.decoyFx.set(d, m)
      }
    for (const [d, m] of this.decoyFx)
      if (!decoys.has(d)) {
        this.scene.remove(m)
        this.decoyFx.delete(d)
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
    const slot = a?.inv?.[a.active]
    const key = id && `${id}|${slot?.silenced}|${slot?.skin?.key ?? ''}`
    if (key !== this.vmGunId) {
      this.vm.clear()
      this.vmGunId = key
      if (id) {
        const g = gunModel(id, 2, { silenced: slot?.silenced, skin: this.skinMat?.(slot?.skin), stickers: (slot?.skin?.stickers ?? []).map((k) => this.stickerMat?.(k)) })
        const twoHands = w.kind === 'rifle' || w.kind === 'smg' || w.kind === 'sniper' || w.kind === 'heavy'
        const k = w.kind === 'pistol' || w.kind === 'taser' ? 0.82 : 0.72
        const fore = -Math.min(0.32, g.userData.muzzle * 0.45)
        // the right hand on the grip; the left on the handguard (or cupping a pistol's grip)
        const right = w.kind === 'knife' ? [0, 0, 0.02] : w.kind === 'grenade' || w.kind === 'bomb' ? [0.01, -0.03, 0.02] : [0, -0.05 * k, 0.03 * k]
        const left = twoHands ? [-0.005, -0.012, fore] : id === 'dualies' ? [-0.22 * k, -0.05 * k, 0.05 * k] : null
        const arms = buildViewArms(a.team, a.id * 7 + (a.isBot ? 0 : 1), right, left)
        const holder = new THREE.Group()
        const sc = w.kind === 'rifle' || w.kind === 'sniper' || w.kind === 'heavy' ? 0.64 : w.kind === 'smg' ? 0.72 : w.kind === 'pistol' || w.kind === 'taser' ? 0.8 : 1
        g.scale.setScalar(sc)
        arms.scale.setScalar(sc)
        if (w.kind === 'knife') holdKnife(g, right)
        holder.add(g, arms)
        this.vm.add(holder)
        this.vmGun = g
        this.vmHolder = holder
        this.vmSight = g.userData.sight * sc
        // muzzle flash sprite at the barrel
        const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex.flash, color: '#ffe8b0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
        flash.scale.setScalar(0.28)
        flash.position.set(0, 0.03, -g.userData.muzzle - 0.02)
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
    const hip = kind === 'pistol' || kind === 'taser' ? [0.12, -0.12, -0.36] : kind === 'knife' ? [0.15, -0.15, -0.34] : kind === 'grenade' || kind === 'bomb' ? [0.14, -0.15, -0.36] : [0.11, -0.115, -0.34]
    // down the sights: the gun comes up to the middle, its line of sight on the crosshair, and steadies
    const u = adsOf(WEAPONS[id]) ? (a.ads ?? 0) : 0
    const ads = u * u * (3 - 2 * u)
    const aimed = [id === 'dualies' ? 0.09 : 0, -this.vmSight - 0.004, kind === 'pistol' ? -0.3 : -0.25]
    const base = hip.map((v, i) => lerp(v, aimed[i], ads))
    const steady = 1 - 0.8 * ads
    h.position.set(
      base[0] + (Math.sin(st.bob) * 0.008 * bobA + st.swayX) * steady,
      base[1] + (-Math.abs(Math.cos(st.bob)) * 0.007 * bobA + st.swayY) * steady - (1 - st.draw) * 0.25 - rl * 0.1 - crouchDip * steady,
      base[2] + st.kick * lerp(0.035, 0.02, ads),
    )
    h.rotation.set(st.kick * lerp(0.1, 0.03, ads) + rl * 0.5 - (1 - st.draw) * 0.6, (0.06 + st.swayX * 2) * (1 - ads) + Math.sin(st.slash * Math.PI) * 0.8, rl * 0.4 + Math.sin(st.slash * Math.PI) * -0.6)
    // inspecting (F): turning it over to look at it; anything else you do puts it away
    if (st.inspect >= 0) {
      const busy = reloading || now < a.switchEnd || a.ads > 0.05 || a.scope || st.kick > 0.05 || st.slash > 0 || st.draw < 1
      const look = INSPECT[kind === 'knife' ? 'knife' : 'gun']
      if (busy) st.inspectStop = true // (once stopped, it stays stopped)
      if (st.inspectStop) {
        st.inspectOut = Math.max(0, st.inspectOut - dt * 6)
        if (st.inspectOut === 0) st.inspect = -1
      } else {
        st.inspect += dt / look.secs
        st.inspectOut = Math.min(1, st.inspectOut + dt * 6)
        if (st.inspect >= 1) st.inspect = -1
      }
      if (st.inspect >= 0) {
        const o = inspectPose(look.keys, st.inspect)
        const k = st.inspectOut
        h.position.x += o.x * k
        h.position.y += o.y * k
        h.position.z += o.z * k
        h.rotation.x += o.rx * k
        h.rotation.y += o.ry * k
        h.rotation.z += o.rz * k
      }
    }
    if (st.flash > 0) {
      st.flash -= dt
      this.vmFlash.visible = st.flash > 0
      this.vmFlash.material.rotation = Math.random() * 6
    }
    this.vm.visible = !(w.zoom && a.scope)
  }
  kick(w, silenced = false) {
    this.vmState.kick = Math.min(1, this.vmState.kick + (w.kind === 'sniper' || w.type === 'shotgun' ? 1 : w.kind === 'pistol' ? 0.7 : 0.45))
    this.vmState.flash = silenced ? 0 : 0.05
    this.vmState.inspectStop = true
  }
  slash() {
    this.vmState.slash = 1
    this.vmState.inspectStop = true
  }
  /** Starts the inspect animation (F) for what's in your hands, or starts it over. */
  inspect() {
    if (!this.vmGunId) return
    this.vmState.inspect = 0
    this.vmState.inspectOut = 1
    this.vmState.inspectStop = false
  }
  get inspecting() {
    return this.vmState.inspect >= 0
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
