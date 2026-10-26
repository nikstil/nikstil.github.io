// D in 3D. The bar is a visor of blocks wrapped round the head: it has depth, catches the light, turns
// with the face and is seen in perspective, and whatever swings behind the head is hidden by it.
// The MOSAIC style is the same visor, each block coloured by what the camera sees behind it, glitching.
// Drawn with WebGL2 into a canvas of its own, which the page lays over the camera picture.

// Shared by every shader: the face's own space (in face widths) placed in the video's pixels, then the camera.
const PROJECT = `
uniform vec3 uO;      // between the eyes, in video pixels (x right, y down, z away from the camera)
uniform mat3 uAxes;   // the face's axes there: across (towards its left), down, and into the head
uniform float uF;     // the face's width in pixels, the unit of its own space
uniform vec2 uSize;   // the video, in pixels
uniform float uFocal; // the camera's focal length in pixels (a guess: webcams are much alike)
uniform float uR;     // the visor's radius, in face widths
uniform float uAxisZ; // and how far behind the eyes its axis runs
vec3 world(vec3 local) { return uO + uAxes * (local * uF); }
// a point on the visor: so far along it (measured on its radius), so far down, so far from its axis
vec3 visor(float along, float down, float r) {
  float th = along / uR;
  return vec3(r * sin(th), down, uAxisZ - r * cos(th));
}
// perspective about the middle of the picture: nearer than the eyes comes out bigger, further smaller
float depthScale(vec3 P) { return (uFocal + P.z - uO.z) / uFocal; }
vec2 screenOf(vec3 P) { vec2 c = uSize * 0.5; return c + (P.xy - c) / depthScale(P); }
vec4 project(vec3 P) {
  float s = depthScale(P);
  vec2 scr = screenOf(P);
  vec2 ndc = vec2(scr.x / uSize.x * 2.0 - 1.0, 1.0 - scr.y / uSize.y * 2.0);
  // depth as an ordinary perspective camera keeps it (1 - 1/s), so it runs true across each triangle
  return vec4(ndc * s, 2.0 * (s - 1.0), s);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`

const BLOCK_VS = `#version 300 es
layout(location = 0) in vec3 aCorner; // the unit block: x along the visor, y down, z out of it
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUV;     // across each side of the block, for its bevel
layout(location = 3) in vec4 aCell;   // each block: column, row, height (in blocks), shade
${PROJECT}
uniform float uCell, uCX, uEyeRow, uBack, uHScale, uTick, uGlitch, uTear;
out vec3 vN;
out vec2 vUV;
flat out vec4 vCell;
flat out vec2 vSample;
flat out float vLod;
void main() {
  // a glitch slides a few rows sideways (more of them, further, in a burst)
  float on = step(1.0 - (0.06 + 0.4 * uGlitch), hash(vec2(aCell.y, uTick)));
  float tear = uTear * on * (hash(vec2(aCell.y + 17.0, uTick)) - 0.5) * (1.5 + 6.0 * uGlitch);
  float along = (aCell.x + aCorner.x + tear - uCX) * uCell;
  float r = uR + (aCorner.z * (aCell.z * uHScale + uBack) - uBack) * uCell;
  vec3 P = world(visor(along, (aCell.y + aCorner.y - uEyeRow) * uCell, r));
  gl_Position = project(P);
  float th = along / uR;
  vN = uAxes * (aNormal.x * vec3(cos(th), 0.0, sin(th)) + aNormal.y * vec3(0.0, 1.0, 0.0) + aNormal.z * vec3(sin(th), 0.0, -cos(th)));
  vUV = aUV;
  vCell = aCell;
  // for the mosaic: what the camera sees behind the middle of this block (where it was before any tear),
  // averaged over about a block's worth of pixels
  vec3 C = world(visor((aCell.x + 0.5 - uCX) * uCell, (aCell.y + 0.5 - uEyeRow) * uCell, uR));
  vSample = screenOf(C) / uSize;
  vLod = log2(max(uCell * uF / depthScale(C), 1.0)) - 0.5;
}`

