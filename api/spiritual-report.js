// /api/spiritual-report.js — DEBUG PATCH: GUARANTEED premiumToken visibility
//
// check source sync
//

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const config = { api: { bodyParser: false } };

import formidable from "formidable";
import crypto from "crypto";

import {
  normalize,
  validateUploadedFile,
  verifyRecaptcha,
  sendEmailHTML
} from "../lib/utils.js";

import { runAllEngines, buildUniversalEmailHTML } from "../lib/engines.js";

import { savePremiumSubmission } from "../lib/premium-store.js";

export default async function handler(req, res) {

  console.log("🔥 SPIRITUAL REPORT HIT");

  /* ---------------- CORS ---------------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Not allowed" });

  /* ---------------- PARSE FORM ---------------- */
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
    console.error("❌ FORM ERROR", err);
    return res.status(400).json({ error: "Bad form data", detail: String(err) });
  }

  const mode = normalize(fields, "mode") === "compat" ? "compat" : "personal";
  const question = normalize(fields, "question");
  const email    = normalize(fields, "email");

  if (!question) return res.status(400).json({ error: "Missing question" });
  if (!email)    return res.status(400).json({ error: "Missing email" });

  /* ---------------- RUN AI ---------------- */
  let enginesOut;
  try {
    enginesOut = await runAllEngines({
      question,
      mode,
      uploadedFile: null,
      compat1: null,
      compat2: null,
      palm1File: null,
      palm2File: null
    });
  } catch (err) {
    console.error("❌ ENGINE FAILURE", err);
    return res.status(500).json({ error: "Engine failure" });
  }

  const shortHTML = `
    <div style="font-family:system-ui;">
      <p><strong>Your Question:</strong> ${question}</p>
      <p><strong>Answer:</strong> ${enginesOut.directAnswer || "See full insight below."}</p>
      <p>${enginesOut.summary || ""}</p>
    </div>
  `;


  let html = buildUniversalEmailHTML({
    question,
    mode,
    engines: enginesOut
  });

  /* ---------------- ✅ FORCE PREMIUM TOKEN ---------------- */
  const premiumToken = crypto.randomUUID();

  console.log("✅ PREMIUM TOKEN GENERATED:", premiumToken);

  await savePremiumSubmission(premiumToken, {
    createdAt: Date.now(),
    mode,
    fields
  });

  const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const VARIANT_ID    = "47550793875608";

  const premiumLink =
    `https://${SHOPIFY_STORE}/cart/${VARIANT_ID}:1?attributes[premiumToken]=${encodeURIComponent(premiumToken)}`;

  html += `
    <div style="margin-top:24px;text-align:center;">
      <a href="${premiumLink}"
         style="display:inline-block;padding:14px 22px;background:#1aa34a;color:white;
                font-weight:600;border-radius:8px;text-decoration:none;">
        Unlock Your Full Premium Report
      </a>
    </div>
  `;

  const emailOut = await sendEmailHTML({
    to: email,
    subject: "Melodie Says — Your Insight Report",
    html
  });

  console.log("✅ EMAIL SENT:", emailOut.success);

  /* ---------------- ✅ GUARANTEED RETURN ---------------- */
  res.status(200).json({
    ok: true,
    mode,
    shortAnswer: shortHTML,
    premiumToken,             // ✅ FORCED
    debug: true               // ✅ FORECED VISIBILITY
  });
}
