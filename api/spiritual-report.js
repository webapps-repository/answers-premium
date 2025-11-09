// /api/spiritual-report.js
// /api/spiritual-report.js
// /api/spiritual-report.js
// /api/spiritual-report.js

import { formidable } from "formidable";
import fs from "fs"; // (kept in case you later use uploaded files)
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = { api: { bodyParser: false } };

// Small helpers to normalize Formidable field values (string | string[] -> string)
const pick = (v, d = "") => (Array.isArray(v) ? (v[0] ?? d) : (v ?? d));

export default async function handler(req, res) {
  // ✅ Set CORS headers FIRST so they’re present even on errors
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  // ✅ Preflight
  if (req.method === "OPTIONS") return res.status(200).end();

  // ✅ Only POST is allowed
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    // Parse multipart form
    const form = formidable({ multiples: false, keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      try {
        if (err) {
          console.error("❌ Form parse error:", err);
          return res
            .status(500)
            .json({ success: false, error: "Form parsing failed" });
        }

        // === reCAPTCHA Verification ===
        const token = pick(fields["g-recaptcha-response"]);
        if (!token) {
          return res
            .status(400)
            .json({ success: false, error: "Missing reCAPTCHA token" });
        }

        const verify = await fetch(
          "https://www.google.com/recaptcha/api/siteverify",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              secret: process.env.RECAPTCHA_SECRET_KEY,
              response: token,
            }),
          }
        );

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
          fullName: pick(fields.name),
          email: pick(fields.email),
          birthdate: pick(fields.birthdate),
          birthTime: pick(fields.birthtime, "Unknown"),
          birthPlace: `${pick(fields.birthcity)}, ${pick(
            fields.birthstate
          )}, ${pick(fields.birthcountry)}`,
          question: pick(fields.question, "No question provided."),
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
Use the following user details to provide a concise answer to their question and short sectioned insights.

User:
- Name: ${userData.fullName}
- Date of Birth: ${userData.birthdate}
- Time of Birth: ${userData.birthTime}
- Birth Place: ${userData.birthPlace}
- Question: ${userData.question}
- Submission Time: ${userData.submittedAt}

Respond ONLY in JSON:
{
  "answer": "Direct answer (<=120 words).",
  "astrology": "Astrology insights based on Sun, Moon, Ascendant, and Ruling Planet (<=120 words).",
  "numerology": "Life path + destiny style numerology summary (<=100 words).",
  "palmistry": "Life line, heart line, career line overview (<=100 words)."
}
          `.trim();

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert astrologer, numerologist, and palm reader providing structured, compassionate guidance.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
          });

          let text = completion?.choices?.[0]?.message?.content ?? "{}";

          // Robust JSON extraction (handles accidental prose or ```json blocks)
          const fence = text.match(/```json([\s\S]*?)```/i);
          if (fence) text = fence[1].trim();

          let parsed = {};
          try {
            parsed = JSON.parse(text);
          } catch (e) {
            console.warn("⚠️ OpenAI returned non-JSON, falling back:", text);
          }

          answer = parsed.answer || answer;
          astrology = parsed.astrology || astrology;
          numerology = parsed.numerology || numerology;
          palmistry = parsed.palmistry || palmistry;
        } catch (e) {
          console.error("❌ OpenAI generation error:", e);
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

        // === Email Body (HTML) ===
        const htmlBody = `
<div style="font-family: Arial, Helvetica, sans-serif; color: #333; max-width: 700px; margin: auto; line-height: 1.6;">
  <h2 style="text-align:center; color:#6c63ff; margin: 0 0 12px;">🔮 Your Personalized Spiritual Report</h2>

  <div style="background:#f7f7f7; padding:12px 14px; border-radius:10px; margin-bottom:16px;">
    <p style="margin:6px 0;"><strong>📧 Email:</strong> ${userData.email}</p>
    <p style="margin:6px 0;"><strong>🧑 Name:</strong> ${userData.fullName}</p>
    <p style="margin:6px 0;"><strong>📅 Birth Date:</strong> ${userData.birthdate}</p>
    <p style="margin:6px 0;"><strong>⏰ Birth Time:</strong> ${userData.birthTime}</p>
    <p style="margin:6px 0;"><strong>🌍 Birth Place:</strong> ${userData.birthPlace}</p>
    <p style="margin:6px 0;"><strong>💭 Question:</strong> ${userData.question}</p>
  </div>

  <h3 style="color:#4B0082; margin: 14px 0 6px;">💫 Answer to Your Question</h3>
  <p style="margin:6px 0 14px;">${answer}</p>

  <h3 style="color:#4B0082; margin: 14px 0 6px;">🌟 Astrology Insights</h3>
  <p style="margin:6px 0 14px;">${astrology}</p>

  <h3 style="color:#4B0082; margin: 14px 0 6px;">🔢 Numerology Insights</h3>
  <p style="margin:6px 0 14px;">${numerology}</p>

  <h3 style="color:#4B0082; margin: 14px 0 6px;">✋ Palmistry Insights</h3>
  <p style="margin:6px 0 18px;">${palmistry}</p>

  <p style="margin-top:12px; font-size:0.9rem; color:#555;">
    ✅ Your full detailed report is attached as a PDF.
  </p>
  <p style="text-align:center; margin-top:10px; color:#777;">
    — Hazcam Spiritual Systems ✨
  </p>
</div>
        `.trim();

        // === Send Email ===
        await sendEmailWithAttachment({
          to: userData.email,
          subject: "🔮 Your Full Spiritual Report and Personalized Answer",
          html: htmlBody,
          buffer: pdfBuffer,
          filename: "Spiritual_Report.pdf",
        });

        console.log(`✅ Report emailed to ${userData.email}`);

        // === Web Response ===
        return res.status(200).json({
          success: true,
          message: "Report generated successfully.",
          answer,
          astrologySummary: astrology,
          numerologySummary: numerology,
          palmSummary: palmistry,
        });
      } catch (innerErr) {
        console.error("❌ Handler inner error:", innerErr);
        // CORS already set above
        return res
          .status(500)
          .json({ success: false, error: "Internal error generating report" });
      }
    });
  } catch (err) {
    console.error("❌ CORS or outer error:", err);
    // Ensure CORS on outer errors too
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res
      .status(500)
      .json({ success: false, error: "Internal Server Error" });
  }
}
