import type { RegisterMatchRequest } from '@/api/contracts';
import type { MatchResult } from '@/game/sim/match/types';

/** The record sent for a completed match: the result plus who played it. */
export function toRegisterRequest(
  result: MatchResult,
  player: { readonly playerId: string; readonly name: string },
): RegisterMatchRequest {
  return {
    matchId: result.matchId,
    playerId: player.playerId,
    playerName: player.name,
    endedAt: result.endedAt,
    score: result.score,
    durationMs: Math.round(result.durationMs),
    endReason: result.endReason,
    settings: result.settings,
  };
}
