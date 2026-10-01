// Renders the link-preview images (og:image) from og/cards.html and screenshots of the real pages.
//
//   python3 -m http.server 8080          # from the repo root, in another terminal
//   node og/render.mjs                   # needs Playwright (npm i -g playwright)
//
// Writes og-image.png (nikstil.com), translatr-src/public/og-image.png (copied into translatr/ by
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
// The cards
const out = { os: join(root, 'og-image.png'), translatr: join(root, 'translatr-src', 'public', 'og-image.png'), doom: join(root, 'doomscroll', 'og-image.png') }
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
