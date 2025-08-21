import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function LegalFooter() {
  return (
    <View style={styles.foot}>
      <Text style={styles.tiny}>
        No wagering. Entertainment only. 21+ where applicable. This product is not a sportsbook.
      </Text>
      <Text style={styles.tiny}>
        By using this app you agree to our Terms, Privacy, and Responsible Gaming.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  foot: { paddingVertical: 8, gap: 4 },
  tiny: { color: "#9CA3AF", fontSize: 11, lineHeight: 14 }
});
