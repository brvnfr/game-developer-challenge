import axios, { type AxiosInstance } from 'axios';
import type { z } from 'zod';
import { ApiError } from './ApiError';
import {
  API_PATHS,
  matchHistoryPageSchema,
  matchRecordSchema,
  rankingConfigurationsSchema,
  rankingPageSchema,
  type MatchHistoryPage,
  type MatchRecord,
  type PageRequest,
  type RankingConfigurations,
  type RankingPage,
  type RegisterMatchRequest,
} from './contracts';

export interface ApiClientOptions {
  /** Base URL of the API, e.g. "/api" (relative to the page) or "https://example.com/api". */
  readonly baseUrl: string;
  readonly timeoutMs: number;
}

/**
 * Typed client of the ranking and match-history API (Axios). It validates every response against the shared
 * contracts and throws only ApiError. Retries are not done here: TanStack Query owns the retry policy.
 */
export class PirateBattleApi {
  private readonly http: AxiosInstance;
  private readonly timeoutMs: number;

  constructor(options: ApiClientOptions) {
    this.timeoutMs = options.timeoutMs;
    this.http = axios.create({ baseURL: options.baseUrl, headers: { Accept: 'application/json' } });
  }

  getRanking(configKey: string, pageRequest: PageRequest, signal?: AbortSignal): Promise<RankingPage> {
    return this.request(
      rankingPageSchema,
      (requestSignal) =>
        this.http.get(API_PATHS.ranking, { params: { configKey, ...pageRequest }, signal: requestSignal }),
      signal,
    );
  }

  getRankingConfigurations(signal?: AbortSignal): Promise<RankingConfigurations> {
    return this.request(
      rankingConfigurationsSchema,
      (requestSignal) => this.http.get(API_PATHS.rankingConfigurations, { signal: requestSignal }),
      signal,
    );
  }

  getPlayerMatches(playerId: string, pageRequest: PageRequest, signal?: AbortSignal): Promise<MatchHistoryPage> {
    return this.request(
      matchHistoryPageSchema,
      (requestSignal) =>
        this.http.get(API_PATHS.playerMatches(playerId), { params: pageRequest, signal: requestSignal }),
      signal,
    );
  }

  /** Idempotent: sending the same match again returns the record already stored. */
  registerMatch(match: RegisterMatchRequest, signal?: AbortSignal): Promise<MatchRecord> {
    return this.request(
      matchRecordSchema,
      (requestSignal) => this.http.put(API_PATHS.match(match.matchId), match, { signal: requestSignal }),
      signal,
    );
  }

  /**
   * Sends one request with a deadline. The deadline is an AbortSignal (not Axios' `timeout`), so a request
   * cancelled by the caller and one that ran out of time are told apart, whatever the transport.
   */
  private async request<Schema extends z.ZodType>(
    schema: Schema,
    send: (signal: AbortSignal) => Promise<{ data: unknown }>,
    callerSignal: AbortSignal | undefined,
  ): Promise<z.infer<Schema>> {
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), this.timeoutMs);
    const signal = callerSignal ? AbortSignal.any([callerSignal, deadline.signal]) : deadline.signal;
    let data: unknown;
    try {
      ({ data } = await send(signal));
    } catch (error) {
      if (deadline.signal.aborted && !callerSignal?.aborted) {
        throw new ApiError('timeout', `No answer within ${this.timeoutMs} ms`);
      }
      throw ApiError.from(error);
    } finally {
      clearTimeout(timer);
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new ApiError('invalidResponse', `Unexpected response: ${parsed.error.message}`);
    return parsed.data;
  }
}
