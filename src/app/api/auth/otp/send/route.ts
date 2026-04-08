import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { otpEmail } from "@/lib/email/templates";
import crypto from "node:crypto";

export const runtime = "nodejs";

const SECRET = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OTP_COOKIE = "ribriz_otp_state";

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

function signState(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET()).update(data).digest("hex");
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

  try {
    const admin = createAdminClient();
    let hashedToken: string | undefined;
    let verificationToken: string;

    if (type === "signup") {
      if (!password) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }
      const { data, error } = await admin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: { data: { full_name: name || "" } },
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      hashedToken = data.properties?.hashed_token;
      verificationToken = data.properties?.hashed_token ?? "";
    } else {
      const { data, error } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (error) {
        // Don't reveal if user doesn't exist — still show OTP screen
        return NextResponse.json({ success: true });
      }
      hashedToken = data.properties?.hashed_token;
      verificationToken = data.properties?.hashed_token ?? "";
    }

    if (!hashedToken) {
      return NextResponse.json({ error: "Failed to generate verification token" }, { status: 500 });
    }

    const otp = generateOtp();
    const otpHash = crypto.createHmac("sha256", SECRET()).update(otp).digest("hex");

    const state = signState({
      email,
      otp_hash: otpHash,
      hashed_token: verificationToken,
      verification_type: type === "signup" ? "signup" : "magiclink",
      name: name || "",
      exp: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    const template = otpEmail(otp, type);
    await sendEmail({ to: email, subject: template.subject, html: template.html });

    const response = NextResponse.json({ success: true });
    response.cookies.set(OTP_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("OTP send error:", err);
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
  }
}
