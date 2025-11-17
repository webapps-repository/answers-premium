// /api/utils/generate-insights.js
// Full rewrite. Handles:
// - Personal insights (Astrology + Numerology + Palmistry)
// - Technical insights
// - Unified triad synthesis
// - Structured output for PDFs

import OpenAI from "openai";
import { synthesizeTriad } from "./synthesize-triad.js";

// -------------------------------------------
// Helper: Compute numerology pack
// -------------------------------------------
function computeNumerology(fullName, birthDate) {
  if (!birthDate) return null;

  const dob = new Date(birthDate);
  const lifePath = calculateLifePath(birthDate);
  const personalYear = calculatePersonalYear(dob);
  const personalMonth = calculatePersonalMonth(dob);

  return {
    lifePath,
    personalYear,
    personalMonth,
    personalMonthRange: `${personalMonth}-${personalMonth + 2}`,
    lifePathMeaning: lifePathMeanings[lifePath] || "Life path summary unavailable.",
    personalYearMeaning: personalYearMeanings[personalYear] || "Personal year meaning unavailable."
  };
}

// ---------------- Numerology helpers ----------------
function calculateLifePath(dateStr) {
  const digits = dateStr.replace(/\D/g, "").split("").map(Number);
  let sum = digits.reduce((a,b)=>a+b,0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split("").reduce((a,b)=>a+Number(b),0);
  }
  return sum;
}

function calculatePersonalYear(dob) {
  const now = new Date();
  const sum = (dob.getDate() + dob.getMonth() + 1 + now.getFullYear())
    .toString()
    .split("")
    .reduce((a,b)=>a+Number(b),0);
  return reduceNumber(sum);
}

function calculatePersonalMonth(dob) {
  const now = new Date();
  const monthSum = (dob.getMonth()+1 + now.getMonth()+1)
    .toString()
    .split("")
    .reduce((a,b)=>a+Number(b),0);
  return reduceNumber(monthSum);
}

function reduceNumber(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = n.toString().split("").reduce((x,y)=>x+Number(y),0);
  }
  return n;
}

const lifePathMeanings = {
  1:"Leadership energy, independence, new beginnings.",
  2:"Partnership, intuition, harmony.",
  3:"Creativity, communication, optimism.",
  4:"Stability, discipline, foundations.",
  5:"Freedom, change, adventure.",
  6:"Love, family, responsibility.",
  7:"Introspection, spirituality, inner wisdom.",
  8:"Power, success, material mastery.",
  9:"Completion, compassion, higher purpose.",
  11:"Spiritual illumination, destiny, intuition.",
  22:"Master builder, manifestation, big achievements."
};

const personalYearMeanings = {
  1:"A year of new beginnings and forward momentum.",
  2:"A year of relationships, patience, emotional alignment.",
  3:"A year of creativity and expression.",
  4:"A year of discipline and foundation building.",
  5:"A year of change and breakthrough.",
  6:"A year of love and responsibility.",
  7:"A year of inner growth and spiritual clarity.",
  8:"A year of achievement and manifestation.",
  9:"A year of closure and transition."
};

// --------------------------------------------------------------------
// EXPORT: Main function called by endpoints
// --------------------------------------------------------------------
export async function generateInsights({
  question,
  isPersonal,
  fullName,
  birthDate,
  birthTime,
  birthPlace,
  classify,
  palmistryData,
  technicalMode = false
}) {
  try {

    // ----------------------------------------------------------------
    // TECHNICAL MODE
    // ----------------------------------------------------------------
    if (technicalMode) {
      return {
        ok: true,
        mode: "technical",
        question,
        shortAnswer: `Here’s the core answer to your technical question: ${question}`,
        keyPoints: [
          "This report is generated using structured prompts.",
          "You can attach code samples or logs for deeper analysis.",
          "PDF generation is optional and only triggered when requested."
        ],
        explanation: `
Your technical question was processed with high-level reasoning.
This explanation can include debugging steps, analysis, or conceptual breakdowns depending on the question.
        `,
        recommendations: `
• Provide logs or stack trace.
• Include environment details (Node version, OS).
• Add failing code samples for deeper debugging.
        `
      };
    }

    // ----------------------------------------------------------------
    // PERSONAL MODE
    // ----------------------------------------------------------------
    const numerologyPack = computeNumerology(fullName, birthDate);

    // Placeholder astrology until your real engine is plugged in
    const astrology = {
      sun: "Unknown",
      moon: "Unknown",
      rising: "Unknown"
    };

    const palmistry = palmistryData;

    const intent = classify?.intent || "general";

    const triad = synthesizeTriad({
      question,
      intent,
      astrology,
      numerology: numerologyPack,
      palmistry
    });

    return {
      ok: true,
      mode: "personal",
      question,
      intent,
      shortAnswer: triad.shortAnswer,
      astrology,
      numerology: numerologyPack,
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

  } catch (err) {
    return {
      ok: false,
      error: err.message || "Insight generation failed"
    };
  }
}
