# Backend map

NestJS 12, two processes from one codebase and one image:

- **core** (`src/main.ts`, `AppModule`): REST, the Socket.IO gateway, game history. Game writes go to game-svc as gRPC commands (`GameClient`); game reads come from Redis read models (`GameReadModel`); finished games arrive on the `{chess}:events` stream.
- **game-svc** (`src/game-service/main.ts`, `GameServiceModule`): game rules, Redis game state and read models, clocks, gRPC server (`GameCommands`, `grpc.health.v1`) on `GRPC_PORT` (50051), all game pushes to sockets (Redis emitter). HTTP only for health on `HEALTH_PORT`; no socket connections.

Each entry imports `src/infrastructure/telemetry/otel.ts` first (starts the OTel SDK before anything else is required), then bootstraps. core adds a global `ValidationPipe` and `LoggerFilter` and listens on `PORT` (9200 in dev). CORS allows `http://localhost:3000` when `ENV=dev`.

## Layout

```
src/
├── main.ts                    bootstrap, CORS, global pipe/filter
├── main.ts                    (also installs RedisIoAdapter: Socket.IO rooms and emits shared across instances)
├── app.module.ts              [core] Config (global), Redis cache (global), Logger, Telemetry, Redis, Messaging, Health, Auth, Gateway, Payments, User, GameHistory
├── auth/                      @Global module, exports AuthService + TokenModule
│   ├── auth.controller.ts     /auth/* routes
│   ├── auth.service.ts        login, refresh rotation, email verification, Google OAuth
│   ├── auth.model.ts          Prisma access: User, Confirmation, Auth (sessions)
│   ├── tokens/                TokenService (JWT pair, anonymous token, Google client), AuthGuard
│   └── dto/                   Login (email|name), UseRefresh, VerifyEmail, SendVerificationMail, GoogleCode
├── user/
│   ├── user.controller.ts     /user/* routes, cached per user via UserCacheInterceptor
│   ├── user.service.ts        signup, profile, game history + W/L/D, rename, balance top-up
│   ├── model.ts               Prisma access for User, Game, Payment
│   └── entities/              response shapes + prismaSelectUserProfile
├── gateway/                   [core] Socket.IO side of the game, namespace /game
│   ├── game.gateway.ts        @SubscribeMessage handlers: writes are one command to game-svc via GameClient, connect/disconnect read GameReadModel; emits no game events itself
│   ├── game.client.ts         gRPC client for GameCommands: 5 s deadline per call, rebuilds HttpExceptions, `chess.rpc.client.duration` metric
│   ├── game-svc.client.module.ts  ClientsModule: proto, loader options, round_robin + retry-on-UNAVAILABLE service config, target `GAME_SVC_GRPC_TARGET`
│   ├── socket.notifier.ts     the few emits core still owns (player reconnected/disconnected), addressed to `user:<id>` / `game:<id>` rooms
│   ├── ClientStore.ts         Client identity kept on `socket.data.client`
│   ├── connection.provider.ts handshake: JWT -> authorized Client, otherwise anonymous temp token
│   ├── balance.model.ts       user balance lookup for IsBalanceEnough
│   ├── guards/                IsBalanceEnough (bet <= balance)
│   └── gateway.metrics.ts     open Socket.IO connections
├── game-service/              [game-svc] second entrypoint, no REST: health endpoints only
│   ├── main.ts                bootstraps GameServiceModule: gRPC on GRPC_PORT (50051), health HTTP on HEALTH_PORT (9300)
│   ├── grpc.server.ts         hybrid microservice options; deferred init so the global filter and interceptor apply
│   ├── game.grpc.controller.ts  @GrpcMethod per rpc (generated `GameCommandsControllerMethods`), proto <-> contract mapping
│   ├── game.commands.ts       maps each command to GameService, checks the caller is a player
│   ├── http-to-grpc.filter.ts HttpException -> gRPC status + `x-http-error-bin` trailer; logs 5xx
│   ├── deadline.interceptor.ts  refuses a call whose deadline already passed or was cancelled
│   ├── grpc.health.controller.ts  grpc.health.v1 Check (Redis ping); used by the k8s readiness probe
│   ├── socket.emitter.ts      `@socket.io/redis-emitter` on namespace /game over the shared Redis client; publish errors are logged, never thrown
│   ├── socket.publisher.ts    GamePublisher: domain events -> Socket.IO emits (same event names and payloads as before)
│   └── views.rebuild.ts       `npm run views:rebuild`: wipes `view:*` and reprojects lobby/active games from snapshots
├── game-read/                 [core reads, game-svc writes] Redis read models
│   ├── views.ts               LobbyView, UserView (game-svc may import only this file)
│   └── game-read.model.ts     GameReadModel: lobby(), userGame(userId)
├── game/                      [game-svc] application layer: use cases over the domain, no transport code
│   ├── game.contract.ts       command request/response types shared by core and game-svc
│   ├── game.service.ts        create/join/move/draw/surrender/leave/timeout on top of GameRepository; publishes the aggregate's events after each save
│   ├── game.publisher.ts      abstract GamePublisher (game + domain events)
│   ├── game.views.ts          Game -> LobbyView
│   ├── game.adapter.ts        Game -> DTOs (plain board, init data, result)
│   ├── game.adapter.interface.ts
│   └── dto/                   CreateGame, Turn, ChatMessage + payload types (re-exports MoveResult/ClockState from domain)
├── domain/                    pure model; lint forbids imports from infrastructure, transport or app modules
│   └── game/
│       ├── EmitTypes.ts       server -> client event names (shared contract with frontend)
│       ├── MoveResult.ts      CompletedMove, Shah/Mate/Striked data
│       ├── ClockState.ts
│       └── entities/
│           ├── Client.ts      identity: userId, name, authorized, anonymous temp token
│           ├── Player.ts      identity + side + remaining time; snapshot (de)serialization
│           └── game/
│               ├── game.ts    Game aggregate: status, players, clocks (turnStartedAt + remaining ms), moves, chat, draw flags; records domain events (pullEvents); toSnapshot/fromSnapshot
│               ├── game.domain-events.ts  GameDomainEvent union: created, started, cancelled, moved, chatPosted, drawProposed, drawRejected, timeAdded, ended
│               ├── game.chat.ts   per-game chat log
│               └── process/
│                   ├── game.process.ts  move validation, check ("shah") and mate detection
│                   └── game.state.ts    board maps per side, turn side, check/threat sets
├── payments/
│   ├── payments.controller.ts /payments/* routes
│   ├── payments.service.ts    checkout session, webhook -> balance top-up
│   └── dto/
├── game-history/              consumer group `history` on game.ended; saves game + balance changes in one serializable tx, idempotent on matchId
├── proto/                     `chess/game/v1/game.proto`, `grpc/health/v1/health.proto` (copied to dist by nest-cli assets)
├── generated/                 ts-proto output (`npm run proto`, buf), committed; never edit by hand
├── health/                    GET /health/live, GET /health/ready (Redis, plus Postgres in core)
└── infrastructure/            adapters to external systems
    ├── prisma/prisma.service.ts  PrismaClient + pg adapter; each module provides its own instance
    ├── redis/                 RedisModule (ioredis client, token REDIS) and RedisKeys
    ├── messaging/             Redis Streams: integration-event.ts (`{type, messageId, payload, trace}`), contracts.ts (payloads), EventStream (consumer groups, reclaim, dead stream, lag gauges)
    ├── grpc/                  shared by both processes: proto paths, loader options, channel options, HttpException <-> gRPC status mapping
    ├── game/                  [game-svc] game persistence and runtime adapters
    │   ├── game.repository.ts Redis game store: versioned snapshot per game, Lua compare-and-set save that also updates indexes, read models and appends `game.ended` to `{chess}:events`
    │   ├── game.clock.ts      leader-elected (Redis lock) 1 s loop: ends timed-out games from the deadline index; no per-second ticks
    │   ├── game.events.ts     Game -> GameEndedEvent / integration event
    │   └── game.metrics.ts    OTel metrics: moves, move latency, games created/ended, bet volume, active/lobby, clock leader
    ├── stripe/                StripeService (lazy client, fixed price id)
    ├── mail/mail.service.ts   SendGrid wrapper; sending is commented out
    ├── logger/                winston LoggerService (console + logs/log.json), global LoggerFilter
    ├── socket/                RedisIoAdapter; WsValidationFilter maps 400/404/409 HttpExceptions to WsException
    └── telemetry/             otel.ts: NodeSDK with OTLP traces, metrics and logs, auto + Prisma instrumentation; TelemetryModule flushes on shutdown
prisma/
├── schema.prisma              models below
├── migrations/                SQL migrations (Aug 2023 – Aug 2024)
└── seed.ts                    `--env test` seeds users, payments, sessions, games
prisma.config.ts               schema path, migrations path, seed command, DATABASE_URL
test/                          mirrors src; *.test.ts (unit), *.int-test.ts (DB), *.e2e-test.ts (HTTP)
postman/, .postman/            Postman collection for the REST API
docker.compose.yml             (context: repo root) core + game-svc (gRPC :50051) + postgres:17 + redis (AOF) + grafana/otel-lgtm (Grafana on :3001)
buf.yaml, buf.gen.yaml         proto lint/breaking rules and ts-proto codegen (`npm run proto`, `npm run proto:breaking` against `dev`)
Dockerfile.prod                built from the repo root (`turbo prune backend`); targets: `runtime` (both entrypoints, prod deps only), `migrate` (prisma migrate deploy)
../../deploy/k8s/              (repo root) platform install, Grafana dashboard, apps/ (Redis, core, game-svc + headless `game-svc-grpc` Service, frontend); see its README
```

