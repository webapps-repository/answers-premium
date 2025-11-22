// /lib/insights.js — FINAL RESTORED & UPGRADED

import {
  analyzePalm,
  analyzeNumerology,
  analyzeAstrology,
  synthesizeTriad,
  generateShortAnswer
} from "./engines.js";

import { classifyQuestion } from "./ai.js";

export async function generateInsights({
  question,
  meta = {},
  enginesInput = {}
}) {
  try {
    /* ----------------------------------------------------------
       1) Classification (always runs)
    ---------------------------------------------------------- */
    const classification = await classifyQuestion(question || "");

    /* ----------------------------------------------------------
       2) Engines — run only when provided
    ---------------------------------------------------------- */
    const palm = enginesInput.palm
      ? await analyzePalm(enginesInput.palm)
      : null;

    const numerology = enginesInput.numerology
      ? await analyzeNumerology(enginesInput.numerology)
      : null;

    const astrology = enginesInput.astrology
      ? await analyzeAstrology(enginesInput.astrology)
      : null;

    /* ----------------------------------------------------------
       3) Triad synthesis (Stage 2 core)
          Combines palm + numerology + astrology + question
    ---------------------------------------------------------- */
    const triad = await synthesizeTriad({
      palm,
      numerology,
      astrology,
      question
    });

    /* ----------------------------------------------------------
       4) Short answer generation
          Uses classification + triad + engines
    ---------------------------------------------------------- */
    const shortAnswer = await generateShortAnswer(question, {
      classification,
      palm,
      numerology,
      astrology,
      triad
    });

    /* ----------------------------------------------------------
       5) Final return object
          (Stable shape — backward compatible)
    ---------------------------------------------------------- */
    return {
      ok: true,
      question,
      meta,
      classification,
      palmistry: palm,
      numerology,
      astrology,
      triad,
      shortAnswer
    };

  } catch (err) {
    console.error("generateInsights error:", err);
    return { ok: false, error: err.message };
  }
}
