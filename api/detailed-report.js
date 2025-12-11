export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* IMPORTS */
import { sendEmailHTML } from "../lib/utils.js";
import {
  loadPremiumSubmission,
  deletePremiumSubmission
} from "../lib/premium-store.js";

export default async function handler(req, res) {
  /* ===============================
     CORS (FULL PRODUCTION MODE)
  =============================== */
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

  /* ===============================
     SAFE JSON PARSE
  =============================== */
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

  console.log("🔍 PREMIUM TOKEN RECEIVED:", premiumToken);

  /* ===============================
     LOOKUP TOKEN IN STORE
  =============================== */
  const cached = await loadPremiumSubmission(premiumToken);

  if (!cached) {
    console.log("❌ TOKEN NOT FOUND IN MEMORY:", premiumToken);
    return res.status(404).json({ error: "Token expired or invalid" });
  }

  console.log("✅ TOKEN LOADED:", cached);

  /* ===============================
     NORMALIZE FIELDS
  =============================== */
  const getField = (value, fallback = "Not provided") => {
    if (Array.isArray(value)) return value[0] || fallback;
    if (typeof value === "string") return value.trim() || fallback;
    return fallback;
  };

  const email       = getField(cached.fields?.email, null);
  const question    = getField(cached.fields?.question, "(No question provided)");
  const fullName    = getField(cached.fields?.fullName, "Guest");
  const birthDate   = getField(cached.fields?.birthDate);
  const birthTime   = getField(cached.fields?.birthTime);
  const birthPlace  = getField(cached.fields?.birthPlace);

  if (!email) {
    return res.status(400).json({ error: "Email missing in payload" });
  }

  /* ===============================
     PREMIUM REPORT HTML
  =============================== */
  const html = `
  <div style="font-family:system-ui; max-width:700px; margin:auto; padding:24px;">
    <h1 style="color:#6c63ff;">✨ Your Premium Spiritual Report</h1>

    <h3>Personal Details</h3>
    <p><strong>Name:</strong> ${fullName}</p>
    <p><strong>Date of Birth:</strong> ${birthDate}</p>
    <p><strong>Time of Birth:</strong> ${birthTime}</p>
    <p><strong>Birth Place:</strong> ${birthPlace}</p>

    <hr style="margin:20px 0">

    <h3>Your Question</h3>
    <p style="background:#f4f4f4;padding:12px;border-radius:6px;">
      ${question}
    </p>

    <hr style="margin:20px 0">

    <h2>🔮 Deep Premium Insight</h2>
    <p>
      This expanded report provides deeper interpretations across astrology,
      numerology and palmistry layers, focusing on energetic pathways, karmic
      development arcs, decision cycles, and subconscious alignment themes.
    </p>

    <h3>🌙 Astrology Layer</h3>
    <p>Your patterns show recurring cycles of transformation, intuition growth, and destiny alignment.</p>

    <h3>🔢 Numerology Layer</h3>
    <p>Your vibration indicates periodic opportunity gates and close-cycle emotional resets.</p>

    <h3>✋ Palmistry Layer</h3>
    <p>Your palm signature reflects resilience, life-path adaptability, and intuitive skill elevation.</p>

    <h3>🧠 Shadow Themes</h3>
    <p>Your greatest tension forms between comfort and breakthrough. When acknowledged, this becomes your growth engine.</p>

    <h3>💎 Key Guidance</h3>
    <ul>
      <li>Move slowly through intuitive decisions.</li>
      <li>Opportunity windows repeat in cycles.</li>
      <li>Your emotional intuition is extremely accurate.</li>
    </ul>

    <p style="margin-top:24px;font-size:13px;color:#777;">
      This premium insight was generated exclusively for you.
    </p>

    <p style="margin-top:20px;">
      With care,<br><strong>Melodie ✨</strong>
    </p>
  </div>
  `;

  /* ===============================
     SEND EMAIL
  =============================== */
  try {
    const result = await sendEmailHTML({
      to: email,
      subject: "Your Premium Spiritual Report",
      html
    });

    console.log("✅ PREMIUM EMAIL SENT:", result);
  } catch (err) {
    console.error("❌ EMAIL ERROR:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }

  /* ===============================
     DELETE TOKEN (NO REUSE)
  =============================== */
  await deletePremiumSubmission(premiumToken);
  console.log("🗑️ TOKEN DELETED:", premiumToken);

  /* ===============================
     SUCCESS RESPONSE
  =============================== */
  return res.status(200).json({
    ok: true,
    message: "Premium report sent successfully"
  });
}
