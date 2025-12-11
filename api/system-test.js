// /api/system-test.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const started = Date.now();
  const method = req.method || "UNKNOWN";

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;

  // --- ENV SNAPSHOT (similar to your current output) ---
  const REQUIRED_KEYS = [
    "RECAPTCHA_SECRET_KEY",
    "RECAPTCHA_TOGGLE",
    "OPENAI_API_KEY",
    "RESEND_API_KEY",
  ];

  const MISSING_REQUIRED = REQUIRED_KEYS.filter((k) => !process.env[k]);

  const ENV = {
    RECAPTCHA_TOGGLE: process.env.RECAPTCHA_TOGGLE ?? null,
    TEST_MODE: process.env.TEST_MODE ?? null,
    TEST_MODE_EMAIL: process.env.TEST_MODE_EMAIL ?? null,
    TEST_MODE_OPENAI: process.env.TEST_MODE_OPENAI ?? null,
    TEST_MODE_PDF: process.env.TEST_MODE_PDF ?? null,
    TEST_MODE_RECAPTCHA: process.env.TEST_MODE_RECAPTCHA ?? null,

    // presence flags
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
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
  };

  // --- API FILE LISTING (what Vercel actually sees) ---
  let apiFiles = null;
  let apiFilesError = null;

  try {
    const root = process.cwd();
    const apiDir = path.join(root, "api");
    apiFiles = fs.readdirSync(apiDir);
  } catch (err) {
    apiFilesError = err.message;
  }

  // --- ROUTE PROBES (HEAD requests to each API route) ---
  async function probeRoute(routePath) {
    try {
      const base =
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : "http://localhost:3000";

      const url = `${base}${routePath}`;

      const resp = await fetch(url, { method: "HEAD" });
      return {
        ok: true,
        status: resp.status,
        statusText: resp.statusText,
      };
    } catch (err) {
      return {
        ok: false,
        error: err.message,
      };
    }
  }

  const ROUTES = {
    spiritualReport: await probeRoute("/api/spiritual-report"),
    detailedReport: await probeRoute("/api/detailed-report"),
    technicalReport: await probeRoute("/api/technical-report"),
  };

  const time_ms = Date.now() - started;

  return res.status(200).json({
    ok: true,
    time_ms,
    method,
    IP: ip,
    TOKEN_PRESENT: !!req.headers["authorization"],
    REQUIRED_KEYS,
    MISSING_REQUIRED,
    ENV,
    API_FILES: {
      files: apiFiles,
      error: apiFilesError,
    },
    ROUTES,
  });
}
