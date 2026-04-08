// ─── Email Templates ─────────────────────────────────────
// Plain HTML templates for transactional emails via Resend.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ribriz.com";

const baseStyle = `
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #131b2e;
  line-height: 1.6;
`;

const buttonStyle = `
  display: inline-block;
  background-color: #4648d4;
  color: #ffffff;
  padding: 12px 28px;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
`;

const footerStyle = `
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e2e7ff;
  font-size: 12px;
  color: #75777d;
`;

function layout(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#faf8ff;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;${baseStyle}">
    <div style="margin-bottom:32px;">
      <span style="font-size:20px;font-weight:800;color:#00113b;letter-spacing:-0.5px;">RIBRIZ</span>
      <span style="font-size:10px;color:#75777d;margin-left:8px;text-transform:uppercase;letter-spacing:2px;">Study Abroad</span>
    </div>
    ${content}
    <div style="${footerStyle}">
      <p>RIBRIZ — Clear path. Right university. No agents needed.</p>
      <p>If you didn't expect this email, you can safely ignore it.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Welcome Email ───────────────────────────────────────

export function welcomeEmail(name: string) {
  const firstName = name.split(" ")[0];
  return {
    subject: `Welcome to RIBRIZ, ${firstName}! Let's find your university.`,
    html: layout(`
      <h1 style="font-size:24px;font-weight:800;color:#00113b;margin-bottom:8px;">
        Welcome aboard, ${firstName}!
      </h1>
      <p style="color:#45474c;font-size:15px;">
        You've just taken the first step towards studying abroad — without the confusion, without an agent.
      </p>
      <p style="color:#45474c;font-size:15px;">
        Here's what you can do right now:
      </p>
      <ul style="color:#45474c;font-size:14px;padding-left:20px;">
        <li style="margin-bottom:8px;"><strong>Complete your profile</strong> — takes 3 minutes, unlocks personalized university matches</li>
        <li style="margin-bottom:8px;"><strong>Browse matched universities</strong> — ranked by how well they fit your profile</li>
        <li style="margin-bottom:8px;"><strong>Check admission chances</strong> — see exactly where you stand and how to improve</li>
      </ul>
      <div style="margin:32px 0;">
        <a href="${APP_URL}/onboarding" style="${buttonStyle}">Complete Your Profile</a>
      </div>
      <p style="color:#45474c;font-size:14px;">
        Questions? Just reply to this email — we read every message.
      </p>
    `),
  };
}

// ─── Deadline Reminder ───────────────────────────────────

export function deadlineReminderEmail(
  name: string,
  university: string,
  course: string,
  deadline: string,
  daysLeft: number
) {
  const firstName = name.split(" ")[0];
  const urgencyColor = daysLeft <= 7 ? "#ba1a1a" : daysLeft <= 14 ? "#d97706" : "#4648d4";
  const urgencyLabel = daysLeft <= 7 ? "URGENT" : daysLeft <= 14 ? "SOON" : "UPCOMING";

  return {
    subject: `⏰ ${daysLeft} days left — ${university} deadline`,
    html: layout(`
      <h1 style="font-size:24px;font-weight:800;color:#00113b;margin-bottom:8px;">
        Deadline approaching, ${firstName}
      </h1>
      <div style="background:#ffffff;border:1px solid #e2e7ff;border-radius:16px;padding:24px;margin:24px 0;">
        <div style="display:inline-block;background:${urgencyColor};color:#fff;font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;margin-bottom:12px;letter-spacing:1px;">
          ${urgencyLabel} — ${daysLeft} DAYS LEFT
        </div>
        <h2 style="font-size:18px;font-weight:700;color:#00113b;margin:8px 0 4px;">${university}</h2>
        <p style="color:#45474c;font-size:14px;margin:0 0 4px;">${course}</p>
        <p style="color:#75777d;font-size:13px;margin:0;">Deadline: <strong style="color:#131b2e;">${deadline}</strong></p>
      </div>
      <p style="color:#45474c;font-size:14px;">
        Make sure your documents are uploaded and your SOP is finalized before the deadline.
      </p>
      <div style="margin:24px 0;">
        <a href="${APP_URL}/applications" style="${buttonStyle}">Check Application Status</a>
      </div>
    `),
  };
}

// ─── Application Status Update ───────────────────────────

export function statusUpdateEmail(
  name: string,
  university: string,
  status: string
) {
  const firstName = name.split(" ")[0];

  return {
    subject: `Update: Your ${university} application`,
    html: layout(`
      <h1 style="font-size:24px;font-weight:800;color:#00113b;margin-bottom:8px;">
        Application update, ${firstName}
      </h1>
      <p style="color:#45474c;font-size:15px;">
        Your application to <strong>${university}</strong> has been updated:
      </p>
      <div style="background:#ffffff;border:1px solid #e2e7ff;border-radius:16px;padding:20px;margin:20px 0;text-align:center;">
        <p style="font-size:18px;font-weight:700;color:#4648d4;margin:0;">${status}</p>
      </div>
      <div style="margin:24px 0;">
        <a href="${APP_URL}/applications" style="${buttonStyle}">View Details</a>
      </div>
    `),
  };
}

// ─── OTP Verification ────────────────────────────────────

export function otpEmail(otp: string, type: "login" | "signup") {
  const action = type === "signup" ? "verify your new account" : "sign in to your account";
  return {
    subject: `${otp} is your RIBRIZ verification code`,
    html: layout(`
      <h1 style="font-size:24px;font-weight:800;color:#00113b;margin-bottom:8px;">
        Your verification code
      </h1>
      <p style="color:#45474c;font-size:15px;">
        Use the code below to ${action}. It expires in <strong>10 minutes</strong>.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <div style="display:inline-block;background:#f0f0ff;border:1px solid #e2e7ff;border-radius:16px;padding:24px 48px;">
          <span style="font-size:48px;font-weight:800;letter-spacing:0.25em;color:#4648d4;font-family:monospace;">${otp}</span>
        </div>
      </div>
      <p style="color:#75777d;font-size:13px;text-align:center;">
        Never share this code with anyone. RIBRIZ will never ask for it.
      </p>
    `),
  };
}

// ─── Profile Incomplete Nudge ────────────────────────────

export function profileNudgeEmail(name: string, completionPct: number) {
  const firstName = name.split(" ")[0];

  return {
    subject: `${firstName}, you're ${completionPct}% done — finish your profile to see matches`,
    html: layout(`
      <h1 style="font-size:24px;font-weight:800;color:#00113b;margin-bottom:8px;">
        You're almost there, ${firstName}
      </h1>
      <p style="color:#45474c;font-size:15px;">
        Your profile is <strong>${completionPct}% complete</strong>. Finish it to unlock:
      </p>
      <ul style="color:#45474c;font-size:14px;padding-left:20px;">
        <li style="margin-bottom:6px;">Personalized university matches ranked by fit</li>
        <li style="margin-bottom:6px;">Admission chance scores with improvement roadmaps</li>
        <li style="margin-bottom:6px;">AI-generated SOP drafts tailored to each university</li>
      </ul>
      <div style="margin:32px 0;">
        <a href="${APP_URL}/onboarding" style="${buttonStyle}">Complete Profile (2 min left)</a>
      </div>
    `),
  };
}
