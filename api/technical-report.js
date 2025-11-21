// /api/technical-report.js
export const config = {
  api: { bodyParser: false },
  runtime: "nodejs"
};

import formidable from "formidable";

import {
  applyCORS,
  normalize,
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
    const form = formidable({ keepExtensions: true, allowEmptyFiles: true });

    const { fields } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f) => err ? reject(err) : resolve({ fields: f }))
    );

    const email = normalize(fields, "email");
    const question = normalize(fields, "question");

    if (!email) return res.status(400).json({ error: "Email required" });
    if (!question) return res.status(400).json({ error: "Question required" });

    // Recaptcha optional for this endpoint
    const recaptchaToken = normalize(fields, "recaptchaToken");
    if (recaptchaToken) {
      const recaptcha = await verifyRecaptcha(recaptchaToken);
      if (!recaptcha.ok)
        return res.status(400).json({ error: "Invalid reCAPTCHA" });
    }

    const insights = await generateInsights({
      question,
      meta: { email },
      enginesInput: {}    // Technical report ignores engines
    });

    const html = `
      <h1>Technical Report</h1>
      <pre>${JSON.stringify(insights, null, 2)}</pre>
    `;

    const pdfBuffer = await generatePDFBufferFromHTML(html);

    const emailResult = await sendEmailHTML({
      to: email,
      subject: "Your Technical Report",
      html: `<p>Your report is attached.</p>`,
      attachments: [{ filename: "technical-report.pdf", content: pdfBuffer }]
    });

    if (!emailResult.success)
      return res.status(500).json({ error: "Email failed", detail: emailResult.error });

    return res.status(200).json({ ok: true, emailed: true });

  } catch (err) {
    console.error("TECH REPORT ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
