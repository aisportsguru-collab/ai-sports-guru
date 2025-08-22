import { Link } from "expo-router";
import React from "react";
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { LEAGUES } from "../../src/constants/leagues";
import LegalFooter from "../../src/components/LegalFooter";

export default function Home() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.cc}>
      <View style={styles.hero}>
        <Text style={styles.appTitle}>AI Sports Guru</Text>
        <Text style={styles.tagline}>Premium predictions, beautiful experience.</Text>

        <Link href="/(tabs)/sports" asChild>
          <Pressable style={styles.cta} accessibilityRole="button">
            <Text style={styles.ctaText}>Go to Predictions</Text>
          </Pressable>
        </Link>
      </View>

      <Text style={styles.sectionTitle}>Leagues</Text>
      <View style={styles.grid}>
        {LEAGUES.map((lg) => {
          const L: any = lg;
          const display =
            L.name ??
            L.short ??
            L.label ??
            L.title ??
            L.code ??
            String(L.id ?? "").toUpperCase();

          return (
            <Link
              key={L.id}
              href={{ pathname: "/(tabs)/league/[id]", params: { id: L.id } }}
              asChild
            >
              <Pressable style={styles.tile} accessibilityRole="button">
                <Text style={styles.tileTitle}>{display}</Text>
                <Text style={styles.tileSub}>View odds & picks →</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>More</Text>
      <View style={styles.grid}>
        <Link href="/account/index" asChild>
          <Pressable style={styles.tile}>
            <Text style={styles.tileTitle}>Account</Text>
            <Text style={styles.tileSub}>Subscription & profile.</Text>
          </Pressable>
        </Link>
        <Link href="/settings" asChild>
          <Pressable style={styles.tile}>
            <Text style={styles.tileTitle}>Settings</Text>
            <Text style={styles.tileSub}>Theme, preferences, more.</Text>
          </Pressable>
        </Link>
      </View>

      <View style={{ height: 12 }} />
      <LegalFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B1220" },
  cc: { padding: 16, gap: 16 },
  hero: {
    backgroundColor: "#121A2C",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#24324D"
  },
  appTitle: { color: "white", fontSize: 22, fontWeight: "800" },
  tagline: { color: "#93A0B5", marginTop: 4 },
  cta: { backgroundColor: "#16A34A", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 14 },
  ctaText: { color: "white", fontWeight: "800" },
  sectionTitle: { color: "white", fontSize: 16, fontWeight: "700", marginTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    width: "48%",
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1F2937"
  },
  tileTitle: { color: "#E5E7EB", fontWeight: "800", fontSize: 16 },
  tileSub: { color: "#93A0B5", marginTop: 2, fontSize: 12 }
});
