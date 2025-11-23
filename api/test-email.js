// /api/test-email.js
// /api/test-email.js
//
// https://answers-rust.vercel.app/api/test-email?email=henrycvalk@gmail.com

import { applyCORS, sendEmailHTML } from "../lib/utils.js";

export const config = {
  runtime: "nodejs",
  api: { bodyParser: true }
};

export default async function handler(req, res) {
  if (applyCORS(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Only GET allowed" });
  }

  try {
    const email = req.query.email || "henrycvalk@gmail.com";

    const result = await sendEmailHTML({
      to: email,
      subject: "TEST EMAIL WORKS",
      html: `<h1>Resend test OK</h1><p>This is a live test email.</p>`
    });

    if (!result.success) {
      return res.status(500).json({
        ok: false,
        error: result.error
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Email sent!",
      details: result.out
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
