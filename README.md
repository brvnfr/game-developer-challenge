# Pirate Battle

A top-down 2D naval shooter built with **React**, **TypeScript (strict)** and **PixiJS**. Navigate between islands, fight enemy ships and score points until the match ends.

**Live demo:** _URL added after the Vercel deployment._

| Document                                             | Content                                                                                                           |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](ARCHITECTURE.md)                   | React/PixiJS integration, simulation, collisions, resources, persistence, ranking/history, limitations, balancing |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md)           | Frame rate, p95 frame time, entities, memory over 5 cycles, environment                                           |
| [docs/reports/](docs/reports/summary.md)             | Test reports (Vitest JUnit + coverage, Playwright HTML) and profiling evidence                                    |
| [docs/CREDITS.md](docs/CREDITS.md)                   | Assets, conversions, fonts and licenses                                                                           |
| [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) | Naming, classes vs functions, design and test conventions                                                         |
| [docs/CHALLENGE.md](docs/CHALLENGE.md)               | Original challenge statement (Portuguese)                                                                         |

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
| `VITE_API_TIMEOUT_MS` | `8000`  | Request timeout in milliseconds.          |

## Commands

| Command                              | Description                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| `npm run dev`                        | Development server                                                                    |
| `npm run build`                      | Type-check and production build (`dist/`)                                             |
| `npm run preview`                    | Serve the production build on http://localhost:4173                                   |
| `npm run lint`                       | ESLint (zero warnings allowed)                                                        |
| `npm run typecheck`                  | TypeScript project build check                                                        |
| `npm run format`                     | Prettier                                                                              |
| `npm test`                           | Unit + integration tests (Vitest)                                                     |
| `npm run test:unit`                  | Unit tests only (pure simulation, Node environment)                                   |
| `npm run test:integration`           | Integration tests (jsdom, React, MSW)                                                 |
| `npm run test:coverage`              | Tests with coverage report (`coverage/`)                                              |
| `npm run test:e2e`                   | Playwright E2E — Chromium desktop and mobile                                          |
| `npm run test:e2e:report`            | Open the last Playwright HTML report                                                  |
| `npm run assets`                     | Rebuild the PixiJS texture atlases from `assets/`                                     |
| `npm run assets:audio`               | Convert `assets/sounds` for the web (needs ffmpeg)                                    |
| `npm run test:e2e:visual`            | Visual regression only (`@visual`)                                                    |
| `npm run test:e2e:visual:update`     | Create/update the visual baselines of this platform                                   |
| `npm run test:e2e:docker`            | Whole E2E suite in the official Playwright Docker image (Linux baselines)             |
| `npm run perf`                       | Performance (3-minute match) and memory (5 cycles) runs on the production build       |
| `npm run perf:match` / `perf:memory` | Only one of the two runs                                                              |
| `npm run reports`                    | Run Vitest (JUnit + coverage) and Playwright and store the reports in `docs/reports/` |
| `npm run check`                      | Lint + typecheck + unit and integration tests                                         |

E2E tests always build the app and start their own `vite preview` on port **4174** (never reusing a running server), so a preview left open on 4173 from an older build cannot be tested by mistake. WebGL runs in software in the test browsers (deterministic screenshots), so the suite uses 2 parallel workers by default; set `PLAYWRIGHT_WORKERS` to change it. Set `PLAYWRIGHT_BASE_URL` to run them against a deployed URL. Failed tests keep a trace (`test-results/**/trace.zip`, open with `npx playwright show-trace`).

### Visual regression

`e2e/visual.spec.ts` compares the main menu, the arena in a stable state (fixed seed, manual clock, fixed
starting layout) and the result screen, on desktop and mobile, with the baselines in `e2e/__screenshots__/`.
Fonts and anti-aliasing differ between operating systems, so baselines are per platform; the **Linux**
baselines are versioned as the reference. On a platform without baselines (e.g. Windows) the visual tests are
**skipped** with a message instead of failing; create local baselines with `npm run test:e2e:visual:update`, or
run the reference check with `npm run test:e2e:docker`. Three consecutive runs produced no diff.

## Controls

| Action                      | Keyboard          | Touch                             |
| --------------------------- | ----------------- | --------------------------------- |
| Sail forward                | `W` / `↑`         | Up arrow button (left group)      |
| Turn left / right           | `A` `D` / `←` `→` | Curved arrow buttons (left group) |
| Fire front cannon           | `Space`           | Centre button (right group)       |
| Fire left / right broadside | `Q` / `E`         | Side buttons (right group)        |
| Pause / resume              | `P` / `Esc`       | Pause button (top right)          |

Sailing and firing can be combined. Game keys are only captured while a match is on screen. The match pauses
automatically when the window loses focus or the tab is hidden; resuming always needs a player action.

**Mobile orientation:** matches are played in **landscape**. On touch devices held in portrait the match pauses
behind a "Rotate your device" notice; after rotating back, the pause dialog asks the player to resume. Menus
work in both orientations.

