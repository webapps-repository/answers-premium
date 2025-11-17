// /api/utils/classify-question.js
import OpenAI from "openai";

let client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Fallback classifier
function fallback(q = "") {
  const t = q.toLowerCase();

  const intents = {
    love: ["love", "relationship", "partner", "marriage"],
    career: ["career", "job", "work", "promotion"],
    money: ["money", "finance", "income", "wealth"],
    health: ["health", "body", "ill", "heal"],
    spiritual: ["spiritual", "soul", "meaning"],
  };

  let detected = "general";

  for (const k of Object.keys(intents)) {
    if (intents[k].some((x) => t.includes(x))) detected = k;
  }

  return {
    type: detected === "general" ? "technical" : "personal",
    intent: detected,
    confidence: 0.3,
    tone: "neutral",
  };
}

export async function classifyQuestion(question) {
  if (!client) return fallback(question);

  try {
    const prompt = `
Classify this question: "${question}"

Return ONLY JSON:
{
  "type": "personal" | "technical",
  "intent": "love" | "career" | "money" | "health" | "spiritual" | "general",
  "confidence": number,
  "tone": "emotional" | "neutral" | "urgent" | "curious"
}`;

    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return r.choices[0].message.parsed;
  } catch (err) {
    console.error("Classification error:", err);
    return fallback(question);
  }
}
