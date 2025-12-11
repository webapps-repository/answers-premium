// /api/email-test.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmailHTML } from "../lib/utils.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Not allowed" });
  }

  const to =
    process.env.RESEND_FROM ||
    process.env.EMAIL_FROM;

  if (!to) {
    return res.status(400).json({
      ok: false,
      error: "Missing RESEND_FROM or EMAIL_FROM in env",
    });
  }

  try {
    await sendEmailHTML({
      to,
      subject: "answers-premium: system email test",
      html: `<div style="font-family:system-ui;padding:12px;">
               System-test email from <strong>answers-premium</strong> at 
               ${new Date().toISOString()}.
             </div>`,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("❌ EMAIL-TEST ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: String(err?.message || err),
    });
  }
}

