// What Zombies adds to the scene: the perk machines, chalk drawings of the guns on the walls, the
// Mystery Box (with its beam of light, the guns spinning in it, the teddy bear), the Pack-a-Punch,
// the power switch, the power-ups zombies drop, and a mark over anyone who's down.

import * as THREE from './lib/three.min.js'
import { PERKS } from './zombies.js'
import { WEAPONS } from './weapons.js'
import { gunIcon } from './icons.js'

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o })
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m)
/** Puts an object at (x, y, z) (and turns it rx about x), and returns it. */
const put = (o, x, y, z, rx = 0) => {
  o.position.set(x, y, z)
  o.rotation.x = rx
  return o
}
/** A soft round glow (for additive sprites). */
const glowTex = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, 'rgba(255,255,255,1)')
  gr.addColorStop(0.4, 'rgba(255,255,255,0.45)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 64)
})
const glow = (color, size, opacity = 0.8) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity }))
  s.scale.setScalar(size)
  return s
}
/** A lit sign: text on a coloured panel. */
function signTex(text, bg, fg, w = 256, h = 64, font = 30) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.strokeStyle = fg
    g.lineWidth = 4
    g.strokeRect(4, 4, w - 8, h - 8)
    g.fillStyle = fg
    g.font = `bold ${font}px Georgia, serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    let size = font
    while (g.measureText(text).width > w - 24 && size > 10) g.font = `bold ${--size}px Georgia, serif`
    g.fillText(text, w / 2, h / 2 + 2)
  })
}
/** The front of a perk machine: a big bottle with the perk's colour. */
function bottleTex(color, label) {
  return canvasTex(128, 256, (g) => {
    g.fillStyle = '#16120e'
    g.fillRect(0, 0, 128, 256)
    g.fillStyle = color
    g.beginPath()
    g.moveTo(52, 30)
    g.lineTo(76, 30)
    g.lineTo(76, 80)
    g.quadraticCurveTo(100, 95, 100, 130)
    g.lineTo(100, 225)
    g.quadraticCurveTo(64, 240, 28, 225)
    g.lineTo(28, 130)
    g.quadraticCurveTo(28, 95, 52, 80)
    g.closePath()
    g.fill()
    g.fillStyle = '#f2ead8'
    g.fillRect(30, 140, 68, 50)
    g.fillStyle = '#1a1a1a'
    g.font = 'bold 15px Georgia, serif'
    g.textAlign = 'center'
    const words = label.split(' ')
    words.slice(0, 3).forEach((w, k) => g.fillText(w, 64, 158 + k * 15 - (words.length > 2 ? 6 : 0)))
  })
}
/** The icons on the power-ups. */
const PU_ICON = { ammo: '▤', insta: '☠', double: 'x2', nuke: '☢', sale: '$' }
function powerUpTex(type) {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = 'rgba(0,0,0,0)'
    g.fillRect(0, 0, 128, 128)
    g.fillStyle = '#d8ffd0'
    g.strokeStyle = '#1d5a12'
    g.lineWidth = 6
    g.font = `bold ${type === 'double' ? 70 : 84}px Arial, sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.strokeText(PU_ICON[type], 64, 68)
    g.fillText(PU_ICON[type], 64, 68)
  })
}
/** A chalk drawing of a gun, from its icon (filled in when the picture's ready). */
function chalkTex(id) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 100
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  const url = gunIcon(id, 256, 100)
  if (!url) return t
  const img = new Image()
  img.onload = () => {
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0, 256, 100)
    const d = g.getImageData(0, 0, 256, 100)
    const p = d.data
    // the outline (where the picture's edge is), chalky and broken up
    const a = (x, y) => (x < 0 || y < 0 || x >= 256 || y >= 100 ? 0 : p[(y * 256 + x) * 4 + 3])
    const out = new Uint8ClampedArray(p.length)
    let s = 7
    const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296)
    for (let y = 0; y < 100; y++)
      for (let x = 0; x < 256; x++) {
        const here = a(x, y) > 40
        const edge = here && (a(x - 2, y) < 40 || a(x + 2, y) < 40 || a(x, y - 2) < 40 || a(x, y + 2) < 40)
        const fill = here && rnd() < 0.08
        if ((edge && rnd() < 0.85) || fill) {
          const o = (y * 256 + x) * 4
          out[o] = out[o + 1] = 235
          out[o + 2] = 225
          out[o + 3] = edge ? 230 : 110
        }
      }
    g.clearRect(0, 0, 256, 100)
    g.putImageData(new ImageData(out, 256, 100), 0, 0)
    t.needsUpdate = true
  }
  img.src = url
  return t
}

