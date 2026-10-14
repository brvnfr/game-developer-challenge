import { describe, expect, it } from 'vitest';
import { readApiConfig } from './apiConfig';

const env = (values: Partial<ImportMetaEnv>) => values as ImportMetaEnv;

describe('readApiConfig', () => {
  it('defaults to the mocked /api with an 8 s timeout', () => {
    expect(readApiConfig(env({}), '')).toEqual({
      baseUrl: '/api',
      apiPath: '/api',
      timeoutMs: 8_000,
      areMocksEnabled: true,
      scenarioOverrides: {},
    });
  });

  it('reads the environment', () => {
    const config = readApiConfig(
      env({ VITE_API_BASE_URL: 'https://example.com/v1/', VITE_API_TIMEOUT_MS: '5000', VITE_ENABLE_MOCKS: 'false' }),
      '',
    );
    expect(config).toMatchObject({
      baseUrl: 'https://example.com/v1',
      apiPath: '/v1',
      timeoutMs: 5_000,
      areMocksEnabled: false,
    });
  });

  it('takes the network scenario from the URL and ignores invalid values', () => {
    expect(readApiConfig(env({}), '?scenario=slow&networkSeed=7&latency=0').scenarioOverrides).toEqual({
      scenarioId: 'slow',
      seed: 7,
      baseLatencyMs: 0,
    });
    expect(readApiConfig(env({}), '?scenario=nope&networkSeed=x').scenarioOverrides).toEqual({});
  });

  it('honours apiTimeout only in test mode', () => {
    expect(readApiConfig(env({}), '?apiTimeout=1500').timeoutMs).toBe(8_000);
    expect(readApiConfig(env({}), '?test=1&apiTimeout=1500').timeoutMs).toBe(1_500);
  });
});
