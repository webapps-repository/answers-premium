export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const config = { api: { bodyParser: false } };

import formidable from "formidable";
import crypto from "crypto";

import { normalize, sendEmailHTML } from "../lib/utils.js";
import { runAllEngines } from "../lib/engines.js";
import { savePremiumSubmission } from "../lib/premium-store.js";

export default async function handler(req, res) {

  console.log("🔥 SPIRITUAL REPORT HIT");

  /* -----------------------------
        CORS
  ----------------------------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Not allowed" });

  /* -----------------------------
        FORM PARSE
  ----------------------------- */
  const form = formidable({ multiples: true, keepExtensions: true });
  let fields = {}, files = {};

  try {
    ({ fields, files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fl) =>
        err ? reject(err) : resolve({ fields: f, files: fl })
      )
    ));
  } catch (err) {
    console.error("❌ FORM ERROR", err);
    return res.status(400).json({ error: "Bad form data" });
  }

  /* -----------------------------
        BASIC FIELDS
  ----------------------------- */
  const email = normalize(fields, "email");
  const question = normalize(fields, "question");
  const mode = normalize(fields, "mode") || "personal";

  if (!email || !question) {
    return res.status(400).json({ error: "Missing required email or question" });
  }

  /* -----------------------------
        PERSONAL MODE DATA
  ----------------------------- */
  let personal = null;

  if (mode === "personal") {
    personal = {
      fullName: normalize(fields, "fullName"),
      birthDate: normalize(fields, "birthDate"),
      birthTime: normalize(fields, "birthTime"),
      birthPlace: normalize(fields, "birthPlace"),
      palmImage: files?.palmImage || null,
      technicalFile: files?.technicalFile || null
    };
  }

  /* -----------------------------
        COMPATIBILITY MODE DATA
  ----------------------------- */
  let compat1 = null, compat2 = null;

  if (mode === "compat") {
    compat1 = {
      fullName: normalize(fields, "c1_fullName"),
      birthDate: normalize(fields, "c1_birthDate"),
      birthTime: normalize(fields, "c1_birthTime"),
      birthPlace: normalize(fields, "c1_birthPlace"),
      palmImage: files?.c1_palm || null
    };

    compat2 = {
      fullName: normalize(fields, "c2_fullName"),
      birthDate: normalize(fields, "c2_birthDate"),
      birthTime: normalize(fields, "c2_birthTime"),
      birthPlace: normalize(fields, "c2_birthPlace"),
      palmImage: files?.c2_palm || null
    };
  }

  /* -----------------------------
        RUN ENGINES
  ----------------------------- */
  let enginesOut;
  try {
    enginesOut = await runAllEngines({
      question,
      mode,
      personal,
      compat1,
      compat2
    });
  } catch (err) {
    console.error("❌ ENGINE FAILURE", err);
    return res.status(500).json({ error: "Engine processing failed" });
  }

  const shortHTML = `
  <div style="font-family:system-ui;">
    <p><strong>Your Question:</strong> ${question}</p>
    <p><strong>Answer:</strong> ${enginesOut.directAnswer}</p>
    <p>${enginesOut.summary}</p>
  </div>
  `;

  /* -----------------------------
        PREMIUM TOKEN SAVE
  ----------------------------- */
  const premiumToken = crypto.randomUUID();
  await savePremiumSubmission(premiumToken, { fields, mode });

  /* -----------------------------
        SEND EMAIL SUMMARY
  ----------------------------- */
  try {
    await sendEmailHTML({
      to: email,
      subject: "Your Reading",
      html: shortHTML
    });
  } catch (err) {
    console.error("❌ EMAIL FAILURE", err);
  }

  /* -----------------------------
        RESPONSE TO SHOPIFY
  ----------------------------- */
  return res.status(200).json({
    ok: true,
    shortAnswer: shortHTML,
    premiumToken
  });
}
