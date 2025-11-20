// /api/technical-report.js
// Wrapper endpoint (alias) for generating technical PDFs

import formidable from "formidable";
import fs from "fs";

import { generateInsights } from "@/lib/insights.js";
import { generatePDF } from "@/lib/pdf.js";
import {
  sendEmailHTML,
  validateUploadedFile
} from "@/lib/utils.js";

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
    let email = "";
    let question = "";
    let techFilePath = null;

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

    email = String(fields.email || "").trim();
    question = String(fields.question || "").trim();

    if (files?.techFile?.filepath && fs.existsSync(files.techFile.filepath)) {
      const safe = validateUploadedFile(files.techFile);
      if (!safe.ok) {
        fs.unlinkSync(files.techFile.filepath);
        return res.status(400).json({ ok: false, error: safe.error });
      }
      techFilePath = files.techFile.filepath;
    }

    if (!question)
      return res.status(400).json({ ok: false, error: "Question required" });

    if (!email)
      return res.status(400).json({ ok: false, error: "Email required" });

    const insights = await generateInsights({
      question,
      isPersonal: false,
      classify: { type: "technical", intent: "technical" },
      palmistryData: null,
      technicalMode: true,
      techFilePath
    });

    if (!insights.ok) {
      if (techFilePath && fs.existsSync(techFilePath))
        fs.unlinkSync(techFilePath);

      return res.status(500).json({
        ok: false,
        error: "Insight generation failed",
        detail: insights.error,
      });
    }

    if (techFilePath && fs.existsSync(techFilePath))
      fs.unlinkSync(techFilePath);

    const pdfBuffer = await generatePDF({
      mode: "technical",
      question,
      insights,
    });

    const emailResult = await sendEmailHTML({
      to: email,
      subject: "Your Technical Report",
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
      status: "sent"
    });

  } catch (err) {
    console.error("TECH REPORT ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error",
    });
  }
}

