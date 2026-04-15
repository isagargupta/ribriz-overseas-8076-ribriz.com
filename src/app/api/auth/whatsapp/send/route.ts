import { NextResponse } from "next/server";
import { otpRatelimit } from "@/lib/ratelimit";
import crypto from "node:crypto";

export const runtime = "nodejs";

const WA_COOKIE = "ribriz_wa_otp_state";
const CHATWOOT_URL = "https://crm.wyriz.dev";
const CHATWOOT_ACCOUNT_ID = 1;
const CHATWOOT_INBOX_ID = 5;

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

async function chatwootFetch(url: string, options: RequestInit): Promise<unknown> {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok) throw new Error(`Chatwoot ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function sendOTPViaChatwoot(phone: string, otp: string, firstName: string): Promise<void> {
  const token = process.env.CHATWOOT_API_TOKEN;
  if (!token) throw new Error("CHATWOOT_API_TOKEN not set");

  const headers = {
    "api_access_token": token,
    "Content-Type": "application/json",
  };

  // Step 1: Find or create contact
  const searchData = await chatwootFetch(
    `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search?q=${encodeURIComponent(phone)}`,
    { headers }
  ) as { payload?: { id: number }[] };

  let contactId: number;
  if (searchData.payload && searchData.payload.length > 0) {
    contactId = searchData.payload[0].id;
  } else {
    const contactData = await chatwootFetch(
      `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ name: firstName, phone_number: `+${phone}` }),
      }
    ) as { id?: number; payload?: { contact?: { id: number } } };
    contactId = contactData.id ?? contactData.payload?.contact?.id ?? 0;
    if (!contactId) throw new Error(`No contact id in response: ${JSON.stringify(contactData)}`);
  }

  // Step 2: Create new conversation in WhatsApp inbox
  const convData = await chatwootFetch(
    `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ inbox_id: CHATWOOT_INBOX_ID, contact_id: contactId }),
    }
  ) as { id: number };
  if (!convData.id) throw new Error(`No conversation id in response: ${JSON.stringify(convData)}`);

  // Step 3: Send OTP via WhatsApp template through Chatwoot
  await chatwootFetch(
    `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${convData.id}/messages`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: otp,
        message_type: "outgoing",
        private: false,
        template_params: {
          name: "ribriz_otp",
          category: "AUTHENTICATION",
          language: "en_US",
          processed_params: { "1": otp },
        },
      }),
    }
  );
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

    await sendOTPViaChatwoot(normalizedPhone, otp, firstName.trim());

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
