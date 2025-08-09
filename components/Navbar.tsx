"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const sportsPages = [
  { name: "NBA", href: "/nba" },
  { name: "NFL", href: "/nfl" },
  { name: "MLB", href: "/mlb" },
  { name: "NHL", href: "/nhl" },
  { name: "NCAAF", href: "/ncaaf" },
  { name: "NCAAB", href: "/ncaab" },
  { name: "WNBA", href: "/wnba" },
];

const ADMIN_EMAIL = "smithajordan1992@gmail.com";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false); // ← NEW

  useEffect(() => {
    const checkSessionAndAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setIsLoggedIn(true);
        setUserEmail(session.user.email ?? null);

        // 👇 Check if user has active subscription or trial
        const { data: profile } = await supabase
          .from("profiles")
          .select("has_access") // <-- This column must exist (adjust as needed)
          .eq("id", session.user.id)
          .single();

        setHasAccess(profile?.has_access || false);
      } else {
        setIsLoggedIn(false);
        setUserEmail(null);
        setHasAccess(false);
      }
    };

    checkSessionAndAccess();
  }, [supabase]);

  if (pathname === "/sign-in" || pathname === "/sign-up") {
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm z-50 sticky top-0">
      <Link href="/" className="text-xl font-bold text-blue-700">
        AI Sports Guru
      </Link>

      <div className="flex gap-4 items-center">
        {isLoggedIn && (
          <>
            {hasAccess && (
              <div className="relative group">
                <button className="text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none">
                  Sports ▾
                </button>
                <div className="absolute hidden group-hover:block bg-white shadow-md rounded mt-2 py-2 z-50">
                  {sportsPages.map((sport) => (
                    <Link
                      key={sport.name}
                      href={sport.href}
                      className="block px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
                    >
                      {sport.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/pricing"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Pricing
            </Link>

            {userEmail === ADMIN_EMAIL && (
              <Link
                href="/admin"
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Admin
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Log out
            </button>
          </>
        )}

        {!isLoggedIn && (
          <>
            <Link
              href="/sign-in"
              className="btn btn-secondary text-sm px-4 py-2"
            >
              Sign in
            </Link>
            <Link href="/sign-up" className="btn btn-primary text-sm px-4 py-2">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
