# deck

The Infrastructure Hackathon sponsor deck, built as a Faces project (Vite + React + Tailwind CSS).

This package is part of the parent repository's pnpm workspace. The built deck is served at **/deck** on the main site ([hackinfrafuturo.cl/deck](https://hackinfrafuturo.cl/deck)) and is also deployed standalone to [deck.indies.la](https://deck.indies.la) via Cloudflare (see `wrangler.jsonc`).

## Commands

Run from the repository root:

```bash
pnpm install
pnpm dev:deck                 # deck dev server
pnpm build                    # main site build + embedded deck into dist/deck/
pnpm --filter deck run build  # standalone build for Cloudflare (outputs deck/dist)
```

`build:embedded` compiles the deck with `--base=/deck/` into the main site's `dist/deck/`. The root build also copies `deck/public/images` to `dist/images`, because slide content references images with root-relative paths that Vite cannot rewrite.

## Project structure

- `src/faces/<faceId>/face.tsx`: one React component per slide ("face"), with its content in `face.content.json` and styling controls in `face.controls.json`.
- `src/app/page.tsx`: the generated entry that stacks your faces into the presentation layout.
- `src/components` and `src/utils`: the runtime that renders layouts, navigation, and slide scaling.
- `src/index.css`: base styles and design tokens; Tailwind utility classes are generated from your face code.

## Notes

- The deck keeps its own Tailwind v3 + Vite 6 stack; the main site uses Tailwind v4 + Vite 8. The two never share a build.
- Interactive plugins that relied on hosted services (form submissions, AI presenter) are stubbed out and will not function.
