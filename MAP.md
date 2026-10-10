# Backend map

NestJS 12 app. Entry: `src/main.ts` starts OpenTelemetry (`src/tools/tracing.ts`), then creates `AppModule` with a global `ValidationPipe` and `LoggerFilter`, and listens on `PORT` (9200 in dev). CORS allows `http://localhost:3000` when `ENV=dev`.

## Layout

```
src/
├── main.ts                    bootstrap, CORS, global pipe/filter
├── app.module.ts              Config (global), Redis cache (global), Logger, Auth, Game, Payments, User
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
├── game/                      real-time chess over Socket.IO, namespace /game
│   ├── game.gateway.ts        @SubscribeMessage handlers, room broadcast
│   ├── game.service.ts        orchestrates create/join/move/draw/surrender/leave, persists results
│   ├── game.list.ts           in-memory lobby[] (waiting) and games[] (running)
│   ├── ClientStore.ts         socket.id -> Client map; reconnect keeps the same Client by userId
│   ├── connection.provider.ts handshake: JWT -> authorized Client, otherwise anonymous temp token
│   ├── model.ts               saves finished games; winner/loser balance changes in one serializable tx
│   ├── guards/                IsPlayer (socket belongs to game), IsBalanceEnough (bet <= balance)
│   ├── EmitTypes.ts           server -> client event names (shared contract with frontend)
│   ├── dto/                   CreateGame, Turn, ChatMessage + payload types
│   └── entities/
│       ├── Client.ts          wraps a socket + identity; lobby/pending/created emitters
│       ├── Player.ts          Client + side + clock; game-end/time-tick/init emitters
│       └── game/
│           ├── game.ts        Game aggregate: players, config, clocks (setInterval), moves, draw flags
│           ├── game.chat.ts   per-game chat log
│           ├── game.adapter.ts  Game -> DTOs (plain board, init data, result)
│           └── process/
│               ├── game.process.ts  move validation, check ("shah") and mate detection
│               └── game.state.ts    board maps per side, turn side, check/threat sets
├── payments/
│   ├── payments.controller.ts /payments/* routes
│   ├── payments.service.ts    checkout session, webhook -> balance top-up
│   └── stripe/                StripeService (lazy client, fixed price id)
├── mail/mail.service.ts       SendGrid wrapper; sending is commented out
└── tools/
    ├── logger/                winston LoggerService (console + logs/log.json), global LoggerFilter
    ├── WsValidationFilter.ts  maps 400/404/409 HttpExceptions to WsException
    └── tracing.ts             OTel NodeSDK: OTLP traces/metrics, auto + Prisma instrumentation
prisma/
├── schema.prisma              models below
├── migrations/                SQL migrations (Aug 2023 – Aug 2024)
└── seed.ts                    `--env test` seeds users, payments, sessions, games
prisma.config.ts               schema path, migrations path, seed command, DATABASE_URL
test/                          mirrors src; *.test.ts (unit), *.int-test.ts (DB), *.e2e-test.ts (HTTP)
postman/, .postman/            Postman collection for the REST API
docker.compose.yml             app + postgres:17 + redis + jaeger + prometheus + grafana
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

`AuthGuard` parses `Authorization: Bearer <jwt>` (payload `{id, deviceId}`), checks the DB session, and sets `req.user = {id, name, deviceId}`.

## WebSocket contract (namespace `/game`, transport `websocket`)

Handshake: `?Authorization=<jwt>`. A valid user JWT → authorized Client. Anything else → anonymous Client with a random `userId`, which receives `user:anon-token`.

Client → server (`@SubscribeMessage`):

| Event                                          | Body                                                             | Guard           | Effect                                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| `create`                                       | `{side: 'w'\|'b'\|'rand', time, timeIncrement, bet}` (ms, cents) | IsBalanceEnough | new Game in lobby; `game:created` to creator, `lobby:update` to all                                   |
| `join`                                         | `{gameId}`                                                       | IsBalanceEnough | second player joins; `game:init-data` to each, `game:start` to room, clocks start                     |
| `rejoin`                                       | –                                                                | –               | re-sends `game:init-data`; `game:player-reconnected` to room                                          |
| `leave`                                        | –                                                                | –               | leaver loses; `game:end` (`playerLeave`)                                                              |
| `move`                                         | `{gameId, figure, cell}`                                         | IsPlayer        | validate + apply; `game:board-update {effect:{strike,shah,mate}, update:{figure,cell,prevCell,side}}` |
| `chat-message`                                 | `{gameId, text}`                                                 | IsPlayer        | `game:chat-message`                                                                                   |
| `surrender`                                    | `{gameId}`                                                       | IsPlayer        | `game:end` (`surrender`)                                                                              |
| `draw_propose` / `draw_accept` / `draw_reject` | `{gameId}`                                                       | IsPlayer        | `game:draw_propose` / `game:end` (`draw`) / `game:draw_rejected`                                      |
| `add_time`                                     | `{gameId}`                                                       | IsPlayer        | adds `timeIncrement` to the opponent; `game:add-time`                                                 |

Server → client (from `EmitTypes.ts`): `lobby:update`, `user:anon-token`, `game:pending-one`, `game:created`, `game:init-data`, `game:start`, `game:time` (every 1 s), `game:board-update`, `game:chat-message`, `game:draw_propose`, `game:draw_rejected`, `game:add-time`, `game:end`, `game:opponent-disconnected`, `game:player-reconnected`. Rooms are named `game:<id>`.

## Game engine glossary

Figure ids in `GameProcess.initBoard()`: `pawn1..8`, `R1/R2` rook, `K1/K2` **knight**, `B1/B2` bishop, `Q` queen, `Kn` **king**. Cells are `a1`..`h8`. "shah" = check, "mate" = checkmate, "striked" = captured. White moves first. Each side has its own `setInterval` clock, and a move adds `timeIncrement` to the mover. Castling, en passant and promotion are not implemented.

## Data model (Prisma)

- `User` (unique `name`, `email`; bcrypt `password`; `balance` and `winningBalance` in cents) 1–1 `Confirmation`, 1–n `Auth` sessions, 1–n `Payment`, n–m `Game` via `UserInGame`, 1–n `LobbyMessage` (unused).
- `Auth`: one refresh token per (user, deviceId); expires after ~17 days (DB default).
- `Game`: config (`maxTime`, `timeIncrement`, `sideSelecting`, `bet`), `isDraw`, `moves` JSON.
- `UserInGame`: side, `isWinner`, `balanceChange`.

## Env

`.env.sample`: `ENV, PORT, JWT_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES, DATABASE_URL, REDIS_URL, OTEL_METRIC_EXPORTER_URL, OTEL_TRACE_EXPORTER_URL, STRIPE_KEY, STRIPE_SECRET, STRIPE_WEBHOOK_SECRET, STRIPE_CHECKOUT_SESSION_SUCCESS_URL, STRIPE_CHECKOUT_SESSION_CANCEL_URL, SG_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_SECRET, GOOGLE_REDIRECT_URL`.

## Known issues (seen while mapping, not fixed)

- `IsBalanceEnough` calls `clientStore.getClient(socket)` with the socket object instead of `socket.id`. The lookup returns `undefined`, so any `create` with `bet > 0` throws.
- `GameService.injectableGameEndCallback` (timeout) calls `winner.gameEndEvent` twice, so the loser never gets `game:end`.
- `ConnectionPatchProvider.withToken` reads `payload.userId`, but user JWTs carry `id`. The session lookup works only because Prisma ignores the `undefined` filter and matches on `deviceId` alone.
- The Stripe price id is hard-coded in `stripe.service.ts`, and outgoing email is disabled.
