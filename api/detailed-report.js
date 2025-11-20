// /api/detailed-report.js
import formidable from "formidable";
import fs from "fs";
import { validateUploadedFile, verifyRecaptcha, sendEmailHTML } from "../lib/utils.js";
import { generateInsights, generateTechnicalReportHTML } from "../lib/insights.js";
import { generatePDFBufferFromHTML } from "../lib/pdf.js";

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
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);

    const email       = fields.email?.[0]      || fields.email;
    const name        = fields.name?.[0]       || fields.name;
    const question    = fields.question?.[0]   || fields.question;
    const recaptcha   = fields.recaptchaToken?.[0] || fields.recaptchaToken;

    // Validate reCAPTCHA
    const recap = await verifyRecaptcha(recaptcha, req.headers["x-forwarded-for"]);
    if (!recap.ok) {
      return res.status(403).json({ error: "reCAPTCHA failed", details: recap });
    }

    // Handle uploaded file
    let uploadedFileBuffer = null;
    const uploadedFile = files?.upload || files?.file;

    if (uploadedFile) {
      const val = validateUploadedFile(uploadedFile);
      if (!val.ok) return res.status(400).json({ error: val.error });

      uploadedFileBuffer = fs.readFileSync(uploadedFile.filepath || uploadedFile.path);
    }

    // Build engines input
    const enginesInput = {
      palm: uploadedFileBuffer ? { buffer: uploadedFileBuffer } : null,
      numerology: {
        fullName: fields.fullName?.[0] || fields.fullName || name,
        dateOfBirth: fields.dateOfBirth?.[0] || fields.dateOfBirth
      },
      astrology: {
        birthDate: fields.birthDate?.[0] || fields.birthDate,
        birthTime: fields.birthTime?.[0] || fields.birthTime,
        birthLocation: fields.birthLocation?.[0] || fields.birthLocation
      }
    };

    // Generate insights
    const insights = await generateInsights({ question, meta: { email, name }, enginesInput });

    // Generate HTML
    const html = generateTechnicalReportHTML(insights);

    // Generate PDF
    const pdfBuffer = await generatePDFBufferFromHTML(html);

    // Email report
    if (email) {
      await sendEmailHTML({
        to: email,
        subject: "Your Technical Spiritual Report",
        html: `<p>Hi ${name || ""}, your PDF report is attached.</p>`,
        attachments: [
          {
            filename: "technical-report.pdf",
            content: pdfBuffer.toString("base64"),
            type: "application/pdf"
          }
        ]
      });
    }

    return res.status(200).json({ ok: true, emailed: !!email });
  } catch (err) {
    console.error("Detailed report error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

function parseForm(req) {
  const form = formidable({
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}
