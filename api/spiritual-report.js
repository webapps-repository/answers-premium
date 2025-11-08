// spiritual-report
// spiritual-report
// spiritual-report

import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';
import { generatePdfBuffer } from './utils/generatePdf.js';
import { sendEmailWithAttachment } from './utils/sendEmail.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    // Simple GET handler for health check
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        message: 'GET OK - /api/spiritual-report is reachable'
      });
    }

    // Handle POST requests
    if (req.method === 'POST') {
      const form = new formidable.IncomingForm({ keepExtensions: true });

      form.parse(req, async (err, fields, files) => {
        try {
          if (err) {
            console.error('Formidable error:', err);
            return res.status(500).json({ success: false, error: 'Form parsing error' });
          }

          // reCAPTCHA verification
          const token = fields['g-recaptcha-response'];
          if (!token) {
            return res.status(400).json({ success: false, error: 'Missing reCAPTCHA token' });
          }

          const recaptchaVerify = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              secret: process.env.RECAPTCHA_SECRET_KEY,
              response: token,
              remoteip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
            }),
          });

          const verification = await recaptchaVerify.json();

          if (!verification.success) {
            return res.status(403).json({
              success: false,
              error: 'reCAPTCHA verification failed',
              details: verification
            });
          }

          // Collect form data
          const fullName = fields.name;
          const birthdate = fields.birthdate;
          const birthTime = fields.birthtime;
          const birthPlace = `${fields.birthcity}, ${fields.birthstate}, ${fields.birthcountry}`;
          const email = fields.email;

          // Generate PDF
          const pdfBuffer = await generatePdfBuffer({
            fullName,
            birthdate,
            birthTime,
            birthPlace,
            reading: "Your spiritual insights go here...",
          });

          // Send email with attachment
          await sendEmailWithAttachment({
            to: email,
            subject: '🧘 Your Spiritual Report',
            html: `<p>Dear ${fullName},<br>Your spiritual report is attached.</p>`,
            buffer: pdfBuffer,
            filename: 'Spiritual_Report.pdf',
          });

          // Respond success
          return res.status(200).json({
            success: true,
            astrologySummary: '🌟 Your astrology summary here...',
            numerologySummary: '🔢 Your numerology summary here...',
            palmSummary: '✋ Your palm reading summary here...',
          });
        } catch (innerErr) {
          console.error('Inner error:', innerErr);
          return res.status(500).json({ success: false, error: innerErr.message });
        }
      });
      return; // ensure no duplicate response
    }

    // All other HTTP methods
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Fatal error in handler:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