## REST routes

| Method | Path                           | Guard            | Handler                                                                   |
| ------ | ------------------------------ | ---------------- | ------------------------------------------------------------------------- |
| POST   | `/auth/login/email`            | –                | `{email, password, deviceId}` → `{access, refresh}`                       |
| POST   | `/auth/login/name`             | –                | `{name, password, deviceId}` → tokens                                     |
| PUT    | `/auth/use-refresh`            | –                | `{refreshToken}` → new pair; old session deleted                          |
| DELETE | `/auth/logout`                 | Auth             | deletes session for `user.id` + `deviceId`                                |
| POST   | `/auth/send-verification-mail` | –                | creates/updates Confirmation; **returns the code** while mail is disabled |
| PATCH  | `/auth/verify-email`           | –                | `{email, code}` marks confirmed                                           |
| GET    | `/auth/google/oauth/link`      | –                | Google consent URL                                                        |
| POST   | `/auth/google/oauth`           | –                | `{code}` → tokens, or `action: 'user:created'` when no user exists yet    |
| POST   | `/user/signup`                 | –                | needs a Confirmation for the email; returns tokens                        |
| GET    | `/user`                        | Auth             | profile (cached)                                                          |
| GET    | `/user/games`                  | Auth             | `{games, wins, looses, draws}`                                            |
| PATCH  | `/user`                        | Auth             | rename                                                                    |
| GET    | `/user/payment/history`        | Auth             | `{total, invoices}`                                                       |
| GET    | `/payments/checkout-session`   | Auth             | Stripe checkout URL                                                       |
| POST   | `/payments/webhook`            | Stripe signature | `checkout.session.completed` → `UserService.topUpBalance`                 |
| GET    | `/health/live`                 | –                | liveness probe                                                            |
| GET    | `/health/ready`                | –                | readiness: Redis ping + Postgres `SELECT 1` (core), 503 when down         |

