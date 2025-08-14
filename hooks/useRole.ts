"use client";

import { useEffect, useState } from "react";
import { supaBrowser } from "../lib/supa-browser";

export type UserRole = "free" | "pro" | "admin" | null;

export function useRole() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);

  useEffect(() => {
    const supa = supaBrowser();

    async function run() {
      setLoading(true);
      const { data: { user } } = await supa.auth.getUser();
      if (!user) {
        setRole(null); // signed out
        setLoading(false);
        return;
      }

      // ensure a row exists (harmless upsert)
      await supa.from("profiles").upsert({ id: user.id, email: user.email }).select().single();

      const { data, error } = await supa
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        setRole("free");
      } else {
        setRole((data?.role as UserRole) ?? "free");
      }
      setLoading(false);
    }

    run();

    // also react to auth state changes
    const { data: sub } = supa.auth.onAuthStateChange(() => run());
    return () => sub.subscription.unsubscribe();
  }, []);

  return { role, loading };
}
