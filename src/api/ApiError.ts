import { isAxiosError, isCancel } from 'axios';
import { apiErrorBodySchema } from './contracts';

export type ApiErrorKind = 'timeout' | 'network' | 'http' | 'invalidResponse' | 'cancelled';

/** A failed API call, normalised so the UI and the retry policies never deal with Axios internals. */
export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly status: number | null = null,
    readonly code: string | null = null,
  ) {
    super(message);
  }

  /** Timeouts, connection failures and server errors may succeed later; client errors (4xx) will not. */
  get isRetryable(): boolean {
    if (this.kind === 'timeout' || this.kind === 'network') return true;
    return (
      this.kind === 'http' && this.status !== null && (this.status >= 500 || this.status === 408 || this.status === 429)
    );
  }

  /** Short sentence for the player. */
  get userMessage(): string {
    switch (this.kind) {
      case 'timeout':
        return 'The server took too long to answer.';
      case 'network':
        return 'Could not reach the server. Check your connection.';
      case 'invalidResponse':
        return 'The server sent an unexpected answer.';
      case 'cancelled':
        return 'The request was cancelled.';
      case 'http':
        return this.status !== null && this.status >= 500
          ? `The server is having trouble (error ${this.status}).`
          : `The request was rejected (error ${this.status ?? '?'}).`;
    }
  }

  /** Converts anything thrown by Axios (or by response validation) into an ApiError. */
  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;
    if (isCancel(error)) return new ApiError('cancelled', 'Request cancelled');
    if (isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return new ApiError('timeout', error.message);
      }
      if (error.response) {
        const body = apiErrorBodySchema.safeParse(error.response.data);
        return new ApiError(
          'http',
          body.success ? body.data.message : error.message,
          error.response.status,
          body.success ? body.data.code : null,
        );
      }
      return new ApiError('network', error.message);
    }
    return new ApiError('invalidResponse', error instanceof Error ? error.message : String(error));
  }
}
