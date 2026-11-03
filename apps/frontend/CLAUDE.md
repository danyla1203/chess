# chess_frontend

Next.js 16 (App Router, Turbopack) + React 19 client for the chess app. UI is HeroUI v2 on Tailwind CSS 4. It talks to `apps/backend` over REST (`fetch`/axios) and Socket.IO.

See [MAP.md](MAP.md) for routes, the provider tree, the game-state contexts and the socket event contract. Workspace-wide rules, the cross-repo contract and shared agents/commands are in [../CLAUDE.md](../CLAUDE.md).

## Purpose and review stance

Educational pet project; the owner studies system design. Criticize solutions with pros, cons and alternatives. Judge UI changes against thousands of concurrent players: reconnect storms, duplicate socket listeners, re-render cost of the context stack, request fan-out on page load.

## Commands

```bash
pnpm --filter frontend dev         # next dev (Turbopack)
pnpm turbo run build --filter=frontend      # production build (standalone output)
pnpm turbo run typecheck --filter=frontend  # next typegen + tsc --noEmit
pnpm turbo run lint --filter=frontend       # eslint (flat config: next core-web-vitals + typescript + prettier)
pnpm --filter frontend prettier    # format everything
```

Env (`.env.local`, see `.env.example`): `NEXT_PUBLIC_API_HOST`, `NEXT_PUBLIC_WS_HOST`, `NEXT_PUBLIC_HOST`. No tests exist.

## Toolchain facts that bite

- Node >= 20.9 (`.nvmrc` = 24). `next lint` no longer exists; use the `lint` script.
- Tailwind 4 has no `tailwind.config`. The theme and Tailwind entry live in `@chess/ui` (`packages/ui`): `app/globals.css` only does `@import '@chess/ui/styles.css'` (tailwindcss, HeroUI plugin `packages/ui/src/theme/hero.mjs`, `@source` for HeroUI theme classes and `packages/ui/src`, `dark` custom variant) plus `@source '.'` for `app/`. PostCSS uses `@tailwindcss/postcss`.
- Generic UI (`DropdownUi`, `Loader`, `GithubIcon`, `GoogleIcon`, `NotificationStack`/`NotificationItem`) lives in `@chess/ui` with Storybook stories; see `packages/ui/CLAUDE.md`. App-wired components (contexts, routing, requests, sockets) stay in `app/components`.
- HeroUI is the renamed NextUI. Import from `@heroui/react`, never `@nextui-org/*`. `app/heroui.provider.tsx` wraps `HeroUIProvider` + `next-themes` (dark by default).
- Any file that renders HeroUI components or uses hooks/context needs `'use client'`. `layout.tsx` is a Server Component, so components it imports must be client components (`Navbar`, `Loader` already are).
- TypeScript 6 defaults `types` to `[]`, so `tsconfig.json` lists `"types": ["node"]` explicitly for `process.env`.
- `react-hooks/exhaustive-deps` is off on purpose: socket listeners are registered once in `useEffect(..., [])`.

## Conventions

- Path aliases (tsconfig): `@/*` -> repo root, `@/components` -> `app/components`, `@/context/*` -> `app/lib/context/*`, `@/requests` -> `app/lib/request`. Design-system components import from `@chess/ui`.
- Every API call is a small function in `app/lib/request/`, built on the `req()` helper in `utis.ts` (sic). Re-export it from `request/index.ts`.
- Global state is React context in `app/lib/context/`. Per-game state is a stack of providers in `app/game/context/`.
- Socket event names (`Game`, `Lobby`, `User`, `Emit` enums), socket payload types and REST request/response types come from `@chess/contract` (`packages/contract`). Import them from there; never redefine wire types locally. The socket is typed (`GameSocket` in `app/lib/context/SocketContext.tsx`). Change the contract and the backend together; additive only.
- UI-only types: `app/game/types.ts` (`SelectedCell`, game-only); `app/lib/types.ts` (`Profile`, `Invoice`, `RestructedGameResult`, shared by contexts, requests and features).
- Auth tokens live in `localStorage` (`accessToken`, `refreshToken`). Anonymous players get `anon-token`, and their finished games are kept in `anon-games`.
- Chess piece sprites are CSS classes in `app/game/chessPieces.scss`, keyed by figure name without its digit (`pawn`, `R`, `K`, `B`, `Q`, `Kn`) plus side (`w`/`b`).
- Prettier: single quotes, trailing commas.
- Import boundaries are enforced by `eslint-plugin-boundaries` in `eslint.config.mjs` (default disallow, last matching policy wins). Elements: `feature` (`app/game`, `app/user`, `app/authorization`, any new `app/*` route folder), `component` (`app/components/*`), `components` (the `app/components/index.ts` barrel), `context` (`app/lib/context`), `request` (`app/lib/request`), `lib` (rest of `app/lib`), `shell` (`app/*.tsx`). Directions: shell/feature -> `@/components`, context, `@/requests`, lib; component -> context, `@/requests`, lib; context -> `@/requests`, lib; request -> lib. Features never import each other; move shared code to `app/lib` or `app/components`. `axios` only in `request`, `socket.io-client` only in `context`, `fetch` only in `app/lib/request`.
- Boundary rules have no exceptions: no `eslint-disable` for `boundaries/*`, `max-classes-per-file` or `react/no-multi-comp`. If a new rule needs a baseline, use ESLint bulk suppressions (`--suppress-rule`) and prune them as the code gets fixed.

## Single responsibility and SOLID

Lint enforces the structure (boundaries, `react/no-multi-comp`, `max-classes-per-file: 1`). Everything below is on the author; apply it when writing code and call it out when reviewing.

- **S**: a component renders. API calls are one function per endpoint in `app/lib/request`; app-wide state is a context in `app/lib/context`; per-game state is one provider per concern in `app/game/context`. One component per file: extract sub-components into sibling files. Logic-heavy code (like `SelectCellLogic.ts`) is plain TS outside components; stateful logic used by two or more components becomes a hook.
- **O**: extend by adding: a new route is a new folder, a new API call is a new request file re-exported from `@/requests`, a new socket event is handled in the provider that owns that state.
- **L**: wrappers around `@chess/ui` / HeroUI components accept and forward the props of what they wrap.
- **I**: props carry the minimal data a component needs, not a whole context value or DTO. Split a context whose consumers read disjoint halves; it also cuts re-renders.
- **D**: components depend on hooks (`useUserState`, `useWebSocket`, `useGameList`, ...) and `@/requests`, never on `axios`, `fetch` or `socket.io-client` (lint-enforced).
- Smells that mean "split it": a component over ~150 lines, more than ~3 `useState`/`useEffect` pairs, props drilled 3+ levels, a context value with 10+ fields, a file over ~250 lines (`authorization/page.tsx` already is).
