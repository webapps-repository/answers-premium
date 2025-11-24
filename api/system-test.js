// /api/system-test.js
//
//

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { verifyRecaptcha, sendEmailHTML } from "../lib/utils.js";
import { completeJson } from "../lib/ai.js";

export default async function handler(req, res) {
  const report = {
    recaptcha: "FAIL",
    openai: "FAIL",
    email: "FAIL",
    overall: "FAIL"
  };

  // Check recaptcha secret present
  if (process.env.RECAPTCHA_SECRET_KEY) {
    report.recaptcha = "PASS";
  }

  // Check OpenAI
  try {
    const test = await completeJson(`Return JSON ONLY: {"ping":"ok"}`);
    if (test?.ping === "ok") report.openai = "PASS";
  } catch {}

  // Check email
  try {
    const dest = process.env.TEST_EMAIL || "youremail@example.com";
    await sendEmailHTML({
      to: dest,
      subject: "System Test OK",
      html: "<h1>System Test Passed</h1>"
    });
    report.email = "PASS";
  } catch {}

  if (report.recaptcha === "PASS" &&
      report.openai === "PASS" &&
      report.email === "PASS")
    report.overall = "PASS";

  return res.json(report);
}
