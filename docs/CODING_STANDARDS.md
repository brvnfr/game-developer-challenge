# Coding standards

These rules apply to every file in `src/`, `e2e/` and `scripts/`. Reviews and new code must follow them.

## Naming

- **Full words, no abbreviations.** `context` not `ctx`, `position` not `pos`, `projectile` not `p`,
  `event` not `e`, `deltaSeconds` not `dt`, `modifiers` not `mod`. Accepted short forms: `id`, `ui`, `api`, `url`, `x`/`y`.
- **Units in the name** for every quantity that has one: `cooldownSeconds`, `durationMs`, `radiusPx` is not
  needed for world distances (pixels are the default unit), but time is always explicit (`Seconds` or `Ms`).
- **Booleans** read as questions: `isAlive`, `hasLineOfSight`, `canFire`, `isTriggerHeld`.
- **Functions and methods** start with a verb: `applyDamage`, `findSpawnPoint`, `resolveCircle`.
- **Classes** are nouns (`Ship`, `MovementSystem`, `SpawnPointFinder`); **interfaces** describe a role or a shape
  without an `I` prefix (`SimulationSystem`, `EnemyBehavior`, `ArenaDefinition`).
- **Module-level constants** that never change use `UPPER_SNAKE_CASE`.
- **Files** are named after their main export: `Ship.ts` for a class, `geometry.ts` for a module of functions,
  `types.ts` for type-only modules. Tests sit next to the code: `Ship.test.ts` (unit), `*.int.test.ts(x)` (integration).

## Classes or functions

Use a **class** when the code has at least one of:

- mutable state with invariants to protect (`Ship`, `Weapon`, `MatchSession`, `InputState`);
- a lifecycle (attach/detach, start/dispose: `KeyboardInputSource`, `AutoPauseController`);
- polymorphic behaviour behind an interface (`SimulationSystem`, `EnemyBehavior` strategies).

Use **pure functions** for stateless transformations (geometry, validation, config building).
Do not create classes with only static members.

## Design

- One responsibility per class/module (SRP). Systems do one thing each and run in an explicit order.
- Extend through new implementations of small interfaces (OCP): a new enemy type is a new `EnemyBehavior`.
- Depend on abstractions only where there is a real seam (DIP): the simulation receives config, randomness,
  arena and clocks; it never touches the DOM, React or PixiJS (enforced by ESLint).
- Prefer composition over inheritance.
- Keep state private and expose intent-revealing methods (`ship.takeDamage(amount)` instead of writing `health`).
- No magic numbers in systems: balancing values live in `GameConfig`; named constants for the rest.
- Comments explain _why_, not _what_.

## Tests

- Test observable behaviour and contracts, not private details.
- Name tests as sentences describing the behaviour.
- Use the same naming rules as production code (no single-letter variables).
