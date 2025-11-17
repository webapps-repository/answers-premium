// /api/utils/classify-question.js
// Robust, crash-proof classifier with safe JSON parsing + fallback mode

import OpenAI from "openai";

// Init client
let client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ---------------------------------------------------------------------------
// Fallback classifier
// ---------------------------------------------------------------------------
const fallback = (q = "") => {
  const t = q.toLowerCase();

  const checks = {
    love: ["love", "relationship", "marriage", "partner", "soulmate", "dating"],
    career: ["career", "job", "promotion", "work", "business"],
    money: ["money", "finance", "wealth", "income", "investment"],
    health: ["health", "ill", "sick", "heal", "body"],
    spiritual: ["spiritual", "soul", "meaning", "purpose", "awakening"],
  };

  let detected = "general";

  for (const key of Object.keys(checks)) {
    if (checks[key].some((w) => t.includes(w))) {
      detected = key;
      break;
    }
  }

  const isPersonal = detected !== "general";

  return {
    type: isPersonal ? "personal" : "technical",
    intent: detected,
    confidence: 0.35,
    tone: "neutral",
    source: "fallback",
  };
};

// ---------------------------------------------------------------------------
// EXPORT: classifyQuestion
// ---------------------------------------------------------------------------
export async function classifyQuestion(question = "") {
  if (!client) {
    console.warn("⚠ No OPENAI_API_KEY, using fallback classifier.");
    return fallback(question);
  }

  try {
    const prompt = `
Classify the following user question:

"${question}"

Return ONLY this JSON schema:

{
  "type": "personal" | "technical",
  "intent": "love" | "career" | "money" | "health" | "spiritual" | "personal_growth" | "life_direction" | "technical" | "general",
  "confidence": number,
  "tone": "emotional" | "neutral" | "urgent" | "curious"
}
`;

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    // SAFELY extract JSON
    const parsed = r?.choices?.[0]?.message?.parsed;

    if (!parsed) {
      console.error("❌ classifyQuestion: OpenAI returned invalid JSON.");
      return fallback(question);
    }

    if (!parsed.intent) {
      console.warn("⚠ classifyQuestion: Missing intent, applying fallback.");
      return fallback(question);
    }

    return parsed;

  } catch (e) {
    console.error("❌ classifyQuestion error:", e);
    return fallback(question);
  }
}
