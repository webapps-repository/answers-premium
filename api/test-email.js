// api/test-email.js

import { sendEmailWithAttachment } from './utils/sendEmail.js';

export default async function handler(req, res) {
  try {
    console.log("🚀 Sending test email...");

    const htmlContent = `
      <div style="font-family:Arial, sans-serif; color:#333;">
        <h2>✨ Spiritual Report Email Test</h2>
        <p>This is a <strong>test email</strong> from your Vercel API deployment.</p>
        <p>If you're seeing this, your email system works ✅</p>
        <p style="margin-top:16px;">– The Hazcam Spiritual Report System</p>
      </div>
    `;

    await sendEmailWithAttachment({
      to: 'henrycvalk@proton.me',
      subject: '📧 Email Delivery Test - Spiritual App',
      html: htmlContent,
      buffer: Buffer.from('Test attachment content. This confirms attachment functionality.'),
      filename: 'test_attachment.txt'
    });

    console.log("✅ Test email sent successfully.");
    return res.status(200).json({ success: true, message: "Test email sent successfully!" });
  } catch (error) {
    console.error("❌ Email send error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
