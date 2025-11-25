// /lib/utils.js — UPDATED WITH RECAPTCHA_TOGGLE SUPPORT
export const runtime = "nodejs";

import { Resend } from "resend";

/* ============================================================
   RESEND CLIENT (singleton — unchanged)
============================================================ */
let resend = null;

function getResend() {
  if (!resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.error("❌ RESEND_API_KEY missing — email disabled.");
      return null;
    }
    resend = new Resend(key);
  }
  return resend;
}

/* ============================================================
   CORS  (unchanged)
============================================================ */
export function applyCORS(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }

  return false;
}

/* ============================================================
   NORMALIZE (unchanged)
============================================================ */
export function normalize(fields = {}, key, { trim = true } = {}) {
  let v = fields?.[key];
  if (Array.isArray(v)) v = v[0];
  if (typeof v === "string" && trim) v = v.trim();
  return v ?? "";
}

/* ============================================================
   FILE VALIDATOR (unchanged)
============================================================ */
export function validateUploadedFile(file) {
  if (!file) return { ok: true };

  const allowed = ["image/jpeg", "image/jpg", "image/png"];
  if (!allowed.includes(file.mimetype))
    return { ok: false, error: "Invalid file type" };

  if (file.size > 10 * 1024 * 1024)
    return { ok: false, error: "File too large" };

  return { ok: true };
}

/* ============================================================
   SEND HTML EMAIL (unchanged)
============================================================ */
export async function sendEmailHTML({ to, subject, html, attachments = [], dryRun = false }) {
  const client = getResend();
  if (!client)
    return { success: false, error: "No resend client" };

  const from = process.env.RESEND_FROM;
  if (!from)
    return { success: false, error: "Missing RESEND_FROM" };

  try {
    if (dryRun) {
      // No email actually sent
      return { success: true, dryRun: true };
    }

    const out = await client.emails.send({
      from,
      to,
      subject,
      html,
      attachments: attachments.map(a => ({
        filename: a.filename,
        content:
          typeof a.content === "string"
            ? a.content
            : a.content.toString("base64"),
        encoding: "base64"
      }))
    });

    return { success: true, out };
  } catch (err) {
    console.error("❌ sendEmailHTML error:", err);
    return { success: false, error: err.message };
  }
}

/* ============================================================
   RECAPTCHA VERIFY — UPDATED WITH TOGGLE
============================================================ */
export async function verifyRecaptcha(token, ip) {
  const TOGGLE = process.env.RECAPTCHA_TOGGLE === "true" ? "true" : "false";

  /* ----------------------------------------------
     🔄 BYPASS WHEN RECAPTCHA_TOGGLE = "false"
  ---------------------------------------------- */
  if (TOGGLE === "false") {
    return {
      ok: true,
      bypass: true,
      raw: { bypass: true, toggle: "false" }
    };
  }

  /* ----------------------------------------------
     From here down: real verification
  ---------------------------------------------- */
  if (!token) {
    return {
      ok: false,
      error: "Missing token",
      toggle: "true"
    };
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn("⚠ RECAPTCHA_SECRET_KEY missing — DEV AUTO-BYPASS ACTIVE");
    return { ok: true, devBypass: true };
  }

  const params = new URLSearchParams();
  params.append("secret", secret);
  params.append("response", token);
  if (ip) params.append("remoteip", ip);

  try {
    const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    const data = await r.json();
    return {
      ok: data.success === true,
      raw: data,
      toggle: "true"
    };
  } catch (err) {
    console.error("❌ Recaptcha error:", err);
    return {
      ok: false,
      error: err.message,
      toggle: "true"
    };
  }
}
