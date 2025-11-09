// /api/utils/sendEmail.js

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmailWithAttachment({ to, subject, html, buffer, filename }) {
  try {
    console.log("📨 Sending email via Resend...");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Attachment filename:", filename);

    const response = await resend.emails.send({
      from: 'Spiritual Report <sales@hazcam.io>', // ✅ use your verified sender domain
      to,
      subject,
      html, // ✅ HTML body
      attachments: buffer
        ? [
            {
              filename: filename || 'attachment.pdf',
              content: buffer.toString('base64'),
              encoding: 'base64',
            },
          ]
        : [],
    });

    console.log("✅ Email sent via Resend:", response);
    return response;
  } catch (error) {
    console.error("❌ Failed to send email via Resend:", error);
    throw error;
  }
}
