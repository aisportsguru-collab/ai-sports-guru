import React from 'react';

/** Temporary no-op provider so the app runs flawlessly in Expo Go.
 *  We'll swap this for RevenueCat PurchasesProvider later.
 */
export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Keep both exports to avoid "undefined component" from mismatched imports.
export default PurchasesProvider;
