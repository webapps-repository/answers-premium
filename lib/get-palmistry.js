// /lib/get-palmistry.js

// If you don't want to use the official OpenAI SDK, you can swap this to fetch().
import OpenAI from "openai";

function hasOpenAIKey() {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * options = {
 *   imageBase64?: string,  // base64-encoded hand image
 *   handSide?: "left" | "right",
 *   fullName?: string,
 * }
 */
export async function getPalmistry(options = {}) {
  const { imageBase64, handSide = "left", fullName = "" } = options;

  // No image provided – return a gentle, generic palm reading
  if (!imageBase64 || !hasOpenAIKey()) {
    return {
      offline: true,
      meta: {
        message:
          "Palmistry image or OpenAI key not provided – using generic palmistry guidance.",
      },
      summary:
        "Your hands suggest a sensitive and perceptive soul with strong potential for spiritual growth and creative self-expression.",
      lines: [],
      mounts: [],
      symbols: [],
    };
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `
You are a modern palmistry expert.

Analyse this single image of the ${handSide} hand${fullName ? " belonging to " + fullName : ""}.
Describe:

1. Overall energy of the hand (element: earth, air, fire, water).
2. Major lines (heart, head, life, fate): strength, clarity, breaks.
3. Important mounts (Venus, Jupiter, Saturn, Sun, Mercury).
4. Any special markings (stars, crosses, islands).
5. A short, empowering interpretation in 3-5 bullet points.

Return a concise JSON-like structure in plain text:
- summary (2–3 sentences)
- lines[]: { name, traits }
- mounts[]: { name, traits }
- symbols[]: { name, meaning }
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
    temperature: 0.8,
  });

  const text =
    response.choices?.[0]?.message?.content ||
    "No palmistry interpretation produced.";

  return {
    offline: false,
    meta: {
      source: "OpenAI gpt-4o-mini vision",
      analysedAt: new Date().toISOString(),
    },
    // We keep it simple: store raw text and optionally parse on frontend later.
    raw: text,
  };
}
