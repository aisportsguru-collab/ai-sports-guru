import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { consumeLastSpot } from '../logic/lastSpot';

/**
 * On first mount, check if there's a remembered place to go, navigate if so,
 * otherwise stop "booting" so Home renders. Returns boolean 'booting'.
 */
export default function useBootNavigation(): boolean {
  const [booting, setBooting] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let done = false;
    const failSafe = setTimeout(() => {
      if (!done) { done = true; setBooting(false); }
    }, 400);

    (async () => {
      try {
        const dest = await consumeLastSpot();
        if (dest && !done) {
          done = true;
          if (dest.type === 'predictions') {
            router.replace('/(tabs)/predictions');
          } else if (dest.type === 'league') {
            router.replace(`/(tabs)/league/${encodeURIComponent(dest.id)}`);
          }
          // render happens after replace; but we still clear booting to be safe
          setBooting(false);
          return;
        }
      } catch {}
      if (!done) { done = true; setBooting(false); }
    })();

    return () => { done = true; clearTimeout(failSafe); };
  }, [router]);

  return booting;
}
