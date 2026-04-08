import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import crypto from "node:crypto";

export const runtime = "nodejs";

const SECRET = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OTP_COOKIE = "ribriz_otp_state";

interface OtpState {
  email: string;
  otp_hash: string;
  hashed_token: string;
  verification_type: "signup" | "magiclink";
  name: string;
  exp: number;
}

function verifyState(token: string): OtpState | null {
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return null;
    const data = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    const expectedSig = crypto.createHmac("sha256", SECRET()).update(data).digest("hex");
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

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${OTP_COOKIE}=`));

  if (!cookieMatch) {
    return NextResponse.json({ error: "Session expired. Please request a new code." }, { status: 400 });
  }

  const stateToken = cookieMatch.slice(OTP_COOKIE.length + 1);
  const state = verifyState(stateToken);

  if (!state) {
    return NextResponse.json({ error: "Session expired. Please request a new code." }, { status: 400 });
  }

  // Verify OTP
  const submittedHash = crypto.createHmac("sha256", SECRET()).update(otp).digest("hex");
  if (
    submittedHash.length !== state.otp_hash.length ||
    !crypto.timingSafeEqual(Buffer.from(submittedHash, "hex"), Buffer.from(state.otp_hash, "hex"))
  ) {
    return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
  }

  // Exchange hashed_token for a session
  const supabase = await createClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
    token_hash: state.hashed_token,
    type: state.verification_type,
  });

  if (sessionError || !sessionData.user) {
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
  }

  // Sync user to Prisma
  const user = sessionData.user;
  try {
    const existing = await prisma.user.findUnique({ where: { id: user.id } });
    if (!existing) {
      const name = state.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
      await prisma.user.create({
        data: { id: user.id, email: user.email!, name },
      });
    }
  } catch (e) {
    console.error("User sync failed:", e);
  }

  const redirect = state.verification_type === "signup" ? "/onboarding" : "/dashboard";

  // If signup, trigger welcome email (fire-and-forget via absolute URL)
  if (state.verification_type === "signup" && state.name) {
    const origin = new URL(request.url).origin;
    fetch(`${origin}/api/email/welcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: state.email, name: state.name }),
    }).catch((e) => console.error("Welcome email failed:", e));
  }

  const response = NextResponse.json({ redirect });
  // Clear the OTP state cookie
  response.cookies.set(OTP_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
