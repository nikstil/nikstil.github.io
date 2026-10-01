// Downloads the cat photos (CC0, Wikimedia Commons) into src/assets/cats/ so the game hosts them
// itself instead of hotlinking. Usage: npm run fetch-cats   (then rebuild the site)

import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'src', 'assets', 'cats')
const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { CAT_PHOTO_SOURCES } = await vite.ssrLoadModule('/src/data/gameData.js')
await vite.close()
await mkdir(out, { recursive: true })

for (const [mood, set] of Object.entries(CAT_PHOTO_SOURCES)) {
  for (const [i, url] of set.frames.entries()) {
    const res = await fetch(url, { headers: { 'User-Agent': 'TRANSLATR-game/1.0 (https://nikstil.com/translatr; self-hosting CC0 photos)' } })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.startsWith('image/')) throw new Error(`${mood}-${i}: HTTP ${res.status} (${type}) for ${url}`)
    const bytes = Buffer.from(await res.arrayBuffer())
    await writeFile(join(out, `${mood}-${i}.jpg`), bytes)
    console.log(`✓ ${mood}-${i}.jpg  ${(bytes.length / 1024).toFixed(0)} KB  (${set.credit})`)
    await new Promise((r) => setTimeout(r, 1500)) // be polite to Wikimedia's servers
  }
}
console.log('Done. Rebuild the site to bundle them.')
