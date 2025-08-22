import React from "react";
import { View, Text, StyleSheet, Alert, ScrollView } from "react-native";
import { isAdminEmail } from "../../../src/state/isAdmin";
import { ENV } from "../../../src/config/env";

/**
 * If you already have an auth hook, replace `currentEmail` with your real user email, e.g.:
 *   const { user } = useAuth();
 *   const currentEmail = user?.email;
 */
const currentEmail: string | undefined = undefined;

export default function Admin() {
  const allowed = isAdminEmail(currentEmail);

  if (!allowed) {
    return (
      <View style={s.wrap}>
        <Text style={s.h1}>Restricted</Text>
        <Text style={s.p}>
          This area is for admins only. If this is your account, make sure
          you're signed in with an admin email listed in
          {" "}
          EXPO_PUBLIC_ADMIN_EMAILS.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h1}>Admin</Text>
      <Text style={s.p}>API base: {ENV.API_BASE || "(missing)"}</Text>
      <Text style={s.p}>
        Window: {ENV.FROM} → {ENV.TO}
      </Text>
      <Text style={s.h2}>Quick actions</Text>
      <Text style={s.link} onPress={() => Alert.alert("Cache", "Would clear caches here in a future build.")}>
        • Clear caches (placeholder)
      </Text>
      <Text style={s.link} onPress={() => Alert.alert("Ping", "Would ping health check here.")}>
        • API health check (placeholder)
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16 },
  h1: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  h2: { fontSize: 16, fontWeight: "700", marginTop: 16, marginBottom: 4 },
  p: { fontSize: 14, opacity: 0.9, marginBottom: 4 },
  link: { fontSize: 14, color: "#3aa7ff", marginBottom: 6 },
});
