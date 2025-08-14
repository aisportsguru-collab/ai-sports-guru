"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const PRICE_MONTHLY =
  (process.env as any).NEXT_PUBLIC_STRIPE_PRICE_MONTHLY ||
  "price_1Qi8RfEr4GKdpDsZ4k92wJPQ";
const PRICE_ANNUAL =
  (process.env as any).NEXT_PUBLIC_STRIPE_PRICE_ANNUAL ||
  "price_1RvRwaEr4GKdpDsZy0u08Fn9";

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const sp = useSearchParams();

  const [mode, setMode] = useState<"signup" | "signin">(
    (sp.get("mode") as any) === "signin" ? "signin" : "signup"
  );

  // extra fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);

  const plan = (sp.get("plan") || "").toLowerCase(); // monthly | annual
  const next = sp.get("next"); // optional

  const nextUrl = useMemo(() => {
    if (next) return next;
    if (plan === "monthly" || plan === "annual") return `/api/stripe/start?plan=${plan}`;
    return "/account";
  }, [plan, next]);

  async function upsertProfile(args: {
    id: string;
    email: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  }) {
    try {
      await fetch("/api/profile/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: args.id,
          email: args.email,
          first_name: args.first_name ?? null,
          last_name: args.last_name ?? null,
          phone: args.phone ?? null,
        }),
      });
    } catch { /* ignore */ }
  }

  async function goToStripe(userId: string) {
    // Avoid cookie timing: create checkout on the client and redirect
    const priceId = plan === "annual" ? PRICE_ANNUAL : PRICE_MONTHLY;
    if (!priceId) {
      window.location.href = "/pricing";
      return;
    }
    const r = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, priceId }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.url) {
      window.location.href = j.url as string;
      return;
    }
    // fallback to server start if something odd happens
    window.location.href = `/api/stripe/start?plan=${plan || "monthly"}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("working");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName || undefined,
              last_name: lastName || undefined,
              phone: phone || undefined,
            },
            emailRedirectTo: undefined,
          },
        });
        if (error) throw error;

        // Try to sign in immediately (if email confirmation is off)
        let uid = data.user?.id ?? null;
        const signIn = await supabase.auth.signInWithPassword({ email, password });
        uid = signIn.data?.user?.id ?? uid;

        if (!uid) {
          setError("Check your email to confirm your account, then return to continue.");
          setLoading("idle");
          return;
        }

        await upsertProfile({
          id: uid,
          email,
          first_name: firstName || null,
          last_name: lastName || null,
          phone: phone || null,
        });

        if (plan === "monthly" || plan === "annual") {
          await goToStripe(uid);
          return;
        }

        window.location.href = nextUrl;
        return;
      }

      // Sign in
      const { data: signinData, error: signinErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signinErr) throw signinErr;

      const uid = signinData.user?.id as string;

      await upsertProfile({
        id: uid,
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
      });

      if (plan === "monthly" || plan === "annual") {
        await goToStripe(uid);
        return;
      }
      window.location.href = nextUrl;
    } catch (e: any) {
      setError(e?.message || "Authentication failed");
      setLoading("idle");
    }
  }

  // If already signed in, jump to target
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        const j = await r.json();
        if (j?.user?.id) {
          if (plan === "monthly" || plan === "annual") {
            await goToStripe(j.user.id);
          } else {
            window.location.href = nextUrl;
          }
        }
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white text-black p-6 shadow">
        <div className="flex gap-6 mb-5 border-b">
          <button
            className={`pb-2 font-semibold ${mode === "signup" ? "border-b-2 border-black" : "text-gray-500"}`}
            onClick={() => setMode("signup")}
          >
            Create Account
          </button>
          <button
            className={`pb-2 font-semibold ${mode === "signin" ? "border-b-2 border-black" : "text-gray-500"}`}
            onClick={() => setMode("signin")}
          >
            Sign In
          </button>
        </div>

        {plan && (
          <div className="mb-4 text-sm text-gray-700">
            You’re checking out the <strong>{plan}</strong> plan. Complete {mode === "signup" ? "signup" : "sign in"} to continue to Stripe.
          </div>
        )}

        {error && (
          <div className="mb-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white"
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading === "working"}
            className="w-full rounded-lg bg-yellow-500 text-black font-semibold py-2 hover:bg-yellow-400 disabled:opacity-60"
          >
            {loading === "working" ? (mode === "signup" ? "Creating…" : "Signing in…") : (mode === "signup" ? "Create Account" : "Sign In")}
          </button>
        </form>
      </div>
    </div>
  );
}
