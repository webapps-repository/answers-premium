// /lib/ai.js
import OpenAI from "openai";

let client = null;

function getClient() {
  if (!client && process.env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

// Remove code fences from OpenAI output
function stripJsonFences(str = "") {
  return str
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

// Fallback classifier for safety
const fallbackClassify = q => {
  const t = (q || "").toLowerCase();
  const personal = ["my", "me", "love", "future", "career", "born", "should i", "for me"];
  const isP = personal.some(k => t.includes(k));
  return { type: isP ? "personal" : "technical", confidence: 0.4, source: "fallback" };
};

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
      temperature: 0.1
    });

    const raw = r.choices[0]?.message?.content || "{}";
    const cleaned = stripJsonFences(raw);

    return { ...JSON.parse(cleaned), source: "openai" };
  } catch (err) {
    console.error("classifyQuestion error:", err);
    return fallbackClassify(question);
  }
}

export async function completeJson(prompt, { temperature = 0.3 } = {}) {
  const c = getClient();
  if (!c) throw new Error("OpenAI client missing.");

  const r = await c.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature
  });

  const raw = r.choices[0]?.message?.content || "{}";
  const cleaned = stripJsonFences(raw);

  try {
    return JSON.parse(cleaned);
  } catch {
    console.warn("completeJson parse error:", cleaned);
    return cleaned;
  }
}
