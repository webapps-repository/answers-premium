export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmailHTML } from "../lib/utils.js";
import { loadPremiumSubmission, deletePremiumSubmission } from "../lib/premium-store.js";

export default async function handler(req, res) {
  console.log("🔥 DETAILED REPORT HIT");

  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Not allowed" });
  }

  // --- Raw body → JSON (works with text/plain OR application/json) ---
  let rawBody = "";
  for await (const chunk of req) rawBody += chunk;

  let body = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch (err) {
    console.error("❌ JSON PARSE ERROR in detailed-report:", err, { rawBody });
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const premiumToken = body?.premiumToken;
  const overrideEmail = body?.email;
  const overrideQuestion = body?.question;

  if (!premiumToken) {
    return res.status(400).json({ error: "Missing premium token" });
  }

  const cached = await loadPremiumSubmission(premiumToken);
  console.log("[PREMIUM STORE] Loaded token:", premiumToken, !!cached);

  if (!cached) {
    return res.status(404).json({ error: "Token expired or invalid" });
  }

  // --- Flexible extraction for email & question (old + new shapes) ---
  const candidateEmail =
    overrideEmail ??
    cached.email ??
    cached.userEmail ??
    (cached.fields && (cached.fields.email || cached.fields.Email || cached.fields.userEmail));

  const candidateQuestion =
    overrideQuestion ??
    cached.question ??
    cached.userQuestion ??
    (cached.fields && (cached.fields.question || cached.fields.Question));

  const email =
    Array.isArray(candidateEmail) ? candidateEmail[0] :
    typeof candidateEmail === "string" ? candidateEmail.trim() : null;

  const question =
    Array.isArray(candidateQuestion) ? candidateQuestion[0] :
    typeof candidateQuestion === "string" ? candidateQuestion.trim() : "(No question provided)";

  if (!email) {
    console.error(
      "❌ detailed-report: no usable email (neither token payload nor override)",
      { premiumToken, cachedShape: Object.keys(cached || {}) }
    );
    return res.status(400).json({ error: "No email available for premium report" });
  }

  // --- Build long-form premium HTML (placeholder copy kept simple) ---
  const html = `
    <div style="font-family:system-ui; max-width:700px; margin:auto; padding:24px; background:#ffffff;">
      <h1 style="color:#6c63ff;">🔮 Your Premium Spiritual Report</h1>

      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Question:</strong> ${question}</p>

      <hr style="margin:20px 0" />

      <h2>✨ Expanded Insight</h2>
      <p>
        This premium report builds on your original response and explores deeper
        energetic, symbolic and subconscious patterns. Future versions can plug
        in full astrology, numerology and palmistry layers using the stored fields.
      </p>

      <h3>🧠 Shadow & Growth Themes</h3>
      <p>
        The main growth axis is between comfort and expansion. When navigated
        consciously, this tension becomes your core engine of development.
      </p>

      <h3>💎 Key Guidance</h3>
      <ul>
        <li>Give yourself time to integrate insights before acting.</li>
        <li>Track repeating themes that appear every 9–12 months.</li>
        <li>Notice where you feel both fear and excitement — that’s usually the edge of growth.</li>
      </ul>

      <hr style="margin:28px 0" />

      <p style="font-size:13px; color:#777;">
        This premium message was generated exclusively for you. Please keep
        your token private.
      </p>

      <p style="margin-top:20px;">
        With care,<br />
        <strong>Melodie ✨</strong>
      </p>
    </div>
  `;

  // --- Send premium email ---
  try {
    const sendResult = await sendEmailHTML({
      to: email,
      subject: process.env.EMAIL_SUBJECT_PREMIUM || "Your Premium Spiritual Report",
      html
    });

    console.log("✅ PREMIUM EMAIL SENT:", sendResult);
  } catch (err) {
    console.error("❌ PREMIUM EMAIL FAILURE:", err);
    return res.status(500).json({ error: "Failed to send premium email" });
  }

  // --- One-time token usage (optional, but safer) ---
  try {
    await deletePremiumSubmission(premiumToken);
  } catch (err) {
    console.error("⚠️ Failed to delete premium token:", err);
  }

  return res.status(200).json({
    ok: true,
    message: "✅ Premium email sent successfully"
  });
}
