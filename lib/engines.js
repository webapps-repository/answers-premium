// /lib/engines.js — Unified compatibility + personal system (with strict placeholder palm fields)

import { completeJson } from "../lib/ai.js";

/* ============================================================
   PALMISTRY — STRICT PLACEHOLDER WHEN NO FILE
============================================================ */
async function analyzePalm(file) {
  if (!file) {
    return {
      summary: "No palm image provided",
      lifeLine: "No palm image provided",
      headLine: "No palm image provided",
      heartLine: "No palm image provided",
      fateLine: "No palm image provided",
      thumb: "No palm image provided",
      indexFinger: "No palm image provided",
      middleFinger: "No palm image provided",
      ringFinger: "No palm image provided",
      pinkyFinger: "No palm image provided",
      mounts: "No palm image provided",
      marriage: "No palm image provided",
      children: "No palm image provided",
      travelLines: "No palm image provided",
      stressLines: "No palm image provided"
    };
  }

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

Palm image info: User uploaded a palm photo.
`;
  return await completeJson(prompt);
}

/* ============================================================
   PERSONAL ASTROLOGY
============================================================ */
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

/* ============================================================
   PERSONAL NUMEROLOGY
============================================================ */
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

/* ============================================================
   TRIAD (fusion)
============================================================ */
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

/* ============================================================
   SIMPLE DIRECT ANSWER ("Should we get married?")
============================================================ */
async function analyzeDirectAnswer(q) {
  const prompt = `
Return STRICT JSON ONLY:
{
  "answer": string
}

Provide a direct clear answer (YES/NO + brief reasoning) to:
"${q}"
`;
  return await completeJson(prompt);
}

/* ============================================================
   SUMMARY (short display)
============================================================ */
async function analyzeSummary({ question, palmistry, numerology, astrology }) {
  const prompt = `
Return STRICT JSON ONLY:
{
  "summary": string
}

Create a short 2–3 sentence blended insight:
Question: "${question}"
Palmistry: ${palmistry.summary}
Numerology: ${numerology.summary}
Astrology: ${astrology.summary}
`;
  return await completeJson(prompt);
}

/* ============================================================
   UNIFIED COMPATIBILITY ENGINE (AI-generated score + details)
============================================================ */
async function analyzeCompatibility({ question, compat1, compat2 }) {
  const prompt = `
Return STRICT JSON ONLY:

{
  "score": number,
  "summary": string,
  "answerToQuestion": string,
  "reasoning": string,

  "num_lifePath1": string,
  "num_lifePath2": string,
  "num_expression1": string,
  "num_expression2": string,
  "num_soulUrge1": string,
  "num_soulUrge2": string,
  "num_personality1": string,
  "num_personality2": string,

  "astro_sun1": string,
  "astro_sun2": string,
  "astro_moon1": string,
  "astro_moon2": string,
  "astro_rising1": string,
  "astro_rising2": string,

  "palm_life1": string,
  "palm_life2": string,
  "palm_head1": string,
  "palm_head2": string,
  "palm_heart1": string,
  "palm_heart2": string,

  "coreCompatibility": string,
  "strengths": string,
  "challenges": string,
  "overall": string
}

User asked: "${question}"

Person1: ${JSON.stringify(compat1)}
Person2: ${JSON.stringify(compat2)}
`;
  return await completeJson(prompt);
}

/* ============================================================
   MAIN EXPORT
============================================================ */
export async function runAllEngines({
  question,
  mode,
  uploadedFile,
  compat1,
  compat2,
  palm1File,
  palm2File
}) {

  /* ------------------------------------------
     PERSONAL MODE
  ------------------------------------------ */
  if (mode !== "compat") {
    const palmistry = await analyzePalm(palm1File || uploadedFile);

    const numerology = await analyzeNumerology(question);
    const astrology = await analyzeAstrology(question);
    const triad = await analyzeTriad({ palmistry, numerology, astrology });
    const direct = await analyzeDirectAnswer(question);

    const summary = await analyzeSummary({
      question,
      palmistry,
      numerology,
      astrology
    });

    return {
      mode: "personal",
      directAnswer: direct.answer,
      summary: summary.summary,
      palmistry,
      numerology,
      astrology,
      triad
    };
  }

  /* ------------------------------------------
     COMPATIBILITY MODE
  ------------------------------------------ */
  const palm1 = await analyzePalm(palm1File);
  const palm2 = await analyzePalm(palm2File);

  const compatOut = await analyzeCompatibility({
    question,
    compat1,
    compat2
  });

  const score = Math.max(0, Math.min(100, Math.round(Number(compatOut.score || 0))));

  return {
    mode: "compat",
    compat: compatOut,
    compatScore: score,
    palm1,
    palm2
  };
}
