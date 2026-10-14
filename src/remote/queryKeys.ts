/** Query and mutation keys. Every remote key starts with "remote", so one invalidation refreshes all lists. */
export const remoteKeys = {
  all: ['remote'] as const,
  rankingPage: (configKey: string, page: number) => ['remote', 'ranking', configKey, page] as const,
  rankingConfigurations: () => ['remote', 'ranking-configurations'] as const,
  historyPage: (playerId: string, page: number) => ['remote', 'history', playerId, page] as const,
  registerMatch: (matchId: string) => ['register-match', matchId] as const,
};
