import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AI Sports Guru",
  description: "Odds + AI predictions",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <header className="border-b border-white/10">
          <nav className="mx-auto max-w-6xl px-4 py-4 flex gap-4 text-sm">
            <a className="font-semibold" href="/">AI Sports Guru</a>
            <div className="opacity-60">•</div>
            <a href="/nfl">NFL</a>
            <a href="/nba">NBA</a>
            <a href="/mlb">MLB</a>
            <a href="/nhl">NHL</a>
            <a href="/ncaaf">NCAAF</a>
            <a href="/ncaab">NCAAB</a>
            <a href="/wnba">WNBA</a>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
