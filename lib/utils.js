// /lib/utils.js// /lib/utils.js

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Normalise formidable field access.
 * Returns a trimmed string or "" if missing.
 */
export function normalize(fields = {}, key, { trim = true } = {}) {
  if (!fields || !key) return "";
  let v = fields[key];

  if (Array.isArray(v)) v = v[0];

  if (typeof v === "string" && trim) v = v.trim();

  return v ?? "";
}

/**
 * Basic CORS handler for Shopify → Vercel.
 */
export function applyCORS(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true; // stop handler
  }
  return false;
}

/**
 * Simple file validator for palm images.
 */
export function validateUploadedFile(file) {
  if (!file) return { ok: true };

  const validTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (!validTypes.includes(file.mimetype)) {
    return { ok: false, error: "Invalid file type" };
  }

  // formidable uses `size`
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "File too large" };
  }

  return { ok: true };
}

/**
 * Send HTML email via Resend.
 * Attachments should have { filename, content<Buffer|string> }.
 */
export async function sendEmailHTML({ to, subject, html, attachments = [] }) {
  try {
    const formattedAttachments = attachments.map(a => {
      if (!a) return null;
      const filename = a.filename || "attachment";

      let buf;
      if (typeof a.content === "string") {
        // assume already base64 or html/text; Resend accepts raw html too
        return {
          filename,
          content: a.content,
          encoding: "base64"
        };
      } else if (a.content instanceof Uint8Array) {
        buf = Buffer.from(a.content);
      } else if (Buffer.isBuffer(a.content)) {
        buf = a.content;
      } else {
        return null;
      }

      return {
        filename,
        content: buf.toString("base64"),
        encoding: "base64"
      };
    }).filter(Boolean);

    const out = await resend.emails.send({
      from: "AI Reports <no-reply@yourdomain.com>",
      to,
      subject,
      html,
      attachments: formattedAttachments
    });

    return { success: true, out };
  } catch (err) {
    console.error("Resend email error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Verify Google reCAPTCHA v2/v3.
 */
export async function verifyRecaptcha(token, ip) {
  if (!token) return { ok: false, error: "Missing token" };

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn("RECAPTCHA_SECRET_KEY missing – treating as ok in dev.");
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

// /lib/utils.js
// /lib/utils.js
// /lib/utils.js
// /lib/utils.js

import { Resend } from "resend";
import fetch from "node-fetch";

const resend = new Resend(process.env.RESEND_API_KEY);

export function applyCORS(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true; // stop handler
  }
  return false;
}

export function validateUploadedFile(file) {
  if (!file) return { ok: true };

  const validTypes = ["image/jpeg", "image/png"];
  if (!validTypes.includes(file.mimetype)) {
    return { ok: false, error: "Invalid file type" };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "File too large" };
  }
  return { ok: true };
}

export async function sendEmailHTML({ to, subject, html, attachments = [] }) {
  try {
    const out = await resend.emails.send({
      from: "AI Reports <no-reply@yourdomain.com>",
      to,
      subject,
      html,
      attachments: attachments.map(a => ({
        filename: a.filename,
        content: typeof a.content === "string"
          ? a.content
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

export async function verifyRecaptcha(token, ip) {
  if (!token) return { ok: false, error: "Missing token" };

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const url = `https://www.google.com/recaptcha/api/siteverify`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}&remoteip=${ip || ""}`
  });

  const data = await r.json();

  return { ok: data.success === true, raw: data };
}
