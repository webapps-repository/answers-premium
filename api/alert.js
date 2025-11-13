// /api/alert.js
// Accepts POST with JSON { reason, details } and emails an alert via Resend.

import { sendEmailWithResend } from "./utils/sendEmail.js";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const chunks = [];
    for await (const ch of req) chunks.push(ch);
    const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    const reason = body.reason || "Unknown failure";
    const details = body.details || {};

    const to = process.env.ALERT_EMAIL_TO || process.env.TEST_EMAIL_TO;
    if (!to) throw new Error("ALERT_EMAIL_TO or TEST_EMAIL_TO not set");

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#222">
        <h2 style="margin:0 0 8px 0;">🚨 Melodies Web — Self-Test Alert</h2>
        <p><strong>Reason:</strong> ${reason}</p>
        <pre style="background:#f7f7fb;padding:10px;border-radius:8px;white-space:pre-wrap">${JSON.stringify(details, null, 2)}</pre>
        <p style="color:#555">Timestamp: ${new Date().toISOString()}</p>
      </div>
    `;

    await sendEmailWithResend({
      to,
      subject: `ALERT · Self-Test Failure — ${reason}`,
      html,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Alert send error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

