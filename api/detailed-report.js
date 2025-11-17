// /api/detailed-report.js
// Generates a full technical PDF report and emails it to the user

import { generateInsights } from "./utils/generate-insights.js";
import { generatePDF } from "./utils/generate-pdf.js";
import { sendEmail } from "./utils/send-email.js";

function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const { question, email } = req.body;

    // ---------------------------------------------------------
    // Validation
    // ---------------------------------------------------------
    if (!question) {
      return res
        .status(400)
        .json({ ok: false, error: "Question is required." });
    }

    if (!email) {
      return res.status(400).json({ ok: false, error: "Email is required." });
    }

    // ---------------------------------------------------------
    // Generate technical insights
    // ---------------------------------------------------------
    const insights = await generateInsights({
      question,
      technicalMode: true,
      isPersonal: false
    });

    if (!insights.ok) {
      return res.status(500).json({
        ok: false,
        error: "Insight generation failed",
        detail: insights.error,
      });
    }

    // ---------------------------------------------------------
    // Generate the technical PDF
    // ---------------------------------------------------------
    const pdfBuffer = await generatePDF({
      mode: "technical",
      question,
      insights
    });

    // ---------------------------------------------------------
    // Email the PDF
    // ---------------------------------------------------------
    const emailResult = await sendEmail({
      to: email,
      subject: "Your Detailed Technical Report",
      html: `<p>Your detailed technical analysis is attached.</p>`,
      attachments: [
        {
          filename: "technical-report.pdf",
          content: pdfBuffer,
        },
      ],
    });

    if (!emailResult.ok) {
      return res.status(500).json({
        ok: false,
        error: "Email failed",
        detail: emailResult.error,
      });
    }

    // ---------------------------------------------------------
    // Success Response
    // ---------------------------------------------------------
    return res.status(200).json({
      ok: true,
      pdfEmailed: true,
      shortAnswer: insights.shortAnswer,
      stampedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Detailed report error:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error",
      detail: err.message,
    });
  }
}
