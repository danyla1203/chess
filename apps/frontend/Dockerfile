FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat \
  && npm install -g corepack@latest \
  && corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  TURBO_TELEMETRY_DISABLED=1 \
  NEXT_TELEMETRY_DISABLED=1

FROM base AS prune
WORKDIR /repo
RUN npm install -g turbo@2.11.10
COPY . .
RUN turbo prune frontend --docker

FROM base AS installer
WORKDIR /repo
COPY --from=prune /repo/out/json/ ./
COPY --from=prune /repo/out/pnpm-lock.yaml /repo/out/pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY --from=prune /repo/out/full/ ./

FROM installer AS build
ARG NEXT_PUBLIC_API_HOST
ARG NEXT_PUBLIC_WS_HOST
ARG NEXT_PUBLIC_HOST
ENV NEXT_PUBLIC_API_HOST=$NEXT_PUBLIC_API_HOST \
  NEXT_PUBLIC_WS_HOST=$NEXT_PUBLIC_WS_HOST \
  NEXT_PUBLIC_HOST=$NEXT_PUBLIC_HOST
RUN test -n "$NEXT_PUBLIC_API_HOST" && test -n "$NEXT_PUBLIC_WS_HOST" && test -n "$NEXT_PUBLIC_HOST" \
  || (echo "NEXT_PUBLIC_API_HOST, NEXT_PUBLIC_WS_HOST and NEXT_PUBLIC_HOST build args are required" >&2 && exit 1)
RUN pnpm turbo run build --filter=frontend \
  && mkdir -p apps/frontend/public

FROM node:24-alpine AS runtime
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000 \
  HOSTNAME=0.0.0.0
COPY --from=build /repo/apps/frontend/.next/standalone ./
COPY --from=build /repo/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build /repo/apps/frontend/public ./apps/frontend/public
USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/frontend/server.js"]
