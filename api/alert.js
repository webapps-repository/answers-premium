// /api/alert.js
// Sends alert email automatically when self-test detects failure.

import { sendEmailHTML } from "./utils/send-email.js";

export default async function handler(req, res) {
  const { message } = req.body || {};

  await sendEmailHTML({
    to: "sales@hazcam.io",
    subject: "Melodies Web — ALERT",
    html: `<p>Automated alert:</p><pre>${message}</pre>`
  });

  res.json({ ok: true });
}
