import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// The site's own shared modules (DOOMSCROLL's engine, levels, difficulties and sound live in
// /doomscroll/ in the repository, shared with nikstil.com/doomscroll/). The build leaves them as
// they are, loaded at runtime from nikstil.com; the dev server serves them from the repository.
const site = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE_MODULES = /^\/(doomscroll|online)\//
function siteModules() {
  let serve = false
  return {
    name: 'nikstil-site-modules',
    enforce: 'pre',
    configResolved(config) {
      serve = config.command === 'serve'
    },
    resolveId(id) {
      if (!SITE_MODULES.test(id)) return null
      return serve ? join(site, id) : { id, external: true }
    },
  }
}

export default defineConfig({
  plugins: [siteModules(), react(), tailwindcss()],
  server: { fs: { allow: [site] } },
  build: {
    rollupOptions: {
      output: {
        // React & co. rarely change: in their own chunk they stay cached across game updates.
        manualChunks: (id) => (id.includes('node_modules') ? 'vendor' : undefined),
      },
    },
  },
})
