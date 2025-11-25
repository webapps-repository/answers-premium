// /api/spiritual-report.js
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

  /* --------------------------
       CORS
  -------------------------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Not allowed" });

  /* ----------------------------------------------------------
     Parse multipart/form-data
  ---------------------------------------------------------- */
  const form = formidable({
    multiples: false,
    maxFileSize: 12 * 1024 * 1024
  });

  let fields, files;
  try {
    ({ fields, files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fl) =>
        err ? reject(err) : resolve({ fields: f, files: fl })
      )
    ));
  } catch (err) {
    console.error("❌ PARSE ERROR:", err);
    return res.status(400).json({ error: "Bad form data", detail: String(err) });
  }

  /* ----------------------------------------------------------
     Extract fields
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
     RECAPTCHA (TOGGLE SUPPORT)
  ---------------------------------------------------------- */
  const TOGGLE = process.env.RECAPTCHA_TOGGLE || "false";

  if (TOGGLE === "false") {
    console.log("🔵 RECAPTCHA BYPASS ACTIVE (RECAPTCHA_TOGGLE=false)");
  } else {
    const rec = await verifyRecaptcha(
      recaptchaToken,
      req.headers["x-forwarded-for"]
    );
    if (!rec.ok) {
      console.error("❌ RECAPTCHA FAIL:", rec);
      return res.status(400).json({
        error: "reCAPTCHA failed",
        rec
      });
    }
  }

  /* ----------------------------------------------------------
     Optional palm upload
  ---------------------------------------------------------- */
  const uploadedFile = files?.palmImage || null;

  if (uploadedFile) {
    const valid = validateUploadedFile(uploadedFile);
    if (!valid.ok)
      return res.status(400).json({ error: valid.error });
  }

  /* ----------------------------------------------------------
     Classification (used for summary header)
  ---------------------------------------------------------- */
  let cls = { type: "personal", confidence: 1 };
  try {
    cls = await classifyQuestion(question);
  } catch (err) {
    console.error("❌ CLASSIFICATION ERROR (defaulting to personal)");
  }

  /* ----------------------------------------------------------
     Run the full Personal Engines (A — palmistry + astrology + numerology)
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
    return res.status(500).json({
      error: "Engine failure",
      detail: String(err)
    });
  }

  /* ----------------------------------------------------------
     SHORT SUMMARY HTML (displayed on Shopify)
  ---------------------------------------------------------- */
  const shortHTML = buildSummaryHTML({
    classification: cls,
    engines: enginesOut,
    question
  });

  /* ----------------------------------------------------------
     FULL LONG EMAIL (Apple-style) WITH ALL ENGINES
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
     EMAIL SEND
  ---------------------------------------------------------- */
  const mail = await sendEmailHTML({
    to: email,
    subject: "Your Personal Insight Report",
    html: longHTML
  });

  if (!mail.success) {
    console.error("❌ EMAIL SEND ERROR:", mail.error);
    return res.status(500).json({ error: "Email failed", detail: mail.error });
  }

  /* ----------------------------------------------------------
     SUCCESS RESPONSE
  ---------------------------------------------------------- */
  return res.json({
    ok: true,
    mode: "personal",
    shortAnswer: shortHTML
  });
}
