// /api/detailed-report.js — PREMIUM PDF via KV token

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { loadPremiumSubmission, deletePremiumSubmission } from "../lib/premium-store.js";
import { generateInsights } from "../lib/insights.js";
import { generatePDF } from "../lib/pdf.js";
import { sendEmailHTML } from "../lib/utils.js";

export default async function handler(req, res) {
  /* CORS */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Not allowed" });

  /* Parse JSON body manually (bodyParser is off) */
  let body = {};
  try {
    body = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", chunk => (data += chunk));
      req.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (err) {
          reject(err);
        }
      });
    });
  } catch (err) {
    return res
      .status(400)
      .json({ error: "Invalid JSON", detail: String(err) });
  }

  const premiumToken = body.premiumToken;

  if (!premiumToken) {
    return res.status(400).json({ error: "Missing premium token" });
  }

  const cached = await loadPremiumSubmission(premiumToken);

  if (!cached) {
    return res
      .status(404)
      .json({ error: "Premium token expired or invalid" });
  }

  const { fields } = cached;

  /* Rebuild person + question from original submission */
  const email =
    (fields.email && (Array.isArray(fields.email) ? fields.email[0] : fields.email)) ||
    "";
  const fullName =
    (fields.fullName &&
      (Array.isArray(fields.fullName) ? fields.fullName[0] : fields.fullName)) ||
    (fields.c1_fullName &&
      (Array.isArray(fields.c1_fullName) ? fields.c1_fullName[0] : fields.c1_fullName)) ||
    "";
  const dateOfBirth =
    (fields.birthDate &&
      (Array.isArray(fields.birthDate)
        ? fields.birthDate[0]
        : fields.birthDate)) ||
    (fields.c1_birthDate &&
      (Array.isArray(fields.c1_birthDate)
        ? fields.c1_birthDate[0]
        : fields.c1_birthDate)) ||
    "";
  const timeOfBirth =
    (fields.birthTime &&
      (Array.isArray(fields.birthTime)
        ? fields.birthTime[0]
        : fields.birthTime)) ||
    (fields.c1_birthTime &&
      (Array.isArray(fields.c1_birthTime)
        ? fields.c1_birthTime[0]
        : fields.c1_birthTime)) ||
    "";
  const birthPlace =
    (fields.birthPlace &&
      (Array.isArray(fields.birthPlace)
        ? fields.birthPlace[0]
        : fields.birthPlace)) ||
    (fields.c1_birthPlace &&
      (Array.isArray(fields.c1_birthPlace)
        ? fields.c1_birthPlace[0]
        : fields.c1_birthPlace)) ||
    "";

  const question =
    (fields.question &&
      (Array.isArray(fields.question)
        ? fields.question[0]
        : fields.question)) || "";

  if (!email || !dateOfBirth) {
    return res.status(400).json({
      error:
        "Original submission is missing required fields (email or dateOfBirth)."
    });
  }

  const person = {
    fullName,
    email,
    dateOfBirth,
    timeOfBirth,
    birthPlace
    // latitude/longitude/gender can be added later if you capture them
  };

  /* PREMIUM ENGINES: astrology + numerology + palmistry */
  let insights, pdfBuffer;
  try {
    insights = await generateInsights({
      person,
      question
      // handImageBase64 can be added later if you decide to store it in KV
    });

    pdfBuffer = await generatePDF(insights);
  } catch (err) {
    console.error("Premium generation error:", err);
    return res.status(500).json({
      error: "Premium generation failed",
      detail: String(err)
    });
  }

  /* Email the PDF */
  const html = `
    <div style="font-family: system-ui, sans-serif;">
      <h2>Your Premium Spiritual Report</h2>
      <p>Hi ${fullName || "there"},</p>
      <p>
        Your complete astrology, numerology and palmistry report is attached as a PDF.
      </p>
      <p>Thank you for trusting this process.</p>
      <p>— Melodie</p>
    </div>
  `;

  const emailOut = await sendEmailHTML({
    to: email,
    subject: "Your Premium Spiritual Report",
    html,
    attachments: [
      {
        filename: "premium-spiritual-report.pdf",
        content: pdfBuffer
      }
    ]
  });

  if (!emailOut.success) {
    return res.status(500).json({
      error: "Email failed",
      detail: emailOut.error
    });
  }

  // Optional: prevent token reuse
  await deletePremiumSubmission(premiumToken);

  return res.json({
    ok: true,
    message: "Premium PDF generated and emailed successfully."
  });
}
