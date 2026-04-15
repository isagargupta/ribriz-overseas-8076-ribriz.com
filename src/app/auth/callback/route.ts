import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // On Vercel, origin can be an internal URL — use x-forwarded-host for the public domain
  const forwardedHost = (request as Request & { headers: Headers }).headers.get("x-forwarded-host");
  const baseUrl =
    process.env.NODE_ENV === "development" || !forwardedHost
      ? origin
      : `https://${forwardedHost}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Sync user to Prisma DB (same as /api/user/sync but inline to avoid fetch loop)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const existing = await prisma.user.findUnique({ where: { id: user.id } });
        if (!existing) {
          const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
          await prisma.user.create({
            data: { id: user.id, email: user.email!, name },
          }).catch((e) => console.error("User create failed:", e));
        }
      }
      return NextResponse.redirect(`${baseUrl}${next}`);
    } else {
      console.error("OAuth callback error:", error.message);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth`);
}
