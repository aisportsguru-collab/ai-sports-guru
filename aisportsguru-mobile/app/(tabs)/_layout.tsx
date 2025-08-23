import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../src/theme/colors";

const hide = { href: null as any, tabBarButton: () => null, tabBarItemStyle: { display: "none" } };

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
      {/* The ONLY 3 visible tabs */}
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

      {/* Everything else is hidden from the tab bar */}
      <Tabs.Screen name="index" options={hide} />
      <Tabs.Screen name="home/league/[id]" options={hide} />
      <Tabs.Screen name="account/settings" options={hide} />
      <Tabs.Screen name="account/privacy" options={hide} />
      <Tabs.Screen name="account/terms" options={hide} />
    </Tabs>
  );
}
