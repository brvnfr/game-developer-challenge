# Performance and memory

Target: **60 FPS** during combat in the optimised production build. This page records how the game was
measured, the results, and what limits them. Raw evidence is in [`docs/reports/performance/`](reports/performance/).

## How it is measured

`npm run perf` (Playwright, `playwright.perf.config.ts`) builds the production bundle, serves it with
`vite preview` and plays in **real time** (no manual clock) in Chromium at **1280 × 720, device pixel ratio 1**.
Unlike the E2E suite, WebGL is not forced to software rendering: the browser uses the GPU when the machine has one.

- **Frame profiler** (`src/game/runtime/FrameProfiler.ts`, enabled with `?test=1&profile=1`): records the
  interval between consecutive frames (what the player sees: FPS, p50/p95/p99), the **main-thread work of each
  frame** (simulation steps + scene update + PixiJS draw submission, measured from the start of the game's ticker
  callback to a callback that runs after PixiJS renders) and, once per second, the entities alive: enemies,
  projectiles, effects and every display object in the scene graph.
- **3-minute match:** 180 s session, spawn interval 3 s (default), seed 7. The bot holds **W** (sail), turns
  left/right alternately every 12 s and keeps **Space + Q + E** held, so every cannon fires as soon as its cooldown
  allows. The player's health is raised to 10 000 (`playerHealth`, a value of the typed config) so the match
  always lasts the full 3 minutes and the arena keeps filling up; every other value is the default.
- **Chrome trace:** 5 s recorded in the middle of the match (`match-3min-trace-<platform>.json`; open it in Chrome
  DevTools › Performance › Load profile).
- **Memory, 5 cycles:** Play → 20 s of real-time combat (all cannons) → pause → Main Menu. After each cycle three
  forced garbage collections (CDP `HeapProfiler.collectGarbage`), then the JS heap (`Runtime.getHeapUsage`), DOM
  counters (`Memory.getDOMCounters`), live runtimes and canvases; heap snapshots after the first and the last
  cycle count native objects (canvases, WebGL contexts, resize observers, audio nodes).

## Results

### Environment A — cloud container (CPU only, software WebGL)

| Item       | Value                                                              |
| ---------- | ------------------------------------------------------------------ |
| Hardware   | Intel Xeon @ 2.10 GHz, **2 vCPU**, 8 GB RAM, **no GPU**            |
| OS         | Linux 6.18 (x64)                                                   |
| Browser    | Chromium 141.0.7390.37 headless (Playwright 1.56.1)                |
| WebGL      | ANGLE / **SwiftShader** (software rasteriser)                      |
| Resolution | 1280 × 720 @ DPR 1                                                 |
| Match      | 180 s, spawn 3 s, seed 7, player health 10 000, all cannons firing |

**3-minute match** ([match-3min-linux.json](reports/performance/match-3min-linux.json)):

| Metric                                   | Value                                                                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Average FPS                              | **6.5**                                                                                                     |
| Frame interval p50 / **p95** / p99 / max | 144 / **215** / 264 / 627 ms                                                                                |
| Main-thread work per frame avg / p95     | **1.6 / 4.3 ms** (max 52.9 ms)                                                                              |
| Peak entities (per-second samples)       | 12 enemies · 12 projectiles · 14 effects · 724 display objects                                              |
| Match totals                             | 110 enemies spawned (56 Chasers, 54 Shooters) · 1 160 player and 395 enemy projectiles · 53 kills · 44 rams |
| JS heap at the end                       | 21 MB                                                                                                       |

What the numbers say: the game's own work per frame (rules + scene + draw submission) stays far below the
16.7 ms budget of 60 FPS (p95 4.3 ms, about a quarter of the budget). The frame rate here is limited by the
software rasteriser drawing 1280 × 720 pixels on two virtual CPUs without a GPU — the same reason the E2E suite
uses a manual clock. In this environment the simulation clock caps long frames at 0.25 s, so the 180 s match took
278 s of wall time. **This environment cannot show 60 FPS and is not the reference for that target.**

**Memory, 5 cycles** ([memory-5-cycles-linux.json](reports/performance/memory-5-cycles-linux.json)):

