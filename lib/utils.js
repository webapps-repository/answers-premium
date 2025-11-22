// /lib/utils.js — FINAL FULL PRODUCTION BUILD

import { Resend } from "resend";

/* ------------------------------------------------------------
   SINGLETON RESEND CLIENT (Vercel-safe)
------------------------------------------------------------ */
let resend = null;
function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/* ------------------------------------------------------------
   UNIVERSAL CORS — Shopify-safe, Vercel-safe
------------------------------------------------------------ */
export function applyCORS(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  // Handle preflight cleanly
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}

/* ------------------------------------------------------------
   NORMALIZER — core of all input parsing
------------------------------------------------------------ */
export function normalize(fields = {}, key, { trim = true } = {}) {
  let v = fields?.[key];
  if (Array.isArray(v)) v = v[0];
  if (typeof v === "string" && trim) v = v.trim();
  return v ?? "";
}

/* ------------------------------------------------------------
   FILE VALIDATOR — used in palmistry upload
------------------------------------------------------------ */
export function validateUploadedFile(file) {
  if (!file) return { ok: true };

  const allowed = ["image/jpeg", "image/png", "image/jpg"];
  if (!allowed.includes(file.mimetype)) {
    return { ok: false, error: "Invalid file type" };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "File too large" };
  }

  return { ok: true };
}

/* ------------------------------------------------------------
   EMAIL SENDER — RESEND (safe attachments)
------------------------------------------------------------ */
export async function sendEmailHTML({ to, subject, html, attachments = [] }) {
  try {
    const client = getResend();

    const out = await client.emails.send({
      from: process.env.RESEND_FROM, // MUST be a verified domain email
      to,
      subject,
      html,
      attachments: attachments.map(a => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content)
          ? a.content.toString("base64")
          : a.content.toString("base64"),
        encoding: "base64"
      }))
    });

    return { success: true, out };
  } catch (err) {
    console.error("Resend email error:", err);
    return { success: false, error: err.message };
  }
}

/* ------------------------------------------------------------
   reCAPTCHA VERIFY (supports missing secret for DEV mode)
------------------------------------------------------------ */
export async function verifyRecaptcha(token, ip) {
  if (!token) return { ok: false, error: "Missing token" };

  const secret = process.env.RECAPTCHA_SECRET_KEY;

  // DEV MODE (no secret provided)
  if (!secret) {
    console.warn("⚠ reCAPTCHA secret missing — dev bypass active");
    return { ok: true, devBypass: true };
  }

  const params = new URLSearchParams();
  params.append("secret", secret);
  params.append("response", token);
  if (ip) params.append("remoteip", ip);

  const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const data = await r.json();

  return { ok: data.success === true, raw: data };
}
