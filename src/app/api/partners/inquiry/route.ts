import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgName, contactName, email, phone, orgType, city, studentsPerYear, message } = body;

    if (!orgName || !contactName || !email || !orgType) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    await sendEmail({
      to: "sgupta@ribriz.com",
      subject: `New B2B Partnership Inquiry — ${orgName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #3525cd; margin-bottom: 24px;">New Partnership Inquiry</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; font-weight: bold; width: 180px;">Organization</td><td style="padding: 8px 0;">${orgName}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Contact Name</td><td style="padding: 8px 0;">${contactName}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Phone</td><td style="padding: 8px 0;">${phone || "—"}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Org Type</td><td style="padding: 8px 0;">${orgType}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">City</td><td style="padding: 8px 0;">${city || "—"}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: bold;">Students/Year</td><td style="padding: 8px 0;">${studentsPerYear || "—"}</td></tr>
            ${message ? `<tr><td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Message</td><td style="padding: 8px 0;">${message}</td></tr>` : ""}
          </table>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Partnership inquiry error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit" },
      { status: 500 }
    );
  }
}
