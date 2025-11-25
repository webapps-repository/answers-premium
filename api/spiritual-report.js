// /api/spiritual-report.js — UPDATED WITH RECAPTCHA TOGGLE
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const config = { api: { bodyParser: false } };

import formidable from "formidable";
import {
  normalize,
  validateUploadedFile,
  verifyRecaptcha,
  sendEmailHTML
} from "../lib/utils.js";

import { classifyQuestion } from "../lib/ai.js";
import { runAllEngines } from "../lib/engines.js";
import {
  buildSummaryHTML,
  buildUniversalEmailHTML
} from "../lib/insights.js";

export default async function handler(req, res) {
  /* ----------------------------------------------------------
     SHOPIFY-SAFE CORS
  ---------------------------------------------------------- */
  const origin = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  /* ----------------------------------------------------------
     Parse multipart/form-data
  ---------------------------------------------------------- */
  const form = formidable({ multiples: false, maxFileSize: 12 * 1024 * 1024 });

  let fields, files;
  try {
    ({ fields, files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fl) =>
        err ? reject(err) : resolve({ fields: f, files: fl })
      )
    ));
  } catch (err) {
    console.error("❌ PARSE ERROR:", err);
    return res.status(400).json({ error: "Bad form data" });
  }

  /* ----------------------------------------------------------
     Extract & validate fields
  ---------------------------------------------------------- */
  const question = normalize(fields, "question");
  const email = normalize(fields, "email");
  const fullName = normalize(fields, "fullName");
  const birthDate = normalize(fields, "birthDate");
  const birthTime = normalize(fields, "birthTime");
  const birthPlace = normalize(fields, "birthPlace");

  const recaptchaToken =
    normalize(fields, "recaptchaToken") ||
    normalize(fields, "g-recaptcha-response") ||
    normalize(fields, "token");

  if (!question) return res.status(400).json({ error: "Missing question" });
  if (!email) return res.status(400).json({ error: "Missing email" });

  /* ----------------------------------------------------------
     RECAPTCHA TOGGLE LOGIC
  ---------------------------------------------------------- */
  const TOGGLE = process.env.RECAPTCHA_TOGGLE === "true" ? "true" : "false";

  if (TOGGLE === "false") {
    console.log("🔄 RECAPTCHA BYPASS ACTIVE (RECAPTCHA_TOGGLE=false)");
  } else {
    // Only enforce recaptcha when toggle=true
    const rec = await verifyRecaptcha(recaptchaToken, req.headers["x-forwarded-for"]);
    if (!rec.ok) {
      console.error("❌ RECAPTCHA FAIL:", rec);
      return res.status(400).json({ error: "reCAPTCHA failed", rec });
    }
  }

  /* ----------------------------------------------------------
     File validation (palm or technical)
  ---------------------------------------------------------- */
  const uploadedFile = files?.palmImage || files?.technicalFile || null;

  if (uploadedFile) {
    const valid = validateUploadedFile(uploadedFile);
    if (!valid.ok) return res.status(400).json({ error: valid.error });
  }

  /* ----------------------------------------------------------
     Question classification
  ---------------------------------------------------------- */
  let cls;
  try {
    cls = await classifyQuestion(question);
  } catch {
    cls = { type: "personal", confidence: 0.5 };
  }

  /* ----------------------------------------------------------
     Run all engines in personal mode
  ---------------------------------------------------------- */
  let enginesOut;
  try {
    enginesOut = await runAllEngines({
      question,
      mode: "personal",
      uploadedFile
    });
  } catch (err) {
    console.error("❌ ENGINE ERROR:", err);
    return res.status(500).json({ error: "Engine failure" });
  }

  /* ----------------------------------------------------------
     Short summary for Shopify UI
  ---------------------------------------------------------- */
  const shortHTML = buildSummaryHTML({
    classification: cls,
    engines: enginesOut,
    question
  });

  /* ----------------------------------------------------------
     Full email HTML
  ---------------------------------------------------------- */
  const longHTML = buildUniversalEmailHTML({
    title: "Your Personal Insight Report",
    question,
    engines: enginesOut,
    fullName,
    birthDate,
    birthTime,
    birthPlace
  });

  /* ----------------------------------------------------------
     Email send
  ---------------------------------------------------------- */
  const mail = await sendEmailHTML({
    to: email,
    subject: "Your Personal Insight Report",
    html: longHTML
  });

  if (!mail.success) {
    console.error("❌ EMAIL ERROR:", mail.error);
    return res.status(500).json({ error: "Email failed" });
  }

  /* ----------------------------------------------------------
     Success
  ---------------------------------------------------------- */
  return res.json({
    ok: true,
    mode: "personal",
    shortAnswer: shortHTML
  });
}
