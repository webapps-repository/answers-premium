// /api/system-test.js V6 from chatgpt

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { savePremiumSubmission, loadPremiumSubmission } from "../lib/premium-store.js";
import crypto from "crypto";

export default async function handler(req, res) {
  const started = Date.now();

  /* ---------- BASIC ENV CHECKS ---------- */
  const REQUIRED = [
    "RECAPTCHA_SECRET_KEY",
    "RECAPTCHA_TOGGLE",
    "OPENAI_API_KEY",
    "RESEND_API_KEY"
  ];

  const missing = REQUIRED.filter(k => !process.env[k]);

  const env = {};
  for (const k of Object.keys(process.env)) {
    env[k] = process.env[k] ? true : false;
  }

  /* ---------- ROUTE PING TESTS ---------- */
  async function checkRoutePOST(path, body) {
    try {
      const r = await fetch(`${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : ""}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const txt = await r.text();
      return { ok: true, status: r.status, statusText: r.statusText, body: txt };
    } catch (err) {
      return { ok: false, error: err.toString() };
    }
  }

  const simSpiritual = await checkRoutePOST("/api/spiritual-report", {
    question: "system test question",
    email: "test@hazcam.io"
  });

  /* ---------- PREMIUM TOKEN DEBUG ---------- */
  let token = crypto.randomUUID();
  await savePremiumSubmission(token, {
    email: "test@hazcam.io",
    question: "system-test"
  });

  const loaded = await loadPremiumSubmission(token);

  /* ---------- SALES FUNNEL DEBUG ---------- */
  const tokenMissingFields = {
    hasEmail: !!(loaded?.email),
    hasFieldsBlock: !!(loaded?.fields),
    savedFields: loaded?.fields || null
  };

  /* ---------- FINAL RESPONSE ---------- */
  res.status(200).json({
    ok: true,
    time_ms: Date.now() - started,
    method: req.method,
    IP: req.headers["x-real-ip"] || null,
    REQUIRED_KEYS: REQUIRED,
    MISSING_REQUIRED: missing,
    ENV: env,

    /* ROUTES */
    ROUTES: {
      spiritualReport: simSpiritual
    },

    /* PREMIUM STORE DEBUG */
    PREMIUM_TOKEN_TEST: {
      token,
      loaded,
      checks: tokenMissingFields
    },

    /* DIAGNOSTIC SUMMARY */
    DIAGNOSIS:
      tokenMissingFields.hasEmail
        ? "OK — spiritual-report appears to store email correctly."
        : "FAIL — email NOT stored. spiritual-report is not receiving/processing email field."
  });
}
