// /api/utils/send-email.js
import { Resend } from "resend";

export async function sendEmailHTML({ to, subject, html, attachments = [] }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Missing RESEND_API_KEY");
    return { success: false, error: "Missing API key" };
  }

  const resend = new Resend(apiKey);

  try {
    const resp = await resend.emails.send({
      from: "Melodies Web <sales@hazcam.io>",
      to,
      subject,
      html,
      attachments: attachments.map(a => ({
        filename: a.filename,
        content: a.buffer
      }))
    });

    return { success: true, id: resp?.data?.id };
  } catch (err) {
    console.error("Email send error:", err);
    return { success: false, error: err.message };
  }
}
