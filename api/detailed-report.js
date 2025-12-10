export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmailHTML } from "../lib/utils.js";
import { loadPremiumSubmission, deletePremiumSubmission } from "../lib/premium-store.js";

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Not allowed" });

  let body = {};
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    body = JSON.parse(raw || "{}");
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const premiumToken = body?.premiumToken;
  if (!premiumToken) return res.status(400).json({ error: "Missing premium token" });

  const cached = await loadPremiumSubmission(premiumToken);
  if (!cached) return res.status(404).json({ error: "Token expired or invalid" });

  const rawEmail = cached?.fields?.email;
  const rawQuestion = cached?.fields?.question;

  const email =
    Array.isArray(rawEmail) ? rawEmail[0] :
    typeof rawEmail === "string" ? rawEmail.trim() : null;

  const question =
    Array.isArray(rawQuestion) ? rawQuestion[0] :
    typeof rawQuestion === "string" ? rawQuestion.trim() : "(No question provided)";

  if (!email) return res.status(400).json({ error: "Email missing in token payload" });

  const html = `
  <div style="font-family:system-ui; max-width:700px; margin:auto; padding:24px;">
    <h1>🔮 Your Premium Spiritual Report</h1>
    <p><strong>Your Question:</strong></p>
    <p>${question}</p>

    <h3>✨ Expanded Insights</h3>
    <p>This report expands your spiritual reading using hidden pattern extraction.</p>
    <ul>
      <li>Trust delayed opportunities</li>
      <li>Avoid rushed choices</li>
      <li>Cycles repeat every 9–12 months</li>
    </ul>

    <p style="margin-top:20px;">
      With care,<br><strong>Melodie ✨</strong>
    </p>
  </div>
  `;

  try {
    await sendEmailHTML({
      to: email,
      subject: "Your Premium Spiritual Report",
      html
    });
    console.log("✅ PREMIUM EMAIL SENT:", email);
  } catch (err) {
    console.error("❌ EMAIL FAILURE:", err);
    return res.status(500).json({ error: "Failed to send premium email" });
  }

  await deletePremiumSubmission(premiumToken);

  return res.status(200).json({
    ok: true,
    message: "✅ Premium email sent successfully"
  });
}
