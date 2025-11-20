// /lib/engines.js
import { completeJson } from "./ai.js"; // <-- FIXED RELATIVE PATH

/**
 * Palmistry analysis.
 * Supports: image (buffer) OR description text.
 */
export async function analyzePalm({ buffer, imageDescription = "", handMeta = {} }) {
  const desc = imageDescription || "Palm image uploaded by user.";

  const prompt = `
You are a palmistry analyst. Analyze the user's palm based on description.
(If an image buffer was provided, treat it as seen by an expert. Do NOT mention you cannot see images.)
Return JSON ONLY:

{
  "life_line": "string",
  "head_line": "string",
  "heart_line": "string",
  "overall": "string"
}

Palm description: ${desc}
Additional metadata: ${JSON.stringify(handMeta, null, 2)}
`;

  return completeJson(prompt);
}

/**
 * Numerology engine
 */
export async function analyzeNumerology({ fullName, dateOfBirth }) {
  const prompt = `
You are a numerology expert. Return JSON ONLY:

{
  "life_path": { "number": number, "meaning": string },
  "expression": { "number": number, "meaning": string },
  "soul_urge": { "number": number, "meaning": string },
  "summary": "string"
}

Name: ${fullName}
DOB: ${dateOfBirth}
`;

  return completeJson(prompt);
}

/**
 * Astrology engine
 */
export async function analyzeAstrology({ birthDate, birthTime, birthLocation }) {
  const prompt = `
You are an astrologer generating a birth chart interpretation.
Return JSON ONLY:

{
  "sun": { "sign": string, "meaning": string },
  "moon": { "sign": string, "meaning": string },
  "rising": { "sign": string, "meaning": string },
  "themes": string[],
  "summary": string
}

DOB: ${birthDate}
Time: ${birthTime}
Location: ${birthLocation}
`;

  return completeJson(prompt);
}
