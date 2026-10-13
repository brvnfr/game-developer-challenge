# Pirate Battle

A top-down 2D naval shooter built with **React**, **TypeScript (strict)** and **PixiJS**. Navigate between islands, fight enemy ships and score points until the match ends.

> Work in progress — this README is completed as features land. The original challenge statement lives in [docs/CHALLENGE.md](docs/CHALLENGE.md); code conventions are in [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md).

## Tech stack

| Concern                         | Technology               |
| ------------------------------- | ------------------------ |
| UI and menus                    | React 19                 |
| Language                        | TypeScript 5.9 (strict)  |
| Game rendering                  | PixiJS 8                 |
| Ranking / history remote state  | TanStack Query 5         |
| HTTP client                     | Axios                    |
| API mocking                     | MSW 2                    |
| Unit / integration tests        | Vitest + Testing Library |
| E2E and visual regression tests | Playwright (Chromium)    |
| Build tool                      | Vite 7                   |

## Requirements

- Node.js **22** (see `.nvmrc`; minimum 20.19)
- npm 10

## Setup

```bash
npm ci
npx playwright install chromium   # first time only, for E2E tests
npm run dev                       # http://localhost:5173
```

## Environment variables

All variables are optional; copy `.env.example` to `.env.local` to override.

| Variable              | Default | Description                               |
| --------------------- | ------- | ----------------------------------------- |
| `VITE_API_BASE_URL`   | `/api`  | Base URL of the ranking/history REST API. |
| `VITE_ENABLE_MOCKS`   | `true`  | Starts the MSW worker that mocks the API. |
| `VITE_API_TIMEOUT_MS` | `8000`  | Axios request timeout in milliseconds.    |

## Commands

| Command                    | Description                                         |
| -------------------------- | --------------------------------------------------- |
| `npm run dev`              | Development server                                  |
| `npm run build`            | Type-check and production build (`dist/`)           |
| `npm run preview`          | Serve the production build on http://localhost:4173 |
| `npm run lint`             | ESLint (zero warnings allowed)                      |
| `npm run typecheck`        | TypeScript project build check                      |
| `npm run format`           | Prettier                                            |
| `npm test`                 | Unit + integration tests (Vitest)                   |
| `npm run test:unit`        | Unit tests only (pure simulation, Node environment) |
| `npm run test:integration` | Integration tests (jsdom, React, MSW)               |
| `npm run test:coverage`    | Tests with coverage report (`coverage/`)            |
| `npm run test:e2e`         | Playwright E2E — Chromium desktop and mobile        |
| `npm run test:e2e:report`  | Open the last Playwright HTML report                |
| `npm run assets`           | Rebuild the PixiJS texture atlases from `assets/`   |

E2E tests build the app and run against `vite preview`. Set `PLAYWRIGHT_BASE_URL` to run them against a deployed URL. Failed tests keep a trace (`test-results/**/trace.zip`, open with `npx playwright show-trace`).

## Assets

Source assets are in [`assets/`](assets/). `npm run assets` converts them into PixiJS atlases under `public/assets/game/` (committed):

- `ships.json` — converted from the Starling XML atlas `ships_miscellaneous_sheet.xml` (the provided "retina" ships sheet has the same pixel size, so only a 1× atlas is produced).
- `tiles@1x.json` / `tiles@2x.json` — generated from the 64 px / 128 px tile sheets (row-major, `tile_1` is top-left).
- `ui@1x.json` / `ui@2x.json` — the provided UI atlases (the `ui` metadata is stripped; `borders` are kept for 9-slice).

## Deployment

The app is a static site. `vercel.json` configures the Vercel build (`npm ci`, `npm run build`, output `dist/`) and serves `mockServiceWorker.js` without caching so the API mocks run in the published build.
