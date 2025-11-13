// generateInsights.js — Generate summarized text for reports using OpenAI
import OpenAI from "openai";
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function generateInsights({ question, name, dobIso, numerics }) {
  if (!openai) {
    return {
      answer: "Your chart suggests positive changes ahead.",
      astro: "Astrology shows growth and stability entering your cycle.",
      numerology: "Numerology indicates transformation and opportunity.",
      palm: "Palm lines strengthen over the coming year.",
    };
  }

  try {
    const system = `You are an expert astrologer, numerologist, and palm reader.
Respond in short, warm, clear English paragraphs only.`;

    const user = `
Create concise interpretations for this reading.
Name: ${name || "(unknown)"}
DOB: ${dobIso || "(unknown)"}
Numerology: ${JSON.stringify(numerics || {})}
Question: ${question}

Return JSON:
{
  "answer": "Short summary response (under 80 words)",
  "astro": "Astrology paragraph",
  "numerology": "Numerology paragraph",
  "palm": "Palmistry paragraph"
}
`;

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.6,
    });

    const txt = r.choices?.[0]?.message?.content?.trim() || "{}";
    const data = JSON.parse(txt);
    return {
      answer: data.answer || "Your answer is being revealed soon.",
      astro: data.astro || "",
      numerology: data.numerology || "",
      palm: data.palm || "",
    };
  } catch (err) {
    console.error("Insight generation error:", err);
    return {
      answer: "Your chart suggests change ahead.",
      astro: "Astrological influences indicate progress.",
      numerology: "Numerology shows adaptability and learning.",
      palm: "Palmistry lines indicate renewal.",
    };
  }
}
