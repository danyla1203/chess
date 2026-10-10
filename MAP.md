# Frontend map

Next.js 16 App Router. Every page is client-rendered in practice: the root providers show `<Loader/>` until the profile and socket are ready. Backend: `NEXT_PUBLIC_API_HOST` (REST) and `NEXT_PUBLIC_WS_HOST` (Socket.IO `/game`).

## Provider tree (`app/layout.tsx`)

```
HeroUIProviders            app/heroui.provider.tsx   HeroUI + next-themes (dark)
└─ UserProvider            lib/context/UserContext   loads profile with accessToken (refreshes on failure)
   └─ WebSocketProvider    lib/context/SocketContext opens io(`${WS_HOST}/game?Authorization=<access|anon-token>`)
      └─ NotificationProvider                        toast list, auto-dismiss after 3 s
         ├─ Notifications                            renders toasts
         └─ GameListProvider                         lobby list, pending game, join/rejoin/leave
            ├─ NavbarMenu
            └─ {page}
```

## Routes (`app/`)

| Route                                             | File                             | What it does                                                                                  |
| ------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| `/`                                               | `page.tsx`                       | `GameList` (lobby table, click to join) + `CreateGame` (time/increment/bet sliders, W/B/Rand) |
| `/game?action=join\|rejoin&id=`                   | `game/page.tsx`                  | emits `join`/`rejoin`, waits for `game:init-data`, renders Chat + Board + RightMenu           |
| `/authorization`                                  | `authorization/page.tsx`         | login by email or name, Google OAuth button                                                   |
| `/authorization/google?code=`                     | `authorization/google/page.tsx`  | OAuth callback → login or redirect to complete signup                                         |
| `/authorization/signup`                           | `signup/page.tsx` + `EmailInput` | request verification code                                                                     |
| `/authorization/signup/confirm-code?email=&code=` | `confirm-code/`                  | submit code                                                                                   |
| `/authorization/signup/complete-signup?email=`    | `complete-signup/`               | choose name + password → tokens                                                               |
| `/authorization/signup/mail-sent`                 | `mail-sent/page.tsx`             | placeholder                                                                                   |
| `/user`                                           | `user/page.tsx`                  | profile card, W/L/D, balance + Stripe top-up, rename, games table, invoices                   |
| `/user/payment?success=`                          | `user/payment/`                  | Stripe redirect target: Success / Failed                                                      |

`loading.tsx` shows the global `Loader`.

## Directory guide

```
app/
├── components/            shared UI, barrel-exported from components/index.ts
│   ├── Navbar/            NavbarMenu, Profile -> AnonymousMenu | AuthorizedMenu (DropdownUi)
│   ├── Gamelist/          lobby table fed by GameListContext
│   ├── CreateGame/        emits `create`, then pushes /game
│   ├── PendingGame/       "Pending Game" button (rejoin / leave)
│   ├── Notification/      toast renderer
│   ├── Loader/            full-screen HeroUI Spinner
│   └── icons/             Google, Github SVGs
├── game/
│   ├── page.tsx           wires GameProvider around Chat, BoardController, RightMenu
│   ├── Board.controller.tsx  selection + click-to-move, highlights legal targets
│   ├── Board.tsx, Cell.tsx   8x8 render; orientation flips for white
│   ├── SelectCellLogic.ts    client-side move hints (HighlightedCels); server is authoritative
│   ├── Chat.tsx              in-game chat
│   ├── RightMenu/            captured pieces, clocks (+time), surrender/draw controls
│   ├── chessPieces.scss      piece sprites as base64 SVG backgrounds
│   ├── types.ts              board/move/result types (mirror backend DTOs)
│   └── context/              per-game providers, nested in this order:
│       index.tsx             GameProvider: config (gameId, side, maxTime) from game:init-data; stores anon results
│       PlayersGameInteraction.tsx  surrender, draw propose/accept/reject
│       Board.tsx             board state, applies game:board-update, check/mate flags
│       Striked.tsx           captured pieces per side
│       Timer.tsx             clocks from game:time / game:add-time
│       Chat.tsx              messages from game:chat-message (+ "Game is over" on game:end)
│       PlayerConnection.tsx  opponent online flag
├── lib/
│   ├── context/           User, Socket (event enums), Notification, GameList
│   ├── request/           one function per REST call, built on req() in utis.ts
│   ├── ui/Dropdown.tsx    generic dropdown menu
│   └── utils.ts           deviceId(), anonymous game stats, restructGameResult()
├── user/                  profile page pieces
├── globals.css            Tailwind 4 entry + HeroUI plugin
├── heroui.provider.tsx
├── layout.tsx, page.tsx, loading.tsx
hero.mjs                   `heroui()` Tailwind plugin, loaded via @plugin in globals.css
eslint.config.mjs          flat config
postcss.config.mjs         @tailwindcss/postcss
```

## REST calls (`app/lib/request/`)

| Function              | Backend                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `userLogin`           | `POST /auth/login/{email\|name}` (picks by regex)                                                       |
| `getProfile`          | `GET /user`, `GET /user/games`, `GET /user/payment/history`; on error `PUT /auth/use-refresh` and retry |
| `emailVerification`   | `POST /auth/send-verification-mail`                                                                     |
| `codeConfirm`         | `PATCH /auth/verify-email`                                                                              |
| `createUser`          | `POST /user/signup`, then `getProfile`                                                                  |
| `userLogout`          | `DELETE /auth/logout`                                                                                   |
| `getGooguleOauthLink` | `GET /auth/google/oauth/link`                                                                           |
| `getGoogleProfile`    | `POST /auth/google/oauth`                                                                               |
| `stripeCheckout`      | `GET /payments/checkout-session`                                                                        |
| `updateUserName`      | `PATCH /user` (axios)                                                                                   |

## Socket contract

Enums in `lib/context/SocketContext.tsx`. `Emit` = client → server (`create`, `join`, `rejoin`, `move`, `chat-message`, `add_time`, `surrender`, `draw_propose`, `draw_reject`, `draw_accept`, `leave`). `Game`/`Lobby`/`User` = server → client, matching `chess_backend/src/game/EmitTypes.ts`. Full payloads are in `chess_backend/MAP.md`.

Figure ids come from the backend: `K1/K2` are **knights** and `Kn` is the **king**.

## Client storage

`localStorage`: `accessToken`, `refreshToken`, `anon-token` (anonymous socket identity), `anon-games` (finished games of an anonymous player, used for W/L/D).
