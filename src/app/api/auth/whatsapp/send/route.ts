import { NextResponse } from "next/server";
import { otpRatelimit } from "@/lib/ratelimit";
import crypto from "node:crypto";

export const runtime = "nodejs";

const WA_COOKIE = "ribriz_wa_otp_state";

function signState(payload: object, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return `${data}.${sig}`;
}

function normalizePhone(raw: string): string {
  let digits = raw.replace(/[\s\-\(\)\+]/g, "");
  if (/^\d{10}$/.test(digits)) return `91${digits}`;
  return digits;
}

async function sendOTPViaAiSensy(phone: string, otp: string): Promise<void> {
  const apiKey = process.env.AISENSY_API_KEY;
  const campaignName = process.env.AISENSY_CAMPAIGN_NAME;
  if (!apiKey) throw new Error("AISENSY_API_KEY not set");
  if (!campaignName) throw new Error("AISENSY_CAMPAIGN_NAME not set");

  const payload = {
    apiKey,
    campaignName,
    destination: phone,
    userName: "RIBRIZ",
    templateParams: [otp],
  };

  console.log("AiSensy payload:", JSON.stringify({ ...payload, apiKey: "[redacted]" }));

  const res = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  console.log(`AiSensy response ${res.status}:`, body);

  if (!res.ok) {
    throw new Error(`AiSensy error ${res.status}: ${body.slice(0, 200)}`);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, firstName, lastName, dob, city, education } = body as {
      phone: string;
      firstName: string;
      lastName: string;
      dob: string;
      city: string;
      education: string;
    };

    if (!phone || !firstName || !lastName || !dob || !city || !education) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!/^\d{7,15}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: "Invalid phone number. Please enter a valid number with country code (e.g. 91 9876543210)." },
        { status: 400 }
      );
    }

    if (otpRatelimit) {
      const { success } = await otpRatelimit.limit(`wa:${normalizedPhone}`);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please wait a few minutes and try again." },
          { status: 429 }
        );
      }
    }

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!secret) {
      console.error("WA OTP send: missing secret env var");
      return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
    }

    const otp = String(crypto.randomInt(100000, 999999));
    const otpHash = crypto.createHmac("sha256", secret).update(otp).digest("hex");

    await sendOTPViaAiSensy(normalizedPhone, otp);

    const state = signState(
      {
        phone: normalizedPhone,
        otp_hash: otpHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob,
        city: city.trim(),
        education,
        exp: Date.now() + 10 * 60 * 1000,
      },
      secret
    );

    const response = NextResponse.json({ success: true });
    response.cookies.set(WA_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("WhatsApp OTP send error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
