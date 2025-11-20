// /pages/api/detailed-report.js
import formidable from "formidable";
import fs from "fs";
import { validateUploadedFile, verifyRecaptcha, sendEmailHTML } from "../lib/utils";
import { generateInsights, generateTechnicalReportHTML } from "../lib/insights";
import { generatePDFBufferFromHTML } from "../lib/pdf";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);

    const email = fields.email?.[0] || fields.email;
    const name = fields.name?.[0] || fields.name;
    const question = fields.question?.[0] || fields.question;
    const recaptchaToken = fields.recaptchaToken?.[0] || fields.recaptchaToken;

    // 1) Validate reCAPTCHA
    const recaptcha = await verifyRecaptcha(recaptchaToken, req.headers["x-forwarded-for"]);
    if (!recaptcha.ok) {
      return res.status(400).json({ error: "reCAPTCHA failed", details: recaptcha });
    }

    // 2) Validate uploaded file (if any)
    const uploadedFile = files?.upload || files?.file;
    let uploadedFileBuffer = null;

    if (uploadedFile) {
      const val = validateUploadedFile(uploadedFile);
      if (!val.ok) {
        return res.status(400).json({ error: val.error });
      }

      const filepath = uploadedFile.filepath || uploadedFile.path;
      uploadedFileBuffer = fs.readFileSync(filepath);
    }

    // 3) Build engines input (adapt to your actual frontend form fields)
    const enginesInput = {
      palm: uploadedFileBuffer
        ? { imageDescription: "User palm image", handMeta: { fromFile: true } }
        : null,
      numerology: {
        fullName: fields.fullName?.[0] || fields.fullName || name,
        dateOfBirth: fields.dateOfBirth?.[0] || fields.dateOfBirth
      },
      astrology: {
        birthDate: fields.birthDate?.[0] || fields.birthDate || fields.dateOfBirth,
        birthTime: fields.birthTime?.[0] || fields.birthTime,
        birthLocation: fields.birthLocation?.[0] || fields.birthLocation
      }
    };

    // 4) Generate insights (all engines)
    const insights = await generateInsights({
      question,
      meta: { email, name },
      enginesInput
    });

    // 5) Generate technical HTML
    const html = generateTechnicalReportHTML(insights);

    // 6) Generate PDF
    const pdfBuffer = await generatePDFBufferFromHTML(html);

    // 7) Email PDF to user (if email provided)
    if (email) {
      await sendEmailHTML({
        to: email,
        subject: "Your Technical Spiritual Report",
        html: `
          <p>Hi ${name || ""},</p>
          <p>Your technical PDF report is attached.</p>
          <p>Love,<br/>Your Friendly Robot</p>
        `,
        attachments: [
          {
            content: pdfBuffer.toString("base64"),
            filename: "technical-report.pdf",
            type: "application/pdf",
            disposition: "attachment"
          }
        ]
      });
    }

    // 8) Respond to frontend
    return res.status(200).json({
      ok: true,
      emailed: Boolean(email),
      meta: { email, name },
      debug: { recaptcha }
    });
  } catch (err) {
    console.error("detailed-report API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function parseForm(req) {
  const form = formidable({
    keepExtensions: true,
    multiples: false,
    maxFileSize: 10 * 1024 * 1024
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}
