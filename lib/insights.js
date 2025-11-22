// /lib/insights.js — FINAL PRODUCTION VERSION (Stage 3 Fusion Layer)

import { classifyQuestion, runShortAnswerEngine } from "./ai.js";
import {
  analyzePalm,
  analyzeNumerology,
  analyzeAstrology,
  synthesizeTriad
} from "./engines.js";

/*
============================================================
  MAIN INSIGHTS PIPELINE
============================================================
This orchestrates the entire stack:

1. Classification (personal/technical)
2. Palmistry (if enabled)
3. Numerology (if enabled)
4. Astrology (if enabled)
5. Triad synthesis (if at least one engine produced data)
6. Short answer (final friendly text)
============================================================
*/

export async function generateInsights({
  question,
  meta = {},
  enginesInput = {}
}) {
  const q = question || "";

  try {
    /* ============================================================
       STEP 1 — Classification
    ============================================================ */
    const classification = await classifyQuestion(q);

    /* ============================================================
       STEP 2 — Run engines (only those provided in enginesInput)
    ============================================================ */
    let palm = null;
    if (enginesInput.palm) {
      try {
        palm = await analyzePalm(enginesInput.palm);
      } catch (err) {
        console.error("Palmistry engine failed:", err);
      }
    }

    let numerology = null;
    if (enginesInput.numerology) {
      try {
        numerology = await analyzeNumerology(enginesInput.numerology);
      } catch (err) {
        console.error("Numerology engine failed:", err);
      }
    }

    let astrology = null;
    if (enginesInput.astrology) {
      try {
        astrology = await analyzeAstrology(enginesInput.astrology);
      } catch (err) {
        console.error("Astrology engine failed:", err);
      }
    }

    /* ============================================================
       STEP 3 — Triad Synthesis
    ============================================================ */
    let triad = null;
    const hasAnyEngine =
      palm !== null || numerology !== null || astrology !== null;

    if (hasAnyEngine) {
      try {
        triad = await synthesizeTriad({
          palm,
          numerology,
          astrology,
          question: q
        });
      } catch (err) {
        console.error("Triad synthesis failed:", err);
      }
    }

    /* ============================================================
       STEP 4 — Short Answer Engine
    ============================================================ */
    const summaryForShortAnswer = JSON.stringify(
      {
        classification,
        palm,
        numerology,
        astrology,
        triad
      },
      null,
      2
    );

    const shortAnswer = (await runShortAnswerEngine(q, summaryForShortAnswer))
      .short;

    /* ============================================================
       STEP 5 — Return full insights bundle
    ============================================================ */
    return {
      ok: true,
      question: q,
      meta,
      classification,
      palmistry: palm,
      numerology,
      astrology,
      triad,
      shortAnswer
    };
  } catch (err) {
    console.error("generateInsights() fatal error:", err);
    return { ok: false, error: err.message };
  }
}
