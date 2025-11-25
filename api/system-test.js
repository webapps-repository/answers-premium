// /api/system-test.js
//
// https://answers-rust.vercel.app/api/system-test.js
// https://answers-rust.vercel.app/api/system-test.js?token=TEST
// https://answers-rust.vercel.app/api/system-test.js?token=YOUR_TOKEN
// https://answers-rust.vercel.app/api/system-test.js?token=TEST123

// /api/system-test.js — FULL DEBUG MODE WITH ENV KEY ENUM
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import formidable from "formidable";
import { verifyRecaptcha, sendEmailHTML } from "../lib/utils.js";
import { runAllEngines } from "../lib/engines.js";
import OpenAI from "openai";

export default async function handler(req, res) {
  const start = Date.now();
  const method = req.method;

  /* -------------------------------------------
     CORS
  ------------------------------------------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  if (method === "OPTIONS")
    return res.status(200).json({ ok: true, msg: "CORS OK" });

  /* -------------------------------------------
     META
  ------------------------------------------- */
  const IP =
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    "unknown";

  const token =
    req.query.token ||
    req.body?.recaptchaToken ||
    req.body?.token ||
    null;

  const TOGGLE = process.env.RECAPTCHA_TOGGLE || "false";

  /* -------------------------------------------
     ENV KEY VALIDATION
  ------------------------------------------- */

  // 1. All keys provided by Vercel
  const ALL_ENV_VARS = Object.keys(process.env);

  // 2. Required keys for this project
  const REQUIRED_KEYS = [
    "RECAPTCHA_SECRET_KEY",
    "RECAPTCHA_TOGGLE", 
    "OPENAI_API_KEY",
    "RESEND_API_KEY"
  ];

  // 3. Validate presence
  const ENV_KEYS = {};
  for (const key of ALL_ENV_VARS) {
    // never send secret values, only boolean presence
    ENV_KEYS[key] = process.env[key] ? true : false;
  }

  // 4. Missing required
  const MISSING_REQUIRED = REQUIRED_KEYS.filter(
    key => !process.env[key]
  );

  // 5. Extra (keys present but not required)
  const EXTRA_KEYS = ALL_ENV_VARS.filter(
    key => !REQUIRED_KEYS.includes(key)
  );

  const ENV = {
    RECAPTCHA_TOGGLE: TOGGLE,
    REQUIRED_KEYS,
    MISSING_REQUIRED,
    ENV_KEYS,
    EXTRA_KEYS
  };

  /* -------------------------------------------
     RESULT OBJECTS
  ------------------------------------------- */
  const RECAPTCHA = {
    TOKEN_RECEIVED: token,
    toggle: TOGGLE,
    raw: null,
    ok: false,
    bypass: false,
    error: null,
    ip: IP
  };

  const OPENAI_TEST = { ok: false, error: null, response: null };
  const EMAIL_TEST = { ok: false, error: null };
  const ENGINE_TEST = { ok: false, error: null, output: null };
  const FORM_PARSE = { ok: false, error: null, fields: null, files: null };

  /* -------------------------------------------
     FORM PARSER TEST (POST)
  ------------------------------------------- */
  if (method === "POST") {
    try {
      const form = formidable({ multiples: false });
      const { fields, files } = await new Promise((resolve, reject) =>
        form.parse(req, (err, f, fl) =>
          err ? reject(err) : resolve({ fields: f, files: fl })
        )
      );
      FORM_PARSE.ok = true;
      FORM_PARSE.fields = fields;
      FORM_PARSE.files = files;
    } catch (err) {
      FORM_PARSE.error = String(err);
    }
  }

  /* -------------------------------------------
     RECAPTCHA TEST (RESPECT TOGGLE)
  ------------------------------------------- */
  if (TOGGLE === "false") {
    RECAPTCHA.ok = true;
    RECAPTCHA.bypass = true;
    RECAPTCHA.raw = { bypass: true };
  } else {
    if (!token) {
      RECAPTCHA.error = "No token provided";
    } else {
      try {
        const result = await verifyRecaptcha(token, IP);
        RECAPTCHA.raw = result.raw || result;
        RECAPTCHA.ok = result.ok || false;
        if (!RECAPTCHA.ok) RECAPTCHA.error = result.raw;
      } catch (err) {
        RECAPTCHA.error = String(err);
      }
    }
  }

  /* -------------------------------------------
     OPENAI TEST
  ------------------------------------------- */
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const ai = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "ping" }]
      });

      OPENAI_TEST.ok = true;
      OPENAI_TEST.response = ai.choices?.[0]?.message?.content || null;
    } catch (err) {
      OPENAI_TEST.error = String(err);
    }
  }

  /* -------------------------------------------
     EMAIL TEST (dry run)
  ------------------------------------------- */
  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmailHTML({
        to: "noreply@example.com",
        subject: "System Test Email",
        html: "<p>System Test OK</p>",
        dryRun: true
      });
      EMAIL_TEST.ok = true;
    } catch (err) {
      EMAIL_TEST.error = String(err);
    }
  }

  /* -------------------------------------------
     ENGINE TEST
  ------------------------------------------- */
  try {
    ENGINE_TEST.output = await runAllEngines({
      question: "test",
      mode: "technical",
      uploadedFile: null
    });
    ENGINE_TEST.ok = true;
  } catch (err) {
    ENGINE_TEST.error = String(err);
  }

  /* -------------------------------------------
     FINAL OUTPUT
  ------------------------------------------- */
  return res.json({
    ok: true,
    time_ms: Date.now() - start,
    method,
    IP,
    TOKEN_PRESENT: !!token,

    // Deep system diagnostics
    ENV,
    RECAPTCHA,
    OPENAI_TEST,
    EMAIL_TEST,
    ENGINE_TEST,
    FORM_PARSE,

    headers: req.headers
  });
}
