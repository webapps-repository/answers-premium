export const config = { runtime: "nodejs" };

import jwt from "jsonwebtoken";
import { Resend } from "resend";
import { generatePDF } from "../lib/pdf.js";

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
    // ---- Read raw body (Shopify sends text/plain JSON)
    let raw = "";
    for await (const chunk of req) raw += chunk;

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    const premiumToken = data.premiumToken;
    if (!premiumToken)
      return res.status(400).json({ error: "Missing premium token" });

    // ---- Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(premiumToken, process.env.PREMIUM_SECRET);
    } catch (err) {
      return res.status(400).json({ error: "Token expired or invalid" });
    }

    const email = decoded.email;

    // ---- Generate PDF premium report
    const pdfBuffer = await generatePDF({
      email,
      created: new Date(decoded.created).toLocaleString()
    });

    // ---- Email PDF via Resend
    await resend.emails.send({
      from: process.env.RESEND_FROM,
      to: email,
      subject: "Your Premium Report",
      html: `<h2>Your Premium Report</h2><p>Your PDF is attached.</p>`,
      attachments: [
        {
          filename: "premium-report.pdf",
          content: pdfBuffer.toString("base64"),
          encoding: "base64"
        }
      ]
    });

    return res.json({ ok: true, status: "Premium report sent" });
  } catch (err) {
    console.error("DETAILED ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
