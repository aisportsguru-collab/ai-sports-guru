"use client";

import React from "react";
import Link from "next/link";

export default function PaywallBlur({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black/70 border border-yellow-400 rounded-xl p-4 text-center max-w-md">
          <div className="text-yellow-400 font-semibold mb-2">Unlock full picks</div>
          <p className="text-sm text-gray-200 mb-3">
            You’re on the free plan. Upgrade to see model picks, confidence, and rationales.
          </p>
          <Link href="/pricing">
            <button className="bg-yellow-400 text-black font-bold px-4 py-2 rounded hover:bg-yellow-500 transition">
              Upgrade to Pro
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
