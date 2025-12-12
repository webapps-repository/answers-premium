export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmailHTML } from "../lib/utils.js";
import { loadPremiumSubmission, deletePremiumSubmission } from "../lib/premium-store.js";

export default async function handler(req, res) {
  console.log("🔥 DETAILED REPORT HIT");

  // ---------------------------
  // CORS
  // ---------------------------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Not allowed" });

  // ---------------------------
  // RAW BODY PARSE
  // Accepts:
  //   - text/plain JSON
  //   - application/json
  // ---------------------------
  let raw = "";
  for await (const chunk of req) raw += chunk;

  console.log("📥 RAW BODY:", raw);

  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("❌ JSON PARSE ERROR IN detailed-report.js:", err, raw);
    return res.status(400).json({ error: "Invalid JSON" });
  }

  console.log("📦 PARSED BODY:", body);

  // ---------------------------
  // Extract premiumToken
  // ---------------------------
  const premiumToken =
    body?.premiumToken ||
    body?.token ||
    body?.attributes?.premiumToken ||
    null;

  console.log("🔑 PREMIUM TOKEN RECEIVED:", premiumToken);

  if (!premiumToken) {
    return res.status(400).json({ error: "Missing premium token" });
  }

  // ---------------------------
  // Load stored submission
  // ---------------------------
  let submission = null;
  try {
    submission = await loadPremiumSubmission(premiumToken);
  } catch (err) {
    console.error("❌ ERROR LOADING PREMIUM TOKEN:", err);
  }

  console.log("📦 LOADED SUBMISSION:", submission);

  if (!submission) {
    return res.status(400).json({ error: "Token expired or invalid" });
  }

  // ---------------------------
  // Build HTML email
  // ---------------------------
  const emailHTML = `
    <div style="font-family: system-ui; padding: 20px;">
      <h2>Your Premium Insights</h2>
      <p>${submission.shortAnswer || "No short answer provided."}</p>
      <hr />
      <pre>${JSON.stringify(submission, null, 2)}</pre>
    </div>
  `;

  try {
    await sendEmailHTML({
      to: submission.email,
      subject: "Your Premium Report",
      html: emailHTML
    });
    console.log("📨 PREMIUM EMAIL SENT TO:", submission.email);
  } catch (err) {
    console.error("❌ EMAIL SEND ERROR:", err);
    return res.status(500).json({ error: "Failed to send premium email" });
  }

  // OPTIONAL: Delete token after use to prevent reuse
  try {
    await deletePremiumSubmission(premiumToken);
  } catch (err) {
    console.warn("⚠️ Could not delete premium token:", err);
  }

  return res.status(200).json({ ok: true, message: "Premium report sent" });
}
