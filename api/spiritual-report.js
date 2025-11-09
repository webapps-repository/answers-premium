// tabulated /api/spiritual-report.js

import { formidable } from "formidable";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "https://zzqejx-u8.myshopify.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const form = formidable({ multiples: false, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ success: false, error: "Form parse failed" });

    const token = Array.isArray(fields["g-recaptcha-response"])
      ? fields["g-recaptcha-response"][0]
      : fields["g-recaptcha-response"];

    // --- Verify reCAPTCHA ---
    const verify = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: token,
      }),
    });
    const verification = await verify.json();
    if (!verification.success)
      return res.status(403).json({ success: false, error: "reCAPTCHA failed", details: verification });

    const user = {
      question: fields.question,
      fullName: fields.name,
      email: fields.email,
      birthdate: fields.birthdate,
      birthTime: fields.birthtime || "Unknown",
      birthCity: fields.birthcity,
      birthState: fields.birthstate,
      birthCountry: fields.birthcountry,
      birthPlace: `${fields.birthcity}, ${fields.birthstate}, ${fields.birthcountry}`,
      submittedAt: new Date().toISOString(),
    };

    console.log(`🔮 Generating report for ${user.fullName}`);

    // --- Generate content via OpenAI ---
    const prompt = `
You are a professional spiritual advisor using astrology, numerology, and palmistry.
Interpret the following details to answer the user's question and create detailed sections.

Name: ${user.fullName}
Date of Birth: ${user.birthdate}
Time of Birth: ${user.birthTime}
Place of Birth: ${user.birthPlace}
Question: ${user.question}
Submission Time: ${user.submittedAt}

Return JSON:
{
  "answer": "Short paragraph answering the question using personal insights",
  "astrology": "Detailed astrology interpretation with planetary & rising sign influences",
  "numerology": "Full analysis including Life Path, Expression, Personality, Soul Urge, and Maturity numbers",
  "palmistry": "Detailed reading of life, head, heart, and fate lines, and personality traits"
}`;

    let answer, astrology, numerology, palmistry;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert spiritual analyst generating deeply personalized readings." },
          { role: "user", content: prompt },
        ],
      });

      const json = JSON.parse(completion.choices[0].message.content || "{}");
      answer = json.answer || "Could not generate answer.";
      astrology = json.astrology || "Could not generate astrology insights.";
      numerology = json.numerology || "Could not generate numerology insights.";
      palmistry = json.palmistry || "Could not generate palmistry insights.";
    } catch (err) {
      console.error("❌ OpenAI error:", err);
      answer = "OpenAI generation failed.";
    }

    const reading = { answer, astrology, numerology, palmistry };

    // --- Generate PDF ---
    const pdfBuffer = await generatePdfBuffer({
      ...user,
      reading,
    });

    // --- Email body ---
    const html = `
      <div style="font-family:Arial, sans-serif;max-width:700px;margin:auto;color:#333;">
        <h2 style="text-align:center;color:#5a3ec8;">✨ Ask Your Question Report</h2>
        <div style="background:#f7f5ff;padding:1rem;border-radius:10px;margin:1rem 0;">
          <p><strong>📅 Submitted:</strong> ${user.submittedAt}</p>
          <p><strong>🧠 Question:</strong> ${user.question}</p>
          <p><strong>👤 Name:</strong> ${user.fullName}</p>
          <p><strong>📧 Email:</strong> ${user.email}</p>
          <p><strong>📍 Birth Place:</strong> ${user.birthPlace}</p>
        </div>

        <h3>🔮 Your Answer</h3>
        <p>${reading.answer}</p>

        <h3>🌞 Astrology</h3>
        <p>${reading.astrology}</p>

        <h3>🔢 Numerology</h3>
        <p>${reading.numerology}</p>

        <h3>✋ Palmistry</h3>
        <p>${reading.palmistry}</p>

        <p style="margin-top:2rem;text-align:center;color:#666;">
          Attached is your full PDF report 📜
        </p>
      </div>
    `;

    // --- Send email ---
    await sendEmailWithAttachment({
      to: user.email,
      subject: "✨ Your Spiritual Report Answer",
      html,
      buffer: pdfBuffer,
      filename: "Spiritual_Report.pdf",
    });

    console.log(`✅ Report sent to ${user.email}`);

    return res.status(200).json({
      success: true,
      message: "Report sent successfully.",
      answer,
      astrologySummary: astrology,
      numerologySummary: numerology,
      palmSummary: palmistry,
    });
  });
}
