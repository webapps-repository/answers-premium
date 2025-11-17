// /api/spiritual-report.js
// Main endpoint for handling both personal and technical spiritual reports

import formidable from "formidable";
import fs from "fs";
import path from "path";

import { verifyRecaptcha } from "./utils/verify-recaptcha.js";
import { classifyQuestion } from "./utils/classify-question.js";
import { analyzePalmImage } from "./utils/analyze-palm.js";
import { generateInsights } from "./utils/generate-insights.js";
import { generatePDF } from "./utils/generate-pdf.js";
import { sendEmail } from "./utils/send-email.js";

// Enable Vercel to parse multipart form uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// -------------------------------------------------------------
// MAIN HANDLER
// -------------------------------------------------------------
export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // -------------------------------------------------------------
    // 1. Parse FormData
    // -------------------------------------------------------------
    const form = formidable({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 8 * 1024 * 1024, // 8 MB
      allowEmptyFiles: true
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
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
      recaptchaToken
    } = fields;

    // -------------------------------------------------------------
    // 2. Validate required fields
    // -------------------------------------------------------------
    if (!question) {
      return res.status(400).json({ ok: false, error: "Question is required." });
    }

    // -------------------------------------------------------------
    // 3. Verify reCAPTCHA
    // -------------------------------------------------------------
    const captcha = await verifyRecaptcha(recaptchaToken);
    if (!captcha.ok) {
      return res.status(403).json({
        ok: false,
        error: "reCAPTCHA failed",
        detail: captcha.error
      });
    }

    // -------------------------------------------------------------
    // 4. Palmistry image (optional)
    // -------------------------------------------------------------
    const palmImagePath = files?.palmImage?.filepath || null;
    const palmistryData = await analyzePalmImage(palmImagePath);

    // -------------------------------------------------------------
    // 5. Classification: detect intent (love, money, career, etc.)
    // -------------------------------------------------------------
    const classification = await classifyQuestion(question);

    // User override:
    const personalMode = String(isPersonal) === "yes";

    // -------------------------------------------------------------
    // 6. Generate Insights (Personal or Technical)
    // -------------------------------------------------------------
    const insights = await generateInsights({
      question,
      isPersonal: personalMode,
      fullName,
      birthDate,
      birthTime,
      birthPlace,
      classify: classification,
      palmistryData,
      technicalMode: !personalMode
    });

    if (!insights.ok) {
      return res.status(500).json({
        ok: false,
        error: "Insight generation failed",
        detail: insights.error
      });
    }

    // -------------------------------------------------------------
    // 7. PERSONAL MODE → CREATE PDF + SEND EMAIL
    // -------------------------------------------------------------
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
        palmistry: insights.palmistry
      });

      // Send email with PDF attached
      const emailResult = await sendEmail({
        to: email,
        subject: "Your Personal Spiritual Report",
        html: `<p>Your detailed spiritual report is attached.</p>`,
        attachments: [
          {
            filename: "spiritual-report.pdf",
            content: pdfBuffer
          }
        ]
      });

      if (!emailResult.ok) {
        return res.status(500).json({
          ok: false,
          error: "Email failed",
          detail: emailResult.error
        });
      }

      // Respond with summary + confirmation
      return res.status(200).json({
        ok: true,
        mode: "personal",
        shortAnswer: insights.shortAnswer,
        intent: classification.intent,
        pdfEmailed: true
      });
    }

    // -------------------------------------------------------------
    // 8. TECHNICAL MODE → NO PDF YET
    // -------------------------------------------------------------
    return res.status(200).json({
      ok: true,
      mode: "technical",
      shortAnswer: insights.shortAnswer,
      keyPoints: insights.keyPoints,
      explanation: insights.explanation,
      recommendations: insights.recommendations,
      intent: classification.intent,
      pdfEmailed: false
    });

  } catch (err) {
    console.error("Server error:", err);

    return res.status(500).json({
      ok: false,
      error: "Server error",
      detail: err.message
    });
  }
}
