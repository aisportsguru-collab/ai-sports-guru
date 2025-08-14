import React from 'react';
import { Stack } from 'expo-router';

// Try both default and named (whichever exists). Fallback to passthrough.
import PurchasesProviderDefault, { PurchasesProvider as PurchasesProviderNamed } from '../lib/purchases';

const Provider: React.FC<React.PropsWithChildren> =
  (PurchasesProviderDefault as any)
  ?? (PurchasesProviderNamed as any)
  ?? (({ children }) => <>{children}</>);

export default function RootLayout() {
  return (
    <Provider>
      <Stack screenOptions={{ headerShown: false }} />
    </Provider>
  );
}
