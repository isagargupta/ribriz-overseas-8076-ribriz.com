import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { createClient } from "@/lib/supabase/server";

// GET /api/email/test?to=your@email.com
// Dev-only test endpoint — requires authentication
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const to = searchParams.get("to") || user.email;

  if (!to) {
    return NextResponse.json(
      { error: "Add ?to=your@email.com" },
      { status: 400 }
    );
  }

  try {
    const data = await sendEmail({
      to,
      subject: "RIBRIZ Test — Email is working!",
      html: `
        <div style="font-family:sans-serif;padding:20px;">
          <h2 style="color:#00113b;">Resend is connected!</h2>
          <p>This email was sent from <strong>noreply@mail.ribriz.com</strong> via Resend.</p>
          <p style="color:#75777d;font-size:12px;">You can delete the /api/email/test route in production.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
