"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  subscription_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default function AdminPage() {
  const [me, setMe] = useState<any>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState<Row[]>([]);
  const [cronMsg, setCronMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/whoami", { cache: "no-store" });
        const j = await r.json();
        setMe(j);
      } catch {}
    })();
  }, []);

  async function loadUsers() {
    setErr(null);
    setLoadingUsers(true);
    try {
      const r = await fetch("/api/admin/users");
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed");
      setUsers(j.rows || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function runCron() {
    setErr(null);
    setCronMsg("Running…");
    try {
      const r = await fetch("/api/admin/cron", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Cron failed");
      setCronMsg(j.ok ? "Cron executed successfully." : "Cron returned not-ok.");
    } catch (e: any) {
      setCronMsg(null);
      setErr(e?.message || "Cron error");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <a href="/nfl" className="rounded-xl border border-gray-800 p-4 bg-black hover:bg-gray-900">
          <div className="text-xl font-semibold">NFL</div>
          <div className="text-gray-400 text-sm">Open predictions</div>
        </a>
        <a href="/nba" className="rounded-xl border border-gray-800 p-4 bg-black hover:bg-gray-900">
          <div className="text-xl font-semibold">NBA</div>
          <div className="text-gray-400 text-sm">Open predictions</div>
        </a>
        <a href="/ncaaf" className="rounded-xl border border-gray-800 p-4 bg-black hover:bg-gray-900">
          <div className="text-xl font-semibold">NCAAF</div>
          <div className="text-gray-400 text-sm">Open predictions</div>
        </a>
        <a href="/ncaab" className="rounded-xl border border-gray-800 p-4 bg-black hover:bg-gray-900">
          <div className="text-xl font-semibold">NCAAB</div>
          <div className="text-gray-400 text-sm">Open predictions</div>
        </a>
        <a href="/mlb" className="rounded-xl border border-gray-800 p-4 bg-black hover:bg-gray-900">
          <div className="text-xl font-semibold">MLB</div>
          <div className="text-gray-400 text-sm">Open predictions</div>
        </a>
        <a href="/nhl" className="rounded-xl border border-gray-800 p-4 bg-black hover:bg-gray-900">
          <div className="text-xl font-semibold">NHL</div>
          <div className="text-gray-400 text-sm">Open predictions</div>
        </a>
        <a href="/wnba" className="rounded-xl border border-gray-800 p-4 bg-black hover:bg-gray-900">
          <div className="text-xl font-semibold">WNBA</div>
          <div className="text-gray-400 text-sm">Open predictions</div>
        </a>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-black p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xl font-semibold">Operations</div>
            <div className="text-gray-400 text-sm">Run background jobs and checks</div>
          </div>
          <div className="flex gap-3">
            <button onClick={runCron} className="px-3 py-2 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400">
              Run Daily Predictions Now
            </button>
          </div>
        </div>
        {cronMsg && <div className="text-sm text-green-400">{cronMsg}</div>}
      </div>

      <div className="rounded-2xl border border-gray-800 bg-black p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xl font-semibold">Users</div>
            <div className="text-gray-400 text-sm">Latest 250</div>
          </div>
          <button onClick={loadUsers} className="px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600">
            {loadingUsers ? "Loading…" : "Refresh"}
          </button>
        </div>

        {err && <div className="mb-3 text-sm text-red-400">{err}</div>}

        <div className="overflow-auto rounded-lg border border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900 text-gray-300">
              <tr>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Phone</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-800">
                  <td className="px-3 py-2">{u.email || "-"}</td>
                  <td className="px-3 py-2">{[u.first_name, u.last_name].filter(Boolean).join(" ") || "-"}</td>
                  <td className="px-3 py-2">{u.phone || "-"}</td>
                  <td className="px-3 py-2">{u.subscription_status || "none"}</td>
                  <td className="px-3 py-2">{u.created_at ? new Date(u.created_at).toLocaleString() : "-"}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={5}>No data loaded yet. Click Refresh.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {me?.isAdmin === false && (
        <div className="mt-6 text-sm text-red-400">
          You are not recognized as admin. Make sure your email is set to is_admin=true in profiles.
        </div>
      )}
    </div>
  );
}
