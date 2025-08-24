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
  { href: "/fades", label: "Fades" }, // ✅ Added new nav item
  { href: "/pricing", label: "Pricing" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[#232632] bg-[#0B0B0B]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-[#F5C847]">
          AI Sports Guru
        </Link>
        <nav className="flex gap-4">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium px-3 py-1.5 rounded-md ${
                  active
                    ? "bg-[#121317] text-white border border-[#F5C847]"
                    : "text-[#A6A6A6] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
