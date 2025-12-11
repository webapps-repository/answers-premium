export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const config = { api: { bodyParser: false } };

import formidable from "formidable";
import crypto from "crypto";

import { normalize, sendEmailHTML } from "../lib/utils.js";
import { runAllEngines } from "../lib/engines.js";
import { savePremiumSubmission } from "../lib/premium-store.js";

export default async function handler(req, res) {
  console.log("🔥 SPIRITUAL REPORT HIT (answers-premium)");

  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- Parse multipart form (Shopify / browser FormData) ---
  const form = formidable({ multiples: true, keepExtensions: true });

  let fields = {};
  let files = {};

  try {
    ({ fields, files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fl) => (err ? reject(err) : resolve({ fields: f, files: fl })))
    ));
  } catch (err) {
    console.error("❌ FORM ERROR:", err);
    return res.status(400).json({ error: "Bad form data" });
  }

  const email = normalize(fields, "email");
  const question = normalize(fields, "question");
  const mode = normalize(fields, "mode") || "personal";

  if (!email || !question) {
    console.error("❌ Missing email or question", { email, question });
    return res.status(400).json({ error: "Missing question or email" });
  }

  // For now we’re not wiring compat/palm into engines – we just send a standard reading.
  const enginesOut = await runAllEngines({
    question,
    mode: mode === "compat" ? "compat" : "personal",
    uploadedFile: null,
    compat1: null,
    compat2: null,
    palm1File: null,
    palm2File: null
  });

  const shortHTML = `
    <div style="font-family:system-ui;">
      <p><strong>Your Question:</strong> ${question}</p>
      <p><strong>Answer:</strong> ${enginesOut.directAnswer}</p>
      <p>${enginesOut.summary}</p>
    </div>
  `;

  // --- Save premium token payload (MAKE EMAIL TOP-LEVEL) ---
  const premiumToken = crypto.randomUUID();

  const toStore = {
    email,
    question,
    mode,
    // keep the raw form fields for future use (compat, palm, etc.)
    fields,
    filesInfo: Object.keys(files || {})
  };

  await savePremiumSubmission(premiumToken, toStore);
  console.log("[PREMIUM STORE] Saved token:", premiumToken, !!toStore);

  // --- Send basic email with short answer ---
  try {
    await sendEmailHTML({
      to: email,
      subject: process.env.EMAIL_SUBJECT_PREMIUM || "Melodie Says",
      html: shortHTML
    });
  } catch (err) {
    console.error("❌ EMAIL FAILURE (short report):", err);
    // still return ok so front-end doesn’t explode; but surface error
    return res.status(500).json({ error: "Failed to send short report email" });
  }

  // --- Final JSON payload back to Liquid form ---
  return res.status(200).json({
    ok: true,
    shortAnswer: shortHTML,
    premiumToken
  });
}
