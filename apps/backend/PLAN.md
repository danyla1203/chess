# Plan

## 1. Terraform: OCI Kubernetes deployment

Goal: provision an OKE cluster on Oracle Cloud and deploy the existing `deploy/k8s` manifests onto it.

- [ ] `deploy/terraform/` layout: `providers.tf`, `variables.tf`, `network.tf`, `oke.tf`, `registry.tf`, `outputs.tf`, `terraform.tfvars.example`
- [ ] Provider: `oracle/oci`, auth via API key or instance principal; remote state in an OCI Object Storage bucket (S3-compatible backend)
- [ ] Network: VCN, public subnet (load balancer), private subnets (nodes, API endpoint), internet/NAT/service gateways, security lists
- [ ] OKE: enhanced cluster, node pool (shape and OCPU/memory as variables, Always Free `VM.Standard.A1.Flex` as default), kubeconfig output
- [ ] Container registry (OCIR) repos for core and game-svc images; image pull secret
- [ ] Data services: decide managed vs in-cluster for Postgres and Redis (AOF required, ≥ 8.2 for `XADD … ACKED`)
- [ ] Secrets: `.env` values (Stripe, Google OAuth, DB, Redis) via OCI Vault or Kubernetes secrets created from tfvars
- [ ] Ingress / load balancer: OCI LB annotations on the ingress controller, DNS and TLS (cert-manager)
- [ ] Deploy manifests: `kubernetes`/`helm` provider or a post-apply `kubectl apply -k deploy/k8s`; keep in line with the existing up/down scripts
- [ ] Observability: point the OpenTelemetry stack at the cluster
- [ ] CI: image build and push to OCIR, `terraform fmt/validate/plan`
- [ ] Docs: prerequisites, `terraform init/plan/apply`, teardown, cost notes

## 2. Load imitation script

Goal: simulate many concurrent players against the API and Socket.IO gateway; must run locally against `npm run start:dev` + `npm run start:game-svc`.

- [ ] Location: `scripts/load/` (separate from `src/`), run with `npm run load -- --users 100 --duration 60`
- [ ] Config flags and env: base URL, user count, ramp-up, duration, game think-time, seed
- [ ] Setup phase: register or log in N bot users via REST, collect tokens (reuse the seed user setup from `prisma db seed -- --env test`)
- [ ] Bot behaviour: connect over `socket.io-client`, join matchmaking, play full games with legal random moves (chess lib), occasionally resign, draw offer, or disconnect and reconnect
- [ ] Event names taken from `src/game/EmitTypes.ts`
- [ ] Metrics: connect time, move round-trip latency (p50/p95/p99), games started/finished, errors, dropped sockets; printed summary plus optional JSON output
- [ ] Local run: documented against the local stack (Postgres, Redis, core, game-svc via docker-compose); safe default user count
- [ ] Optional: run in-cluster as a k8s Job against the OCI deployment
- [ ] Verify: game history persisted through outbox, no stuck games in Redis after the run

## 3. CQRS (no event sourcing, no `@nestjs/cqrs`)

Goal: game-svc owns writes only; core answers reads from Redis read models; every state change produces a domain event that feeds pushes and projections.

Why: `lobby` is the hot read. Today every `create`/`join`/disconnect triggers a `lobby` RPC that loads the full snapshot of every lobby game, then `server.emit`s the whole list to every socket. Every connect also calls `pending` + `lobby`, so a reconnect storm (deploy, network blip) lands on game-svc as N×2 RPCs.
Not chosen: event sourcing (snapshots, replay, versioning, retention for little payoff; moves are already stored); `@nestjs/cqrs` (an in-process bus, which the `handlers` map already is).
Alternative kept in view: only cache `lobby` in core (TTL 250 ms). Much cheaper, still stale, doesn't fix fan-out.

Split
- [x] Commands (game-svc; RabbitMQ RPC until section 4): `create`, `join`, `cancelLobby`, `leave`, `surrender`, `move`, `chat`, `proposeDraw`, `acceptDraw`, `rejectDraw`, `addTime`. All return `null` except `create` (id, matchId) and `join` (id)
- [x] Queries (core, Redis, no RPC): `lobby`, `opponent`, and the cheap part of `pending` (does the user have an active game, which id). The `lobby` and `opponent` commands are gone
- [x] `pending` with `initData` stays a command (rejoin only). Connect reads `view:user` and sends no command; disconnect sends `cancelLobby` only when `view:user` says `lobby` (it used to send `cancelLobby` + `opponent` + `lobby` on every disconnect)

