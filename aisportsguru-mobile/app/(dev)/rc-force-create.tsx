import * as React from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Purchases from 'react-native-purchases';

export default function RCForceCreate() {
  const [appUserId, setAppUserId] = React.useState<string>('');
  const [info, setInfo] = React.useState<any>(null);
  const [copied, setCopied] = React.useState<string>('');

  React.useEffect(() => {
    (async () => {
      try {
        // This call is enough to create the customer record in RevenueCat
        const id = await Purchases.getAppUserID();
        setAppUserId(id);
        const ci = await Purchases.getCustomerInfo();
        setInfo(ci);
        console.log('RC appUserId:', id);
        console.log('RC customerInfo:', ci);
      } catch (e) {
        console.log('RC error:', e);
      }
    })();
  }, []);

  const copy = async (val: string) => {
    await Clipboard.setStringAsync(val);
    setCopied('Copied!');
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>
        RevenueCat App User ID
      </Text>

      <View style={{ backgroundColor: '#111', padding: 12, borderRadius: 8, marginBottom: 12 }}>
        <Text style={{ color: '#fff' }}>{appUserId || '(loading...)'}</Text>
      </View>

      {appUserId ? (
        <Pressable
          onPress={() => copy(appUserId)}
          style={{ backgroundColor: '#ffd400', padding: 12, borderRadius: 8, alignSelf: 'flex-start' }}
        >
          <Text style={{ fontWeight: '700' }}>{copied ? copied : 'Copy App User ID'}</Text>
        </Pressable>
      ) : null}

      <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 8 }}>
        Raw Customer Info
      </Text>
      <View style={{ backgroundColor: '#111', padding: 12, borderRadius: 8 }}>
        <Text style={{ color: '#fff' }}>
          {JSON.stringify(info, null, 2)}
        </Text>
      </View>

      <Text style={{ marginTop: 16 }}>
        Deep link to this screen: <Text style={{ fontWeight: '700' }}>aisportsguru://(dev)/rc-force-create</Text>
      </Text>
    </ScrollView>
  );
}
