// Side-on pictures of guns (for the buy menu and the inventory), drawn once with a small
// offscreen renderer and kept as data URLs.

import * as THREE from './lib/three.min.js'
import { buildGun } from './guns.js'

let r = null
let scene = null
let cam = null
const cache = new Map()

function setup() {
  const canvas = document.createElement('canvas')
  r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true })
  r.setPixelRatio(1)
  r.outputColorSpace = THREE.SRGBColorSpace
  scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight('#ffffff', '#5b5550', 2.4))
  const key = new THREE.DirectionalLight('#fff6e8', 2.2)
  key.position.set(2, 4, 3)
  scene.add(key)
  cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 20)
  cam.position.set(4, 0, 0)
  cam.lookAt(0, 0, 0)
}

/** A picture of gun `id` (w×h px). opts: { silenced, skin: Material, key }. Returns a data URL. */
export function gunIcon(id, w = 200, h = 80, opts = {}) {
  const key = `${id}|${w}|${h}|${opts.silenced}|${opts.key ?? ''}`
  if (cache.has(key)) return cache.get(key)
  let url = ''
  try {
    if (!r) setup()
    r.setSize(w, h, false)
    const g = buildGun(id, { detail: 2, silenced: opts.silenced ?? true, skin: opts.skin })
    // seen from the right side: the muzzle (-z) points right on screen
    scene.add(g)
    const box = new THREE.Box3().setFromObject(g)
    const size = box.getSize(new THREE.Vector3())
    const mid = box.getCenter(new THREE.Vector3())
    const aspect = w / h
    const half = Math.max(size.z / 2, (size.y / 2) * aspect) * 1.08
    cam.left = -half
    cam.right = half
    cam.top = half / aspect
    cam.bottom = -half / aspect
    cam.position.set(mid.x + 4, mid.y, mid.z)
    cam.lookAt(mid.x, mid.y, mid.z)
    cam.updateProjectionMatrix()
    r.setClearColor(0x000000, 0)
    r.render(scene, cam)
    url = r.domElement.toDataURL('image/png')
    scene.remove(g)
  } catch {
    url = ''
  }
  cache.set(key, url)
  return url
}
