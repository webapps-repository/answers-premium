// /api/spiritual-report.js
import { formidable } from "formidable";
import fs from "fs";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = {
  api: { bodyParser: false },
};

// ✅ Simple date formatter for PDF + Email
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
}

export default async function handler(req, res) {
  // --- CORS Headers ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const form = formidable({ multiples: false, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Form parse error:", err);
      return res.status(500).json({ success: false, error: "Form parsing failed" });
    }

    // === reCAPTCHA Verification ===
    const token = Array.isArray(fields["g-recaptcha-response"])
      ? fields["g-recaptcha-response"][0]
      : fields["g-recaptcha-response"];

    const verify = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: token,
      }),
    });

    const verification = await verify.json();
    if (!verification.success) {
      console.error("❌ reCAPTCHA verification failed:", verification);
      return res.status(403).json({
        success: false,
        error: "reCAPTCHA verification failed",
        details: verification,
      });
    }

    // === Extract User Data ===
    const userData = {
      fullName: fields.name,
      email: fields.email,
      birthdate: fields.birthdate,
      birthTime: fields.birthtime || "Unknown",
      birthPlace: `${fields.birthcity}, ${fields.birthstate}, ${fields.birthcountry}`,
      question: fields.question || "No question provided.",
      submittedAt: new Date().toISOString(),
    };

    console.log(`✅ Verified user: ${userData.fullName}`);

    // === OpenAI Query ===
    let answer = "Could not generate answer.";
    let astrology = "No astrology insights available.";
    let numerology = "No numerology insights available.";
    let palmistry = "No palmistry insights available.";

    try {
      const prompt = `
You are a professional spiritual advisor skilled in astrology, numerology, and palmistry.
Use the following user details to provide a detailed answer to their question.

User:
- Name: ${userData.fullName}
- Date of Birth: ${userData.birthdate}
- Time of Birth: ${userData.birthTime}
- Birth Place: ${userData.birthPlace}
- Question: ${userData.question}

Respond in this JSON format:
{
  "answer": "Direct short answer (50–100 words)",
  "astrology": "Astrology summary paragraph relevant to their question",
  "numerology": "Numerology summary paragraph relevant to their question",
  "palmistry": "Palmistry summary paragraph relevant to their question"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert astrologer, numerologist, and palm reader providing precise and concise insights.",
          },
          { role: "user", content: prompt },
        ],
      });

      const jsonText = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(jsonText);

      answer = parsed.answer || answer;
      astrology = parsed.astrology || astrology;
      numerology = parsed.numerology || numerology;
      palmistry = parsed.palmistry || palmistry;
    } catch (err) {
      console.error("❌ OpenAI generation error:", err);
    }

    // === PDF Generation ===
    const pdfBuffer = await generatePdfBuffer({
      fullName: userData.fullName,
      birthdate: userData.birthdate,
      birthTime: userData.birthTime,
      birthPlace: userData.birthPlace,
      question: userData.question,
      answer,
      astrology,
      numerology,
      palmistry,
    });

    // === Email Body ===
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 700px; margin: auto; line-height: 1.6;">
        <h2 style="text-align:center; color:#6c63ff;">🔮 Your Personalized Spiritual Report</h2>

        <div style="background:#f7f7f7; padding:1rem; border-radius:10px; margin-bottom:1.5rem;">
          <p><strong>📧 Email:</strong> ${userData.email}</p>
          <p><strong>🧑 Name:</strong> ${userData.fullName}</p>
          <p><strong>📅 Birth Date:</strong> ${formatDate(userData.birthdate)}</p>
          <p><strong>⏰ Birth Time:</strong> ${userData.birthTime}</p>
          <p><strong>🌍 Birth Place:</strong> ${userData.birthPlace}</p>
          <p><strong>💭 Question:</strong> ${userData.question}</p>
        </div>

        <h3 style="color:#4B0082;">Answer</h3>
        <p>${answer}</p>

        <h3 style="color:#4B0082;">Astrology</h3>
        <p>${astrology}</p>

        <h3 style="color:#4B0082;">Numerology</h3>
        <p>${numerology}</p>

        <h3 style="color:#4B0082;">Palmistry</h3>
        <p>${palmistry}</p>

        <p style="margin-top:20px; font-size:0.9rem; color:#555;">
          ✅ Your full detailed report is attached as a PDF.
        </p>
        <p style="text-align:center; margin-top:1.2rem; color:#777;">
          — Hazcam Spiritual Systems ✨
        </p>
      </div>
    `;

    // === Send Email ===
    await sendEmailWithAttachment({
      to: userData.email,
      subject: "🔮 Your Full Spiritual Report",
      html: htmlBody,
      buffer: pdfBuffer,
      filename: "Spiritual_Report.pdf",
    });

    console.log(`✅ Report emailed to ${userData.email}`);

    return res.status(200).json({
      success: true,
      message: "Report generated successfully.",
      answer,
      astrologySummary: astrology,
      numerologySummary: numerology,
      palmSummary: palmistry,
    });
  });
}
