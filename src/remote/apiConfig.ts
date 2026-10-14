import { isNetworkScenarioId, type ScenarioSettings } from '@/mocks/scenarios';

export interface ApiRuntimeConfig {
  /** Base URL given to Axios (e.g. "/api"). */
  readonly baseUrl: string;
  /** Path part of the base URL, used by the mock handlers (e.g. "/api"). */
  readonly apiPath: string;
  readonly timeoutMs: number;
  readonly areMocksEnabled: boolean;
  /** Network scenario chosen through the URL (`?scenario=slow&networkSeed=3&latency=0`). */
  readonly scenarioOverrides: Partial<ScenarioSettings>;
}

const DEFAULT_TIMEOUT_MS = 8_000;

function readInteger(params: URLSearchParams, name: string, minimum: number, maximum: number): number | undefined {
  const raw = params.get(name);
  if (raw === null) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value >= minimum && value <= maximum ? value : undefined;
}

/**
 * Reads the API settings from the environment (see .env.example) and the URL. `apiTimeout` is only honoured in
 * test mode, so automated runs can exercise timeouts quickly.
 */
export function readApiConfig(
  env: ImportMetaEnv = import.meta.env,
  search: string = window.location.search,
): ApiRuntimeConfig {
  const params = new URLSearchParams(search);
  const baseUrl = (env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');
  const apiPath = new URL(baseUrl, 'http://placeholder').pathname.replace(/\/+$/, '');
  const environmentTimeout = Number(env.VITE_API_TIMEOUT_MS);
  const testTimeout = params.get('test') === '1' ? readInteger(params, 'apiTimeout', 100, 60_000) : undefined;
  const scenarioId = params.get('scenario');
  const seed = readInteger(params, 'networkSeed', 0, 2 ** 31);
  const latency = readInteger(params, 'latency', 0, 10_000);
  return {
    baseUrl,
    apiPath,
    timeoutMs:
      testTimeout ??
      (Number.isFinite(environmentTimeout) && environmentTimeout > 0 ? environmentTimeout : DEFAULT_TIMEOUT_MS),
    areMocksEnabled: env.VITE_ENABLE_MOCKS !== 'false',
    scenarioOverrides: {
      ...(isNetworkScenarioId(scenarioId) ? { scenarioId } : {}),
      ...(seed === undefined ? {} : { seed }),
      ...(latency === undefined ? {} : { baseLatencyMs: latency }),
    },
  };
}
