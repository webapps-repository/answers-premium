// /api/spiritual-report.js
// Personal vs Non-personal report flow + email + PDF + recaptcha + CORS
import { formidable } from "formidable";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

// debug classifier OpenAI call
console.time("Classifier");
console.timeEnd("Classifier");
console.log("🧠 Classifier result:", classification);

// ---------- OpenAI client (optional; code gracefully degrades if key missing)
const openai =
  process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export const config = {
  api: { bodyParser: false },
};

// ------------ Helpers ------------
function safeStr(x, fallback = "") {
  if (x == null) return fallback;
  if (Array.isArray(x)) return String(x[0] ?? fallback);
  return String(x);
}

// dd-mm-yyyy  ->  ISO (yyyy-mm-dd)
function toIsoFromDDMMYYYY(d) {
  if (!d) return "";
  if (typeof d !== "string") return "";
  const parts = d.split("-").map((p) => p.trim());
  if (parts.length !== 3) return d; // already some other format; pass through
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy) return d;
  return `${yyyy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function epochIso() {
  return new Date().toISOString();
}

// Simple fallback classifier (used if OpenAI key missing or call fails)
function fallbackClassify(question) {
  const q = (question || "").toLowerCase();
  const personalHints = [
    "my career", "my relationship", "my health", "should i", "will i", "for me",
    "born", "birth", "date of birth", "palm", "astrology", "numerology", "zodiac",
  ];
  const hit = personalHints.some((k) => q.includes(k));
  return { type: hit ? "personal" : "technical", confidence: 0.55, source: "fallback" };
}

async function classifyQuestion(question) {
  if (!openai) return fallbackClassify(question);

  try {
    const prompt = `
Classify the user's question strictly as JSON with keys:
{ "type": "personal" | "technical", "confidence": number (0..1) }.

"personal": questions seeking guidance about the individual (life, love, career, health, spiritual) where personal data helps.
"technical": non-personal (math, finance, science, code, environment, troubleshooting, economics, etc.).

