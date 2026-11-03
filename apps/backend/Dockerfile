FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl \
  && npm install -g corepack@latest \
  && corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  TURBO_TELEMETRY_DISABLED=1

FROM base AS prune
WORKDIR /usr/src/repo
RUN npm install -g turbo@2.11.10
COPY . .
RUN turbo prune backend --docker

FROM base AS dev
WORKDIR /usr/src/repo
COPY --from=prune /usr/src/repo/out/json/ ./
COPY --from=prune /usr/src/repo/out/pnpm-lock.yaml /usr/src/repo/out/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY --from=prune /usr/src/repo/out/full/ ./
RUN pnpm turbo run build --filter=@chess/contract \
  && pnpm turbo run generate --filter=backend
WORKDIR /usr/src/repo/apps/backend
EXPOSE 9200
CMD ["pnpm", "run", "start:dev"]
