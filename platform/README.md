# Participant platform

Separate TanStack Start app, scaffolded with the TanStack CLI and configured with
the Clerk CLI. Uses the repository's pnpm workspace and Node 24.

From the repository root:

```sh
corepack pnpm install
corepack pnpm dev:platform
corepack pnpm build:platform
```

Development runs at http://localhost:3200. `build:platform` builds both client and
server bundles and runs TypeScript.

## Clerk setup

The development application has been claimed in Clerk. Local credentials live in
`platform/.env.local`; that file and `.clerk/` are ignored by Git. On another
checkout, copy `.env.example` to `.env.local` and fill in development credentials
from the same Clerk application, or use the Clerk CLI to log in, link the app,
and pull its environment variables. Never expose `CLERK_SECRET_KEY` with a
`VITE_` prefix.

Discord is enabled on the development instance using Clerk's shared OAuth
credentials. Google and email/password authentication are disabled. Production
must use the same Discord-only settings and your own Discord Developer application,
credentials, and the exact redirect URL supplied by Clerk.

The Clerk MCP entry is installed in the local Codex configuration. Its OAuth
connection is separate from Clerk CLI login.

## Routes and authentication

- `/`: a single Discord button for signed-out visitors; signed-in visitors are
  redirected to `/dashboard` by a server-side authentication check.
- `/sign-in` and `/sign-up`: redirect to `/` for old links.
- `/sso-callback`: Clerk's OAuth callback handler for sign-in and sign-up.
- `/dashboard`: participant dashboard under the `_authenticated` pathless layout.

The layout checks Clerk authentication in a server function during `beforeLoad`.
The dashboard's server function checks authentication again before reading the
current Clerk user. It returns only name and Discord display fields, including
the provider's verified user ID; the browser never supplies a user ID to look up.
CSRF middleware protects server functions alongside Clerk request middleware.
Additional participant routes belong under `_authenticated`.

This initial dashboard reads identity from Clerk. Convex data integration is a
separate step: select the deployment, configure Clerk's Convex integration and
issuer, and enforce `ctx.auth.getUserIdentity()` in every protected Convex
function. A route guard does not authorize calls to the database. Preserve the
Discord ID as a string and derive it from verified Clerk data before persisting
it for bot use.

Signing in does not join a Discord server or grant roles. Those actions belong
to the bot integration and need its own server permissions.

## Verification

Verified on 2026-11-05 with computer use in the user's Chrome browser:
anonymous access redirects to `/`; Discord OAuth completes; the protected
dashboard shows the connected Discord identity; a full reload preserves the
session; signing out returns home; opening the dashboard afterward redirects
back to `/`. A separate Clerk Backend API read confirmed that the Discord
identity was persisted. This does not verify Convex persistence or bot behavior.

`corepack pnpm build:platform` passes, including TypeScript. Oxlint reports only
the existing rule's Fast Refresh warnings on TanStack route files (which export
route definitions alongside components).
