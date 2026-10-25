import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import http from 'node:http'
import { nitro } from 'nitro/vite'
import { defineConfig, type Plugin } from 'vite'
import { fileURLToPath } from 'node:url'

const DECK_DEV_PORT = 5174

/** In dev, /deck is the deck Vite server so slide edits hot-reload. */
function deckDevProxy(): Plugin {
  return {
    name: 'deck-dev-proxy',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        if (url !== '/deck' && !url.startsWith('/deck/') && !url.startsWith('/deck?')) {
          next()
          return
        }
        if (url === '/deck' || url.startsWith('/deck?')) {
          const query = url.slice('/deck'.length)
          res.statusCode = 302
          res.setHeader('Location', `/deck/${query}`)
          res.end()
          return
        }

        const proxyReq = http.request(
          {
            hostname: '127.0.0.1',
            port: DECK_DEV_PORT,
            method: req.method,
            path: url,
            headers: {
              ...req.headers,
              host: `127.0.0.1:${DECK_DEV_PORT}`,
            },
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
            proxyRes.pipe(res)
          },
        )
        proxyReq.on('error', () => {
          if (res.headersSent) return
          res.statusCode = 502
          res.setHeader('content-type', 'text/plain; charset=utf-8')
          res.end('Deck dev server is not running.')
        })
        req.pipe(proxyReq)
      })
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [
    deckDevProxy(),
    tailwindcss(),
    tanstackStart({ srcDirectory: 'src' }),
    react(),
    nitro({
      renderer: false,
      publicAssets: [
        // Production serves the built deck. In dev the proxy above serves it with HMR.
        ...(command === 'build'
          ? [
              {
                dir: fileURLToPath(new URL('./deck/dist', import.meta.url)),
                baseURL: '/deck',
                maxAge: 0,
                fallthrough: false,
              },
            ]
          : []),
        {
          // Slide content also references photos with root-relative image URLs.
          dir: fileURLToPath(new URL('./deck/public/images', import.meta.url)),
          baseURL: '/images',
          maxAge: 0,
          fallthrough: false,
        },
      ],
    }),
  ],
}))
