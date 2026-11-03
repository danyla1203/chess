# chess_backend

NestJS 12 API + Socket.IO game server for an online chess app, deployed as two processes from one codebase: core (`src/main.ts`: REST, Socket.IO gateway, game history) and game-svc (`src/game-service/main.ts`: game rules, Redis state, clocks, gRPC server). core calls game-svc over gRPC; game-svc answers through gRPC replies, Redis Stream events and Socket.IO emits via Redis. Postgres via Prisma 7, Redis (state, read models, streams, pub/sub), Stripe top-ups, Google OAuth, OpenTelemetry (traces, metrics, logs). Frontend lives in `../chess_frontend`.

See [MAP.md](MAP.md) for the module layout, REST routes, WebSocket events and data model. Workspace-wide rules, the cross-repo contract and shared agents/commands are in [../CLAUDE.md](../CLAUDE.md).

## Purpose and review stance

This is an **educational** pet project; the owner is studying system design and DevOps.

- Criticize solutions, existing and proposed: pros, cons, why it is necessary, why not.
- Always give alternatives (other patterns, tools, trade-offs) so other ways to solve the same task stay in view.
- Evaluate everything as if the system serves thousands of concurrent players, thousands of open connections and thousands of I/O operations per second: think about throughput, latency, contention, hot keys, fan-out, backpressure, failure modes and horizontal scaling.

## Commands

```bash
npm run start:dev          # core in watch mode, needs .env (copy .env.sample)
npm run start:game-svc     # game-svc in watch mode (gRPC on GRPC_PORT 50051, health on HEALTH_PORT 9300)
npm run proto              # buf lint + regenerate src/generated from src/proto
npm run views:rebuild      # after build: rebuild Redis read models from game snapshots
npm run build              # nest build -> dist/
npm run typecheck          # tsc --noEmit over src, test, prisma
npm run lint               # eslint (flat config, type-aware); lint:fix to autofix
npm run test:unit          # jest, test/**/*.test.ts, no DB needed
npm run test:integration   # *.int-test.ts, needs Postgres at DATABASE_URL
npm run test:integration:local  # spins up test/docker-compose-db.yml, uses test/.env
npm run test:e2e           # *.e2e-test.ts, needs running server + DB
npx prisma generate        # after editing prisma/schema.prisma
npx prisma migrate dev     # create a migration
npx prisma db seed -- --env test
```

Single test file: `NODE_OPTIONS=--experimental-vm-modules npx jest test/game/game.service.test.ts`. Redis-backed `*.int-test.ts` files (repository, clock, event stream, gRPC round trip, socket emitter, views rebuild) only need `REDIS_URL` (Redis ≥ 8.2 for `XADD … ACKED`).

## Toolchain facts that bite

- Node >= 22.12 (`.nvmrc` = 24). Nest 12 and several deps are ESM-only; the app compiles to CommonJS and loads them via `require(esm)`. Do not add `"type": "module"`.
- Jest must run with `NODE_OPTIONS=--experimental-vm-modules` (already in the npm scripts) or ESM-only deps fail to load.
- `tsconfig.json` uses `module: nodenext` + `isolatedModules`. Re-export types with `export type`, and use `import type` for types that only appear in decorated signatures (TS1272).
- CommonJS deps that tests spy on (`bcrypt`, `@sendgrid/mail`) are imported with a default import (`import bcrypt from 'bcrypt'`), not `import * as`. Namespace imports produce frozen objects and break `jest.spyOn`.
- Prisma 7: the connection URL lives in `prisma.config.ts`, not in `schema.prisma`. `PrismaService` and `prisma/seed.ts` connect through `@prisma/adapter-pg`.
- Cache is `@nestjs/cache-manager` + Keyv (`@keyv/redis`), configured in `src/app.module.ts`.
- `StripeService.stripe` is created lazily, because Stripe 23 throws on an empty key. `apiVersion` is pinned to `2022-11-15` via a cast; changing it changes webhook payload shapes.
- Do not enable `@typescript-eslint/consistent-type-imports` here: with `emitDecoratorMetadata`, turning a DI constructor param into `import type` silently breaks Nest injection.

