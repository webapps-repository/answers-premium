// /api/test-email.js
import { sendEmailHTML } from "./utils/send-email.js";

export default async function handler(req, res) {
  const r = await sendEmailHTML({
    to: "sales@hazcam.io",
    subject: "Test Email — Melodies Web",
    html: "<p>This is a test.</p>"
  });

  res.json(r);
}
