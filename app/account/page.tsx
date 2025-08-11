"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
  is_subscribed: boolean | null;
  subscription_status: string | null;
};

export default function AccountPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        setErr("Please sign in to view your account.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,stripe_customer_id,is_subscribed,subscription_status")
        .eq("id", user.id)
        .maybeSingle();

      if (error) setErr(error.message);
      setProfile((data as Profile) ?? null);
      setLoading(false);
    })();
  }, [supabase]);

  const signOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    window.location.href = "/"; // back to home
  };

  const openBillingPortal = async () => {
    if (!profile?.stripe_customer_id) {
      setErr("No Stripe customer is linked to this account yet.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: profile.stripe_customer_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail || json?.error || "Failed to start portal");
      window.location.href = json.url;
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="bg-black text-white min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading account…</p>
      </main>
    );
  }

  if (err) {
    return (
      <main className="bg-black text-white min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="mb-6 text-red-400">{err}</p>
          <a href="/sign-in" className="underline text-yellow-400">Go to Sign In</a>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-black text-white min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-4">Account</h1>

        {msg && <div className="mb-4 rounded-lg bg-green-900/30 border border-green-700 p-3 text-sm">{msg}</div>}
        {err && <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700 p-3 text-sm">{err}</div>}

        <div className="space-y-2 text-sm text-gray-300 mb-6">
          <div><span className="text-gray-400">Email:</span> {profile?.email ?? "—"}</div>
          <div>
            <span className="text-gray-400">Subscription:</span>{" "}
            {profile?.is_subscribed ? "Active" : "Inactive"}{profile?.subscription_status ? ` (${profile.subscription_status})` : ""}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/nba"
            className="flex-1 text-center bg-yellow-400 text-black font-semibold px-5 py-3 rounded-xl hover:bg-yellow-500 transition"
          >
            View Predictions
          </a>

          <button
            onClick={openBillingPortal}
            disabled={busy}
            className="flex-1 bg-gray-800 border border-gray-700 px-5 py-3 rounded-xl hover:bg-gray-700 transition disabled:opacity-60"
          >
            Manage Billing
          </button>

          <button
            onClick={signOut}
            disabled={busy}
            className="sm:w-32 bg-red-600/80 px-5 py-3 rounded-xl hover:bg-red-600 transition disabled:opacity-60"
          >
            Sign out
          </button>
        </div>

        {!profile?.is_subscribed && (
          <p className="mt-6 text-gray-400 text-sm text-center">
            No active subscription?{" "}
            <a href="/pricing" className="text-yellow-400 underline underline-offset-4">Start your free trial</a>
          </p>
        )}
      </div>
    </main>
  );
}
