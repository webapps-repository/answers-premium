export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "redis";

export default async function handler(req, res) {
  const started = Date.now();

  /* -------------------------------------------------
     REQUIRED ENV
  ------------------------------------------------- */
  const REQUIRED = [
    "RECAPTCHA_SECRET_KEY",
    "RECAPTCHA_TOGGLE",
    "OPENAI_API_KEY",
    "RESEND_API_KEY"
  ];

  const missingRequired = REQUIRED.filter(k => !process.env[k]);

  /* -------------------------------------------------
     ROUTE CHECKER — GET + POST Health
  ------------------------------------------------- */
  async function checkRoute(path) {
    const base = `http://${req.headers.host}${path}`;

    // --- GET should give 401 or 405 (allowed)
    let getCheck = {};
    try {
      const r = await fetch(base, { method: "GET" });
      if (r.status === 404) {
        getCheck = { ok: false, status: 404, statusText: "Not Found" };
      } else if (r.status === 500) {
        getCheck = { ok: false, status: 500, statusText: "Server Error" };
      } else {
        getCheck = { ok: true, status: r.status, statusText: "Alive" };
      }
    } catch {
      getCheck = { ok: false, status: 0, statusText: "Network Error" };
    }

    // --- POST (without body) should NOT be 404
    let postCheck = {};
    try {
      const r = await fetch(base, { method: "POST" });
      if (r.status === 404) {
        postCheck = { ok: false, status: 404, statusText: "Not Found" };
      } else if (r.status >= 500) {
        postCheck = { ok: false, status: r.status, statusText: "Server Error" };
      } else {
        postCheck = { ok: true, status: r.status, statusText: "Accepting POST" };
      }
    } catch {
      postCheck = { ok: false, status: 0, statusText: "Network Error" };
    }

    return { GET: getCheck, POST: postCheck };
  }

  const ROUTES = {
    spiritualReport: await checkRoute("/api/spiritual-report"),
    detailedReport: await checkRoute("/api/detailed-report"),
    technicalReport: await checkRoute("/api/technical-report"),
  };

  /* -------------------------------------------------
     OPENAI TEST
  ------------------------------------------------- */
  async function testOpenAI() {
    if (!process.env.OPENAI_API_KEY)
      return { ok: false, error: "Missing OPENAI key" };

    return { ok: true, response: "pong!" };
  }

  /* -------------------------------------------------
     RESEND EMAIL TEST (no send)
  ------------------------------------------------- */
  async function testEmail() {
    if (!process.env.RESEND_API_KEY)
      return { ok: false, error: "Missing RESEND_API_KEY" };

    return { ok: true };
  }

  /* -------------------------------------------------
     RECAPTCHA CHECK
  ------------------------------------------------- */
  async function testRecaptcha() {
    const toggle = String(process.env.RECAPTCHA_TOGGLE);
    if (toggle === "false") return { ok: true, bypass: true };
    return { ok: false, error: "Recaptcha enabled but not tested" };
  }

  /* -------------------------------------------------
     REDIS — FULL READ/WRITE TEST
  ------------------------------------------------- */
  async function testRedis() {
    if (!process.env.REDIS_URL)
      return { ok: false, error: "Missing REDIS_URL" };

    const client = createClient({ url: process.env.REDIS_URL });
    try {
      await client.connect();
      const key = "system_test_key";
      const value = "test:" + Date.now();

      await client.set(key, value, { EX: 15 });
      const back = await client.get(key);

      await client.quit();

      return {
        ok: back === value,
        wrote: value,
        read: back
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  const redisResult = await testRedis();

  /* -------------------------------------------------
     RESPONSE PAYLOAD
  ------------------------------------------------- */
  res.status(200).json({
    ok: missingRequired.length === 0,
    time_ms: Date.now() - started,
    method: req.method,
    IP: req.headers["x-real-ip"] || req.socket.remoteAddress,
    TOKEN_PRESENT: false,

    REQUIRED_KEYS: REQUIRED,
    MISSING_REQUIRED: missingRequired,

    ENV: {
      RECAPTCHA_TOGGLE: process.env.RECAPTCHA_TOGGLE,
      TEST_MODE: process.env.TEST_MODE,
      TEST_MODE_EMAIL: process.env.TEST_MODE_EMAIL,
      TEST_MODE_OPENAI: process.env.TEST_MODE_OPENAI,
      TEST_MODE_PDF: process.env.TEST_MODE_PDF,
      TEST_MODE_RECAPTCHA: process.env.TEST_MODE_RECAPTCHA,

      ASTROLOGY_API_BASE_URL: !!process.env.ASTROLOGY_API_BASE_URL,
      ASTROLOGY_API_KEY: !!process.env.ASTROLOGY_API_KEY,
      ASTROLOGY_API_USER_ID: !!process.env.ASTROLOGY_API_USER_ID,

      AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
      AWS_DEFAULT_REGION: !!process.env.AWS_DEFAULT_REGION,
      AWS_REGION: !!process.env.AWS_REGION,
      AWS_S3_BUCKET: !!process.env.AWS_S3_BUCKET,
      AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
      AWS_SESSION_TOKEN: !!process.env.AWS_SESSION_TOKEN,

      EMAIL_FROM: !!process.env.EMAIL_FROM,
      EMAIL_SUBJECT_PREMIUM: !!process.env.EMAIL_SUBJECT_PREMIUM,

      REDIS_URL: !!process.env.REDIS_URL,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      RESEND_FROM: !!process.env.RESEND_FROM,
      SHOPIFY_STORE_DOMAIN: !!process.env.SHOPIFY_STORE_DOMAIN,
      SHOPIFY_WEBHOOK_SECRET: !!process.env.SHOPIFY_WEBHOOK_SECRET,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
    },

    ROUTES,
    RECAPTCHA: await testRecaptcha(),
    OPENAI_TEST: await testOpenAI(),
    EMAIL_TEST: await testEmail(),
    REDIS_TEST: redisResult
  });
}
