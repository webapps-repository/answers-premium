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

  /* -----------------------------------------
     CORS
  ----------------------------------------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Not allowed" });

  /* -----------------------------------------
     Parse multipart
  ----------------------------------------- */
  const form = formidable({
    multiples: false,
    maxFileSize: 20 * 1024 * 1024,
    allowEmptyFiles: true,
    keepExtensions: true,
    filename: (name, ext, part) =>
      `${Date.now()}-${(part.originalFilename || "file").replace(/\s+/g, "_")}`
  });

  let fields = {}, files = {};
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

  /* -----------------------------------------
     Extract fields
  ----------------------------------------- */
  const mode = normalize(fields, "mode") || "personal";     // ⭐ COMPAT ADDED
  const question = normalize(fields, "question");
  const email = normalize(fields, "email");

  if (!question) return res.status(400).json({ error: "Missing question" });
  if (!email) return res.status(400).json({ error: "Missing email" });

  // Personal fields (still used when mode !== compat)
  const fullName = normalize(fields, "fullName");
  const birthDate = normalize(fields, "birthDate");
  const birthTime = normalize(fields, "birthTime");
  const birthPlace = normalize(fields, "birthPlace");

  // ⭐ COMPAT MODE — person 1
  const c1_fullName = normalize(fields, "c1_fullName");
  const c1_birthDate = normalize(fields, "c1_birthDate");
  const c1_birthTime = normalize(fields, "c1_birthTime");
  const c1_birthPlace = normalize(fields, "c1_birthPlace");

  // ⭐ COMPAT MODE — person 2
  const c2_fullName = normalize(fields, "c2_fullName");
  const c2_birthDate = normalize(fields, "c2_birthDate");
  const c2_birthTime = normalize(fields, "c2_birthTime");
  const c2_birthPlace = normalize(fields, "c2_birthPlace");

  /* -----------------------------------------
     Recaptcha with toggle
  ----------------------------------------- */
  const TOGGLE = process.env.RECAPTCHA_TOGGLE || "false";
  const recaptchaToken =
    normalize(fields, "recaptchaToken") ||
    normalize(fields, "g-recaptcha-response") ||
    normalize(fields, "token");

  if (TOGGLE === "false") {
    console.log("🔵 RECAPTCHA BYPASS ACTIVE");
  } else {
    const rec = await verifyRecaptcha(
      recaptchaToken,
      req.headers["x-forwarded-for"]
    );
    if (!rec.ok) {
      return res.status(400).json({ error: "reCAPTCHA failed", rec });
    }
  }

  /* -----------------------------------------
     Palm upload handling
  ----------------------------------------- */

  let uploadedFile = null;
  if (files?.palmImage) {
    uploadedFile = Array.isArray(files.palmImage)
      ? files.palmImage[0]
      : files.palmImage;
  }

  let c1PalmFile = null;   // ⭐ COMPAT ADDED
  if (files?.c1_palm) {
    c1PalmFile = Array.isArray(files.c1_palm)
      ? files.c1_palm[0]
      : files.c1_palm;
  }

  let c2PalmFile = null;   // ⭐ COMPAT ADDED
  if (files?.c2_palm) {
    c2PalmFile = Array.isArray(files.c2_palm)
      ? files.c2_palm[0]
      : files.c2_palm;
  }

  // palm validation
  for (const f of [uploadedFile, c1PalmFile, c2PalmFile]) {
    if (f) {
      const v = validateUploadedFile(f);
      if (!v.ok) return res.status(400).json({ error: v.error });
    }
  }

  /* -----------------------------------------
     Classification (kept for engines)
  ----------------------------------------- */
  let cls = { type: "personal", confidence: 1 };
  try {
    cls = await classifyQuestion(question);
  } catch {}

  /* ============================================================
     ⭐ COMPATIBILITY MODE — MAIN LOGIC
     ============================================================ */
  if (mode === "compat") {
    let person1, person2, compat;

    try {
      person1 = await runAllEngines({
        question,
        mode: "personal",
        uploadedFile: c1PalmFile,
        overrideName: c1_fullName,
        overrideBirth: {
          date: c1_birthDate,
          time: c1_birthTime,
          place: c1_birthPlace
        }
      });

      person2 = await runAllEngines({
        question,
        mode: "personal",
        uploadedFile: c2PalmFile,
        overrideName: c2_fullName,
        overrideBirth: {
          date: c2_birthDate,
          time: c2_birthTime,
          place: c2_birthPlace
        }
      });

      // ⭐ Third AI run = compatibility synthesis
      compat = await runAllEngines({
        question: `Compatibility analysis between:
        Person 1: ${c1_fullName}, born ${c1_birthDate} ${c1_birthTime} at ${c1_birthPlace}
        Person 2: ${c2_fullName}, born ${c2_birthDate} ${c2_birthTime} at ${c2_birthPlace}
        - Include astrology compatibility
        - Include numerology compatibility
        - Include palmistry compatibility if palms provided`,
        mode: "personal",
        uploadedFile: null
      });

    } catch (err) {
      console.error("❌ COMPAT ENGINE ERROR:", err);
      return res.status(500).json({ error: "Compatibility engine failure" });
    }

    /* -----------------------------------------
       Short summary (compatibility)
    ----------------------------------------- */
    const shortHTML = `
      <div><strong>Your Question:</strong> ${question}</div>
      <div style="margin-top:10px;">
        ${compat.summaryHTML || compat.answer || "Compatibility computed."}
      </div>
    `;

    /* -----------------------------------------
       Long email
    ----------------------------------------- */
    const longHTML = `
      <h2>Your Compatibility Insight Report</h2>

      <h3>Person 1</h3>
      ${person1.longHTML || JSON.stringify(person1)}

      <h3>Person 2</h3>
      ${person2.longHTML || JSON.stringify(person2)}

      <h3>Compatibility Analysis</h3>
      ${compat.longHTML || JSON.stringify(compat)}
    `;

    /* Email */
    const mail = await sendEmailHTML({
      to: email,
      subject: "Your Compatibility Insight Report",
      html: longHTML
    });

    if (!mail.success)
      return res.status(500).json({ error: "Email failed", detail: mail.error });

    return res.json({
      ok: true,
      mode: "compat",
      shortAnswer: shortHTML
    });
  }

  /* ============================================================
     NORMAL PERSONAL MODE (existing code untouched)
     ============================================================ */

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

  const shortHTML = buildSummaryHTML({
    classification: cls,
    engines: enginesOut,
    question
  });

  const longHTML = buildUniversalEmailHTML({
    title: "Your Personal Insight Report",
    question,
    engines: enginesOut,
    fullName,
    birthDate,
    birthTime,
    birthPlace
  });

  const mail = await sendEmailHTML({
    to: email,
    subject: "Your Personal Insight Report",
    html: longHTML
  });

  if (!mail.success) {
    return res.status(500).json({ error: "Email failed", detail: mail.error });
  }

  return res.json({
    ok: true,
    mode: "personal",
    shortAnswer: shortHTML
  });
}
