// /api/detailed-report.js — PREMIUM PDF + EMAIL ENGINE
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const config = { api: { bodyParser: false } };

import formidable from "formidable";
import fs from "fs";

import { normalize, validateUploadedFile, verifyRecaptcha, sendEmailHTML } from "../lib/utils.js";
import { generateInsights } from "../lib/insights.js";
import { generatePDF } from "../lib/pdf.js";

export default async function handler(req, res) {

  /* ===========================
     CORS
  =========================== */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Not allowed" });

  /* ===========================
     PARSE FORM
  =========================== */
  const form = formidable({
    multiples: false,
    maxFileSize: 20 * 1024 * 1024,
    keepExtensions: true
  });

  let fields = {}, files = {};
  try {
    ({ fields, files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fl) =>
        err ? reject(err) : resolve({ fields: f, files: fl })
      )
    ));
  } catch (err) {
    return res.status(400).json({ error: "Bad form data", detail: String(err) });
  }

  /* ===========================
     NORMALIZE FIELDS
  =========================== */
  const fullName     = normalize(fields, "fullName");
  const email        = normalize(fields, "email");
  const dateOfBirth  = normalize(fields, "dateOfBirth");
  const timeOfBirth  = normalize(fields, "timeOfBirth");
  const birthPlace   = normalize(fields, "birthPlace");
  const latitude     = normalize(fields, "latitude");
  const longitude    = normalize(fields, "longitude");
  const gender       = normalize(fields, "gender");
  const question     = normalize(fields, "question");
  const handSide     = normalize(fields, "handSide") || "left";

  if (!fullName || !email || !dateOfBirth) {
    return res.status(400).json({
      error: "Missing required: fullName, email, dateOfBirth"
    });
  }

  /* ===========================
     RECAPTCHA (TOGGLE SAFE)
  =========================== */
  const TOGGLE = process.env.RECAPTCHA_TOGGLE || "false";
  if (TOGGLE !== "false") {
    const token = normalize(fields, "recaptchaToken");
    const r = await verifyRecaptcha(token, req.headers["x-forwarded-for"]);
    if (!r.ok) return res.status(400).json({ error: "reCAPTCHA failed", detail: r });
  }

  /* ===========================
     PALM IMAGE (OPTIONAL)
  =========================== */
  let handImageBase64 = null;
  if (files?.handImage) {
    const file = Array.isArray(files.handImage) ? files.handImage[0] : files.handImage;
    const v = validateUploadedFile(file);
    if (!v.ok) return res.status(400).json({ error: v.error });

    const buf = fs.readFileSync(file.filepath);
    handImageBase64 = buf.toString("base64");
  }

  /* ===========================
     BUILD PERSON OBJECT
  =========================== */
  const person = {
    fullName,
    email,
    dateOfBirth,
    timeOfBirth,
    birthPlace,
    latitude: latitude ? parseFloat(latitude) : undefined,
    longitude: longitude ? parseFloat(longitude) : undefined,
    gender
  };

  /* ===========================
     RUN PREMIUM ENGINES
  =========================== */
  let insights, pdfBuffer;
  try {
    insights = await generateInsights({
      person,
      question,
      handImageBase64,
      handSide
    });

    pdfBuffer = await generatePDF(insights);
  } catch (err) {
    console.error("❌ Premium Engine Failure:", err);
    return res.status(500).json({ error: "Premium generation failed", detail: err.message });
  }

  /* ===========================
     SEND PREMIUM EMAIL
  =========================== */
  const html = `
    <div style="font-family: system-ui, sans-serif">
      <h2>Your Premium Spiritual Report</h2>
      <p>Hi ${fullName},</p>
      <p>Your complete astrology, numerology and palmistry report is attached as a PDF.</p>
      <p>Thank you for trusting this process.</p>
      <br/>
      <p>— Melodie</p>
    </div>
  `;

  const emailOut = await sendEmailHTML({
    to: email,
    subject: "Your Premium Spiritual Report",
    html,
    attachments: [{
      filename: "premium-spiritual-report.pdf",
      content: pdfBuffer
    }]
  });

  if (!emailOut.success) {
    return res.status(500).json({
      error: "Email failed",
      detail: emailOut.error
    });
  }

  return res.json({
    ok: true,
    message: "Premium PDF generated and emailed successfully"
  });
}
