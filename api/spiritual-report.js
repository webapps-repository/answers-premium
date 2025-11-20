// /api/spiritual-report.js
import formidable from "formidable";
import fs from "fs";

import { verifyRecaptcha, sendEmailHTML, validateUploadedFile } from "../lib/utils.js";
import { classifyQuestion } from "../lib/ai.js";
import { analyzePalm } from "../lib/engines.js";
import { generateInsights, generateTechnicalReportHTML } from "../lib/insights.js";
import { generatePDFBufferFromHTML } from "../lib/pdf.js";

export const config = { api: { bodyParser: false } };

function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function normalizeField(fields, key) {
  const v = fields?.[key];
  if (Array.isArray(v)) return v[0];
  return v ?? "";
}

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    // Parse form data
    const form = formidable({ keepExtensions: true, allowEmptyFiles: true, multiples: false });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, f, fi) => (err ? reject(err) : resolve({ fields: f, files: fi })));
    });

    const question = normalizeField(fields, "question")?.trim();
    const fullName = normalizeField(fields, "fullName");
    const birthDate = normalizeField(fields, "birthDate");
    const birthTime = normalizeField(fields, "birthTime");
    const birthPlace = normalizeField(fields, "birthPlace");
    const email = normalizeField(fields, "email");
    const isPersonalFlag = normalizeField(fields, "isPersonal");
    const recaptchaToken =
      normalizeField(fields, "recaptchaToken") ||
      normalizeField(fields, "g-recaptcha-response");

    if (!question) return res.status(400).json({ ok: false, error: "Question required." });

    // Recaptcha
    const captcha = await verifyRecaptcha(recaptchaToken);
    if (!captcha.ok) return res.status(403).json({ ok: false, error: "reCAPTCHA failed" });

    // Palm
    let palmFile = files?.palmImage;
    let palmistryData = null;

    if (palmFile) {
      const val = validateUploadedFile(palmFile);
      if (val.ok) {
        const path = palmFile.filepath;
        const buf = fs.readFileSync(path);
        palmistryData = await analyzePalm({ imageDescription: "User Palm Image", handMeta: {}, buffer: buf });
      }
    }

    // Classification
    const classification = await classifyQuestion(question).catch(() => null);
    const safeIntent = classification?.intent || "general";

    // Personal mode?
    const isPersonal = ["yes", "true", "1", "on"].includes(String(isPersonalFlag).toLowerCase());

    // Insights
    const insights = await generateInsights({
      question,
      meta: { fullName, birthDate, birthTime, birthPlace },
      enginesInput: {
        palm: palmistryData,
        numerology: { fullName, dateOfBirth: birthDate },
        astrology: { birthDate, birthTime, birthLocation: birthPlace }
      }
    });

    // PERSONAL MODE → PDF + EMAIL
    if (isPersonal) {
      const html = generateTechnicalReportHTML(insights);
      const pdfBuffer = await generatePDFBufferFromHTML(html);

      if (email) {
        await sendEmailHTML({
          to: email,
          subject: "Your Personal Spiritual Report",
          html: `<p>Your spiritual report is attached.</p>`,
          attachments: [
            {
              filename: "spiritual-report.pdf",
              type: "application/pdf",
              content: pdfBuffer.toString("base64")
            }
          ]
        });
      }

      return res.status(200).json({
        ok: true,
        mode: "personal",
        emailed: Boolean(email),
        intent: safeIntent,
        insights
      });
    }

    // TECHNICAL MODE → JSON only
    return res.status(200).json({
      ok: true,
      mode: "technical",
      emailed: false,
      intent: safeIntent,
      insights
    });

  } catch (err) {
    console.error("SPIRITUAL REPORT ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
