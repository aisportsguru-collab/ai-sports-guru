import React from "react";
import { Tabs } from "expo-router";
import { isAdminEmail } from "../../src/state/isAdmin";

/**
 * TODO: plug your real user email here, e.g. from your existing auth state/hook.
 * const { user } = useAuth();
 * const currentEmail = user?.email;
 */
const currentEmail: string | undefined = undefined;

export default function TabsLayout() {
  const showAdmin = isAdminEmail(currentEmail);

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="league" options={{ href: null }} /> 
      {/* your existing league tab screens remain as-is */}
      {showAdmin && <Tabs.Screen name="admin" options={{ title: "Admin" }} />}
      {/* If you have a Settings screen, make sure it is also listed here */}
    </Tabs>
  );
}
