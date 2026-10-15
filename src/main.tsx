import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import { App } from '@/app/App';
import { BootSplash } from '@/app/boot/BootSplash';
import { preloadUi } from '@/app/boot/preloadUi';
import { createBrowserServices } from '@/app/AppServices';
import { AudioEngine } from '@/game/audio/AudioEngine';
import { readApiConfig } from '@/remote/apiConfig';
import { createRemoteServices } from '@/remote/RemoteServices';
import { browserLocalStorage } from '@/storage/LocalStore';
import { installTestHarness } from '@/testing/TestHarness';
import { readTestMode } from '@/testing/testMode';
import { SEA_BACKDROP_IMAGES } from '@/ui/backdrop/seaBackdropArt';
import { trackFocusModality } from '@/ui/focusModality';
import '@/app/global.css';

/**
 * Starts the mock API (MSW) before the first render, so the first ranking request is already intercepted.
 * If the service worker cannot start, the game still runs and the Captain's Log shows its error state.
 */
async function startMockApi(apiPath: string, scenarioOverrides: ReturnType<typeof readApiConfig>['scenarioOverrides']) {
  try {
    const { startMockWorker } = await import('@/mocks/browser');
    return await startMockWorker({ apiPath, scenarioOverrides });
  } catch (error) {
    console.warn('The mock API could not start; Ranking and Match History will be unavailable.', error);
    return null;
  }
}

async function bootstrap(container: HTMLElement): Promise<void> {
  trackFocusModality(document.documentElement, window);
  const audio = new AudioEngine({ baseUrl: import.meta.env.BASE_URL, storage: browserLocalStorage() });
  audio.attachUnlockListeners(window);
  const testMode = readTestMode();
  if (testMode.isEnabled) installTestHarness(audio);
  // With the test clock frozen (manual time), the menus' decorative animations hold still as well: tests stay
  // deterministic, and a CPU-rendered browser is not kept busy compositing a moving sea behind every step.
  if (testMode.manualTime) document.documentElement.setAttribute('data-motion', 'still');
  const apiConfig = readApiConfig();
  // The loading screen (inline in index.html) stays up while the mock API starts and the interface's art and
  // fonts load, so the first screen appears complete rather than painting piece by piece.
  const splash = BootSplash.fromDocument(document);
  const [mockServer] = await Promise.all([
    apiConfig.areMocksEnabled ? startMockApi(apiConfig.apiPath, apiConfig.scenarioOverrides) : Promise.resolve(null),
    preloadUi(SEA_BACKDROP_IMAGES, (fraction) => splash.setProgress(fraction)),
  ]);
  const remote = createRemoteServices({
    baseUrl: apiConfig.baseUrl,
    timeoutMs: apiConfig.timeoutMs,
    storage: browserLocalStorage(),
    mockServer,
    onlineEvents: window,
  });

  createRoot(container).render(
    <StrictMode>
      <App services={createBrowserServices(remote, audio)} />
    </StrictMode>,
  );
  await afterNextPaint();
  await splash.finish();
}

/** Resolves once the browser has painted the frame after this call. */
function afterNextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}
void bootstrap(container);
