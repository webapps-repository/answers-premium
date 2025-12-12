// /lib/insights.js
// Fully ESM-compatible, Vercel-friendly, named export only.

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * generateInsights()
 * Produces the short text response for the spiritual report.
 */
export async function generateInsights({ question, personal }) {
  try {
    const prompt = `
      You are Melodie, a warm spiritual guide.
      Provide a concise short answer (3–6 sentences).
      HTML only, using <p> tags.

      Question: "${question}"
      Personal context: ${JSON.stringify(personal, null, 2)}
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5
    });

    const text = completion.choices[0].message.content;

    return `
      <div style="font-family:system-ui; line-height:1.5;">
        ${text}
      </div>
    `;
  } catch (err) {
    console.error("INSIGHTS ERROR:", err);
    return `
      <div style="font-family:system-ui; line-height:1.5;">
        <p>I couldn’t generate the insight at this moment.</p>
        <p>Your question was: <strong>${question}</strong></p>
      </div>
    `;
  }
}
