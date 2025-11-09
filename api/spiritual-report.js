// /api/spiritual-report.js
import { formidable } from "formidable";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const form = formidable({ multiples: false, keepExtensions: true });
  form.parse(req, async (err, fields) => {
    if (err) {
      console.error("❌ Form parse error:", err);
      return res.status(500).json({ success: false, error: "Form parsing failed" });
    }

    // === reCAPTCHA ===
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
      console.error("❌ reCAPTCHA failed:", verification);
      return res.status(403).json({ success: false, error: "reCAPTCHA verification failed" });
    }

    // === User Data ===
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

    // === OpenAI Request ===
    let answer = "", astrology = "", numerology = "", palmistry = "";
    let astroDetails = {}, numDetails = {}, palmDetails = {};

    try {
      const prompt = `
You are an expert spiritual advisor skilled in astrology, numerology, and palmistry.
Using the user details below, produce a JSON object filling in every field.

User:
Name: ${userData.fullName}
DOB: ${userData.birthdate}
Time: ${userData.birthTime}
Place: ${userData.birthPlace}
Question: ${userData.question}

Respond ONLY in JSON with:
{
  "answer": "Direct answer (100 words)",
  "astrology": "Summary paragraph for astrology",
  "numerology": "Summary paragraph for numerology",
  "palmistry": "Summary paragraph for palmistry",
  "astroDetails": {
    "Planetary Positions": "...",
    "Ascendant (Rising) Zodiac Sign": "...",
    "Astrological Houses": "...",
    "Family Astrology": "...",
    "Love Governing House in Astrology": "...",
    "Health & Wellbeing Predictions": "...",
    "Astrological influences on Work, Career and Business": "..."
  },
  "numDetails": {
    "Life Path Number": "...",
    "Expression Number": "...",
    "Personality Number": "...",
    "Soul Urge Number": "...",
    "Maturity Number": "..."
  },
  "palmDetails": {
    "Life Line": "...",
    "Head Line": "...",
    "Heart Line": "...",
    "Fate Line": "...",
    "Thumb": "...",
    "Index Finger": "...",
    "Ring Finger": "...",
    "Mounts": "...",
    "Marriage / Relationship": "...",
    "Children": "...",
    "Travel Lines": "...",
    "Stress Lines": "..."
  }
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Return structured spiritual readings in JSON only." },
          { role: "user", content: prompt },
        ],
      });

      const content = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);

      answer = parsed.answer || "";
      astrology = parsed.astrology || "";
      numerology = parsed.numerology || "";
      palmistry = parsed.palmistry || "";
      astroDetails = parsed.astroDetails || {};
      numDetails = parsed.numDetails || {};
      palmDetails = parsed.palmDetails || {};
    } catch (err) {
      console.error("❌ OpenAI error:", err);
    }

    // === PDF ===
    const pdfBuffer = await generatePdfBuffer({
      ...userData,
      answer,
      astrology,
      numerology,
      palmistry,
      astroDetails,
      numDetails,
      palmDetails,
    });

    // === Email ===
    const html = `
      <div style="font-family:Arial,sans-serif;color:#333;max-width:700px;margin:auto;">
        <h2 style="text-align:center;color:#4B0082;">Your Personalized Spiritual Report</h2>
        <p><strong>Name:</strong> ${userData.fullName}</p>
        <p><strong>Date of Birth:</strong> ${userData.birthdate}</p>
        <p><strong>Time:</strong> ${userData.birthTime}</p>
        <p><strong>Place:</strong> ${userData.birthPlace}</p>
        <p><strong>Question:</strong> ${userData.question}</p>
        <h3>Answer</h3><p>${answer}</p>
        <h3>Astrology</h3><p>${astrology}</p>
        <h3>Numerology</h3><p>${numerology}</p>
        <h3>Palmistry</h3><p>${palmistry}</p>
        <p>Full detailed PDF is attached.</p>
      </div>`;

    await sendEmailWithAttachment({
      to: userData.email,
      subject: "Your Spiritual Report",
      html,
      buffer: pdfBuffer,
      filename: "Spiritual_Report.pdf",
    });

    console.log(`✅ Report emailed to ${userData.email}`);
    return res.status(200).json({
      success: true,
      message: "Report generated successfully",
      answer,
      astrologySummary: astrology,
      numerologySummary: numerology,
      palmSummary: palmistry,
    });
  });
}
