// /api/utils/generate-insights.js
// Unified personal + technical insights generator
// - Personal: AstrologyAPI (+fallback), extended numerology, palmistry, triad AI
// - Technical: GPT-4.1 with finance + coding bias

import OpenAI from "openai";
import { synthesizeTriad } from "./synthesize-triad.js";

const openai =
  process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// =======================================================
// NUMEROLOGY HELPERS
// =======================================================

// Pythagorean letter → number map
const letterMap = {
  A: 1, J: 1, S: 1,
  B: 2, K: 2, T: 2,
  C: 3, L: 3, U: 3,
  D: 4, M: 4, V: 4,
  E: 5, N: 5, W: 5,
  F: 6, O: 6, X: 6,
  G: 7, P: 7, Y: 7,
  H: 8, Q: 8, Z: 8,
  I: 9, R: 9
};

const vowels = new Set(["A", "E", "I", "O", "U", "Y"]);

function reduceNum(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = n
      .toString()
      .split("")
      .reduce((a, b) => a + Number(b), 0);
  }
  return n;
}

function calculateLifePath(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const digits = dateStr.replace(/\D/g, "").split("").map(Number);
  if (!digits.length) return null;
  let sum = digits.reduce((a, b) => a + b, 0);
  return reduceNum(sum);
}

function nameToDigits(fullName = "") {
  const clean = fullName.toUpperCase().replace(/[^A-Z]/g, "");
  const nums = [];
  for (const ch of clean) {
    const v = letterMap[ch];
    if (v) nums.push(v);
  }
  return nums;
}

function calculateExpression(fullName) {
  const nums = nameToDigits(fullName);
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return reduceNum(sum);
}

function calculateSoulUrge(fullName) {
  const clean = fullName.toUpperCase().replace(/[^A-Z]/g, "");
  const nums = [];
  for (const ch of clean) {
    if (vowels.has(ch)) {
      const v = letterMap[ch];
      if (v) nums.push(v);
    }
  }
  if (!nums.length) return null;
  return reduceNum(nums.reduce((a, b) => a + b, 0));
}

function calculatePersonality(fullName) {
  const clean = fullName.toUpperCase().replace(/[^A-Z]/g, "");
  const nums = [];
  for (const ch of clean) {
    if (!vowels.has(ch)) {
      const v = letterMap[ch];
      if (v) nums.push(v);
    }
  }
  if (!nums.length) return null;
  return reduceNum(nums.reduce((a, b) => a + b, 0));
}

function calculateMaturity(lifePath, expression) {
  if (!lifePath || !expression) return null;
  return reduceNum(lifePath + expression);
}

function calculateHiddenPassion(fullName) {
  const nums = nameToDigits(fullName);
  if (!nums.length) return null;
  const freq = {};
  for (const n of nums) freq[n] = (freq[n] || 0) + 1;
  let best = null;
  let bestCount = 0;
  for (const n of Object.keys(freq)) {
    const count = freq[n];
    if (count > bestCount) {
      bestCount = count;
      best = Number(n);
    }
  }
  return best;
}

function calculateKarmicLessons(fullName) {
  const nums = nameToDigits(fullName);
  if (!nums.length) return [];
  const present = new Set(nums);
  const missing = [];
  for (let i = 1; i <= 9; i++) {
    if (!present.has(i)) missing.push(i);
  }
  return missing;
}

function calculatePersonalYearMonthDay(birthDateStr) {
  if (!birthDateStr) return { personalYear: null, personalMonth: null, personalDay: null };

  const dob = new Date(birthDateStr);
  if (isNaN(dob.getTime())) {
    return { personalYear: null, personalMonth: null, personalDay: null };
  }

  const now = new Date();

  const yearSum = dob.getDate() + (dob.getMonth() + 1) + now.getFullYear();
  const personalYear = reduceNum(yearSum);

  const monthSum = personalYear + (now.getMonth() + 1);
  const personalMonth = reduceNum(monthSum);

  const daySum = personalMonth + now.getDate();
  const personalDay = reduceNum(daySum);

  return { personalYear, personalMonth, personalDay };
}

