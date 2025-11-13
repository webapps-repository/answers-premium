// /api/utils/classify-question.js
// Classifies a question as "personal" or "technical".
// Uses OpenAI when available; otherwise uses a safe fallback.

import OpenAI from "openai";

// Create client only if key exists (prevents crash on cold start)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// --- Fallback classifier (simple keyword logic) ---
function fallbackClassifier(question) {
  const q = (question || "").toLowerCase();

  const personalHints = [
    "my", "me", "i am", "should i", "will i", "love", "relationship",
    "marriage", "born", "birth", "date of birth", "health",
    "career", "future", "astrology", "numerology", "palm",
    "spiritual", "for me", "about me"
  ];

  const isPersonal = personalHints.some(k => q.includes(k));

  return {
    type: isPersonal ? "personal" : "technical",
    confidence: 0.55,
    source: "fallback"
  };
}

// --- OpenAI classifier (preferred) ---
async function openaiClassifier(question) {
  if (!openai) return fallbackClassifier(question);

  try {
    const prompt = `
Classify the user's question strictly as JSON:
{
  "type": "personal" | "technical",
  "confidence": number (0..1)
}

Rules:
- "personal" = questions about the individual’s future, life, love, health, career, decisions, spiritual guidance.
- "technical" = anything analytical: finance, math, science, business, troubleshooting, IT, economics, coding, etc.

Return ONLY JSON.

User question:
"${question}"
`;

    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.0,
      messages: [
        { role: "system", content: "Return valid JSON only." },
        { role: "user", content: prompt }
      ]
    });

    const text = result.choices?.[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(text);

    if (parsed && (parsed.type === "personal" || parsed.type === "technical")) {
      return {
        type: parsed.type,
        confidence: Number(parsed.confidence ?? 0.5),
        source: "openai"
      };
    }

    return fallbackClassifier(question);

  } catch (err) {
    console.error("⚠️ OpenAI classification error:", err);
    return fallbackClassifier(question);
  }
}

// --- PUBLIC EXPORT ---
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
