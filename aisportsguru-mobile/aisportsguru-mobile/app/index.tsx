import { useEffect } from 'react';
import { supabase } from '~/lib/supabase';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace('/(tabs)/sports');
      else router.replace('/(onboarding)/welcome');
    })();
  }, []);
  return <View />;
}
