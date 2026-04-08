import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/db";
import crypto from "node:crypto";

export const runtime = "nodejs";

const OTP_COOKIE = "ribriz_otp_state";

interface OtpState {
  email: string;
  otp_hash: string;
  type: "signup" | "login";
  name: string;
  password?: string;
  exp: number;
}

function verifyState(token: string, secret: string): OtpState | null {
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return null;
    const data = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    const expectedSig = crypto.createHmac("sha256", secret).update(data).digest("hex");
    if (sig.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as OtpState;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { otp } = await request.json() as { otp: string };

  if (!otp || otp.length !== 6) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  // Read cookie from request headers
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${OTP_COOKIE}=`));

  if (!cookieMatch) {
    return NextResponse.json({ error: "Session expired. Please request a new code." }, { status: 400 });
  }

  const stateToken = decodeURIComponent(cookieMatch.slice(OTP_COOKIE.length + 1));
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const state = verifyState(stateToken, secret);

  if (!state) {
    return NextResponse.json({ error: "Session expired. Please request a new code." }, { status: 400 });
  }

  // Verify OTP matches
  const submittedHash = crypto.createHmac("sha256", secret).update(otp).digest("hex");
  if (
    submittedHash.length !== state.otp_hash.length ||
    !crypto.timingSafeEqual(Buffer.from(submittedHash, "hex"), Buffer.from(state.otp_hash, "hex"))
  ) {
    return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
  }

  const admin = createAdminClient();
  const supabase = await createClient();
  let userId: string;

  try {
    if (state.type === "signup") {
      // Create user with email already confirmed — no magic link needed
      const { data, error } = await admin.auth.admin.createUser({
        email: state.email,
        password: state.password!,
        email_confirm: true,
        user_metadata: { full_name: state.name },
      });

      if (error) {
        // User may already exist (e.g. re-signup attempt)
        if (error.message.toLowerCase().includes("already")) {
          return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      userId = data.user.id;

      // Sign in with their credentials to establish a session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: state.email,
        password: state.password!,
      });
      if (signInError) {
        return NextResponse.json({ error: "Account created but sign-in failed. Please log in." }, { status: 400 });
      }
    } else {
      // Login: generate a magic link token and exchange it for a session
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: state.email,
      });

      if (linkError) {
        return NextResponse.json({ error: "No account found with this email." }, { status: 400 });
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: linkData.properties.hashed_token,
        type: "magiclink",
      });

      if (verifyError) {
        return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
      }

      const { data: { user } } = await supabase.auth.getUser();
      userId = user!.id;
    }

    // Sync user to Prisma
    try {
      const existing = await prisma.user.findUnique({ where: { id: userId } });
      if (!existing) {
        const name = state.name || state.email.split("@")[0];
        await prisma.user.create({
          data: { id: userId, email: state.email, name },
        });
      }
    } catch (e) {
      console.error("User sync failed:", e);
    }

    // Welcome email for new signups (fire-and-forget)
    if (state.type === "signup" && state.name) {
      const origin = new URL(request.url).origin;
      fetch(`${origin}/api/email/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email, name: state.name }),
      }).catch(() => {});
    }

  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  const redirect = state.type === "signup" ? "/onboarding" : "/dashboard";
  const response = NextResponse.json({ redirect });
  response.cookies.set(OTP_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
