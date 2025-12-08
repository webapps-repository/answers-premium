// /api/spiritual-report.js — FINAL: FREE answer + FREE email + PREMIUM email link + KV token

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const config = { api: { bodyParser: false } };

import formidable from "formidable";
import crypto from "crypto";

import {
  normalize,
  validateUploadedFile,
  verifyRecaptcha,
  sendEmailHTML
} from "../lib/utils.js";

import {
  runAllEngines,
  buildSummaryHTML,
  buildUniversalEmailHTML
} from "../lib/engines.js";

import { savePremiumSubmission } from "../lib/premium-store.js";

export default async function handler(req, res) {

  /* ---------------- CORS ---------------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Not allowed" });

  /* ---------------- PARSE FORM ---------------- */
  const form = formidable({
    multiples: true,
    maxFileSize: 20 * 1024 * 1024,
    keepExtensions: true
  });

  let fields = {}, files = {};
  try {
    ({ fields, files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fl) =>
        err ? reject(err) : resolve({ fields: f, files: fl })
      )
    ));
  } catch (err) {
    return res
      .status(400)
