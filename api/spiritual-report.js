// /api/spiritual-report.js

import { formidable } from 'formidable';
import fs from 'fs';
import { generatePdfBuffer } from './utils/generatePdf.js';
import { sendEmailWithAttachment } from './utils/sendEmail.js';

export const config = {
  api: {
    bodyParser: false, // Required for file uploads
  },
};

export default async function handler(req, res) {
  // ✅ Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Restrict to Shopify domain later for security
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // ✅ Handle preflight CORS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: '✅ GET OK - /api/spiritual-report is reachable',
    });
  }

  if (req.method === 'POST') {
    const form = formidable({ multiples: false, keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('❌ Form parse error:', err);
        return res.status(500).json({ success: false, error: 'Form parsing error' });
      }

      // ✅ Cleanly extract token (handles array vs string)
      let token = fields["g-recaptcha-response"];
      if (Array.isArray(token)) token = token[0];

      console.log("Token received:", token);
      console.log("Using secret:", process.env.RECAPTCHA_SECRET_KEY ? "✅ Present" : "❌ Missing");

      if (!token) {
        return res.status(400).json({ success: false, error: 'Missing reCAPTCHA token' });
      }

      try {
        // ✅ Verify with Google
        const verify = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            secret: process.env.RECAPTCHA_SECRET_KEY,
            response: token,
            remoteip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          }),
        });

        const verification = await verify.json();

        // ✅ Debug logging
        console.log("reCAPTCHA verification response:", verification);
        console.log("Verifying domain:", verification.hostname);
        console.log("Verification details:", verification);

        if (!verification.success) {
          console.error('❌ reCAPTCHA verification failed:', verification);
          return res.status(403).json({
            success: false,
            error: 'reCAPTCHA verification failed',
            details: verification,
          });
        }

        // ✅ Parse form fields
        const fullName = fields.name;
        const birthdate = fields.birthdate;
        const birthTime = fields.birthtime;
        const birthPlace = `${fields.birthcity}, ${fields.birthstate}, ${fields.birthcountry}`;
        const email = fields.email;

        // ✅ Generate PDF
        const pdfBuffer = await generatePdfBuffer({
          fullName,
          birthdate,
          birthTime,
          birthPlace,
          reading: "Your spiritual insights go here...",
        });

        // ✅ Send email
        await sendEmailWithAttachment({
          to: email,
          subject: '🧘 Your Spiritual Report',
          html: `<p>Dear ${fullName},<br>Your spiritual report is attached.</p>`,
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
        return res.status(500).json({ success: false, error: e.message });
      }
    });
    return;
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
