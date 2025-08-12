"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supaBrowser } from "../../lib/supa-browser";

export default function SignUpPage() {
  const router = useRouter();
  const supa = supaBrowser();

  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [phone,     setPhone]     = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [marketing, setMarketing] = useState(false);

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [message,   setMessage]   = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const phoneDigits = phone.replace(/\D/g, "");

      // 1) Create auth user (email confirmation will still be required)
      const { data, error: signErr } = await supa.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account`,
          data: {
            first_name: firstName || null,
            last_name: lastName || null,
            phone: phoneDigits || null,
            marketing_opt_in: marketing,
          },
        },
      });

      if (signErr) {
        setError(signErr.message);
        setLoading(false);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError("Could not create user. Please try again.");
        setLoading(false);
        return;
      }

      // 2) Briefly inform about verification, then go straight to Stripe
      setMessage("Check your email to verify — redirecting to secure checkout…");

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, trialDays: 7 }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to start checkout");
      }

      const { url } = await res.json();
      if (!url) throw new Error("Checkout URL missing");

      window.location.href = url; // to Stripe Checkout
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Create your account</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">First name</label>
            <input className="w-full bg-black border border-gray-700 rounded px-3 py-2"
              value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Last name</label>
            <input className="w-full bg-black border border-gray-700 rounded px-3 py-2"
              value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Phone</label>
          <input className="w-full bg-black border border-gray-700 rounded px-3 py-2"
            inputMode="tel" placeholder="(555) 123-4567"
            value={phone} onChange={(e) => setPhone(e.target.value)} />
          <p className="text-xs text-gray-500 mt-1">Optional. Stored as digits only.</p>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Email</label>
          <input className="w-full bg-black border border-gray-700 rounded px-3 py-2"
            type="email" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Password</label>
          <input className="w-full bg-black border border-gray-700 rounded px-3 py-2"
            type="password" autoComplete="new-password" minLength={8}
            value={password} onChange={(e) => setPassword(e.target.value)} required />
          <p className="text-xs text-gray-500 mt-1">Minimum 8 characters.</p>
        </div>

        <label className="flex items-start gap-3">
          <input type="checkbox" checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)} className="mt-1" />
          <span className="text-sm text-gray-300">
            I’d like product updates and promotions by email/text. You can opt out any time.
          </span>
        </label>

        {error && <div className="border border-red-700 text-red-200 rounded p-3 text-sm">{error}</div>}
        {message && <div className="border border-green-700 text-green-200 rounded p-3 text-sm">{message}</div>}

        <button type="submit" disabled={loading}
          className="bg-yellow-400 text-black font-semibold px-4 py-2 rounded hover:bg-yellow-500 transition w-full disabled:opacity-60">
          {loading ? "Creating account…" : "Sign Up & Start Free Trial"}
        </button>
      </form>

      <div className="text-sm text-gray-400 mt-4">
        Already have an account?{" "}
        <a className="text-yellow-400 hover:underline" href="/sign-in">Sign in</a>
      </div>
    </div>
  );
}
