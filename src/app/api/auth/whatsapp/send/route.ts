import { NextResponse } from "next/server";
import { otpRatelimit } from "@/lib/ratelimit";
import crypto from "node:crypto";

export const runtime = "nodejs";

const WA_COOKIE = "ribriz_wa_otp_state";
const PHONE_NUMBER_ID = "1044242082107280";

function signState(payload: object, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return `${data}.${sig}`;
}

function normalizePhone(raw: string): string {
  // Remove whitespace, dashes, parentheses, leading +
  let digits = raw.replace(/[\s\-\(\)\+]/g, "");
  // If exactly 10 digits (Indian number without country code), prepend 91
  if (/^\d{10}$/.test(digits)) return `91${digits}`;
  return digits;
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

    const token = process.env.WHATSAPP_TOKEN;
    if (!token) {
      console.error("WA OTP send: WHATSAPP_TOKEN not set");
      return NextResponse.json({ error: "WhatsApp service not configured." }, { status: 500 });
    }

    const otp = String(crypto.randomInt(100000, 999999));
    const otpHash = crypto.createHmac("sha256", secret).update(otp).digest("hex");

    // Send OTP via WhatsApp Cloud API using approved authentication template
    const waRes = await fetch(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizedPhone,
          type: "template",
          template: {
            name: "ribriz_otp",
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: otp }],
              },
              {
                type: "button",
                sub_type: "copy_code",
                index: "0",
                parameters: [{ type: "coupon_code", text: otp }],
              },
            ],
          },
        }),
      }
    );

    if (!waRes.ok) {
      const errBody = await waRes.json().catch(() => ({})) as {
        error?: { message?: string; code?: number; error_subcode?: number };
      };
      console.error("WhatsApp API error:", JSON.stringify(errBody));

      // Surface actionable Meta error codes
      const metaCode = errBody?.error?.code;
      const metaMsg = errBody?.error?.message ?? "";

      let userMsg = "Failed to send WhatsApp OTP. Please try again.";
      if (metaCode === 190) userMsg = "WhatsApp token is invalid or expired. Contact support.";
      else if (metaCode === 131030) userMsg = "This number is not registered as a test recipient. Add it in Meta Business Manager first.";
      else if (metaCode === 131047) userMsg = "Cannot reach this WhatsApp number right now. Please try again later.";
      else if (metaMsg) userMsg = `WhatsApp error: ${metaMsg}`;

      return NextResponse.json({ error: userMsg }, { status: 500 });
    }

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
