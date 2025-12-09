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

  /* ✅ FULL CORS */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Not allowed" });

  /* ✅ FORM PARSE */
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

  const question = normalize(fields, "question");
  const email = normalize(fields, "email");

  if (!question || !email) {
    return res.status(400).json({ error: "Missing question or email" });
  }

  /* ✅ AI */
  const enginesOut = await runAllEngines({
    question,
    mode: "personal",
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

  /* ✅ TOKEN */
  const premiumToken = crypto.randomUUID();
  await savePremiumSubmission(premiumToken, { fields });

  const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN;
  const VARIANT_ID = "47550793875608";

  const premiumLink =
    `https://${SHOPIFY_STORE}/cart/${VARIANT_ID}:1?attributes[premiumToken]=${encodeURIComponent(premiumToken)}`;

  const html = `
    <div style="padding:20px;">
      ${shortHTML}
      <a href="${premiumLink}" style="display:block;margin-top:20px;">
        Unlock Premium
      </a>
    </div>
  `;

  await sendEmailHTML({
    to: email,
    subject: "Your Reading",
    html
  });

  return res.status(200).json({
    ok: true,
    shortAnswer: shortHTML,
    premiumToken,
    debug: true
  });
}
