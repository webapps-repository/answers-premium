// /lib/engines.js — Stage-3 (HTML-only engines)

import { completeJson } from "./ai.js";

/* ---------------------------------------------------------
   PALMISTRY ENGINE
--------------------------------------------------------- */
async function analyzePalm(file) {
  const description = file
    ? "User uploaded a palm photo. Describe palmistry insights based on a typical right-hand photo."
    : "No palm image provided. Use a generic palmistry reading.";

  const prompt = `
Return STRICT JSON ONLY:

{
  "summary": string,
  "lifeLine": string,
  "headLine": string,
  "heartLine": string,
  "fateLine": string,
  "thumb": string,
  "indexFinger": string,
  "middleFinger": string,
  "ringFinger": string,
  "pinkyFinger": string,
  "mounts": string,
  "marriage": string,
  "children": string,
  "travelLines": string,
  "stressLines": string
}

Palm image info: ${description}
`;

  return await completeJson(prompt);
}

/* ---------------------------------------------------------
   NUMEROLOGY ENGINE
--------------------------------------------------------- */
async function analyzeNumerology(question) {
  const prompt = `
Return STRICT JSON ONLY:

{
  "summary": string,
  "lifePath": string,
  "expression": string,
  "personality": string,
  "soulUrge": string,
  "maturity": string
}

User asked: "${question}"
`;

  return await completeJson(prompt);
}

/* ---------------------------------------------------------
   ASTROLOGY ENGINE
--------------------------------------------------------- */
async function analyzeAstrology(question) {
  const prompt = `
Return STRICT JSON ONLY:

{
  "summary": string,
  "planetaryPositions": string,
  "ascendant": string,
  "houses": string,
  "family": string,
  "loveHouse": string,
  "health": string,
  "career": string
}

User asked: "${question}"
`;

  return await completeJson(prompt);
}

/* ---------------------------------------------------------
   TRIAD ENGINE (blends all 3)
--------------------------------------------------------- */
async function analyzeTriad({ palmistry, numerology, astrology }) {
  const prompt = `
Return STRICT JSON ONLY:

{
  "summary": string,
  "combinedInsight": string,
  "shadow": string,
  "growth": string
}

Palmistry: ${JSON.stringify(palmistry)}
Numerology: ${JSON.stringify(numerology)}
Astrology: ${JSON.stringify(astrology)}
`;

  return await completeJson(prompt);
}

/* ---------------------------------------------------------
   MAIN ENGINE → Stage-3
--------------------------------------------------------- */
export async function runAllEngines({ question, mode, uploadedFile }) {
  // 1) Palm
  const palmistry = await analyzePalm(uploadedFile);

  // 2) Numerology
  const numerology = await analyzeNumerology(question);

  // 3) Astrology
  const astrology = await analyzeAstrology(question);

  // 4) Triad (fusion)
  const triad = await analyzeTriad({ palmistry, numerology, astrology });

  // 5) Universal summary (used for short answer)
  const prompt = `
Return STRICT JSON ONLY:

{
  "summary": string
}

Generate a single short readable summary combining:
- astrology
- numerology
- palmistry
- question context

Question: "${question}"
`;

  const summary = await completeJson(prompt);

  return {
    summary: summary?.summary || "",
    palmistry,
    numerology,
    astrology,
    triad
  };
}
