# Credits and licenses

## Game assets (provided with the challenge)

Everything under [`assets/`](../assets) was provided by the challenge (Jungle Gaming) for this exercise: ship,
ship-part, projectile, effect and tile sprites, their sprite sheets and vector sources, the HUD and menu UI
sprites (`ui_sheet.json` / `ui_sheet_retina.json`), the background image, the reference screenshots and the
sounds in `assets/sounds/`. No separate license file came with them; they are used under the terms of the
challenge and are not redistributed for any other purpose. The originals are kept unchanged in `assets/`.

### Conversions made for the game

| Output                                | Made by                | What changed                                                                                     |
| ------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `public/assets/game/ships.{json,png}` | `npm run assets`       | Starling XML atlas `ships_miscellaneous_sheet.xml` converted to a PixiJS JSON atlas (same image) |
| `public/assets/game/tiles@{1x,2x}.*`  | `npm run assets`       | 64 px and 128 px tile sheets sliced into a PixiJS atlas (`tile_1` = top-left, row-major)         |
| `public/assets/game/ui@{1x,2x}.*`     | `npm run assets`       | Provided UI atlases; the `ui` metadata is stripped, 9-slice `borders` are kept                   |
| `public/assets/audio/*`               | `npm run assets:audio` | WAV → MP3 mono 96 kbit/s for effects, WAV mono 22.05 kHz for loops (ffmpeg); 5.8 MB → 1.2 MB     |

The menus use the PNGs under `assets/png/retina/ui/` directly (buttons, panel, title, icons).

## Created for this project

- `src/ui/icons/sound-on.svg`, `src/ui/icons/sound-off.svg` — drawn for this project in the colours of the
  provided UI; same license as the source code.
- All source code, tests, fixtures and documentation in this repository.

## Fonts

| Font                                                       | Use                | License                                                  | Package                        |
| ---------------------------------------------------------- | ------------------ | -------------------------------------------------------- | ------------------------------ |
| [Lilita One](https://fonts.google.com/specimen/Lilita+One) | Titles and buttons | [SIL Open Font License 1.1](https://openfontlicense.org) | `@fontsource/lilita-one` 5.3.0 |
| [Nunito](https://fonts.google.com/specimen/Nunito)         | Body text          | [SIL Open Font License 1.1](https://openfontlicense.org) | `@fontsource/nunito` 5.3.0     |

Both are self-hosted from the npm packages (no request to Google Fonts); the license texts ship in
`node_modules/@fontsource/*/LICENSE`.

## Main open-source dependencies

| Package              | Version | License    | Role                                     |
| -------------------- | ------- | ---------- | ---------------------------------------- |
| React / React DOM    | 19.2.0  | MIT        | Interface                                |
| PixiJS               | 8.22.0  | MIT        | Game rendering                           |
| TanStack Query       | 5.90.2  | MIT        | Remote state of ranking and history      |
| Axios                | 1.20.0  | MIT        | HTTP client                              |
| MSW                  | 2.11.5  | MIT        | API mocks (browser service worker, Node) |
| zod                  | 4.1.12  | MIT        | Runtime validation of contracts/storage  |
| Vite                 | 7.3.7   | MIT        | Build and dev server                     |
| TypeScript           | 5.9.3   | Apache-2.0 | Language                                 |
| Vitest               | 3.2.7   | MIT        | Unit and integration tests               |
| Playwright           | 1.56.1  | Apache-2.0 | E2E, visual regression, profiling        |
| @axe-core/playwright | 4.10.2  | MPL-2.0    | Accessibility audits in E2E              |
| fast-xml-parser      | 5.11.2  | MIT        | Atlas conversion script                  |

The complete list with exact versions is in `package-lock.json`.
