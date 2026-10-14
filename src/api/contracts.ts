import { z } from 'zod';

/**
 * Contracts of the ranking and match-history REST API. The same schemas validate the client's responses and the
 * mock server's requests, so both sides always agree on the shapes.
 *
 *   GET /api/ranking?configKey=s120-i3&page=1&pageSize=5    → Page<RankingEntry>
 *   GET /api/ranking/configurations                         → RankingConfigurations
 *   GET /api/players/:playerId/matches?page=1&pageSize=5    → Page<MatchRecord>
 *   PUT /api/matches/:matchId   (RegisterMatchRequest)      → MatchRecord (201 created, 200 already recorded)
 */
export const API_PATHS = {
  ranking: '/ranking',
  rankingConfigurations: '/ranking/configurations',
  playerMatches: (playerId: string) => `/players/${encodeURIComponent(playerId)}/matches`,
  match: (matchId: string) => `/matches/${encodeURIComponent(matchId)}`,
} as const;

export const DEFAULT_PAGE_SIZE = 5;
export const MAX_PAGE_SIZE = 50;

export const matchEndReasonSchema = z.enum(['timeUp', 'playerDestroyed']);

export const matchSettingsSchema = z.object({
  sessionTimeSeconds: z.number().int().min(60).max(180),
  spawnIntervalSeconds: z.number().positive().max(10),
});

/** Body of `PUT /matches/:matchId`: one completed match. */
export const registerMatchRequestSchema = z.object({
  matchId: z.string().min(1).max(64),
  playerId: z.string().min(1).max(64),
  playerName: z.string().min(1).max(40),
  endedAt: z.iso.datetime(),
  score: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  endReason: matchEndReasonSchema,
  settings: matchSettingsSchema,
});

/** A match as stored by the server. `configKey` groups matches played with the same settings. */
export const matchRecordSchema = registerMatchRequestSchema.extend({
  configKey: z.string().min(1),
  recordedAt: z.iso.datetime(),
});

export const rankingEntrySchema = z.object({
  rank: z.number().int().positive(),
  matchId: z.string(),
  playerId: z.string(),
  playerName: z.string(),
  score: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  endReason: matchEndReasonSchema,
  endedAt: z.iso.datetime(),
});

export const rankingConfigurationSchema = z.object({
  configKey: z.string(),
  settings: matchSettingsSchema,
  matchCount: z.number().int().min(0),
});

export const rankingConfigurationsSchema = z.object({ items: z.array(rankingConfigurationSchema) });

/** One page of a list. `generatedAt` is the server time the page was built at. */
export function pageSchema<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(0),
    generatedAt: z.iso.datetime(),
  });
}

export const rankingPageSchema = pageSchema(rankingEntrySchema);
export const matchHistoryPageSchema = pageSchema(matchRecordSchema);

export const apiErrorBodySchema = z.object({ code: z.string(), message: z.string() });

export type MatchEndReason = z.infer<typeof matchEndReasonSchema>;
export type MatchSettings = z.infer<typeof matchSettingsSchema>;
export type RegisterMatchRequest = z.infer<typeof registerMatchRequestSchema>;
export type MatchRecord = z.infer<typeof matchRecordSchema>;
export type RankingEntry = z.infer<typeof rankingEntrySchema>;
export type RankingConfiguration = z.infer<typeof rankingConfigurationSchema>;
export type RankingConfigurations = z.infer<typeof rankingConfigurationsSchema>;
export interface Page<Item> {
  readonly items: readonly Item[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly generatedAt: string;
}
export type RankingPage = Page<RankingEntry>;
export type MatchHistoryPage = Page<MatchRecord>;
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

export interface PageRequest {
  readonly page: number;
  readonly pageSize: number;
}
