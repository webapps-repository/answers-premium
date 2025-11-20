// /lib/triad.js
// Unified synthesis engine for:
// - Personal spiritual questions
// - Technical (coding + finance) questions
// - Astrology + Numerology + Palmistry combined interpretation
//
// This version is STABLE and upgrade-ready.
// No external APIs used yet (AstrologyAPI upgrade later).

import { classifyQuestion, completeJson } from "../lib/ai.js";
import { safeString } from "../lib/utils.js";

// ------------------------------------------------------------
// Generate safe text (fallback)
// ------------------------------------------------------------
function fallbackShortAnswer(question, intent) {
  return `Your question: "${safeString(
    question
  )}" has been processed. Current energies around ${intent} show movement, but more details will emerge as we integrate your full personal data.`;
}

// ------------------------------------------------------------
// Personal Mode — GPT-4.1 high-level interpretation
// ------------------------------------------------------------
async function generatePersonalTriad({ question, intent, astrology, numerology, palmistry }) {
  const systemPrompt = `
You are a spiritual analysis system.
Blend *astrology*, *numerology*, and *palmistry* into a unified answer.
Tone: clear, compassionate, precise.
`;

  const userPrompt = `
Question: "${question}"
Intent: ${intent}

ASTROLOGY DATA:
${JSON.stringify(astrology, null, 2)}

NUMEROLOGY DATA:
${JSON.stringify(numerology, null, 2)}

PALMISTRY DATA:
${JSON.stringify(palmistry, null, 2)}

Return JSON:
{
  "shortAnswer": "...",
  "astroInterpretation": "...",
  "numerologyInterpretation": "...",
  "palmInterpretation": "...",
  "combined": "...",
  "timeline": "...",
  "recommendations": "..."
}
`;

  try {
    const result = await ai.json(systemPrompt, userPrompt);

    // Guarantee all fields exist
    return {
      shortAnswer: safeString(result.shortAnswer),
      astroInterpretation: safeString(result.astroInterpretation),
      numerologyInterpretation: safeString(result.numerologyInterpretation),
      palmInterpretation: safeString(result.palmInterpretation),
      combined: safeString(result.combined),
      timeline: safeString(result.timeline),
      recommendations: safeString(result.recommendations)
    };
  } catch (err) {
    console.error("TRIAD AI ERROR:", err);
    return {
      shortAnswer: fallbackShortAnswer(question, intent),
      astroInterpretation: "Astrological interpretation unavailable.",
      numerologyInterpretation: "Numerological interpretation unavailable.",
      palmInterpretation: "Palmistry interpretation unavailable.",
      combined: "Combined synthesis unavailable.",
      timeline: "Timeline unavailable.",
      recommendations: "Recommendations unavailable."
    };
  }
}

// ------------------------------------------------------------
// Technical Mode (coding + finance)
// ------------------------------------------------------------
async function generateTechnicalTriad({ question, techFileText }) {
  const systemPrompt = `
You are a technical analyst specializing in:
- software engineering
- debugging
- finance, accounting, valuation
- systems design
Respond with high clarity, correctness, and actionable steps.
`;

  const userPrompt = `
Technical question: "${question}"

Additional file content (optional):
${techFileText || "(none)"}

Return JSON:
{
  "shortAnswer": "...",
  "keyPoints": ["..."],
  "explanation": "...",
  "recommendations": "..."
}
`;

  try {
    const result = await ai.json(systemPrompt, userPrompt);

    return {
      shortAnswer: safeString(result.shortAnswer),
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
      explanation: safeString(result.explanation),
      recommendations: safeString(result.recommendations)
    };
  } catch (err) {
    console.error("TECH TRIAD ERROR:", err);
    return {
      shortAnswer: `Your technical question "${question}" has been received.`,
      keyPoints: [],
      explanation: "Technical analysis unavailable due to an AI error.",
      recommendations: "Retry with more detail or attach a file."
    };
  }
}

// ------------------------------------------------------------
// MAIN EXPORT
// ------------------------------------------------------------
export async function generateTriad({
  mode,
  question,
  intent,
  astrology,
  numerology,
  palmistry,
  techFileText
}) {
  if (mode === "technical") {
    return generateTechnicalTriad({ question, techFileText });
  }

  return generatePersonalTriad({
    question,
    intent,
    astrology,
    numerology,
    palmistry
  });
}
