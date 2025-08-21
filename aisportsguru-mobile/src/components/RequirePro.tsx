import React, { PropsWithChildren } from "react";
import { Redirect } from "expo-router";
// Our entitlement hook (if it exists)
import { useEntitlement } from "../lib/admin";

export default function RequirePro({ children }: PropsWithChildren) {
  // Global kill-switch for dev/preview builds
  const DISABLED = process.env.EXPO_PUBLIC_DISABLE_PAYWALL === "1";

  // Default to "allowed" in case the hook isn't wired yet
  let hasPro = true;
  let loading = false;

  try {
    const ent = typeof useEntitlement === "function" ? useEntitlement() : null;
    if (ent) {
      hasPro = !!ent.hasPro;
      loading = !!ent.loading;
    }
  } catch {
    // ignore hook errors in dev
  }

  // Never block when disabled via env flag
  if (DISABLED) return <>{children}</>;

  if (loading) return null;

  if (!hasPro) {
    // No paywall screen in dev — just send them to Sports
    return <Redirect href="/(tabs)/sports" />;
    // If you prefer a screen, swap with: return <Paywall />;
  }

  return <>{children}</>;
}