`AuthGuard` parses `Authorization: Bearer <jwt>` (payload `{id, deviceId}`), checks the DB session, and sets `req.user = {id, name, deviceId}`.

## WebSocket contract (namespace `/game`, transport `websocket`)

Handshake: `?Authorization=<jwt>`. A valid user JWT → authorized Client. Anything else → anonymous Client with a random `userId`, which receives `user:anon-token`.

Client → server (`@SubscribeMessage`):

| Event                                          | Body                                                             | Guard           | Effect                                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| `create`                                       | `{side: 'w'\|'b'\|'rand', time, timeIncrement, bet}` (ms, cents) | IsBalanceEnough | new Game in lobby; `game:created` to creator, `lobby:added` to all                                    |
| `join`                                         | `{gameId}`                                                       | IsBalanceEnough | second player joins; `game:init-data` to each, `game:start` to both players, clocks start             |
| `rejoin`                                       | –                                                                | –               | re-sends `game:init-data`; `game:player-reconnected` to room                                          |
| `leave`                                        | –                                                                | –               | leaver loses; `game:end` (`playerLeave`)                                                              |
| `move`                                         | `{gameId, figure, cell}`                                         | IsPlayer        | validate + apply; `game:board-update {effect:{strike,shah,mate}, update:{figure,cell,prevCell,side}}` |
| `chat-message`                                 | `{gameId, text}`                                                 | IsPlayer        | `game:chat-message`                                                                                   |
| `surrender`                                    | `{gameId}`                                                       | IsPlayer        | `game:end` (`surrender`)                                                                              |
| `draw_propose` / `draw_accept` / `draw_reject` | `{gameId}`                                                       | IsPlayer        | `game:draw_propose` / `game:end` (`draw`) / `game:draw_rejected`                                      |
| `add_time`                                     | `{gameId}`                                                       | IsPlayer        | adds `timeIncrement` to the opponent; `game:add-time`                                                 |

