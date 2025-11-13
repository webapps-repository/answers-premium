// debug-report.js
// debug-report.js
// debug-report.js

import { generatePdfBuffer } from './utils/generatePdf.js';
import { sendEmailWithAttachment } from './utils/sendEmail.js';
import { verifyRecaptcha } from '../utils/verify-recaptcha.js';

export default async function handler(req, res) {
  try {
    // Simulated form data
    const testData = {
      fullName: 'Test User',
      birthdate: '1990-01-01',
      birthTime: '12:34',
      birthPlace: 'Testville',
      reading: 'This is a test spiritual reading.',
      hCaptchaToken: '10000000-aaaa-bbbb-cccc-000000000001' // test mode token
    };

    // Simulate captcha verification
    const isCaptchaValid = await verifyRecaptcha(token, remoteIp);
    if (!isCaptchaValid) {
      return res.status(403).json({ success: false, error: '❌ hCaptcha failed (test token rejected)' });
    }

    // Generate PDF buffer
    const pdfBuffer = await generatePdfBuffer(testData);

    // Send email with PDF
    await sendEmailWithAttachment({
      to: 'sales@hazcam.io',
      subject: '📄 Test Spiritual Report',
      html: `<p>This is a test report sent via /api/debug-report</p>`,
      buffer: pdfBuffer,
      filename: 'spiritual-report-test.pdf',
    });

    return res.status(200).json({
      success: true,
      message: '✅ Full report flow completed successfully (captcha, pdf, email)',
    });

  } catch (err) {
    console.error('[debug-report error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
