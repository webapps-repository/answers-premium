// /api/detailed-report.js — PREMIUM EMAIL ONLY (STABLE IN-MEMORY MODE)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmailHTML } from "../lib/utils.js";
import * as premiumStore from "../lib/premium-store.js";

export default async function handler(req, res) {
  /* ✅ FULL CORS FIX */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  /* ✅ Preflight */
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Not allowed" });
  }

  /* ✅ Manual JSON parse */
  let body = {};
  try {
    body = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", c => (data += c));
      req.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (err) {
          reject(err);
        }
      });
    });
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const premiumToken = body.premiumToken;

  if (!premiumToken) {
    return res.status(400).json({ error: "Missing premium token" });
  }

  /* ✅ SAFE LOAD */
  if (!premiumStore.loadPremiumSubmission) {
    return res.status(500).json({
      error: "premium-store.js missing loadPremiumSubmission export"
    });
  }

  const cached = await premiumStore.loadPremiumSubmission(premiumToken);

  if (!cached) {
    return res.status(404).json({
      error: "Premium token expired or invalid"
    });
  }

  const { fields } = cached;

  const email =
    (fields.email && (Array.isArray(fields.email) ? fields.email[0] : fields.email)) ||
    "";

  const question =
    (fields.question &&
      (Array.isArray(fields.question)
        ? fields.question[0]
        : fields.question)) || "";

  if (!email) {
    return res.status(400).json({
      error: "Email missing in original submission"
    });
  }

  /* ✅ SEND PREMIUM EMAIL (NO PDF, ERROR-PROOF MODE) */
  const html = `
    <div style="font-family:system-ui;padding:20px;">
      <h2>Your Premium Spiritual Report</h2>
      <p>Your premium reading is now unlocked.</p>
      <p><strong>Your Question:</strong> ${question}</p>
      <p>Your full premium expansion is now being prepared.</p>
      <p>— Melodie</p>
    </div>
  `;

  const emailOut = await sendEmailHTML({
    to: email,
    subject: "Your Premium Spiritual Report",
    html
  });

  if (!emailOut.success) {
    return res.status(500).json({
      error: "Email failed",
      detail: emailOut.error
    });
  }

  /* ✅ OPTIONAL: PREVENT TOKEN REUSE */
  if (premiumStore.deletePremiumSubmission) {
    await premiumStore.deletePremiumSubmission(premiumToken);
  }

  return res.status(200).json({
    ok: true,
    message: "Premium email delivered successfully."
  });
}
