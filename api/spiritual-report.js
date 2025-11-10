// /api/spiritual-report.js
import { formidable } from "formidable";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = {
  api: { bodyParser: false },
};

// --- Small helpers ----------------------------------------------------------
const first = (v) => (Array.isArray(v) ? v[0] : v ?? "");

/** Try to parse a JSON object from a model response safely. */
function safeJsonParse(text, fallback = {}) {
  try {
    // if response already looks like JSON
    if (text.trim().startsWith("{")) return JSON.parse(text);
    // extract the first JSON block in the message
    const match = text.match(/\{[\s\S]*\}$/m);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    // fallthrough to fallback
  }
  return fallback;
}

export default async function handler(req, res) {
  // ---- CORS (Shopify page → Vercel function) ----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  // ---- Parse multipart form (file + fields) ----
  const form = formidable({ multiples: false, keepExtensions: true });
  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        console.error("❌ Form parse error:", err);
        return res.status(500).json({ success: false, error: "Form parsing failed" });
      }

      // --- reCAPTCHA v2 verification ---
      const token = first(fields["g-recaptcha-response"]);
      if (!token) {
        return res.status(400).json({ success: false, error: "Missing reCAPTCHA token" });
      }

      const verifyResp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token,
        }),
      });
      const verification = await verifyResp.json();
      if (!verification.success) {
        console.error("❌ reCAPTCHA verification failed:", verification);
        return res.status(403).json({
          success: false,
          error: "reCAPTCHA verification failed",
          details: verification,
        });
      }

      // --- Extract user data ---
      const user = {
        fullName: first(fields.name),
        email: first(fields.email),
        birthdate: first(fields.birthdate),
        birthTime: first(fields.birthtime) || "Unknown",
        birthPlace: `${first(fields.birthcity)}, ${first(fields.birthstate)}, ${first(fields.birthcountry)}`,
        question: first(fields.question) || "No question provided.",
        submittedAt: new Date().toISOString(),
      };

      // --- Build model prompt (returns strict JSON) ---
      const modelPrompt = `
You are a careful spiritual advisor who blends **astrology**, **numerology**, and **palmistry**.
Given a user's details and question, produce **valid JSON** ONLY matching this schema:

{
  "answer": "Direct answer for the user (~80-120 words).",
  "astrology": {
    "summary": "Readable paragraph overview that interprets Sun/Moon/Rising/planetary focus and houses relative to the user's question.",
    "Planetary Positions": "Concise significance/meaning.",
    "Ascendant (Rising) Zodiac Sign": "Meaning for the user.",
    "Astrological Houses": "Meaning for the user.",
    "Family Astrology": "Meaning for the user.",
    "Love Governing House in Astrology": "Meaning for the user.",
    "Health & Wellbeing Predictions": "Meaning for the user.",
    "Astrological influences on Work, Career and Business": "Meaning for the user."
  },
  "numerology": {
    "summary": "Readable paragraph overview.",
    "Life Path": { "number": "<integer>", "meaning": "..." },
    "Expression": { "number": "<integer>", "meaning": "..." },
    "Personality": { "number": "<integer>", "meaning": "..." },
    "Soul Urge": { "number": "<integer>", "meaning": "..." },
    "Maturity": { "number": "<integer>", "meaning": "..." }
  },
  "palmistry": {
    "summary": "Readable paragraph overview.",
    "Life Line": "...",
    "Head Line": "...",
    "Heart Line": "...",
    "Fate Line": "...",
    "Mounts": { "prominent": ["Jupiter","Venus","Luna"], "meaning": "..." },
    "Marriage / Relationship": { "count": <integer>, "timeline": "e.g. first bond mid-20s...", "meaning": "..." },
    "Children": { "count": <integer>, "meaning": "..." },
    "Travel Lines": { "type": "International|Domestic|Mixed", "timeline": "e.g. 35–45", "meaning": "..." },
    "Stress Lines": "..."
  }
}

Rules:
- Output JSON only (no markdown, no commentary).
- Use the user's question and details to tailor every field.
- If unsure, give the most useful, non-committal guidance (never leave blanks).

User:
Name: ${user.fullName}
DOB: ${user.birthdate}
Time: ${user.birthTime}
Place: ${user.birthPlace}
Question: ${user.question}
Submission Time (UTC): ${user.submittedAt}
`;

      let answer = "Could not generate answer.";
      let astrologySummary = "Astrology interpretation unavailable.";
      let numerologySummary = "Numerology interpretation unavailable.";
      let palmistrySummary = "Palmistry interpretation unavailable.";

      // tables/details
      let astroDetails = {};
      let numDetails = {};
      let palmDetails = {};

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "text" },
          messages: [
            { role: "system", content: "Return valid JSON only. Keep it grounded and readable." },
            { role: "user", content: modelPrompt },
          ],
        });

        const raw = completion.choices?.[0]?.message?.content ?? "{}";
        const data = safeJsonParse(raw, {});

        // Pull top-level strings
        answer = data.answer || answer;

        // Astrology
        if (data.astrology) {
          astrologySummary = data.astrology.summary || astrologySummary;
          astroDetails = {
            "Planetary Positions": data.astrology["Planetary Positions"],
            "Ascendant (Rising) Zodiac Sign": data.astrology["Ascendant (Rising) Zodiac Sign"],
            "Astrological Houses": data.astrology["Astrological Houses"],
            "Family Astrology": data.astrology["Family Astrology"],
            "Love Governing House in Astrology": data.astrology["Love Governing House in Astrology"],
            "Health & Wellbeing Predictions": data.astrology["Health & Wellbeing Predictions"],
            "Astrological influences on Work, Career and Business":
              data.astrology["Astrological influences on Work, Career and Business"],
          };
        }

        // Numerology (numbers + meanings)
        if (data.numerology) {
          numerologySummary = data.numerology.summary || numerologySummary;
          numDetails = {
            "Life Path": data.numerology["Life Path"],
            "Expression": data.numerology["Expression"],
            "Personality": data.numerology["Personality"],
            "Soul Urge": data.numerology["Soul Urge"],
            "Maturity": data.numerology["Maturity"],
          };
        }

        // Palmistry
        if (data.palmistry) {
          palmistrySummary = data.palmistry.summary || palmistrySummary;
          palmDetails = {
            "Life Line": data.palmistry["Life Line"],
            "Head Line": data.palmistry["Head Line"],
            "Heart Line": data.palmistry["Heart Line"],
            "Fate Line": data.palmistry["Fate Line"],
            "Mounts": data.palmistry["Mounts"],
            "Marriage / Relationship": data.palmistry["Marriage / Relationship"],
            "Children": data.palmistry["Children"],
            "Travel Lines": data.palmistry["Travel Lines"],
            "Stress Lines": data.palmistry["Stress Lines"],
          };
        }
      } catch (e) {
        console.error("❌ OpenAI error:", e);
      }

      // ---- Generate PDF (new layout & spacing) ----
      const pdfBuffer = await generatePdfBuffer({
        fullName: user.fullName,
        birthdate: user.birthdate,
        birthTime: user.birthTime,
        birthPlace: user.birthPlace,
        question: user.question,

        answer,
        astrology: astrologySummary,
        numerology: numerologySummary,
        palmistry: palmistrySummary,

        astroDetails,
        numDetails,
        palmDetails,
      });

      // ---- Email (answer + summaries inline, PDF attached) ----
      const emailHtml = `
      <div style="font-family:Arial,Helvetica,sans-serif; color:#333; line-height:1.55; max-width:720px; margin:auto;">
        <h2 style="color:#4B0082; text-align:center; margin:0 0 12px;">Your Personalized Spiritual Report</h2>

        <div style="background:#f7f7fb; padding:12px 14px; border-radius:10px; margin-bottom:14px;">
          <p><strong>Name:</strong> ${user.fullName}</p>
          <p><strong>DOB:</strong> ${user.birthdate} &nbsp; <strong>Time:</strong> ${user.birthTime}</p>
          <p><strong>Place:</strong> ${user.birthPlace}</p>
          <p><strong>Question:</strong> ${user.question}</p>
        </div>

        <h3 style="color:#4B0082; margin:18px 0 8px;">Answer to Your Question</h3>
        <p>${answer}</p>

        <h3 style="color:#4B0082; margin:18px 0 8px;">Astrology</h3>
        <p>${astrologySummary}</p>

        <h3 style="color:#4B0082; margin:18px 0 8px;">Numerology</h3>
        <p>${numerologySummary}</p>

        <h3 style="color:#4B0082; margin:18px 0 8px;">Palmistry</h3>
        <p>${palmistrySummary}</p>

        <p style="margin-top:16px;">A full detailed PDF is attached.</p>
        <p style="color:#777; text-align:center; margin-top:10px;">— Hazcam Spiritual Systems</p>
      </div>`.trim();

      await sendEmailWithAttachment({
        to: user.email,
        subject: "Your Spiritual Report & Personalized Answer",
        html: emailHtml,
        buffer: pdfBuffer,
        filename: "Spiritual_Report.pdf",
      });

      // ---- Response for the web page summaries ----
      return res.status(200).json({
        success: true,
        message: "Report generated successfully.",
        answer,
        astrologySummary,
        numerologySummary,
        palmSummary: palmistrySummary,
      });
    } catch (e) {
      console.error("❌ Server error:", e);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  });
}
