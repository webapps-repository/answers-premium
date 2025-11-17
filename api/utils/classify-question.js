// /api/utils/classify-question.js
// Enhanced classification module:
// - Categorizes intent: love, career, money, health, spiritual, technical, etc.
// - Detects whether personal or technical
// - Gives confidence and metadata

import OpenAI from "openai";

let client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Fallback keyword classifier
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
    if (checks[key].some((w) => t.includes(w))) detected = key;
  }

  const isPersonal =
    detected !== "general" && detected !== "technical" ? true : false;

  return {
    type: isPersonal ? "personal" : "technical",
    intent: detected,
    confidence: 0.35,
    source: "fallback",
  };
};

// ===================================================================
// MAIN EXPORT
// ===================================================================
export async function classifyQuestion(question) {
  if (!client) return fallback(question);

  try {
    const prompt = `
Classify the following user question:

"${question}"

Return ONLY the following JSON structure, nothing else:

{
  "type": "personal" | "technical",
  "intent": "love" | "career" | "money" | "health" | "spiritual" | "personal_growth" | "life_direction" | "technical" | "general",
  "confidence": "0.0 to 1.0",
  "tone": "emotional" | "neutral" | "urgent" | "curious"
}

Rules:
- "type" = personal if question relates to emotions, life, relationships, choices, spiritual meaning, personal wellbeing.
- "type" = technical if question is about code, technology, math, physics, finance calculations, programming errors.
- "intent" must reflect underlying purpose.
- Do NOT add explanations.
    `;

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    return r.choices[0].message.parsed;
  } catch (e) {
    console.error("Classifier error:", e);
    return fallback(question);
  }
}
