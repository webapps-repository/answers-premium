// /api/spiritual-report.js
import { formidable } from "formidable";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*"); // lock to your Shopify domain when ready
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET")
    return res.status(200).json({ success: true, message: "OK" });
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const form = formidable({ multiples: false, keepExtensions: true });

  form.parse(req, async (err, fields/*, files*/) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ success: false, error: "Form parsing failed" });
    }

    // --- reCAPTCHA v2 verify ---
    const rawToken = Array.isArray(fields["g-recaptcha-response"])
      ? fields["g-recaptcha-response"][0]
      : fields["g-recaptcha-response"];

    try {
      const verify = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: rawToken,
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
    } catch (e) {
      console.error("reCAPTCHA error:", e);
      return res.status(500).json({ success: false, error: "reCAPTCHA error" });
    }

    // --- Extract user data ---
    const user = {
      fullName: str(fields.name),
      email: str(fields.email),
      birthdate: str(fields.birthdate),
      birthTime: str(fields.birthtime) || "Unknown",
      birthPlace: [fields.birthcity, fields.birthstate, fields.birthcountry].map(str).filter(Boolean).join(", "),
      question: str(fields.question) || "No question provided.",
      submittedAt: new Date().toISOString(),
    };

    // --- Ask OpenAI for structured JSON (concise professional tone) ---
    const system = `
You are a professional but concise spiritual advisor. 
Blend traditional astrology, numerology and palmistry into practical, neutral guidance.
Return STRICT JSON only. Do not include prose outside JSON. Keep each field 2–5 sentences.`;

    const userPrompt = `
User:
- Name: ${user.fullName}
- Date of Birth: ${user.birthdate}
- Time of Birth: ${user.birthTime}
- Birth Place: ${user.birthPlace}
- Question: ${user.question}
- Submission Time: ${user.submittedAt}

Produce the following JSON (and ONLY the JSON):

{
  "answer": "<direct answer to the question>",
  "astrology": {
    "summary": "<overall synopsis>",
    "planetaryPositions": "<concise themes>",
    "ascendant": "<how they present + rising sign theme if inferable>",
    "houses": "<key life areas emphasized>",
    "family": "<home/family dynamic>",
    "loveHouse": "<romance/relationships focus>",
    "health": "<health & wellbeing tendencies>",
    "career": "<work, career, business themes>"
  },
  "numerology": {
    "summary": "<overall synopsis>",
    "lifePath": "<meaning>",
    "expression": "<meaning>",
    "personality": "<meaning>",
    "soulUrge": "<meaning>",
    "maturity": "<meaning>"
  },
  "palmistry": {
    "summary": "<overall synopsis (assume standard right palm photo)>",
    "lifeLine": "<meaning>",
    "headLine": "<meaning>",
    "heartLine": "<meaning>",
    "fateLine": "<meaning>",
    "thumb": "<meaning>",
    "indexFinger": "<meaning>",
    "middleFinger": "<meaning>",
    "ringFinger": "<meaning>",
    "pinkyFinger": "<meaning>",
    "mounts": "<overall pattern>",
    "marriage": "<marriage/relationship lines>",
    "children": "<children lines>",
    "travelLines": "<travel lines>",
    "stressLines": "<stress lines>"
  }
}`;

    let ai = null;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system.trim() },
          { role: "user", content: userPrompt.trim() },
        ],
        temperature: 0.7,
      });

      // Strip code fences if present and parse
      const raw = completion.choices?.[0]?.message?.content || "{}";
      const jsonText = raw.replace(/```json|```/g, "").trim();
      ai = JSON.parse(jsonText);
    } catch (e) {
      console.error("OpenAI JSON parse/generation error:", e);
      ai = {}; // fallbacks below
    }

    // Fallback-safe getters
    const answer = ai?.answer || "No answer available.";
    const astrology = {
      summary: pick(ai, ["astrology","summary"]),
      planetaryPositions: pick(ai, ["astrology","planetaryPositions"]),
      ascendant: pick(ai, ["astrology","ascendant"]),
      houses: pick(ai, ["astrology","houses"]),
      family: pick(ai, ["astrology","family"]),
      loveHouse: pick(ai, ["astrology","loveHouse"]),
      health: pick(ai, ["astrology","health"]),
      career: pick(ai, ["astrology","career"]),
    };
    const numerology = {
      summary: pick(ai, ["numerology","summary"]),
      lifePath: pick(ai, ["numerology","lifePath"]),
      expression: pick(ai, ["numerology","expression"]),
      personality: pick(ai, ["numerology","personality"]),
      soulUrge: pick(ai, ["numerology","soulUrge"]),
      maturity: pick(ai, ["numerology","maturity"]),
    };
    const palmistry = {
      summary: pick(ai, ["palmistry","summary"]),
      lifeLine: pick(ai, ["palmistry","lifeLine"]),
      headLine: pick(ai, ["palmistry","headLine"]),
      heartLine: pick(ai, ["palmistry","heartLine"]),
      fateLine: pick(ai, ["palmistry","fateLine"]),
      thumb: pick(ai, ["palmistry","thumb"]),
      indexFinger: pick(ai, ["palmistry","indexFinger"]),
      middleFinger: pick(ai, ["palmistry","middleFinger"]),
      ringFinger: pick(ai, ["palmistry","ringFinger"]),
      pinkyFinger: pick(ai, ["palmistry","pinkyFinger"]),
      mounts: pick(ai, ["palmistry","mounts"]),
      marriage: pick(ai, ["palmistry","marriage"]),
      children: pick(ai, ["palmistry","children"]),
      travelLines: pick(ai, ["palmistry","travelLines"]),
      stressLines: pick(ai, ["palmistry","stressLines"]),
    };

    // --- Build PDF (narrative, 1.5 spacing, no icons) ---
    const pdfBuffer = await generatePdfBuffer({
      fullName: user.fullName,
      birthdate: user.birthdate,
      birthTime: user.birthTime,
      birthPlace: user.birthPlace,
      question: user.question,

      answer,
      astrology,
      numerology,
      palmistry,
    });

    // --- Email body (also narrative) ---
    const htmlBody = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#222;line-height:1.6;max-width:740px;margin:auto">
        <h2 style="text-align:center;color:#4B0082;margin:0 0 12px">Your Personal Spiritual Report</h2>
        <div style="background:#f6f3fb;padding:12px 14px;border-radius:10px;margin-bottom:12px">
          <p><strong>Name:</strong> ${escapeHtml(user.fullName)}</p>
          <p><strong>Date of Birth:</strong> ${escapeHtml(user.birthdate)} &nbsp; <strong>Time:</strong> ${escapeHtml(user.birthTime)}</p>
          <p><strong>Birth Place:</strong> ${escapeHtml(user.birthPlace)}</p>
          <p><strong>Question:</strong> ${escapeHtml(user.question)}</p>
        </div>

        <h3 style="color:#4B0082;margin:18px 0 6px">Answer to Your Question</h3>
        <p>${escapeHtml(answer)}</p>

        <h3 style="color:#4B0082;margin:18px 0 6px">Astrology</h3>
        <p>${escapeHtml(astrology.summary)}</p>

        <h4 style="margin:10px 0 6px">Planetary Positions</h4><p>${escapeHtml(astrology.planetaryPositions)}</p>
        <h4 style="margin:10px 0 6px">Ascendant (Rising)</h4><p>${escapeHtml(astrology.ascendant)}</p>
        <h4 style="margin:10px 0 6px">Houses</h4><p>${escapeHtml(astrology.houses)}</p>
        <h4 style="margin:10px 0 6px">Family</h4><p>${escapeHtml(astrology.family)}</p>
        <h4 style="margin:10px 0 6px">Love</h4><p>${escapeHtml(astrology.loveHouse)}</p>
        <h4 style="margin:10px 0 6px">Health & Wellbeing</h4><p>${escapeHtml(astrology.health)}</p>
        <h4 style="margin:10px 0 6px">Work, Career & Business</h4><p>${escapeHtml(astrology.career)}</p>

        <h3 style="color:#4B0082;margin:18px 0 6px">Numerology</h3>
        <p>${escapeHtml(numerology.summary)}</p>
        <p><strong>Life Path:</strong> ${escapeHtml(numerology.lifePath)}</p>
        <p><strong>Expression:</strong> ${escapeHtml(numerology.expression)}</p>
        <p><strong>Personality:</strong> ${escapeHtml(numerology.personality)}</p>
        <p><strong>Soul Urge:</strong> ${escapeHtml(numerology.soulUrge)}</p>
        <p><strong>Maturity:</strong> ${escapeHtml(numerology.maturity)}</p>

        <h3 style="color:#4B0082;margin:18px 0 6px">Palmistry</h3>
        <p>${escapeHtml(palmistry.summary)}</p>
        <p><strong>Life Line:</strong> ${escapeHtml(palmistry.lifeLine)}</p>
        <p><strong>Head Line:</strong> ${escapeHtml(palmistry.headLine)}</p>
        <p><strong>Heart Line:</strong> ${escapeHtml(palmistry.heartLine)}</p>
        <p><strong>Fate Line:</strong> ${escapeHtml(palmistry.fateLine)}</p>
        <p><strong>Thumb:</strong> ${escapeHtml(palmistry.thumb)}</p>
        <p><strong>Index Finger:</strong> ${escapeHtml(palmistry.indexFinger)}</p>
        <p><strong>Middle Finger:</strong> ${escapeHtml(palmistry.middleFinger)}</p>
        <p><strong>Ring Finger:</strong> ${escapeHtml(palmistry.ringFinger)}</p>
        <p><strong>Pinky Finger:</strong> ${escapeHtml(palmistry.pinkyFinger)}</p>
        <p><strong>Mounts:</strong> ${escapeHtml(palmistry.mounts)}</p>
        <p><strong>Marriage/Relationship:</strong> ${escapeHtml(palmistry.marriage)}</p>
        <p><strong>Children:</strong> ${escapeHtml(palmistry.children)}</p>
        <p><strong>Travel Lines:</strong> ${escapeHtml(palmistry.travelLines)}</p>
        <p><strong>Stress Lines:</strong> ${escapeHtml(palmistry.stressLines)}</p>

        <p style="margin-top:14px;color:#666">Your detailed PDF report is attached.</p>
      </div>
    `;

    await sendEmailWithAttachment({
      to: user.email,
      subject: "Your Personal Spiritual Report",
      html: htmlBody,
      buffer: pdfBuffer,
      filename: "Spiritual_Report.pdf",
    });

    return res.status(200).json({
      success: true,
      message: "Report generated successfully.",
      answer,
      astrologySummary: astrology.summary,
      numerologySummary: numerology.summary,
      palmSummary: palmistry.summary,
    });
  });
}

// ----- helpers -----
function str(x) { return (Array.isArray(x) ? x[0] : x) ? String(Array.isArray(x) ? x[0] : x).trim() : ""; }
function pick(obj, path) {
  try {
    return path.reduce((o,k)=> (o && o[k]!=null ? o[k] : null), obj) || "";
  } catch { return ""; }
}
function escapeHtml(s="") {
  return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
