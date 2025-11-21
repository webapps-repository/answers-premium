// /api/detailed-report.js
export const config = {
  api: { bodyParser: false },
  runtime: "nodejs"
};

import formidable from "formidable";
import fs from "fs";

import {
  applyCORS,
  normalize,
  validateUploadedFile,
  verifyRecaptcha,
  sendEmailHTML
} from "../lib/utils.js";

import { generateInsights } from "../lib/insights.js";
import { generatePDFBufferFromHTML } from "../lib/pdf.js";

// Parse form safely
function parseForm(req) {
  const form = formidable({
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024
  });

  return new Promise((resolve, reject) =>
    form.parse(req, (err, f, files) =>
      err ? reject(err) : resolve({ fields: f, files })
    )
  );
}

export default async function handler(req, res) {
  if (applyCORS(req, res)) return;

  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { fields, files } = await parseForm(req);

    const email = normalize(fields, "email");
    const name = normalize(fields, "name");
    const question = normalize(fields, "question");

    if (!email) return res.status(400).json({ error: "Email required" });
    if (!question) return res.status(400).json({ error: "Question required" });

    // Recaptcha
    const recaptchaToken =
      normalize(fields, "recaptchaToken") ||
      normalize(fields, "g-recaptcha-response");

    const recaptcha = await verifyRecaptcha(recaptchaToken);

    if (!recaptcha.ok)
      return res.status(400).json({ error: "Invalid reCAPTCHA" });

    // File upload optional
    let uploadedBuffer = null;
    const uploaded = files.upload || files.file;

    if (uploaded) {
      const safe = validateUploadedFile(uploaded);
      if (!safe.ok) return res.status(400).json({ error: safe.error });

      uploadedBuffer = fs.readFileSync(uploaded.filepath);
    }

    // Build engines input
    const enginesInput = {
      palm: uploadedBuffer ? { imageDescription: "Palm Image", handMeta: {} } : null,
      numerology: {
        fullName: name,
        dateOfBirth: normalize(fields, "dateOfBirth")
      },
      astrology: {
        birthDate: normalize(fields, "birthDate"),
        birthTime: normalize(fields, "birthTime"),
        birthLocation: normalize(fields, "birthLocation")
      }
    };

    const insights = await generateInsights({
      question,
      meta: { email, name },
      enginesInput
    });

    const html = `
      <h1>Detailed Technical Report</h1>
      <p>Name: ${name}</p>
      <p>Email: ${email}</p>
      <pre>${JSON.stringify(insights, null, 2)}</pre>
    `;

    const pdfBuffer = await generatePDFBufferFromHTML(html);

    const emailResult = await sendEmailHTML({
      to: email,
      subject: "Your Detailed Technical Report",
      html: `<p>Your report is attached.</p>`,
      attachments: [
        { filename: "detailed-report.pdf", content: pdfBuffer }
      ]
    });

    if (!emailResult.success)
      return res.status(500).json({ error: "Email failed", detail: emailResult.error });

    return res.status(200).json({ ok: true, emailed: true });

  } catch (err) {
    console.error("DETAILED REPORT ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