const BLOCK_FS = `#version 300 es
precision highp float;
in vec3 vN;
in vec2 vUV;
flat in vec4 vCell;
flat in vec2 vSample;
flat in float vLod;
uniform int uMode; // 0: the black bar, 1: the mosaic
uniform float uAlpha, uTick, uGlitch;
uniform sampler2D uVideo;
out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 N = normalize(vN);
  float lit = max(dot(N, normalize(vec3(-0.35, -0.8, -0.5))), 0.0); // light from above, a little left, in front
  float facing = clamp(-N.z, 0.0, 1.0); // 1 on the sides turned to the camera
  float edge = min(min(vUV.x, 1.0 - vUV.x), min(vUV.y, 1.0 - vUV.y));
  float bevel = 1.0 - smoothstep(0.0, 0.07, edge);
  vec3 col;
  if (uMode == 0) {
    // black, but the sides and edges catch a little light so the blocks read as blocks
    col = vec3(vCell.w) * (0.8 + 0.4 * facing) + vec3(0.15, 0.15, 0.17) * pow(lit, 1.6) * (1.0 - 0.75 * facing) + vec3(0.03) * bevel;
  } else {
    // the picture behind, split into red, green and blue a little apart, in a few flat tones
    float split = 0.003 + 0.014 * uGlitch;
    col = vec3(textureLod(uVideo, vSample + vec2(split, 0.0), vLod).r, textureLod(uVideo, vSample, vLod).g, textureLod(uVideo, vSample - vec2(split, 0.0), vLod).b);
    col = floor(col * 7.0 + 0.5) / 7.0;
    col *= 0.88 + 0.24 * hash(vCell.xy + floor(uTick / 4.0));
    // now and then a block breaks into neon red, cyan or yellow
    float hc = hash(vCell.xy * 1.31 + vec2(uTick * 0.71, 3.1));
    float pc = 0.012 + 0.1 * uGlitch;
    if (hc < pc * 0.45) col = mix(col, vec3(1.0, 0.05, 0.25), 0.85);
    else if (hc < pc * 0.85) col = mix(col, vec3(0.0, 0.94, 1.0), 0.8);
    else if (hc < pc) col = vec3(0.99, 0.93, 0.04);
    col = mix(col, col * vec3(0.82, 1.0, 1.1), 0.6); // a cold cast
    col *= mix(0.4, 1.0, facing) + 0.3 * pow(lit, 2.0) * (1.0 - facing); // the sides darker
    col *= mix(1.0, 0.5, bevel); // dark seams between blocks
    col *= 0.84 + 0.16 * step(1.5, mod(gl_FragCoord.y, 3.0)); // scanlines
  }
  outColor = vec4(col * uAlpha, uAlpha);
}`

// The head itself, drawn only into the depth buffer, so the visor's far end hides behind it.
const HEAD_VS = `#version 300 es
layout(location = 0) in vec3 aPos;
${PROJECT}
uniform vec3 uHeadC, uHeadR;
void main() { gl_Position = project(world(uHeadC + aPos * uHeadR)); }`

const HEAD_FS = `#version 300 es
precision mediump float;
out vec4 outColor;
void main() { outColor = vec4(0.0); }`

// The drawn eyes: a picture (drawn by the page) on a strip just in front of the visor.
const EYES_VS = `#version 300 es
layout(location = 0) in vec2 aUV;
${PROJECT}
uniform vec2 uStrip; // half its length along the visor, and half its height, in face widths
uniform float uRadius;
out vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = project(world(visor((aUV.x * 2.0 - 1.0) * uStrip.x, (aUV.y * 2.0 - 1.0) * uStrip.y, uRadius)));
}`

