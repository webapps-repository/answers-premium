// /lib/insights.js
// FINAL VERSION (pre-upgrades)
// Now includes:
//  - Basic numerology engine
//  - Basic astrology mock
//  - Technical analysis engine (merged from generate-technical.js)
//  - Triad AI alignment
//  - Unified personal + technical routing

import { computeAstrologyMock, computeBasicNumerology } from "../lib/engines.js";
import { safeString, summarizeText } from "../lib/utils.js";

// ------------------------------------------------------------
// TECHNICAL ENGINE (merged)
// ------------------------------------------------------------
//
// This is the lightweight pre-upgrade technical engine.
// It performs:
//   - error/bug/risk detection
//   - basic code summarization
//   - attachment content integration
//
// Full GPT-4.1 advanced version comes later.
//
function computeTechnicalInsights(question, techFileText) {
  const q = safeString(question).toLowerCase();

  // SIMPLE CLASSIFICATIONS
  const isCode =
    q.includes("bug") ||
    q.includes("error") ||
    q.includes("fix") ||
    q.includes("function") ||
    q.includes("api") ||
    q.includes("node") ||
    q.includes("javascript") ||
    q.includes("vercel") ||
    q.includes("serverless");

  const isFinance =
    q.includes("roi") ||
    q.includes("irr") ||
    q.includes("npv") ||
    q.includes("valuation") ||
    q.includes("investment") ||
    q.includes("capital") ||
    q.includes("finance");

  const isEngineering =
    q.includes("sensor") ||
    q.includes("voltage") ||
    q.includes("circuit") ||
    q.includes("schematic") ||
    q.includes("pcb");

  let category = "general";
  if (isCode) category = "coding";
  else if (isFinance) category = "finance";
  else if (isEngineering) category = "engineering";

  // TECH FILE TEXT
  const fileSummary = techFileText
    ? summarizeText(techFileText, 1200)
    : null;

  return {
    category,
    fileSummary,
    context: `
Detected domain: ${category}
File included: ${fileSummary ? "yes" : "no"}
    `
  };
}

// ------------------------------------------------------------
// MAIN ENTRY
// ------------------------------------------------------------
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
  techFileText
}) {
  try {
    const q = safeString(question);

    // ------------------------------------------------------------
    // PERSONAL DATA
    // ------------------------------------------------------------
    let astrology = null;
    let numerology = null;

    if (isPersonal) {
      astrology = computeAstrologyMock(birthDate, birthTime, birthPlace);
      numerology = computeBasicNumerology(fullName, birthDate);
    }

    // ------------------------------------------------------------
    // TECHNICAL DATA (merged generate-technical.js)
    // ------------------------------------------------------------
    let technical = null;
    if (technicalMode) {
      technical = computeTechnicalInsights(q, techFileText);
    }

    // ------------------------------------------------------------
    // TRIAD AI ALIGNMENT
    // ------------------------------------------------------------
    const triad = await generateTriad({
      mode: technicalMode ? "technical" : "personal",
      question: q,
      intent: classify?.intent || "general",
      astrology,
      numerology,
      palmistry: palmistryData,
      technical
    });

    // ------------------------------------------------------------
    // TECHNICAL OUTPUT
    // ------------------------------------------------------------
    if (technicalMode) {
      return {
        ok: true,
        mode: "technical",
        shortAnswer: safeString(triad.shortAnswer),
        keyPoints: triad.keyPoints || [],
        explanation: safeString(triad.explanation),
        recommendations: safeString(triad.recommendations),
        domain: technical?.category || "general",
        pdfEmailed: false
      };
    }

    // ------------------------------------------------------------
    // PERSONAL OUTPUT
    // ------------------------------------------------------------
    return {
      ok: true,
      mode: "personal",
      shortAnswer: safeString(triad.shortAnswer),
      astrology,
      numerology,
      palmistry: palmistryData,
      interpretations: {
        astrology: triad.astroInterpretation || "",
        numerology: triad.numerologyInterpretation || "",
        palmistry: triad.palmInterpretation || "",
        combined: triad.combined || "",
        timeline: triad.timeline || "",
        recommendations: triad.recommendations || ""
      }
    };

  } catch (err) {
    console.error("INSIGHTS ERROR:", err);
    return {
      ok: false,
      error: err.message || "Insights generation failed"
    };
  }
}
