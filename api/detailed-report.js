export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { sendEmailHTML } from "../lib/utils.js";
import * as premiumStore from "../lib/premium-store.js";

export default async function handler(req, res) {

    /* ✅ FULL CORS */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Not allowed" });

  /* ✅ SAFE JSON PARSE */
  let body = {};
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    body = JSON.parse(raw || "{}");
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const premiumToken = body.premiumToken;
  if (!premiumToken) {
    return res.status(400).json({ error: "Missing token" });
  }

  const cached = await premiumStore.loadPremiumSubmission(premiumToken);
  if (!cached) {
    return res.status(404).json({ error: "Token expired or invalid" });
  }

  /* ✅✅✅ FIX: SAFE FIELD NORMALIZATION */
  const rawEmail = cached.fields?.email;
  const rawQuestion = cached.fields?.question;

  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
  const question = Array.isArray(rawQuestion) ? rawQuestion[0] : rawQuestion;

  if (!email) {
    return res.status(400).json({ error: "Email missing in token payload" });
  }

  const html = `
