export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmailHTML } from "../lib/utils.js";
import {
  loadPremiumSubmission,
  deletePremiumSubmission
} from "../lib/premium-store.js";

export default async function handler(req, res) {
  /* ------------------------------
      CORS (MUST Allow Shopify)
  ------------------------------ */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  /* ------------------------------
        SAFE JSON BODY PARSE
  ------------------------------ */
  let body = {};
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    body = JSON.parse(raw || "{}");
  } catch (err) {
    console.error("❌ JSON PARSE ERROR:", err);
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const premiumToken = body?.premiumToken;
  if (!premiumToken) {
    return res.status(400).json({ error: "Missing premium token" });
  }

  /* ------------------------------
      LOAD TOKEN PAYLOAD
  ------------------------------ */
  const cached = await loadPremiumSubmission(premiumToken);
  if (!cached) {
    return res.status(404).json({ error: "Token expired or invalid" });
  }

  const fields = cached.fields || {};

  const email =
    Array.isArray(fields.email) ? fields.email[0] :
    typeof fields.email === "string" ? fields.email.trim() : null;

  if (!email) {
    return res.status(400).json({ error: "Email missing from token payload" });
  }

  const question =
    Array.isArray(fields.question) ? fields.question[0] :
    typeof fields.question === "string" ? fields.question.trim() : "(No question)";

  const fullName =
    Array.isArray(fields.fullName) ? fields.fullName[0] :
    typeof fields.fullName === "string" ? fields.fullName.trim() : "Guest";

  const birthDate =
    Array.isArray(fields.birthDate) ? fields.birthDate[0] :
    typeof fields.birthDate === "string" ? fields.birthDate.trim() : "Unknown";

  const birthCity =
    Array.isArray(fields.birthCity) ? fields.birthCity[0] :
    typeof fields.birthCity === "string" ? fields.birthCity.trim() : "Unknown";

  /* ------------------------------
          PREMIUM HTML
  ------------------------------ */
  const html = `
  <div style="font-family:system-ui; max-width:700px; margin:auto; padding:24px;">
    <h1 style="color:#6c63ff;">🔮 Your Premium Spiritual Report</h1>

    <p><strong>Name:</strong> ${fullName}</p>
    <p><strong>Date of Birth:</strong> ${birthDate}</p>
    <p><strong>Birth City:</strong> ${birthCity}</p>

    <hr />

    <h3>Your Question</h3>
    <p>${question}</p>

    <hr />

    <h2>✨ Deep Insights</h2>
    <p>Your full premium expanded spiritual reading would go here…</p>

    <p style="margin-top:40px;">With care,<br><strong>Melodie ✨</strong></p>
  </div>`;

  /* ------------------------------
        SEND EMAIL
  ------------------------------ */
  try {
    await sendEmailHTML({
      to: email,
      subject: "Your Premium Spiritual Report",
      html
    });

  } catch (err) {
    console.error("❌ EMAIL ERROR:", err);
    return res.status(500).json({ error: "Email failed" });
  }

  /* ------------------------------
        REMOVE TOKEN (security)
  ------------------------------ */
  await deletePremiumSubmission(premiumToken);

  return res.status(200).json({
    ok: true,
    message: "Premium report sent"
  });
}
