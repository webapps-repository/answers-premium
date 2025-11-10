// /api/spiritual-report.js
import { formidable } from "formidable";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const config = { api: { bodyParser: false } };

// === Numerology helper (Pythagorean method) ===
function calcPythagoreanValue(str) {
  const table = {
    A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
    J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
    S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8,
  };
  return str
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .reduce((sum, ch) => sum + (table[ch] || 0), 0);
}
function reduceToSingleDigit(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = n.toString().split("").reduce((a, b) => a + Number(b), 0);
  }
  return n;
}
function calcLifePath(birthdate) {
  const digits = birthdate.replace(/[^0-9]/g, "");
  const sum = digits.split("").reduce((a, b) => a + Number(b), 0);
  return reduceToSingleDigit(sum);
}
function calcExpression(name) {
  return reduceToSingleDigit(calcPythagoreanValue(name));
}
function calcSoulUrge(name) {
  const vowels = name.match(/[AEIOU]/gi) || [];
  const value = vowels.reduce((sum, ch) => sum + calcPythagoreanValue(ch), 0);
  return reduceToSingleDigit(value);
}
function calcPersonality(name) {
  const consonants = name.match(/[^AEIOU\s]/gi) || [];
  const value = consonants.reduce((sum, ch) => sum + calcPythagoreanValue(ch), 0);
  return reduceToSingleDigit(value);
}
function calcMaturity(life, expr) {
  return reduceToSingleDigit(life + expr);
}

export default async function handler(req, res) {
  // --- CORS Headers ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  // === Parse Form Data ===
  const form = formidable({ multiples: false, keepExtensions: true });
  form.parse(req, async (err, fields) => {
    if (err) return res.status(500).json({ success: false, error: "Form parsing failed" });

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
    if (!verification.success)
      return res.status(403).json({ success: false, error: "reCAPTCHA verification failed" });

    // === Extract User Data ===
    const userData = {
      fullName: fields.name,
      email: fields.email,
      birthdate: fields.birthdate,
      birthTime: fields.birthtime || "Unknown",
      birthPlace: `${fields.birthcity}, ${fields.birthstate}, ${fields.birthcountry}`,
      question: fields.question || "No question provided.",
      submittedAt: new Date().toISOString(),
    };

    // === Deterministic numerology ===
    const lifePath = calcLifePath(userData.birthdate);
    const expression = calcExpression(userData.fullName);
    const soulUrge = calcSoulUrge(userData.fullName);
    const personality = calcPersonality(userData.fullName);
    const maturity = calcMaturity(lifePath, expression);
    const numValues = { lifePath, expression, personality, soulUrge, maturity };

    // === OpenAI Prompt ===
    const prompt = `
You are a professional spiritual advisor using Western astrology and Pythagorean numerology.
Interpret each section concisely in ~100 words each, tailored to the user's question.
Provide the response as strict JSON in this structure:

{
  "answer": "Short summary answering the user's question based on combined insights.",
  "astrology": "Short paragraph, Western astrology interpretation relevant to the question.",
  "numerology": "Intro paragraph relevant to the question, followed by 5 sections explaining each number meaning.",
  "palmistry": "Short paragraph relevant to question, covering life path, heart, fate, relationships, children, travel.",
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
    "Fingers": "...",
    "Mounts": "...",
    "Marriage/Relationships": "...",
    "Children": "...",
    "Travel Lines": "..."
  }
}

Use these data for accuracy:
Name: ${userData.fullName}
DOB: ${userData.birthdate}
Time: ${userData.birthTime}
Place: ${userData.birthPlace}
Question: ${userData.question}
Numerology (Pythagorean): ${JSON.stringify(numValues)}
System: Western Astrology
`;

    let json = {};
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: "You are an expert Western astrologer, Pythagorean numerologist, and palm reader." },
                   { role: "user", content: prompt }],
      });
      const txt = completion.choices[0]?.message?.content || "{}";
      json = JSON.parse(txt);
    } catch (err) {
      console.error("❌ OpenAI generation error:", err);
    }

    // === Prepare PDF ===
    const pdfBuffer = await generatePdfBuffer({
      fullName: userData.fullName,
      birthdate: userData.birthdate,
      birthTime: userData.birthTime,
      birthPlace: userData.birthPlace,
      question: userData.question,
      answer: json.answer,
      astrology: json.astrology,
      numerology: json.numerology,
      palmistry: json.palmistry,
      astroDetails: json.astroDetails,
      numDetails: { ...json.numDetails, _values: numValues },
      palmDetails: json.palmDetails,
    });

    // === Send Email ===
    await sendEmailWithAttachment({
      to: userData.email,
      subject: "Your Full Spiritual Report (Western Astrology + Pythagorean Numerology)",
      html: `<p>Hello ${userData.fullName},</p>
             <p>Your personalized report is attached.</p>`,
      buffer: pdfBuffer,
      filename: "Spiritual_Report.pdf",
    });

    return res.status(200).json({
      success: true,
      message: "Report generated successfully.",
      answer: json.answer,
      astrologySummary: json.astrology,
      numerologySummary: json.numerology,
      palmSummary: json.palmistry,
    });
  });
}
