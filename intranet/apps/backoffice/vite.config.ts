import { defineConfig, loadEnv } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  // Runtime configuration stays on the server; no VITE_ credentials or define substitutions.
  if (mode === 'development')
    Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    plugins: [
      tailwindcss(),
      tanstackStart(),
      react(),
      nitro({ preset: 'node-server', renderer: false }),
    ],
    server: { host: '127.0.0.1', port: 3100, strictPort: true },
  }
})
