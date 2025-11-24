// /api/system-test.js
//
// https://answers-rust.vercel.app/api/system-test.js

export const runtime = "nodejs";

import { sendEmailHTML, verifyRecaptcha } from "../lib/utils.js";
import { buildUniversalEmailHTML } from "../lib/insights.js";

export default async function handler(req, res) {
  const tests = {};

  // ---- ENV CHECKS ----
  tests.OPENAI = !!process.env.OPENAI_API_KEY;
  tests.RESEND = !!process.env.RESEND_API_KEY;
  tests.RESEND_FROM = !!process.env.RESEND_FROM;
  tests.RECAPTCHA_SECRET_PRESENT = !!process.env.RECAPTCHA_SECRET_KEY;

  // ---- RECAPTCHA PROBE ----
  try {
    // We expect this to FAIL because "test-probe-token" isn't a real token,
    // but the *error-codes* tell us if the SECRET is valid.
    const probe = await verifyRecaptcha("test-probe-token", null);

    tests.RECAPTCHA_PROBE_OK = probe.ok;
    tests.RECAPTCHA_RAW = probe.raw || null;

    const codes = Array.isArray(probe.raw?.["error-codes"])
      ? probe.raw["error-codes"]
      : [];

    tests.RECAPTCHA_ERROR_CODES = codes;

    // If the secret is wrong, Google returns "invalid-input-secret"
    tests.RECAPTCHA_SECRET_VALID = !codes.includes("invalid-input-secret");
  } catch (e) {
    tests.RECAPTCHA_EXCEPTION = e.message || String(e);
  }

  // ---- EMAIL TEST ----
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
    tests.EMAIL_ERROR = e.message || String(e);
  }

  return res.status(200).json({ ok: true, tests });
}
