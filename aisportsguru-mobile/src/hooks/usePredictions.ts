import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchPredictions, Prediction } from '../data/predictions';

export function usePredictions() {
  const [data, setData] = useState<Prediction[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (force = false) => {
    setError(null);
    if (!force) setLoading(true);
    try {
      const res = await fetchPredictions(force);
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      // refresh softly on focus using cache & TTL (not force)
      load(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  return { data, loading, error, refresh, refreshing };
}
