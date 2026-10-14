import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import { App } from '@/app/App';
import { createBrowserServices } from '@/app/AppServices';
import { AudioEngine } from '@/game/audio/AudioEngine';
import type { MockServer } from '@/mocks/MockServer';
import { readApiConfig } from '@/remote/apiConfig';
import { createRemoteServices } from '@/remote/RemoteServices';
import { browserLocalStorage } from '@/storage/LocalStore';
import { installTestHarness } from '@/testing/TestHarness';
import { readTestMode } from '@/testing/testMode';
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
  const audio = new AudioEngine({ baseUrl: import.meta.env.BASE_URL, storage: browserLocalStorage() });
  audio.attachUnlockListeners(window);
  if (readTestMode().isEnabled) installTestHarness(audio);
  const apiConfig = readApiConfig();
  const mockServer: MockServer | null = apiConfig.areMocksEnabled
    ? await startMockApi(apiConfig.apiPath, apiConfig.scenarioOverrides)
    : null;
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
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}
void bootstrap(container);
