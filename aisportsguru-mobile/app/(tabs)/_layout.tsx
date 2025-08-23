import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout(){
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor:'#111', borderTopColor:'#222' },
        tabBarActiveTintColor:'#F4C847',
        tabBarInactiveTintColor:'#8D8D8D',
        tabBarLabelStyle:{ textTransform:'none' }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title:'Home', tabBarIcon:({color,size}) => <Ionicons name="home-outline" size={size} color={color}/> }}
      />
      <Tabs.Screen
        name="sports"
        options={{ title:'Sports', tabBarIcon:({color,size}) => <Ionicons name="trophy-outline" size={size} color={color}/> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title:'Account', tabBarIcon:({color,size}) => <Ionicons name="person-circle-outline" size={size} color={color}/> }}
      />
    </Tabs>
  );
}
