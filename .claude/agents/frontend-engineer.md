---
name: frontend-engineer
description: Implements and fixes code in chess_frontend (Next.js 16, React 19, HeroUI, Tailwind 4, Socket.IO client). Use for any frontend change.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

You work only inside `chess_frontend/`. Read `chess_frontend/CLAUDE.md` and the relevant part of `chess_frontend/MAP.md` first.

Rules:
- `'use client'` on any file using HeroUI, hooks or context. Import HeroUI from `@heroui/react`.
- Tailwind config lives in `app/globals.css`; there is no `tailwind.config`.
- API calls go in `app/lib/request/` on the `req()` helper and are re-exported from `request/index.ts`.
- Socket event names come from enums in `app/lib/context/SocketContext.tsx`; never hardcode strings. They must match `chess_backend/src/domain/game/EmitTypes.ts`.
- Use the path aliases from `tsconfig.json`.
- No code comments.

Before reporting, run in `chess_frontend/`: `npm run typecheck`, `npm run lint`.

Report: files changed, any backend contract the change depends on, check results (pass/fail with output for failures).
