export const config = { runtime: "nodejs" };

import formidable from "formidable";
import jwt from "jsonwebtoken";
import { Resend } from "resend";

import { verifyRecaptcha } from "../lib/utils.js";
import { generateInsights } from "../lib/insights.js";

const resend = new Resend(process.env.RESEND_API_KEY);

function allowCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
}

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    // ---- Parse FormData (Shopify sends multipart/form-data)
    const form = formidable({ multiples: false });

    const { fields } = await new Promise((resolve, reject) =>
      form.parse(req, (err, f) => (err ? reject(err) : resolve({ fields: f })))
    );

    const email = fields.email;
    const question = fields.question || "";
    const recaptchaToken = fields.recaptchaToken;

    if (!email || !question)
      return res.status(400).json({ error: "Missing required fields" });

    // ---- Verify recaptcha
    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman)
      return res.status(400).json({ error: "Recaptcha validation failed" });

    // ---- Generate short answer
    const shortAnswer = await generateInsights({
      question,
      personal: fields
    });

    // ---- Create JWT premium token
    const premiumToken = jwt.sign(
      { email, created: Date.now() },
      process.env.PREMIUM_SECRET,
      { expiresIn: "15m" }
    );

    // ---- Email user using RESEND
    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
      subject: "Your Spiritual Answer",
      html: `
        <h2>Your Question</h2>
        <p>${question}</p>
        <h3>Your Answer</h3>
        <p>${shortAnswer}</p>
        <p><strong>Premium Token:</strong> ${premiumToken}</p>
        <p>Return to the website and press “Get Premium Insights”.</p>
      `
    });

    return res.json({
      ok: true,
      shortAnswer,
      premiumToken
    });
  } catch (err) {
    console.error("SPIRITUAL ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
