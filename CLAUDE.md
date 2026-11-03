# chess workspace

Online chess app split into two independent git repos. This folder is not a repo; commit inside each one.

| Repo | Stack | Details |
| --- | --- | --- |
| [chess_backend](chess_backend/CLAUDE.md) | NestJS 12, Socket.IO, gRPC (core + game-svc), Prisma 7 / Postgres, Redis 8, Stripe, OTel | [MAP.md](chess_backend/MAP.md) |
| [chess_frontend](chess_frontend/CLAUDE.md) | Next.js 16 App Router, React 19, HeroUI v2, Tailwind 4, socket.io-client | [MAP.md](chess_frontend/MAP.md) |

Read the repo's own CLAUDE.md and MAP.md before touching it. Node 24 in both (`.nvmrc`).

## Purpose and review stance

Educational pet project; the owner studies system design and DevOps.

- Criticize existing and proposed solutions: pros, cons, why it is needed, why not.
- Always give alternatives (patterns, tools, trade-offs).
- Judge everything at scale: thousands of concurrent players, open sockets and I/O ops per second. Think throughput, latency, contention, hot keys, fan-out, backpressure, failure modes, horizontal scaling.

## Cross-repo contract

Changes on one side of these boundaries must land on the other side in the same task:

- **Socket events**: `chess_backend/src/domain/game/EmitTypes.ts` + gateway `@SubscribeMessage` names <-> `Game`/`Lobby`/`User`/`Emit` enums in `chess_frontend/app/lib/context/SocketContext.tsx`. Namespace `/game`, auth via `?Authorization=<accessToken|anon-token>`.
- **REST**: backend controllers + DTOs in `chess_backend/src/<module>/dto/` <-> request functions in `chess_frontend/app/lib/request/`.
- **Env**: frontend `NEXT_PUBLIC_API_HOST` / `NEXT_PUBLIC_WS_HOST` must point at backend core (REST + Socket.IO).
- **Auth**: tokens in frontend `localStorage` (`accessToken`, `refreshToken`, `anon-token`); backend issues and refreshes them in `auth`.

Use the `contract-checker` agent or `/sync-contract` after touching either side.

## Running the stack

```bash
cd chess_backend && docker compose -f docker.compose.yml up -d   # postgres, redis (AOF), otel-lgtm
cd chess_backend && npm run start:game-svc                        # gRPC game service
cd chess_backend && npm run start:dev                             # core: REST + Socket.IO
cd chess_frontend && npm run dev                                  # Next.js
```

Backend CI (`.github/workflows/node.js.yml`) runs lint, build, unit and integration tests on `dev`. Frontend has no tests; `typecheck` + `lint` + `build` is the gate.

## Working rules

- Never read or print `.env` files; use `.env.sample` / `.env.example`.
- Never edit `chess_backend/src/generated` by hand; edit `src/proto` and run `npm run proto`.
- Done means the touched repo passes `npm run typecheck` and `npm run lint` (backend also `npm run test:unit`). `/check` runs these.
- Default branch for backend work is `dev`.

## Harness (`.claude/`)

Launch Claude from this folder to get the shared agents and commands.

Agents: `backend-engineer`, `frontend-engineer`, `contract-checker`, `design-reviewer`, `verifier`.

Commands: `/check [backend|frontend|all]`, `/sync-contract`, `/design-review <topic>`, `/feature <description>`.
