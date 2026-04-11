import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

// Routes that bypass auth entirely (each has its own auth mechanism)
const PUBLIC_API_PREFIXES = [
  "/api/auth/",               // OTP send/verify, signout
  "/api/subscription/webhook", // Razorpay webhook (signature-verified)
  "/api/cron/",               // Cron jobs (CRON_SECRET-verified)
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── API routes: return 401 instead of redirecting ─────────────
  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return NextResponse.next();
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  }

  // ── Page routes: Supabase helper handles redirects + session refresh ──
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
