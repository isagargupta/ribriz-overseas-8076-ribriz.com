import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/db";
import { sendCapiEventServer } from "@/lib/capi";
import crypto from "node:crypto";

export const runtime = "nodejs";

const OTP_COOKIE = "ribriz_otp_state";
const WA_VERIFIED_COOKIE = "ribriz_wa_verified";

interface OtpState {
  email: string;
  otp_hash: string;
  type: "signup" | "login";
  name: string;
  // Registration fields (signup only)
  phone?: string;
  dob?: string;
  city?: string;
  education?: string;
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
  try {
    const { otp } = (await request.json()) as { otp: string };

    if (!otp || otp.length !== 6) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const stateToken = cookieStore.get(OTP_COOKIE)?.value;

    if (!stateToken) {
      return NextResponse.json({ error: "Session expired. Please request a new code." }, { status: 400 });
    }

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!secret) {
      console.error("OTP verify: missing secret env var");
      return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
    }

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

    if (state.type === "signup") {
      // Create passwordless account — createUser fails if email already exists
      const { data, error } = await admin.auth.admin.createUser({
        email: state.email,
        email_confirm: true,
        user_metadata: { full_name: state.name },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          return NextResponse.json(
            { error: "An account with this email already exists. Please sign in." },
            { status: 400 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      userId = data.user.id;
    }

    // Establish session via magic link exchange (works for both flows)
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: state.email,
    });

    if (linkError) {
      return NextResponse.json({ error: "Failed to create session. Please try again." }, { status: 500 });
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyError) {
      return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
    }

    // For login, get userId from the established session
    if (state.type === "login") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
      }
      userId = user.id;
    }

    // Sync user to Prisma (with registration fields for new signups)
    try {
      const existing = await prisma.user.findUnique({ where: { id: userId! } });
      if (!existing) {
        const name = state.name || state.email.split("@")[0];
        await prisma.user.create({
          data: {
            id: userId!,
            email: state.email,
            name,
            ...(state.phone && { phone: state.phone }),
            ...(state.dob && { dob: new Date(state.dob) }),
            ...(state.city && { city: state.city }),
          },
        });
      }
    } catch (e) {
      console.error("User sync failed:", e);
    }

    // Welcome email + CompleteRegistration event for new signups (fire-and-forget)
    if (state.type === "signup" && state.name) {
      const origin = new URL(request.url).origin;
      fetch(`${origin}/api/email/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email, name: state.name }),
      }).catch(() => {});

      sendCapiEventServer({
        event_name: "CompleteRegistration",
        event_id: `reg-${userId!}`,
        email: state.email,
      }).catch(() => {});
    }

    const redirect = state.type === "signup" ? "/onboarding" : "/dashboard";
    const response = NextResponse.json({ redirect });
    response.cookies.set(OTP_COOKIE, "", { maxAge: 0, path: "/" });
    // Clear WhatsApp verified cookie after successful signup
    if (state.type === "signup") {
      response.cookies.set(WA_VERIFIED_COOKIE, "", { maxAge: 0, path: "/" });
    }
    return response;
  } catch (err) {
    console.error("OTP verify error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
