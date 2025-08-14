import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0a0a0a', borderTopColor: '#1f1f1f' },
        tabBarActiveTintColor: '#ffd700',
        tabBarInactiveTintColor: '#aaa',
      }}
    >
      <Tabs.Screen
        name="sports/index"
        options={{
          title: 'Sports',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account/index"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
