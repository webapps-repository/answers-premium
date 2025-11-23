// /api/spiritual-report.js — FIXED FULL VERSION
// /api/spiritual-report.js — FIXED FULL VERSION
// /api/spiritual-report.js — FIXED FULL VERSION
// /api/spiritual-report.js — FIXED FULL VERSION
// /api/spiritual-report.js — FIXED FULL VERSION

export const config = {
  api: { bodyParser: false },
  runtime: "nodejs"
};

import formidable from "formidable";
import {
  applyCORS,
  normalize,
  validateUploadedFile,
  verifyRecaptcha,
  sendEmailHTML
} from "../lib/utils.js";

import { analyzePalm } from "../lib/engines.js";
import { generateInsights } from "../lib/insights.js";
import { generatePDFBufferFromHTML } from "../lib/pdf.js";

export default async function handler(req, res) {
  if (applyCORS(req, res)) return;

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const form = formidable({ keepExtensions: true });
    const { fields, files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fi) => err ? reject(err) : resolve({ fields: f, files: fi }))
    );

    const question = normalize(fields, "question");
    const isPersonal = normalize(fields, "isPersonal") === "true";
    const email = normalize(fields, "email");

    if (!question) return res.status(400).json({ error: "Missing question" });

    const recaptchaToken = normalize(fields, "recaptchaToken");
    const captcha = await verifyRecaptcha(recaptchaToken);
    if (!captcha.ok) return res.status(400).json({ error: "Invalid reCAPTCHA" });

    let palm = null;
    if (files.palmImage?.filepath) {
      palm = await analyzePalm({
        imageDescription: "Palm Image",
        handMeta: {}
      });
    }

    const enginesInput = {
      palm,
      numerology: isPersonal
        ? { fullName: normalize(fields, "fullName"), dateOfBirth: normalize(fields, "birthDate") }
        : null,
      astrology: isPersonal
        ? {
            birthDate: normalize(fields, "birthDate"),
            birthTime: normalize(fields, "birthTime"),
            birthLocation: normalize(fields, "birthPlace")
          }
        : null
    };

    const insights = await generateInsights({ question, enginesInput });

    // Always return short answer
    const shortAnswer = insights.shortAnswer || "No answer generated.";

    // PERSONAL MODE → send full PDF by email
    if (isPersonal && email) {
      const html = `
        <h1>Your Personal Spiritual Report</h1>
        <pre>${JSON.stringify(insights, null, 2)}</pre>
      `;
      const pdf = await generatePDFBufferFromHTML(html);

      await sendEmailHTML({
        to: email,
        subject: "Your Personal Spiritual Report",
        html: "<p>Your full report is attached.</p>",
        attachments: [{ filename: "spiritual-report.pdf", content: pdf }]
      });
    }

    return res.status(200).json({
      ok: true,
      mode: isPersonal ? "personal" : "technical",
      shortAnswer,
      insights
    });

  } catch (err) {
    console.error("SPIRITUAL ERROR:", err);
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
}
