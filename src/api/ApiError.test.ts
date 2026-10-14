import { AxiosError, AxiosHeaders, CanceledError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError } from './ApiError';

function responseWith(status: number, data: unknown): AxiosResponse {
  return { status, statusText: '', data, headers: {}, config: { headers: new AxiosHeaders() } };
}

describe('ApiError.from', () => {
  it('maps an Axios timeout to a retryable timeout error', () => {
    const error = ApiError.from(new AxiosError('timeout of 100ms exceeded', 'ECONNABORTED'));
    expect(error.kind).toBe('timeout');
    expect(error.isRetryable).toBe(true);
  });

  it('maps a request without response to a retryable network error', () => {
    const error = ApiError.from(new AxiosError('Network Error', 'ERR_NETWORK'));
    expect(error.kind).toBe('network');
    expect(error.isRetryable).toBe(true);
  });

  it('keeps the status and the server message of HTTP errors', () => {
    const serverError = ApiError.from(
      new AxiosError(
        'fail',
        'ERR_BAD_RESPONSE',
        undefined,
        undefined,
        responseWith(503, { code: 'unavailable', message: 'Down' }),
      ),
    );
    expect(serverError).toMatchObject({ kind: 'http', status: 503, code: 'unavailable', message: 'Down' });
    expect(serverError.isRetryable).toBe(true);

    const clientError = ApiError.from(
      new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, undefined, responseWith(400, 'not json')),
    );
    expect(clientError).toMatchObject({ kind: 'http', status: 400, code: null });
    expect(clientError.isRetryable).toBe(false);
    expect(clientError.userMessage).toBe('The request was rejected (error 400).');
  });

  it('recognises cancellations and passes ApiError through unchanged', () => {
    expect(ApiError.from(new CanceledError()).kind).toBe('cancelled');
    const original = new ApiError('invalidResponse', 'bad');
    expect(ApiError.from(original)).toBe(original);
  });
});
