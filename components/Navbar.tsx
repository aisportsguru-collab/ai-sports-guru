"use client";

import Link from "next/link";
import { useUser } from "@supabase/auth-helpers-react";

export default function Navbar() {
  const user = useUser();

  return (
    <nav className="w-full px-6 py-4 flex justify-between items-center bg-black text-white border-b border-gray-800">
      <Link href="/" className="text-xl font-bold text-yellow-400">
        AI Sports Guru
      </Link>

      <div className="flex gap-6 items-center">
        {/* Only show Sports menu if user is signed in */}
        {user && (
          <div className="relative group">
            <button className="text-white hover:text-yellow-400">Sports ▾</button>
            <div className="absolute hidden group-hover:block bg-white text-black mt-2 rounded shadow-lg z-50">
              {[
                ["NBA", "/nba"],
                ["NFL", "/nfl"],
                ["MLB", "/mlb"],
                ["NHL", "/nhl"],
                ["NCAAF", "/ncaaf"],
                ["NCAAB", "/ncaab"],
                ["WNBA", "/wnba"],
              ].map(([label, href], i) => (
                <Link
                  key={i}
                  href={href}
                  className="block px-4 py-2 hover:bg-gray-200 whitespace-nowrap"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link href="/pricing" className="hover:text-yellow-400">
          Pricing
        </Link>
        <Link href="/sign-in">
          <button className="bg-yellow-400 text-black font-bold px-4 py-2 rounded hover:bg-yellow-500 transition">
            Sign In
          </button>
        </Link>
      </div>
    </nav>
  );
}
