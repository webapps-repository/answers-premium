// /api/system-test.js V7 from chatgpt

export const runtime = "nodejs";

export default async function handler(req, res) {
  const start = Date.now();
  const BASE = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  function json(v) {
    return JSON.stringify(v, null, 2);
  }

  /* ----------------------------------------
     1) ENVIRONMENT CHECK
  ---------------------------------------- */
  const REQUIRED = [
    "RECAPTCHA_SECRET_KEY",
    "RECAPTCHA_TOGGLE",
    "OPENAI_API_KEY",
    "RESEND_API_KEY",
  ];

  const missing = REQUIRED.filter(k => !process.env[k]);

  /* ----------------------------------------
     2) ROUTE CHECKER (GET + POST)
  ---------------------------------------- */
  async function testRoute(path) {
    const full = `${BASE}${path}`;

    // GET
    let getStatus = null, getText = null;
    try {
      const r = await fetch(full);
      getStatus = r.status;
      getText = await r.text();
    } catch (e) {
      getStatus = "NETWORK_ERR";
      getText = String(e);
    }

    // POST
    let postStatus = null, postText = null;
    try {
      const r = await fetch(full, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });
      postStatus = r.status;
      postText = await r.text();
    } catch (e) {
      postStatus = "NETWORK_ERR";
      postText = String(e);
    }

    function analyse(text, status) {
      if (!text) return "EMPTY";
      const t = text.trim();

      if (t.startsWith("<!doctype html") || t.startsWith("<html"))
        return "⚠️ HTML RESPONSE — LIKELY DEPLOYMENT PROTECTION";

      if (status === 401)
        return "❌ 401 UNAUTHORIZED — PROTECTED ROUTE";

      if (status === 404)
        return "❌ 404 NOT FOUND — FILE-BASED ROUTE MISSING";

      if (status === 400)
        return "✔️ 400 Bad Request — ROUTE ALIVE (form/data issue)";

      if (status === 200)
        return "✔️ 200 OK — ROUTE WORKING";

      return `Unknown (${status})`;
    }

    return {
      GET: {
        status: getStatus,
        analysis: analyse(getText, getStatus),
      },
      POST: {
        status: postStatus,
        analysis: analyse(postText, postStatus),
      }
    };
  }

  /* ----------------------------------------
     3) SPIRITUAL-REPORT EMULATION
     — Shopify-style POST with FormData
  ---------------------------------------- */
  async function simulateShopifyPOST() {
    const url = `${BASE}/api/spiritual-report`;
    let status = null, text = null;

    try {
      const form = new FormData();
      form.append("question", "system-test");
      form.append("email", "test@hazcam.io");

      const r = await fetch(url, { method: "POST", body: form });
      status = r.status;
      text = await r.text();
    } catch (e) {
      status = "NETWORK_ERR";
      text = String(e);
    }

    let diagnosis = "";
    if (text.startsWith("<!doctype html"))
      diagnosis = "🚨 BLOCKED — Vercel Authentication Page Returned";
    else if (status === 400)
      diagnosis = "✔️ ROUTE ALIVE — But form parsing failed";
    else if (status === 200)
      diagnosis = "🎉 SUCCESS — Route accepted Shopify-style request";

    return { status, diagnosis, raw: text.slice(0, 300) };
  }

  /* ----------------------------------------
     4) Run Tests
  ---------------------------------------- */
  const routes = {
    spiritual: await testRoute("/api/spiritual-report"),
    detailed: await testRoute("/api/detailed-report"),
    technical: await testRoute("/api/technical-report"),
  };

  const shopifySim = await simulateShopifyPOST();

  /* ----------------------------------------
     5) Response
  ---------------------------------------- */
  return res.status(200).json({
    ok: true,
    time_ms: Date.now() - start,
    BASE,
    missingRequired: missing,
    ENV: {
      RECAPTCHA_TOGGLE: process.env.RECAPTCHA_TOGGLE,
      TEST_MODE: process.env.TEST_MODE,
      RESEND_FROM: process.env.RESEND_FROM,
      SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    },
    ROUTES: routes,
    SHOPIFY_SIMULATION: shopifySim,
    DIAGNOSIS:
      shopifySim.diagnosis === "🚨 BLOCKED — Vercel Authentication Page Returned"
        ? "💀 ROOT CAUSE CONFIRMED — DEPLOYMENT PROTECTION BLOCKING API ROUTES"
        : "See results above."
  });
}
