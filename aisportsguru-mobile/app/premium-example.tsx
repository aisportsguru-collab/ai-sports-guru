// app/premium-example.tsx
import { Text, View } from 'react-native';
import RequirePro from '../src/components/RequirePro';

export default function PremiumExampleScreen() {
  return (
    <RequirePro>
      <View style={{ padding: 24 }}>
        <Text>Premium content goes here ✅</Text>
      </View>
    </RequirePro>
  );
}