const lifePathMeanings = {
  1: "Leadership, independence, originality.",
  2: "Partnership, intuition, sensitivity.",
  3: "Creativity, joy, communication.",
  4: "Stability, discipline, structure.",
  5: "Change, adventure, freedom.",
  6: "Nurturing, harmony, responsibility.",
  7: "Spirituality, introspection, wisdom.",
  8: "Success, power, manifestation.",
  9: "Completion, compassion, purpose.",
  11: "Spiritual awakening, intuition.",
  22: "Master builder, major achievements."
};

// =======================================================
// ASTROLOGY (AstrologyAPI + fallback)
// =======================================================

const ASTRO_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes
const astroCache = new Map(); // key → { data, expiresAt }

function approxTimezoneFromLon(lon) {
  if (!lon && lon !== 0) return 0;
  const tz = Math.round(Number(lon) / 15);
  return Math.max(-12, Math.min(14, tz));
}

async function fetchAstrologyProfile({ birthDate, birthTime, birthPlace }) {
  try {
    const userId = process.env.ASTRO_USER_ID;
    const apiKey = process.env.ASTRO_API_KEY;

    // If config missing or data missing → fallback
    if (!userId || !apiKey || !birthDate || !birthTime || !birthPlace) {
      return computeAstrologyFallback();
    }

    const cacheKey = `${birthDate}|${birthTime}|${birthPlace}`;
    const cached = astroCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // 1) Geocode using OpenStreetMap
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        birthPlace
      )}`,
      {
        headers: {
          "User-Agent": "melodies-web/1.0 (contact: support@hazcam.io)"
        }
      }
    );
    const geoJson = await geoRes.json();
    if (!Array.isArray(geoJson) || geoJson.length === 0) {
      return computeAstrologyFallback();
    }

    const { lat, lon } = geoJson[0];
    const tzone = approxTimezoneFromLon(lon);

    // AstrologyAPI Basic natal chart (example endpoint, adjust if needed)
    const auth = Buffer.from(`${userId}:${apiKey}`).toString("base64");

    const [year, month, day] = birthDate.split("-").map((x) => Number(x));
    const [hour, minute] = birthTime.split(":").map((x) => Number(x));

    const astroRes = await fetch("https://json.astrologyapi.com/v1/chart/natal", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        day,
        month,
        year,
        hour,
        min: minute || 0,
        lat,
        lon,
        tzone
      })
    });

    if (!astroRes.ok) {
      console.error("AstrologyAPI error status:", astroRes.status);
      return computeAstrologyFallback();
    }

    const astroJson = await astroRes.json();

    // Map to structure we actually use
    const profile = {
      sun: astroJson?.sun?.sign || "Unknown",
      moon: astroJson?.moon?.sign || "Unknown",
      rising: astroJson?.ascendant || "Unknown",
      planets: astroJson?.planets || [],
      houses: astroJson?.houses || [],
      aspects: astroJson?.aspects || [],
      transit1: "Key transits derived from your natal chart.",
      transit2: "Timing windows related to your current question."
    };

    astroCache.set(cacheKey, {
      data: profile,
      expiresAt: now + ASTRO_CACHE_TTL_MS
    });

    return profile;
  } catch (err) {
    console.error("Astrology profile fetch failed:", err);
    return computeAstrologyFallback();
  }
}

function computeAstrologyFallback() {
  return {
    sun: "Aries",
    moon: "Leo",
    rising: "Sagittarius",
    planets: [],
    houses: [],
    aspects: [],
    transit1: "Sun trine Jupiter (symbolic supportive transit).",
    transit2: "Moon conjunct Venus (symbolic emotional & relational focus)."
  };
}

// =======================================================
// TECHNICAL MODE (finance + coding biased GPT-4.1)
// =======================================================

async function generateTechnicalInsightsLLM(question) {
  // If no LLM, fallback to structured but generic answer
  if (!openai) {
    return {
      ok: true,
      mode: "technical",
      question,
      shortAnswer: `Here is your technical / financial answer based on structured reasoning for: "${question}"`,
      keyPoints: [
        "OpenAI is not configured, so a generic structured answer is provided.",
        "Upload files or logs for deeper analysis once the AI key is active.",
        "A PDF can be generated via the 'Get full report' button."
      ],
      explanation: `
Your technical or financial question: "${question}"
has been processed without external AI. Once the AI key is active, 
this explanation will become more detailed and context-aware.
      `,
      recommendations: `
• Include more context: datasets, log snippets, or exact error messages.
• For finance questions, provide time horizon, risk tolerance, and constraints.
• For coding questions, include language, framework, and minimal reproducible code.
      `
    };
  }

  try {
    const prompt = `
