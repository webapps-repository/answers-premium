export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmailHTML } from "../lib/utils.js";
import * as premiumStore from "../lib/premium-store.js";

export default async function handler(req, res) {

  /* ✅ FULL CORS */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Not allowed" });

  /* ✅ JSON PARSE */
  let body = {};
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    body = JSON.parse(raw || "{}");
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const premiumToken = body.premiumToken;
  if (!premiumToken) return res.status(400).json({ error: "Missing token" });

  const cached = await premiumStore.loadPremiumSubmission(premiumToken);
  if (!cached) return res.status(404).json({ error: "Token expired" });

  const email = cached.fields?.email;
  const question = cached.fields?.question;

  const html = `
    <div style="padding:20px;">
      <h2>Your Premium Report</h2>
      <p><strong>Your Question:</strong> ${question}</p>
      <p>Your premium expansion is now unlocked.</p>
    </div>
  `;

  await sendEmailHTML({
    to: email,
    subject: "Your Premium Report",
    html
  });

  await premiumStore.deletePremiumSubmission(premiumToken);

  return res.status(200).json({
    ok: true,
    message: "Premium email sent"
  });
}