| After               | JS heap (MB) | DOM nodes | JS listeners | Live runtimes | Canvases |
| ------------------- | -----------: | --------: | -----------: | ------------: | -------: |
| Menu (no match yet) |         4.32 |       107 |          158 |             0 |        0 |
| Cycle 1             |         7.65 |       118 |          186 |             0 |        0 |
| Cycle 2             |         7.95 |       118 |          185 |             0 |        0 |
| Cycle 3             |         8.17 |       118 |          186 |             0 |        0 |
| Cycle 4             |         8.27 |       118 |          185 |             0 |        0 |
| Cycle 5             |         8.30 |       118 |          185 |             0 |        0 |

- The first match loads the atlases, sounds and code (+4 MB): expected, and kept for later matches.
- From cycle 1 to 5: **+0.65 MB**, flattening (+0.30, +0.22, +0.10, +0.03 MB); DOM nodes and listeners return to
  the same level; no runtime or canvas survives a match. Native objects in the heap snapshots are identical after
  cycle 1 and cycle 5 (6 canvas and 7 WebGL context objects held by PixiJS's and the browser's capability checks
  and caches, 0 detached canvases, 2 resize observers) — nothing accumulates per match. A 10-cycle run
  ([memory-10-cycles-linux.json](reports/performance/memory-10-cycles-linux.json)) goes from 7.49 MB after cycle 1
  to 8.80 MB after cycle 10 (about 0.15 MB per match, increments shrinking except one step at cycle 9), with the
  same DOM, listener and native-object counts throughout.

**Investigation of the small growth.** Heap snapshots of an unminified build, diffed between cycle 2 and cycle 8:

- Most of the difference is **V8 compiled code** (`(code)`, ~470 KB over 6 cycles: functions being optimised as
  they get hot) and the browser's bounded performance-timeline buffers (event, long-task and resource timing).
- **Fixed:** each destroyed PixiJS renderer left its batcher and some texture styles referenced from PixiJS's
  module-level pools (`batchPool`, `TexturePool`). The runtime now destroys the application with
  `releaseGlobalResources: true`; after the fix no batcher survives a match.
- **Remaining, PixiJS-internal:** one `BindGroup` plus its event listener per destroyed renderer stays subscribed
  to PixiJS's shared 1×1 texture source (a few hundred bytes per match). It is not reachable from the game code.

### Environment B — reference machine with a GPU

_To be recorded with `npm run perf` on a desktop with a GPU (see below)._ The run writes
`docs/reports/performance/match-3min-<platform>.json` and `memory-5-cycles-<platform>.json`; their numbers go
in this table.

| Item / metric            | Value              |
| ------------------------ | ------------------ |
| Hardware (CPU, GPU, RAM) |                    |
| OS / browser             |                    |
| Resolution               | 1280 × 720 @ DPR 1 |
| Average FPS              |                    |
| Frame interval p95       |                    |
| Main-thread work p95     |                    |
| Peak entities            |                    |
| Heap growth cycle 1 → 5  |                    |

## Reproducing

```bash
npm ci
npm run perf            # both runs (about 6 min with a GPU); PERF_HEADED=1 to watch
npm run perf:match      # only the 3-minute match
npm run perf:memory     # only the memory cycles (PERF_MEMORY_CYCLES=10 for more)
```

Close other heavy applications, keep the browser window visible when headed (a hidden tab pauses the match by
design) and do not resize it during the run.

## Design choices that keep frames cheap

- Fixed 60 Hz simulation with interpolated rendering; a frame never runs more than 0.25 s of simulation.
- Terrain (30 × 17 tiles) is built once and cached as a single texture; only ships, projectiles, health bars and
  effects change.
- Projectile sprites are pooled; effects are short-lived objects removed when finished; destroyed enemies are
  removed from the world; wrecks sink and disappear.
- React re-renders only when a HUD value changes (whole seconds, health, score), never per frame.
- Collision broad phase: islands are merged into a few rectangles; ship pairs are tested directly — the alive
  cap (6 → 14 enemies) keeps this tiny (see ARCHITECTURE.md › Collisions).
- Textures are loaded once and shared by every match; the renderer resolution is capped at a device pixel ratio
  of 2.

## Limitations

- The numbers above were recorded in a CPU-only container; the 60 FPS target must be confirmed on a machine with
  a GPU (Environment B).
- Entity counts are sampled once per second, so very short peaks between samples are not reflected.
- The memory method measures the JS heap and DOM; GPU memory is released through PixiJS/WebGL and verified
  indirectly (no surviving WebGL context or canvas).