## Options and local data

The Options screen exposes the two player-facing settings. Values are validated as they are typed (accessible
error messages), saved with **Save**, and kept after a refresh. Each match takes a snapshot of the saved options
when it starts, so changes apply from the next match.

| Option            | Limits     | Step  | Default |
| ----------------- | ---------- | ----- | ------- |
| Game session time | 60–180 s   | 1 s   | 120 s   |
| Enemy spawn time  | 1–10 s     | 0.5 s | 3 s     |
| Captain name      | 1–20 chars | —     | random  |

The captain name is asked on the first **Play** (and can be changed in Options); it identifies the player in the
ranking. Everything is stored in the browser:

| Key (localStorage)             | Content                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| `pirate-battle.settings.v1`    | Saved options                                                 |
| `pirate-battle.player.v1`      | Player id and captain name                                    |
| `pirate-battle.last-result.v1` | Result of the last **completed** match (abandoned ones never) |

`sessionStorage` remembers whether the result screen is open, so a refresh shows the result again; a refresh or
leaving during a match abandons it and returns to the menu. Invalid or outdated stored data is discarded.

## Ranking and Match History

The main menu opens the **Captain's Log** on either tab:

- **Ranking**: completed matches played with the **same settings** (session time and spawn interval), 5 per
  page. The filter starts on the current options and lists every configuration with matches. Order (ADR-011):
  more points → shorter match → earlier end → match id, so ties are always broken the same way. Your entries
  are marked **You**.
- **Match History**: your completed matches, newest first, with date, points, duration and how they ended.
  Matches still waiting to be saved are listed above it with a **Retry now** button.

Every completed match is queued in a persistent outbox (`pirate-battle.outbox.v1`) **before** it is sent with
`PUT /api/matches/:matchId`. The request is idempotent, so a retry after a timeout returns the stored record
instead of creating a second one. Pending matches survive failures and refreshes and are retried automatically
(backoff, when the browser comes back online, when the app starts) or with **Retry now**. The result screen
shows the status (_Saving… / Saved / Not saved yet / Could not be saved_). Nothing here ever blocks the game,
the options or a new match.

The API is simulated by **MSW** in every environment, including the published build (service worker
`public/mockServiceWorker.js`). The same handlers, contracts (`src/api/contracts.ts`) and fixtures run in the
browser and in Vitest (`msw/node`). Confirmed matches are kept in `pirate-battle.mock-server.v1`; 12 fixture
captains fill the ranking for four configurations.

| Endpoint                                   | Response                                        |
| ------------------------------------------ | ----------------------------------------------- |
| `GET /api/ranking?configKey&page&pageSize` | Ranking page for one configuration (`s120-i3`)  |
| `GET /api/ranking/configurations`          | Configurations that have matches                |
| `GET /api/players/:playerId/matches`       | The player's history page                       |
| `PUT /api/matches/:matchId`                | 201 created · 200 already stored · 409 conflict |

## Network scenarios

Open **Network scenarios** at the bottom of the main menu to choose how the mock server behaves, with a
**seed** (reproducible delays) and a **base latency**. **Reset mock server** restores the initial state: only
the fixtures and the _Success_ scenario. The choice is stored (`pirate-battle.network.v1`) and survives a
refresh. Scenarios can also be chosen through the URL, e.g. `/?scenario=slow&networkSeed=3&latency=0`.

| Scenario (`scenario=`)          | Behaviour                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `success`                       | Everything works with a short delay (base latency ±50 %)                       |
| `empty`                         | Ranking and Match History are empty                                            |
| `many-pages`                    | Extra entries: many pages in both lists                                        |
| `slow`                          | Every answer ~2.5 s slower                                                     |
| `variable-latency`              | Delays between 0.1 and 2.5 s (seeded)                                          |
| `out-of-order`                  | Odd requests slow (2 s), even ones fast: older answers arrive after newer ones |
| `timeout`                       | No answer: requests time out                                                   |
| `network-error`                 | Connection failure                                                             |
| `http-4xx`                      | 400 Bad Request (not retried automatically)                                    |
| `http-5xx`                      | 503 Service Unavailable                                                        |
| `ranking-fail` / `history-fail` | Only that list fails (500)                                                     |
| `register-timeout-after-commit` | The first save of each match is stored but never answered; a retry recovers it |
| `unavailable-then-recover`      | The first 3 requests to each endpoint fail with 503, then everything works     |

**Reproducing failures by hand**

1. _Server down at the end of a match:_ choose **Connection failure**, play a match → the result says _Not saved
   yet_; refresh → still pending (menu: "1 battle is waiting to be saved"); choose **Success** → it is saved once.
2. _Timeout after saving:_ choose **Timeout after saving**, finish a match → the first answer never arrives, the
   retry returns the stored record; Match History shows the match once.
3. _Late answers:_ choose **Out-of-order responses**, open Ranking and press Next/Previous quickly → the page on
   screen is always the last one asked for (obsolete requests are aborted).
