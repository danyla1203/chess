---
description: Plan and implement a feature across backend and frontend
argument-hint: "<feature description>"
---

Feature: $ARGUMENTS

1. Read the root `CLAUDE.md` and both repos' `MAP.md`. Write a short plan: backend changes, contract changes (events, routes, DTOs), frontend changes, tests. Include design trade-offs and at least one alternative approach. Wait for approval.
2. After approval: `backend-engineer` for backend work, then `frontend-engineer` for frontend work using the backend's reported contract changes. Run them in parallel only if there is no contract change.
3. Run `contract-checker`, then `verifier` on both repos.
4. Report files changed per repo and check results. Do not commit.
