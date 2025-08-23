import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const GOLD = '#d4af37';
const BG = '#0b0b0c';
const MID = '#111214';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: BG },
        headerTintColor: '#fff',
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: '#a3a3a3',
        tabBarStyle: { backgroundColor: MID, borderTopColor: '#1c1c1e' },
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Sports (just returns to the hub for now) */}
      <Tabs.Screen
        name="sports"
        options={{
          title: 'Sports',
          tabBarLabel: 'Sports',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Account */}
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarLabel: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
