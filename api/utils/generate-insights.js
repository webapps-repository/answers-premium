// /api/utils/generate-insights.js
// Unified personal + technical insights generator

import { synthesizeTriad } from "./synthesize-triad.js";

// --- Numerology Helpers -------------------------------------

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
  const digits = dateStr.replace(/\D/g, "").split("").map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  return reduceNum(sum);
}

function calculatePersonalYear(dob) {
  const now = new Date();
  const sum =
    dob.getDate() +
    (dob.getMonth() + 1) +
    now.getFullYear();
  return reduceNum(sum);
}

function calculatePersonalMonth(dob) {
  const now = new Date();
  const sum =
    (dob.getMonth() + 1) +
    (now.getMonth() + 1);
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

// --- Astrology Mock ------------------------------------------
function computeAstrologyMock(birthDate, birthTime, birthPlace) {
  return {
    sun: "Aries",
    moon: "Leo",
    rising: "Sagittarius",
    transit1: "Sun trine Jupiter",
    transit2: "Moon conjunct Venus"
  };
}

// --- MAIN EXPORT ----------------------------------------------
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
    // --- Technical mode ----------------------------------------
    if (technicalMode) {
      return {
        ok: true,
        mode: "technical",
        question,
        shortAnswer: `Here is your core technical answer: ${question}`,
        keyPoints: [
          "This explanation is structured and logic-driven.",
          "You can attach logs or code for deeper analysis.",
          "Technical PDF available via the full report button."
        ],
        explanation: `
Your technical question: "${question}"
was processed with structured reasoning.
        `,
        recommendations: `
• Provide more details for a deeper technical analysis.
• Attach logs or error output if relevant.
        `
      };
    }

    // --- Personal mode -----------------------------------------
    const numerology =
      birthDate
        ? (() => {
            const dob = new Date(birthDate);
            const lp = calculateLifePath(birthDate);
            const py = calculatePersonalYear(dob);
            const pm = calculatePersonalMonth(dob);
            return {
              lifePath: lp,
              personalYear: py,
              personalMonth: pm,
              personalMonthRange: `${pm}-${pm + 2}`,
              lifePathMeaning: lifePathMeanings[lp] || "",
              personalYearMeaning: lifePathMeanings[py] || ""
            };
          })()
        : null;

    const astrology = computeAstrologyMock(birthDate, birthTime, birthPlace);

    const triad = synthesizeTriad({
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
