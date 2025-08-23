import { Slot } from "expo-router";
import React from "react";
import { withQueryProvider } from "../src/lib/query";
import { THEME } from "../src/theme/colors";
import { View } from "react-native";

function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: THEME.BG }}>
      <Slot />
    </View>
  );
}

export default withQueryProvider(RootLayout);
