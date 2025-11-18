// /api/spiritual-report.js
// Main endpoint for handling BOTH personal + technical questions

import formidable from "formidable";

import { verifyRecaptcha } from "./utils/verify-recaptcha.js";
import { analyzePalmImage } from "./utils/analyze-palm.js";
import { generateInsights } from "./utils/generate-insights.js";
import { sendEmailHTML } from "./utils/send-email.js";

export const config = {
  api: { bodyParser: false }
};

function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function fieldToString(v) {
  if (Array.isArray(v)) return String(v[0] ?? "");
  return String(v ?? "");
}

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // -----------------------------------------
    // 1) Parse multipart/form-data
    // -----------------------------------------
    const form = formidable({ keepExtensions: true, allowEmptyFiles: true });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, f, fi) => {
        if (err) reject(err);
        else resolve({ fields: f, files: fi });
      });
    });

    const rawQuestion = fields.question;
    const rawFullName = fields.fullName;
    const rawBirthDate = fields.birthDate;
    const rawBirthTime = fields.birthTime;
    const rawBirthPlace = fields.birthPlace;
    const rawEmail = fields.email;
    const rawIsPersonal = fields.isPersonal;
    const rawRecaptcha = fields.recaptchaToken;

    const question = fieldToString(rawQuestion).trim();
    const fullName = fieldToString(rawFullName).trim();
    const birthDate = fieldToString(rawBirthDate).trim();
    const birthTime = fieldToString(rawBirthTime).trim();
    const birthPlace = fieldToString(rawBirthPlace).trim();
    const email = fieldToString(rawEmail).trim();
    const isPersonalStr = fieldToString(rawIsPersonal).trim().toLowerCase();
    const recaptchaToken = fieldToString(rawRecaptcha).trim();

    if (!question) {
      return res.status(400).json({ ok: false, error: "Question required" });
    }

    // -----------------------------------------
    // 2) Verify reCAPTCHA
    // -----------------------------------------
    const captcha = await verifyRecaptcha(recaptchaToken);
    if (!captcha.ok) {
      return res
        .status(403)
        .json({ ok: false, error: "reCAPTCHA failed", detail: captcha.error });
    }

    // -----------------------------------------
    // 3) Palmistry image (optional)
    // -----------------------------------------
    const palmImagePath = files?.palmImage?.filepath || null;
    const palmistryData = await analyzePalmImage(palmImagePath);

    // -----------------------------------------
    // 4) Decide mode
    // -----------------------------------------
    const personalMode =
      isPersonalStr === "yes" ||
      isPersonalStr === "true" ||
      isPersonalStr === "1";

    // -----------------------------------------
    // 5) Generate AI insights
    // -----------------------------------------
    const insights = await generateInsights({
      question,
      isPersonal: personalMode,
      fullName,
      birthDate,
      birthTime,
      birthPlace,
      palmistryData
    });

    if (!insights.ok) {
      return res.status(500).json({
        ok: false,
        error: "Insight generation failed",
        detail: insights.error || "Unknown"
      });
    }

    // =====================================================
    // 6) PERSONAL MODE → auto email PDF
    // =====================================================
    if (personalMode) {
      if (!email) {
        return res.status(400).json({
          ok: false,
          error: "Email is required for personal reports."
        });
      }

      const { generatePDF } = await import("./utils/generate-pdf.js");

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
        html: `<p>Your personal spiritual report is attached as a PDF.</p>`,
        attachments: [
          {
            filename: "personal-spiritual-report.pdf",
            content: pdfBuffer
          }
        ]
      });

      if (!emailResult.success) {
        console.error("EMAIL ERROR:", emailResult);
        return res.status(500).json({
          ok: false,
          error: "Email delivery failed",
          detail: emailResult.error
        });
      }

      return res.status(200).json({
        ok: true,
        mode: "personal",
        shortAnswer: insights.shortAnswer,
        intent: insights.intent || "general",
        pdfEmailed: true
      });
    }

    // =====================================================
    // 7) TECHNICAL MODE → just return rich JSON
    // =====================================================
    return res.status(200).json({
      ok: true,
      mode: "technical",
      shortAnswer: insights.shortAnswer,
      keyPoints: insights.keyPoints,
      explanation: insights.explanation,
      recommendations: insights.recommendations,
      intent: insights.intent || "general",
      pdfEmailed: false
    });
  } catch (err) {
    console.error("SERVER ERROR (spiritual-report):", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Server failure"
    });
  }
}
