// /api/detailed-report.js
// -----------------------------------------------------------
// Creates full technical PDF + emails to user
// -----------------------------------------------------------

import { generateInsights } from "./utils/generate-insights.js";
import { generatePDF } from "./utils/generate-pdf.js";
import { sendEmailHTML } from "./utils/send-email.js";

function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const { email, question } = req.body;

    if (!email || !question) {
      return res.status(400).json({
        ok: false,
        error: "Missing email or question.",
      });
    }

    // Get technical insights
    const insights = await generateInsights({
      question,
      technicalMode: true,
      isPersonal: false,
    });

    if (!insights.ok) {
      return res.status(500).json({
        ok: false,
        error: insights.error,
      });
    }

    // Build PDF
    const pdfBuffer = await generatePDF({
      mode: "technical",
      question,
      insights,
    });

    // Email
    const result = await sendEmailHTML({
      to: email,
      subject: "Your Detailed Technical Report",
      html: `<p>Your technical report is attached.</p>`,
      attachments: [
        {
          filename: "technical-report.pdf",
          content: pdfBuffer,
        },
      ],
    });

    if (!result.success) {
      return res.status(500).json({
        ok: false,
        error: result.error,
      });
    }

    res.status(200).json({ ok: true, pdfEmailed: true });
  } catch (err) {
    console.error("Detailed-report error:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
