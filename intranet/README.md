# Intranet

Private backoffice for multiple projects, in the same pnpm workspace as the public site. It has its own application, build output, server process, and deployment. The public Vercel build remains `pnpm build`; it does not bundle or deploy the intranet.

```text
intranet/
  apps/backoffice/              TanStack Start application and private routes
    src/projects.ts            Explicit project registry
    src/server/                Request identity, project access, server functions
    src/features/stats/        First migrated feature
  packages/integrations/       Project-owned backend adapters, executed server-side
  infra/                      Tailnet deployment examples
  tests/                      Access, data-contract, and production browser checks
```

## First page: registration stats

`/projects/infra-futuro/stats` restores the previous public `/stats` feature: participant and submission totals, with names grouped by registration. It adds search and manual refresh. `/stats` redirects to this page **on the intranet server only**. The public site has no stats route or public stats data function.

The server reads the existing authenticated `GET /api/participants` endpoint in `convex/http.ts`. It paginates through registrations and projects the results to names and group IDs before returning anything to the browser. Emails, application answers, diet, and allergies are not included. No database migration, new Convex function, production backend deployment, or duplicated registration database is needed.

## Local development

From the repository root:

```sh
pnpm install --frozen-lockfile
cp intranet/apps/backoffice/.env.example intranet/apps/backoffice/.env.local
```

Edit .env.local: set INTRANET_DEV_USER to your login for local development and INFRA_FUTURO_API_TOKEN to the existing Convex CONVEX_HTTP_API_TOKEN. This is a read API credential, not a Convex deployment key. Use a development backend URL and its matching token if you want development data.

```sh
pnpm dev:intranet
```

Open `http://127.0.0.1:3100/stats`. Without an API token the page explicitly reports an unconfigured connection, never fake or zero registrations. Without a verified identity it denies access. The local identity override is development-only and is rejected by the production launcher.

## Access and deployment

For `backoffice.hackinfrafuturo.cl`, use the [private AWS deployment runbook](infra/aws/README.md). It prepares an internal ALB, ACM HTTPS, automatic Tailscale identity verified by the subnet router, a Tailscale subnet router, and a private app group. The setup below remains available for direct Tailscale Serve deployments.

The application trusts `Tailscale-User-Login` from Tailscale Serve. Run it on a dedicated, trusted host with the application listening **only on loopback**, and expose it using Serve. A direct loopback caller can forge these headers, so this assumes local processes and administrators are trusted. Do not place an untrusted proxy or expose port 3100 to the LAN, tailnet, or internet. Tagged devices without user identity are denied.

All verified members of the deployment tailnet can access every registered intranet app by default. Adding a project does not require a reader list or a per-user grant. Each request and data fetch still verifies the Tailscale identity and checks that the project exists. Sensitive responses are private and never cached; backend credentials stay server-side.

```sh
pnpm build:intranet
# Production settings in apps/backoffice/.env or the service environment.
# Do not include INTRANET_DEV_USER in production.
pnpm start:intranet
# Run separately on the deployment host after reviewing the tailnet policy:
tailscale serve --bg http://127.0.0.1:3100
```

`infra/intranet.service` provides a systemd example. `infra/tailscale/policy.example.hujson` grants all tailnet members access to the service tag; merge it into the existing policy and review existing broad grants too. Neither file is applied automatically. Serve is private to the tailnet; do not enable Funnel. See [Serve and identity headers](https://tailscale.com/docs/features/tailscale-serve).

The UI and its server live inside the tailnet. Hosted Convex remains outside it and requires its own bearer credential. This package does not change that existing trust boundary.

## Adding another project

The app uses shadcn/ui (New York / Radix), Tailwind CSS v4, and neutral light/dark themes. The top-right appearance menu offers Claro, Oscuro, and Sistema; the default follows the operating system, and explicit choices persist in browser storage. The top bar stays outside the scrolling content area. Components live in `apps/backoffice/src/components/ui/`; the sidebar, stats cards, form controls, alerts, and project directory use these components. To add another component from the repository root:

```sh
pnpm dlx shadcn@latest add <component> --cwd intranet/apps/backoffice
```

1. Add a project descriptor to apps/backoffice/src/projects.ts. All tailnet members automatically receive access.
2. Add an adapter under `packages/integrations/src/` if its backend differs.
3. Add its feature routes and server functions; call `requireAccess` with that project ID before reading or changing data.
4. Add its navigation entry. Do not expose a feature route for a project until its adapter exists.

Business rules and data stay with the owning project. The intranet owns access, navigation, and presentation. Add shared UI packages only when a second feature actually needs them.

## Verification

```sh
pnpm test:intranet
pnpm build:intranet
pnpm --filter @intranet/workspace test:browser
```

The browser check launches a production build and a local synthetic backend. It verifies denied requests never read data, pagination and group display, search, refresh, empty/error states, mobile navigation, saved/system theme choices, both themes at widths from 320 to 1440 pixels, long-name wrapping, aligned totals, and top-bar visibility while scrolling. It also checks that credentials/private fields are absent from browser responses. It makes no requests to production Convex and does not configure or deploy Tailscale.
