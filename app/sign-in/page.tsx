"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supaBrowser } from "../lib/supa-browser";

export default function SignInPage() {
  const supabase = useMemo(() => supaBrowser(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already signed in, bounce to /account
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancel && data.session) {
        router.replace("/account");
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) router.replace("/account");
    });
    return () => {
      cancel = true;
      sub?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      // success — go straight to account
      router.replace("/account");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Unexpected error signing in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold mb-6">Sign In</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            autoComplete="email"
            className="w-full rounded border border-gray-700 bg-black px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            className="w-full rounded border border-gray-700 bg-black px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {errorMsg && (
          <p className="text-red-400 text-sm">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-400 text-black font-semibold rounded px-4 py-2 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-sm">
        New here?{" "}
        <Link href="/sign-up" className="text-yellow-400 underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
