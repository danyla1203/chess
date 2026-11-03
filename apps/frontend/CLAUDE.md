# chess_frontend

Next.js 16 (App Router, Turbopack) + React 19 client for the chess app. UI is HeroUI v2 on Tailwind CSS 4. It talks to `../chess_backend` over REST (`fetch`/axios) and Socket.IO.

See [MAP.md](MAP.md) for routes, the provider tree, the game-state contexts and the socket event contract. Workspace-wide rules, the cross-repo contract and shared agents/commands are in [../CLAUDE.md](../CLAUDE.md).

## Purpose and review stance

Educational pet project; the owner studies system design. Criticize solutions with pros, cons and alternatives. Judge UI changes against thousands of concurrent players: reconnect storms, duplicate socket listeners, re-render cost of the context stack, request fan-out on page load.

## Commands

```bash
npm run dev         # next dev (Turbopack)
npm run build       # production build; also type-checks
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (flat config: next core-web-vitals + typescript + prettier); lint:fix to autofix
npm run prettier    # format everything
```

Env (`.env.local`, see `.env.example`): `NEXT_PUBLIC_API_HOST`, `NEXT_PUBLIC_WS_HOST`, `NEXT_PUBLIC_HOST`. No tests exist.

## Toolchain facts that bite

- Node >= 20.9 (`.nvmrc` = 24). `next lint` no longer exists; use `npm run lint`.
- Tailwind 4 has no `tailwind.config`. All config is in `app/globals.css` (`@import 'tailwindcss'`, `@plugin '../hero.mjs'`, `@source` for HeroUI theme classes, `dark` custom variant). PostCSS uses `@tailwindcss/postcss`.
- HeroUI is the renamed NextUI. Import from `@heroui/react`, never `@nextui-org/*`. `app/heroui.provider.tsx` wraps `HeroUIProvider` + `next-themes` (dark by default).
- Any file that renders HeroUI components or uses hooks/context needs `'use client'`. `layout.tsx` is a Server Component, so components it imports must be client components (`Navbar`, `Loader` already are).
- TypeScript 6 defaults `types` to `[]`, so `tsconfig.json` lists `"types": ["node"]` explicitly for `process.env`.
- `react-hooks/exhaustive-deps` is off on purpose: socket listeners are registered once in `useEffect(..., [])`.

## Conventions

- Path aliases (tsconfig): `@/*` -> repo root, `@/components` -> `app/components`, `@/context/*` -> `app/lib/context/*`, `@/requests` -> `app/lib/request`, `@/ui/*` -> `app/lib/ui/*`.
- Every API call is a small function in `app/lib/request/`, built on the `req()` helper in `utis.ts` (sic). Re-export it from `request/index.ts`.
- Global state is React context in `app/lib/context/`. Per-game state is a stack of providers in `app/game/context/`.
- Socket event names (`Game`, `Lobby`, `User`, `Emit` enums), socket payload types and REST request/response types come from `@chess/contract` (`packages/contract`). Import them from there; never redefine wire types locally. The socket is typed (`GameSocket` in `app/lib/context/SocketContext.tsx`). Change the contract and the backend together; additive only.
- `app/game/types.ts` holds UI-only types (`SelectedCell`, `RestructedGameResult`, `OpponentLeavePayload`).
- Auth tokens live in `localStorage` (`accessToken`, `refreshToken`). Anonymous players get `anon-token`, and their finished games are kept in `anon-games`.
- Chess piece sprites are CSS classes in `app/game/chessPieces.scss`, keyed by figure name without its digit (`pawn`, `R`, `K`, `B`, `Q`, `Kn`) plus side (`w`/`b`).
- Prettier: single quotes, trailing commas.