export class ZView {
  constructor(view, game) {
    this.view = view
    this.g = game
    this.z = game.z
    this.root = new THREE.Group()
    view.scene.add(this.root)
    this.perkSigns = []
    this.gunModels = new Map()
    // the Pack-a-Punch camo: a slow blue-violet swirl
    const ptex = canvasTex(64, 64, (g) => {
      for (let y = 0; y < 64; y++)
        for (let x = 0; x < 64; x++) {
          const v = Math.sin(x * 0.3 + Math.sin(y * 0.2) * 2) * 0.5 + 0.5
          g.fillStyle = `rgb(${40 + v * 110},${30 + v * 40},${120 + v * 135})`
          g.fillRect(x, y, 1, 1)
        }
    })
    ptex.wrapS = ptex.wrapT = THREE.RepeatWrapping
    ptex.repeat.set(3, 3)
    this.papMat = new THREE.MeshPhongMaterial({ map: ptex, shininess: 90, specular: '#9f8cff', emissive: '#2a1660' })
    this.papTex = ptex
    for (const s of this.z.stations) this.root.add(this.station(s))
    this.boxModel = this.buildBox()
    this.root.add(this.boxModel)
    this.drops = new Map()
    this.marks = new Map()
  }
  /** Where a station's model goes: its back against the wall, facing out. */
  place(o, s, back = 0.28, y = 0) {
    const [dx, dz] = s.wall
    o.position.set(s.x + dx * back, s.y + y, s.z + dz * back)
    o.rotation.y = Math.atan2(-dx, -dz)
    return o
  }
  station(s) {
    const g = new THREE.Group()
    if (s.kind === 'perk') {
      const p = PERKS[s.perk]
      const body = box(0.95, 2.0, 0.7, lam(p.color))
      body.position.y = 1.0
      g.add(body)
      g.add(put(box(1.0, 0.08, 0.75, lam('#2a2622')), 0, 0.04, 0))
      const front = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.3), new THREE.MeshBasicMaterial({ map: bottleTex(p.color, p.name) }))
      front.position.set(0, 1.15, 0.351)
      g.add(front)
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.26), new THREE.MeshBasicMaterial({ map: signTex(p.name, '#120e0a', p.glow) }))
      sign.position.set(0, 2.15, 0.2)
      g.add(sign)
      g.add(put(box(0.4, 0.14, 0.12, lam('#111')), 0, 0.45, 0.36)) // the slot it comes out of
      const halo = glow(p.glow, 2.4, 0.35)
      halo.position.set(0, 1.6, 0.5)
      g.add(halo)
      this.perkSigns.push({ s, sign, halo, front, base: p.glow })
      return this.place(g, s, 0.12)
    }
    if (s.kind === 'wall') {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.47), new THREE.MeshBasicMaterial({ map: chalkTex(s.gun), transparent: true, depthWrite: false }))
      plane.position.y = 1.45
      g.add(plane)
      const price = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.18), new THREE.MeshBasicMaterial({ map: signTex(`${WEAPONS[s.gun].name} · ${s.price}`, 'rgba(0,0,0,0)', '#efe8d6', 256, 64, 26), transparent: true, depthWrite: false }))
      price.position.y = 1.1
      g.add(price)
      return this.place(g, s, 0.485)
    }
    if (s.kind === 'pap') {
      const dark = lam('#2c2a30')
      const base = box(1.7, 1.2, 1.0, dark)
      base.position.y = 0.6
      g.add(base)
      const top = box(1.5, 0.5, 0.8, lam('#3b3842'))
      top.position.y = 1.45
      g.add(top)
      for (const x of [-0.55, 0.55]) g.add(put(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 12), lam('#56506a')), x, 1.25, 0.42, Math.PI / 2))
      const mouth = box(0.9, 0.3, 0.05, new THREE.MeshBasicMaterial({ color: '#7a4dff' }))
      mouth.position.set(0, 1.0, 0.51)
      g.add(mouth)
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.3), new THREE.MeshBasicMaterial({ map: signTex('PACK-A-PUNCH', '#140f22', '#b79bff') }))
      sign.position.set(0, 1.95, 0.25)
      g.add(sign)
      const halo = glow('#8a5cff', 3.2, 0.3)
      halo.position.set(0, 1.2, 0.7)
      g.add(halo)
      this.pap = { g, mouth, halo, gun: null, gunId: null }
      return this.place(g, s, 0.0)
    }
    if (s.kind === 'power') {
      const panel = box(0.6, 0.9, 0.16, lam('#4a4f45'))
      panel.position.y = 1.25
      g.add(panel)
      g.add(put(box(0.5, 0.12, 0.05, new THREE.MeshBasicMaterial({ map: signTex('POWER', '#1a1a14', '#ffcc33', 128, 32, 22) })), 0, 1.62, 0.1))
      const lever = new THREE.Group()
      lever.position.set(0, 1.2, 0.1)
      lever.add(put(box(0.06, 0.4, 0.06, lam('#9a9a9a')), 0, 0.2, 0))
      lever.add(put(box(0.16, 0.08, 0.08, lam('#b0261c')), 0, 0.4, 0))
      lever.rotation.x = -0.6
      g.add(lever)
      const lamp = glow('#ff3a2a', 0.5, 0.9)
      lamp.position.set(0.22, 1.55, 0.15)
      g.add(lamp)
      this.power = { lever, lamp }
      return this.place(g, s, 0.4)
    }
    return g
  }
  buildBox() {
    const g = new THREE.Group()
    const wood = lam('#5b3a1e')
    const q = canvasTex(64, 64, (c) => {
      c.fillStyle = '#5b3a1e'
      c.fillRect(0, 0, 64, 64)
      c.fillStyle = '#e8dcc0'
      c.font = 'bold 48px Georgia, serif'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('?', 32, 36)
    })
    const qm = lam('#ffffff', { map: q })
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.6), [wood, wood, wood, wood, qm, qm])
    body.position.y = 0.25
    g.add(body)
    for (const x of [-0.72, 0.72]) g.add(put(box(0.06, 0.52, 0.62, lam('#8b8174')), x, 0.26, 0))
    const lid = new THREE.Group()
    lid.position.set(0, 0.5, -0.3)
    lid.add(put(box(1.5, 0.08, 0.6, wood), 0, 0.04, 0.3))
    g.add(lid)
    // the beam of light that shows where it is
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#bfe3ff', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }))
    beam.position.y = 20.5
    g.add(beam)
    const inside = glow('#d8f0ff', 1.6, 0.0)
    inside.position.y = 0.7
    g.add(inside)
    // the teddy bear (when the box decides to leave)
    const bear = new THREE.Group()
    const fur = lam('#8a5a32')
    bear.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), fur), 0, 0, 0))
    bear.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), fur), 0, 0.22, 0))
    for (const s of [-1, 1]) {
      bear.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), fur), s * 0.08, 0.32, 0))
      bear.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), fur), s * 0.15, 0.02, 0.04))
      bear.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), fur), s * 0.08, -0.15, 0.05))
    }
    bear.visible = false
    g.add(bear)
    this.box = { g, lid, beam, inside, bear, gun: null, gunId: null, spot: -1, cycle: 0 }
    return g
  }
  /** A gun model to float over the box or in the Pack-a-Punch (kept, per gun). */
  floatGun(id, pap = false) {
    const key = id + (pap ? '|pap' : '')
    if (!this.gunModels.has(key)) {
      const m = this.view.gunModelFor(id, pap ? this.papMat : null)
      m.scale.setScalar(1.6)
      this.gunModels.set(key, m)
    }
    return this.gunModels.get(key)
  }
  setFloat(holder, slot, id, pap = false) {
    if (holder[slot + 'Id'] === (id ? id + pap : null)) return
    if (holder[slot]) holder[slot].parent?.remove(holder[slot])
    holder[slot] = id ? this.floatGun(id, pap) : null
    holder[slot + 'Id'] = id ? id + pap : null
    if (holder[slot]) this.root.add(holder[slot])
  }

  update(dt, me) {
    const g = this.g
    const z = this.z
    const now = g.time
    this.papTex.offset.x = (this.papTex.offset.x + dt * 0.25) % 1
    this.papTex.offset.y = (this.papTex.offset.y + dt * 0.1) % 1
    // perk machines light up when the power's on (Quick Revive works without it)
    for (const p of this.perkSigns) {
      const lit = z.power || p.s.perk === 'revive'
      const gone = p.s.perk === 'revive' && z.solo && z.soloRevives >= 3
      p.sign.parent.visible = !gone
      p.halo.material.opacity = lit ? 0.3 + Math.sin(now * 3 + p.s.id) * 0.06 : 0
      p.sign.material.color.set(lit ? '#ffffff' : '#555555')
      p.front.material.color.set(lit ? '#ffffff' : '#666666')
    }
    if (this.power) {
      this.power.lever.rotation.x += ((z.power ? 0.7 : -0.6) - this.power.lever.rotation.x) * Math.min(1, dt * 10)
      this.power.lamp.material.color.set(z.power ? '#4dff5a' : '#ff3a2a')
    }
    // the box
    const b = z.box
    const at = z.boxAt
    const bx = this.box
    if (at && bx.spot !== b.spot) {
      bx.spot = b.spot
      this.place(bx.g, at, 0.15)
    }
    const away = b.state === 'away'
    bx.g.visible = !!at && !away
    const open = b.state === 'spin' || b.state === 'offer' || b.state === 'bear'
    bx.lid.rotation.x += ((open ? -1.9 : 0) - bx.lid.rotation.x) * Math.min(1, dt * 6)
    bx.beam.visible = b.state === 'idle'
    bx.beam.material.opacity = 0.12 + Math.sin(now * 2) * 0.04
    bx.inside.material.opacity = open ? 0.8 : 0
    let gun = null
    if (b.state === 'spin') {
      // the guns flick past, slowing down
      const left = b.until - now
      bx.cycle -= dt
      if (bx.cycle <= 0) {
        const pool = Object.keys(WEAPONS).filter((id) => WEAPONS[id].mag && WEAPONS[id].slot !== 'zeus')
        bx.cur = left < 0.5 ? b.gun : pool[Math.floor(Math.random() * pool.length)]
        bx.cycle = 0.07 + Math.max(0, 1.2 - left) * 0.12
      }
      gun = bx.cur
    } else if (b.state === 'offer') gun = b.gun
    this.setFloat(bx, 'gun', gun)
    if (bx.gun && at) {
      const rise = b.state === 'spin' ? Math.min(1, (4 - (b.until - now)) / 3.5) : 1
      const sink = b.state === 'offer' ? Math.max(0, 1 - (b.until - now) / 10) : 0
      const [dx, dz] = at.wall
      bx.gun.position.set(at.x + dx * 0.15, at.y + 0.6 + rise * 0.5 - sink * 0.45, at.z + dz * 0.15)
      bx.gun.rotation.set(0, Math.atan2(-dx, -dz) + Math.PI / 2, 0)
    }
    bx.bear.visible = b.state === 'bear'
    if (bx.bear.visible) {
      const t = 2.5 - (b.until - now)
      bx.bear.position.set(0, 0.7 + t * 0.35, 0)
      bx.bear.rotation.y = t * 3
      bx.g.position.y = at.y + Math.max(0, t - 1.5) * 1.5
      bx.g.rotation.z = Math.sin(t * 20) * 0.03 * t
    } else if (at) {
      bx.g.position.y = at.y
      bx.g.rotation.z = 0
    }
    // the Pack-a-Punch: the gun inside while it works, then held out
    if (this.pap) {
      const p = z.pap
      const s = z.stations.find((x) => x.kind === 'pap')
      this.pap.mouth.material.color.set(z.power ? (p.state === 'working' ? (now % 0.3 < 0.15 ? '#c9b0ff' : '#7a4dff') : '#7a4dff') : '#2a2440')
      this.pap.halo.material.opacity = z.power ? 0.3 + (p.state === 'working' ? 0.3 : 0) : 0
      this.setFloat(this.pap, 'gun', p.state === 'working' || p.state === 'ready' ? p.gun?.id : null, p.state === 'ready')
      if (this.pap.gun && s) {
        const [dx, dz] = s.wall
        const out = p.state === 'ready' ? 0.75 : 0.3
        this.pap.gun.position.set(s.x - dx * out, s.y + 1.05, s.z - dz * out)
        this.pap.gun.rotation.set(0, Math.atan2(-dx, -dz) + Math.PI / 2 + (p.state === 'working' ? now * 4 : 0), 0)
      }
    }
    // power-ups on the floor: bob, spin, blink before they go
    const live = new Set()
    for (const d of z.drops) {
      live.add(d.id)
      let o = this.drops.get(d.id)
      if (!o) {
        o = new THREE.Group()
        const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: powerUpTex(d.type), transparent: true, depthWrite: false }))
        icon.scale.setScalar(0.75)
        o.add(icon)
        o.add(glow('#5dff4a', 1.5, 0.6))
        o.position.set(d.x, d.y + 0.9, d.z)
        this.root.add(o)
        this.drops.set(d.id, o)
      }
      o.position.y = d.y + 0.9 + Math.sin(now * 3 + d.x) * 0.1
      const left = d.until - now
      o.visible = left > 6 || now % 0.4 < (left > 3 ? 0.28 : 0.18)
    }
    for (const [id, o] of this.drops)
      if (!live.has(id)) {
        this.root.remove(o)
        this.drops.delete(id)
      }
    // a mark over anyone who's down (seen through walls)
    for (const a of z.survivors) {
      let m = this.marks.get(a.id)
      const show = a.alive && a.down && a !== me
      if (!m && show) {
        m = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex('✚', 'rgba(0,0,0,0)', '#ffffff', 64, 64, 50), transparent: true, depthWrite: false, depthTest: false }))
        m.scale.setScalar(0.6)
        m.renderOrder = 10
        this.root.add(m)
        this.marks.set(a.id, m)
      }
      if (!m) continue
      m.visible = show
      if (show) {
        m.position.set(a.pos.x, a.pos.y + 1.3, a.pos.z)
        const left = Math.max(0, (a.bleedAt - now) / 30)
        m.material.color.setRGB(1, 0.25 + left * 0.75, 0.25 + left * 0.75)
      }
    }
  }
  dispose() {
    this.view.scene?.remove(this.root)
  }
}
