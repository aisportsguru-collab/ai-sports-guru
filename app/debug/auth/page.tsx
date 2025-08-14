"use client";

import React, { useEffect, useState } from "react";
import { supaBrowser } from "../../lib/supa-browser";

export default function AuthDebugPage() {
  const supa = supaBrowser();
  const [state, setState] = useState<any>({});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");

  async function refresh() {
    const out: any = {};
    try {
      out.env = {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || "(missing)",
        anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "present" : "missing",
      };
      out.localStorageKeys = Object.keys(window.localStorage);

      const sess = await supa.auth.getSession();
      out.getSession = sess;

      const usr = await supa.auth.getUser();
      out.getUser = usr;
    } catch (e: any) {
      out.error = e?.message || String(e);
    }
    setState(out);
  }

  useEffect(() => {
    refresh();
    const { data: sub } = supa.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, [supa]);

  async function doSignUp(e: React.FormEvent) {
    e.preventDefault();
    const res = await supa.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: first, last_name: last },
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });
    setState((s: any) => ({ ...s, signUpResult: res }));
    await refresh();
  }

  async function doSignIn(e: React.FormEvent) {
    e.preventDefault();
    const res = await supa.auth.signInWithPassword({ email, password });
    setState((s: any) => ({ ...s, signInResult: res }));
    await refresh();
  }

  async function doSignOut() {
    await supa.auth.signOut();
    await refresh();
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Auth Debug</h1>
      <div className="text-sm text-gray-300">Use these forms to test auth. Results show below.</div>

      <div className="flex gap-4 flex-wrap">
        <form onSubmit={doSignUp} className="border rounded p-3 space-y-2 w-[360px]">
          <div className="font-semibold">Sign Up (password)</div>
          <input className="w-full bg-black border border-gray-700 rounded px-2 py-1" placeholder="First name" value={first} onChange={e=>setFirst(e.target.value)} />
          <input className="w-full bg-black border border-gray-700 rounded px-2 py-1" placeholder="Last name" value={last} onChange={e=>setLast(e.target.value)} />
          <input className="w-full bg-black border border-gray-700 rounded px-2 py-1" type="email" placeholder="email@example.com" required value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full bg-black border border-gray-700 rounded px-2 py-1" type="password" placeholder="password (min 6/8)" required value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="bg-yellow-400 text-black px-3 py-1 rounded">Sign Up</button>
        </form>

        <form onSubmit={doSignIn} className="border rounded p-3 space-y-2 w-[360px]">
          <div className="font-semibold">Sign In (password)</div>
          <input className="w-full bg-black border border-gray-700 rounded px-2 py-1" type="email" placeholder="email@example.com" required value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full bg-black border border-gray-700 rounded px-2 py-1" type="password" placeholder="password" required value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="bg-yellow-400 text-black px-3 py-1 rounded">Sign In</button>
        </form>

        <div className="border rounded p-3 space-y-2 w-[200px]">
          <div className="font-semibold">Session</div>
          <button onClick={refresh} className="bg-yellow-400 text-black px-3 py-1 rounded">Refresh</button>
          <button onClick={doSignOut} className="bg-gray-700 px-3 py-1 rounded">Sign Out</button>
        </div>
      </div>

      <pre className="text-xs bg-black/40 border border-gray-800 rounded p-3 overflow-x-auto">
{JSON.stringify(state, null, 2)}
      </pre>

      <div className="text-sm">
        <a className="text-yellow-400 underline" href="/sign-in">Go to Sign In</a>{" "}
        • <a className="text-yellow-400 underline" href="/account">Go to Account</a>
      </div>
    </div>
  );
}
