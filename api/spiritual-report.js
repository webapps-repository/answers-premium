// cors fixed - tabulated /api/spiritual-report.js
// cors fixed - tabulated /api/spiritual-report.js
// cors fixed - tabulated /api/spiritual-report.js
// cors fixed - tabulated /api/spiritual-report.js
// cors fixed - tabulated /api/spiritual-report.js

// /api/spiritual-report.js
import { formidable } from "formidable";
import fs from "fs";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // ✅ Always send CORS headers
  res.setHeader("Access-Control-Allow-Origin", "https://zzqejx-u8.myshopify.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const form = formidable({ multiples: false, keepExtensions: true });

    const fields = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve(fields);
      });
    });

    const token = Array.isArray(fields["g-recaptcha-response"])
      ? fields["g-recaptcha-response"][0]
      : fields["g-recaptcha-response"];

    // ✅ reCAPTCHA verification
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
      return res.status(403).json({
        success: false,
        error: "reCAPTCHA verification failed",
        details: verification,
      });
    }

    const fullName = fields.name;
    const birthdate = fields.birthdate;
    const birthTime = fields.birthtime || "Unknown";
    const birthPlace = `${fields.birthcity}, ${fields.birthstate}, ${fields.birthcountry}`;
    const email = fields.email;
    const question = fields.question;

    console.log(`✅ Verified user: ${fullName}`);

    // --- Generate insights with OpenAI ---
    const prompt = `
    You are a professional astrologer, numerologist, and palm reader. 
    Use the user's data to provide:
    1. A personalized answer to their question.
    2. An astrology interpretation (include Sun, Moon, Ascendant, Ruling Planet, Houses, and Aspects).
    3. Numerology results (Life Path, Expression, Personality, Soul Urge, and Maturity Numbers).
    4. Palmistry insights (Life Line, Head Line, Heart Line, Fate Line, Fingers, and Mounts).

    Format response as valid JSON:
    {
      "answer": "...",
      "astrology": "...",
      "numerology": "...",
      "palmistry": "..."
    }

    User:
    Name: ${fullName}
    Date of Birth: ${birthdate}
    Time of Birth: ${birthTime}
    Place of Birth: ${birthPlace}
    Question: ${question}
    `;

    let answer = "Could not generate answer.";
    let astrology = "Could not generate astrology insights.";
    let numerology = "Could not generate numerology insights.";
    let palmistry = "Could not generate palmistry insights.";

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a wise spiritual advisor." },
          { role: "user", content: prompt },
        ],
      });

      const json = JSON.parse(completion.choices[0].message.content || "{}");
      answer = json.answer || answer;
      astrology = json.astrology || astrology;
      numerology = json.numerology || numerology;
      palmistry = json.palmistry || palmistry;
    } catch (err) {
      console.error("❌ OpenAI generation error:", err);
    }

    // --- Generate PDF report ---
    const pdfBuffer = await generatePdfBuffer({
      fullName,
      birthdate,
      birthTime,
      birthPlace,
      question,
      answer,
      astrology,
      numerology,
      palmistry,
    });

    // --- Send email ---
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="text-align:center; color:#4B0082;">🌟 Your Personalized Spiritual Report</h2>
        <p><strong>🧘 Question:</strong> ${question}</p>
        <h3>💡 Answer</h3><p>${answer}</p>
        <h3>🌞 Astrology</h3><p>${astrology}</p>
        <h3>🔢 Numerology</h3><p>${numerology}</p>
        <h3>✋ Palmistry</h3><p>${palmistry}</p>
        <hr>
        <p>✅ Your full report is attached as a PDF.</p>
      </div>
    `;

    await sendEmailWithAttachment({
      to: email,
      subject: "🌟 Your Personalized Spiritual Report",
      html: htmlBody,
      buffer: pdfBuffer,
      filename: "Spiritual_Report.pdf",
    });

    console.log(`✅ Report emailed to ${email}`);

    return res.status(200).json({
      success: true,
      answer,
      astrologySummary: astrology,
      numerologySummary: numerology,
      palmSummary: palmistry,
    });
  } catch (error) {
    console.error("❌ Spiritual Report API Error:", error);
    // ✅ Always respond with CORS headers intact
    return res.status(500).json({ success: false, error: error.message });
  }
}
