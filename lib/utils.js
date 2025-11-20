// /lib/utils.js
// Unified utility module containing:
// - Email sender (Resend)
// - File validators (technical upload)
// - reCAPTCHA v2 verification
// - Common helpers

import fetch from "node-fetch";
import fs from "fs";

// Safe string cleaner for filenames, logging, user content
export function safeString(str = "") {
  return String(str || "")
    .replace(/[^a-z0-9\-_\. ]/gi, "")
    .trim();
}

// =============================================
// RECAPTCHA VERIFICATION (v2 checkbox)
// =============================================
export async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET;

  if (!secret) {
    console.error("❌ Missing RECAPTCHA_SECRET");
    return { ok: false, error: "Server missing CAPTCHA credentials" };
  }

  if (!token || typeof token !== "string") {
    return { ok: false, error: "No reCAPTCHA token provided" };
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    const json = await res.json();

    // json = { success: true/false, challenge_ts, hostname }
    if (json.success) {
      return { ok: true, score: json.score ?? 0.9 };
    }

    return { ok: false, error: "reCAPTCHA failed", detail: json };
  } catch (err) {
    console.error("CAPTCHA ERROR:", err);
    return { ok: false, error: err.message };
  }
}

// =============================================
// EMAIL SENDER (Resend.com)
// =============================================
export async function sendEmailHTML({ to, subject, html, attachments = [] }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = "Melodies Web <noreply@melodiesweb.com>";

  if (!apiKey) {
    console.error("❌ Missing RESEND_API_KEY");
    return { success: false, error: "Server missing email credentials" };
  }

  try {
    const formData = new FormData();
    formData.append("from", from);
    formData.append("to", to);
    formData.append("subject", subject);
    formData.append("html", html);

    for (const file of attachments) {
      formData.append(
        "attachments",
        new Blob([file.content], { type: "application/pdf" }),
        file.filename
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    });

    const json = await res.json();

    if (json.id) {
      return { success: true, id: json.id };
    }

    console.error("Resend error:", json);
    return { success: false, error: json.error || "Unknown email error" };
  } catch (err) {
    console.error("SEND EMAIL ERROR:", err);
    return { success: false, error: err.message };
  }
}

// =============================================
// FILE VALIDATORS — for optional technical uploads
// =============================================

// Allowed non-executable safe types
const SAFE_EXTS = [
  ".png", ".jpg", ".jpeg", ".webp",
  ".pdf", ".txt",
  ".csv",
  ".json",
  ".log"
];

export function validateUploadedFile(file) {
  if (!file || !file.originalFilename) {
    return { ok: false, error: "Invalid file" };
  }

  const name = file.originalFilename.toLowerCase();

  // Reject executables
  const banned = [
    ".exe", ".msi", ".bat", ".sh", ".php", ".py", ".js", ".dll", ".scr"
  ];

  if (banned.some(ext => name.endsWith(ext))) {
    return { ok: false, error: "Executable file types are not allowed" };
  }

  if (!SAFE_EXTS.some(ext => name.endsWith(ext))) {
    return {
      ok: false,
      error: "File type not allowed. Allowed: png, jpg, pdf, txt, csv, json, log"
    };
  }

  // Limit: 15 MB
  if (file.size > 15 * 1024 * 1024) {
    return { ok: false, error: "File too large (15 MB max)" };
  }

  return { ok: true };
}

// =============================================
// HELPER — Safely delete temp files
// =============================================
export function safeUnlink(path) {
  if (!path) return;
  try {
    if (fs.existsSync(path)) fs.unlinkSync(path);
  } catch {
    // ignore
  }
}

// =============================================
// HELPER — Normalize Formidable field
// =============================================
export function normalizeField(fields, key) {
  const v = fields?.[key];
  if (Array.isArray(v)) return v[0];
  return v ?? "";
}

