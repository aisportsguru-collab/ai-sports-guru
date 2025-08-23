import React from "react";
import { Tabs } from "expo-router";
import { THEME } from "../../src/theme/colors";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.GOLD,
        tabBarInactiveTintColor: THEME.MUTED,
        tabBarStyle: {
          backgroundColor: THEME.CARD,
          borderTopColor: THEME.BORDER,
          height: Platform.select({ ios: 90, android: 70, default: 70 }),
          paddingTop: 8,
          paddingBottom: 18,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sports"
        options={{
          title: "Sports",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />

      {/*
        If you keep any internal routes in the tabs group, hide them from the tab bar:
        <Tabs.Screen name="internal" options={{ href: null }} />
      */}
    </Tabs>
  );
}
