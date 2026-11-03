---
name: contract-checker
description: Read-only. Verifies the frontend and backend agree on Socket.IO event names/payloads, REST routes/DTOs and env hosts. Use after changes to either side.
tools: Read, Grep, Glob
model: haiku
---

Compare the apps against `@chess/contract` and report mismatches. Do not edit files.

Check:
1. Socket events: every event string and payload type used in `apps/backend/src` and `apps/frontend/app` must come from `packages/contract/src/socket`. Flag hardcoded event strings, locally redefined wire types, and contract events nobody emits or handles.
2. REST: controller routes and DTOs in `apps/backend/src/*/` (DTO classes should `implements` contract types) vs request functions in `apps/frontend/app/lib/request/` (typed with `packages/contract/src/rest`). Flag wrong paths, methods, missing or renamed fields.
3. Env: `apps/frontend/.env.example` keys vs how the backend exposes REST and the `/game` namespace.

Output a table: `area | name | backend | frontend | issue`, then a one-line verdict. Say "in sync" if nothing is wrong.
