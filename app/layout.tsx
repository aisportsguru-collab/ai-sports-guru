import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "AI Sports Guru",
  description: "Odds + AI predictions",
};

const leagues = ["NFL","NBA","MLB","NHL","NCAAF","NCAAB","WNBA"] as const;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-black text-white">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-black/40">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-wide">
              AI Sports Guru
            </Link>
            <div className="flex flex-wrap gap-2">
              {leagues.map((l) => (
                <Link
                  key={l}
                  href={`/sports/${l.toLowerCase()}`}
                  className="rounded-full px-3 py-1 text-sm text-white/80 hover:text-white hover:bg-white/10 transition"
                >
                  {l}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
