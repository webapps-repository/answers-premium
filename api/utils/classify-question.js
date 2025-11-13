// Classifier with OpenAI (optional) + safe fallback.
// Returns: { type: "personal"|"technical", confidence: number, source: "openai"|"fallback" }

import OpenAI from "openai";

const personalHints = [
  "my ", "for me", "should i", "will i", "when will i", "relationship",
  "marriage", "love", "health", "career", "born", "birth", "zodiac",
  "astrology", "numerology", "palm", "future"
];

function fallbackClassify(q) {
  const t = (q || "").toLowerCase();
  const hit = personalHints.some(k => t.includes(k));
  return { type: hit ? "personal" : "technical", confidence: 0.55, source: "fallback" };
}

export async function classifyQuestion(question) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fallbackClassify(question);

  try {
    const openai = new OpenAI({ apiKey: key });
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: "Return valid JSON only." },
        { role: "user", content:
`Classify the question as JSON: {"type":"personal"|"technical","confidence":0..1}.
"personal" = guidance about a specific individual (life/love/career/health/spiritual).
"technical" = math, finance, code, science, environment, troubleshooting, etc.
Question: """${question || ""}"""` }
      ],
    });
    const txt = r.choices?.[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(txt);
    if (parsed?.type === "personal" || parsed?.type === "technical") {
      return { type: parsed.type, confidence: Number(parsed.confidence ?? 0.6), source: "openai" };
    }
    return fallbackClassify(question);
  } catch (e) {
    console.error("classifier openai error:", e);
    return fallbackClassify(question);
  }
}