const EYES_FS = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform sampler2D uEyes;
uniform float uAlpha;
out vec4 outColor;
void main() { outColor = texture(uEyes, vUV) * uAlpha; }`

function compile(gl, vs, fs) {
  const prog = gl.createProgram()
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('D: shader: ' + gl.getShaderInfoLog(sh))
    gl.attachShader(prog, sh)
  }
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('D: program: ' + gl.getProgramInfoLog(prog))
  const u = {}
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS)
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(prog, i).name.replace(/\[0\]$/, '')
    u[name] = gl.getUniformLocation(prog, name)
  }
  return { prog, u }
}

/** A unit block: for each of its six sides, four corners with the side's normal and a 0–1 square across it. */
function blockMesh() {
  const v = [], idx = []
  for (let a = 0; a < 3; a++) {
    for (const side of [0, 1]) {
      const b = (a + 1) % 3, c = (a + 2) % 3, base = v.length / 8
      for (const [p, q] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
        const corner = [0, 0, 0], normal = [0, 0, 0]
        corner[a] = side; corner[b] = p; corner[c] = q
        normal[a] = side ? 1 : -1
        v.push(...corner, ...normal, p, q)
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
  }
  return { v: new Float32Array(v), idx: new Uint16Array(idx) }
}

function sphereMesh(lat = 14, lon = 24) {
  const v = [], idx = []
  for (let i = 0; i <= lat; i++) {
    const t = (i / lat) * Math.PI
    for (let j = 0; j <= lon; j++) {
      const p = (j / lon) * Math.PI * 2
      v.push(Math.sin(t) * Math.cos(p), Math.cos(t), Math.sin(t) * Math.sin(p))
    }
  }
  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      const a = i * (lon + 1) + j, b = a + lon + 1
      idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }
  return { v: new Float32Array(v), idx: new Uint16Array(idx) }
}

function stripMesh(n = 32) {
  const v = []
  for (let i = 0; i <= n; i++) v.push(i / n, 0, i / n, 1)
  return new Float32Array(v)
}

/**
 * The 3D renderer, or null where WebGL2 isn't available (the page then draws its flat bar).
 * cfg: { cols, rows, cx, eyeRow, cell, radius, axisZ, back, head: { c, r }, strip: { w, h, radius, px: [w, h] }, focal }
 */
export function createRenderer(cfg) {
  const canvas = document.createElement('canvas')
  let gl = null
  try {
    gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, preserveDrawingBuffer: true })
  } catch (e) {}
  if (!gl) return null
  let block, head, eyes
  try {
    block = compile(gl, BLOCK_VS, BLOCK_FS)
    head = compile(gl, HEAD_VS, HEAD_FS)
    eyes = compile(gl, EYES_VS, EYES_FS)
  } catch (e) {
    console.warn(e)
    return null
  }

  const buffer = (target, data) => {
    const b = gl.createBuffer()
    gl.bindBuffer(target, b)
    gl.bufferData(target, data, gl.STATIC_DRAW)
    return b
  }

  const cube = blockMesh()
  const cubeV = buffer(gl.ARRAY_BUFFER, cube.v)
  const cubeI = buffer(gl.ELEMENT_ARRAY_BUFFER, cube.idx)

  const sphere = sphereMesh()
  const headVao = gl.createVertexArray()
  gl.bindVertexArray(headVao)
  buffer(gl.ARRAY_BUFFER, sphere.v)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0)
  buffer(gl.ELEMENT_ARRAY_BUFFER, sphere.idx)

  const strip = stripMesh()
  const stripVao = gl.createVertexArray()
  gl.bindVertexArray(stripVao)
  buffer(gl.ARRAY_BUFFER, strip)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0)
  gl.bindVertexArray(null)

  const texture = (filter) => {
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }
  const videoTex = texture(gl.LINEAR_MIPMAP_LINEAR)

  // one of these per face on screen
  const pool = []
  const kit = (i) => {
    if (pool[i]) return pool[i]
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeV)
    for (const [loc, size, off] of [[0, 3, 0], [1, 3, 12], [2, 2, 24]]) {
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 32, off)
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeI)
    const inst = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, inst)
    gl.bufferData(gl.ARRAY_BUFFER, cfg.cols * cfg.rows * 16, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(3)
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 16, 0)
    gl.vertexAttribDivisor(3, 1)
    gl.bindVertexArray(null)
    const ec = document.createElement('canvas')
    ec.width = cfg.strip.px[0]
    ec.height = cfg.strip.px[1]
    pool[i] = { vao, inst, data: new Float32Array(cfg.cols * cfg.rows * 4), eyeCanvas: ec, eyeCtx: ec.getContext('2d'), eyeTex: texture(gl.LINEAR) }
    return pool[i]
  }

  const shared = (p, s, w, h) => {
    const { u } = p
    gl.uniform3f(u.uO, s.O.x, s.O.y, s.O.z)
    gl.uniformMatrix3fv(u.uAxes, false, [...s.ax, ...s.ay, ...s.az])
    gl.uniform1f(u.uF, s.F)
    gl.uniform2f(u.uSize, w, h)
    gl.uniform1f(u.uFocal, cfg.focal * Math.max(w, h))
    gl.uniform1f(u.uR, cfg.radius)
    gl.uniform1f(u.uAxisZ, cfg.axisZ)
  }

  // the head, into the depth buffer only
  const drawHead = (s, w, h) => {
    gl.useProgram(head.prog)
    shared(head, s, w, h)
    gl.uniform3f(head.u.uHeadC, ...cfg.head.c)
    gl.uniform3f(head.u.uHeadR, ...cfg.head.r)
    gl.colorMask(false, false, false, false)
    gl.depthMask(true)
    gl.depthFunc(gl.LESS)
    gl.bindVertexArray(headVao)
    gl.drawElements(gl.TRIANGLES, sphere.idx.length, gl.UNSIGNED_SHORT, 0)
    gl.colorMask(true, true, true, true)
  }

  let lost = false
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true })

  return {
    canvas,
    get ok() { return !lost },
    /**
     * Draws every face. opts: { mode: 'bar' | 'mosaic', video, tick, glitch, drawEyes(ctx, w, h, slot) }
     * Each slot needs alpha, O {x,y,z}, ax/ay/az [3], F, and bar { cells, h, shade }.
     */
    render(slots, w, h, opts) {
      if (lost) return
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
      gl.viewport(0, 0, w, h)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      const mosaic = opts.mode === 'mosaic'
      if (mosaic) {
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, videoTex)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, opts.video)
        gl.generateMipmap(gl.TEXTURE_2D)
      }
      gl.enable(gl.DEPTH_TEST)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      // furthest face first; each face only hides behind its own head
      const order = slots.filter((s) => s.alpha > 0.01 && s.O).sort((a, b) => a.F - b.F)
      order.forEach((s, i) => {
        const k = kit(i)
        gl.clear(gl.DEPTH_BUFFER_BIT)

        drawHead(s, w, h)

        // the blocks
        const { cells, h: heights, shade } = s.bar
        let n = 0
        for (let j = 0; j < cells.length; j++) {
          if (!cells[j]) continue
          k.data[n * 4] = j % cfg.cols
          k.data[n * 4 + 1] = Math.floor(j / cfg.cols)
          k.data[n * 4 + 2] = heights[j]
          k.data[n * 4 + 3] = shade[j] / 255
          n++
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, k.inst)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, k.data, 0, n * 4)
        gl.useProgram(block.prog)
        shared(block, s, w, h)
        const u = block.u
        gl.uniform1f(u.uCell, cfg.cell)
        gl.uniform1f(u.uCX, cfg.cx)
        gl.uniform1f(u.uEyeRow, cfg.eyeRow)
        gl.uniform1f(u.uBack, cfg.back)
        gl.uniform1f(u.uHScale, mosaic ? 0.6 : 1)
        gl.uniform1f(u.uTick, opts.tick)
        gl.uniform1f(u.uGlitch, mosaic ? opts.glitch : 0)
        gl.uniform1f(u.uTear, mosaic ? 1 : 0)
        gl.uniform1i(u.uMode, mosaic ? 1 : 0)
        gl.uniform1f(u.uAlpha, s.alpha)
        if (u.uVideo) gl.uniform1i(u.uVideo, 0)
        if (mosaic) {
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, videoTex)
        }
        gl.bindVertexArray(k.vao)
        gl.drawElementsInstanced(gl.TRIANGLES, cube.idx.length, gl.UNSIGNED_SHORT, 0, n)

        // the drawn eyes, on their strip just in front of the blocks round the eyes. They're always on the
        // visor's outside, so only the head can hide them: testing them against the blocks too only made
        // antialiased seams where the two are a hair apart.
        if (!mosaic && opts.drawEyes) {
          gl.clear(gl.DEPTH_BUFFER_BIT)
          drawHead(s, w, h)
          opts.drawEyes(k.eyeCtx, k.eyeCanvas.width, k.eyeCanvas.height, s)
          gl.activeTexture(gl.TEXTURE1)
          gl.bindTexture(gl.TEXTURE_2D, k.eyeTex)
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, k.eyeCanvas)
          gl.useProgram(eyes.prog)
          shared(eyes, s, w, h)
          gl.uniform2f(eyes.u.uStrip, cfg.strip.w, cfg.strip.h)
          gl.uniform1f(eyes.u.uRadius, cfg.strip.radius)
          gl.uniform1i(eyes.u.uEyes, 1)
          gl.uniform1f(eyes.u.uAlpha, s.alpha)
          gl.depthMask(false)
          gl.depthFunc(gl.LEQUAL)
          gl.bindVertexArray(stripVao)
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, strip.length / 2)
          gl.depthMask(true)
          gl.activeTexture(gl.TEXTURE0)
        }
      })
      gl.bindVertexArray(null)
    },
  }
}

/** Where a point of a face's own space lands in the video, worked out exactly as the shaders do. */
export function screenPoint(cfg, s, local, w, h) {
  const F = s.F
  const P = [0, 1, 2].map((i) => [s.O.x, s.O.y, s.O.z][i] + (s.ax[i] * local[0] + s.ay[i] * local[1] + s.az[i] * local[2]) * F)
  const k = (cfg.focal * Math.max(w, h) + P[2] - s.O.z) / (cfg.focal * Math.max(w, h))
  return { x: w / 2 + (P[0] - w / 2) / k, y: h / 2 + (P[1] - h / 2) / k }
}

/** A point on the visor (along it and down it in face widths, at radius r), in the face's own space. */
export function visorPoint(cfg, along, down, r) {
  const th = along / cfg.radius
  return [r * Math.sin(th), down, cfg.axisZ - r * Math.cos(th)]
}
