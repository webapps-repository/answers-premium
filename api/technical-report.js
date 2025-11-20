// /api/technical-report.js
import formidable from "formidable";
import fs from "fs";
import { generateInsights } from "../lib/insights.js";
import { generatePDFBufferFromHTML } from "../lib/pdf.js";
import { verifyRecaptcha, sendEmailHTML, validateUploadedFile } from "../lib/utils.js";

export const config = { api: { bodyParser: false } };

// Unified CORS
function applyCORS(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}

export default async function handler(req, res) {
  if (applyCORS(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const form = formidable({ keepExtensions: true });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, f, fi) => (err ? reject(err) : resolve({ fields: f, files: fi })));
    });

    const question = String(fields.question || "").trim();
    const email = String(fields.email || "").trim();

    if (!question) return res.status(400).json({ ok: false, error: "Missing question" });
    if (!email)    return res.status(400).json({ ok: false, error: "Missing email" });

    const techFile = files?.techFile;
    let buffer = null;

    if (techFile?.filepath) {
      const safe = validateUploadedFile(techFile);
      if (!safe.ok) return res.status(400).json({ ok: false, error: safe.error });
      buffer = fs.readFileSync(techFile.filepath);
    }

    const insights = await generateInsights({
      question,
      enginesInput: { palm: buffer ? { buffer } : null },
      meta: { email }
    });

    const html = generateTechnicalReportHTML(insights);
    const pdf = await generatePDFBufferFromHTML(html);

    await sendEmailHTML({
      to: email,
      subject: "Your Technical Report",
      html: "<p>Your technical PDF report is attached.</p>",
      attachments: [
        { filename: "technical-report.pdf", type: "application/pdf", content: pdf.toString("base64") }
      ]
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Technical report error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
