import React from 'react';
import { ProProvider, usePro } from './ProProvider';

/** Thin adapter so legacy useEntitlement() works without its own context */
export const EntitlementProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <ProProvider>{children}</ProProvider>;
};

export function useEntitlement() {
  const { hasPro, loading, refresh } = usePro();
  return { isPro: hasPro, isReady: !loading, refresh };
}
