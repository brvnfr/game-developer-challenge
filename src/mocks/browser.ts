import { setupWorker } from 'msw/browser';
import { browserLocalStorage } from '@/storage/LocalStore';
import { createHandlers } from './handlers';
import { MockServer } from './MockServer';
import type { ScenarioSettings } from './scenarios';

export interface MockWorkerOptions {
  /** Path the API is served from, e.g. "/api". */
  readonly apiPath: string;
  readonly scenarioOverrides?: Partial<ScenarioSettings>;
}

/**
 * Starts the MSW service worker that plays the ranking/history backend in the browser (development, E2E tests
 * and the published build). Assets and every other request pass through untouched.
 */
export async function startMockWorker(options: MockWorkerOptions): Promise<MockServer> {
  const server = new MockServer({
    storage: browserLocalStorage(),
    ...(options.scenarioOverrides ? { scenarioOverrides: options.scenarioOverrides } : {}),
  });
  const worker = setupWorker(...createHandlers(server, options.apiPath));
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });
  return server;
}
