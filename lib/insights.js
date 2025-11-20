// /lib/insights.js
// Unified engine for PERSONAL + TECHNICAL insights
// Works with new ai.js, engines.js, utils.js, pdf.js

import { classifyQuestion } from "./ai.js";
import { runPalmVision } from "./engines.js";
import { sanitizeText, safeDate, safeString } from "./utils.js";
import { synthesizeTriad } from "./triad.js";

// Simple numerology core (upgraded later)
function reduceNum(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = n.toString().split("").reduce((a, b) => a + Number(b), 0);
  }
  return n;
}

function calcLifePath(dateStr) {
  if (!dateStr) return null;
  const digits = dateStr.replace(/\D/g, "").split("").map(Number);
  const sum = digits.reduce((a, b) => a + b, 0);
  return reduceNum(sum);
}

function calcPersonalYear(dateStr) {
  if (!dateStr) return null;
  const d = safeDate(dateStr);
  const now = new Date();
  return reduceNum(d.getDate() + (d.getMonth() + 1) + now.getFullYear());
}

function calcPersonalMonth(dateStr) {
  if (!dateStr) return null;
  const d = safeDate(dateStr);
  const now = new Date();
  return reduceNum((d.getMonth() + 1) + (now.getMonth() + 1));
}

// Default numerology meanings (upgraded later)
const numerologyMeaning = {
  1: "Leadership, action, independence.",
  2: "Diplomacy, harmony, relationships.",
  3: "Creativity, communication, expression.",
  4: "Stability, structure, discipline.",
  5: "Change, adventure, freedom.",
  6: "Responsibility, love, family.",
  7: "Spirituality, analysis, introspection.",
  8: "Power, success, manifestation.",
  9: "Compassion, completion, purpose.",
  11: "Intuition, spiritual insight.",
  22: "Master builder, large-scale destiny."
};

// ---------------------------------------------------------------
// MAIN EXPORT
// ---------------------------------------------------------------
export async function generateInsights({
  question,
  isPersonal,
  fullName,
  birthDate,
  birthTime,
  birthPlace,
  classify,
  palmistryData,
  technicalMode,
  techFilePath
}) {
  try {
    const cleanQ = sanitizeText(question);

    // ==========================================================
    // 1 — TECHNICAL MODE (simple version, upgraded later)
    // ==========================================================
    if (technicalMode === true) {
      return {
        ok: true,
        mode: "technical",
        shortAnswer: `Here’s your technical answer:\n${cleanQ}`,
        keyPoints: [
          "Structured reasoning applied.",
          "Includes logic + finance + coding intelligence.",
          "Full report available as PDF."
        ],
        explanation: `Your technical query:\n"${cleanQ}"\nwas processed using the hybrid engine.`,
        recommendations: `• You can upload a file or diagram for deeper analysis.\n• Click “Get Full PDF Report” to receive the structured version.`
      };
    }

    // ==========================================================
    // 2 — PERSONAL MODE (Palm + Numerology + Triad)
    // ==========================================================

    // Palmistry
    const palm = palmistryData || await runPalmVision(null);

    // Numerology
    const lifePath = calcLifePath(birthDate);
    const personalYear = calcPersonalYear(birthDate);
    const personalMonth = calcPersonalMonth(birthDate);

    const numerology = birthDate
      ? {
          lifePath,
          lifePathMeaning: numerologyMeaning[lifePath] || "",
          personalYear,
          personalYearMeaning: numerologyMeaning[personalYear] || "",
          personalMonth,
          personalMonthRange: `${personalMonth}-${personalMonth + 2}`
        }
      : null;

    // Astrology (TEMP MOCK — real upgrade coming next stage)
    const astrology = {
      sun: "Aries",
      moon: "Leo",
      rising: "Sagittarius",
      transit1: "Sun trine Jupiter",
      transit2: "Moon conjunct Venus"
    };

    const triad = synthesizeTriad({
      question: cleanQ,
      intent: classify?.intent || "general",
      astrology,
      numerology,
      palmistry: palm
    });

    return {
      ok: true,
      mode: "personal",
      question: cleanQ,
      shortAnswer: triad.shortAnswer,
      astrology,
      numerology,
      palmistry: palm,
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
    return { ok: false, error: err.message || "Insight failure" };
  }
}
