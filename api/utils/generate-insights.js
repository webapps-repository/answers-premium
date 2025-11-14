// /api/utils/generate-insights.js
// GPT-4o advanced insights generation for personal + technical questions

import OpenAI from "openai";

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Safe JSON extractor
async function aiJSON(prompt, fallback = {}) {
  if (!openai) return fallback;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      messages: [
        { role: "system", content: "Return ONLY valid JSON." },
        { role: "user", content: prompt }
      ],
    });

    const txt = r.choices?.[0]?.message?.content?.trim() || "{}";
    return JSON.parse(txt);
  } catch (e) {
    console.error("AI JSON parse error:", e);
    return fallback;
  }
}

// ----- PERSONAL REPORT ENGINE -----
export async function personalSummaries({
  fullName,
  birthISO,
  birthTime,
  birthPlace,
  question,
  numerologyPack,
  analyzePalm = false,
  palmImageBase64 = null
}) {
  const prompt = `
Generate a PERSONAL spiritual insight report as JSON:

{
  "answer": "1 paragraph directly answering the question",
  "astrologySummary": "1 short paragraph",
  "numerologySummary": "1 short paragraph that references all 5 numbers",
  "palmistrySummary": "1 paragraph (or empty if no palm image)"
}

QUESTION: ${question}

NAME: ${fullName}
DOB (ISO): ${birthISO}
TIME: ${birthTime}
PLACE: ${birthPlace}

NUMEROLOGY (Pythagorean):
Life Path = ${numerologyPack.lifePath}
Expression = ${numerologyPack.expression}
Personality = ${numerologyPack.personality}
Soul Urge = ${numerologyPack.soulUrge}
Maturity = ${numerologyPack.maturity}

PALM IMAGE PROVIDED: ${analyzePalm ? "YES" : "NO"}
${palmImageBase64 ? "BASE64 IMAGE INCLUDED" : ""}
`;

  return await aiJSON(prompt, {});
}

// ----- TECHNICAL REPORT ENGINE -----
export async function technicalSummary(question) {
  const prompt = `
Create a concise technical answer as JSON:

{
  "answer": "2–4 sentences that directly answer the question.",
  "keyPoints": ["3–6 bullet points"],
  "notes": "optional additional notes"
}

QUESTION:
${question}
`;

  return await aiJSON(prompt, {});
}