Server → client (from `EmitTypes.ts`): `lobby:update` (full list, on connect only), `lobby:added`, `lobby:removed` (deltas), `user:anon-token`, `game:pending-one`, `game:created`, `game:init-data`, `game:start`, `game:board-update`, `game:chat-message`, `game:draw_propose`, `game:draw_rejected`, `game:add-time`, `game:end`, `game:opponent-disconnected`, `game:player-reconnected`. Rooms: `game:<id>` (both players) and `user:<id>` (every socket of a user, joined on connect).

## Reads and writes (CQRS, no event sourcing)

- **Writes**: every state change is a command to game-svc (`GameClient` -> `GameCommandHandler` -> `GameService` -> `GameRepository.update`). Commands return only what the caller needs (`create` -> id, `pending` -> initData), mostly `null`.
- **Read models**: the Lua save script writes `{chess}:view:lobby` and `{chess}:view:user:<id>` in the same call as the snapshot (synchronous projection: no lag, no worker). core reads them through `GameReadModel`; connect and disconnect send no command unless there is a lobby game to cancel. `rejoin` still asks game-svc (`pending`), because init data needs the full aggregate.
- **Domain events**: `Game` records events while it is mutated. They are dropped with the aggregate when a CAS save retries, and published by `GameService` only after a successful save. They are in-process, not persisted; the only persisted, cross-service event is `game.ended` on `{chess}:events`.
- **Pushes**: `SocketEventPublisher` (game-svc) turns events into emits through the Redis emitter, which the Redis adapter on every core pod delivers to sockets. At-most-once; a client that missed something re-syncs with `rejoin`. Mate sends only `game:board-update` (with `effect.mate`), no `game:end`, as before.
- **Rebuild**: `npm run views:rebuild` after a projection bug, a new view, or a Redis restore.

Clocks run on the client. `game:init-data`, `game:board-update` and `game:add-time` carry `clock: {w, b, running, serverNow}` (remaining ms at `serverNow`, `running` = side to move or `null`). The client anchors on receipt with `performance.now()` and counts down locally; the server stays authoritative and ends games from `{chess}:deadlines`.

## Service communication

| Path | Transport | Delivery | Code |
| --- | --- | --- | --- |
| core → game-svc commands | gRPC `chess.game.v1.GameCommands`, headless Service, `round_robin` | at most once per attempt; retried once only on `UNAVAILABLE` (never reached a server); 5 s deadline | `GameClient` → `GameGrpcController` → `GameCommandHandler` |
| game-svc → sockets | Redis pub/sub via `@socket.io/redis-emitter` → Redis adapter on every core pod | at most once; client re-syncs with `rejoin` | `SocketEventPublisher` |
| game-svc → core `game.ended` | Redis Stream `{chess}:events`, consumer group `history` | at least once; idempotent on `matchId` | Lua save → `EventStream` → `GameHistoryConsumer` |

**gRPC errors.** game-svc throws Nest `HttpException`s as before. `HttpToGrpcFilter` maps the status to a gRPC code (400 `INVALID_ARGUMENT`, 403 `PERMISSION_DENIED`, 404 `NOT_FOUND`, 409 `ABORTED`, 5xx `INTERNAL`) and puts `{status, response}` in the `x-http-error-bin` trailer. `GameClient` rebuilds the same exception class from it, so `WsValidationFilter` still sends the same `exception` event. Transport failures (`UNAVAILABLE`, `DEADLINE_EXCEEDED`, `CANCELLED`) become `GameServiceUnavailableError` (503). A deadline that already passed when game-svc picks up the call is refused; one that passes mid-command can still commit (the client then sees a timeout for an applied command).

**Proto rules.** `npm run proto` lints and regenerates `src/generated`. Never reuse or renumber a field; add new fields only. `npm run proto:breaking` compares against `dev`. ids are `int64` (decoded as JS numbers by `longs: Number`); clock and config values are `double`. The loader uses `defaults: true`, so `false`/`0`/`''` survive the wire; `optional` marks nullable values (`running`, `PendingReply.game`).

