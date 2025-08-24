"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/nfl", label: "NFL" },
  { href: "/nba", label: "NBA" },
  { href: "/mlb", label: "MLB" },
  { href: "/nhl", label: "NHL" },
  { href: "/ncaaf", label: "NCAAF" },
  { href: "/ncaab", label: "NCAAB" },
  { href: "/wnba", label: "WNBA" },
  { href: "/pricing", label: "Pricing" },
];

export default function SiteHeader() {
  const path = usePathname();
  return (
    <div className="sticky top-0 z-50 border-b border-[#232632] bg-[#0B0B0B]/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="text-white font-semibold tracking-wide">
          AI Sports Guru <span className="text-[#F5C847]">•</span>
        </Link>
        <nav className="hidden md:flex items-center gap-4">
          {nav.map((n) => {
            const active = path?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`text-sm ${active ? "text-white" : "text-[#A6A6A6]"} hover:text-white transition`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/login" className="text-sm text-[#A6A6A6] hover:text-white">Log in</Link>
          <Link
            href="/sign-up"
            className="rounded-xl border border-[#F5C847]/30 bg-[#121317] px-3 py-1.5 text-sm font-medium text-white hover:shadow"
          >
            Get Pro
          </Link>
        </div>
      </div>
    </div>
  );
}
