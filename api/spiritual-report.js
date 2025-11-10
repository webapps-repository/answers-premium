// /api/spiritual-report.js
import { formidable } from "formidable";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // CORS (allow Shopify page to call this)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const form = formidable({ multiples: false, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) {
        console.error("Form parse error:", err);
        return res.status(500).json({ success: false, error: "Form parsing failed" });
      }

      // --- reCAPTCHA v2 verify ---
      const token = Array.isArray(fields["g-recaptcha-response"])
        ? fields["g-recaptcha-response"][0]
        : fields["g-recaptcha-response"];

      const verify = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token
        }),
      });
      const verification = await verify.json();
      if (!verification.success) {
        console.error("reCAPTCHA failed:", verification);
        return res.status(403).json({
          success: false,
          error: "reCAPTCHA verification failed",
          details: verification,
        });
      }

      // --- user data ---
      const user = {
        fullName: String(fields.name || "").trim(),
        email: String(fields.email || "").trim(),
        birthdate: String(fields.birthdate || "").trim(),
        birthTime: String(fields.birthtime || "Unknown").trim(),
        birthPlace: `${fields.birthcity || ""}, ${fields.birthstate || ""}, ${fields.birthcountry || ""}`.replaceAll(" ,", "").trim(),
        question: String(fields.question || "No question provided.").trim(),
        submittedAt: new Date().toISOString(),
      };

      // --- OpenAI: ask for structured JSON (includes numerology numbers + palm details) ---
      const schemaPrompt = `
You are a careful spiritual analyst. Based ONLY on the user's birth details and question,
compose concise, grounded insights. Respond EXACTLY as JSON matching this schema:

{
  "answer": "Direct answer to the question in ~110 words.",
  "astrologySummary": "Astrology summary paragraph.",
  "numerologySummary": "Numerology summary paragraph.",
  "palmistrySummary": "Palmistry summary paragraph.",
  "numerologyNumbers": {
    "lifePath": "integer or string (e.g., '8')",
    "expression": "...",
    "personality": "...",
    "soulUrge": "...",
    "maturity": "..."
  },
  "palmistryDetails": {
    "mountsProminent": "e.g., 'Jupiter & Venus'",
    "marriageCount": "number or estimate",
    "marriageTimeline": "brief timing note",
    "childrenCount": "number or estimate",
    "travelType": "Domestic / International / Mixed",
    "travelTimeline": "brief timing window",
    "stressLevel": "Low / Moderate / High with brief qualifier"
  },
  "astrologyDetails": {
    "planetaryPositions": "brief, plain text",
    "risingSign": "plain text",
    "houses": "plain text focus",
    "family": "plain text",
    "loveHouse": "plain text",
    "health": "plain text",
    "career": "plain text"
  }
}

User:
- Name: ${user.fullName}
- Date of Birth: ${user.birthdate}
- Time of Birth: ${user.birthTime}
- Birth Place: ${user.birthPlace}
- Question: ${user.question}
- Submission Time: ${user.submittedAt}
      `.trim();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: "You provide concise, well-structured spiritual insights. JSON only." },
          { role: "user", content: schemaPrompt }
        ],
      });

      // Safe JSON parse
      let payload = {};
      try {
        payload = JSON.parse(completion.choices[0]?.message?.content || "{}");
      } catch (e) {
        console.error("JSON parse error:", e, completion.choices[0]?.message?.content);
        payload = {};
      }

      // Robust fallbacks
      const answer = payload.answer || "No answer available.";
      const astrologySummary = payload.astrologySummary || "Astrology interpretation unavailable.";
      const numerologySummary = payload.numerologySummary || "Numerology interpretation unavailable.";
      const palmistrySummary = payload.palmistrySummary || "Palmistry interpretation unavailable.";

      const numerologyNumbers = payload.numerologyNumbers || {};
      const astroDetails = payload.astrologyDetails || {};
      const palmDetails = payload.palmistryDetails || {};

      // --- build PDF (narrative, no icons, 1.5 spacing, headings, numerology numbers in headings) ---
      const pdfBuffer = await generatePdfBuffer({
        fullName: user.fullName,
        birthdate: user.birthdate,
        birthTime: user.birthTime,
        birthPlace: user.birthPlace,
        question: user.question,

        answer,
        astrologySummary,
        numerologySummary,
        palmistrySummary,

        numerologyNumbers, // {lifePath, expression, personality, soulUrge, maturity}
        astroDetails,      // narrative details for sections
        palmDetails        // mountsProminent, marriageCount/timeline, childrenCount, travelType/timeline, stressLevel
      });

      // --- email body (plain HTML) ---
      const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#222;line-height:1.6;max-width:760px;margin:auto">
          <h2 style="color:#4B0082;text-align:center;margin:0 0 12px">Your Personalized Spiritual Report</h2>
          <div style="background:#f6f5fb;border-radius:10px;padding:12px 14px;margin-bottom:14px">
            <div><strong>Name:</strong> ${user.fullName}</div>
            <div><strong>Date of Birth:</strong> ${user.birthdate}</div>
            <div><strong>Time of Birth:</strong> ${user.birthTime}</div>
            <div><strong>Birth Place:</strong> ${user.birthPlace}</div>
            <div><strong>Question:</strong> ${user.question}</div>
          </div>

          <h3 style="color:#4B0082;margin:18px 0 8px">Answer to Your Question</h3>
          <p style="margin:0 0 12px">${answer}</p>

          <h3 style="color:#4B0082;margin:18px 0 8px">Astrology</h3>
          <p style="margin:0 0 12px">${astrologySummary}</p>

          <h3 style="color:#4B0082;margin:18px 0 8px">Numerology</h3>
          <p style="margin:0 0 12px">${numerologySummary}</p>

          <h4 style="margin:10px 0 6px">Numbers</h4>
          <ul style="margin:0 0 14px 18px">
            <li>Life Path — ${numerologyNumbers.lifePath ?? "—"}</li>
            <li>Expression — ${numerologyNumbers.expression ?? "—"}</li>
            <li>Personality — ${numerologyNumbers.personality ?? "—"}</li>
            <li>Soul Urge — ${numerologyNumbers.soulUrge ?? "—"}</li>
            <li>Maturity — ${numerologyNumbers.maturity ?? "—"}</li>
          </ul>

          <h3 style="color:#4B0082;margin:18px 0 8px">Palmistry</h3>
          <p style="margin:0 0 12px">${palmistrySummary}</p>
          <ul style="margin:0 0 14px 18px">
            <li>Prominent Mounts: ${palmDetails.mountsProminent ?? "—"}</li>
            <li>Marriage: ${palmDetails.marriageCount ?? "—"} (timeline: ${palmDetails.marriageTimeline ?? "—"})</li>
            <li>Children: ${palmDetails.childrenCount ?? "—"}</li>
            <li>Travel: ${palmDetails.travelType ?? "—"} (timeline: ${palmDetails.travelTimeline ?? "—"})</li>
            <li>Stress Lines: ${palmDetails.stressLevel ?? "—"}</li>
          </ul>

          <p style="margin-top:18px">A full PDF is attached.</p>
        </div>
      `;

      await sendEmailWithAttachment({
        to: user.email,
        subject: "Your Spiritual Report",
        html,
        buffer: pdfBuffer,
        filename: "Spiritual_Report.pdf",
      });

      return res.status(200).json({
        success: true,
        message: "Report generated successfully.",
        answer,
        astrologySummary,
        numerologySummary,
        palmSummary: palmistrySummary
      });
    } catch (e) {
      console.error("Handler error:", e);
      return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  });
}
