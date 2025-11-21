// /lib/engines.js
import { completeJson } from "./ai.js";

export async function analyzePalm({ imageDescription, handMeta }) {
  const prompt = `
You are a palmistry analyst. Return JSON ONLY.

{
  "life_line": string,
  "head_line": string,
  "heart_line": string,
  "overall": string
}

Image: ${imageDescription || "N/A"}
Metadata: ${JSON.stringify(handMeta || {})}
`;
  return completeJson(prompt);
}

export async function analyzeNumerology({ fullName, dateOfBirth }) {
  const prompt = `
You are a numerology expert. Return JSON ONLY.

{
  "life_path": { "number": number, "meaning": string },
  "expression": { "number": number, "meaning": string },
  "soul_urge": { "number": number, "meaning": string },
  "summary": string
}

Name: "${fullName}"
DOB: "${dateOfBirth}"
`;
  return completeJson(prompt);
}

export async function analyzeAstrology({ birthDate, birthTime, birthLocation }) {
  const prompt = `
You are an astrologer. Return JSON ONLY.

{
  "sun": { "sign": string, "meaning": string },
  "moon": { "sign": string, "meaning": string },
  "rising": { "sign": string, "meaning": string },
  "themes": string[],
  "summary": string
}

Birth date: ${birthDate}
Birth time: ${birthTime}
Birth location: ${birthLocation}
`;
  return completeJson(prompt);
}
