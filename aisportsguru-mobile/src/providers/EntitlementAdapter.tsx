import { usePro } from './ProProvider';

export function useEntitlement() {
  const { hasPro, loading, refresh } = usePro();
  return {
    isPro: hasPro,
    isReady: !loading,
    refresh,
  };
}
