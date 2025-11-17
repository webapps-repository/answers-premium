// /api/utils/send-email.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export function sendEmailHTML({ to, subject, html, attachments = [] }) {
  return resend.emails
    .send({
      from: "Melodies Web <noreply@hazcam.io>",
      to,
      subject,
      html,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content.toString("base64"),
        encoding: "base64",
      })),
    })
    .then((r) => ({ success: true, id: r.id }))
    .catch((err) => ({
      success: false,
      error: err.message || "Email failed",
    }));
}
