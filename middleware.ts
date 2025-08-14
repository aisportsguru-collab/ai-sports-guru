import { NextResponse, NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Read session cookie (does not create one)
  const supabase = createMiddlewareClient({ req, res });
  const { data } = await supabase.auth.getUser();

  // If not logged in, bounce to login carrying return URL
  if (!data?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("mode", "signin");
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Ask our own API if the user is admin
  const who = await fetch(new URL("/api/admin/whoami", req.url), {
    headers: { cookie: req.headers.get("cookie") || "" },
  }).then(r => r.json()).catch(() => ({ isAdmin: false }));

  if (!who?.isAdmin) {
    return NextResponse.redirect(new URL("/account", req.url));
  }

  return res;
}
