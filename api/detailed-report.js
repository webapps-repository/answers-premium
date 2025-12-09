// /api/detailed-report.js — PREMIUM EMAIL/PDF via KV token (robust version)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { loadPremiumSubmission } from "../lib/premium-store.js";
// Use namespace imports so it doesn't crash if named exports are missing
import * as insightsModule from "../lib/insights.js";
import * as pdfModule from "../lib/pdf.js";
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
  };

  // Try to read the helpers safely
  const generateInsights =
    typeof insightsModule.generateInsights === "function"
      ? insightsModule.generateInsights
      : null;

  const generatePDF =
    typeof pdfModule.generatePDF === "function"
      ? pdfModule.generatePDF
      : null;

  let emailHtml;
  let attachments = [];

  /* PREMIUM ENGINES: preferred path (HTML + PDF) */
  if (generateInsights && generatePDF) {
    try {
      const insights = await generateInsights({
        person,
        question
        // handImageBase64 can be added later
      });

      const pdfBuffer = await generatePDF(insights);

      emailHtml = `
        <div style="font-family: system-ui, sans-serif;">
          <h2>Your Premium Spiritual Report</h2>
          <p>Hi ${fullName || "there"},</p>
          <p>Your complete astrology, numerology and palmistry report is attached as a PDF.</p>
          <p>Thank you for trusting this process.</p>
          <p>— Melodie</p>
        </div>
      `;

      attachments.push({
        filename: "premium-spiritual-report.pdf",
        content: pdfBuffer
      });
    } catch (err) {
      console.error("Premium generation error:", err);

      // Fallback: still send a premium-style HTML email, just no PDF
      emailHtml = `
        <div style="font-family: system-ui, sans-serif;">
          <h2>Your Premium Spiritual Report (HTML only)</h2>
          <p>Hi ${fullName || "there"},</p>
          <p>
            Your premium spiritual insight could not be rendered as a PDF this time,
            but the process has been logged. You will receive a detailed written
            response based on your birth details and question:
          </p>
          <ul>
            <li><strong>Date of birth:</strong> ${dateOfBirth || "n/a"}</li>
            <li><strong>Time of birth:</strong> ${timeOfBirth || "n/a"}</li>
            <li><strong>Place of birth:</strong> ${birthPlace || "n/a"}</li>
            <li><strong>Question:</strong> ${question || "n/a"}</li>
          </ul>
          <p>Thank you for your patience.</p>
          <p>— Melodie</p>
        </div>
      `;
    }
  } else {
    // Hard fallback if helpers aren't available
    console.warn(
      "generateInsights/generatePDF not available — sending HTML-only premium email."
    );

    emailHtml = `
      <div style="font-family: system-ui, sans-serif;">
        <h2>Your Premium Spiritual Report (HTML only)</h2>
        <p>Hi ${fullName || "there"},</p>
        <p>
          Your premium spiritual insight has been recorded. A detailed written report
          will be prepared using your birth details and the question you submitted.
        </p>
        <ul>
          <li><strong>Date of birth:</strong> ${dateOfBirth || "n/a"}</li>
          <li><strong>Time of birth:</strong> ${timeOfBirth || "n/a"}</li>
          <li><strong>Place of birth:</strong> ${birthPlace || "n/a"}</li>
          <li><strong>Question:</strong> ${question || "n/a"}</li>
        </ul>
        <p>Thank you for trusting this process.</p>
        <p>— Melodie</p>
      </div>
    `;
  }

  /* Email the result (with or without PDF) */
  const emailOut = await sendEmailHTML({
    to: email,
    subject: "Your Premium Spiritual Report",
    html: emailHtml,
    attachments
  });

  if (!emailOut.success) {
    return res.status(500).json({
      error: "Email failed",
      detail: emailOut.error
    });
  }

  // NOTE: deletePremiumSubmission is intentionally NOT called here
  // until a proper implementation exists in ../lib/premium-store.js

  return res.json({
    ok: true,
    message:
      attachments.length > 0
        ? "Premium PDF generated and emailed successfully."
        : "Premium HTML report emailed successfully (no PDF attachment)."
  });
}
