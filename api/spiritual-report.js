// /api/spiritual-report.js
// Handles both personal & technical spiritual reports

import formidable from "formidable";
import { verifyRecaptcha } from "./utils/verify-recaptcha.js";
import { classifyQuestion } from "./utils/classify-question.js";
import { analyzePalmImage } from "./utils/analyze-palm.js";
import { generateInsights } from "./utils/generate-insights.js";
import { generatePDF } from "./utils/generate-pdf.js";
import { sendEmailHTML } from "./utils/send-email.js";

export const config = { api: { bodyParser: false } };

// Flatten Date
function f(v) {
  return Array.isArray(v) ? v[0] : v || "";
}

// CORS
function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // ------------------------------
    // Parse FormData
    // ------------------------------
    const form = formidable({
      keepExtensions: true,
      allowEmptyFiles: true,
      multiples: false
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, f, fl) => {
        if (err) reject(err);
        else resolve({ fields: f, files: fl });
      });
    });

    // SAFE INITIAL VALUES
    const question      = f(fields.question);
    const fullName      = f(fields.fullName);
    const birthDate     = f(fields.birthDate);
    const birthTime     = f(fields.birthTime);
    const birthPlace    = f(fields.birthPlace);
    const email         = f(fields.email);
    const isPersonal    = f(fields.isPersonal);
    const recaptchaToken= f(fields.recaptchaToken);

    if (!question) return res.status(400).json({ ok: false, error: "Question required" });

    // Normalize isPersonal
    const personalMode =
      String(isPersonal) === "true" ||
      String(isPersonal) === "1" ||
      String(isPersonal).toLowerCase() === "yes";

    // Normalize recaptcha token
    const token = Array.isArray(recaptchaToken)
      ? recaptchaToken[0]
      : recaptchaToken;

    // ------------------------------
    // Verify reCAPTCHA
    // ------------------------------
    const captcha = await verifyRecaptcha(token);
    if (!captcha.ok) {
      return res.status(403).json({ ok: false, error: "reCAPTCHA failed" });
    }

    // ------------------------------
    // Palmistry
    // ------------------------------
    const palmImagePath = files?.palmImage?.filepath || null;
    const palmistryData = await analyzePalmImage(palmImagePath);

    // ------------------------------
    // Classification
    // ------------------------------
    const classification = await classifyQuestion(question);
    const safeIntent = classification?.intent || "general";

    // ------------------------------
    // Generate insights
    // ------------------------------
    const insights = await generateInsights({
      question,
      isPersonal: personalMode,
      fullName,
      birthDate,
      birthTime,
      birthPlace,
      classify: classification,
      palmistryData,
      technicalMode: !personalMode,
    });

    if (!insights.ok) {
      return res.status(500).json({
        ok: false,
        error: "Insight generation failed",
      });
    }

    // ------------------------------
    // PERSONAL REPORT — Auto PDF + Email
    // ------------------------------
    if (personalMode) {
      if (!email) {
        return res.status(400).json({ ok: false, error: "Email required" });
      }

      const pdfBuffer = await generatePDF({
        mode: "personal",
        question,
        fullName,
        birthDate,
        birthTime,
        birthPlace,
        insights,
        astrology: insights.astrology,
        numerology: insights.numerology,
        palmistry: insights.palmistry
      });

      const emailResult = await sendEmailHTML({
        to: email,
        subject: "Your Personal Spiritual Report",
        html: `<p>Your detailed personal report is attached.</p>`,
        attachments: [
          { filename: "spiritual-report.pdf", content: pdfBuffer }
        ]
      });

      if (!emailResult.success) {
        console.error("EMAIL FAILURE:", emailResult);
        return res.status(500).json({
          ok: false,
          error: "Email failed",
          detail: emailResult.error,
        });
      }

      return res.status(200).json({
        ok: true,
        mode: "personal",
        shortAnswer: insights.shortAnswer,
        intent: safeIntent,
        pdfEmailed: true
      });
    }

    // ------------------------------
    // TECHNICAL REPORT — summary only
    // ------------------------------
    return res.status(200).json({
      ok: true,
      mode: "technical",
      shortAnswer: insights.shortAnswer,
      keyPoints: insights.keyPoints,
      explanation: insights.explanation,
      recommendations: insights.recommendations,
      intent: safeIntent,
      pdfEmailed: false
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
