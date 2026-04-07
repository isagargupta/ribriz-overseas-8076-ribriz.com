import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { deadlineReminderEmail } from "@/lib/email/templates";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, name, university, course, deadline, daysLeft } =
      await request.json();

    if (!email || !name || !university || !deadline || daysLeft === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const template = deadlineReminderEmail(
      name,
      university,
      course,
      deadline,
      daysLeft
    );
    const data = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send" },
      { status: 500 }
    );
  }
}
