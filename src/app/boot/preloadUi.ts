/** Every image of the menus, HUD and dialogs (buttons, panels, icons, title), bundled by Vite. */
const UI_IMAGES = Object.values(
  import.meta.glob<string>(
    ['/assets/png/retina/ui/**/*.png', '/src/ui/icons/*.svg', '/assets/logo_jungle_gaming.svg'],
    {
      eager: true,
      query: '?url',
      import: 'default',
    },
  ),
);

/** The faces the interface uses (self-hosted by @fontsource). */
const UI_FONTS = ['400 20px "Lilita One"', '400 16px Nunito', '700 16px Nunito'] as const;

/** Never let one slow file keep the player on the loading screen. */
const MAX_WAIT_MS = 10_000;

export interface PreloadEnvironment {
  readonly loadImage: (url: string) => Promise<void>;
  readonly loadFont: (font: string) => Promise<void>;
}

/** Loads and decodes an image, so CSS backgrounds that use it paint at once. Failures are not errors here. */
function loadImage(url: string): Promise<void> {
  const image = new Image();
  image.src = url;
  return image.decode().catch(() => undefined);
}

function loadFont(font: string): Promise<void> {
  return document.fonts
    .load(font)
    .then(() => undefined)
    .catch(() => undefined);
}

export const BROWSER_PRELOAD: PreloadEnvironment = { loadImage, loadFont };

/**
 * Fetches the interface's art and fonts before the first screen is drawn, reporting progress from 0 to 1.
 * A file that fails or is slow never blocks the game: it resolves anyway (the screen would draw without it,
 * as before) and the whole wait is capped at ten seconds.
 */
export async function preloadUi(
  extraImages: readonly string[],
  onProgress: (fraction: number) => void,
  environment: PreloadEnvironment = BROWSER_PRELOAD,
): Promise<void> {
  const images = [...new Set([...UI_IMAGES, ...extraImages])];
  const tasks = [
    ...images.map((url) => () => environment.loadImage(url)),
    ...UI_FONTS.map((font) => () => environment.loadFont(font)),
  ];
  let done = 0;
  onProgress(0);
  const all = Promise.all(
    tasks.map((start) =>
      start().finally(() => {
        done++;
        onProgress(done / tasks.length);
      }),
    ),
  ).then(() => undefined);
  let timer = 0;
  const timeout = new Promise<void>((resolve) => {
    timer = window.setTimeout(resolve, MAX_WAIT_MS);
  });
  await Promise.race([all, timeout]);
  window.clearTimeout(timer);
}

/** Number of interface files preloaded besides `extraImages` (tests). */
export const UI_ASSET_COUNT = UI_IMAGES.length + UI_FONTS.length;
