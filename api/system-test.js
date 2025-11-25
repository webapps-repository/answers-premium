// /api/system-test.js
//
// https://answers-rust.vercel.app/api/system-test.js

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { verifyRecaptcha } from "../lib/utils.js";
import { sendEmailHTML } from "../lib/utils.js";
import { runAllEngines } from "../lib/engines.js";
import { classifyQuestion } from "../lib/ai.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  if (req.method === "OPTIONS") return res.status(200).end();

  const report = {
    ok: true,
    tests: {},
    RECAPTCHA_RAW: {},
    RECAPTCHA_ERROR_CODES: [],
    RECAPTCHA_TOKEN_RECEIVED: null,
    ENV: {
      RECAPTCHA_SECRET_PRESENT: !!process.env.RECAPTCHA_SECRET,
      RESEND_API_KEY_PRESENT: !!process.env.RESEND_API_KEY,
      OPENAI_API_KEY_PRESENT: !!process.env.OPENAI_API_KEY
    }
  };

  // ============================
  // 1. Test invisible v2 token delivery
  // ============================
  let token =
    req.body?.token ||
    req.query?.token ||
    req.body?.recaptchaToken ||
    req.query?.recaptchaToken ||
    null;

  report.RECAPTCHA_TOKEN_RECEIVED = token;

  if (!token) {
    report.tests.RECAPTCHA_TOKEN_MISSING = false;
    report.tests.RECAPTCHA_PROBE_OK = false;

    return res.json(report);
  }

  // ============================
  // 2. Full recaptcha validation
  // ============================
  try {
    const check = await verifyRecaptcha(token, req.headers["x-forwarded-for"]);

    report.RECAPTCHA_RAW = check;

    if (!check.ok) {
      report.tests.RECAPTCHA_PROBE_OK = false;
      report.RECAPTCHA_ERROR_CODES = check?.errors || ["unknown"];
    } else {
      report.tests.RECAPTCHA_PROBE_OK = true;
    }
  } catch (err) {
    report.tests.RECAPTCHA_PROBE_OK = false;
    report.RECAPTCHA_ERROR_CODES.push("verifyRecaptcha-crash");
  }

  // ============================
  // 3. Test OpenAI working
  // ============================
  try {
    const c = await classifyQuestion("test question");
    report.tests.OPENAI = !!c;
  } catch (e) {
    report.tests.OPENAI = false;
  }

  // ============================
  // 4. Test email sending
  // ============================
  try {
    await sendEmailHTML({
      to: "sales@hazcam.io",
      subject: "System Test Email",
      html: "<div>Test OK</div>"
    });
    report.tests.EMAIL = true;
  } catch (err) {
    report.tests.EMAIL = false;
    report.EMAIL_ERROR = err?.message || err;
  }

  // ============================
  // 5. Test engines
  // ============================
  try {
    const out = await runAllEngines({
      question: "diagnostics",
      mode: "personal",
      uploadedFile: null
    });
    report.tests.ENGINES = !!out;
  } catch (e) {
    report.tests.ENGINES = false;
    report.ENGINE_ERROR = e?.message || e;
  }

  return res.json(report);
}
