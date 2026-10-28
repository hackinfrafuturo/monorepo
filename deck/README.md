# deck

The Infrastructure Hackathon sponsor deck, built as a Faces project (Vite + React + Tailwind CSS).

This package is part of the parent repository's pnpm workspace. The main site renders these slides at **/deck** ([hackinfrafuturo.cl/deck](https://hackinfrafuturo.cl/deck)). The same source can still be built standalone for [deck.indies.la](https://deck.indies.la) (see `wrangler.jsonc`).

## Commands

Run from the repository root:

```bash
pnpm install
pnpm dev                      # site, application, and deck on one server
pnpm build                    # production build of that app
pnpm --filter deck run build  # standalone build for Cloudflare (outputs deck/dist)
```

The site compiles `deck/src` into the same Vite build and serves slide photos from `deck/public/images` at `/images`. `pnpm --filter deck run build` is only the standalone Cloudflare export.

## Project structure

- `src/faces/<faceId>/face.tsx`: one React component per slide ("face"), with its content in `face.content.json` and styling controls in `face.controls.json`.
- `src/app/page.tsx`: the generated entry that stacks your faces into the presentation layout.
- `src/components` and `src/utils`: the runtime that renders layouts, navigation, and slide scaling.
- `src/index.css`: base styles and design tokens; Tailwind utility classes are generated from your face code.

## Notes

- Slide styles still use the deck's Tailwind v3 config, compiled into the site build and scoped to `#deck`. The site itself uses Tailwind v4.
- Interactive plugins that relied on hosted services (form submissions, AI presenter) are stubbed out and will not function.
