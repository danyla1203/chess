# Backend map

NestJS 12, two processes from one codebase and one image:

- **core** (`src/main.ts`, `AppModule`): REST, the Socket.IO gateway, game history. Game actions go to game-svc as RabbitMQ RPC.
- **game-svc** (`src/game-service/main.ts`, `GameServiceModule`): game rules, Redis game state, clocks, outbox relay. No REST, no sockets.

Each entry imports `src/tools/telemetry/otel.ts` first (starts the OTel SDK before anything else is required), then bootstraps. core adds a global `ValidationPipe` and `LoggerFilter` and listens on `PORT` (9200 in dev). CORS allows `http://localhost:3000` when `ENV=dev`.

## Layout

```
src/
├── main.ts                    bootstrap, CORS, global pipe/filter
├── main.ts                    (also installs RedisIoAdapter: Socket.IO rooms and emits shared across instances)
├── app.module.ts              [core] Config (global), Redis cache (global), Logger, Telemetry, Redis, Messaging, Health, Auth, Gateway, Payments, User, GameHistory
├── prisma.service.ts          PrismaClient + pg adapter; each module provides its own instance
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
│   ├── game.gateway.ts        @SubscribeMessage handlers; every game action is an RPC to game-svc via GameClient
│   ├── game.client.ts         typed RabbitMQ RPC client for the commands in game/game.contract.ts
│   ├── socket.notifier.ts     all server -> client emits, addressed to `user:<id>` / `game:<id>` rooms so they work across instances
│   ├── notification.consumer.ts  consumes `ws.notifications` (ticks, timeouts) from game-svc and emits them
│   ├── ClientStore.ts         Client identity kept on `socket.data.client`
│   ├── connection.provider.ts handshake: JWT -> authorized Client, otherwise anonymous temp token
│   ├── balance.model.ts       user balance lookup for IsBalanceEnough
│   ├── guards/                IsBalanceEnough (bet <= balance)
│   └── gateway.metrics.ts     open Socket.IO connections
├── game-service/              [game-svc] second entrypoint, no REST: health endpoints only
│   ├── main.ts                bootstraps GameServiceModule, listens on HEALTH_PORT (9300)
│   ├── game.commands.ts       serves `game-svc.commands`: maps each command to GameService, checks the caller is a player
│   └── amqp.notifier.ts       GameNotifier that publishes ticks and timeout endings to `game.notifications`
├── game/                      [game-svc] game domain, no transport code
│   ├── game.contract.ts       command request/response types and notification union shared by core and game-svc
│   ├── game.service.ts        create/join/move/draw/surrender/leave/timeout on top of GameRepository
│   ├── game.repository.ts     Redis game store: versioned snapshot per game, Lua compare-and-set save that also updates indexes and writes the outbox
│   ├── game.notifier.ts       abstract GameNotifier (timeTick, gameEnd)
│   ├── game.clock.ts          leader-elected (Redis lock) 1 s loop: `game:time` ticks and timeouts from the deadline index
│   ├── game.events.ts         Game -> GameEndedEvent / outbox message
│   ├── game.metrics.ts        OTel metrics: moves, move latency, games created/ended, bet volume, active/lobby, clock leader
│   ├── EmitTypes.ts           server -> client event names (shared contract with frontend)
│   ├── dto/                   CreateGame, Turn, ChatMessage + payload types
│   └── entities/
│       ├── Client.ts          identity: userId, name, authorized, anonymous temp token
│       ├── Player.ts          identity + side + remaining time; snapshot (de)serialization
│       └── game/
│           ├── game.ts        Game aggregate: status, players, clocks (turnStartedAt + remaining ms), moves, chat, draw flags; toSnapshot/fromSnapshot
│           ├── game.chat.ts   per-game chat log
│           ├── game.adapter.ts  Game -> DTOs (plain board, init data, result)
│           └── process/
│               ├── game.process.ts  move validation, check ("shah") and mate detection
│               └── game.state.ts    board maps per side, turn side, check/threat sets
├── payments/
│   ├── payments.controller.ts /payments/* routes
│   ├── payments.service.ts    checkout session, webhook -> balance top-up
│   └── stripe/                StripeService (lazy client, fixed price id)
├── redis/                     RedisModule (ioredis client, token REDIS) and RedisKeys
├── game-history/              consumes game.ended (queue core.game-ended); saves game + balance changes in one serializable tx, idempotent on matchId
├── messaging/                 RabbitMQ (amqp-connection-manager): topology.ts (exchanges, queues, DLX), contracts.ts (event payloads), rpc.ts (error mapping), RabbitMQService (confirmed publish, ack/nack consumers, request/serve RPC over direct reply-to), OutboxRelay (game-svc only)
├── health/                    GET /health/live, GET /health/ready (Redis + RabbitMQ, plus Postgres in core)
├── mail/mail.service.ts       SendGrid wrapper; sending is commented out
└── tools/
    ├── logger/                winston LoggerService (console + logs/log.json), global LoggerFilter
    ├── WsValidationFilter.ts  maps 400/404/409 HttpExceptions to WsException
    └── telemetry/             otel.ts: NodeSDK with OTLP traces, metrics and logs, auto + Prisma instrumentation; TelemetryModule flushes on shutdown
prisma/
├── schema.prisma              models below
├── migrations/                SQL migrations (Aug 2023 – Aug 2024)
└── seed.ts                    `--env test` seeds users, payments, sessions, games
prisma.config.ts               schema path, migrations path, seed command, DATABASE_URL
test/                          mirrors src; *.test.ts (unit), *.int-test.ts (DB), *.e2e-test.ts (HTTP)
postman/, .postman/            Postman collection for the REST API
docker.compose.yml             core + game-svc + postgres:17 + redis (AOF) + rabbitmq + grafana/otel-lgtm (Grafana on :3001)
Dockerfile.prod                targets: `runtime` (both entrypoints, prod deps only), `migrate` (prisma migrate deploy)
deploy/k8s/                    platform install (kube-prometheus-stack, Tempo, Loki, OTel Collector, Headlamp, RabbitMQ operator), Grafana dashboard, apps/ (Redis, core, game-svc)
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
| GET    | `/health/ready`                | –                | readiness: Postgres `SELECT 1` + RabbitMQ connection, 503 when down       |

`AuthGuard` parses `Authorization: Bearer <jwt>` (payload `{id, deviceId}`), checks the DB session, and sets `req.user = {id, name, deviceId}`.

## WebSocket contract (namespace `/game`, transport `websocket`)

Handshake: `?Authorization=<jwt>`. A valid user JWT → authorized Client. Anything else → anonymous Client with a random `userId`, which receives `user:anon-token`.

Client → server (`@SubscribeMessage`):

| Event                                          | Body                                                             | Guard           | Effect                                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| `create`                                       | `{side: 'w'\|'b'\|'rand', time, timeIncrement, bet}` (ms, cents) | IsBalanceEnough | new Game in lobby; `game:created` to creator, `lobby:update` to all                                   |
| `join`                                         | `{gameId}`                                                       | IsBalanceEnough | second player joins; `game:init-data` to each, `game:start` to both players, clocks start             |
| `rejoin`                                       | –                                                                | –               | re-sends `game:init-data`; `game:player-reconnected` to room                                          |
| `leave`                                        | –                                                                | –               | leaver loses; `game:end` (`playerLeave`)                                                              |
| `move`                                         | `{gameId, figure, cell}`                                         | IsPlayer        | validate + apply; `game:board-update {effect:{strike,shah,mate}, update:{figure,cell,prevCell,side}}` |
| `chat-message`                                 | `{gameId, text}`                                                 | IsPlayer        | `game:chat-message`                                                                                   |
| `surrender`                                    | `{gameId}`                                                       | IsPlayer        | `game:end` (`surrender`)                                                                              |
| `draw_propose` / `draw_accept` / `draw_reject` | `{gameId}`                                                       | IsPlayer        | `game:draw_propose` / `game:end` (`draw`) / `game:draw_rejected`                                      |
| `add_time`                                     | `{gameId}`                                                       | IsPlayer        | adds `timeIncrement` to the opponent; `game:add-time`                                                 |

Server → client (from `EmitTypes.ts`): `lobby:update`, `user:anon-token`, `game:pending-one`, `game:created`, `game:init-data`, `game:start`, `game:time` (every 1 s), `game:board-update`, `game:chat-message`, `game:draw_propose`, `game:draw_rejected`, `game:add-time`, `game:end`, `game:opponent-disconnected`, `game:player-reconnected`. Rooms: `game:<id>` (both players) and `user:<id>` (every socket of a user, joined on connect). `game:time` comes from the clock leader, whichever instance holds `{chess}:clock:leader`.

## Messaging (RabbitMQ)

| Exchange             | Type   | Routing key            | Queue                                                         | Consumer                                                     |
| -------------------- | ------ | ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| `game.lifecycle`     | topic  | `game.v1.ended`        | `core.game-ended` (quorum, delivery limit 5, DLX `chess.dlx`) | `GameHistoryConsumer`                                        |
| `game.commands`      | direct | `game.v1.command`      | `game-svc.commands` (quorum, delivery limit 5, DLX)           | `GameCommandHandler` (game-svc), replies via direct reply-to |
| `game.notifications` | direct | `game.v1.notification` | `ws.notifications` (quorum, single active consumer, TTL 10 s) | `NotificationConsumer` (core)                                |
| `chess.dlx`          | topic  | `#`                    | `chess.dead-letter` (quorum)                                  | none, inspect manually                                       |

