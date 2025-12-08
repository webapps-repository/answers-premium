// /api/spiritual-report.js — FINAL: full compatibility + palm1/palm2 support

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
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization, X-Requested-With, Accept, Origin");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Not allowed" });

  /* Parse */
  const form = formidable({
    multiples: true,
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

  const mode = normalize(fields, "mode") === "compat" ? "compat" : "personal";

  const question = normalize(fields, "question");
  const email = normalize(fields, "email");

  if (!question) return res.status(400).json({ error: "Missing question" });
  if (!email) return res.status(400).json({ error: "Missing email" });

  /* Recaptcha */
  const recaptchaToken = normalize(fields, "recaptchaToken");
  const TOGGLE = process.env.RECAPTCHA_TOGGLE || "false";
  if (TOGGLE !== "false") {
    const r = await verifyRecaptcha(recaptchaToken, req.headers["x-forwarded-for"]);
    if (!r.ok) return res.status(400).json({ error: "reCAPTCHA failed", detail: r });
  }

  /* Palm files */
  let palm1File = null;
  let palm2File = null;

  if (mode === "personal") {
    if (files?.palmImage) {
      palm1File = Array.isArray(files.palmImage) ? files.palmImage[0] : files.palmImage;
      const v = validateUploadedFile(palm1File);
      if (!v.ok) return res.status(400).json({ error: v.error });
    }
  }

  if (mode === "compat") {
    if (files?.c1_palm) {
      palm1File = Array.isArray(files.c1_palm) ? files.c1_palm[0] : files.c1_palm;
      const v1 = validateUploadedFile(palm1File);
      if (!v1.ok) return res.status(400).json({ error: v1.error });
    }

    if (files?.c2_palm) {
      palm2File = Array.isArray(files.c2_palm) ? files.c2_palm[0] : files.c2_palm;
      const v2 = validateUploadedFile(palm2File);
      if (!v2.ok) return res.status(400).json({ error: v2.error });
    }
  }

  /* Compatibility fields */
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

  /* RUN ENGINES */
  let enginesOut;
  try {
    enginesOut = await runAllEngines({
      question,
      mode,
      compat1,
      compat2,
      palm1File,
      palm2File
    });
  } catch (err) {
    return res.status(500).json({ error: "Engine failure", detail: String(err) });
  }

  /* Shopify short summary */
  const shortHTML = buildSummaryHTML({
    question,
    engines: enginesOut,
    mode
  });

  /* Email */
  const longHTML = buildUniversalEmailHTML({
    question,
    mode,
    engines: enginesOut,
    fullName: normalize(fields, "fullName"),
    birthDate: normalize(fields, "birthDate"),
    birthTime: normalize(fields, "birthTime"),
    birthPlace: normalize(fields, "birthPlace"),
    compat1,
    compat2,
    compatScore: enginesOut.compatScore
  });

  const emailOut = await sendEmailHTML({
    to: email,
    subject: "Melodie Says — Your Insight Report",
    html: longHTML
  });

  if (!emailOut.success) {
    return res.status(500).json({ error: "Email failed", detail: emailOut.error });
  }

  return res.json({
    ok: true,
    mode,
    shortAnswer: shortHTML
  });
}
