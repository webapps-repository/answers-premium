export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmailHTML } from "../lib/utils.js";
import * as premiumStore from "../lib/premium-store.js";

export default async function handler(req, res) {

  /* ✅ FULL CORS */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Not allowed" });
  }

  /* ✅ SAFE JSON PARSE */
  let body = {};
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    body = JSON.parse(raw || "{}");
  } catch (err) {
    console.error("❌ JSON PARSE ERROR:", err);
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const premiumToken = body.premiumToken;
  if (!premiumToken) {
    return res.status(400).json({ error: "Missing token" });
  }

  /* ✅ LOAD TOKEN */
  const cached = await premiumStore.loadPremiumSubmission(premiumToken);
  if (!cached) {
    return res.status(404).json({ error: "Token expired or invalid" });
  }

  /* ✅✅✅ SAFE FIELD NORMALIZATION */
  const rawEmail = cached.fields?.email;
  const rawQuestion = cached.fields?.question;

  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
  const question = Array.isArray(rawQuestion) ? rawQuestion[0] : rawQuestion;

  if (!email) {
    return res.status(400).json({ error: "Email missing in token payload" });
  }

  /* ✅ BUILD PREMIUM EMAIL */
  const html = `
    <div style="padding:20px;font-family:system-ui;">
      <h2>Your Premium Report</h2>

      <p><strong>Your Question:</strong></p>
      <p>${question || "(not provided)"}</p>

      <p style="margin-top:20px;">
        ✅ Your premium expansion has now been unlocked.
      </p>

      <p>
        One of our advanced engines will now generate your extended report
        and it will be delivered in a follow-up email shortly.
      </p>

      <p style="margin-top:24px;color:#666;font-size:13px;">
        You may safely close this page.
      </p>
    </div>
  `;

  /* ✅ SEND EMAIL */
  try {
    await sendEmailHTML({
      to: email,
      subject: "Your Premium Report",
      html
    });
  } catch (err) {
    console.error("❌ EMAIL SEND ERROR:", err);
    return res.status(500).json({ error: "Email send failed" });
  }

  /* ✅ DELETE TOKEN (ONE-TIME USE) */
  await premiumStore.deletePremiumSubmission(premiumToken);

  /* ✅ FINAL RESPONSE */
  return res.status(200).json({
    ok: true,
    message: "Premium email sent successfully"
  });
}