4. _Errors:_ choose **Ranking fails** → the Ranking tab shows an error with **Retry**; Match History still works.

## Test mode

Add `?test=1` to the URL to enable the test instrumentation used by the Playwright suite. It only observes the
match and controls time; rules, input, collisions and rendering run unchanged.

| Parameter     | Example              | Effect                                                                        |
| ------------- | -------------------- | ----------------------------------------------------------------------------- |
| `seed`        | `seed=42`            | Fixed random seed (spawns, AI decisions)                                      |
| `session`     | `session=60`         | Game session time for this page (60–180), overrides Options                   |
| `spawn`       | `spawn=10`           | Enemy spawn time for this page (1–10, step 0.5), overrides                    |
| `time=manual` | `time=manual`        | Real time stops; tests advance the game with `advanceTime(ms)`                |
| `touch=1`     | `touch=1`            | Shows the touch controls on any device (also without `test`)                  |
| `apiTimeout`  | `apiTimeout=1500`    | API request timeout in ms (test mode only)                                    |
| `setup`       | `setup=chaser-ahead` | Starting layout for combat tests: `open-water`, `chaser-ahead`, `shooter-far` |

The API is available as `window.__PIRATE_BATTLE__` (`state()` with entities and shot/hit/kill statistics,
`config()`, `advanceTime(ms)`, `setManualTime(bool)`, `liveRuntimes()`, `isPlayerHullBlocked()`,
`isCircleBlocked()`, `audio()`, `whenAudioLoaded()`). A `setup` only chooses where ships start; movement, AI,
weapons, damage and spawning then run unchanged, and combat tests drive the ship with the real keyboard.

## Assets

Source assets are in [`assets/`](assets/). `npm run assets` converts them into PixiJS atlases under `public/assets/game/` (committed):

- `ships.json` — converted from the Starling XML atlas `ships_miscellaneous_sheet.xml` (the provided "retina" ships sheet has the same pixel size, so only a 1× atlas is produced).
- `tiles@1x.json` / `tiles@2x.json` — generated from the 64 px / 128 px tile sheets (row-major, `tile_1` is top-left).
- `ui@1x.json` / `ui@2x.json` — the provided UI atlases (the `ui` metadata is stripped; `borders` are kept for 9-slice).

Sounds: the WAV files in `assets/sounds` are converted by `npm run assets:audio` into `public/assets/audio`
(effects → MP3 mono 96 kbit/s, loops → mono 22 kHz WAV for gapless looping; 5.8 MB → 1.2 MB). Audio starts after
the first click or key press (browser autoplay rules); effects follow the game events (cannons, hits, splashes,
explosions, points, pause, end, low health, last 10 seconds) and the ocean and sailing loops stop on pause, at
the end and when leaving the match. The **Sound** button in the HUD and in Options mutes everything; the choice
is saved (`pirate-battle.audio.v1`).

Fonts (self-hosted through Fontsource, SIL Open Font License 1.1): [Lilita One](https://fonts.google.com/specimen/Lilita+One)
for titles and buttons, [Nunito](https://fonts.google.com/specimen/Nunito) for text.

## Performance and memory

`npm run perf` builds the production bundle, serves it on port 4175 and plays in **real time** with Chromium
(headed by default so Chromium uses the GPU — headless Chromium usually renders WebGL in software;
`PERF_HEADLESS=1` forces headless):

- **3-minute match** (`?test=1&profile=1`, 180 s, spawn every 3 s, seed 7, all cannons firing while sailing in
  loops): average FPS, p50/p95/p99 frame interval, main-thread frame work, entity counts every second and a
  5-second Chrome trace → `docs/reports/performance/match-3min-<platform>-<gpu|software>.json` and the trace
  (open the trace in Chrome DevTools › Performance). The player's health is raised to 10 000 (`playerHealth`, a
  value of the typed config) so the match lasts the full 3 minutes; every other value is the default.
- **Memory, 5 cycles** of Play → 20 s of combat → Main Menu, with forced garbage collection: JS heap, DOM nodes,
  event listeners, live runtimes, canvases and native objects (canvases, WebGL contexts, audio nodes) counted in
  heap snapshots → `docs/reports/performance/memory-5-cycles-<platform>-<gpu|software>.json`. `PERF_MEMORY_CYCLES=10` runs more.

Results, environment and limitations: [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## Reports and CI

`npm run reports` runs Vitest (JUnit + coverage) and the Playwright suite and stores the reports in
`docs/reports/` (`summary.md`, `vitest/`, `e2e/index.html`). Failed E2E tests keep traces in `test-results/`.
`.github/workflows/ci.yml` runs format, lint, typecheck, unit/integration tests and the build, then the E2E suite
in the official Playwright Docker image (same Linux baselines), uploading the HTML report and traces.

## Deployment

The app is a static site. `vercel.json` configures the Vercel build (`npm ci`, `npm run build`, output `dist/`) and serves `mockServiceWorker.js` without caching so the API mocks run in the published build.
