import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../src/theme/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.GOLD,
        tabBarInactiveTintColor: THEME.MUTED,
        tabBarStyle: { backgroundColor: "#0D0E12", borderTopColor: THEME.BORDER },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      {/* Visible tabs */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sports"
        options={{
          title: "Sports",
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
        }}
      />

      {/* Hidden internal routes — use ONLY href: null (no tabBarButton to avoid error) */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="home/league/[id]" options={{ href: null }} />
      <Tabs.Screen name="account/settings" options={{ href: null }} />
      <Tabs.Screen name="account/privacy" options={{ href: null }} />
      <Tabs.Screen name="account/terms" options={{ href: null }} />
    </Tabs>
  );
}