Commands carry the command name in the AMQP `type` property and expire after 5 s. Replies are `{ok, data}` or `{ok: false, error: {status, response}}`; core rebuilds the HttpException so `WsValidationFilter` sends the same `exception` event as before. Notifications use a single active consumer so ticks and endings keep their order; the Redis adapter fans them out to sockets on every core pod.

A consumer that throws gets the message back after a backoff (100 ms doubling, max 2 s). `RabbitMQService.subscribe` counts attempts from `x-acquired-count` (RabbitMQ 4) or `x-delivery-count` (3.x) and rejects without requeue on attempt 5, which dead-letters it. The queue's `x-delivery-limit` alone is not enough on RabbitMQ 4: a `nack` with requeue does not count toward it.

Each service has its own broker user in Kubernetes (`deploy/k8s/rabbitmq/users.yaml`): only core may publish to `game.commands`, only game-svc to `game.lifecycle`, `game.notifications` and the default exchange.

Game end goes through a transactional outbox: the Lua save that marks a game `ended` also `XADD`s the event to `{chess}:outbox`. `OutboxRelay` (consumer group `relay`) publishes with confirms (`messageId` = `matchId`), then `XACK`+`XDEL`s. Unconfirmed entries are reclaimed after 30 s idle. Results are persisted only when both players are authorized.

