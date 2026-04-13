import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require authentication
  const isAuthPage =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/signup";
  const isPublicPage =
    request.nextUrl.pathname === "/" ||
    isAuthPage ||
    request.nextUrl.pathname.startsWith("/api/auth/") ||
    request.nextUrl.pathname.startsWith("/auth/") ||
    request.nextUrl.pathname === "/privacy" ||
    request.nextUrl.pathname === "/terms" ||
    request.nextUrl.pathname === "/refund" ||
    request.nextUrl.pathname === "/cookies";

  // Only protect UI routes — API routes handle their own auth in the route handler
  const isAdminRoute =
    request.nextUrl.pathname.startsWith("/admin") &&
    !request.nextUrl.pathname.startsWith("/api/");

  // Protected routes: redirect to /login if not authenticated
  if (!user && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Admin routes: only allow users with app_metadata.role === "admin"
  if (isAdminRoute && user?.app_metadata?.role !== "admin") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // If logged in and trying to visit auth pages, redirect to dashboard
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