Read models (written by the save Lua script, same transaction = synchronous projection)
- [x] `{chess}:view:lobby`: hash `gameId → LobbyView JSON`. `HVALS` replaces the zset + `loadMany` + parse of whole snapshots. The zset stays as the write-side index (`counts()`, rebuild)
- [x] `{chess}:view:user:<userId>`: hash `{gameId, status, opponentId}`. Changed from the plan: it **replaces** `user-game:<id>` outright instead of running both keys, because the repository's own `findUserGame` reads the same pointer. Cost: during a rolling deploy old pods write the old key, so run `npm run views:rebuild` once all pods are new
- [x] Trade-off: synchronous projections in Lua are consistent and need no worker, but every new view makes the hot save script bigger. Async projections (stream consumer) decouple them but add lag and rebuild logic. Synchronous for views core reads right after a command; async for everything else (history, stats)
- [x] `src/game-read/` module: `GameReadModel` + `views.ts` types. eslint: game-svc may import only `game-read/views` (regex rule); core still cannot import `game.repository` (existing rule). Raw key strings can't be linted; CLAUDE.md states the rule
- [x] Key ownership: `view:*` is the read contract between the services; snapshot keys stay private to game-svc

Domain events
- [x] `entities/game/game.domain-events.ts`: `created | started | cancelled | moved | chatPosted | drawProposed | drawRejected | timeAdded | ended`
- [x] Recorded by the `Game` aggregate inside its methods (`start`, `cancel`, `makeTurn`, `postMessage`, `endGame`, `acceptDraw`, …), pulled by `GameService` after a successful save. A CAS retry reloads the aggregate, so a lost attempt's events are dropped with it and `mutate` stays side-effect free
- [x] Changed from the plan: **not** appended to a `{chess}:events` stream. Nothing would consume per-move entries yet (pushes are in-process, views are synchronous), and it would be one `XADD` per move for no reader. The only persisted, cross-service event stays `game.ended` (outbox). Add a stream when a real async consumer appears (stats, spectators, replays)
- [x] Integration vs domain: only `GameEnded` is a contract for other services (history); domain events stay internal to game-svc

Pushes (game-svc → sockets)
- [x] `SocketEventPublisher` emits through `@socket.io/redis-emitter` right after the save (low latency, at-most-once). The emitter's `publish` promises are not awaited by the library, so `socket.emitter.ts` wraps the client and logs failures instead of producing unhandled rejections
- [x] Room membership from game-svc: `emitter.in(user:<id>).socketsJoin(game:<id>)` on create/start, published on the same Redis connection as the emits that follow, so the adapter applies it first
- [ ] `version` on payloads + frontend drop of stale events: not done. A move can only follow the opponent having received the previous one, so per-game move order is causal across pods. Remaining risk: a chat/add-time emit racing a move from another pod (harmless). Revisit with spectators or server-initiated bursts
- [x] Not chosen: pushes from a stream consumer group. Entries spread across consumers lose per-game order unless the stream is sharded by `gameId` with one consumer per shard; it also adds `XREADGROUP` latency to every move. Revisit if pushes must be at-least-once
- [x] Gateway handlers: validate → one command → done; errors still go through `WsValidationFilter`. `game:created` now goes to the creator's user room (every tab), not only the creating socket
- [x] Kept as before: mate sends only `game:board-update` with `effect.mate`, no `game:end`

Lobby fan-out
- [x] Deltas `lobby:added {LobbyView}` / `lobby:removed {gameId}` from game-svc on `created` / `started` / `cancelled`; the full `lobby:update` only on connect (from `view:lobby`)
- [x] `EmitTypes.ts` + `chess_frontend` (`SocketContext.tsx` enum, `GameListContext.tsx` handlers) updated together
- [ ] Coalescing fallback: not needed, the frontend changed
- [ ] Scale note, still open: each delta is still a namespace-wide emit, O(connections) per change on every core pod. A `lobby` room joined only by sockets on the lobby page cuts it further

Rebuild and consistency
- [x] `npm run views:rebuild` (`src/game-service/views.rebuild.ts`, run from `dist`): deletes `view:lobby` and every `view:user:*` (SCAN), then reprojects every lobby/active game through a no-op CAS save (`GameRepository.reproject`). A concurrent live write either wins the CAS (and writes the view itself) or is retried; views are briefly empty while it runs
- [x] Migration: deploy core + game-svc → `npm run views:rebuild`
- [x] Stale-read rule: commands return what the caller needs; everything else arrives as a push

