// /api/technical-report.js — Stage-3 (HTML-only full technical email)
export const runtime = "nodejs";             // REQUIRED for formidable + email + env vars
export const dynamic = "force-dynamic";      // Prevent Vercel caching of POST requests
export const config = { api: { bodyParser: false } };

import formidable from "formidable";
import {
  normalize,
  verifyRecaptcha,
  sendEmailHTML
} from "../lib/utils.js";
import { generateInsights } from "../lib/insights.js";

export default async function handler(req, res) {
  /* ----------------------------------------------------------
     CORS — MUST execute before anything else
  ---------------------------------------------------------- */
  res.setHeader("Access-Control-Allow-Origin", "*"); // lock to Shopify later
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS")
    return res.status(200).end();

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  /* ----------------------------------------------------------
     Parse multipart form-data
     (Edge runtime would break this — Node runtime REQUIRED)
  ---------------------------------------------------------- */
  let fields;
  try {
    const form = formidable({ multiples: false });

    ({ fields } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f) =>
        err ? reject(err) : resolve({ fields: f })
      )
    ));
  } catch (err) {
    console.error("❌ Form parse error:", err);
    return res.status(400).json({ error: "Bad form data" });
  }

  /* ----------------------------------------------------------
     Extract & validate inputs
  ---------------------------------------------------------- */
  const email = normalize(fields, "email");
  const question = normalize(fields, "question");
  const recaptchaToken = normalize(fields, "recaptchaToken");

  if (!email) return res.status(400).json({ error: "Email required" });
  if (!question) return res.status(400).json({ error: "Question required" });

  /* ----------------------------------------------------------
     Verify reCAPTCHA (optional mode)
  ---------------------------------------------------------- */
  if (recaptchaToken) {
    const rec = await verifyRecaptcha(
      recaptchaToken,
      req.headers["x-forwarded-for"]
    );
    if (!rec.ok)
      return res.status(400).json({ error: "Invalid reCAPTCHA", rec });
  }

  /* ----------------------------------------------------------
     Generate technical insight data
  ---------------------------------------------------------- */
  let insights;
  try {
    insights = await generateInsights({
      question,
      enginesInput: {}  // technical mode → no personal engines
    });
  } catch (err) {
    console.error("❌ Insight generation error:", err);
    return res.status(500).json({ error: "Insight engine failure" });
  }

  /* ----------------------------------------------------------
     Build HTML email
  ---------------------------------------------------------- */
  const subject = `Your Technical Report — ${new Date().toLocaleString()}`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif; line-height:1.55; color:#222; max-width:760px; margin:auto">
      <h2 style="color:#4B0082; margin-bottom:12px">Your Full Technical Insight Report</h2>

      <p style="margin-bottom:14px;">
        Below is your complete AI-generated technical analysis:
      </p>

      <div style="background:#f8f6ff; border-radius:10px; padding:14px; white-space:pre-wrap;">
        ${JSON.stringify(insights, null, 2)}
      </div>

      <p style="margin-top:16px; color:#555;">
        Sent automatically by our AI Insight System.
      </p>
    </div>
  `;

  /* ----------------------------------------------------------
     Send email
  ---------------------------------------------------------- */
  const sent = await sendEmailHTML({
    to: email,
    subject,
    html
  });

  if (!sent.success) {
    console.error("❌ Email send error:", sent.error);
    return res.status(500).json({ ok: false, error: sent.error });
  }

  /* ----------------------------------------------------------
     Success response
  ---------------------------------------------------------- */
  return res.status(200).json({
    ok: true,
    emailed: true
  });
}
