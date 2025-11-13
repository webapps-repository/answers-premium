import OpenAI from "openai";

export async function personalSummaries(input) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    // Minimal fallback text if OpenAI is off
    return {
      answer: "Here’s a short, supportive answer based on your details.",
      astrologySummary: "Astrology suggests a period of reflection and steady change.",
      numerologySummary: "Your numerology points to practical progress and clarity.",
      palmistrySummary: "Palm features indicate resilience and consistent momentum.",
    };
  }

  const openai = new OpenAI({ apiKey: key });
  const prompt = `Create short paragraphs tailored to the user's question.
Return JSON with keys:
{ "answer": "...<=120 words", "astrologySummary": "...", "numerologySummary": "...", "palmistrySummary": "..." }

User:
${JSON.stringify(input, null, 2)}
Return JSON only.`;

  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    messages: [
      { role: "system", content: "Return valid JSON only." },
      { role: "user", content: prompt },
    ],
  });
  const txt = r.choices?.[0]?.message?.content?.trim() || "{}";
  return JSON.parse(txt);
}

export async function technicalSummary(question) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      answer: "Here’s a concise answer.",
      keyPoints: ["Key point A", "Key point B", "Key point C"],
      notes: "OpenAI disabled; using fallback content.",
    };
  }
  const openai = new OpenAI({ apiKey: key });
  const prompt = `Return JSON:
{ "answer": "2-3 sentences", "keyPoints": ["..."], "notes": "optional" }
Question: """${question}"""`;

  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: "Return valid JSON only." },
      { role: "user", content: prompt },
    ],
  });
  const txt = r.choices?.[0]?.message?.content?.trim() || "{}";
  return JSON.parse(txt);
}
