import { usePro } from './ProProvider';

export function useEntitlement() {
  const { hasPro, customerInfo, refresh } = usePro();
  return {
    hasPro,
    isPro: hasPro,
    loading: customerInfo === null,
    refresh,
  };
}
