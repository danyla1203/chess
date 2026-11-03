# Monorepo migration plan

Tool: **Turborepo** (monorepo task runner). Turbopack is Next.js's bundler and already runs `next dev`; it stays as is.

## Target layout

```
chess/
├── apps/
│   ├── backend/          from chess_backend @ feature/microservices, full history
│   └── frontend/         from chess_frontend @ main, full history
├── packages/
│   ├── contract/         @chess/contract  socket events + payload types, REST types. Owner: backend
│   └── ui/               @chess/ui        design system: HeroUI/Tailwind theme, tokens, generic components
├── deploy/
│   └── k8s/              moved from apps/backend/deploy/k8s, plus frontend manifests
├── .github/
│   ├── workflows/ci.yml  turbo --affected: typecheck, lint, test, build
│   └── CODEOWNERS        apps/backend + packages/contract -> backend, apps/frontend + packages/ui -> frontend
├── turbo.json
├── package.json          workspaces root
├── CLAUDE.md, .claude/   paths updated
└── MONOREPO_PLAN.md      this file (deleted at the end)
```

## Phase 0: skeleton (me, sequential, everything depends on it)

1. Backup: copy `chess_backend/` and `chess_frontend/` to `../chess-backup-2026-11-03/`. `feature/microservices` is **not pushed**, so this copy is the only backup.
2. `git init` in `chess/`, commit root files.
3. `git subtree add --prefix=apps/backend ../chess-backup…/chess_backend feature/microservices` and the same for the frontend from `main`. Every past commit stays, now under that folder.
4. Remove the old `chess_backend/` and `chess_frontend/` folders.
5. Root `package.json` with workspaces, `turbo.json` tasks:
   - `generate` (prisma generate, buf generate) runs before `build`, `typecheck` and `test:unit`
   - `build` depends on `^build`, so packages build before apps
   - `typecheck`, `lint`, `test:unit` cached; `dev` persistent and uncached
6. Pre-wire `apps/frontend/next.config.js` (`transpilePackages: ['@chess/ui']`, `output: 'standalone'`) and both apps' `package.json` dependencies on `@chess/contract` / `@chess/ui`, so the parallel agents don't edit the same files.
7. One root lockfile, then check that `typecheck`, `lint`, `test:unit` and `build` pass for both apps exactly as before. Commit.

## Phase 1: three agents in parallel, each in its own git worktree

| Agent | Task | Files |
| --- | --- | --- |
| **A: contract** (`backend-engineer`) | Create `packages/contract`: socket event enums from `EmitTypes.ts` and the gateway `@SubscribeMessage` names, payload types (`InitedGameData`, `ClockState`, `Turn`, chat, draw…), REST request/response types for routes the frontend calls. Compiled with `tsc` to `dist/` (CJS + `.d.ts`), because the backend needs runtime enums under `nodenext` CJS. Switch the backend to import from it; `EmitTypes.ts` re-exports or is deleted. gRPC `.proto` stays inside the backend (internal between core and game-svc, not a frontend contract). | `packages/contract/**`, `apps/backend/src/**`, `apps/backend/test/**` |
| **B: design system** (general-purpose) | Create `packages/ui`: HeroUI plugin and theme (`hero.mjs` moves here), design tokens, a shared CSS entry (`@chess/ui/styles.css` with Tailwind `@source` for the package), generic components extracted from the frontend (`Dropdown`, `Loader`, icons, `Notification` view). App-specific components (`Navbar`, `GameList`, `CreateGame`) stay in the app. Switch the frontend to import them. No redesign. | `packages/ui/**`, `apps/frontend/app/components/**`, `apps/frontend/app/lib/ui/**`, `apps/frontend/app/globals.css`, `apps/frontend/hero.mjs` |
| **C: deploy** (general-purpose) | `git mv apps/backend/deploy/k8s deploy/k8s` and fix script paths. Backend Dockerfile builds from the repo root with `turbo prune backend --docker` (it now needs `@chess/contract`). New frontend Dockerfile: `turbo prune frontend --docker` + Next standalone output, `NEXT_PUBLIC_*` passed as build args (they are baked in at build time). New `deploy/k8s/apps/frontend.yaml`: Deployment with **1 replica**, Service, HTTPRoute on the existing Gateway (`/` → frontend, API and `/socket.io` → core). Update kustomization and `up.sh`. Root CI workflow, CODEOWNERS. | `deploy/**`, `apps/*/Dockerfile*`, `apps/*/.dockerignore`, `.github/**` |

No file is touched by two agents. I merge the three worktree branches in order A → B → C.

## Phase 2: frontend switches to the contract (`frontend-engineer`, after A is merged)

Replace the enums in `SocketContext.tsx` and the types in `app/game/types.ts` and `app/lib/request/` with `@chess/contract` imports. Event names stay the same, so nothing changes on the wire.

## Phase 3: verification (`verifier`, `contract-checker`, me)

- `turbo run typecheck lint test:unit build` across the workspace
- `contract-checker`: no event or type is defined in an app any more
- `kubectl kustomize deploy/k8s/apps` renders; `docker build` for backend and frontend if Docker is running
- Update `CLAUDE.md` (root, apps, packages), agents and commands for the new paths
- One commit per phase, then delete this file

## Not included (asks you later)

- Creating the GitHub repo and pushing
- Archiving `danyla1203/chess_backend` and `danyla1203/chess_frontend`
- Storybook for `@chess/ui`

## Risks

- **New lockfile**: regenerating it resolves `^` ranges to newer versions. I'll keep the old resolved versions where the package manager allows, and the Phase 0 checks catch breakage before any agent starts.
- **Nest 12 ESM/CJS**: shared (hoisted) dependencies can change which copy of a package Nest loads. pnpm keeps packages isolated per app; npm hoists to the root.
- **Base branch**: the backend works on `dev` and the frontend on `main`. The monorepo gets one default branch: `main`.
