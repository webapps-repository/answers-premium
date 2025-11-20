// /api/technical-report.js
import formidable from "formidable";
import fs from "fs";

import { generateInsights, generateTechnicalReportHTML } from "../lib/insights.js";
import { generatePDFBufferFromHTML } from "../lib/pdf.js";
import { verifyRecaptcha, sendEmailHTML, validateUploadedFile } from "../lib/utils.js";

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
    const form = formidable({ keepExtensions: true, allowEmptyFiles: true, multiples: false });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, f, fi) => (err ? reject(err) : resolve({ fields: f, files: fi })));
    });

    const email = (fields.email || "").toString().trim();
    const question = (fields.question || "").toString().trim();
    const recaptcha = await verifyRecaptcha(fields.recaptchaToken);

    if (!recaptcha.ok)
      return res.status(403).json({ ok: false, error: "reCAPTCHA failed" });

    if (!email) return res.status(400).json({ ok: false, error: "Email required" });
    if (!question) return res.status(400).json({ ok: false, error: "Question required" });

    // Optional tech file
    let fileBuffer = null;
    if (files?.techFile?.filepath && fs.existsSync(files.techFile.filepath)) {
      const safe = validateUploadedFile(files.techFile);
      if (!safe.ok) {
        fs.unlinkSync(files.techFile.filepath);
        return res.status(400).json({ ok: false, error: safe.error });
      }
      fileBuffer = fs.readFileSync(files.techFile.filepath);
      fs.unlinkSync(files.techFile.filepath);
    }

    // Insights
    const insights = await generateInsights({
      question,
      meta: { email },
      enginesInput: { palm: null }
    });

    // HTML → PDF
    const html = generateTechnicalReportHTML(insights);
    const pdfBuffer = await generatePDFBufferFromHTML(html);

    // Email
    await sendEmailHTML({
      to: email,
      subject: "Your Technical Report",
      html: `<p>Your detailed technical report is attached.</p>`,
      attachments: [
        {
          filename: "technical-report.pdf",
          type: "application/pdf",
          content: pdfBuffer.toString("base64")
        }
      ]
    });

    return res.status(200).json({ ok: true, status: "sent" });

  } catch (err) {
    console.error("TECHNICAL REPORT ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
