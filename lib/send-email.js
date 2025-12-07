// /lib/send-email.js

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * options = {
 *   to: string,
 *   subject: string,
 *   html: string,
 *   pdfBuffer?: Buffer,
 *   pdfFilename?: string
 * }
 */
export async function sendEmailHTML(options) {
  const {
    to,
    subject,
    html,
    pdfBuffer,
    pdfFilename = "premium-spiritual-report.pdf",
  } = options;

  const attachments = [];

  if (pdfBuffer) {
    attachments.push({
      filename: pdfFilename,
      content: pdfBuffer.toString("base64"),
      // Resend auto-detects type; add if you want:
      // contentType: "application/pdf",
    });
  }

  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    attachments: attachments.length ? attachments : undefined,
  });

  return result;
}
