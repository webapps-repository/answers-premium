// /api/spiritual-report.js

import { formidable } from "formidable";
import fs from "fs";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
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

    const token = Array.isArray(fields["g-recaptcha-response"])
      ? fields["g-recaptcha-response"][0]
      : fields["g-recaptcha-response"];

    // ✅ Verify reCAPTCHA
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
    const birthTime = fields.birthtime;
    const birthPlace = `${fields.birthcity}, ${fields.birthstate}, ${fields.birthcountry}`;
    const email = fields.email;

    console.log(`✅ Verified user: ${fullName}`);

    // --- 🔮 Generate insights via OpenAI ---
    async function getInsight(prompt) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a professional spiritual advisor. Provide clear, personalized insights in 120 words based on astrology, numerology, or palmistry as requested.",
            },
            { role: "user", content: prompt },
          ],
        });
        return completion.choices[0].message.content.trim();
      } catch (e) {
        console.error("❌ OpenAI generation error:", e);
        return null;
      }
    }

    const [astrology, numerology, palmistry] = await Promise.all([
      getInsight(
        `Generate an astrology reading for ${fullName}, born on ${birthdate} at ${birthTime || "unknown time"} in ${birthPlace}. Include planetary personality influences.`
      ),
      getInsight(
        `Generate a numerology interpretation for ${fullName}, born ${birthdate}. Include life path number and destiny analysis.`
      ),
      getInsight(
        `Generate a palmistry reading for ${fullName}, focusing on life line, heart line, and career potential.`
      ),
    ]);

    const reading = {
      astrology: astrology || "Could not generate astrology insights.",
      numerology: numerology || "Could not generate numerology insights.",
      palmistry: palmistry || "Could not generate palmistry insights.",
    };

    // --- 🧘 Generate PDF ---
    const pdfBuffer = await generatePdfBuffer({
      fullName,
      birthdate,
      birthTime,
      birthPlace,
      reading,
    });

    // --- 📧 Send Email ---
    await sendEmailWithAttachment({
      to: email,
      subject: "🧘 Your Spiritual Report",
      html: `
        <div style="font-family:Arial,sans-serif;color:#333;">
          <h2>✨ Your Personalized Spiritual Report</h2>
          <p>Dear ${fullName},</p>
          <p>Here is your complete spiritual reading based on your birth details.</p>
          <ul>
            <li><strong>Astrology:</strong> ${reading.astrology.slice(0, 80)}...</li>
            <li><strong>Numerology:</strong> ${reading.numerology.slice(0, 80)}...</li>
            <li><strong>Palmistry:</strong> ${reading.palmistry.slice(0, 80)}...</li>
          </ul>
          <p>The full PDF report is attached below.</p>
          <p style="margin-top:16px;">– Hazcam Spiritual Systems ✨</p>
        </div>
      `,
      buffer: pdfBuffer,
      filename: "Spiritual_Report.pdf",
    });

    console.log(`✅ Report emailed to ${email}`);

    return res.status(200).json({
      success: true,
      message: "Report generated successfully.",
      astrologySummary: reading.astrology,
      numerologySummary: reading.numerology,
      palmSummary: reading.palmistry,
    });
  });
}
