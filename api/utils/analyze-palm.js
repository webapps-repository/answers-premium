// /api/utils/analyze-palm.js
// Palmistry engine (placeholder until full Vision model upgrade)

import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzePalmImage(imagePath) {
  try {
    // FIX — treat null, undefined, empty string the same
    if (!imagePath || imagePath === "undefined") {
      return {
        hasImage: false,
        summary: "No palm image uploaded.",
        features: {}
      };
    }

    // Read image file from disk
    const fs = await import("fs");
    const imageBuffer = fs.readFileSync(imagePath);

    // Upload to GPT-4.1 Vision model
    const resp = await client.chat.completions.create({
      model: "gpt-4.1-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this palm image. Return structured palm lines, markings, and traits." },
            { type: "image", image: imageBuffer }
          ]
        }
      ]
    });

    const text = resp.choices[0].message?.content || "";

    return {
      hasImage: true,
      summary: text,
      // optional: add a parsed features object later
      features: {}
    };

  } catch (err) {
    console.error("PALMISTRY ERROR:", err);
    return {
      hasImage: false,
      summary: "Palmistry analysis failed.",
      features: {}
    };
  }
}
