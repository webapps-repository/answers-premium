// /api/system-test.js V5 from chatgpt

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* --------- helpers --------- */

const REQUIRED_KEYS = [
  "RECAPTCHA_SECRET_KEY",
  "RECAPTCHA_TOGGLE",
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
];

function baseUrlFromReq(req) {
  const proto =
    req.headers["x-forwarded-proto"] ||
    (process.env.VERCEL ? "https" : "http");
  const host =
    req.headers["x-forwarded-host"] ||
    req.headers["host"] ||
    process.env.VERCEL_URL ||
    "localhost:3000";
  return `${proto}://${host}`;
}

async function probeRoute(base, name) {
  const url = `${base}/api/${name}`;
  const out = {};

  // GET
  try {
    const r = await fetch(url, { method: "GET" });
    out.GET = {
      ok: true,
      status: r.status,
      statusText:
        r.status === 405 ? "Alive (rejects GET)" : r.statusText || "",
    };
  } catch (err) {
    out.GET = {
      ok: false,
      status: 0,
      statusText: `GET error: ${String(err.message || err)}`,
    };
  }

  // POST (send minimal JSON; 400 is acceptable = "I'm alive but body is wrong")
  try {
    const body =
      name === "detailed-report"
        ? { premiumToken: "TEST" }
        : { test: true };
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    out.POST = {
      ok: true,
      status: r.status,
      statusText:
        r.status === 400
          ? "Bad Request (but route alive)"
          : r.statusText || "",
    };
  } catch (err) {
    out.POST = {
      ok: false,
      status: 0,
      statusText: `POST error: ${String(err.message || err)}`,
    };
  }

  return out;
}

async function testOpenAI(base) {
  try {
    const r = await fetch(`${base}/api/openai-test`);
    const text = await r.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (err) {
      return {
        ok: false,
        error: "openai-test did not return JSON",
        raw: text.slice(0, 120),
      };
    }
    return { ok: !!json?.ok, response: json };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

async function testEmail(base) {
  try {
    const r = await fetch(`${base}/api/email-test`);
    const text = await r.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (err) {
      return {
        ok: false,
        error: "email-test did not return JSON",
        raw: text.slice(0, 120),
      };
    }
    return { ok: !!json?.ok, response: json };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

async function testRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    return { ok: false, error: "REDIS_URL not set" };
  }

  try {
    const { createClient } = await import("redis");
    const client = createClient({ url });
    await client.connect();
    const key = `test:${Date.now()}`;
    await client.set(key, key);
    const read = await client.get(key);
    await client.quit();
    return {
      ok: read === key,
      wrote: key,
      read,
    };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

/* --------- main handler --------- */

export default async function handler(req, res) {
  const started = Date.now();
  const base = baseUrlFromReq(req);

  const envInfo = {};
  for (const k of [
    "RECAPTCHA_TOGGLE",
    "TEST_MODE",
    "TEST_MODE_EMAIL",
    "TEST_MODE_OPENAI",
    "TEST_MODE_PDF",
    "TEST_MODE_RECAPTCHA",
    "ASTROLOGY_API_BASE_URL",
    "ASTROLOGY_API_KEY",
    "ASTROLOGY_API_USER_ID",
    "EMAIL_FROM",
    "EMAIL_SUBJECT_PREMIUM",
    "REDIS_URL",
    "RESEND_API_KEY",
    "RESEND_FROM",
    "SHOPIFY_STORE_DOMAIN",
    "SHOPIFY_WEBHOOK_SECRET",
    "OPENAI_API_KEY",
  ]) {
    const v = process.env[k];
    if (v !== undefined) {
      envInfo[k] = k === "OPENAI_API_KEY" || k === "RESEND_API_KEY"
        ? true
        : v;
    }
  }

  const missingRequired = REQUIRED_KEYS.filter(
    (k) => !process.env[k]
  );

  const routes = {
    spiritualReport: await probeRoute(base, "spiritual-report"),
    detailedReport: await probeRoute(base, "detailed-report"),
    technicalReport: await probeRoute(base, "technical-report"),
  };

  // reCAPTCHA: we only report toggle & bypass – system-test requests always bypass
  const recaptcha = {
    ok: true,
    bypass: true,
  };

  const openaiTest = await testOpenAI(base);
  const emailTest = await testEmail(base);
  const redisTest = await testRedis();

  const time_ms = Date.now() - started;

  return res.status(200).json({
    ok: true,
    time_ms,
    method: req.method,
    IP:
      req.headers["x-real-ip"] ||
      req.headers["x-forwarded-for"] ||
      null,
    TOKEN_PRESENT: !!req.headers["authorization"],
    REQUIRED_KEYS,
    MISSING_REQUIRED: missingRequired,
    ENV: envInfo,
    ROUTES: routes,
    RECAPTCHA: recaptcha,
    OPENAI_TEST: openaiTest,
    EMAIL_TEST: emailTest,
    REDIS_TEST: redisTest,
  });
}
