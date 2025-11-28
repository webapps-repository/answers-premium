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
   - This is the "AI-Generated Score" engine you approved.
--------------------------------------------------------- */
async function analyzeCompatibility({ question, compat1, compat2 }) {
  const prompt = `
Return STRICT JSON ONLY:

{
  "score": number,                      // 0–100 overall compatibility
  "summary": string,                    // 2–3 sentence overview for both
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
    "comparison": string                // brief comparison of key numbers
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
    "comparison": string                // how their charts interact
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
    "comparison": string                // how their hands complement/contrast
  },
  "strengths": string,                  // bullet-style text (use \\n or •)
  "challenges": string,                 // bullet-style text
  "overallAdvice": string               // concise guidance on the connection
}

User's question: "${question}"

Person 1 (P1) details:
${JSON.stringify(compat1 || {})}

Person 2 (P2) details:
${JSON.stringify(compat2 || {})}

Rules:
- "score" MUST be between 0 and 100.
- Be concise and specific: this output will feed a comparison table.
- Do NOT include any extra keys beyond the ones in the JSON schema.
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

  /* ============================
       PERSONAL MODE
  ============================ */
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

  /* ============================
       COMPATIBILITY MODE
       (Unified compatibility engine)
  ============================ */

  // Person-1 base engines (these feed your "Your Details" + triad)
  const palmistry = await analyzePalm(uploadedFile);
  const numerology = await analyzeNumerology(question);
  const astrology = await analyzeAstrology(question);

  const triad = await analyzeTriad({ palmistry, numerology, astrology });

  // Unified compatibility engine (uses both people + question)
  const compatOut = await analyzeCompatibility({
    question,
    compat1,
    compat2
  });

  // Normalised AI score 0–100
  let compatScore = 0;
  if (compatOut && typeof compatOut.score !== "undefined") {
    const raw = Number(compatOut.score);
    if (Number.isFinite(raw)) {
      const clamped = Math.max(0, Math.min(100, Math.round(raw)));
      compatScore = clamped;
    }
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
    compat: compatOut,   // full structured compatibility block
    compatScore          // AI-generated 0–100 score (for short answer + email)
  };
}
