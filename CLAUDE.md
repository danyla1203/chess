# chess monorepo

Online chess app. One git repo, pnpm workspaces + Turborepo. Default branch `main`.

| Path | Package | Stack | Owner | Details |
| --- | --- | --- | --- | --- |
| [apps/backend](apps/backend/CLAUDE.md) | `backend` | NestJS 12, Socket.IO, gRPC (core + game-svc), Prisma 7 / Postgres, Redis 8, Stripe, OTel | backend | [MAP.md](apps/backend/MAP.md) |
| [apps/frontend](apps/frontend/CLAUDE.md) | `frontend` | Next.js 16 App Router, React 19, socket.io-client | frontend | [MAP.md](apps/frontend/MAP.md) |
| [packages/contract](packages/contract/CLAUDE.md) | `@chess/contract` | Socket event enums, payload types, REST types. Compiled with tsc to `dist/` | backend | |
| [packages/ui](packages/ui/CLAUDE.md) | `@chess/ui` | Design system: HeroUI theme, tokens, Tailwind 4 styles, generic components, Storybook 10 | frontend | |
| [deploy/k8s](deploy/k8s/README.md) | | Kustomize manifests, Gateway API routes, `up.sh` / `down.sh`, observability platform | backend | |

Read the package's own CLAUDE.md (and MAP.md) before touching it. Node 24 (`.nvmrc`). Ownership is enforced by [.github/CODEOWNERS](.github/CODEOWNERS).

## Purpose and review stance

Educational pet project; the owner studies system design and DevOps.

- Criticize existing and proposed solutions: pros, cons, why it is needed, why not.
- Always give alternatives (patterns, tools, trade-offs).
- Judge everything at scale: thousands of concurrent players, open sockets and I/O ops per second. Think throughput, latency, contention, hot keys, fan-out, backpressure, failure modes, horizontal scaling.

## Commands (repo root)

```bash
pnpm install
pnpm check                                   # turbo: typecheck + lint + test:unit, all packages
pnpm build                                   # turbo: build all (contract first, then apps, ui = storybook build)
pnpm turbo run <task> --filter=backend       # one package; also frontend, @chess/contract, @chess/ui
pnpm turbo run <task> --affected             # only packages changed vs main
pnpm --filter backend start:dev              # core: REST + Socket.IO (needs apps/backend/.env)
pnpm --filter backend start:game-svc         # game-svc: gRPC
pnpm --filter frontend dev                   # Next.js
pnpm --filter @chess/ui storybook            # Storybook on :6006
pnpm --filter backend test:integration       # needs Postgres + Redis
docker compose -f apps/backend/docker.compose.yml up -d   # local postgres, redis (AOF), otel-lgtm
./deploy/k8s/up.sh [--skip-platform]         # local k8s (docker-desktop): builds images, deploys core, game-svc, frontend
```

Turbo task graph (`turbo.json`): `generate` (prisma generate) and `^build` (builds `@chess/contract`) run before `build`, `typecheck`, `lint`, `test:unit`. Outside turbo, run `pnpm --filter @chess/contract build` first.

## Contract rules

- Socket events, socket payloads and REST request/response types live only in `@chess/contract`. Apps never redefine them; backend DTO classes `implements` the contract type.
- Changes are additive and backward compatible (expand -> migrate -> contract). Old browser tabs and old pods run next to new ones during a rollout (version skew).
- Deploy order for additive changes: backend first, then frontend.
- gRPC `.proto` is backend-internal (core <-> game-svc): `apps/backend/src/proto`, `npm run proto` inside the backend, `proto:breaking` must pass.
- After touching the contract or either side of it, run `/sync-contract`.

## Deploy

- Images build from the repo root context using `turbo prune <app> --docker`: `apps/backend/Dockerfile.prod` (targets `migrate`, `runtime`), `apps/frontend/Dockerfile` (Next standalone).
- `NEXT_PUBLIC_*` are inlined at frontend build time (Docker `ARG`s); changing hosts means rebuilding the frontend image.
- k8s routing is by hostname: `chess.localhost` -> frontend (1 replica), every other host -> core. Each service has its own image tag; roll back per service.
- CI: [.github/workflows/ci.yml](.github/workflows/ci.yml), `--affected` on PRs, integration tests with Postgres + Redis.

## Working rules

- Never read or print `.env` files or `deploy/k8s/secrets.env`; use `.env.sample` / `.env.example` / `secret.example.yaml`.
- Never edit `apps/backend/src/generated` by hand.
- Done means `pnpm turbo run typecheck lint test:unit --affected` passes (`/check`).
- Dependencies: add with `pnpm --filter <pkg> add <dep>`. Native build scripts must be allowed in `pnpm-workspace.yaml` `allowBuilds`. `overrides` there pin `socket.io` and `@opentelemetry/api` to single copies; keep them single.

## Harness (`.claude/`)

Agents: `backend-engineer`, `frontend-engineer`, `contract-checker`, `design-reviewer`, `verifier`.

Commands: `/check [package|all]`, `/sync-contract`, `/design-review <topic>`, `/feature <description>`.
