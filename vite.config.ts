import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { nitro } from 'nitro/vite'
import { defineConfig, type Plugin } from 'vite'
import { fileURLToPath, pathToFileURL } from 'node:url'

const deckDir = fileURLToPath(new URL('./deck/', import.meta.url))
const deckCss = fileURLToPath(new URL('./deck/src/index.css', import.meta.url))
const deckSrc = fileURLToPath(new URL('./deck/src/', import.meta.url))
const requireFromDeck = createRequire(new URL('./deck/package.json', import.meta.url))

/** The slides stay in deck/, but they render inside this app. Their Tailwind v3 build is scoped to #deck. */
function deckCssPlugin(): Plugin {
  return {
    name: 'deck-css',
    enforce: 'pre',
    async transform(code, id) {
      if (id.split('?')[0] !== deckCss) return null
      const postcss = requireFromDeck('postcss')
      const tailwindcss = requireFromDeck('tailwindcss')
      const autoprefixer = requireFromDeck('autoprefixer')
      const userConfig = (await import(pathToFileURL(`${deckDir}tailwind.config.js`).href)).default
      const result = await postcss([
        tailwindcss({
          ...userConfig,
          content: [`${deckDir}index.html`, `${deckDir}src/**/*.{ts,tsx}`],
          important: '#deck',
          corePlugins: { preflight: false },
        }),
        autoprefixer(),
      ]).process(code, { from: deckCss })
      return { code: result.css, map: result.map?.toString() }
    },
    configureServer(server) {
      server.watcher.add(deckSrc)
    },
    handleHotUpdate(ctx) {
      if (!ctx.file.startsWith(deckSrc) || ctx.file === deckCss) return
      const mods = ctx.server.moduleGraph.getModulesByFile(deckCss)
      if (!mods) return
      return [...ctx.modules, ...mods]
    },
  }
}

export default defineConfig(() => ({
  resolve: {
    alias: [{ find: /^@\//, replacement: deckSrc }],
  },
  plugins: [
    deckCssPlugin(),
    tailwindcss(),
    tanstackStart({ srcDirectory: 'src' }),
    react(),
    nitro({
      renderer: false,
      publicAssets: [
        {
          // Slide content references photos with root-relative image URLs.
          dir: fileURLToPath(new URL('./deck/public/images', import.meta.url)),
          baseURL: '/images',
          maxAge: 0,
          fallthrough: false,
        },
      ],
    }),
  ],
}))
