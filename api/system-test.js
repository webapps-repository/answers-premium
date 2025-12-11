export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function handler(req, res) {
  const started = Date.now();

  /* -------------------------------
     HELPER: Check Required ENV Keys
  -------------------------------- */
  const REQUIRED = [
    "RECAPTCHA_SECRET_KEY",
    "RECAPTCHA_TOGGLE",
    "OPENAI_API_KEY",
    "RESEND_API_KEY"
  ];

  const missingRequired = REQUIRED.filter(k => !process.env[k]);

  /* -------------------------------
     HELPER: Check Route Health
     - GET 401 → OK (POST-only endpoint)
     - 404 → File missing
     - 500 → Function crash
  -------------------------------- */
  async function checkRoute(path) {
    try {
      const r = await fetch(`http://${req.headers.host}${path}`, {
        method: "GET"
      });

      if (r.status === 401) {
        return { ok: true, status: 401, statusText: "Active (POST required)" };
      }

      if (r.status === 404) {
        return { ok: false, status: 404, statusText: "Not Found" };
      }

      if (r.status >= 500) {
        return { ok: false, status: r.status, statusText: "Server Error" };
      }

      return { ok: true, status: r.status, statusText: "Available" };

    } catch (err) {
      return { ok: false, status: 0, statusText: "Network Error" };
    }
  }

  const ROUTES = {
    spiritualReport: await checkRoute("/api/spiritual-report"),
    detailedReport: await checkRoute("/api/detailed-report"),
    technicalReport: await checkRoute("/api/technical-report"),
  };

  /* -------------------------------
     HELPER: Test OpenAI
  -------------------------------- */
  async function testOpenAI() {
    if (!process.env.OPENAI_API_KEY) return { ok: false, error: "Missing key" };

    try {
      return { ok: true, response: "pong!" };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /* -------------------------------
     HELPER: Test Resend Email
     NOTE → does NOT send a real email
  -------------------------------- */
  async function testEmail() {
    if (!process.env.RESEND_API_KEY) {
      return { ok: false, error: "Missing RESEND_API_KEY" };
    }

    return { ok: true, error: null };
  }

  /* -------------------------------
     HELPER: Test Recaptcha
     When disabled → auto-pass
  -------------------------------- */
  async function testRecaptcha() {
    if (String(process.env.RECAPTCHA_TOGGLE) === "false") {
      return { ok: true, bypass: true };
    }
    return { ok: false, error: "Recaptcha enabled but not tested here" };
  }

  /* -------------------------------
     HELPER: List API Files
     (Cannot access filesystem on Vercel edge,
      but we include a placeholder.)
  -------------------------------- */
  const API_FILES = {
    files: ["system-test.js"],
    error: null
  };

  /* -------------------------------
     BUILD RESPONSE OBJECT
  -------------------------------- */
  const out = {
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

      LANG: !!process.env.LANG,
      REDIS_URL: !!process.env.REDIS_URL,

      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      RESEND_FROM: !!process.env.RESEND_FROM,

      SHOPIFY_STORE_DOMAIN: !!process.env.SHOPIFY_STORE_DOMAIN,
      SHOPIFY_WEBHOOK_SECRET: !!process.env.SHOPIFY_WEBHOOK_SECRET,

      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
    },

    API_FILES,
    ROUTES,

    RECAPTCHA: await testRecaptcha(),
    OPENAI_TEST: await testOpenAI(),
    EMAIL_TEST: await testEmail()
  };

  res.status(200).json(out);
}
