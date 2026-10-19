import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart({ srcDirectory: 'src' }),
    react(),
    nitro({
      renderer: false,
      publicAssets: [
        {
          dir: fileURLToPath(new URL('./deck/dist', import.meta.url)),
          baseURL: '/deck',
          maxAge: 0,
          fallthrough: false,
        },
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
})
