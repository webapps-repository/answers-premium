// /api/utils/generate-insights.js
// Unified PERSONAL + TECHNICAL insights generator
// - Personal mode: spiritual triad (astro + numerology + palmistry) + GPT-4.1
// - Technical mode: finance + coding specialist answer

import OpenAI from "openai";
import { synthesizeTriad } from "./synthesize-triad.js";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ------------------------------------------------------
// Numerology helpers
// ------------------------------------------------------
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
  if (typeof dateStr !== "string" || !dateStr.trim()) return null;
  const digits = dateStr.replace(/\D/g, "").split("").map(Number);
  if (!digits.length) return null;
  const sum = digits.reduce((a, b) => a + b, 0);
  return reduceNum(sum);
}

function calculatePersonalYear(dob) {
  if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  const sum = dob.getDate() + (dob.getMonth() + 1) + now.getFullYear();
  return reduceNum(sum);
}

function calculatePersonalMonth(dob) {
  if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  const sum = dob.getMonth() + 1 + (now.getMonth() + 1);
  return reduceNum(sum);
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
  22: "Master builder, major life achievements."
};

// Simple mock astrology (placeholder until real AstrologyAPI wiring)
function computeAstrologyMock(birthDate, birthTime, birthPlace) {
  return {
    system: "tropical-placidus-mock",
    birthDate: birthDate || null,
    birthTime: birthTime || null,
    birthPlace: birthPlace || null,
    sun: "Aries 15°",
    moon: "Leo 3°",
    rising: "Sagittarius 21°",
    transit1: "Sun trine Jupiter",
    transit2: "Moon conjunct Venus"
  };
}

// ------------------------------------------------------
// Technical GPT engine (finance + coding)
// ------------------------------------------------------
async function generateTechnicalInsights(question) {
  // Fallback if no key: deterministic but at least non-empty
  if (!client) {
    return {
      ok: true,
      mode: "technical",
      intent: "technical",
      shortAnswer: `Technical question received: "${question}". Add an OPENAI_API_KEY to get a fully reasoned answer.`,
      keyPoints: [
        "Add OPENAI_API_KEY in Vercel env to enable AI reasoning.",
        "Then the API will return a structured explanation here.",
        "PDF reports already work; only content will upgrade."
      ],
      explanation:
        "Because no OpenAI API key is configured, the backend cannot generate a full AI explanation.",
      recommendations:
        "Configure OPENAI_API_KEY and re-deploy to unlock full technical analysis."
    };
  }

  const prompt = `
You are an expert assistant combining DEEP FINANCE + ADVANCED CODING knowledge.

User question:
"${question}"

Return JSON ONLY with this shape (no extra keys, no commentary):

{
  "short_answer": "1–3 sentences answering the question directly.",
  "key_points": ["bullet point 1", "bullet point 2", "bullet point 3"],
  "explanation": "1–3 paragraphs with detailed reasoning (math/finance/code where relevant).",
  "recommendations": "Clear next steps or suggestions for the user."
}
`;

  const resp = await client.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a precise, practical expert in finance, investing, and programming. Be concise but detailed."
      },
      { role: "user", content: prompt }
    ]
  });

  const raw = resp.choices[0]?.message?.content || "{}";
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = {};
  }

  return {
    ok: true,
    mode: "technical",
    intent: "technical",
    shortAnswer:
      data.short_answer ||
      `Here is a concise answer to your technical question: ${question}`,
    keyPoints: Array.isArray(data.key_points) ? data.key_points : [],
    explanation: data.explanation || "",
    recommendations: data.recommendations || ""
  };
}

