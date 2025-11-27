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

import { runAllEngines } from "../lib/engines.js";
import {
  buildSummaryHTML,
  buildUniversalEmailHTML
} from "../lib/insights.js";

export default async function handler(req, res) {

  /* CORS */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Not allowed" });

  /* Parse form */
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

  /* mode: personal or compat */
  const mode = normalize(fields, "mode") === "compat" ? "compat" : "personal";

  const question = normalize(fields, "question");
  const email = normalize(fields, "email");
  const recaptchaToken =
    normalize(fields, "recaptchaToken") ||
    normalize(fields, "token");

  if (!question) return res.status(400).json({ error: "Missing question" });
  if (!email) return res.status(400).json({ error: "Missing email" });

  /* Recaptcha toggle */
  const TOGGLE = process.env.RECAPTCHA_TOGGLE || "false";
  if (TOGGLE !== "false") {
    const rec = await verifyRecaptcha(recaptchaToken, req.headers["x-forwarded-for"]);
    if (!rec.ok) return res.status(400).json({ error: "reCAPTCHA failed", rec });
  }

  /* -----------------------------
     Compatibility mode fields
  ----------------------------- */
  let compat1 = null;
  let compat2 = null;

  if (mode === "compat") {
    compat1 = {
      fullName: normalize(fields, "c1_fullName"),
      birthDate: normalize(fields, "c1_birthDate"),
      birthTime: normalize(fields, "c1_birthTime"),
      birthPlace: normalize(fields, "c1_birthPlace")
    };

    compat2 = {
      fullName: normalize(fields, "c2_fullName"),
      birthDate: normalize(fields, "c2_birthDate"),
      birthTime: normalize(fields, "c2_birthTime"),
      birthPlace: normalize(fields, "c2_birthPlace")
    };
  }

  /* Palm upload */
  let uploadedFile = null;
  if (files?.palmImage) {
    uploadedFile = Array.isArray(files.palmImage)
      ? files.palmImage[0]
      : files.palmImage;
  }
  if (uploadedFile) {
    const valid = validateUploadedFile(uploadedFile);
    if (!valid.ok) return res.status(400).json({ error: valid.error });
  }

  /* Engines (compat-aware) */
  let enginesOut;
  try {
    enginesOut = await runAllEngines({
      question,
      mode,
      uploadedFile,
      compat1,
      compat2
    });
  } catch (err) {
    return res.status(500).json({ error: "Engine failure", detail: String(err) });
  }

  /* Compatibility score (placeholder formula) */
  let compatScore = 0;
  if (mode === "compat") {
    compatScore = Math.floor(40 + Math.random() * 60); // 40–100%
  }

  /* Short answer for Shopify (NOW includes compatScore) */
  const shortHTML = buildSummaryHTML({
    question,
    engines: enginesOut,
    mode,
    compatScore
  });

  /* Final email */
  const longHTML = buildUniversalEmailHTML({
    title: "Melodie Says",
    mode,
    question,
    engines: enginesOut,
    fullName: normalize(fields, "fullName"),
    birthDate: normalize(fields, "birthDate"),
    birthTime: normalize(fields, "birthTime"),
    birthPlace: normalize(fields, "birthPlace"),
    compat1,
    compat2,
    compatScore
  });

  /* Send */
  const mail = await sendEmailHTML({
    to: email,
    subject: "Melodie Says — Your Insight Report",
    html: longHTML
  });

  if (!mail.success) {
    return res.status(500).json({ error: "Email failed", detail: mail.error });
  }

  return res.json({
    ok: true,
    mode,
    shortAnswer: shortHTML
  });
}
