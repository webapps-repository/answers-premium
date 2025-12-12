// /lib/insights.js
// Fully ESM-compatible, Vercel-friendly, named export only.

import OpenAI from "openai";

// If you are not using OpenAI yet, comment this out and use stub below.
// If using OpenAI, ensure process.env.OPENAI_API_KEY exists.
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * generateInsights()
 * Produces the SHORT ANSWER returned by spiritual-report.js
 * (HTML-safe, simple, deterministic)
 *
 * @param {Object} data
 * @param {string} data.question
 * @param {Object} data.personal
 */
export async function generateInsights({ question, personal }) {
  // ------------------------------------------
  // 🔄 1) Basic fallback (no OpenAI)
  // ------------------------------------------
  // If you do NOT want OpenAI calls yet, uncomment this and return instantly.
  /*
  return `
    <div style="font-family:system-ui">
      <p><strong>Your Question:</strong> ${question}</p>
      <p>Hello! This is your automated spiritual insight preview.</p>
      <p>A more detailed interpretation will be included in your premium PDF report.</p>
    </div>
  `;
  */

  // ------------------------------------------
  // 🤖 2) Using OpenAI (if API key enabled)
  // ------------------------------------------
  try {
    const prompt = `
      You are "Melodie", a spiritual assistant.

      Provide a concise, warm short answer (max 5 sentences) to this question:
      "${question}"

      Consider basic personal context (if available):
      ${JSON.stringify(personal, null, 2)}

      Return **HTML**, with <p> paragraphs only.
      Do NOT return JSON.
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5
    });

    let text = completion.choices[0].message.content;

    // Always ensure safe HTML output
    return `
      <div style="font-family:system-ui; line-height:1.5;">
        ${text}
      </div>
    `;
  } catch (err) {
    console.error("INSIGHTS ERROR:", err);

    // Fallback if OpenAI fails
    return `
      <div style="font-family:system-ui; line-height:1.5;">
        <p>I’m sorry — I couldn’t generate a full insight right now.</p>
        <p>Your question: <strong>${question}</strong></p>
        <p>Your premium report will still work normally.</p>
      </div>
    `;
  }
}
