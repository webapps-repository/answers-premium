export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmailHTML } from "../lib/utils.js";
import { loadPremiumSubmission, deletePremiumSubmission } from "../lib/premium-store.js";

export default async function handler(req, res) {

  /* =========================
     ✅ FULL CORS (PRODUCTION SAFE)
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
  const rawEmail    = cached?.fields?.email;
  const rawQuestion = cached?.fields?.question;
  const rawName     = cached?.fields?.fullName;
  const rawDOB      = cached?.fields?.birthDate;
  const rawCity     = cached?.fields?.birthCity;

  const email =
    Array.isArray(rawEmail) ? rawEmail[0] :
    typeof rawEmail === "string" ? rawEmail.trim() : null;

  const question =
    Array.isArray(rawQuestion) ? rawQuestion[0] :
    typeof rawQuestion === "string" ? rawQuestion.trim() : "(No question provided)";

  const fullName =
    Array.isArray(rawName) ? rawName[0] :
    typeof rawName === "string" ? rawName.trim() : "Guest";

  const birthDate =
    Array.isArray(rawDOB) ? rawDOB[0] :
    typeof rawDOB === "string" ? rawDOB.trim() : "Not provided";

  const birthCity =
    Array.isArray(rawCity) ? rawCity[0] :
    typeof rawCity === "string" ? rawCity.trim() : "Not provided";

  if (!email) {
    return res.status(400).json({ error: "Email missing in token payload" });
  }

  /* =========================
     ✅ LONG-FORM PREMIUM HTML
  ========================= */
  const html = `
  <div style="font-family:system-ui; max-width:700px; margin:auto; padding:24px; background:#ffffff;">
    
    <h1 style="color:#6c63ff;">🔮 Your Premium Spiritual Report</h1>

    <p><strong>Name:</strong> ${fullName}</p>
    <p><strong>Date of Birth:</strong> ${birthDate}</p>
    <p><strong>Birth City:</strong> ${birthCity}</p>

    <hr style="margin:20px 0">

    <h3>Your Question</h3>
    <p style="background:#f4f4f4; padding:12px; border-radius:6px;">
      ${question}
    </p>

    <hr style="margin:20px 0">

    <h2>✨ Premium Insight Expansion</h2>

    <p>
      This expanded report builds on your original spiritual response by
      extracting deeper energetic, symbolic and subconscious patterns.
    </p>

    <h3>🌙 Astrology Layer</h3>
    <p>
      Your birth data suggests karmic patterns connected to learning cycles,
      inner transformation and future opportunity gates that activate through
      time-based planetary transits.
    </p>

    <h3>🔢 Numerology Layer</h3>
    <p>
      Your life theme is governed by repeating vibration patterns that influence
      relationships, career momentum and personal decision cycles.
    </p>

    <h3>✋ Palmistry Layer</h3>
    <p>
      Even without an image, energetic palm vectors reveal adaptive intelligence,
      resilience under pressure, leadership polarity and intuition dominance.
    </p>

    <h3>🧠 Shadow & Growth Themes</h3>
    <p>
      The dominant internal tension sits between comfort and expansion. When
      navigated correctly, this tension becomes the main engine of growth.
    </p>

    <h3>💎 Key Guidance</h3>
    <ul>
      <li>Trust delayed opportunities.</li>
      <li>Do not rush decision windows.</li>
      <li>Cycles repeat every 9–12 months.</li>
    </ul>

    <hr style="margin:28px 0">

    <p style="font-size:13px; color:#777;">
      This message was generated exclusively for you as a premium user.
      Please do not share your token.
    </p>

    <p style="margin-top:20px;">
      With care,<br>
      <strong>Melodie ✨</strong>
    </p>

  </div>
  `;

  /* =========================
     ✅ SEND EMAIL (HARD LOGGED)
  ========================= */
  try {
    const sendResult = await sendEmailHTML({
      to: email,
      subject: "Your Premium Spiritual Report",
      html
    });

    console.log("✅ EMAIL SENT:", sendResult);

  } catch (err) {
    console.error("❌ EMAIL FAILURE:", err);
    return res.status(500).json({ error: "Failed to send premium email" });
  }

  /* =========================
     ✅ DELETE TOKEN (ANTI-REUSE)
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
