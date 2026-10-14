import { useSyncExternalStore } from 'react';
import type { ExternalStore } from './ExternalStore';

export function useExternalStore<State extends object>(store: ExternalStore<State>): State {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
