"use client";

import { useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Session } from "@supabase/supabase-js";

export default function SupabaseListener() {
  const supabase = createClientComponentClient();

  useEffect(() => {
    // On any auth change, sync the cookie on the server
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session: Session | null) => {
        try {
          await fetch("/api/auth/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ event, session }),
          });
        } catch {
          // ignore — cookie sync best-effort
        }
      }
    );
    return () => {
      subscription?.subscription?.unsubscribe();
    };
  }, [supabase]);

  return null;
}
