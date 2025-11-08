// /api/spiritual-report.js
import formidable from 'formidable';
import fs from 'fs';
import { generatePdfBuffer } from './utils/generatePdf.js';
import { sendEmailWithAttachment } from './utils/sendEmail.js';

export const config = {
  api: {
    bodyParser: false, // Disable Next.js body parser for file uploads
  },
};

export default async function handler(req, res) {
  // --- GET request handler (for basic endpoint check)
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: '✅ GET OK - /api/spiritual-report is reachable',
    });
  }

  // --- POST request handler (form submission)
  if (req.method === 'POST') {
    const form = new formidable.IncomingForm({ keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('❌ Form parse error:', err);
        return res.status(500).json({ success: false, error: 'Form parsing error' });
      }

      // --- Debug: Show token and secret key status
      console.log("Token received:", fields["g-recaptcha-response"]);
      console.log("Using secret:", process.env.RECAPTCHA_SECRET_KEY ? "✅ Present" : "❌ Missing");

      const token = fields["g-recaptcha-response"];
      if (!token) {
        return res.status(400).json({ success: false, error: 'Missing reCAPTCHA token' });
      }

      try {
        // --- Verify token with Google reCAPTCHA
        const recaptchaVerify = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: process.env.RECAPTCHA_SECRET_KEY,
            response: token,
            remoteip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          }),
        });

        const verification = await recaptchaVerify.json();

        // --- Log full verification result
        console.log("reCAPTCHA verification response:", verification);

        if (!verification.success) {
          console.error('❌ reCAPTCHA verification failed:', verification);
          return res.status(403).json({
            success: false,
            error: 'reCAPTCHA verification failed',
            details: verification,
          });
        }

        // --- Continue with your business logic
        const fullName = fields.name;
        const birthdate = fields.birthdate;
        const birthTime = fields.birthtime;
        const birthPlace = `${fields.birthcity}, ${fields.birthstate}, ${fields.birthcountry}`;
        const email = fields.email;

        // Generate the report PDF
        const pdfBuffer = await generatePdfBuffer({
          fullName,
          birthdate,
          birthTime,
          birthPlace,
          reading: "Your spiritual insights go here...",
        });

        // Send via email
        await sendEmailWithAttachment({
          to: email,
          subject: '🧘 Your Spiritual Report',
          html: `<p>Dear ${fullName},<br>Your personalized spiritual report is attached.</p>`,
          buffer: pdfBuffer,
          filename: 'Spiritual_Report.pdf',
        });

        console.log(`✅ Report successfully emailed to ${email}`);

        return res.status(200).json({
          success: true,
          message: 'Report generated and sent successfully.',
          astrologySummary: '🌟 Your astrology summary here...',
          numerologySummary: '🔢 Your numerology summary here...',
          palmSummary: '✋ Your palm reading summary here...',
        });
      } catch (e) {
        console.error('❌ Server error:', e);
        return res.status(500).json({ success: false, error: 'Internal server error', details: e.message });
      }
    });
    return; // Important to prevent fallthrough
  }

  // --- Method not allowed
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
