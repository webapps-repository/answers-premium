// /api/detailed-report.js
import { formidable } from "formidable";
import { personalSummaries, technicalSummary } from "./utils/generate-insights.js";
import { generatePdfBuffer } from "./utils/generate-pdf.js";
import { sendEmailHTML } from "./utils/send-email.js";

export const config = {
  api: { bodyParser: false },
};

// --- Helpers ---
const safe = (v, d = "") =>
  v == null ? d : Array.isArray(v) ? String(v[0] ?? d) : String(v);

const toISO = (ddmmyyyy) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(ddmmyyyy || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ddmmyyyy;
};

export default async function handler(req, res) {
  // --- CORS (Shopify compatible) ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- Parse FormData ---
  const form = formidable({
    multiples: false,
    allowEmptyFiles: true,
    minFileSize: 0
  });

  try {
    form.parse(req, async (err, fields) => {
      if (err) {
        console.error("Form PARSE ERROR:", err);
        return res.status(400).json({ error: "Invalid form data" });
      }

      // --- Extract fields safely ---
      const email = safe(fields.email).trim();
      const question = safe(fields.question).trim();

      if (!email) return res.status(400).json({ error: "Email required" });
      if (!question) return res.status(400).json({ error: "Question required" });

      // Correct boolean processing (fixes “always true” bug)
      const isPersonal =
        ["true", "yes", "on", "1"].includes(safe(fields.isPersonal).toLowerCase());

      // Personal fields
      const fullName = safe(fields.name);
      const birthdate = safe(fields.birthdate);
      const birthISO = toISO(birthdate);
      const birthTime = safe(fields.birthtime, "Unknown");

      const birthPlace = [
        safe(fields.birthcity),
        safe(fields.birthstate),
        safe(fields.birthcountry)
      ]
        .filter((x) => x && x.trim() !== "")
        .join(", ");

      // --- AI Result ---
      let ai;
      try {
        ai = isPersonal
          ? await personalSummaries({
              fullName,
              birthISO,
              birthTime,
              birthPlace,
              question
            })
          : await technicalSummary(question);

      } catch (err) {
        console.error("AI ERROR:", err);
        return res.status(500).json({ error: "AI error", detail: err.message });
      }

      // --- ALWAYS SAFE FIELDS ---
      const answer = ai.answer || "No answer available.";
      const astrologySummary = ai.astrologySummary || "";
      const numerologySummary = ai.numerologySummary || "";
      const palmistrySummary = ai.palmistrySummary || "";

      // --- Generate PDF Buffer ---
      let pdfBuffer;
      try {
        pdfBuffer = await generatePdfBuffer({
          headerBrand: "Melodies Web",
          question,
          answer,
          astrologySummary,
          numerologySummary,
          palmistrySummary
        });

        if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
          throw new Error("PDF generator returned invalid buffer");
        }

      } catch (err) {
        console.error("PDF ERROR:", err);
        return res.status(500).json({
          error: "PDF generation failed",
          detail: err.message
        });
      }

      // --- Email Body ---
      const html = `
        <div style="font-family:Arial;line-height:1.6;font-size:16px;color:#222">
          <h2>Your Detailed Report</h2>
          <p><strong>Question:</strong> ${question}</p>
          <p>${answer}</p>
          <p>Your PDF is attached.</p>
        </div>
      `;

      // --- SEND EMAIL ---
      let sendResult;
      try {
        sendResult = await sendEmailHTML({
          to: email,
          subject: `Your Detailed Answer: ${question}`,
          html,
          attachments: [
            {
              filename: "Your_Detailed_Report.pdf",
              content: pdfBuffer.toString("base64"),   // ✔ REQUIRED BY RESEND
              encoding: "base64"
            }
          ]
        });
      } catch (err) {
        console.error("Resend SEND ERROR:", err);
        return res.status(500).json({ error: "Email failed", detail: err.message });
      }

      if (!sendResult?.success) {
        console.error("Resend returned failure:", sendResult);
        return res.status(500).json({ error: "Email failed (Resend)" });
      }

      return res.status(200).json({ success: true });
    });

  } catch (err) {
    console.error("UNHANDLED SERVER ERROR:", err);
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
}
