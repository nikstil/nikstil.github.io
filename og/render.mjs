// Renders the link-preview images (og:image) from og/cards.html and screenshots of the real pages.
//
//   python3 -m http.server 8080          # from the repo root, in another terminal
//   node og/render.mjs                   # needs Playwright (npm i -g playwright)
//
// Writes og-image.png (nikstil.com), touchgrass/og-image.png, translatr-src/public/og-image.png (copied into translatr/ by
// `npm run build:site`, and here straight away) and doomscroll/og-image.png.
import { createRequire } from 'node:module'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
let chromium
try {
  ;({ chromium } = require('playwright'))
} catch {
  ;({ chromium } = createRequire(join(process.execPath, '../../lib/node_modules/'))('playwright'))
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const base = process.argv[2] ?? 'http://127.0.0.1:8080'
const shots = join(root, 'og', 'shots')
mkdirSync(shots, { recursive: true })

const browser = await chromium.launch()
const noOnline = (ctx) => ctx.route('**/site.json', (r) => r.fulfill({ contentType: 'application/json', body: '{}' }))

// TRANSLATR™, a few seconds into a speedrun
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } })
  await noOnline(ctx)
  const page = await ctx.newPage()
  await page.goto(`${base}/translatr/`)
  await page.getByText('Start the clock').click()
  await page.waitForTimeout(6000)
  await page.screenshot({ path: join(shots, 'translatr.png') })
  await ctx.close()
}
// DOOMSCROLL.EXE, E1M1
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  await noOnline(ctx)
  await ctx.addInitScript(() => localStorage.setItem('doomscroll-difficulty', '3'))
  const page = await ctx.newPage()
  await page.goto(`${base}/doomscroll/`)
  await page.locator('.ep').first().getByText('▶ Play').click()
  await page.waitForTimeout(900)
  const key = (code, ms) => page.evaluate(async ([code, ms]) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }))
    await new Promise((r) => setTimeout(r, ms))
    window.dispatchEvent(new KeyboardEvent('keyup', { code }))
  }, [code, ms])
  await key('KeyW', 700)
  await key('ArrowLeft', 480)
  await page.locator('#screen').screenshot({ path: join(shots, 'doom.png') })
  await ctx.close()
}
// TOUCHGRASS.EXE, a staged moment on the pool level
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${base}/touchgrass/?embed`)
  await page.waitForTimeout(800)
  await page.evaluate(() => {
    window.tg.begin('3-6', ['sun', 'pea', 'double', 'frost', 'coco', 'lily'])
    const g = window.tg.game
    g.update(3)
    g.sun = 325
    const P = (id, r, c) => g._addPlant(id, r, c, { free: true })
    for (let r = 0; r < 6; r++) {
      if (g.isWater(r)) for (const c of [0, 1, 2]) P('lily', r, c)
      P('sun', r, 0)
    }
    ;[['double', 0, 1], ['pea', 0, 2], ['frost', 1, 1], ['double', 1, 2], ['triple', 2, 1], ['kelp', 3, 4], ['pea', 3, 1], ['tiki', 4, 3], ['double', 4, 1], ['pea', 5, 1], ['frost', 5, 2], ['coco', 0, 5], ['cocotower', 4, 5], ['rug', 5, 5]].forEach(([id, r, c]) => P(id, r, c))
    ;[['vr', 0, 7.1], ['beanie', 1, 6.4], ['floatie', 2, 7.6], ['scuba', 3, 8.2], ['slush', 4, 7.9], ['cryptobro', 5, 6.9], ['scroller', 1, 8.6]].forEach(([id, r, x]) => g._spawn(id, r, x))
    for (let i = 0; i < 90; i++) g.update(1 / 60)
    g.drops.push({ id: 999, kind: 'sun', value: 25, x: 3.4, y: 1.2, to: 1.2, landed: true, landedAt: g.t, t: g.t, life: 99 })
    g.phase = 'won'
  })
  await page.waitForTimeout(300)
  await page.locator('#screen').screenshot({ path: join(shots, 'grass.png') })
  await ctx.close()
}
// The cards
const out = { os: join(root, 'og-image.png'), translatr: join(root, 'translatr-src', 'public', 'og-image.png'), doom: join(root, 'doomscroll', 'og-image.png'), grass: join(root, 'touchgrass', 'og-image.png') }
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 } })
const page = await ctx.newPage()
for (const [card, file] of Object.entries(out)) {
  await page.goto(`${base}/og/cards.html?card=${card}`)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: file })
  console.log(`✓ ${card} → ${file.slice(root.length + 1)}`)
}
copyFileSync(out.translatr, join(root, 'translatr', 'og-image.png'))
await browser.close()
