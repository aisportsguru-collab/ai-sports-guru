import { useEffect, useState } from 'react';
import { getSportsList } from './api';

export function useSportsList() {
  const [sports, setSports] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<unknown>(null);

  useEffect(() => {
    let alive = true;
    getSportsList()
      .then(d => alive && setSports(d))
      .catch(e => alive && setErr(e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  return { sports, loading, error };
}
