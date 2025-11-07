// new file uploads

import formidable from 'formidable';
import fs from 'fs';
import { generatePdfBuffer } from './utils/generatePdf.js';
import { sendEmailWithAttachment } from './utils/sendEmail.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      message: 'GET OK - /api/spiritual-report is reachable'
    });
  }

  if (req.method === 'POST') {
    // existing POST logic here
    return res.status(200).json({ success: true, message: 'POST OK' });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

  const form = new formidable.IncomingForm({ keepExtensions: true });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: 'Form parsing error' });
    }

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
        remoteip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      }),
    });

    const verification = await recaptchaVerify.json();

    if (!verification.success) {
      return res.status(403).json({ success: false, error: 'reCAPTCHA verification failed', details: verification });
    }

    // Continue with normal processing...
    const fullName = fields.name;
    const birthdate = fields.birthdate;
    const birthTime = fields.birthtime;
    const birthPlace = `${fields.birthcity}, ${fields.birthstate}, ${fields.birthcountry}`;
    const email = fields.email;

    const pdfBuffer = await generatePdfBuffer({
      fullName,
      birthdate,
      birthTime,
      birthPlace,
      reading: "Your spiritual insights go here...",
    });

    await sendEmailWithAttachment({
      to: email,
      subject: '🧘 Your Spiritual Report',
      html: `<p>Dear ${fullName},<br>Your spiritual report is attached.</p>`,
      buffer: pdfBuffer,
      filename: 'Spiritual_Report.pdf',
    });

    res.status(200).json({
      success: true,
      astrologySummary: '🌟 Your astrology summary here...',
      numerologySummary: '🔢 Your numerology summary here...',
      palmSummary: '✋ Your palm reading summary here...',
    });
  });
}
