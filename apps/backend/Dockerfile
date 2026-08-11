# Build context is the repo root (this image needs packages/shared too) —
# see docker-compose.yml's `build.context`.

FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/backend/package.json apps/backend/package.json
RUN pnpm install --frozen-lockfile --filter "@workflow-brasal/backend..."

COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN pnpm --filter @workflow-brasal/shared build
RUN pnpm --filter @workflow-brasal/backend build
RUN pnpm --filter @workflow-brasal/backend deploy --prod /prod/backend

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod/backend ./
EXPOSE 3000
# Applies any pending migrations, then starts the API — see src/database/run-migrations.ts.
CMD ["sh", "-c", "node dist/database/run-migrations.js && node dist/main.js"]