Question: """${question || ""}"""
Return JSON only.`;
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.0,
    });
    const raw = r.choices?.[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.type === "personal" || parsed.type === "technical")) {
      return { type: parsed.type, confidence: Number(parsed.confidence ?? 0.5), source: "openai" };
    }
    return fallbackClassify(question);
  } catch {
    return fallbackClassify(question);
  }
}

// ---------- Numerology (local, Pythagorean) ----------
const P_MAP = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
  J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
  S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8
};
function reduceNum(n) {
  // keep master numbers 11, 22, 33
  const keepMaster = (x) => x === 11 || x === 22 || x === 33;
  while (n > 9 && !keepMaster(n)) {
    n = String(n).split("").reduce((s, d) => s + (+d || 0), 0);
  }
  return n;
}
function onlyLetters(s) { return (s || "").toUpperCase().replace(/[^A-Z]/g, ""); }
function onlyVowels(s)  { return (s || "").toUpperCase().replace(/[^AEIOUY]/g, ""); }
function onlyConsonants(s){ return (s || "").toUpperCase().replace(/[^A-Z]|[AEIOUY]/g, ""); }

function lifePathFromISO(isoDate) {
  // isoDate: yyyy-mm-dd
  const digits = (isoDate || "").replace(/\D/g, "");
  const sum = digits.split("").reduce((a, d) => a + (+d || 0), 0);
  return reduceNum(sum);
}
function nameSum(nameStr) {
  const letters = onlyLetters(nameStr);
  const sum = letters.split("").reduce((s, ch) => s + (P_MAP[ch] || 0), 0);
  return reduceNum(sum);
}
function soulUrge(nameStr) {
  const letters = onlyVowels(nameStr);
  const sum = letters.split("").reduce((s, ch) => s + (P_MAP[ch] || 0), 0);
  return reduceNum(sum);
}
function personalityNum(nameStr) {
  const letters = onlyConsonants(nameStr);
  const sum = letters.split("").reduce((s, ch) => s + (P_MAP[ch] || 0), 0);
  return reduceNum(sum);
}
function maturityNumber(lifePath, expression) {
  return reduceNum(Number(lifePath || 0) + Number(expression || 0));
}

// ---------- OpenAI content helpers ----------
async function aiJson(openaiClient, sys, user, fallback = {}) {
  if (!openaiClient) return fallback;
  try {
    const r = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      temperature: 0.4,
    });
    const txt = r.choices?.[0]?.message?.content?.trim() || "{}";
    return JSON.parse(txt);
  } catch {
    return fallback;
  }
}

async function aiText(openaiClient, sys, user, fallback = "") {
  if (!openaiClient) return fallback;
  try {
    const r = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      temperature: 0.6,
    });
    return r.choices?.[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

// ---------- Handler ----------
export default async function handler(req, res) {
  // CORS (Shopify embed + cross-origin)
  res.setHeader("Access-Control-Allow-Origin", "*"); // lock to your domain later
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

    // ------- reCAPTCHA v2 verify -------
    const token = safeStr(fields["g-recaptcha-response"]);
    try {
      const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET_KEY || "",
          response: token || "",
        }),
      });
      const verification = await verifyRes.json();
      if (!verification.success) {
        console.error("❌ reCAPTCHA failed:", verification);
        return res.status(403).json({ success: false, error: "reCAPTCHA verification failed", details: verification });
      }
    } catch (e) {
      console.error("❌ reCAPTCHA error:", e);
      return res.status(500).json({ success: false, error: "reCAPTCHA error" });
    }

    // ------- Extract inputs -------
    const question = safeStr(fields.question, "").trim();
    const email    = safeStr(fields.email, "").trim();
    const fullName = safeStr(fields.name, "").trim();

    // Dates in dd-mm-yyyy from the form:
    const birthdateDDMMYYYY = safeStr(fields.birthdate, "");
    const birthdateISO      = toIsoFromDDMMYYYY(birthdateDDMMYYYY);
    const birthTime         = safeStr(fields.birthtime, "Unknown");
    const birthPlace        = `${safeStr(fields.birthcity)}${fields.birthstate ? ", " + safeStr(fields.birthstate) : ""}${fields.birthcountry ? ", " + safeStr(fields.birthcountry) : ""}`.trim().replace(/^, /,"");

    // ------- Classify -------
    const classification = await classifyQuestion(question);
    const isPersonal = classification.type === "personal";

    // ------- Build content -------
    let answer = "";
    let astrologySummary = "";
    let numerologySummary = "";
    let palmistrySummary = "";

    // Numerology (local — Pythagorean) if we have personal data
    let numerologyNumbers = null;
    if (isPersonal) {
      const lp = lifePathFromISO(birthdateISO);
      const expr = nameSum(fullName);
      const pers = personalityNum(fullName);
      const soul = soulUrge(fullName);
      const mat  = maturityNumber(lp, expr);
      numerologyNumbers = {
        lifePath: lp,
        expression: expr,
        personality: pers,
        soulUrge: soul,
        maturity: mat,
      };
    }

    if (isPersonal) {
      // PERSONAL: get JSON with short summaries tailored to the question
      const pJson = await aiJson(
        openai,
        "Return valid JSON only.",
        `Create short paragraph summaries (no tables) relevant to the user's question.
Return as:
{
  "answer": "concise answer (<=120 words)",
  "astrologySummary": "short paragraph",
  "numerologySummary": "short paragraph",
  "palmistrySummary": "short paragraph"
}

