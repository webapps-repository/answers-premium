// /api/detailed-report.js
// Generates the PDF for technical questions

import { generateInsights } from "./utils/generate-insights.js";
import { generatePDF } from "./utils/generate-pdf.js";
import { sendEmailHTML } from "./utils/send-email.js";

function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { question, email } = req.body;

    if (!question) return res.status(400).json({ ok: false, error: "Question required" });
    if (!email) return res.status(400).json({ ok: false, error: "Email required" });

    const insights = await generateInsights({
      question,
      technicalMode: true,
      isPersonal: false
    });

    if (!insights.ok) {
      return res.status(500).json({
        ok: false,
        error: "Insight generation failed",
        detail: insights.error
      });
    }

    const pdfBuffer = await generatePDF({
      mode: "technical",
      question,
      insights
    });

    const emailResult = await sendEmailHTML({
      to: email,
      subject: "Your Detailed Technical Report",
      html: `<p>Your detailed technical report is attached.</p>`,
      attachments: [
        { filename: "technical-report.pdf", content: pdfBuffer }
      ]
    });

    if (!emailResult.success) {
      return res.status(500).json({
        ok: false,
        error: "Email failed",
        detail: emailResult.error
      });
    }

    return res.status(200).json({
      ok: true,
      pdfEmailed: true,
      shortAnswer: insights.shortAnswer,
      stampedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error("DETAILED REPORT ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
