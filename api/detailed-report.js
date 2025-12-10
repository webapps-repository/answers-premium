export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmailHTML } from "../lib/utils.js";

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
  const rawEmail = body?.email;
  const rawQuestion = body?.question;

  if (!premiumToken) {
    return res.status(400).json({ error: "Missing premium token" });
  }

  /* =========================
     ✅ SAFE FIELD NORMALIZATION
  ========================= */
  const email =
    Array.isArray(rawEmail) ? rawEmail[0] :
    typeof rawEmail === "string" ? rawEmail.trim() : null;

  const question =
    Array.isArray(rawQuestion) ? rawQuestion[0] :
    typeof rawQuestion === "string" ? rawQuestion.trim() : "(question not provided)";

  if (!email) {
    return res.status(400).json({ error: "Email missing in request payload" });
  }

  /* =========================
     ✅ BUILD EMAIL HTML
  ========================= */
  const html = `
    <div style="font-family:system-ui; padding:20px;">
      <h2>Your Premium Report</h2>

      <p><strong>Your Question:</strong> ${question}</p>

      <p>
        Your premium expansion has now been unlocked.
      </p>

      <p>
        This report contains your extended insights and analysis.
      </p>

      <p>
        Thank you for your purchase and trust in Melodie.
      </p>

      <hr/>

      <p style="font-size:12px; color:#666;">
        Premium Token: ${premiumToken}
      </p>
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
     ✅ FINAL SUCCESS
  ========================= */
  return res.status(200).json({
    ok: true,
    message: "✅ Premium email sent successfully"
  });
}
