import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function classifyQuestion(question = "") {
  const fallback = () => {
    const q = question.toLowerCase();
    const personalHints = [
      "my","should i","will i","born","relationship",
      "marriage","career","health","love","life","astrology","numerology","palm"
    ];
    return personalHints.some((k) => q.includes(k)) ? "personal" : "technical";
  };

  if (!openai) return fallback();

  try {
    const prompt = `
Classify this question as "personal" or "technical".
personal = about an individual's life, destiny, love, or health.
technical = analytical, scientific, or factual.

Question: """${question}"""
Return JSON: {"type":"personal"} or {"type":"technical"}.`;

    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    });
    const raw = r.choices?.[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(raw);
    return parsed.type || fallback();
  } catch (err) {
    console.error("Classify fallback:", err);
    return fallback();
  }
}