**Event stream.** The Lua save that marks a game `ended` also runs `XADD {chess}:events MAXLEN ~ 100000 ACKED * message <IntegrationEvent>` in the same script (a transactional outbox without a relay). `ACKED` (Redis ≥ 8.2) trims only entries every consumer group has acknowledged, so a stopped consumer never loses events; it makes the stream grow instead, which `ChessEventLag` alerts on. `EventStream` reads with `XREADGROUP` (blocking reader connection per subscription), `XACK`s after the handler, and reclaims entries idle ≥ 30 s with `XAUTOCLAIM`. The delivery count from `XPENDING` decides: at 5, the entry goes to `{chess}:events:dead` (with group and error) and is acked. Results are persisted only when both players are authorized.

## Redis keys (hash tag `{chess}`)

| Key                          | Type   | Content                                                                                   |
| ---------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `{chess}:game:<id>`          | hash   | `data` (GameSnapshot JSON), `version`. Expires 10 min after the game ends or is cancelled |
| `{chess}:game:seq`           | string | game id counter                                                                           |
| `{chess}:lobby`              | zset   | lobby game ids by createdAt                                                               |
| `{chess}:active`             | set    | active game ids                                                                           |
| `{chess}:deadlines`          | zset   | active game id -> ms when the side to move runs out of time                               |
| `{chess}:view:lobby`         | hash   | read model: lobby game id -> LobbyView JSON                                               |
| `{chess}:view:user:<userId>` | hash   | read model: `gameId`, `status` (`lobby`/`active`), `opponentId`; deleted when the game ends |
| `{chess}:events`             | stream | integration events (`game.v1.ended`); trimmed only after every group acked                |
| `{chess}:events:dead`        | stream | events that failed 5 deliveries: `message`, `group`, `id`, `error`                         |
| `{chess}:clock:leader`       | string | instance id of the clock leader, 3 s lease                                                |

## Game engine glossary

Figure ids in `GameProcess.initBoard()`: `pawn1..8`, `R1/R2` rook, `K1/K2` **knight**, `B1/B2` bishop, `Q` queen, `Kn` **king**. Cells are `a1`..`h8`. "shah" = check, "mate" = checkmate, "striked" = captured. White moves first. Each side has its own `setInterval` clock, and a move adds `timeIncrement` to the mover. Castling, en passant and promotion are not implemented.

## Data model (Prisma)

- `User` (unique `name`, `email`; bcrypt `password`; `balance` and `winningBalance` in cents) 1–1 `Confirmation`, 1–n `Auth` sessions, 1–n `Payment`, n–m `Game` via `UserInGame`, 1–n `LobbyMessage` (unused).
- `Auth`: one refresh token per (user, deviceId); expires after ~17 days (DB default).
- `Game`: `matchId` (uuid, unique; the live game's `matchId`, used for idempotent saves), config (`maxTime`, `timeIncrement`, `sideSelecting`, `bet`), `isDraw`, `moves` JSON.
- `UserInGame`: side, `isWinner`, `balanceChange`.

## Env

`.env.sample`: `ENV, PORT, JWT_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES, DATABASE_URL, REDIS_URL, GRPC_PORT (game-svc, default 50051), GAME_SVC_GRPC_TARGET (core, default `localhost:50051`; `dns:///game-svc-grpc:50051` in k8s), HEALTH_PORT (game-svc), OTEL_SERVICE_NAME, OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_METRIC_EXPORT_INTERVAL, OTEL_SDK_DISABLED, OTEL_SEMCONV_STABILITY_OPT_IN, STRIPE_KEY, STRIPE_SECRET, STRIPE_WEBHOOK_SECRET, STRIPE_CHECKOUT_SESSION_SUCCESS_URL, STRIPE_CHECKOUT_SESSION_CANCEL_URL, SG_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_SECRET, GOOGLE_REDIRECT_URL`.

## Known issues (seen while mapping, not fixed)

- `ConnectionPatchProvider.withToken` reads `payload.userId`, but user JWTs carry `id`. The session lookup works only because Prisma ignores the `undefined` filter and matches on `deviceId` alone.
- The Stripe price id is hard-coded in `stripe.service.ts`, and outgoing email is disabled.
