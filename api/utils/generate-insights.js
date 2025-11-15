// /api/utils/generate-insights.js
// PERSONAL + TECHNICAL insight generation with JSON-safe parsing.

import OpenAI from "openai";

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// --------- FIX: clean JSON ----------
function cleanJSON(text = "") {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/^\s*[\r\n]+/, "")
    .trim();
}

// ---------------- PERSONAL ----------------
export async function personalSummaries(payload = {}) {
  if (!openai) {
    return {
      answer: "Personal insight unavailable.",
      astrologySummary: "",
      numerologySummary: "",
      palmistrySummary: ""
    };
  }

  const prompt = `
You are producing a spiritual personal reading with:
- astrology summary
- numerology summary
- palmistry summary
- short answer summary

Return STRICT JSON only with this shape:

{
  "answer": "...",
  "astrologySummary": "...",
  "numerologySummary": "...",
  "palmistrySummary": "..."
}

User data:
${JSON.stringify(payload, null, 2)}
`;

  const result = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.5,
    messages: [
      { role: "system", content: "Return ONLY valid JSON. Do NOT use code blocks." },
      { role: "user", content: prompt }
    ]
  });

  let raw = result.choices?.[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(cleanJSON(raw));
    return parsed;
  } catch (err) {
    console.error("❌ personalSummaries error", raw, err);
    return {
      answer: "Personal summary unavailable.",
      astrologySummary: "",
      numerologySummary: "",
      palmistrySummary: ""
    };
  }
}

// ---------------- TECHNICAL ----------------
export async function technicalSummary(question) {
  if (!openai) {
    return {
      answer: "Technical answer unavailable",
      keyPoints: [],
      notes: ""
    };
  }

  const prompt = `
Provide a technical answer.

Return only JSON in this exact shape:
{
  "answer": "...",
  "keyPoints": ["...", "..."],
  "notes": "..."
}

Question:
${question}
`;

  const result = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    messages: [
      { role: "system", content: "Return ONLY valid JSON. Do NOT use code fences." },
      { role: "user", content: prompt }
    ]
  });

  let raw = result.choices?.[0]?.message?.content || "{}";

  try {
    return JSON.parse(cleanJSON(raw));
  } catch (err) {
    console.error("❌ technicalSummary error", raw, err);
    return {
      answer: "Technical summary unavailable.",
      keyPoints: [],
      notes: ""
    };
  }
}
