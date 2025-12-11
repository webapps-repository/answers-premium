// /api/detailed-report.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmailHTML } from "../lib/utils.js";
import { loadPremiumSubmission, deletePremiumSubmission } from "../lib/premium-store.js";

export default async function handler(req, res) {
  // ----- CORS -----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Not allowed" });
  }

  // ----- READ RAW BODY -----
  let rawBody = "";
  try {
    for await (const chunk of req) rawBody += chunk;
  } catch (err) {
    console.error("❌ detailed-report: failed reading body stream:", err);
    return res.status(400).json({ ok: false, error: "Invalid body stream" });
  }

  // ----- PARSE JSON BODY -----
  let body = {};
  if (rawBody && rawBody.trim().length > 0) {
    try {
      body = JSON.parse(rawBody);
    } catch (err) {
      console.error("❌ detailed-report: JSON parse error:", err);
      console.error("   Raw body (first 200 chars):", rawBody.slice(0, 200));
      return res.status(400).json({ ok: false, error: "Invalid JSON" });
    }
  }

  const premiumToken = body?.premiumToken;
  const overrideEmail =
    typeof body?.email === "string" ? body.email.trim() : null;
  const overrideQuestion =
    typeof body?.question === "string" ? body.question.trim() : null;

  if (!premiumToken && !overrideEmail) {
    // In strict production we *prefer* a token, but allow direct email in TEST or fallback.
    console.warn("⚠️ detailed-report: no premiumToken AND no override email");
    return res
      .status(400)
      .json({ ok: false, error: "Missing premium token or email" });
  }

  // ----- LOOKUP PREMIUM STORE -----
  let cached = null;
  try {
    if (premiumToken) {
      cached = await loadPremiumSubmission(premiumToken);
      console.log(
        "[PREMIUM STORE] detailed-report loadPremiumSubmission:",
        premiumToken,
        !!cached
      );
    }
  } catch (err) {
    console.error("❌ detailed-report: PREMIUM STORE ERROR:", err);
  }

  const fields = cached?.fields || {};

  const getField = (raw, fallback) => {
    if (Array.isArray(raw)) raw = raw[0];
    if (typeof raw === "string") {
      const t = raw.trim();
      return t.length ? t : fallback;
    }
    return fallback;
  };

  const email =
    overrideEmail || getField(fields.email, null);

  const question =
    overrideQuestion ||
    getField(fields.question, "(No question provided)");

  const fullName = getField(fields.fullName, "Guest");
  const birthDate = getField(fields.birthDate, "Not provided");
  const birthCity = getField(fields.birthCity, "Not provided");

  if (!email) {
    console.error(
      "❌ detailed-report: no usable email (neither token payload nor override)"
    );
    return res.status(400).json({
      ok: false,
      error: "Email missing in token payload and request body",
    });
  }

  // ----- LONG-FORM PREMIUM HTML -----
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
      Your birth patterns connect to learning cycles, inner transformation and
      timed opportunity gates activated by transits and progressions.
    </p>

    <h3>🔢 Numerology Layer</h3>
    <p>
      Your life theme is governed by repeating vibration patterns that influence
      relationships, career momentum and personal decision cycles.
    </p>

    <h3>✋ Palmistry Layer</h3>
    <p>
      Even without a physical palm image, your energetic profile points toward 
      adaptive intelligence, resilience under pressure and intuitive sensitivity.
    </p>

    <h3>🧠 Shadow & Growth Themes</h3>
    <p>
      The main internal tension sits between safety and expansion. Working with
      this consciously turns friction into momentum.
    </p>

    <h3>💎 Key Guidance</h3>
    <ul>
      <li>Allow slow-building opportunities instead of forcing outcomes.</li>
      <li>Review choices every 9–12 months to ride your natural cycles.</li>
      <li>Lean into intuition when logic is stuck, not instead of it.</li>
    </ul>

    <hr style="margin:28px 0">

    <p style="font-size:13px; color:#777;">
      This message was generated exclusively for you as a premium user.
      Please keep your report for personal reference only.
    </p>

    <p style="margin-top:20px;">
      With care,<br>
      <strong>Melodie ✨</strong>
    </p>
  </div>
  `;

  // ----- SEND EMAIL -----
  try {
    const sendResult = await sendEmailHTML({
      to: email,
      subject: process.env.EMAIL_SUBJECT_PREMIUM || "Your Premium Spiritual Report",
      html,
    });
    console.log("✅ detailed-report: email sent via sendEmailHTML:", sendResult);
  } catch (err) {
    console.error("❌ detailed-report: EMAIL FAILURE:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Failed to send premium email" });
  }

  // ----- DELETE TOKEN (best-effort) -----
  if (premiumToken) {
    try {
      await deletePremiumSubmission(premiumToken);
      console.log(
        "[PREMIUM STORE] detailed-report deletePremiumSubmission:",
        premiumToken
      );
    } catch (err) {
      console.warn(
        "⚠️ detailed-report: failed to delete premium token (non-fatal):",
        err
      );
    }
  }

  // ----- SUCCESS -----
  return res.status(200).json({
    ok: true,
    message: "✅ Premium email sent successfully",
  });
}
