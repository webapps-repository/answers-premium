// /lib/engines.js — Stage-4 (Personal + Compatibility engines)

import { completeJson } from "../lib/ai.js";

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
   NUMEROLOGY ENGINE (PERSONAL)
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
   ASTROLOGY ENGINE (PERSONAL)
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
   TRIAD ENGINE (fusion of all 3)
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
   DIRECT ANSWER ENGINE (PERSONAL)
--------------------------------------------------------- */
async function analyzeDirectAnswer(question) {
  const prompt = `
Return STRICT JSON ONLY:
{
  "answer": string
}

Provide a short direct answer to:
"${question}"
`;
  return await completeJson(prompt);
}

/* ---------------------------------------------------------
   UNIVERSAL SUMMARY (for short answer)
--------------------------------------------------------- */
async function analyzeSummary({ question, palmistry, numerology, astrology }) {
  const prompt = `
Return STRICT JSON ONLY:
{
  "summary": string
}

Create a short 2–3 sentence blended summary using:
- astrology
- numerology
- palmistry
- the user's question

Question: "${question}"
`;
  return await completeJson(prompt);
}

/* ---------------------------------------------------------
   UNIFIED COMPATIBILITY ENGINE (AI score + comparison data)
--------------------------------------------------------- */
async function analyzeCompatibility({ question, compat1, compat2 }) {
  const prompt = `
Return STRICT JSON ONLY:

{
  "score": number,
  "summary": string,

  "numerology": {
    "person1": {
      "lifePath": string,
      "expression": string,
      "soulUrge": string,
      "maturity": string
    },
    "person2": {
      "lifePath": string,
      "expression": string,
      "soulUrge": string,
      "maturity": string
    },
    "comparison": string
  },

  "astrology": {
    "person1": {
      "keyTraits": string,
      "loveStyle": string,
      "challenges": string
    },
    "person2": {
      "keyTraits": string,
      "loveStyle": string,
      "challenges": string
    },
    "comparison": string
  },

  "palmistry": {
    "person1": {
      "keyFeatures": string,
      "loveLines": string,
      "temperament": string
    },
    "person2": {
      "keyFeatures": string,
      "loveLines": string,
      "temperament": string
    },
    "comparison": string
  },

  "strengths": string,
  "challenges": string,
  "overallAdvice": string
}

User's question: "${question}"

Person 1:
${JSON.stringify(compat1 || {})}

Person 2:
${JSON.stringify(compat2 || {})}

Rules:
- score must be 0–100
- do NOT add extra fields
- be concise, structured
`;
  return await completeJson(prompt);
}

/* ---------------------------------------------------------
   MAIN EXPORT — COMPATIBILITY AWARE
--------------------------------------------------------- */
export async function runAllEngines({
  question,
  mode,
  uploadedFile,
  compat1,
  compat2
}) {

  /* =======================================
        PERSONAL MODE
  ======================================= */
  if (mode !== "compat") {

    const palmistry = await analyzePalm(uploadedFile);
    const numerology = await analyzeNumerology(question);
    const astrology = await analyzeAstrology(question);

    const triad = await analyzeTriad({ palmistry, numerology, astrology });

    const answerOut = await analyzeDirectAnswer(question);

    const summaryOut = await analyzeSummary({
      question,
      palmistry,
      numerology,
      astrology
    });

    return {
      mode: "personal",
      answer: answerOut?.answer || "",
      summary: summaryOut?.summary || "",
      palmistry,
      numerology,
      astrology,
      triad
    };
  }

  /* =======================================
        COMPATIBILITY MODE
  ======================================= */

  // Person 1 personal engines (used for "Your Details")
  const palmistry = await analyzePalm(uploadedFile);
  const numerology = await analyzeNumerology(question);
  const astrology = await analyzeAstrology(question);

  const triad = await analyzeTriad({ palmistry, numerology, astrology });

  // Unified AI compatibility engine
  const compatOut = await analyzeCompatibility({
    question,
    compat1,
    compat2
  });

  // Safe, normalized score
  let compatScore = 0;
  if (compatOut?.score !== undefined) {
    const raw = Number(compatOut.score);
    compatScore = Number.isFinite(raw)
      ? Math.max(0, Math.min(100, Math.round(raw)))
      : 0;
  }

  const summaryOut = await analyzeSummary({
    question,
    palmistry,
    numerology,
    astrology
  });

  return {
    mode: "compat",
    summary: summaryOut?.summary || "",
    palmistry,
    numerology,
    astrology,
    triad,
    compat: compatOut,
    compatScore
  };
}
