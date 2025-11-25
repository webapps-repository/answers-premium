// /api/system-test.js
//
// https://answers-rust.vercel.app/api/system-test.js
// https://answers-rust.vercel.app/api/system-test.js?token=TEST
// https://answers-rust.vercel.app/api/system-test.js?token=YOUR_TOKEN
// https://answers-rust.vercel.app/api/system-test.js?token=TEST123

// /api/system-test.js — FULL DEBUG MODE
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
     GATHER DEBUG INFO
  ------------------------------------------- */
  const IP =
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    "unknown";

  const token =
    req.query.token ||
    req.body?.token ||
    req.body?.recaptchaToken ||
    null;

  const ENV = {
    RECAPTCHA_SECRET_PRESENT: !!process.env.RECAPTCHA_SECRET_KEY,
    OPENAI_API_KEY_PRESENT: !!process.env.OPENAI_API_KEY,
    RESEND_API_KEY_PRESENT: !!process.env.RESEND_API_KEY,
  };

  const RECAPTCHA = {
    TOKEN_RECEIVED: token,
    raw: null,
    ok: false,
    error: null,
    ip: IP
  };

  const OPENAI_TEST = {
    ok: false,
    error: null,
    response: null
  };

  const EMAIL_TEST = {
    ok: false,
    error: null
  };

  const ENGINE_TEST = {
    ok: false,
    error: null,
    output: null
  };

  const FORM_PARSE = {
    ok: false,
    error: null,
    fields: null,
    files: null
  };

  /* -------------------------------------------
     FORM PARSER TEST (POST ONLY)
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
     RECAPTCHA TEST
  ------------------------------------------- */
  if (token) {
    try {
      const result = await verifyRecaptcha(token, IP);
      RECAPTCHA.raw = result.raw || result;
      RECAPTCHA.ok = result.ok || false;

      if (!RECAPTCHA.ok) RECAPTCHA.error = result.raw;
    } catch (err) {
      RECAPTCHA.error = String(err);
    }
  } else {
    RECAPTCHA.error = "No token provided";
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
        subject: "Test Email (Dry Run)",
        html: "<p>This is a system test.</p>",
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
    const out = await runAllEngines({
      question: "test",
      mode: "technical",
      uploadedFile: null
    });

    ENGINE_TEST.ok = true;
    ENGINE_TEST.output = out;
  } catch (err) {
    ENGINE_TEST.error = String(err);
  }

  /* -------------------------------------------
     FINAL RESPONSE
  ------------------------------------------- */
  return res.json({
    ok: true,
    time_ms: Date.now() - start,
    method,
    IP,
    ENV,
    TOKEN_PRESENT: !!token,

    RECAPTCHA,
    OPENAI_TEST,
    EMAIL_TEST,
    ENGINE_TEST,
    FORM_PARSE,

    headers: req.headers
  });
}
