import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { otpEmail } from "@/lib/email/templates";
import crypto from "node:crypto";

export const runtime = "nodejs";

const OTP_COOKIE = "ribriz_otp_state";

function signState(payload: object, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return `${data}.${sig}`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { email, type, name, password } = body as {
    email: string;
    type: "signup" | "login";
    name?: string;
    password?: string;
  };

  if (!email || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (type === "signup" && !password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const otp = String(crypto.randomInt(100000, 999999));
  const otpHash = crypto.createHmac("sha256", secret).update(otp).digest("hex");

  const state = signState({
    email,
    otp_hash: otpHash,
    type,
    name: name ?? "",
    password: type === "signup" ? password : undefined,
    exp: Date.now() + 10 * 60 * 1000,
  }, secret);

  // Send OTP email via Resend
  try {
    const template = otpEmail(otp, type);
    await sendEmail({ to: email, subject: template.subject, html: template.html });
  } catch (err) {
    console.error("Email send failed:", err);
    return NextResponse.json({ error: "Failed to send verification code. Please try again." }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(OTP_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
