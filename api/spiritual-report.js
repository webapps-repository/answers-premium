// /api/spiritual-report.js
import formidable from "formidable";
import fs from "fs";
import { verifyRecaptcha, sendEmailHTML, validateUploadedFile } from "../lib/utils.js";
import { classifyQuestion } from "../lib/ai.js";
import { analyzePalm } from "../lib/engines.js";
import { generateInsights } from "../lib/insights.js";
import { generatePDFBufferFromHTML } from "../lib/pdf.js";

export const config = { api: { bodyParser: false } };

// Unified CORS
function applyCORS(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}

function norm(fields, key) {
  const v = fields?.[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function handler(req, res) {
  if (applyCORS(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const form = formidable({ keepExtensions: true });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, f, fi) => (err ? reject(err) : resolve({ fields: f, files: fi })));
    });

    const question = norm(fields, "question")?.trim();
    if (!question) return res.status(400).json({ ok: false, error: "Missing question" });

    const recaptcha = norm(fields, "recaptchaToken");
    const recapResult = await verifyRecaptcha(recaptcha);
    if (!recapResult.ok) return res.status(403).json({ ok: false, error: "reCAPTCHA failed" });

    const email = norm(fields, "email");
    const fullName = norm(fields, "fullName");
    const birthDate = norm(fields, "birthDate");
    const birthTime = norm(fields, "birthTime");
    const birthPlace = norm(fields, "birthPlace");

    // Palm
    let palmData = null;
    const palm = files?.palmImage;
    if (palm?.filepath) {
      const safe = validateUploadedFile(palm);
      if (!safe.ok) return res.status(400).json({ ok: false, error: safe.error });
      palmData = await analyzePalm({ buffer: fs.readFileSync(palm.filepath) });
    }

    const classification = await classifyQuestion(question).catch(() => ({ type: "general" }));
    const insights = await generateInsights({
      question,
      meta: { email, fullName },
      enginesInput: {
        palm: palmData ? { buffer: palmData } : null,
        numerology: { fullName, dateOfBirth: birthDate },
        astrology: { birthDate, birthTime, birthLocation: birthPlace }
      }
    });

    // Personal PDF mode
    if (norm(fields, "isPersonal") === "true") {
      const html = `
        <h1>Personal Spiritual Report</h1>
        <p>${insights.synthesis?.summary}</p>
      `;

      const pdf = await generatePDFBufferFromHTML(html);

      if (email) {
        const emailResult = await sendEmailHTML({
          to: email,
          subject: "Your Personal Spiritual Report",
          html: "<p>Your PDF report is attached.</p>",
          attachments: [{ filename: "spiritual-report.pdf", type: "application/pdf", content: pdf.toString("base64") }]
        });

        if (!emailResult.ok) return res.status(500).json({ ok: false, error: "Email failed" });
      }

      return res.status(200).json({ ok: true, pdfEmailed: !!email });
    }

    // Technical mode
    return res.status(200).json({ ok: true, insights });
  } catch (err) {
    console.error("Spiritual report error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
