// /api/utils/classify-question.js
// Clean, stable classifier using OpenAI gpt-4o, with strict JSON output.
// Falls back to keyword classifier if the API is unavailable or returns bad JSON.

import OpenAI from "openai";

// Create client only if API key exists (prevents cold-start errors)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/** ------------------------------------------------------------------
 * Fallback keyword classifier (never fails, always returns valid JSON)
 * ------------------------------------------------------------------*/
function fallbackClassifier(question) {
  const q = (question || "").toLowerCase();

  const personalHints = [
    "my", "me", "i ", "i'm", "i am",
    "should i", "will i", "for me", "to me",
    "relationship", "love", "marriage",
    "health", "career", "future", "life",
    "born", "birth", "date of birth",
    "astrology", "numerology", "palm",
    "spiritual", "reading", "fortune",
  ];

  const isPersonal = personalHints.some(k => q.includes(k));

  return {
    type: isPersonal ? "personal" : "technical",
    confidence: 0.55,
    source: "fallback"
  };
}

/** ------------------------------------------------------------------
 * OpenAI classifier using gpt-4o (strict JSON only)
 * ------------------------------------------------------------------*/
async function openaiClassifier(question) {
  if (!openai) return fallbackClassifier(question);

  try {
    const prompt = `
Classify the following question.

Return ONLY a valid JSON object with this shape:

{
  "type": "personal" | "technical",
  "confidence": number
}

Definitions:
- "personal" = questions about the user's life, emotions, future, relationships, health, marriage, destiny, spiritual matters, or decisions relating to themselves.
- "technical" = questions about math, finance, business, coding, IT, science, engineering, economics, history, analysis, troubleshooting, or factual subjects.

Do NOT include explanations. Do NOT include extra text.
Just return the JSON.

User question:
"${question}"
`;

    const result = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.0,
      messages: [
        { role: "system", content: "Return ONLY strict JSON. No extra text." },
        { role: "user", content: prompt }
      ]
    });

    const raw = result.choices?.[0]?.message?.content?.trim() || "{}";

    // Ensure strict JSON parse
    const data = JSON.parse(raw);

    if (data && (data.type === "personal" || data.type === "technical")) {
      return {
        type: data.type,
        confidence: Number(data.confidence ?? 0.5),
        source: "openai"
      };
    }

    return fallbackClassifier(question);

  } catch (err) {
    console.error("⚠️ classifyQuestion OpenAI error:", err);
    return fallbackClassifier(question);
  }
}

/** ------------------------------------------------------------------
 * PUBLIC EXPORT
 * ------------------------------------------------------------------*/
export async function classifyQuestion(question) {
  if (!question || typeof question !== "string") {
    return {
      type: "technical",
      confidence: 0.2,
      source: "invalid"
    };
  }

  return await openaiClassifier(question);
}
