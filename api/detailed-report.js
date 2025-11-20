// /api/detailed-report.js
// Generates a full TECHNICAL PDF and emails it on demand.

import formidable from "formidable";
import fs from "fs";

// NEW IMPORT PATHS (from /lib)
import { generateInsights } from "../lib/insights.js";
import { generatePDF } from "../lib/pdf.js";
import { verifyRecaptcha, sendEmailHTML, validateUploadedFile } from "../lib/utils.js";

export const config = { api: { bodyParser: false } };

// ------------------------------------------------------
function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
// ------------------------------------------------------

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    let email = "";
    let question = "";
    let techFilePath = null;

    const contentType = req.headers["content-type"] || "";

    // =====================================================
    // MULTIPART (FormData)
    // =====================================================
    if (contentType.includes("multipart/form-data")) {
      const form = formidable({
        keepExtensions: true,
        allowEmptyFiles: true,
        multiples: false,
      });

      const { fields, files } = await new Promise((resolve, reject) => {
        form.parse(req, (err, f, fi) => {
          if (err) reject(err);
          else resolve({ fields: f, files: fi });
        });
      });

      question = String(fields.question || "").trim();
      email = String(fields.email || "").trim();

      // Technical file (optional)
      if (files?.techFile?.filepath && fs.existsSync(files.techFile.filepath)) {
        const safe = validateUploadedFile(files.techFile);
        if (!safe.ok) {
          fs.unlinkSync(files.techFile.filepath);
          return res.status(400).json({ ok: false, error: safe.error });
        }
        techFilePath = files.techFile.filepath;
      }
    }

    // =====================================================
    // JSON BODY (from modal)
    // =====================================================
    else {
      const body = await new Promise((resolve) => {
        let data = "";
        req.on("data", (c) => (data += c));
        req.on("end", () => resolve(JSON.parse(data || "{}")));
      });

      question = String(body.question || "").trim();
      email = String(body.email || "").trim();
    }

    // =====================================================
    // VALIDATION
    // =====================================================
    if (!question) return res.status(400).json({ ok: false, error: "Question required" });
    if (!email) return res.status(400).json({ ok: false, error: "Email required" });

    // =====================================================
    // GENERATE TECHNICAL INSIGHTS
    // =====================================================
    const insights = await generateInsights({
      question,
      isPersonal: false,
      classify: { type: "technical", intent: "technical" },
      palmistryData: null,
      technicalMode: true,
      techFilePath
    });

    // Delete uploaded technical file (per user rules)
    if (techFilePath && fs.existsSync(techFilePath))
      fs.unlinkSync(techFilePath);

    if (!insights.ok) {
      return res.status(500).json({
        ok: false,
        error: "Insight generation failed",
        detail: insights.error,
      });
    }

    // =====================================================
    // GENERATE PDF
    // =====================================================
    const pdfBuffer = await generatePDF({
      mode: "technical",
      question,
      insights,
    });

    // =====================================================
    // SEND EMAIL
    // =====================================================
    const emailResult = await sendEmailHTML({
      to: email,
      subject: "Your Detailed Technical Report",
      html: `<p>Your detailed technical report is attached.</p>`,
      attachments: [
        { filename: "technical-report.pdf", content: pdfBuffer }
      ],
    });

    if (!emailResult.success) {
      return res.status(500).json({
        ok: false,
        error: "Email failed",
        detail: emailResult.error,
      });
    }

    return res.status(200).json({
      ok: true,
      pdfEmailed: true,
      emailStatus: "sent",
      sentAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error("DETAILED REPORT ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Server failure",
    });
  }
}
