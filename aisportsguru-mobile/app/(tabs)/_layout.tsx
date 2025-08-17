import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#93f7bd',
        tabBarInactiveTintColor: '#98a6c7',
        tabBarStyle: { backgroundColor: '#0b0f2a', borderTopColor: '#131a3a' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="predictions"
        options={{
          title: 'Predictions',
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sports"
        options={{
          title: 'Sports',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
      {/* IMPORTANT: this must match the actual file path app/(tabs)/account/index.tsx */}
      <Tabs.Screen
        name="account/index"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
