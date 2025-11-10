// /api/spiritual-report.js
import { formidable } from "formidable";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // CORS (lock to your Shopify domain when ready)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET") return res.status(200).json({ success: true, message: "OK" });
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
      birthPlace: [fields.birthcity, fields.birthstate, fields.birthcountry]
        .map(str).filter(Boolean).join(", "),
      question: str(fields.question) || "No question provided.",
      submittedAt: new Date().toISOString(),
    };

    // --- Ask OpenAI for strict JSON (concise but richer structure) ---
    const system = `
You are a concise, neutral spiritual advisor. Blend astrology, numerology, and palmistry into practical guidance.
Return STRICT JSON only (no code fences, no prose outside of JSON). Keep each leaf field ~2–5 sentences.
Use the question context to tailor each section's short summary paragraph.`;

    const userPrompt = `
User:
- Name: ${user.fullName}
- Date of Birth: ${user.birthdate}
- Time of Birth: ${user.birthTime}
- Birth Place: ${user.birthPlace}
- Question: ${user.question}
- Submission Time: ${user.submittedAt}

Produce ONLY this JSON (no extra text):

{
  "answer": "<summary answer that explicitly synthesizes astrology + numerology + palmistry in ~3–6 sentences>",
  "astrology": {
    "summary": "<short paragraph relevant to the user's question>",
    "planetaryPositions": "<concise themes or key placements relevant to the question>",
    "ascendant": "<rising sign theme + how they present>",
    "houses": "<key houses emphasized for the question>",
    "family": "<family/home themes>",
    "loveHouse": "<relationship/partnership focus>",
    "health": "<health & wellbeing tendencies>",
    "career": "<work/career/business themes>"
  },
  "numerology": {
    "summary": "<short paragraph relevant to the question>",
    "lifePath": { "number": "<number>", "meaning": "<meaning text>" },
    "expression": { "number": "<number>", "meaning": "<meaning text>" },
    "personality": { "number": "<number>", "meaning": "<meaning text>" },
    "soulUrge": { "number": "<number>", "meaning": "<meaning text>" },
    "maturity": { "number": "<number>", "meaning": "<meaning text>" }
  },
  "palmistry": {
    "summary": "<short paragraph relevant to the question (assume standard right palm photo if unspecified)>",
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
    "prominentMounts": "<which mounts are most prominent and what that implies>",
    "marriageTimeline": "<marriage/relationship lines including counts/timelines if inferable>",
    "childrenCount": "<how many children lines (approx.)>",
    "travelDetails": "<domestic/international travel lines and indicative timelines if inferable>",
    "stressLines": "<stress/impact lines>"
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

      const raw = completion.choices?.[0]?.message?.content || "{}";
      const jsonText = raw.replace(/```json|```/g, "").trim();
      ai = JSON.parse(jsonText);
    } catch (e) {
      console.error("OpenAI JSON parse/generation error:", e);
      ai = {};
    }

    // ---- Normalize/fallbacks so we never render [object Object] ----
    const nz = (v, d = "") => (v == null ? d : String(v));
    const asNumBlock = (objOrStr) => {
      if (objOrStr && typeof objOrStr === "object") {
        return {
          number: nz(objOrStr.number, ""),
          meaning: nz(objOrStr.meaning, ""),
        };
      }
      // fallback if model returned a string
      return { number: "", meaning: nz(objOrStr, "") };
    };

    const answer = nz(ai?.answer, "No answer available.");

    const astrology = {
      summary: nz(ai?.astrology?.summary),
      planetaryPositions: nz(ai?.astrology?.planetaryPositions),
      ascendant: nz(ai?.astrology?.ascendant),
      houses: nz(ai?.astrology?.houses),
      family: nz(ai?.astrology?.family),
      loveHouse: nz(ai?.astrology?.loveHouse),
      health: nz(ai?.astrology?.health),
      career: nz(ai?.astrology?.career),
    };

    const numerology = {
      summary: nz(ai?.numerology?.summary),
      lifePath: asNumBlock(ai?.numerology?.lifePath),
      expression: asNumBlock(ai?.numerology?.expression),
      personality: asNumBlock(ai?.numerology?.personality),
      soulUrge: asNumBlock(ai?.numerology?.soulUrge),
      maturity: asNumBlock(ai?.numerology?.maturity),
    };

    const palmistry = {
      summary: nz(ai?.palmistry?.summary),
      lifeLine: nz(ai?.palmistry?.lifeLine),
      headLine: nz(ai?.palmistry?.headLine),
      heartLine: nz(ai?.palmistry?.heartLine),
      fateLine: nz(ai?.palmistry?.fateLine),
      thumb: nz(ai?.palmistry?.thumb),
      indexFinger: nz(ai?.palmistry?.indexFinger),
      middleFinger: nz(ai?.palmistry?.middleFinger),
      ringFinger: nz(ai?.palmistry?.ringFinger),
      pinkyFinger: nz(ai?.palmistry?.pinkyFinger),
      mounts: nz(ai?.palmistry?.mounts),
      prominentMounts: nz(ai?.palmistry?.prominentMounts),
      marriageTimeline: nz(ai?.palmistry?.marriageTimeline),
      childrenCount: nz(ai?.palmistry?.childrenCount),
      travelDetails: nz(ai?.palmistry?.travelDetails),
      stressLines: nz(ai?.palmistry?.stressLines),
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

    // --- Email body (narrative + numbers in headings) ---
    const html = (s = "") => escapeHtml(s);
    const numHeading = (label, block) =>
      `<p><strong>${label}${block.number ? `: ${html(block.number)}` : ""}</strong> — ${html(block.meaning)}</p>`;

    const htmlBody = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#222;line-height:1.6;max-width:740px;margin:auto">
        <h2 style="text-align:center;color:#4B0082;margin:0 0 12px">Your Personal Spiritual Report</h2>
        <div style="background:#f6f3fb;padding:12px 14px;border-radius:10px;margin-bottom:12px">
          <p><strong>Name:</strong> ${html(user.fullName)}</p>
          <p><strong>Date of Birth:</strong> ${html(user.birthdate)} &nbsp; <strong>Time:</strong> ${html(user.birthTime)}</p>
          <p><strong>Birth Place:</strong> ${html(user.birthPlace)}</p>
          <p><strong>Question:</strong> ${html(user.question)}</p>
        </div>

        <h3 style="color:#4B0082;margin:18px 0 6px">Answer to Your Question</h3>
        <p>${html(answer)}</p>

        <h3 style="color:#4B0082;margin:18px 0 6px">Astrology</h3>
        <p>${html(astrology.summary)}</p>
        <p><strong>Planetary Positions</strong> — ${html(astrology.planetaryPositions)}</p>
        <p><strong>Ascendant (Rising)</strong> — ${html(astrology.ascendant)}</p>
        <p><strong>Houses</strong> — ${html(astrology.houses)}</p>
        <p><strong>Family</strong> — ${html(astrology.family)}</p>
        <p><strong>Love</strong> — ${html(astrology.loveHouse)}</p>
        <p><strong>Health & Wellbeing</strong> — ${html(astrology.health)}</p>
        <p><strong>Work, Career & Business</strong> — ${html(astrology.career)}</p>

        <h3 style="color:#4B0082;margin:18px 0 6px">Numerology</h3>
        <p>${html(numerology.summary)}</p>
        ${numHeading("Life Path", numerology.lifePath)}
        ${numHeading("Expression", numerology.expression)}
        ${numHeading("Personality", numerology.personality)}
        ${numHeading("Soul Urge", numerology.soulUrge)}
        ${numHeading("Maturity", numerology.maturity)}

        <h3 style="color:#4B0082;margin:18px 0 6px">Palmistry</h3>
        <p>${html(palmistry.summary)}</p>
        <p><strong>Life Line</strong> — ${html(palmistry.lifeLine)}</p>
        <p><strong>Head Line</strong> — ${html(palmistry.headLine)}</p>
        <p><strong>Heart Line</strong> — ${html(palmistry.heartLine)}</p>
        <p><strong>Fate Line</strong> — ${html(palmistry.fateLine)}</p>
        <p><strong>Thumb</strong> — ${html(palmistry.thumb)}</p>
        <p><strong>Index Finger</strong> — ${html(palmistry.indexFinger)}</p>
        <p><strong>Middle Finger</strong> — ${html(palmistry.middleFinger)}</p>
        <p><strong>Ring Finger</strong> — ${html(palmistry.ringFinger)}</p>
        <p><strong>Pinky Finger</strong> — ${html(palmistry.pinkyFinger)}</p>
        <p><strong>Mounts (overall)</strong> — ${html(palmistry.mounts)}</p>
        <p><strong>Prominent Mounts</strong> — ${html(palmistry.prominentMounts)}</p>
        <p><strong>Marriage / Relationship</strong> — ${html(palmistry.marriageTimeline)}</p>
        <p><strong>Children</strong> — ${html(palmistry.childrenCount)}</p>
        <p><strong>Travel Lines</strong> — ${html(palmistry.travelDetails)}</p>
        <p><strong>Stress Lines</strong> — ${html(palmistry.stressLines)}</p>

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
function escapeHtml(s="") {
  return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
