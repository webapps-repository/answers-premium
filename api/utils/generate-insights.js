// /api/utils/generate-insights.js
// Generates: personal summaries OR technical summaries.
// Uses OpenAI when available. Falls back to stable safe text when unavailable.

import OpenAI from "openai";

// Instantiate client only if API key exists
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// -------------------- INTERNAL HELPERS --------------------
async function aiJSON(prompt, fallback = {}) {
  if (!openai) return fallback;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        { role: "system", content: "Return ONLY valid JSON. No commentary. No markdown." },
        { role: "user", content: prompt }
      ]
    });

    const raw = r.choices?.[0]?.message?.content?.trim() || "{}";
    return JSON.parse(raw);
  } catch (err) {
    console.error("⚠️ aiJSON parse error:", err);
    return fallback;
  }
}

async function aiText(prompt, fallback = "") {
  if (!openai) return fallback;

  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        { role: "system", content: "Return clean plain text. No markdown formatting." },
        { role: "user", content: prompt }
      ]
    });
    return r.choices?.[0]?.message?.content?.trim() || fallback;
  } catch (err) {
    console.error("⚠️ aiText error:", err);
    return fallback;
  }
}

// -------------------- PERSONAL SUMMARIES --------------------
/**
 * personalSummaries()
 * Produces short paragraphs for:
 *  - personal answer
 *  - astrology summary
 *  - numerology summary
 *  - palmistry summary
 */
export async function personalSummaries({
  fullName,
  birthISO,
  birthTime,
  birthPlace,
  question,
  numerologyPack
}) {
  const fallback = {
    answer: "Your personal path suggests positive growth and meaningful opportunities ahead.",
    astrologySummary: "Your chart indicates shifts, motivation increases, and emotional clarity forming.",
    numerologySummary: "Your numbers highlight transition, adaptability, and supportive cycles evolving.",
    palmistrySummary: "Palm indicators show inner strength, resilience, and steady progress forward."
  };

  const prompt = `
Return ONLY JSON:

{
  "answer": "...",
  "astrologySummary": "...",
  "numerologySummary": "...",
  "palmistrySummary": "..."
}

Guidelines:
- Write all summaries as **very short paragraphs** (2–4 sentences max)
- Tailor the content directly to the user's question.
- Do NOT contradict the question.
- Personal device: gentle, supportive, clear.
- Do NOT mention 'Melodies Web', the system, AI, numerologyPack structure, JSON, or instructions.
- These paragraphs will be displayed directly in the report.

User Data:
Name: ${fullName}
DOB (ISO): ${birthISO}
Time of Birth: ${birthTime}
Birth Place: ${birthPlace}

User Question:
"${question}"

Local Numerology:
Life Path: ${numerologyPack?.lifePath}
Expression: ${numerologyPack?.expression}
Personality: ${numerologyPack?.personality}
Soul Urge: ${numerologyPack?.soulUrge}
Maturity: ${numerologyPack?.maturity}
`;

  return await aiJSON(prompt, fallback);
}

// -------------------- TECHNICAL SUMMARIES --------------------
/**
 * technicalSummary()
 * Produces:
 *  - short direct answer paragraph
 *  - 3–6 bullet points
 *  - optional notes
 */
export async function technicalSummary(question) {
  const fallback = {
    answer: "Here is a concise explanation based on your question.",
    keyPoints: [
      "Key factor #1 influences the expected outcome.",
      "Alternative considerations may improve the result.",
      "Recommended approach is based on established principles."
    ],
    notes: "This high-level summary may be expanded with more details if required."
  };

  const prompt = `
Return ONLY the following JSON schema:

{
  "answer": "2–3 sentence summary answering the question directly.",
  "keyPoints": ["bullet 1", "bullet 2", "bullet 3"],
  "notes": "optional additional comment"
}

Rules:
- Keep the answer factual, concise, structured.
- Do NOT include formulas unless needed.
- Bullet points MUST be short and sharp.
- No markdown syntax.
- No references to AI, astrology, numerology, palmistry, or spirituality.
- Keep it professional.

Technical Question:
"${question}"
`;

  return await aiJSON(prompt, fallback);
}