You are a senior engineer AND a CFA-level financial analyst.

User question:
"${question}"

Return ONLY JSON (no markdown) in this exact shape:

{
  "shortAnswer": "2–3 sentence direct answer to the question.",
  "keyPoints": [
    "Bullet 1 focused on the core issue.",
    "Bullet 2 with financial or coding insight.",
    "Bullet 3 with risk, edge cases, or assumptions."
  ],
  "explanation": "4–8 paragraph explanation, weaving together technical and/or financial reasoning, in plain language.",
  "recommendations": "3–6 actionable next steps, in paragraph form or light bullets."
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a hybrid expert in software engineering and applied finance. You answer precisely, concisely, and honestly."
        },
        { role: "user", content: prompt }
      ]
    });

    const parsed = completion.choices[0].message.parsed;

    return {
      ok: true,
      mode: "technical",
      question,
      shortAnswer: parsed.shortAnswer,
      keyPoints: parsed.keyPoints || [],
      explanation: parsed.explanation || "",
      recommendations: parsed.recommendations || ""
    };
  } catch (err) {
    console.error("Technical LLM error:", err);
    // Fallback
    return {
      ok: true,
      mode: "technical",
      question,
      shortAnswer: `Here is the core answer to your technical / financial question: "${question}".`,
      keyPoints: [
        "This explanation is generated via a fallback path.",
        "Once the AI stabilises, it will include more detail and nuance.",
        "You can still generate a PDF for a structured write-up."
      ],
      explanation: `
Your technical / financial question: "${question}" was processed,
but the AI back-end encountered an error. A simplified answer is provided instead.
      `,
      recommendations: `
• Try rephrasing or simplifying the question.
• Include concrete numbers or code fragments if applicable.
      `
    };
  }
}

// =======================================================
// MAIN EXPORT
// =======================================================

export async function generateInsights({
  question,
  isPersonal,
  fullName,
  birthDate,
  birthTime,
  birthPlace,
  classify,
  palmistryData,
  technicalMode
}) {
  try {
    // ------------------------------------
    // TECHNICAL MODE
    // ------------------------------------
    if (technicalMode) {
      return await generateTechnicalInsightsLLM(question);
    }

    // ------------------------------------
    // PERSONAL MODE
    // ------------------------------------
    // Numerology master suite (simplified)
    let numerology = null;
    if (birthDate || fullName) {
      const lifePath = calculateLifePath(birthDate);
      const expression = calculateExpression(fullName);
      const soulUrge = calculateSoulUrge(fullName);
      const personality = calculatePersonality(fullName);
      const maturity = calculateMaturity(lifePath, expression);
      const hiddenPassion = calculateHiddenPassion(fullName);
      const karmicLessons = calculateKarmicLessons(fullName);
      const { personalYear, personalMonth, personalDay } =
        calculatePersonalYearMonthDay(birthDate);

      numerology = {
        lifePath,
        lifePathMeaning: lifePathMeanings[lifePath] || "",
        expressionNumber: expression,
        soulUrgeNumber: soulUrge,
        personalityNumber: personality,
        maturityNumber: maturity,
        hiddenPassionNumber: hiddenPassion,
        karmicLessons,
        personalYear,
        personalMonth,
        personalDay,
        personalMonthRange:
          personalMonth != null ? `${personalMonth}-${personalMonth + 2}` : ""
      };
    }

    // Astrology (AstrologyAPI + fallback)
    const astrology = await fetchAstrologyProfile({
      birthDate,
      birthTime,
      birthPlace
    });

    // Triad AI synthesis
    const triad = await synthesizeTriad({
      question,
      intent: classify.intent || "general",
      astrology,
      numerology,
      palmistry: palmistryData
    });

    return {
      ok: true,
      mode: "personal",
      question,
      shortAnswer: triad.shortAnswer,
      astrology,
      numerology,
      palmistry: palmistryData,
      interpretations: {
        astrology: triad.astroInterpretation,
        numerology: triad.numerologyInterpretation,
        palmistry: triad.palmInterpretation,
        combined: triad.combined,
        timeline: triad.timeline,
        recommendations: triad.recommendations
      }
    };
  } catch (err) {
    console.error("INSIGHTS ERROR:", err);
    return {
      ok: false,
      error: err.message
    };
  }
}
