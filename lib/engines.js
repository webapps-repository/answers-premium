// /lib/engines.js — Final Unified Personal + Compatibility Engine

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
   TRIAD ENGINE
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
   DIRECT ANSWER ENGINE
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
   UNIVERSAL SUMMARY (SHORT ANSWER)
--------------------------------------------------------- */
async function analyzeSummary({ question, palmistry, numerology, astrology }) {
  const prompt = `
Return STRICT JSON ONLY:
{
  "summary": string
}

Blend astrology, numerology, palmistry + question into 2–3 sentences.
Question: "${question}"
`;
  return await completeJson(prompt);
}

/* ---------------------------------------------------------
   UNIFIED COMPATIBILITY ENGINE (AI-Generated Score)
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
    }
  },

  "astrology": {
    "person1": {
      "sun": string,
      "moon": string,
      "rising": string
    },
    "person2": {
      "sun": string,
      "moon": string,
      "rising": string
    }
  },

  "palmistry": {
    "person1": {
      "life": string,
      "head": string,
      "heart": string
    },
    "person2": {
      "life": string,
      "head": string,
      "heart": string
    }
  },

  "strengths": string,
  "challenges": string,
  "overall": string
}

User's question: "${question}"

P1: ${JSON.stringify(compat1 || {})}
P2: ${JSON.stringify(compat2 || {})}

Rules:
- score MUST be 0–100
- NO emojis
- Short, factual, structured
`;
  return await completeJson(prompt);
}

/* ---------------------------------------------------------
   MAIN EXPORT
--------------------------------------------------------- */
export async function runAllEngines({
  question,
  mode,
  uploadedFile,
  compat1,
  compat2
}) {

  /* PERSONAL MODE */
  if (mode !== "compat") {
    const palmistry = await analyzePalm(uploadedFile);
    const numerology = await analyzeNumerology(question);
    const astrology = await analyzeAstrology(question);

    const triad = await analyzeTriad({ palmistry, numerology, astrology });

    const answerOut = await analyzeDirectAnswer(question);

    const summaryOut = await analyzeSummary({
      question, palmistry, numerology, astrology
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

  /* COMPAT MODE */
  const palmistry = await analyzePalm(uploadedFile);
  const numerology = await analyzeNumerology(question);
  const astrology = await analyzeAstrology(question);
  const triad = await analyzeTriad({ palmistry, numerology, astrology });

  const compatOut = await analyzeCompatibility({
    question,
    compat1,
    compat2
  });

  let compatScore = 0;
  if (compatOut?.score !== undefined) {
    const raw = Number(compatOut.score);
    compatScore = Math.max(0, Math.min(100, Math.round(raw)));
  }

  const summaryOut = await analyzeSummary({
    question, palmistry, numerology, astrology
  });

  return {
    mode: "compat",
    summary: summaryOut.summary || "",
    palmistry,
    numerology,
    astrology,
    triad,
    compat: compatOut,
    compatScore
  };
}
