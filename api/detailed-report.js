export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmailHTML } from "../lib/utils.js";
import { loadPremiumSubmission, deletePremiumSubmission } from "../lib/premium-store.js";

export default async function handler(req, res) {

  /* =========================
     ✅ FULL CORS (HARD FIX)
  ========================= */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Not allowed" });
  }

  /* =========================
     ✅ SAFE JSON PARSE
  ========================= */
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

  /* =========================
     ✅ TOKEN LOOKUP
  ========================= */
  const cached = await loadPremiumSubmission(premiumToken);

  if (!cached) {
    return res.status(404).json({ error: "Token expired or invalid" });
  }

  /* =========================
     ✅ SAFE FIELD NORMALIZATION
  ========================= */
  const rawEmail = cached?.fields?.email;
  const rawQuestion = cached?.fields?.question;

  const email =
    Array.isArray(rawEmail) ? rawEmail[0] :
    typeof rawEmail === "string" ? rawEmail.trim() : null;

  const question =
    Array.isArray(rawQuestion) ? rawQuestion[0] :
    typeof rawQuestion === "string" ? rawQuestion.trim() : "(question not provided)";

  if (!email) {
    return res.status(400).json({ error: "Email missing in token payload" });
  }

  /* =========================
     ✅ BUILD EMAIL HTML
  ========================= */
  const html = `
    <div style="font-family:system-ui; padding:20px;">
      <h2>Your Premium Report</h2>
      <p><strong>Your Question:</strong> ${question}</p>
      <p>Your premium expansion has now been unlocked.</p>
      <p>Thank you for your purchase.</p>
    </div>
  `;

  /* =========================
     ✅ SEND EMAIL
  ========================= */
  try {
    await sendEmailHTML({
      to: email,
      subject: "Your Premium Report",
      html
    });
  } catch (err) {
    console.error("❌ EMAIL FAILURE:", err);
    return res.status(500).json({ error: "Failed to send premium email" });
  }

  /* =========================
     ✅ PREVENT TOKEN REUSE
  ========================= */
  await deletePremiumSubmission(premiumToken);

  /* =========================
     ✅ FINAL SUCCESS
  ========================= */
  return res.status(200).json({
    ok: true,
    message: "✅ Premium email sent successfully"
  });
}
