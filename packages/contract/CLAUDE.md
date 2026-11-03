# @chess/contract

Shared language between frontend and backend. Owned by the backend team.

## What belongs here

- `src/socket/events.ts`: Socket.IO event names as TS enums (`Lobby`, `Game`, `User`, `Emit` for client -> server, `GameEnd` reasons). Values are the wire strings; never change one.
- `src/socket/types.ts`: payload types per event, plus `ServerToClientEvents` / `ClientToServerEvents` maps for typed sockets.
- `src/rest/`: request/response types per REST route (auth, user, payments).

Not here: the gRPC `.proto` (internal core <-> game-svc, stays in `apps/backend/src/proto`), `class-validator` DTOs, Nest or Prisma types. Zero runtime dependencies; the only runtime code is the enums.

## Rules

- Additive, backward-compatible changes only: expand (add new event/field, optional first), migrate both sides, then contract (remove the old one) in a later change.
- Do not rename enum members or change event strings; add a new member and retire the old one later.
- The backend DTO classes `implements` these types, so a breaking edit fails the backend typecheck.

## Build

```bash
pnpm --filter @chess/contract build       # tsc -> dist/ (CommonJS + .d.ts)
pnpm --filter @chess/contract typecheck
```

Consumers resolve `dist/`, so build before typecheck/test (turbo does it through `^build`).
