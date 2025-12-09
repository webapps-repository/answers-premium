// /api/system-test.js — FULL PLATFORM + ENGINE + EMAIL + AI + CORS TEST

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import formidable from "formidable";
import { verifyRecaptcha, sendEmailHTML } from "../lib/utils.js";
import { runAllEngines } from "../lib/engines.js";
import OpenAI from "openai";

export default async function handler(req, res) {
  const start = Date.now();
  const method = req.method;

  /* ---------------- CORS PLATFORM TEST ---------------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (method === "OPTIONS") {
    return res.status(200).json({
      ok: true,
      cors: "PASSED",
      platform: "OPTIONS accepted"
    });
  }

  /* ---------------- META ---------------- */
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

  /* ---------------- ENV ENUM ---------------- */
  const ALL_ENV_VARS = Object.keys(process.env);

  const REQUIRED_KEYS = [
    "RECAPTCHA_SECRET_KEY",
    "RECAPTCHA_TOGGLE",
    "OPENAI_API_KEY",
    "RESEND_API_KEY"
  ];

  const ENV_KEYS = {};
  for (const key of ALL_ENV_VARS) {
    ENV_KEYS[key] = process.env[key] ? true : false;
  }

  const MISSING_REQUIRED = REQUIRED_KEYS.filter(
    key => !process.env[key]
  );

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

  /* ---------------- RESULT OBJECTS ---------------- */
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

  /* ---------------- FORM PARSER TEST ---------------- */
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

  /* ---------------- RECAPTCHA TEST ---------------- */
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

  /* ---------------- OPENAI TEST ---------------- */
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const ai = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: "ping" }]
      });

      OPENAI_TEST.ok = true;
      OPENAI_TEST.response =
        ai.choices?.[0]?.message?.content || null;
    } catch (err) {
      OPENAI_TEST.error = String(err);
    }
  }

  /* ---------------- EMAIL TEST (DRY RUN) ---------------- */
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

  /* ---------------- ENGINE TEST ---------------- */
  try {
    ENGINE_TEST.output = await runAllEngines({
      question: "test",
      mode: "personal",
      uploadedFile: null
    });
    ENGINE_TEST.ok = true;
  } catch (err) {
    ENGINE_TEST.error = String(err);
  }

  /* ---------------- FINAL OUTPUT ---------------- */
  return res.json({
    ok: true,
    time_ms: Date.now() - start,
    method,
    IP,
    TOKEN_PRESENT: !!token,

    ENV,
    RECAPTCHA,
    OPENAI_TEST,
    EMAIL_TEST,
    ENGINE_TEST,
    FORM_PARSE
  });
}
