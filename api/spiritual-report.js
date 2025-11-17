// /api/spiritual-report.js

import formidable from "formidable";
import fs from "fs";
import { verifyRecaptcha } from "./utils/verify-recaptcha.js";
import { classifyQuestion } from "./utils/classify-question.js";
import { analyzePalmImage } from "./utils/analyze-palm.js";
import { generateInsights } from "./utils/generate-insights.js";
import { generatePDF } from "./utils/generate-pdf.js";
import { sendEmailHTML } from "./utils/send-email.js";

export const config = { api: { bodyParser: false } };

function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    // -------------------------------
    // Parse form data
    // -------------------------------
    const form = formidable({ keepExtensions: true, allowEmptyFiles: true });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, f, fi) => {
        if (err) reject(err);
        else resolve({ fields: f, files: fi });
      });
    });

    const {
      question,
      fullName,
      birthDate,
      birthTime,
      birthPlace,
      email,
      isPersonal,
      recaptchaToken,
    } = fields;

    if (!question)
      return res.status(400).json({ ok: false, error: "Question required" });

    // -------------------------------
    // recaptcha
    // -------------------------------
    const captcha = await verifyRecaptcha(recaptchaToken);
    if (!captcha.ok)
      return res.status(403).json({ ok: false, error: "reCAPTCHA failed" });

    // -------------------------------
    // Palmistry
    // -------------------------------
    const palmImagePath = files?.palmImage?.filepath || null;
    const palmistryData = await analyzePalmImage(palmImagePath);

    // -------------------------------
    // Intent classification
    // -------------------------------
    const classification = await classifyQuestion(question);
    const safeIntent = classification?.intent || "general";

    const personalMode = isPersonal === "yes";

    // -------------------------------
    // Generate insights
    // -------------------------------
    const insights = await generateInsights({
      question,
      isPersonal: personalMode,
      fullName,
      birthDate,
      birthTime,
      birthPlace,
      classify: { ...classification, intent: safeIntent },
      palmistryData,
      technicalMode: !personalMode,
    });

    if (!insights.ok)
      return res.status(500).json({
        ok: false,
        error: "Insight generation failed",
      });

    // ===============================
    // PERSONAL → PDF + EMAIL
    // ===============================
    if (personalMode) {
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
        palmistry: insights.palmistry,
      });

      // 🔥 FIXED: use sendEmailHTML
      const emailResult = await sendEmailHTML({
        to: email,
        subject: "Your Personal Spiritual Report",
        html: `<p>Your detailed personal report is attached.</p>`,
        attachments: [{ filename: "spiritual-report.pdf", content: pdfBuffer }],
      });

      if (!emailResult.success) {
        console.error("Email failure:", emailResult);
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
        pdfEmailed: true,
        intent: safeIntent,
      });
    }

    // ===============================
    // TECHNICAL → summary only
    // ===============================
    return res.status(200).json({
      ok: true,
      mode: "technical",
      shortAnswer: insights.shortAnswer,
      keyPoints: insights.keyPoints,
      explanation: insights.explanation,
      recommendations: insights.recommendations,
      pdfEmailed: false,
      intent: safeIntent,
    });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