User:
Name: ${fullName}
DOB (ISO): ${birthdateISO || "(unknown)"}
Time: ${birthTime}
Place: ${birthPlace}
Question: ${question}
Submission: ${epochIso()}
Numerology (Pythagorean local):
- Life Path: ${numerologyNumbers?.lifePath ?? "-"}
- Expression: ${numerologyNumbers?.expression ?? "-"}
- Personality: ${numerologyNumbers?.personality ?? "-"}
- Soul Urge: ${numerologyNumbers?.soulUrge ?? "-"}
- Maturity: ${numerologyNumbers?.maturity ?? "-"}`,
        {}
      );

      answer = pJson.answer || "We’ve generated your personal insights.";
      astrologySummary  = pJson.astrologySummary  || "Astrology summary is unavailable.";
      numerologySummary = pJson.numerologySummary || "Numerology summary is unavailable.";
      palmistrySummary  = pJson.palmistrySummary  || "Palmistry summary is unavailable.";
    } else {
      // TECHNICAL / NON-PERSONAL
      const tJson = await aiJson(
        openai,
        "Return valid JSON only.",
        `Create a concise technical one-page style summary for the user's question. Include:
{
  "answer": "2-3 sentences answering directly",
  "keyPoints": ["bullet 1","bullet 2","bullet 3"],
  "notes": "optional short note"
}
Question: """${question}"""`,
        {}
      );
      answer = tJson.answer || "Here is a concise answer to your question.";
      astrologySummary = ""; // not used in technical
      numerologySummary = ""; // not used in technical
      palmistrySummary = ""; // not used in technical

      // tuck these for the PDF generator in a simple bundle
      numerologyNumbers = {
        technicalKeyPoints: Array.isArray(tJson.keyPoints) ? tJson.keyPoints : [],
        technicalNotes: tJson.notes || "",
      };
    }

    // ------- Generate PDF -------
    const pdfBuffer = await generatePdfBuffer({
      headerBrand: "Melodies Web",        // header brand (top of PDF)
      title: "Your Answer",                // report title
      mode: isPersonal ? "personal" : "technical",

      // Common
      question,
      answer,

      // Personal info (used only when mode === 'personal')
      fullName,
      birthdate: birthdateDDMMYYYY, // keep as submitted
      birthTime,
      birthPlace,

      // Summaries
      astrologySummary,
      numerologySummary,
      palmistrySummary,

      // Numerology pack (personal: numbers; technical: key points/notes)
      numerologyPack: numerologyNumbers
    });

    // ------- Email (both types) -------
    const emailHtml = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#222;max-width:720px;margin:auto;line-height:1.6">
        <h2 style="margin:0 0 8px 0;text-align:center">${"Melodies Web"}</h2>
        <h3 style="margin:0 0 16px 0;text-align:center">Your Answer</h3>
        <div style="background:#f6f7fb;border-radius:10px;padding:12px 16px;margin-bottom:14px">
          <p style="margin:4px 0"><strong>Question:</strong> ${question || "—"}</p>
          ${isPersonal ? `
            <p style="margin:4px 0"><strong>Name:</strong> ${fullName || "—"}</p>
            <p style="margin:4px 0"><strong>Date of Birth:</strong> ${birthdateDDMMYYYY || "—"}</p>
            <p style="margin:4px 0"><strong>Time:</strong> ${birthTime || "Unknown"}</p>
            <p style="margin:4px 0"><strong>Place:</strong> ${birthPlace || "—"}</p>
          ` : ``}
        </div>
        <h4 style="margin:10px 0 6px 0">Answer</h4>
        <p style="margin:0 0 10px 0">${answer}</p>
        <p style="margin:14px 0 0 0;font-size:13px;color:#555">A detailed PDF is attached.</p>
      </div>
    `;

    if (email) {
      await sendEmailWithAttachment({
        to: email,
        subject: "Your Answer",
        html: emailHtml,
        buffer: pdfBuffer,
        filename: "Your_Answer.pdf",
      });
    }

    // ------- Frontend response (show summary + trigger "Get Free Report" modal) -------
    return res.status(200).json({
      success: true,
      type: isPersonal ? "personal" : "technical",
      message: "Report generated successfully.",
      answer,
      astrologySummary,
      numerologySummary,
      palmSummary: palmistrySummary,
      // tell frontend to show the modal (wording handled in Liquid):
      offerDetailed: true,
      offerLabel: "Get Free Report (no payment needed)",
    });
  });
}
