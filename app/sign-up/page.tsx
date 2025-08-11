"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";

export default function SignUpPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // After they click the email confirmation, bring them back to sign-in
        emailRedirectTo: `${site}/sign-in`,
      },
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      "Check your email for a confirmation link. Once you confirm, come back here and sign in."
    );
  };

  return (
    <main className="bg-black text-white min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Create your account</h1>

        {message && (
          <div className="mb-4 rounded-lg bg-green-900/30 border border-green-700 p-3 text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700 p-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-lg bg-black border border-gray-700 px-3 py-2 outline-none focus:border-yellow-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-lg bg-black border border-gray-700 px-3 py-2 outline-none focus:border-yellow-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-yellow-400 text-black font-bold px-5 py-3 rounded-xl hover:bg-yellow-500 transition disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-gray-400 mt-4 text-center">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-yellow-400 underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
