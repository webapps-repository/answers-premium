// /api/utils/send-email.js
// Resend email sender with attachment support.
// Fully compatible with hazcam.io verified sending domain.
// Clean, stable, no regressions.

import { Resend } from "resend";

/**
 * Sends an email using Resend with optional attachments.
 *
 * @param {Object} opts
 * @param {string} opts.to                - Recipient email
 * @param {string} opts.subject           - Email subject line
 * @param {string} opts.html              - HTML body
 * @param {Array=} opts.attachments       - [{ filename, buffer }]
 *
 * @returns {Promise<{success:boolean, id?:string, error?:string}>}
 */
export async function sendEmailHTML(opts = {}) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.error("❌ Missing RESEND_API_KEY");
    return { success: false, error: "Missing API key" };
  }

  const resend = new Resend(resendApiKey);

  const from = "Melodies Web <sales@hazcam.io>"; // Verified sender

  try {
    const files = [];

    if (Array.isArray(opts.attachments)) {
      for (const a of opts.attachments) {
        if (a?.buffer && a?.filename) {
          files.push({
            filename: a.filename,
            content: a.buffer,
          });
        }
      }
    }

    const response = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html || "",
      attachments: files.length ? files : undefined,
    });

    if (response?.data?.id) {
      return { success: true, id: response.data.id };
    }

    console.error("❌ Resend returned unexpected response:", response);
    return { success: false, error: "Unexpected response from Resend" };

  } catch (err) {
    console.error("❌ Resend email error:", err);
    return { success: false, error: err?.message || "Email send failed" };
  }
}
