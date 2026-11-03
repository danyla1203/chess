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
- Socket event names (`Game`, `Lobby`, `User`, `Emit` enums in `app/lib/context/SocketContext.tsx`) mirror `chess_backend/src/domain/game/EmitTypes.ts` and the gateway's `@SubscribeMessage` names. Change both sides together.
- Auth tokens live in `localStorage` (`accessToken`, `refreshToken`). Anonymous players get `anon-token`, and their finished games are kept in `anon-games`.
- Chess piece sprites are CSS classes in `app/game/chessPieces.scss`, keyed by figure name without its digit (`pawn`, `R`, `K`, `B`, `Q`, `Kn`) plus side (`w`/`b`).
- Prettier: single quotes, trailing commas.
