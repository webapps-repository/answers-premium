// /lib/ai.js
import OpenAI from "openai";

let client = null;
function getClient() {
  if (!client && process.env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function completeText(prompt) {
  const c = getClient();

  const r = await c.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5
  });

  return r.choices[0].message.content.trim();
}
