import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import type { RemoteServices } from './RemoteServices';
import { RemoteServicesContext } from './remoteServicesContext';

/** Provides the API services and the TanStack Query client, and runs the match registrar while mounted. */
export function RemoteServicesProvider({
  services,
  children,
}: {
  readonly services: RemoteServices;
  readonly children: ReactNode;
}) {
  useEffect(() => {
    services.registrar.start();
    return () => services.registrar.stop();
  }, [services]);

  return (
    <QueryClientProvider client={services.queryClient}>
      <RemoteServicesContext.Provider value={services}>{children}</RemoteServicesContext.Provider>
    </QueryClientProvider>
  );
}
