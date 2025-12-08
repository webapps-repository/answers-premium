// /api/shopify-webhook.js — Secure Shopify → Premium PDF Auto Trigger

import crypto from "crypto";

import { loadPremiumSubmission, deletePremiumSubmission } from "../lib/premium-store.js";
import { generateInsights } from "../lib/insights.js";
import { generatePDF } from "../lib/pdf.js";
import { sendEmailHTML } from "../lib/utils.js";

/* ============================================================
   RAW BODY PARSER (Shopify requires raw body for signature)
============================================================ */
export const config = {
  api: {
    bodyParser: false
  }
};

function rawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", err => reject(err));
  });
}

/* ============================================================
   SHOPIFY SIGNATURE VERIFICATION
============================================================ */
function verifyShopify(req, rawBodyStr) {
  const hmacHeader = req.headers["x-shopify-hmac-sha256"];
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!hmacHeader || !secret) return false;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBodyStr, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(hmacHeader)
  );
}

/* ============================================================
   MAIN HANDLER
============================================================ */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  let raw;
  try {
    raw = await rawBody(req);
  } catch (err) {
    return res.status(400).send("Invalid body");
  }

  if (!verifyShopify(req, raw)) {
    console.error("❌ Shopify webhook signature FAILED");
    return res.status(401).send("Unauthorized");
  }

  let order;
  try {
    order = JSON.parse(raw);
  } catch (err) {
    return res.status(400).send("Bad JSON");
  }

  /* ============================================
     EXTRACT PREMIUM TOKEN FROM ORDER ATTRIBUTES
  ============================================ */
  const attrs = order?.note_attributes || [];
  const tokenRow = attrs.find(a => a.name === "premiumToken");
  const premiumToken = tokenRow?.value;

  if (!premiumToken) {
    console.warn("⚠️ No premiumToken found — ignoring order");
    return res.status(200).send("No premium token");
  }

  /* ============================================
     LOAD ORIGINAL FORM SUBMISSION FROM KV
  ============================================ */
  const cached = await loadPremiumSubmission(premiumToken);

  if (!cached) {
    console.warn("⚠️ Premium token expired:", premiumToken);
    return res.status(200).send("Token expired");
  }

  const { fields } = cached;

  /* ============================================
     REBUILD PERSON & QUESTION
  ============================================ */
  const email =
    (fields.email && (Array.isArray(fields.email) ? fields.email[0] : fields.email)) ||
    order?.email ||
    "";

  const fullName =
    (fields.fullName &&
      (Array.isArray(fields.fullName) ? fields.fullName[0] : fields.fullName)) ||
    order?.customer?.first_name + " " + order?.customer?.last_name ||
    "";

  const dateOfBirth =
    (fields.birthDate &&
      (Array.isArray(fields.birthDate)
        ? fields.birthDate[0]
        : fields.birthDate)) ||
    "";

  const timeOfBirth =
    (fields.birthTime &&
      (Array.isArray(fields.birthTime)
        ? fields.birthTime[0]
        : fields.birthTime)) ||
    "";

  const birthPlace =
    (fields.birthPlace &&
      (Array.isArray(fields.birthPlace)
        ? fields.birthPlace[0]
        : fields.birthPlace)) ||
    "";

  const question =
    (fields.question &&
      (Array.isArray(fields.question)
        ? fields.question[0]
        : fields.question)) || "";

  const person = {
    fullName,
    email,
    dateOfBirth,
    timeOfBirth,
    birthPlace
  };

  /* ============================================
     GENERATE PREMIUM INSIGHTS + PDF
  ============================================ */
  let insights, pdfBuffer;

  try {
    insights = await generateInsights({
      person,
      question
    });

    pdfBuffer = await generatePDF(insights);
  } catch (err) {
    console.error("❌ Premium generation failed:", err);
    return res.status(500).send("Premium generation failed");
  }

  /* ============================================
     EMAIL PDF
  ============================================ */
  const html = `
    <div style="font-family: system-ui, sans-serif;">
      <h2>Your Premium Spiritual Report</h2>
      <p>Hi ${fullName || "there"},</p>
      <p>
        Your complete premium astrology, numerology and palmistry
        report is attached.
      </p>
      <p>— Melodie</p>
    </div>
  `;

  const emailOut = await sendEmailHTML({
    to: email,
    subject: "Your Premium Spiritual Report",
    html,
    attachments: [
      {
        filename: "premium-spiritual-report.pdf",
        content: pdfBuffer
      }
    ]
  });

  if (!emailOut.success) {
    console.error("❌ Email failed after payment:", emailOut.error);
    return res.status(500).send("Email failed");
  }

  /* ============================================
     DELETE TOKEN TO PREVENT REUSE
  ============================================ */
  await deletePremiumSubmission(premiumToken);

  console.log("✅ Premium report delivered automatically:", premiumToken);
  return res.status(200).send("Premium delivered");
}
