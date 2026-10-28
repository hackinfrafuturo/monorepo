FROM node:24-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY intranet/ intranet/
RUN pnpm install --frozen-lockfile --filter @intranet/backoffice...
RUN pnpm --filter @intranet/workspace test && pnpm --filter @intranet/backoffice build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3100 INTRANET_AUTH_MODE=tailscale-alb
WORKDIR /app
COPY --from=build --chown=node:node /workspace/intranet/apps/backoffice/.output ./.output
COPY --chown=node:node intranet/apps/backoffice/scripts/start.mjs ./scripts/start.mjs
USER node
EXPOSE 3100
CMD ["node", "scripts/start.mjs"]
