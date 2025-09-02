import Link from "next/link";
import { useRouter } from "next/router";

const leagues = [
  { href: "/nfl", label: "NFL" },
  { href: "/nba", label: "NBA" },
  { href: "/mlb", label: "MLB" },
  { href: "/nhl", label: "NHL" },
  { href: "/ncaaf", label: "NCAAF" },
  { href: "/ncaab", label: "NCAAB" },
  { href: "/wnba", label: "WNBA" },
];

export default function Nav() {
  const { pathname } = useRouter();
  const showLeagues = pathname !== "/";

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-900 bg-black/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold">
          <span className="text-yellow-400">AI</span> Sports Guru
        </Link>

        <nav className="hidden gap-4 md:flex">
          {showLeagues &&
            leagues.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-900"
              >
                {l.label}
              </Link>
            ))}
          <Link href="/fades" className="rounded-lg px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-900">
            Fades
          </Link>
          <Link href="/pricing" className="rounded-lg px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-900">
            Pricing
          </Link>
        </nav>
      </div>
    </header>
  );
}
