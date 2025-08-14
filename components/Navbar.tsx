"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { supaBrowser } from "../app/lib/supa-browser";

export default function Navbar() {
  const supa = supaBrowser();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const { data } = await supa.auth.getSession();
      if (!mounted) return;
      setSignedIn(!!data.session);
    }
    check();
    const { data: sub } = supa.auth.onAuthStateChange(() => check());
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supa]);

  async function signOut() {
    await supa.auth.signOut();
    window.location.href = "/";
  }

  return (
    <nav className="w-full px-6 py-4 flex justify-between items-center bg-black text-white border-b border-gray-800">
      <Link className="text-xl font-bold text-yellow-400" href="/">AI Sports Guru</Link>

      <div className="flex gap-6 items-center">
        <Link className="hover:text-yellow-400" href="/pricing">Pricing</Link>
        {signedIn ? (
          <>
            <Link className="hover:text-yellow-400" href="/account">Account</Link>
            <button
              onClick={signOut}
              className="bg-gray-800 text-white font-bold px-4 py-2 rounded hover:bg-gray-700 transition"
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link href="/sign-in">
            <button className="bg-yellow-400 text-black font-bold px-4 py-2 rounded hover:bg-yellow-500 transition">
              Sign In
            </button>
          </Link>
        )}
      </div>
    </nav>
  );
}
