import { setupServer } from 'msw/node';
import { MemoryStorage } from '@/storage/LocalStore';
import { createHandlers } from './handlers';
import { MockServer, type MockServerOptions } from './MockServer';

export const TEST_API_PATH = '/api';
export const TEST_API_BASE_URL = `http://localhost${TEST_API_PATH}`;

/** The same handlers as the browser worker, on Node, for Vitest. Latency is zero unless a test asks for it. */
export function createTestMockServer(options: Partial<MockServerOptions> = {}) {
  const mockServer = new MockServer({
    storage: new MemoryStorage(),
    noAnswerDelayMs: 1_000,
    ...options,
    scenarioOverrides: { baseLatencyMs: 0, ...options.scenarioOverrides },
  });
  const network = setupServer(...createHandlers(mockServer, TEST_API_PATH));
  return { mockServer, network };
}
