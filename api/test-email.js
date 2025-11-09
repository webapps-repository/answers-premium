// new-/api/test-email.js

import { sendEmailWithAttachment } from './utils/sendEmail.js';

export default async function handler(req, res) {
  try {
    console.log("🚀 Starting test email endpoint...");

    // HTML body of email
    const htmlContent = `
      <div style="font-family:Arial, sans-serif; color:#333;">
        <h2>✨ Spiritual Report Email Test</h2>
        <p>This is a <strong>test email</strong> sent from your deployed Vercel function.</p>
        <p>If you receive this, your email sending system via Resend works correctly ✅</p>
        <p style="margin-top:16px;">– The Hazcam Spiritual Report System</p>
      </div>
    `;

    // Send the email using the shared utility
    const response = await sendEmailWithAttachment({
      to: 'henrycvalk@proton.me',
      subject: '📧 Test Email from Hazcam Spiritual Report',
      html: htmlContent,
      buffer: Buffer.from('Attachment test successful.\nThis confirms attachments are functional.'),
      filename: 'test_attachment.txt',
    });

    console.log("✅ Email sent successfully via Resend:", response);

    return res.status(200).json({
      success: true,
      message: "✅ Test email sent successfully.",
      resendResponse: response,
    });
  } catch (error) {
    console.error("❌ Email send failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error,
    });
  }
}