## Conventions

- One Nest module per domain: `auth`, `user`, `gateway`, `payments`, `game-history` in core; `game` + `game-service` in game-svc. Each has `*.controller.ts` / `*.gateway.ts`, `*.service.ts`, and a `model.ts` / `*.model.ts` that wraps Prisma.
- DTOs are `class-validator` classes in `<module>/dto/`, re-exported from `dto/index.ts`.
- Live game state is in Redis (`GameRepository`), never in process memory, so any instance can serve any socket. Change a game only through `GameRepository.update(id, mutate)`: `mutate` may run several times on conflict, so keep it free of side effects (emit and record metrics after it returns).
- `src/game` must not import from `src/gateway` (and vice versa, except types in `game.contract.ts`, `dto` and `src/domain`). core writes only through `GameClient` commands and reads only through `GameReadModel` (`src/game-read`), never game snapshot keys; add a command by extending `GameCommands` in `game.contract.ts`, a handler in `game-service/game.commands.ts`, and a method in `gateway/game.client.ts`. A new read model goes into the save script in `infrastructure/game/game.repository.ts` (same transaction as the snapshot) and into `views.rebuild.ts`.
- Game pushes come from game-svc: mutate the aggregate through a `Game` method that records a `GameDomainEvent`, and map the event to emits in `game-service/socket.publisher.ts` (Redis emitter -> Redis adapter on core). The core gateway emits no game events itself; `SocketNotifier` only covers connect/reconnect presence. Address emits to `user:<id>` / `game:<id>` rooms, never socket references.
- A game turning `ended` appends `game.v1.ended` to `{chess}:events` in the same Lua script (`MAXLEN ~ … ACKED`, Redis ≥ 8.2). `GameHistoryConsumer` (consumer group `history`, via `EventStream`) persists it, only if both players are authorized. A new consumer is a new group name; a new event is a new `EventType` value, versioned (`game.v2.…`) when its payload changes incompatibly.
- Redis must run with AOF (`appendonly yes`), or stream entries and live games are lost on a Redis restart.
- gRPC contract: edit `src/proto/**`, run `npm run proto` (buf lint + ts-proto into `src/generated`, committed), and keep it wire-compatible (`npm run proto:breaking`). Never reuse a field number. Map proto <-> contract types in `game.grpc.controller.ts` (server) and `game.client.ts` (client); keep `HttpException`s in game-svc, `HttpToGrpcFilter` carries them to core.
- `@nestjs/microservices` must match the exact version of `@nestjs/core`; a newer microservices calls core methods that don't exist yet. The gRPC microservice is connected with `deferInitialization: true`, otherwise global filters/interceptors added after `connectMicroservice` are silently ignored.
- Commands are not idempotent: the client retries only on `UNAVAILABLE` (call never reached a server). Never add `DEADLINE_EXCEEDED` to `retryableStatusCodes`.
- Layers: `src/domain` (pure game model), `src/<module>` (application/transport), `src/infrastructure` (Redis, Prisma, gRPC, streams, OTel, Stripe, mail, sockets). `src/domain` must not import infrastructure, generated code or app modules.
- Service and layer boundaries are enforced by `no-restricted-imports` in `eslint.config.mjs`.
- `src/infrastructure/telemetry/otel.ts` must stay the first import in `src/main.ts`, or auto-instrumentation misses modules required before it.
- Socket.IO event names, socket payload types and REST request/response types come from `@chess/contract` (`packages/contract`, owned by backend); never hardcode event strings. `class-validator` DTOs stay here and `implements` the contract type, so drift is a compile error. Contract changes are additive only; rebuild it (`pnpm --filter @chess/contract build`) before typecheck/test when running outside turbo.
- Prettier: single quotes, trailing commas. Tests live in `test/` and mirror `src/`.
