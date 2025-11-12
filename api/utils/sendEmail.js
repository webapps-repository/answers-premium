// Melodies Web – Resend Email Utility
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmailWithResend({
  to,
  subject,
  html,
  buffer,
  filename = "Your_Answer.pdf",
}) {
  try {
    await resend.emails.send({
      from: "Melodies Web <noreply@melodiesweb.io>",
      to,
      subject,
      html,
      attachments: buffer
        ? [{ filename, content: buffer.toString("base64") }]
        : [],
    });
    console.log("📨 Resend email sent to", to);
  } catch (err) {
    console.error("❌ Resend email error:", err);
  }
}
