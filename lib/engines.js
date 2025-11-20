// /lib/engines.js
import { classifyQuestion } from "../lib/ai.js";

/**
 * Palm analysis engine (textual / metadata), formerly analyze-palm.js
 */
export async function analyzePalm({ imageDescription, handMeta }) {
  const prompt = `
You are a palmistry analyst. Return JSON ONLY.

Fields:
- "life_line": string
- "head_line": string
- "heart_line": string
- "overall": string

Image description: ${imageDescription || "N/A"}
Metadata: ${JSON.stringify(handMeta || {}, null, 2)}
`;

  return completeJson(prompt);
}

/**
 * Numerology engine (name + DOB), previously some numerology file.
 */
export async function analyzeNumerology({ fullName, dateOfBirth }) {
  const prompt = `
You are a numerology expert. Return JSON ONLY.

Fields:
- "life_path": { "number": number, "meaning": string }
- "expression": { "number": number, "meaning": string }
- "soul_urge": { "number": number, "meaning": string }
- "summary": string

Name: "${fullName}"
DOB: "${dateOfBirth}"
`;
  return completeJson(prompt);
}

/**
 * Astrology-style engine based on birth data.
 */
export async function analyzeAstrology({ birthDate, birthTime, birthLocation }) {
  const prompt = `
You are an astrologer generating a condensed birth chart interpretation.
Return JSON ONLY.

Fields:
- "sun": { "sign": string, "meaning": string }
- "moon": { "sign": string, "meaning": string }
- "rising": { "sign": string, "meaning": string }
- "themes": string[]
- "summary": string

Input:
- Date: ${birthDate}
- Time: ${birthTime}
- Location: ${birthLocation}
`;
  return completeJson(prompt);
}
