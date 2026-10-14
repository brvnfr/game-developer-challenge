import { createContext, useContext } from 'react';
import type { RemoteServices } from './RemoteServices';

export const RemoteServicesContext = createContext<RemoteServices | null>(null);

export function useRemoteServices(): RemoteServices {
  const services = useContext(RemoteServicesContext);
  if (!services) throw new Error('useRemoteServices must be used inside RemoteServicesProvider');
  return services;
}
