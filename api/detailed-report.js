// /api/detailed-report.js
import { formidable } from "formidable";
import { personalSummaries, technicalSummary } from "./utils/generate-insights.js";
import { generatePdfBuffer } from "./utils/generate-pdf.js";
import { sendEmailHTML } from "./utils/send-email.js";

export const config = {
  api: { bodyParser: false },
};

// Helper
const safe = (v, d = "") =>
  v == null ? d : Array.isArray(v) ? String(v[0] ?? d) : String(v);
const toISO = (ddmmyyyy) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(ddmmyyyy || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ddmmyyyy;
};

export default async function handler(req, res) {
  // 🔥 CORS FIX (required for Shopify)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = formidable({ multiples: false, allowEmptyFiles: true, minFileSize: 0 });

  try {
    form.parse(req, async (err, fields) => {
      if (err) {
        console.error("Form ERROR:", err);
        return res.status(400).json({ error: "Invalid form data" });
      }

      const email = safe(fields.email).trim();
      const question = safe(fields.question).trim();
      const isPersonal = safe(fields.isPersonal).toLowerCase() === "true";

      if (!email) return res.status(400).json({ error: "Email required" });

      // Personal optional fields
      const fullName = safe(fields.name);
      const birthdate = safe(fields.birthdate);
      const birthISO = toISO(birthdate);
      const birthTime = safe(fields.birthtime, "Unknown");
      const birthPlace = [safe(fields.birthcity), safe(fields.birthstate), safe(fields.birthcountry)]
        .filter(Boolean).join(", ");

      let result;

      try {
        result = isPersonal
          ? await personalSummaries({ fullName, birthISO, birthTime, birthPlace, question })
          : await technicalSummary(question);
      } catch (err) {
        console.error("OpenAI ERROR:", err);
        return res.status(500).json({ error: "AI error", detail: err.message });
      }

      const pdf = await generatePdfBuffer({
        headerBrand: "Melodies Web",
        titleText: "Your Detailed Report",
        mode: isPersonal ? "personal" : "technical",
        question,
        answer: result.answer,
        fullName,
        birthdate,
        birthTime,
        birthPlace,
        astrologySummary: result.astrologySummary,
        numerologySummary: result.numerologySummary,
        palmistrySummary: result.palmistrySummary,
        numerologyPack: result.numerologyPack || {}
      });

      const html = `
        <div style="font-family:Arial;line-height:1.6;font-size:16px;color:#222">
          <h2>Your Detailed Report</h2>
          <p><strong>Question:</strong> ${question}</p>
          <p>${result.answer}</p>
          <p>Your PDF is attached.</p>
        </div>
      `;

      const sendResult = await sendEmailHTML({
        to: email,
        subject: `Your Detailed Answer: ${question}`,
        html,
        attachments: [{ filename: "Your_Detailed_Report.pdf", buffer: pdf }]
      });

      if (!sendResult.success) {
        console.error("Resend ERROR:", sendResult.error);
        return res.status(500).json({ error: "Email failed" });
      }

      return res.status(200).json({ success: true });
    });
  } catch (e) {
    console.error("UNHANDLED:", e);
    return res.status(500).json({ error: "Server error", detail: e.message });
  }
}
