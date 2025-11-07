// api/test-email.js
// api/test-email.js
// api/test-email.js

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY); // ✅ Set this in Vercel

export default async function handler(req, res) {
  try {
    const result = await resend.emails.send({
      from: 'sales@hazcam.io',  // ✅ Must be verified domain or sender in Resend
      to: 'sales@hazcam.io',
      subject: '✅ Resend Test Email',
      html: '<p>This is a test using the Resend API</p>',
    });

    console.log('📧 Resend result:', result);

    res.status(200).json({ success: true, message: 'Email sent via Resend' });
  } catch (err) {
    console.error('❌ Resend error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
