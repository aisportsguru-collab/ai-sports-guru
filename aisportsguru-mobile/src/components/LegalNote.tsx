import React from "react";
import { Text, View } from "react-native";

export default function LegalNote() {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ opacity: 0.6, fontSize: 12 }}>
        Predictions and odds are provided for entertainment and education only.
        No real-money wagering is available in this app.
      </Text>
    </View>
  );
}
