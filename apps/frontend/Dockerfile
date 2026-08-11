# Build context is the repo root (this image needs packages/shared too) —
# see docker-compose.yml's `build.context`.

FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --frozen-lockfile --filter "@workflow-brasal/frontend..."

COPY packages/shared packages/shared
COPY apps/frontend apps/frontend
RUN pnpm --filter @workflow-brasal/shared build
RUN pnpm --filter @workflow-brasal/frontend build

FROM nginx:1.27-alpine AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
