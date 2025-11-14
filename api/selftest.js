// /api/selftest.js
import { classifyQuestion } from "./utils/classify-question.js";
import { verifyRecaptcha } from "./utils/verify-recaptcha.js";

export default async function handler(req, res) {
  const results = {};

  // reCAPTCHA test (synthetic)
  try {
    const r = await verifyRecaptcha("dummy-test-token");
    results.recaptcha = r.ok === false ? "OK (expected fail)" : "Unexpected behaviour";
  } catch (err) {
    results.recaptcha = "OK (caught)";
  }

  // classifier test
  try {
    const c = await classifyQuestion("Will I find love?");
    results.classifier = c.type ? "OK" : "FAIL";
  } catch (err) {
    results.classifier = "FAIL";
  }

  // overall
  const ok = Object.values(results).every(v => v.startsWith("OK"));
  res.json({ ok, results });
}
