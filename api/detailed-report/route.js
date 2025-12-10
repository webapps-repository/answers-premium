import { sendEmailHTML } from "../../../lib/utils.js";
import { loadPremiumSubmission, deletePremiumSubmission } from "../../../lib/premium-store.js";

/* -------------------------------
   ✅ REQUIRED FOR APP ROUTER
-------------------------------- */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------
   ✅ CORS (PRODUCTION SAFE)
-------------------------------- */
function cors(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
}

/* -------------------------------
   ✅ OPTIONS HANDLER (CORS)
-------------------------------- */
export async function OPTIONS(req) {
  const res = new Response(null, { status: 200 });
  cors(res);
  return res;
}

/* -------------------------------
   ✅ MAIN PREMIUM HANDLER
-------------------------------- */
export async function POST(req) {
  const res = new Response();
  cors(res);

  let body = {};
  try {
    body = await req.json();
  } catch (err) {
    console.error("❌ JSON PARSE ERROR:", err);
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const premiumToken = body?.premiumToken;

  if (!premiumToken) {
    return Response.json({ error: "Missing premium token" }, { status: 400 });
  }

  /* ✅ TOKEN LOOKUP */
  const cached = await loadPremiumSubmission(premiumToken);

  if (!cached) {
    return Response.json({ error: "Token expired or invalid" }, { status: 404 });
  }

  /* ✅ SAFE FIELD NORMALIZATION */
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
    return Response.json({ error: "Email missing in token payload" }, { status: 400 });
  }

  /* ✅ PREMIUM EMAIL HTML */
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

    <h3>🌙 Astrology</h3>
    <p>Karmic learning cycles are active in your current phase.</p>

    <h3>🔢 Numerology</h3>
    <p>Repeating vibration patterns influence your relationships and decisions.</p>

    <h3>✋ Palmistry</h3>
    <p>Energetic palm vectors show adaptability and leadership polarity.</p>

    <h3>🧠 Shadow & Growth</h3>
    <p>Your main tension sits between comfort and expansion.</p>

    <h3>💎 Key Guidance</h3>
    <ul>
      <li>Trust delayed opportunities</li>
      <li>Do not rush decision windows</li>
      <li>Cycles repeat every 9–12 months</li>
    </ul>

    <hr style="margin:28px 0">

    <p style="font-size:13px; color:#777;">
      This message is for you as a premium user. Do not share your token.
    </p>

    <p style="margin-top:20px;">
      With care,<br>
      <strong>Melodie ✨</strong>
    </p>
  </div>
  `;

  /* ✅ SEND EMAIL */
  try {
    await sendEmailHTML({
      to: email,
      subject: "Your Premium Spiritual Report",
      html
    });

  } catch (err) {
    console.error("❌ EMAIL FAILURE:", err);
    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }

  /* ✅ DELETE TOKEN (ANTI-REUSE) */
  await deletePremiumSubmission(premiumToken);

  /* ✅ FINAL SUCCESS */
  return Response.json({
    ok: true,
    message: "✅ Premium email sent successfully"
  });
}
