# Infrastructure Hackathon

Landing for the Santiago hackathon: 5-6 December 2026.

## Source of truth

[hackinfrafuturo/monorepo](https://github.com/hackinfrafuturo/monorepo) `main` is the canonical code branch for this site. Vercel deploys that branch to [hackinfrafuturo.cl](https://hackinfrafuturo.cl). The [indies-cl/infrastructure-hackathon](https://github.com/indies-cl/infrastructure-hackathon) repository is this repo's upstream fork source; bring over changes explicitly when they are needed for the Velum site.

```bash
pnpm install
pnpm dev
```

```bash
pnpm build
```

Deployments are managed by Vercel from the `main` branch.

Live: [hackinfrafuturo.cl](https://hackinfrafuturo.cl)

## Deck

The sponsor deck is a route in this app at [hackinfrafuturo.cl/deck](https://hackinfrafuturo.cl/deck). Slide source stays in `deck/`. `pnpm dev` serves the landing page, the application, and the deck together. A standalone export for [deck.indies.la](https://deck.indies.la) still builds from `deck/` with `pnpm --filter deck run build`.

## Application referral links

Add a plain-text `ref` query parameter to a shared link, for example
`https://hackinfrafuturo.cl/?ref=UC` or
`https://hackinfrafuturo.cl/apply?ref=Alianza%20Emprende`.
The home page carries it to `/apply` and pre-fills the optional Referral code
field on the first participant step (Código de referido in Spanish). Applicants
can edit or clear the value; the form keeps it in the URL and draft through
refreshes. On submission, the final value is saved as `applications.ref` for the
whole team. Applications without a `ref` still work, and an existing draft's
ref is replaced when someone opens a new link with a different `ref`.
