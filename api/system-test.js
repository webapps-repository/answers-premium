// /api/system-test.js
export const runtime = "nodejs";

import { sendEmailHTML } from "../lib/utils.js";
import { buildUniversalEmailHTML } from "../lib/insights.js";

export default async function handler(req, res) {
  const tests = {};

  // env
  tests.OPENAI = !!process.env.OPENAI_API_KEY;
  tests.RESEND = !!process.env.RESEND_API_KEY;

  // email test
  try {
    const html = buildUniversalEmailHTML({
      title: "System Test Email",
      question: "Diagnostics",
      engines: { test: "OK" }
    });

    await sendEmailHTML({
      to: process.env.RESEND_FROM,
      subject: "System Test Email",
      html
    });

    tests.EMAIL = true;
  } catch (e) {
    tests.EMAIL = false;
  }

  return res.status(200).json({ ok: true, tests });
}
