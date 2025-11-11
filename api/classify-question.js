// /api/classify-question.js
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { question } = req.body;
    if (!question)
      return res.status(400).json({ success: false, error: "Missing question" });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Classify questions as "personal" (love, fate, career, health, spirituality, astrology, numerology, palmistry, life path) 
          or "technical" (finance, math, science, environment, engineering, programming, technology). 
          Return ONLY JSON like {"type":"personal"} or {"type":"technical"}.`,
        },
        { role: "user", content: question },
      ],
    });

    let parsed;
    try {
      parsed = JSON.parse(completion.choices[0].message.content);
    } catch {
      const isPersonal = /(i|my|me|born|love|career|future|health|marriage|life)/i.test(question);
      parsed = { type: isPersonal ? "personal" : "technical" };
    }

    return res.status(200).json({ success: true, type: parsed.type });
  } catch (err) {
    console.error("❌ Classifier error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
