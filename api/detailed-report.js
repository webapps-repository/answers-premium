// /api/detailed-report.js — FINAL RESTORED & UPGRADED (drop-in replacement)

export const config = {
  api: { bodyParser: false },
  runtime: "nodejs"
};

import formidable from "formidable";
import fs from "fs";

import {
  applyCORS,
  normalize,
  validateUploadedFile,
  verifyRecaptcha,
  sendEmailHTML
} from "../lib/utils.js";

import { generateInsights } from "../lib/insights.js";
import { generatePDFBufferFromHTML } from "../lib/pdf.js";

export default async function handler(req, res) {
  if (applyCORS(req, res)) return;

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    /* ----------------------------------------------------------
       1) Parse multipart form
    ---------------------------------------------------------- */
    const form = formidable({ keepExtensions: true });
    const { fields, files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fi) =>
        err ? reject(err) : resolve({ fields: f, files: fi })
      )
    );

    /* ----------------------------------------------------------
       2) Extract & validate inputs
    ---------------------------------------------------------- */
    const email = normalize(fields, "email");
    const question = normalize(fields, "question");

    if (!email) return res.status(400).json({ error: "Email required" });
    if (!question) return res.status(400).json({ error: "Question required" });

    const recaptchaToken = normalize(fields, "recaptchaToken");
    const recaptcha = await verifyRecaptcha(recaptchaToken);
    if (!recaptcha.ok)
      return res.status(400).json({ error: "Invalid reCAPTCHA" });

    /* ----------------------------------------------------------
       3) Technical mode: no palm, no numerology, no astrology
          We send enginesInput = {}, which still:
            - runs classification
            - runs triad synthesis with nulls
            - runs shortAnswer
            - returns a stable technical insights object
    ---------------------------------------------------------- */
    const insights = await generateInsights({
      question,
      enginesInput: {} // Technical mode
    });

    /* ----------------------------------------------------------
       4) Build HTML for the PDF
    ---------------------------------------------------------- */
    const html = `
      <h1>Detailed Technical Report</h1>

      <h2>Question</h2>
      <p>${question}</p>

      <h2>Insights</h2>
      <pre>${JSON.stringify(insights, null, 2)}</pre>
    `;

    const pdfBuffer = await generatePDFBufferFromHTML(html);

    /* ----------------------------------------------------------
       5) Email the PDF
    ---------------------------------------------------------- */
    const emailResult = await sendEmailHTML({
      to: email,
      subject: "Your Detailed Technical Report",
      html: `<p>Your detailed technical report is attached.</p>`,
      attachments: [{ filename: "report.pdf", content: pdfBuffer }]
    });

    if (!emailResult.success) {
      return res.status(500).json({
        error: "Email failed",
        detail: emailResult.error
      });
    }

    /* ----------------------------------------------------------
       6) Success
    ---------------------------------------------------------- */
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("DETAIL REPORT ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
