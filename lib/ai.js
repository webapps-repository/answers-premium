// /lib/ai.js
import OpenAI from "openai";

let client = null;

function getClient() {
  if (!client && process.env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

const fallbackClassify = q => {
  const t = (q || "").toLowerCase();
  const personal = ["my", "me", "love", "future", "career", "born", "should i", "for me"];
  const isP = personal.some(k => t.includes(k));
  return { type: isP ? "personal" : "technical", confidence: 0.4, source: "fallback" };
};

/**
 * Classify a question as "personal" or "technical".
 * Replaces /api/utils/classify-question.js
 */
export async function classifyQuestion(question) {
  const c = getClient();
  if (!c) return fallbackClassify(question);

  const prompt = `
Return JSON ONLY:

{
 "type": "personal" | "technical",
 "confidence": 0..1
}

User: "${question}"
`;

  try {
    const r = await c.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    });

    const raw = r.choices[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(raw);
    return { ...parsed, source: "openai" };
  } catch (err) {
    console.error("classifyQuestion error:", err);
    return fallbackClassify(question);
  }
}

/**
 * Generic helper for “JSON-structured” completions used by other engines.
 */
export async function completeJson(prompt, { temperature = 0.3 } = {}) {
  const c = getClient();
  if (!c) throw new Error("OpenAI client not configured.");

  const res = await c.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature
  });

  const raw = res.choices[0]?.message?.content?.trim() || "{}";
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("completeJson parse error, returning raw string.");
    return raw;
  }
}