## Redis keys (hash tag `{chess}`)

| Key                          | Type   | Content                                                                                   |
| ---------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `{chess}:game:<id>`          | hash   | `data` (GameSnapshot JSON), `version`. Expires 10 min after the game ends or is cancelled |
| `{chess}:game:seq`           | string | game id counter                                                                           |
| `{chess}:lobby`              | zset   | lobby game ids by createdAt                                                               |
| `{chess}:active`             | set    | active game ids                                                                           |
| `{chess}:deadlines`          | zset   | active game id -> ms when the side to move runs out of time                               |
| `{chess}:user-game:<userId>` | string | the user's lobby or active game id                                                        |
| `{chess}:outbox`             | stream | pending broker messages                                                                   |
| `{chess}:clock:leader`       | string | instance id of the clock leader, 3 s lease                                                |

## Game engine glossary

Figure ids in `GameProcess.initBoard()`: `pawn1..8`, `R1/R2` rook, `K1/K2` **knight**, `B1/B2` bishop, `Q` queen, `Kn` **king**. Cells are `a1`..`h8`. "shah" = check, "mate" = checkmate, "striked" = captured. White moves first. Each side has its own `setInterval` clock, and a move adds `timeIncrement` to the mover. Castling, en passant and promotion are not implemented.

## Data model (Prisma)

- `User` (unique `name`, `email`; bcrypt `password`; `balance` and `winningBalance` in cents) 1–1 `Confirmation`, 1–n `Auth` sessions, 1–n `Payment`, n–m `Game` via `UserInGame`, 1–n `LobbyMessage` (unused).
- `Auth`: one refresh token per (user, deviceId); expires after ~17 days (DB default).
- `Game`: `matchId` (uuid, unique; the live game's `matchId`, used for idempotent saves), config (`maxTime`, `timeIncrement`, `sideSelecting`, `bet`), `isDraw`, `moves` JSON.
- `UserInGame`: side, `isWinner`, `balanceChange`.

## Env

`.env.sample`: `ENV, PORT, JWT_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES, DATABASE_URL, REDIS_URL, RABBITMQ_URL (or RABBITMQ_USER, RABBITMQ_PASSWORD, RABBITMQ_HOST, RABBITMQ_PORT), HEALTH_PORT (game-svc), OTEL_SERVICE_NAME, OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_METRIC_EXPORT_INTERVAL, OTEL_SDK_DISABLED, OTEL_SEMCONV_STABILITY_OPT_IN, STRIPE_KEY, STRIPE_SECRET, STRIPE_WEBHOOK_SECRET, STRIPE_CHECKOUT_SESSION_SUCCESS_URL, STRIPE_CHECKOUT_SESSION_CANCEL_URL, SG_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_SECRET, GOOGLE_REDIRECT_URL`.

## Known issues (seen while mapping, not fixed)

- `ConnectionPatchProvider.withToken` reads `payload.userId`, but user JWTs carry `id`. The session lookup works only because Prisma ignores the `undefined` filter and matches on `deviceId` alone.
- The Stripe price id is hard-coded in `stripe.service.ts`, and outgoing email is disabled.
