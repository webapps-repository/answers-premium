// /api/detailed-report.js — Stage-3 (HTML email only)

export const config = {
  api: { bodyParser: false },
  runtime: "nodejs"
};

import formidable from "formidable";

import {
  applyCORS,
  normalize,
  verifyRecaptcha,
  sendHtmlEmail
} from "../lib/utils.js";

import { generateInsights } from "../lib/insights.js";

export default async function handler(req, res) {
  if (applyCORS(req, res)) return;

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const form = formidable({ keepExtensions: true });
    const { fields } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f) => err ? reject(err) : resolve({ fields: f }))
    );

    const email = normalize(fields, "email");
    const question = normalize(fields, "question");

    if (!email) return res.status(400).json({ error: "Email required" });
    if (!question) return res.status(400).json({ error: "Question required" });

    const recaptchaToken = normalize(fields, "recaptchaToken");
    const recaptcha = await verifyRecaptcha(recaptchaToken);
    if (!recaptcha.ok) return res.status(400).json({ error: "Invalid reCAPTCHA" });

    const insights = await generateInsights({
      question,
      enginesInput: {} // technical mode (no personal engines)
    });

    const subject = `Full Technical Insight — ${new Date().toLocaleString()}`;

    const html = `
      <h1>Your Full Technical Report</h1>
      <p>Below are your detailed insights:</p>
      <pre>${JSON.stringify(insights, null, 2)}</pre>
    `;

    const sent = await sendHtmlEmail({
      to: email,
      subject,
      html
    });

    if (!sent.success)
      return res.status(500).json({ ok: false, error: sent.error });

    return res.status(200).json({ ok: true, emailed: true });

  } catch (err) {
    console.error("DETAIL REPORT ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
