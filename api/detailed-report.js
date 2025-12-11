export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const config = { api: { bodyParser: false } };   // ✅ REQUIRED

import { sendEmailHTML } from "../lib/utils.js";
import { loadPremiumSubmission, deletePremiumSubmission } from "../lib/premium-store.js";

export default async function handler(req, res) {

  /* =========================
     FULL CORS (WORKING)
  ========================= */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Not allowed" });

  /* =========================
     SAFE JSON PARSE
  ========================= */
  let body = {};
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    body = JSON.parse(raw || "{}");
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const premiumToken = body?.premiumToken;

  if (!premiumToken) {
    return res.status(400).json({ error: "Missing premium token" });
  }

  /* =========================
     LOAD TOKEN
  ========================= */
  const cached = await loadPremiumSubmission(premiumToken);

  if (!cached) {
    return res.status(404).json({ error: "Token expired or invalid" });
  }

  /* =========================
     NORMALIZE FIELDS
  ========================= */
  function norm(x) {
    if (Array.isArray(x)) return x[0];
    if (typeof x === "string") return x.trim();
    return null;
  }

  const email     = norm(cached.fields?.email);
  const question  = norm(cached.fields?.question);
  const fullName  = norm(cached.fields?.fullName)  || "Guest";
  const birthDate = norm(cached.fields?.birthDate) || "Not provided";
  const birthCity = norm(cached.fields?.birthCity) || "Not provided";

  if (!email) {
    return res.status(400).json({ error: "Email missing in token payload" });
  }

  /* =========================
     EMAIL HTML
  ========================= */
  const html = `
  <div style="font-family:system-ui; max-width:700px; margin:auto; padding:24px;">
    <h1 style="color:#6c63ff;">🔮 Your Premium Spiritual Report</h1>

    <p><strong>Name:</strong> ${fullName}</p>
    <p><strong>Birth Date:</strong> ${birthDate}</p>
    <p><strong>Birth City:</strong> ${birthCity}</p>

    <hr style="margin:20px 0">

    <h3>Your Question</h3>
    <p style="background:#f4f4f4; padding:12px; border-radius:6px;">
      ${question}
    </p>

    <h2>✨ Premium Insights</h2>
    <p>Your expanded reading is generated from astrology, numerology and energetic interpretation layers.</p>

    <p style="margin-top:20px;">With care,<br><strong>Melodie ✨</strong></p>
  </div>
  `;

  /* =========================
     SEND EMAIL
  ========================= */
  try {
    await sendEmailHTML({
      to: email,
      subject: "Your Premium Spiritual Report",
      html
    });
  } catch (e) {
    console.error("EMAIL ERROR", e);
    return res.status(500).json({ error: "Failed to send email" });
  }

  /* =========================
     DELETE TOKEN
  ========================= */
  await deletePremiumSubmission(premiumToken);

  return res.status(200).json({ ok: true, message: "Premium report sent" });
}
