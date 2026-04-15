import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // On Vercel, origin can be an internal URL — use x-forwarded-host for the real domain
  const forwardedHost = request.headers.get("x-forwarded-host");
  const baseUrl =
    process.env.NODE_ENV === "development" || !forwardedHost
      ? origin
      : `https://${forwardedHost}`;

  if (code) {
    const cookieStore = await cookies();

    // Build the redirect response first so we can attach session cookies to it
    const redirectResponse = NextResponse.redirect(`${baseUrl}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // Set on both the cookie store and the redirect response
            // so the session survives the redirect
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              redirectResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Sync user to Prisma DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const existing = await prisma.user.findUnique({ where: { id: user.id } });
        if (!existing) {
          const name =
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Student";
          await prisma.user.create({
            data: { id: user.id, email: user.email!, name },
          }).catch((e) => console.error("User create failed:", e));
        }
      }
      return redirectResponse;
    }

    console.error("OAuth callback error:", error.message);
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth`);
}
