// /api/system-test.js V10 from chatgpt
//
// shopify debug - https://zzqejx-u8.myshopify.com/pages/answers-premium?debug=1
//

export const config = { runtime: "nodejs" };

import jwt from "jsonwebtoken";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
}

/* -------------------------------------------------------------
   SYSTEM-TEST V10
   ▸ Validates jwt
   ▸ Validates resend
   ▸ Validates API endpoints are alive
   ▸ Validates environment variables
-------------------------------------------------------------- */

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://answers-premium.vercel.app";

    const results = {};

    /* -------------------------
       CHECK ENVIRONMENT VARS
    -------------------------- */
    const envReport = {
      PREMIUM_SECRET: !!process.env.PREMIUM_SECRET,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      RESEND_FROM: process.env.RESEND_FROM,
    };

    /* -------------------------
       CHECK ROUTE: /spiritual-report
    -------------------------- */
    try {
      const r = await fetch(`${base}/api/spiritual-report`, {
        method: "POST",
        body: new URLSearchParams({ test: "1" }),
      });
      results.spiritual = {
        path: "/api/spiritual-report",
        status: r.status,
        ok: r.ok,
        statusText: r.statusText,
        response: await safeJSON(r),
      };
    } catch (err) {
      results.spiritual = { error: err.toString() };
    }

    /* -------------------------
       CHECK ROUTE: /detailed-report
       Missing token → must show {error:"Missing premium token"}
    -------------------------- */
    try {
      const r = await fetch(`${base}/api/detailed-report`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({}),
      });
      results.detailed_missing_token = {
        path: "/api/detailed-report",
        status: r.status,
        ok: r.ok,
        statusText: r.statusText,
        response: await safeJSON(r),
      };
    } catch (err) {
      results.detailed_missing_token = { error: err.toString() };
    }

    /* -------------------------
       CHECK ROUTE: /detailed-report
       Fake token test → must show {error:"Token expired or invalid"}
    -------------------------- */
    try {
      const r = await fetch(`${base}/api/detailed-report`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ premiumToken: "FAKE123" }),
      });
      results.detailed_fake_token = {
        path: "/api/detailed-report",
        status: r.status,
        ok: r.ok,
        statusText: r.statusText,
        response: await safeJSON(r),
      };
    } catch (err) {
      results.detailed_fake_token = { error: err.toString() };
    }

    /* -------------------------
       JWT SELF-TEST
    -------------------------- */
    let jwtTest = {};
    try {
      const token = jwt.sign(
        { email: "test@example.com", created: Date.now() },
        process.env.PREMIUM_SECRET,
        { expiresIn: "5m" }
      );

      const verify = jwt.verify(token, process.env.PREMIUM_SECRET);

      jwtTest = { ok: true, token, verify };
    } catch (err) {
      jwtTest = { ok: false, error: err.toString() };
    }

    /* -------------------------
       RESEND EMAIL SELF-TEST
       Does NOT send an email — only verifies authentication.
    -------------------------- */
    let resendTest = {};
    try {
      await resend.apiKeys.get(); // lightweight auth test
      resendTest = { ok: true };
    } catch (err) {
      resendTest = { ok: false, error: err.toString() };
    }

    /* -------------------------
       FINAL OUTPUT
    -------------------------- */
    return res.json({
      ok: true,
      base,
      timestamp: Date.now(),
      env: envReport,
      jwt: jwtTest,
      resend: resendTest,
      results,
    });
  } catch (err) {
    console.error("SYSTEM TEST ERROR:", err);
    return res.status(500).json({ ok: false, error: err.toString() });
  }
}

/* Graceful JSON reader */
async function safeJSON(response) {
  try {
    const text = await response.text();
    return JSON.parse(text);
  } catch (_) {
    return { raw: await response.text() };
  }
}