// ------------------------------------------------------
// Personal GPT engine (spiritual triad)
// ------------------------------------------------------
async function generatePersonalInsights({
  question,
  fullName,
  birthDate,
  birthTime,
  birthPlace,
  palmistryData
}) {
  // Numerology pack
  let numerology = null;
  if (birthDate) {
    const dob = new Date(birthDate);
    const lp = calculateLifePath(birthDate);
    const py = calculatePersonalYear(dob);
    const pm = calculatePersonalMonth(dob);
    numerology = {
      lifePath: lp,
      personalYear: py,
      personalMonth: pm,
      personalMonthRange: pm ? `${pm}-${pm + 2}` : null,
      lifePathMeaning: lp ? lifePathMeanings[lp] || "" : "",
      personalYearMeaning: py ? lifePathMeanings[py] || "" : ""
    };
  }

  const astrology = computeAstrologyMock(birthDate, birthTime, birthPlace);
  const palmistry = palmistryData || null;

  // Fallback path (no GPT) → deterministic triad
  if (!client) {
    const triad = synthesizeTriad({
      question,
      intent: "general",
      astrology,
      numerology,
      palmistry
    });

    return {
      ok: true,
      mode: "personal",
      intent: "general",
      question,
      shortAnswer: triad.shortAnswer,
      astrology,
      numerology,
      palmistry,
      interpretations: {
        astrology: triad.astroInterpretation,
        numerology: triad.numerologyInterpretation,
        palmistry: triad.palmInterpretation,
        combined: triad.combined,
        timeline: triad.timeline,
        recommendations: triad.recommendations
      }
    };
  }

  const prompt = `
You are a premium magazine-style spiritual advisor.
Use three systems TOGETHER: astrology, numerology, and palmistry.

User question:
"${question}"

User data (JSON):
${JSON.stringify(
  {
    fullName,
    birthDate,
    birthTime,
    birthPlace,
    astrology,
    numerology,
    palmistry
  },
  null,
  2
)}

Write a realistic, caring answer. Avoid superstition clichés.
Return JSON ONLY:

{
  "short_answer": "Direct 2–4 sentence answer to the question.",
  "astrology_summary": "Astrological interpretation in 1–3 paragraphs.",
  "numerology_summary": "Numerological interpretation in 1–2 paragraphs.",
  "palmistry_summary": "Palm features interpretation in 1–2 paragraphs.",
  "combined": "Synthesis of all three systems focused on the question.",
  "timeline": "Any timing windows, phases, or cycles relevant to the question.",
  "recommendations": "Practical steps, mindset shifts, or rituals."
}
`;

  const resp = await client.chat.completions.create({
    model: "gpt-4.1",
    temperature: 0.5,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an insightful but grounded spiritual advisor. You NEVER tell the user anything fatalistic or fear-based."
      },
      { role: "user", content: prompt }
    ]
  });

  const raw = resp.choices[0]?.message?.content || "{}";
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = {};
  }

  // If GPT somehow returned empty, fallback to triad
  if (!data.short_answer) {
    const triad = synthesizeTriad({
      question,
      intent: "general",
      astrology,
      numerology,
      palmistry
    });

    return {
      ok: true,
      mode: "personal",
      intent: "general",
      question,
      shortAnswer: triad.shortAnswer,
      astrology,
      numerology,
      palmistry,
      interpretations: {
        astrology: triad.astroInterpretation,
        numerology: triad.numerologyInterpretation,
        palmistry: triad.palmInterpretation,
        combined: triad.combined,
        timeline: triad.timeline,
        recommendations: triad.recommendations
      }
    };
  }

  return {
    ok: true,
    mode: "personal",
    intent: "general",
    question,
    shortAnswer: data.short_answer,
    astrology,
    numerology,
    palmistry,
    interpretations: {
      astrology: data.astrology_summary || "",
      numerology: data.numerology_summary || "",
      palmistry: data.palmistry_summary || "",
      combined: data.combined || "",
      timeline: data.timeline || "",
      recommendations: data.recommendations || ""
    }
  };
}

// ------------------------------------------------------
// PUBLIC EXPORT
// ------------------------------------------------------
export async function generateInsights({
  question,
  isPersonal,
  fullName,
  birthDate,
  birthTime,
  birthPlace,
  palmistryData,
  technicalMode
}) {
  try {
    if (technicalMode || !isPersonal) {
      return await generateTechnicalInsights(question);
    }

    return await generatePersonalInsights({
      question,
      fullName,
      birthDate,
      birthTime,
      birthPlace,
      palmistryData
    });
  } catch (err) {
    console.error("INSIGHTS ERROR:", err);
    return {
      ok: false,
      error: err.message || "Insight generation failed"
    };
  }
}
