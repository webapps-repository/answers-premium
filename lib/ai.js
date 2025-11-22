// /lib/ai.js — FINAL RESTORED & UPGRADED (Stage-2/Stage-3 engine core)

import OpenAI from "openai";

/* ------------------------------------------------------------
   SINGLETON OPENAI CLIENT (Vercel-safe)
------------------------------------------------------------ */
let client = null;

function getClient() {
  if (!client && process.env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/* ------------------------------------------------------------
   Strip code fences if any
------------------------------------------------------------ */
function stripFences(text = "") {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

/* ------------------------------------------------------------
   Safe JSON parse fallback
------------------------------------------------------------ */
function safeJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------
   LOW-LEVEL RAW MODEL CALL
   (Used by ALL engines + triad + short-answer)
------------------------------------------------------------ */
export async function runModel(model, prompt) {
  const c = getClient();
  if (!c) throw new Error("OpenAI client missing.");

  try {
    const r = await c.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4
    });

    const raw = r.choices?.[0]?.message?.content || "";
    return stripFences(raw);

  } catch (err) {
    console.error("runModel error:", err);
    return ""; // allow engine safe fallback
  }
}

/* ------------------------------------------------------------
   FALLBACK CLASSIFIER (if model fails)
------------------------------------------------------------ */
const fallbackClassify = q => {
  const t = (q || "").toLowerCase();
  const personal = ["my", "me", "love", "future", "career", "born", "should i", "for me"];
  const isP = personal.some(k => t.includes(k));
  return { type: isP ? "personal" : "technical", confidence: 0.4, source: "fallback" };
};

/* ------------------------------------------------------------
   CLASSIFICATION ENGINE (gpt-4.1-mini)
------------------------------------------------------------ */
export async function classifyQuestion(question) {
  const c = getClient();
  if (!c) return fallbackClassify(question);

  const prompt = `
Return ONLY JSON in this exact format:

{
  "type": "personal" | "technical",
  "confidence": 0.0 to 1.0
}

User Question: "${question || ""}"
`;

  try {
    const raw = await runModel("gpt-4.1-mini", prompt);
    const cleaned = stripFences(raw);
    const parsed = safeJSON(cleaned);

    if (parsed && parsed.type)
      return { ...parsed, source: "openai" };

    return fallbackClassify(question);

  } catch (err) {
    console.error("classifyQuestion error:", err);
    return fallbackClassify(question);
  }
}
