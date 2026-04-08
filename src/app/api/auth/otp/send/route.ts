import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { otpEmail } from "@/lib/email/templates";

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
    const supabase = createAdminClient();
    let otp: string | undefined;

    if (type === "signup") {
      if (!password) {
        return NextResponse.json({ error: "Password is required for signup" }, { status: 400 });
      }
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: {
          data: { full_name: name || "" },
        },
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      otp = data.properties?.email_otp;
    } else {
      // login — magiclink for existing users
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (error) {
        // Don't reveal whether the user exists
        return NextResponse.json({ success: true });
      }
      otp = data.properties?.email_otp;
    }

    if (!otp) {
      return NextResponse.json({ error: "Failed to generate verification code" }, { status: 500 });
    }

    const template = otpEmail(otp, type);
    await sendEmail({ to: email, subject: template.subject, html: template.html });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("OTP send error:", err);
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
  }
}
