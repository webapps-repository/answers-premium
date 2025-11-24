// /api/spiritual-report.js — Stage-3 (HTML-only, Clean Output)

import formidable from "formidable";
import { normalize, validateUploadedFile, verifyRecaptcha, sendEmailHTML } from "../lib/utils.js";
import { classifyQuestion } from "../lib/ai.js";
import { runAllEngines } from "../lib/engines.js";
import { buildSummaryHTML, buildPersonalEmailHTML } from "../lib/insights.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {

  // ----------------------------------------
  // 0) CORS — MUST COME BEFORE ANYTHING ELSE
  // ----------------------------------------
  res.setHeader("Access-Control-Allow-Origin", "*"); // lock to Shopify domain later
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({ success: true, message: "OK" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  /* ----------------------------------------------------------
     Parse multipart form-data
  ---------------------------------------------------------- */
  const form = formidable({
    multiples: false,
    maxFileSize: 12 * 1024 * 1024
  });

  let fields, files;

  try {
    ({ fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, f, fl) => {
        if (err) reject(err);
        else resolve({ fields: f, files: fl });
      });
    }));
  } catch (err) {
    console.error("❌ Form parse error:", err);
    return res.status(400).json({ error: "Bad form data" });
  }

  /* ----------------------------------------------------------
     Normalize inputs
  ---------------------------------------------------------- */
  const question = normalize(fields, "question");
  const isPersonal = String(normalize(fields, "isPersonal")).toLowerCase() === "true";
  const recaptchaToken = normalize(fields, "recaptchaToken");

  if (!question)
    return res.status(400).json({ error: "Missing question" });

  /* ----------------------------------------------------------
     reCAPTCHA verify
  ---------------------------------------------------------- */
  const rec = await verifyRecaptcha(recaptchaToken, req.headers["x-forwarded-for"]);
  if (!rec.ok)
    return res.status(400).json({ error: "Recaptcha failed", rec });

  /* ----------------------------------------------------------
     Classification
  ---------------------------------------------------------- */
  let cls;
  try {
    cls = await classifyQuestion(question);
  } catch (err) {
    console.error("❌ classify error:", err);
    cls = { type: "technical", confidence: 0.5 };
  }

  /* ----------------------------------------------------------
     Optional file (technical or palm)
  ---------------------------------------------------------- */
  let uploadedFile = null;

  if (files?.technicalFile) uploadedFile = files.technicalFile;
  if (files?.palmImage) uploadedFile = files.palmImage;

  if (uploadedFile) {
    const valid = validateUploadedFile(uploadedFile);
    if (!valid.ok)
      return res.status(400).json({ error: valid.error });
  }

  /* ----------------------------------------------------------
     Run all engines (astrology, numerology, palmistry, triad)
  ---------------------------------------------------------- */
  let enginesOut;
  try {
    enginesOut = await runAllEngines({
      question,
      mode: isPersonal ? "personal" : cls.type,
      uploadedFile
    });
  } catch (err) {
    console.error("❌ engine error:", err);
    return res.status(500).json({ error: "Engine failure" });
  }

  /* ----------------------------------------------------------
     Build short HTML summary (CLEAN SAFE MARKUP)
  ---------------------------------------------------------- */
  const shortHTML = buildSummaryHTML({
    classification: cls,
    engines: enginesOut,
    question
  });

  /* ----------------------------------------------------------
     PERSONAL MODE → Email full HTML report immediately
  ---------------------------------------------------------- */
  if (isPersonal) {
    const email = normalize(fields, "email");
    const fullName = normalize(fields, "fullName");
    const birthDate = normalize(fields, "birthDate");
    const birthTime = normalize(fields, "birthTime");
    const birthPlace = normalize(fields, "birthPlace");

    if (!email)
      return res.status(400).json({ error: "Missing email" });

    const fullHTML = buildPersonalEmailHTML({
      question,
      engines: enginesOut,
      fullName,
      birthDate,
      birthTime,
      birthPlace
    });

    // Send HTML email
    await sendEmailHTML({
      to: email,
      subject: "Your Personal AI Insight Report",
      html: fullHTML
    });

    return res.json({
      ok: true,
      mode: "personal",
      shortAnswer: shortHTML
    });
  }

  /* ----------------------------------------------------------
     TECHNICAL MODE → Return summary; full report via /detailed
  ---------------------------------------------------------- */
  return res.json({
    ok: true,
    mode: "technical",
    shortAnswer: shortHTML
  });
}
