// /api/utils/generate-insights.js
// OpenAI summaries (personal + technical)

import OpenAI from "openai";

let openai = null;
if (process.env.OPENAI_API_KEY)
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const safeAI = async (messages, fallback={}) => {
  if (!openai) return fallback;
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.6,
      messages
    });
    return JSON.parse(res.choices[0].message.content);
  } catch (e) {
    console.error("AI error", e);
    return fallback;
  }
};

// PERSONAL SUMMARY
export async function personalSummaries(data) {
  const { fullName, birthISO, birthTime, birthPlace, question, numerologyPack } = data;

  const prompt = `
Return ONLY valid JSON with keys:
{
  "answer": "...",
  "astrologySummary": "...",
  "numerologySummary": "...",
  "palmistrySummary": "..."
}

Use:
- Western astrology
- Pythagorean numerology
- Palmistry (general reading, lines, mounts, timing)
- All content must directly answer the question.

Numerology numbers:
${JSON.stringify(numerologyPack, null, 2)}

User:
Name: ${fullName}
DOB: ${birthISO}
Birth time: ${birthTime}
Birth place: ${birthPlace}
Question: ${question}

Make the 3 summaries short and specific.
`;

  return await safeAI(
    [
      { role: "system", content: "Return valid JSON only." },
      { role: "user", content: prompt }
    ],
    {}
  );
}

// TECHNICAL SUMMARY
export async function technicalSummary(question) {
  const prompt = `
Return ONLY valid JSON:
{
  "answer": "2–3 sentence direct answer",
  "keyPoints": ["p1","p2","p3"],
  "notes": "optional"
}

Question: ${question}
`;

  return await safeAI(
    [
      { role:"system", content:"Return JSON only." },
      { role:"user", content:prompt }
    ],
    {}
  );
}
