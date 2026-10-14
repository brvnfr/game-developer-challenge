import { useId, useState } from 'react';
import type { RankingPage } from '@/api/contracts';
import { createConfigKey, parseConfigKey } from '@/game/config/matchConfig';
import type { UserSettings } from '@/game/config/types';
import { useRankingConfigurations, useRankingPage } from '@/remote/hooks';
import { Pagination } from '@/ui/components/Pagination';
import { RemoteList } from '@/ui/components/RemoteList';
import { describeBattleSettings, describeDateTime, formatDayMonth, formatTimeOfDay } from '@/ui/formatDate';

interface RankingPanelProps {
  /** The player's current options: their ranking is shown first. */
  readonly currentSettings: UserSettings;
  readonly playerId: string;
}

function labelFor(configKey: string): string {
  const settings = parseConfigKey(configKey);
  return settings ? describeBattleSettings(settings) : configKey;
}

/** Ranking of the matches played with one configuration (same settings only), best first. */
export function RankingPanel({ currentSettings, playerId }: RankingPanelProps) {
  const currentKey = createConfigKey(currentSettings);
  const [configKey, setConfigKey] = useState(currentKey);
  const [page, setPage] = useState(1);
  const ranking = useRankingPage(configKey, page);
  const configurations = useRankingConfigurations();
  const selectId = useId();

  const configKeys = [currentKey, ...(configurations.data?.items.map((item) => item.configKey) ?? [])].filter(
    (key, index, keys) => keys.indexOf(key) === index,
  );

  return (
    <>
      <div className="log-filter">
        <label htmlFor={selectId}>Battle settings</label>
        <select
          id={selectId}
          value={configKey}
          onChange={(event) => {
            setConfigKey(event.target.value);
            setPage(1);
          }}
        >
          {configKeys.map((key) => (
            <option key={key} value={key}>
              {labelFor(key)}
              {key === currentKey ? ' (your options)' : ''}
            </option>
          ))}
        </select>
      </div>
      <RemoteList
        query={ranking}
        subject="the ranking"
        testId="ranking-list"
        isEmpty={(data: RankingPage) => data.items.length === 0}
        emptyMessage={
          page > 1
            ? 'No battles on this page.'
            : 'No battles with these settings yet. Finish one to claim the top spot!'
        }
      >
        {(data) => (
          <table className="log-table">
            <caption className="visually-hidden">
              Ranking for {labelFor(configKey)}, page {data.page} of {data.totalPages}
            </caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Captain</th>
                <th scope="col">Points</th>
                <th scope="col">Played</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => {
                const isPlayer = entry.playerId === playerId;
                return (
                  <tr key={entry.matchId} className={isPlayer ? 'log-table__row--highlight' : undefined}>
                    <td className="log-table__rank">{String(entry.rank).padStart(2, '0')}</td>
                    <td className="log-table__captain">
                      {entry.rank === 1 && (
                        <span className="log-table__star" aria-label="Top captain">
                          ★
                        </span>
                      )}
                      {entry.playerName}
                      {isPlayer && <span className="badge">You</span>}
                    </td>
                    <td className="log-table__points">{entry.score}</td>
                    <td className="log-table__date">
                      <time dateTime={entry.endedAt} title={describeDateTime(entry.endedAt)}>
                        <span className="log-table__day">{formatDayMonth(entry.endedAt)}</span>
                        <span className="log-table__time"> · {formatTimeOfDay(entry.endedAt)}</span>
                      </time>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </RemoteList>
      <Pagination label="Ranking pages" page={page} totalPages={ranking.data?.totalPages ?? 0} onChange={setPage} />
    </>
  );
}
