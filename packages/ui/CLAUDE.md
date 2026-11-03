# @chess/ui

Design system for the chess frontend: HeroUI theme (Tailwind 4 plugin + tokens), the shared Tailwind entry CSS and generic, app-agnostic React components, browsable in Storybook. Owned by the frontend team. Consumed by `apps/frontend`.

Source-only package: no library build. `apps/frontend` transpiles it via `transpilePackages` in `next.config.js`.

## Layout

```
src/
├── index.ts               public API (".")
├── styles.css             Tailwind entry ("./styles.css"): tailwindcss, hero plugin, @source for @heroui/theme and src/, dark variant, base layer
├── theme/hero.mjs         heroui() Tailwind plugin ("./hero")
├── theme/tokens.mjs       layout + per-theme colors passed to heroui(); currently equal to HeroUI defaults
└── components/<Name>/     <Name>.tsx + <Name>.stories.tsx
.storybook/                react-vite framework, @tailwindcss/vite, HeroUIProvider, dark by default (toolbar toggle)
```

## Rules

- Nothing app-specific here: no app contexts, routing, requests, sockets, `next/*` imports. Those stay in `apps/frontend`; split presentational parts out (see `Notification`).
- No visual drift: changing a class or token changes the app. Check the story and the app.
- `'use client'` in any component that renders HeroUI or uses hooks.
- `@heroui/theme` is a direct dependency (same version as HeroUI expects) so the `@source` path in `styles.css` resolves under pnpm isolation.
- Story-only utility classes are excluded from the app CSS (`@source not` in `styles.css`); `.storybook/preview.css` scans stories for Storybook.
- No code comments. Prettier: single quotes, trailing commas.

## Adding a component

1. `src/components/<Name>/<Name>.tsx`, generic props only.
2. `src/components/<Name>/<Name>.stories.tsx` with the main variants (`title: 'Components/<Name>'`).
3. Export it (and its prop types) from `src/index.ts`.
4. Import from `@chess/ui` in the app.

## Scripts

```bash
pnpm --filter @chess/ui storybook         # dev server on :6006
pnpm --filter @chess/ui build-storybook   # static build to storybook-static/
pnpm --filter @chess/ui build             # same as build-storybook (a few seconds)
pnpm --filter @chess/ui typecheck
pnpm --filter @chess/ui lint
```
