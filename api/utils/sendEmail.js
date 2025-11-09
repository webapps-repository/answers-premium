// /api/utils/sendEmail.js

import { Resend } from 'resend';

export async function sendEmailWithAttachment({ to, subject, html, buffer, filename }) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY is missing. Email cannot be sent.");
      throw new Error("Missing RESEND_API_KEY environment variable.");
    }

    // Initialize Resend client
    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log("📨 Preparing to send email...");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("From:", 'Spiritual Report <sales@hazcam.io>');
    console.log("Attachment:", filename || 'none');

    // Construct email payload
    const emailPayload = {
      from: 'Spiritual Report <sales@hazcam.io>', // must match verified domain in Resend
      to,
      subject,
      html,
    };

    // Attach file if provided
    if (buffer) {
      emailPayload.attachments = [
        {
          filename: filename || 'attachment.pdf',
          content: buffer, // ✅ Use Buffer directly
        },
      ];
    }

    // Send email via Resend
    const response = await resend.emails.send(emailPayload);

    console.log("✅ Email successfully sent via Resend:", response.id || response);
    return response;
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw error;
  }
}