Tests and verification
- [x] Int (`game.repository.int-test.ts`): each status transition updates `view:lobby` and `view:user`; a CAS-losing save writes nothing; `reproject` restores views and skips finished games
- [x] Int: `views.rebuild.int-test.ts` (lost + stale views), `socket.publisher.int-test.ts` (real emitter → two Socket.IO nodes: created, lobby deltas, init/start, board update, end), `split.int-test.ts` (commands + read model)
- [x] Unit: events published per command (`game.service.test.ts`), gateway sends one command and emits nothing (`game.gateway.test.ts`), emitter swallows Redis errors (`socket.emitter.test.ts`)
- [ ] Load test (section 2): connect storm of 1k sockets → game-svc commands ≈ 0; lobby p95 and Redis CPU before vs after
- [x] Docs: MAP.md (layout, CQRS section, Redis keys, lobby events), CLAUDE.md (write/read paths, where pushes live)

## 4. Replace RabbitMQ with gRPC

Goal: core → game-svc commands go over gRPC. The `gameEnd` push and the `game.ended` event leave RabbitMQ too (Redis emitter and Redis Stream), so the broker can be removed.

Why: every command is synchronous, someone is waiting on it, and it's useless after 5 s. The broker charges for durability (quorum Raft write + fsync, 4 hops, confirms) and then needs workarounds: TTL, a DLX that collects expired commands, and requeue that re-runs non-idempotent commands.
Alternatives: NATS request/reply (light, subject routing `game.<id>`, but new infra); plain HTTP/2 + JSON (no codegen, weaker contract); merging the gateway into game-svc with sticky routing per game (no hop, bigger redesign).

Contract
- [x] `src/proto/chess/game/v1/game.proto`: `service GameCommands` with `Create`, `Join`, `Pending`, `CancelLobby`, `Leave`, `Surrender`, `Move`, `Chat`, `ProposeDraw`, `AcceptDraw`, `RejectDraw`, `AddTime`. Section 3 made most replies `Empty`, so the contract is small
- [x] `ClientIdentity` in every request; ids `int64` (decoded as numbers), clock/config values `double` (the DTOs accept any number)
- [x] Deep DTOs: fully typed. Only `InitData` is left (board as two `map<string,string>`, `ClockState` with `optional running`); `GameWithWinner` no longer crosses the wire because pushes moved to game-svc. No `bytes json` escape hatch needed
- [x] Codegen: `ts-proto` (`nestJs=true`, `forceLong=number`) via `buf generate` (`@bufbuild/buf` from npm, no system `protoc`). Changed from the plan: generated code is **committed** in `src/generated/`, not gitignored, so the Docker build needs no codegen step and diffs are reviewable. `npm run proto`, excluded from eslint/prettier
- [x] Wire-compat: `buf lint` + `npm run proto:breaking` (against `dev`); rules written in MAP.md and CLAUDE.md
- [x] `grpc.health.v1` proto added next to it

