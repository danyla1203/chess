# chess_backend

NestJS 12 API + Socket.IO game server for an online chess app. Postgres via Prisma 7, Redis cache, RabbitMQ events, Stripe top-ups, Google OAuth, OpenTelemetry (traces, metrics, logs). Frontend lives in `../chess_frontend`.

See [MAP.md](MAP.md) for the module layout, REST routes, WebSocket events and data model.

## Commands

```bash
npm run start:dev          # watch mode, needs .env (copy .env.sample)
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

Single test file: `NODE_OPTIONS=--experimental-vm-modules npx jest test/game/game.service.test.ts`. Redis-backed `*.int-test.ts` files (repository, clock, outbox, notifier) only need `REDIS_URL`.

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

- One Nest module per domain: `auth`, `user`, `game`, `payments`. Each has `*.controller.ts` / `*.gateway.ts`, `*.service.ts`, and a `model.ts` / `*.model.ts` that wraps Prisma.
- DTOs are `class-validator` classes in `<module>/dto/`, re-exported from `dto/index.ts`.
- Live game state is in Redis (`GameRepository`), never in process memory, so any instance can serve any socket. Change a game only through `GameRepository.update(id, mutate)`: `mutate` may run several times on conflict, so keep it free of side effects (emit and record metrics after it returns).
- Emit to clients through `GameNotifier` (user/game rooms), not by holding socket references; the Redis adapter delivers across instances.
- A game turning `ended` writes `game.ended` to the Redis outbox in the same Lua script; `OutboxRelay` publishes it to RabbitMQ, and `GameHistoryConsumer` persists it, only if both players are authorized.
- Redis must run with AOF (`appendonly yes`), or outbox entries and live games are lost on a Redis restart.
- Messaging topology (exchanges, queues, DLX) is declared in `src/messaging/topology.ts`. Changing queue arguments on an existing queue fails with PRECONDITION_FAILED; create a new queue name instead.
- `src/tools/telemetry/otel.ts` must stay the first import in `src/main.ts`, or auto-instrumentation misses modules required before it.
- The WebSocket event names in `src/game/EmitTypes.ts` must stay in sync with `chess_frontend/app/lib/context/SocketContext.tsx`.
- Prettier: single quotes, trailing commas. Tests live in `test/` and mirror `src/`.
