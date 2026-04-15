import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";

export const runtime = "nodejs";

const WA_COOKIE = "ribriz_wa_otp_state";
const WA_VERIFIED_COOKIE = "ribriz_wa_verified";

interface WaOtpState {
  phone: string;
  otp_hash: string;
  firstName: string;
  lastName: string;
  dob: string;
  city: string;
  education: string;
  exp: number;
}

function verifyState(token: string, secret: string): WaOtpState | null {
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return null;
    const data = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    const expectedSig = crypto.createHmac("sha256", secret).update(data).digest("hex");
    if (sig.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as WaOtpState;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function signState(payload: object, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return `${data}.${sig}`;
}

export async function POST(request: Request) {
  try {
    const { otp } = (await request.json()) as { otp: string };

    if (!otp || otp.length !== 6) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const stateToken = cookieStore.get(WA_COOKIE)?.value;

    if (!stateToken) {
      return NextResponse.json(
        { error: "Session expired. Please request a new code." },
        { status: 400 }
      );
    }

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
    }

    const state = verifyState(stateToken, secret);
    if (!state) {
      return NextResponse.json(
        { error: "Session expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Verify OTP (timing-safe)
    const submittedHash = crypto.createHmac("sha256", secret).update(otp).digest("hex");
    if (
      submittedHash.length !== state.otp_hash.length ||
      !crypto.timingSafeEqual(Buffer.from(submittedHash, "hex"), Buffer.from(state.otp_hash, "hex"))
    ) {
      return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
    }

    // Store verified registration data (without otp_hash) in a signed cookie
    const verifiedToken = signState(
      {
        phone: state.phone,
        firstName: state.firstName,
        lastName: state.lastName,
        dob: state.dob,
        city: state.city,
        education: state.education,
        exp: Date.now() + 30 * 60 * 1000, // 30 min to complete email verification
      },
      secret
    );

    const response = NextResponse.json({ success: true });
    response.cookies.set(WA_VERIFIED_COOKIE, verifiedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1800,
      path: "/",
    });
    // Clear the OTP cookie
    response.cookies.set(WA_COOKIE, "", { maxAge: 0, path: "/" });
    return response;
  } catch (err) {
    console.error("WhatsApp OTP verify error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
