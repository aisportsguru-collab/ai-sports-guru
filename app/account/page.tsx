"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type SubStatus = "active" | "trialing" | "none" | "error";

export default function AccountPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<SubStatus>("none");
  const [err, setErr] = useState<string | null>(null);
  const [diag, setDiag] = useState<string>("start");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);
      setDiag("start");
      try {
        // 1) Try server (cookie-based)
        const r = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });
        const j = await r.json().catch(() => ({} as any));

        let uid: string | null = null;
        let mail: string | null = null;

        if (j?.user?.id) {
          setDiag("server");
          uid = j.user.id;
          mail = j.user.email ?? null;
        } else {
          // 2) Fallback to client Supabase
          const { data } = await supabase.auth.getUser();
          if (data?.user?.id) {
            setDiag("client-fallback");
            uid = data.user.id;
            mail = data.user.email ?? null;
          } else {
            setDiag("no-session");
          }
        }

        if (!uid) {
          if (!cancelled) {
            setUserId(null);
            setEmail(null);
            setStatus("none");
          }
          return;
        }

        if (!cancelled) {
          setUserId(uid);
          setEmail(mail);
        }

        // 3) With a user id, check subscription
        const r2 = await fetch("/api/check-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId: uid }),
        });

        const j2 = await r2.json().catch(() => ({}));
        const st = (j2?.status as SubStatus) || "none";
        if (!cancelled) setStatus(st);
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load account");
          setStatus("error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openPortal() {
    try {
      setErr(null);
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      const j = await res.json();
      if (!res.ok || !j?.url) throw new Error(j?.error || "Could not open portal");
      window.location.href = j.url;
    } catch (e: any) {
      setErr(e?.message || "Portal error");
    }
  }

  if (loading) {
    return <div className="grid place-items-center h-[60vh]">Loading account…</div>;
  }

  if (!userId) {
    return (
      <div className="grid place-items-center h-[60vh]">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">You are not logged in</div>
          <div className="text-xs text-gray-400 mb-4">Diag: {diag}</div>
          <a href="/login" className="px-4 py-2 rounded-lg bg-yellow-500 text-black">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow text-black">
      <h1 className="text-3xl font-bold mb-4">Account</h1>
      <p><strong>Email:</strong> {email}</p>
      <p className="mt-2"><strong>Subscription Status:</strong> {status}</p>
      <p className="mt-1 text-xs text-gray-600">Diag: {diag}</p>

      {(status === "active" || status === "trialing") ? (
        <button onClick={openPortal} className="mt-4 px-4 py-2 rounded-lg bg-gray-900 text-white">
          Manage Billing
        </button>
      ) : (
        <a href="/pricing" className="mt-4 inline-block px-4 py-2 rounded-lg bg-yellow-500 text-black">
          Start Free Trial
        </a>
      )}

      {err && <div className="mt-4 text-sm text-red-700">{err}</div>}
    </div>
  );
}
