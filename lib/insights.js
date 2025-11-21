// /lib/insights.js
import { analyzePalm, analyzeNumerology, analyzeAstrology } from "./engines.js";
import { classifyQuestion } from "./ai.js";

export async function generateInsights({
  question,
  meta = {},
  enginesInput = {}
}) {
  try {
    const classification = await classifyQuestion(question);

    const palm = enginesInput.palm
      ? await analyzePalm(enginesInput.palm)
      : null;

    const numerology = enginesInput.numerology
      ? await analyzeNumerology(enginesInput.numerology)
      : null;

    const astrology = enginesInput.astrology
      ? await analyzeAstrology(enginesInput.astrology)
      : null;

    const shortAnswer = `
**Summary**  
Your question was classified as: **${classification.type}**  
Confidence: ${classification.confidence}
    `;

    return {
      ok: true,
      question,
      classification,
      palmistry: palm,
      numerology,
      astrology,
      shortAnswer
    };
  } catch (err) {
    console.error("generateInsights error:", err);
    return { ok: false, error: err.message };
  }
}
