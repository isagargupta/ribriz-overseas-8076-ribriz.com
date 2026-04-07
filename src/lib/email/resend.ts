import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = "RIBRIZ <noreply@mail.ribriz.com>";
export const SUPPORT_EMAIL = "support@mail.ribriz.com";
