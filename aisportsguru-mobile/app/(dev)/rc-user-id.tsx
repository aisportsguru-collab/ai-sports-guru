import * as React from 'react';
import { ScrollView, Text, Pressable } from 'react-native';
import Purchases from 'react-native-purchases';
import * as Clipboard from 'expo-clipboard';

export default function RCAppUserId() {
  const [id, setId] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const appUserId = await Purchases.getAppUserID();
        setId(appUserId);
        // This prints a single, copyable line in your Metro terminal
        console.log(`RC_APP_USER_ID: ${appUserId}`);
      } catch (e: any) {
        console.log('RC_APP_USER_ID_ERROR:', e?.message || String(e));
      }
    })();
  }, []);

  async function copy() {
    if (!id) return;
    await Clipboard.setStringAsync(id);
    console.log('RC_APP_USER_ID_COPIED');
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>RevenueCat App User ID</Text>
      <Text selectable style={{ fontFamily: 'Courier', fontSize: 14 }}>
{`{
  "appUserId": ${JSON.stringify(id || '(loading...)')}
}

Copy the value that starts with $RCAnonymousID:`}
      </Text>
      <Pressable
        onPress={copy}
        style={{
          backgroundColor: '#111',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: 10,
          alignSelf: 'flex-start',
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          Copy App User ID
        </Text>
      </Pressable>
      <Text style={{ color: 'gray' }}>
        Also check your terminal for a line that looks like:
        {'\n'}RC_APP_USER_ID: $RCAnonymousID:xxxxxxxxxxxxxxxx
      </Text>
    </ScrollView>
  );
}
