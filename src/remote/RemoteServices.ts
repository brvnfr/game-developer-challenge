import type { QueryClient } from '@tanstack/react-query';
import { PirateBattleApi } from '@/api/PirateBattleApi';
import type { MockServer } from '@/mocks/MockServer';
import type { KeyValueStorage } from '@/storage/LocalStore';
import { MatchOutbox } from './MatchOutbox';
import { MatchRegistrar } from './MatchRegistrar';
import { createQueryClient } from './queryClient';

/** Everything the screens need to talk to the ranking/history API. */
export interface RemoteServices {
  readonly api: PirateBattleApi;
  readonly queryClient: QueryClient;
  readonly outbox: MatchOutbox;
  readonly registrar: MatchRegistrar;
  /** The simulated backend when mocks are on (Network scenarios panel), otherwise null. */
  readonly mockServer: MockServer | null;
}

export interface RemoteServicesOptions {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly storage: KeyValueStorage | null;
  readonly mockServer?: MockServer | null;
  readonly queryClient?: QueryClient;
  readonly roundDelaysMs?: readonly number[];
  readonly onlineEvents?: Pick<Window, 'addEventListener' | 'removeEventListener'> | null;
}

export function createRemoteServices(options: RemoteServicesOptions): RemoteServices {
  const api = new PirateBattleApi({ baseUrl: options.baseUrl, timeoutMs: options.timeoutMs });
  const queryClient = options.queryClient ?? createQueryClient();
  const outbox = new MatchOutbox(options.storage);
  const registrar = new MatchRegistrar({
    api,
    queryClient,
    outbox,
    ...(options.roundDelaysMs ? { roundDelaysMs: options.roundDelaysMs } : {}),
    onlineEvents: options.onlineEvents ?? null,
  });
  return { api, queryClient, outbox, registrar, mockServer: options.mockServer ?? null };
}
