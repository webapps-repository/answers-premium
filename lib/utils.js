// /lib/utils.js — FINAL DEPLOY PATCH

import { Resend } from "resend";

/** SINGLE Resend instance — safe for Vercel edge/serverless */
const resend = new Resend(process.env.RESEND_API_KEY);

/* ============================================================
   UNIVERSAL DEVELOPMENT-FRIENDLY CORS (SAFE, NON-BLOCKING)
============================================================ */
export function applyCORS(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  // Only end TRUE preflight OPTIONS
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }

  return false; // Allow POST, GET to continue
}

/* ============================================================
   NORMALIZER
============================================================ */
export function normalize(fields = {}, key, { trim = true } = {}) {
  let v = fields?.[key];
  if (Array.isArray(v)) v = v[0];
  if (typeof v === "string" && trim) v = v.trim();
  return v ?? "";
}

/* ============================================================
   FILE VALIDATOR
============================================================ */
export function validateUploadedFile(file) {
  if (!file) return { ok: true };

  const valid = ["image/jpeg", "image/png", "image/jpg"];
  if (!valid.includes(file.mimetype)) {
    return { ok: false, error: "Invalid file type" };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "File too large" };
  }

  return { ok: true };
}

/* ============================================================
   SEND HTML EMAIL (with Buffer-safe attachments)
============================================================ */
export async function sendEmailHTML({ to, subject, html, attachments = [] }) {
  try {
    const formatted = attachments.map(att => {
      const buf = Buffer.isBuffer(att.content)
        ? att.content
        : Buffer.from(att.content);

      return {
        filename: att.filename || "attachment",
        content: buf.toString("base64"),
        encoding: "base64"
      };
    });

    const out = await resend.emails.send({
      from: "AI Reports <sales@hazcam.io>",
      to,
      subject,
      html,
      attachments: formatted
    });

    return { success: true, out };
  } catch (err) {
    console.error("Email error:", err);
    return { success: false, error: err.message };
  }
}

/* ============================================================
   reCAPTCHA VERIFY
============================================================ */
export async function verifyRecaptcha(token, ip) {
  if (!token) return { ok: false, error: "Missing token" };

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn("RECAPTCHA secret missing — dev bypass");
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
