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
    body: `secret=
