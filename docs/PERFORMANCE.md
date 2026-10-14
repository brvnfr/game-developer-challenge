# Performance and memory

Target: **60 FPS** during combat in the optimised production build — **met**: 144 FPS (the display's refresh rate),
p95 7.1 ms, on a desktop GPU (Environment C), measured again after the visual polish patch (animated sea, shallow
water, autotiled islands with props, wakes, aim lanes and reload arcs). This page records how the game was
measured, the results, and what limits them. Raw evidence is in [`docs/reports/performance/`](reports/performance/).

## How it is measured

`npm run perf` (Playwright, `playwright.perf.config.ts`) builds the production bundle, serves it with
`vite preview` and plays in **real time** (no manual clock) in Chromium at **1280 × 720, device pixel ratio 1**.
Unlike the E2E suite, WebGL is not forced to software rendering, and the browser is **headed by default**:
headless Chromium usually falls back to the SwiftShader software rasteriser even on a machine with a GPU (seen in
run B below). Every report records the WebGL renderer and `isGpuAccelerated`, and its file name says `-gpu` or
`-software`.

- **Frame profiler** (`src/game/runtime/FrameProfiler.ts`, enabled with `?test=1&profile=1`): records the
  interval between consecutive frames (what the player sees: FPS, p50/p95/p99), the **main-thread work of each
  frame** (simulation steps + scene update + PixiJS draw submission, measured from the start of the game's ticker
  callback to a callback that runs after PixiJS renders) and, once per second, the entities alive: enemies,
  projectiles, effects and every display object in the scene graph.
- **3-minute match:** 180 s session, spawn interval 3 s (default), seed 7. The bot holds **W** (sail), turns
  left/right alternately every 12 s and keeps **Space + Q + E** held, so every cannon fires as soon as its cooldown
  allows. The player's health is raised to 10 000 (`playerHealth`, a value of the typed config) so the match
  always lasts the full 3 minutes and the arena keeps filling up; every other value is the default.
- **Chrome trace:** 5 s recorded in the middle of the match (`match-3min-trace-<platform>-<gpu|software>.json`; open it in Chrome
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

**3-minute match** ([match-3min-linux-software.json](reports/performance/match-3min-linux-software.json)),
after the visual patch, with the values measured before it for comparison:

| Metric                                   | After the patch                                                                                            | Before                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Average FPS                              | **4.4**                                                                                                    | 6.5                              |
| Frame interval p50 / **p95** / p99 / max | 220 / **285** / 323 / 726 ms                                                                               | 144 / 215 / 264 / 627 ms         |
| Main-thread work per frame avg / p95     | **2.5 / 5.5 ms** (max 115 ms)                                                                              | 1.6 / 4.3 ms                     |
| Peak entities (per-second samples)       | 14 enemies · 13 projectiles · 12 effects · 872 display objects                                             | 12 · 12 · 14 · 724               |
| Match totals                             | 81 enemies spawned (39 Chasers, 42 Shooters) · 1 160 player and 497 enemy projectiles · 40 kills · 27 rams | 110 spawned · 53 kills · 44 rams |
| JS heap at the end                       | 26 MB                                                                                                      | 21 MB                            |

What the numbers say: the game's own work per frame (rules + scene + draw submission) stays far below the
16.7 ms budget of 60 FPS (p95 5.5 ms, a third of the budget; 4.3 ms before the patch). The frame rate here is limited by the
software rasteriser drawing 1280 × 720 pixels on two virtual CPUs without a GPU — the same reason the E2E suite
uses a manual clock. PixiJS's ticker reports at most 100 ms per frame (its `minFPS` of 10), so with frames this
slow the 180 s match took 410 s of wall time (278 s before the patch). **This environment cannot show 60 FPS and
is not the reference for that target.**

What the patch costs here: with software rasterisation the cost of a frame follows the number of pixels blended.
The first version of the new terrain drew four full-arena layers (two sea layers, then the shallows and the islands
cached as arena-sized textures) and took about 330 ms per frame in a 20-second sample, against 140 ms for the
old terrain. Dropping the second (additive "glints") sea layer and caching each island and its shallows as their
own small textures brought it to about 210 ms; the sea is now the only layer covering the whole arena. Wakes,
aim lanes and reload arcs made no measurable difference here. With the GPU (Environment C) the patch did not change
the frame rate; the reduction mainly helps weak mobile GPUs.

**Memory, 5 cycles** ([memory-5-cycles-linux-software.json](reports/performance/memory-5-cycles-linux-software.json)),
after the visual patch:

| After               | JS heap (MB) | DOM nodes | JS listeners | Live runtimes | Canvases |
| ------------------- | -----------: | --------: | -----------: | ------------: | -------: |
| Menu (no match yet) |         3.28 |        26 |            5 |             0 |        0 |
| Cycle 1             |         7.95 |       117 |          185 |             0 |        0 |
| Cycle 2             |         8.16 |       117 |          185 |             0 |        0 |
| Cycle 3             |         8.34 |       117 |          185 |             0 |        0 |
| Cycle 4             |         8.41 |       117 |          185 |             0 |        0 |
| Cycle 5             |         8.54 |       117 |          185 |             0 |        0 |

- The first match loads the atlases, sounds and code (+4.7 MB): expected, and kept for later matches.
- From cycle 1 to 5: **+0.59 MB** (+0.21, +0.18, +0.07, +0.13 MB; before the patch +0.60 MB); DOM nodes and
  listeners return to the same level; no runtime or canvas survives a match. The wake texture drawn on a canvas
  and the cached island textures are released with each match: the canvas and WebGL counts below do not grow. Native objects in the heap snapshots are identical after
  cycle 1 and cycle 5 (6 canvas and 7 WebGL context objects held by PixiJS's and the browser's capability checks
  and caches, 0 detached canvases, 2 resize observers) — nothing accumulates per match. A 10-cycle run
  ([memory-10-cycles-linux-software.json](reports/performance/memory-10-cycles-linux-software.json), measured before the visual patch) goes from 7.49 MB after cycle 1
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

### Environment B — desktop, headless run (still software WebGL)

The first run on the developer's desktop used headless Chromium, which did **not** use the GPU: the renderer is
again SwiftShader. It is kept because it shows how the same software path behaves on a fast CPU.

| Item       | Value                                                                |
| ---------- | -------------------------------------------------------------------- |
| Hardware   | AMD Ryzen 7 5700X (8 cores / 16 threads), 32 GB RAM                  |
| OS         | Windows 11 (NT 10.0.26200, x64)                                      |
| Browser    | Chromium 141.0.7390.37 **headless** (Playwright 1.56.1)              |
| WebGL      | ANGLE / **SwiftShader** (software rasteriser — the GPU was not used) |
| Resolution | 1280 × 720 @ DPR 1                                                   |

| Metric                                   | Value                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Average FPS                              | **21.7** (per-second samples 19–26)                                                                          |
| Frame interval p50 / **p95** / p99 / max | 46 / **54** / 57.5 / 225 ms                                                                                  |
| Main-thread work per frame avg / p95     | **0.6 / 1.0 ms** (max 31.7 ms)                                                                               |
| Peak entities (per-second samples)       | 13 enemies · 13 projectiles · 15 effects · 730 display objects                                               |
| Match totals                             | 112 enemies spawned (52 Chasers, 60 Shooters) · 1 160 player and 452 enemy projectiles · 63 kills · 37 rams  |
| Memory, cycle 1 → 5                      | 7.74 → 8.34 MB (+0.60 MB, same flattening); DOM 118 nodes, 197 listeners, 0 runtimes and canvases each cycle |

Evidence: [match-3min-win32-software.json](reports/performance/match-3min-win32-software.json),
[trace](reports/performance/match-3min-trace-win32-software.json),
[memory-5-cycles-win32-software.json](reports/performance/memory-5-cycles-win32-software.json).

The game's own frame work is 1 ms at p95 — 6 % of the 16.7 ms budget; the frame rate is again set by the CPU
rasteriser (46 ms per 1280 × 720 frame). The 180 s match took exactly 180 s of wall time here.

### Environment C — desktop with the GPU (reference for 60 FPS) ✅

| Item       | Value                                                                            |
| ---------- | -------------------------------------------------------------------------------- |
| Hardware   | AMD Ryzen 7 5700X (8 cores / 16 threads), 32 GB RAM, **NVIDIA GeForce RTX 5080** |
| OS         | Windows 11 (NT 10.0.26200, x64)                                                  |
| Browser    | Chromium 141.0.7390.37 **headed** (Playwright 1.56.1)                            |
| WebGL      | ANGLE / Direct3D 11 on the GPU (`isGpuAccelerated: true`)                        |
| Display    | 144 Hz refresh rate (inferred: frames are paced by vsync at a steady 144 FPS)    |
| Resolution | 1280 × 720 @ DPR 1                                                               |
| Match      | 180 s, spawn 3 s, seed 7, player health 10 000, all cannons firing               |

**3-minute match** ([match-3min-win32-gpu.json](reports/performance/match-3min-win32-gpu.json),
[trace](reports/performance/match-3min-trace-win32-gpu.json)), after the visual patch, with the run made before it
for comparison:

| Metric                                   | After the patch                                                                                             | Before                           |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Average FPS                              | **144.0** (every per-second sample between 143.8 and 146) — the display's refresh rate                      | 144.0                            |
| Frame interval p50 / **p95** / p99 / max | 6.9 / **7.1** / 7.2 / 9.2 ms                                                                                | 6.9 / 7.1 / 7.1 / 11.8 ms        |
| Frames longer than 33 ms                 | **0** of 26 034                                                                                             | 0 of 26 032                      |
| Main-thread work per frame avg / p95     | **0.47 / 1.0 ms** (max 3.4 ms)                                                                              | 0.22 / 0.4 ms (max 2.4 ms)       |
| Peak entities (per-second samples)       | 14 enemies · 12 projectiles · 18 effects · 927 display objects                                              | 14 · 16 · 16 · 749               |
| Match totals                             | 101 enemies spawned (44 Chasers, 57 Shooters) · 1 160 player and 524 enemy projectiles · 54 kills · 33 rams | 109 spawned · 60 kills · 35 rams |
| JS heap at the end                       | 41 MB                                                                                                       | 34 MB                            |

The patch doubled the game's own work per frame (wakes, more display objects, the aim lanes and reload arcs), but
it stays at 1 ms at p95 — 6 % of the 16.7 ms budget — and the frame rate did not move.

**Memory, 5 cycles** ([memory-5-cycles-win32-gpu.json](reports/performance/memory-5-cycles-win32-gpu.json)),
after the visual patch:

| After               | JS heap (MB) | DOM nodes | JS listeners | Live runtimes | Canvases |
| ------------------- | -----------: | --------: | -----------: | ------------: | -------: |
| Menu (no match yet) |         3.51 |       107 |          153 |             0 |        0 |
| Cycle 1             |         8.28 |       117 |          197 |             0 |        0 |
| Cycle 2             |         8.54 |       117 |          197 |             0 |        0 |
| Cycle 3             |         8.60 |       117 |          197 |             0 |        0 |
| Cycle 4             |         8.64 |       117 |          198 |             0 |        0 |
| Cycle 5             |         8.79 |       117 |          197 |             0 |        0 |

Heap +0.51 MB from cycle 1 to 5 (+0.57 MB before the patch) with the same flattening as the other runs; native
objects in the heap snapshots are identical after cycle 1 and cycle 5 (6 canvas objects, 7 WebGL contexts,
2 resize observers, 0 detached canvases, 14 audio buffer sources, 15 gain nodes). About 100–130 wake puffs were
alive during each match; their pool and texture go away with the match.

**Verdict:** with a GPU the game runs at the display's refresh rate for the whole 3-minute match — 144 FPS,
p95 7.1 ms between frames and no frame over 33 ms, well beyond the 60 FPS target (16.7 ms). The game's own
main-thread work stays at 1 ms per frame at p95 even at the end of the match, when the arena is fullest.
On a 60 Hz display the same build is paced at 60 FPS with a large margin.

## Reproducing

```bash
npm ci
npm run perf            # both runs, headed (about 6 min); PERF_HEADLESS=1 forces headless
npm run perf:match      # only the 3-minute match
npm run perf:memory     # only the memory cycles (PERF_MEMORY_CYCLES=10 for more)
```

Close other heavy applications, leave the browser window on screen (minimising it hides the tab, which pauses
the match by design) and do not resize it during the run. A run whose renderer is software-only prints a warning.

## Design choices that keep frames cheap

- Fixed 60 Hz simulation with interpolated rendering; a frame never runs more than 0.25 s of simulation.
- The sea is a single repeating quad; each island and its shallows are built once and cached as their own small
  textures, so drawing them costs the islands' area, not the arena's. Only ships, projectiles, wakes, health bars,
  reload arcs and effects change.
- Wake puffs are pooled sprites sharing one texture (capped at 360 alive); the aim lanes are built once and only
  moved; the reload arcs are redrawn only when a weapon's readiness changes.
- Projectile sprites are pooled; effects are short-lived objects removed when finished; destroyed enemies are
  removed from the world; wrecks sink and disappear.
- React re-renders only when a HUD value changes (whole seconds, health, score), never per frame.
- Collision broad phase: islands are merged into a few rectangles; ship pairs are tested directly — the alive
  cap (6 → 14 enemies) keeps this tiny (see ARCHITECTURE.md › Collisions).
- Textures are loaded once and shared by every match; the renderer resolution is capped at a device pixel ratio
  of 2.

## Limitations

- Runs A and B rendered WebGL in software and are kept as worst cases; the 60 FPS target is confirmed by the GPU
  run (Environment C) on one desktop, before and after the visual patch; other GPUs and browsers were not measured.
- Entity counts are sampled once per second, so very short peaks between samples are not reflected.
- The memory method measures the JS heap and DOM; GPU memory is released through PixiJS/WebGL and verified
  indirectly (no surviving WebGL context or canvas).