Server (game-svc)
- [x] `@nestjs/microservices` gRPC transport via `connectMicroservice` (`grpc.server.ts`), `GRPC_PORT` (50051) next to the health HTTP port. Pitfalls found: it must be connected with `deferInitialization: true` or the global filter/interceptor are silently ignored; and `@nestjs/microservices` must be pinned to the exact `@nestjs/core` version (12.1.2), 12.1.3 calls a core method that 12.1.2 lacks
- [x] `game.grpc.controller.ts` (generated `GameCommandsControllerMethods`), delegating to `GameCommandHandler.handle` (logic unchanged, RabbitMQ wiring removed)
- [x] `HttpToGrpcFilter` (an exception filter, not an interceptor): status → code (400 `INVALID_ARGUMENT`, 403 `PERMISSION_DENIED`, 404 `NOT_FOUND`, 409 `ABORTED`, 5xx `INTERNAL`), `{status, response}` in trailer `x-http-error-bin`; logs 5xx. Nest's built-in `GrpcExceptionFilter` doesn't map `HttpException` or carry metadata
- [x] `DeadlineInterceptor`: refuses a call whose deadline passed or that was cancelled before it started. Still open: a deadline that passes mid-command can commit (see "Known gaps")
- [x] `grpc.health.v1` Check = Redis ping; k8s readiness probe is now `grpc: {port: 50051}`
- [x] Graceful shutdown: `gracefulShutdown: true` (`tryShutdown` drains), `preStop: sleep 5` so endpoints drop the pod first; `terminationGracePeriodSeconds: 30`
- [x] Limits: keepalive 30 s / 10 s with `permit_without_calls` on both sides, server `min_ping_interval_without_data_ms` 20 s (below the client's 30 s, so no GOAWAY `too_many_pings`), `max_concurrent_streams` 1000

Client (core)
- [x] `gateway/game.client.ts` keeps its public methods; Nest `ClientGrpc` + generated interface, 5 s deadline per call (`deadlineMs`), `chess.rpc.client.duration` histogram with outcome `ok|error|timeout|unavailable` (the OTel gRPC instrumentation gives spans, not this metric, so dashboards/alerts keep the custom one)
- [x] `fromGrpcError` rebuilds the same `HttpException` class; transport failures become `GameServiceUnavailableError` (503)
- [x] Load balancing: `dns:///game-svc-grpc:50051` (headless Service, `clusterIP: None`) + `round_robin` in the service config
- [x] Retries: `retryPolicy` on `UNAVAILABLE` only, 2 attempts, 50–200 ms
- [x] Per-game ordering is safe through CAS on `version`; no routing by `gameId`. Alternative if contention shows up: hash `gameId` over endpoints (client-side picker)

`gameEnd` push (game-svc → sockets)
- [x] Done in section 3 (`SocketEventPublisher`, Redis emitter); `amqp.notifier.ts`, `notification.consumer.ts`, `GameNotification` deleted there

`game.ended` → history (no broker)
- [x] `{chess}:outbox` → `{chess}:events`; payload is an `IntegrationEvent {type: 'game.v1.ended', messageId, payload, trace}`; `EventStream` (generic, `src/messaging/event-stream.ts`) + `GameHistoryConsumer` on group `history`
- [x] Poison handling: delivery count from `XPENDING` on reclaimed entries; at 5 → `{chess}:events:dead` (`MAXLEN ~ 10000`, with group and error) + `XACK`
- [x] Retention: no `XDEL`; Lua appends with `XADD … MAXLEN ~ 100000 ACKED` (verified on Redis 8.10: unread entries survive the trim). Alert `ChessEventLag` because a stopped consumer makes the stream grow instead of losing events
- [x] Group creation is retried inside the consumer loop (and recreated on `NOGROUP`): first version created it once at boot, so a Redis blip during startup left history permanently unsubscribed
- [x] Idempotency unchanged (`matchId` unique, `duplicate`)
- [x] `OutboxRelay` deleted; consumer span links to the producer trace through `trace` in the event
- [x] Gauges `chess.events.lag{group}`, `chess.events.dead`

Removal
- [x] `src/messaging/` RabbitMQ code, `amqp-connection-manager`, `amqplib`
- [x] Health controller: RabbitMQ check removed (Redis + Postgres)
- [x] `deploy/k8s/rabbitmq/`, `deploy/local/rabbitmq/`, RabbitMQ in `platform/install.sh`, `up.sh`, `secrets-lib.sh` (old `RABBITMQ_*` keys in `secrets.env` are still filtered out of `chess-secrets`), `apps/config.yaml`, `core.yaml`, `game-svc.yaml`, both compose files, kube-prometheus-stack dashboard import. `down.sh` keeps a legacy teardown for clusters installed before this change
- [x] Alerts: `ChessCommandTimeouts` (timeout + unavailable), `ChessEventLag`, `ChessDeadEvents`; broker/outbox alerts removed. Dashboard: broker and outbox panels replaced by stream lag and dead events
- [x] eslint: generated code allowed for both sides; core still can't import game internals; game-svc may import only `game-read/views`
- [x] Env: `RABBITMQ_*` dropped; `GRPC_PORT`, `GAME_SVC_GRPC_TARGET` added
- [x] Tests: RabbitMQ tests and fake broker deleted; `grpc.int-test.ts` (in-process server: create/join/pending, falsy values on the wire, error classes, 500 + log, deadline, `UNAVAILABLE`, health), `event-stream.int-test.ts` (backlog, one pod per group, type filter, retry, dead letter, group retry), unit tests for error mapping and the deadline interceptor. `auth.controller.test.ts` and `connection.int-test.ts` boot the full `AppModule`, so they now stub `EventStream`
- [x] Docs: CLAUDE.md, MAP.md, `deploy/k8s/README.md`
- [ ] Load test (section 2): compare move round-trip p50/p95/p99 before vs after
- [ ] Not verified here: `connection.int-test.ts`, `user.int-test.ts`, e2e (need Postgres), `docker compose up`, and a real k8s rollout (gRPC readiness probe needs k8s ≥ 1.27)

Known gaps (not fixed, worth a follow-up)
- A command whose deadline passes after it started still commits; the player sees "Game service did not answer" for an applied move. Options: idempotency key per command (client-generated id stored with the game version), or return the new version so the client can reconcile on `rejoin`
- Anonymous user ids are `Math.random() * 100000` in `connection.provider.ts` and can collide with real user ids; with `view:user:<id>` keyed by user id, a collision now also mixes read models
- `handleDisconnect` still calls `fetchSockets()` (a cross-node request over the adapter) on every disconnect
