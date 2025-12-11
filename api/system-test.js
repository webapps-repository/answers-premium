export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import FormData from "form-data";
import { createClient } from "redis";

// ---------- Helpers ----------
async function postJSON(url, obj) {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj)
    });
    return { ok: true, status: r.status, statusText: r.statusText };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function postForm(url, fields = {}) {
  try {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);

    const r = await fetch(url, {
      method: "POST",
      body: fd
    });

    const text = await r.text().catch(() => "");
    return {
      ok: true,
      status: r.status,
      statusText: r.statusText,
      response: text.slice(0, 200)
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ---------- MAIN ----------
export default async function handler(req, res) {
  const start = Date.now();
  const out = {
    ok: true,
    time_ms: 0,
    method: req.method,
    IP: req.headers["x-forwarded-for"] || "unknown",
    TOKEN_PRESENT: false
  };

  // --------- ENV REQUIRED ----------
  const REQUIRED = [
    "RECAPTCHA_SECRET_KEY",
    "RECAPTCHA_TOGGLE",
    "OPENAI_API_KEY",
    "RESEND_API_KEY"
  ];

  out.REQUIRED_KEYS = REQUIRED;
  out.MISSING_REQUIRED = REQUIRED.filter(k => !process.env[k]);

  // --------- ENV SUMMARY ----------
  out.ENV = {
    RECAPTCHA_TOGGLE: process.env.RECAPTCHA_TOGGLE,
    TEST_MODE: process.env.TEST_MODE,
    TEST_MODE_EMAIL: process.env.TEST_MODE_EMAIL,
    TEST_MODE_OPENAI: process.env.TEST_MODE_OPENAI,
    TEST_MODE_PDF: process.env.TEST_MODE_PDF,
    TEST_MODE_RECAPTCHA: process.env.TEST_MODE_RECAPTCHA,
    ASTROLOGY_API_BASE_URL: !!process.env.ASTROLOGY_API_BASE_URL,
    ASTROLOGY_API_KEY: !!process.env.ASTROLOGY_API_KEY,
    ASTROLOGY_API_USER_ID: !!process.env.ASTROLOGY_API_USER_ID,
    EMAIL_FROM: !!process.env.EMAIL_FROM,
    EMAIL_SUBJECT_PREMIUM: !!process.env.EMAIL_SUBJECT_PREMIUM,
    REDIS_URL: !!process.env.REDIS_URL,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    RESEND_FROM: !!process.env.RESEND_FROM,
    SHOPIFY_STORE_DOMAIN: !!process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_WEBHOOK_SECRET: !!process.env.SHOPIFY_WEBHOOK_SECRET,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
  };

  const BASE = "https://" + req.headers.host + "/api";

  // ---------- ROUTES CHECK ----------
  out.ROUTES = {
    spiritualReport: {
      GET: await postJSON(BASE + "/spiritual-report", {}),
      POST: await postJSON(BASE + "/spiritual-report", { test: true })
    },
    detailedReport: {
      GET: await postJSON(BASE + "/detailed-report", {}),
      POST: await postJSON(BASE + "/detailed-report", { test: true })
    },
    technicalReport: {
      GET: await postJSON(BASE + "/technical-report", {}),
      POST: await postJSON(BASE + "/technical-report", { test: true })
    }
  };

  // ---------- RECAPTCHA TEST ----------
  out.RECAPTCHA = {
    ok: true,
    bypass: process.env.RECAPTCHA_TOGGLE === "false"
  };

  // ---------- OPENAI TEST ----------
  try {
    const ping = await (await fetch(BASE + "/openai-test")).json();
    out.OPENAI_TEST = { ok: true, response: ping.response };
  } catch (e) {
    out.OPENAI_TEST = { ok: false, error: e.message };
  }

  // ---------- EMAIL TEST ----------
  try {
    const ping = await (await fetch(BASE + "/email-test")).json();
    out.EMAIL_TEST = ping;
  } catch (e) {
    out.EMAIL_TEST = { ok: false, error: e.message };
  }

  // ---------- REDIS TEST ----------
  try {
    const redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();

    const key = "test:" + Date.now();
    await redis.set(key, key);
    const val = await redis.get(key);

    out.REDIS_TEST = { ok: true, wrote: key, read: val };
    await redis.quit();
  } catch (e) {
    out.REDIS_TEST = { ok: false, error: e.message };
  }

  // ---------- FULL FORM SIMULATION (SPIRITUAL REPORT) ----------
  out.SIM_SPIRITUAL = await postForm(BASE + "/spiritual-report", {
    email: "test@example.com",
    question: "Test question"
  });

  // ---------- FULL FORM SIMULATION (DETAILED REPORT) ----------
  out.SIM_DETAILED = await postForm(BASE + "/detailed-report", {
    email: "test@example.com",
    premiumToken: "TEST"
  });

  // ---------- FINISH ----------
  out.time_ms = Date.now() - start;
  return res.status(200).json(out);
}
