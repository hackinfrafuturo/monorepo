# Save registrations in Convex

The form sends a team through `submitTeam` in `src/apply/submit.ts`. That calls the `applications.submit` mutation in `convex/applications.ts`.

The mutation stores one `applications` row for the team and one `members` row per person. Same email, or same GitHub when they gave one, is rejected. Read them in the Convex dashboard, on the Data page.

## Read-only API

`convex/http.ts` exposes two bearer-token-protected GET endpoints:

- `/api/applicants/count` returns `{ "submissions": number, "applicants": number }`.
- `/api/participants?numItems=100&cursor=<cursor>` returns `{ "page": [...], "isDone": boolean, "continueCursor": "..." }`. Omit `cursor` for the first page and pass the returned `continueCursor` to fetch the next page. `numItems` defaults to 100 and must be from 1 to 500.

Both endpoints require `Authorization: Bearer <CONVEX_HTTP_API_TOKEN>`. The participants endpoint returns participants' application answers, so keep the token private. Store it in the gitignored `.env.local` and set the same variable on the selected Convex deployment before calling the endpoints. From a shell in which `.env.local` is sourced, run `pnpm exec convex env set CONVEX_HTTP_API_TOKEN "$CONVEX_HTTP_API_TOKEN"`.

`VITE_CONVEX_URL` must be present at build time. Without it, the form shows its retry state and preserves the draft instead of claiming that the team was saved.

## Local

This repository is linked to the Convex project `vicente-matus/infra-futuro-velum-indies` and its personal development deployment `greedy-gecko-110`. The Convex CLI writes `.env.local` in the repo root when you select that deployment; the file is gitignored.

```bash
pnpm exec convex deployment select greedy-gecko-110
pnpm exec convex dev --once
```

Run `pnpm exec convex dev` instead of `--once` to keep functions in sync while editing. The selected deployment uses:

```bash
CONVEX_DEPLOYMENT=dev:greedy-gecko-110
VITE_CONVEX_URL=https://greedy-gecko-110.convex.cloud
```

For a different development deployment, create `.env.local` in the repo root with its name and URL:

```bash
CONVEX_DEPLOYMENT=dev:your-deployment-name
VITE_CONVEX_URL=https://your-deployment-name.convex.cloud
```

`your-deployment-name` is the dev deployment name from the Convex dashboard (Settings on that deployment). It is the subdomain of the URL. For a deployment named `happy-animal-123`:

```bash
CONVEX_DEPLOYMENT=dev:happy-animal-123
VITE_CONVEX_URL=https://happy-animal-123.convex.cloud
```

If you do not have a project yet, this writes the file for you:

```bash
pnpm exec convex dev
```

Log in with GitHub when it asks, and create the project. Leave that command running while you work. It uploads `convex/` and generates `convex/_generated`. Commit `convex/_generated` after it appears. `pnpm build` typechecks the functions from those files.

Then, in another terminal:

```bash
pnpm dev
```

Submit a team at `/apply` and confirm the rows in the dashboard.

To upload functions without the browser login, add a dev deploy key to `.env.local` as `CONVEX_DEPLOY_KEY`. Create it in the dashboard under deploy keys. Keep that value out of git and out of chat.

## Production

The project's production Convex deployment is `polite-spider-810` at `https://polite-spider-810.convex.cloud`. The development deployment above does not configure production.

To save live registrations:

1. Deploy the canonical `main` branch again. The production `buildCommand` in `vercel.json` sets the public production URL as `VITE_CONVEX_URL` while building Vite. This needs no Vercel secret or dashboard setting.
2. Submit a representative team on the published site and confirm one `applications` row and the linked `members` rows in the production Convex Data page.

The current `applications.submit` function was deployed manually on 5 October 2026. Future changes under `convex/` must be deployed separately with `pnpm exec convex deploy` before the matching frontend release. Preview builds run `pnpm build` without a Convex URL; configure a separate preview backend and `VITE_CONVEX_URL` for previews if submission testing is needed there.

After saving a team, the mutation schedules an internal action for each member. The action sends a confirmation through the official Resend SDK from `Infra Futuro <hola@indies.la>`. `indies.la` must stay verified for sending in Resend. Each message uses the member ID as its Resend idempotency key.

Set `RESEND_API_KEY` separately on the selected development deployment and on production with `pnpm exec convex env set RESEND_API_KEY` before testing or accepting live registrations. The key in `.env.local` is only available to local CLI commands; it is not automatically available to Convex cloud functions. Keep it out of Git, Vercel, and Vite environment variables. Check sends and delivery events with the Resend CLI (`resend emails list` and `resend emails get <id>`). The form confirms the saved registration before the scheduled email action finishes, so use Resend events to verify delivery.
