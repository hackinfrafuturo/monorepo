import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/** Dev server behind the site at /deck. Kept off 5173, which another app already uses. */
const DECK_DEV_PORT = 5174;

export default defineConfig(({ command }) => ({
  // `vite build` and `vite build --base=/deck/` set the production base on the CLI.
  base: command === "serve" ? "/deck/" : "/",
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: DECK_DEV_PORT,
    strictPort: true,
    cors: true,
    hmr: {
      host: "127.0.0.1",
      clientPort: DECK_DEV_PORT,
    },
  },
}));
