// /lib/utils.js
import sgMail from "@sendgrid/mail";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
];

/**
 * Validate an uploaded file (size, type, presence).
 * This replaces file-validators.js
 */
export function validateUploadedFile(file) {
  if (!file) {
    return { ok: false, error: "No file uploaded." };
  }

  const size = file.size ?? file.filepath ? file.size : 0;
  const type = file.mimetype || file.type;

  if (!type || !ALLOWED_MIME_TYPES.includes(type)) {
    return {
      ok: false,
      error: `Unsupported file type: ${type || "unknown"}.`
    };
  }

  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `File too large (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB).`
    };
  }

  return { ok: true };
}

/**
 * Verify Google reCAPTCHA token with Google endpoint.
 * Replaces verify-recaptcha.js
 */
export async function verifyRecaptcha(token, remoteIp) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.warn("RECAPTCHA_SECRET_KEY not set; skipping verification.");
    return { ok: true, score: 0.9, skipped: true };
  }

  if (!token) {
    return { ok: false, error: "Missing reCAPTCHA token." };
  }

  const params = new URLSearchParams();
  params.append("secret", secret);
  params.append("response", token);
  if (remoteIp) params.append("remoteip", remoteIp);

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const data = await res.json();

  if (!data.success) {
    return { ok: false, error: "reCAPTCHA failed.", details: data };
  }

  return {
    ok: true,
    score: typeof data.score === "number" ? data.score : 0.9,
    raw: data
  };
}

/**
 * Send HTML email with optional attachments (for PDFs).
 * Replaces send-email.js
 */
export async function sendEmailHTML({ to, subject, html, attachments = [] }) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set; email skipped.");
    return { ok: false, skipped: true, reason: "No SENDGRID_API_KEY" };
  }

  if (!to) throw new Error("Missing recipient email (to).");

  const msg = {
    to,
    from: process.env.SENDGRID_FROM || "no-reply@example.com",
    subject,
    html,
    attachments
  };

  try {
    const [response] = await sgMail.send(msg);
    return { ok: true, response };
  } catch (err) {
    console.error("Error sending email:", err);
    return { ok: false, error: err.message || err.toString() };
  }
}
