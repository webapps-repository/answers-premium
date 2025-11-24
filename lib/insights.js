// /lib/insights.js — Stage-3 (HTML Email Only)

import { completeJson } from "./ai.js";

/* ============================================================
   1) SHORT ANSWER SUMMARY HTML
============================================================ */
export function buildSummaryHTML({ classification, engines, question }) {
  const short = engines?.summary || "(No summary generated)";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.55;color:#222;">
      <div style="font-size:1.05rem;">
        ${escape(short)}
      </div>
    </div>
  `;
}

/* ============================================================
   2) PERSONAL FULL EMAIL HTML
============================================================ */
export function buildPersonalEmailHTML({
  question,
  engines,
  fullName,
  birthDate,
  birthTime,
  birthPlace
}) {
  const ast = engines.astrology || {};
  const num = engines.numerology || {};
  const palm = engines.palmistry || {};

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:auto;line-height:1.65;color:#222;">

    <h2 style="text-align:center;color:#6c63ff;margin-bottom:10px;">
      Your Personal AI Insight Report
    </h2>

    <div style="background:#f6f4ff;padding:14px;border-radius:10px;margin-bottom:18px;">
      <p><strong>Name:</strong> ${escape(fullName)}</p>
      <p><strong>DOB:</strong> ${escape(birthDate)} — <strong>Time:</strong> ${escape(birthTime)}</p>
      <p><strong>Birth Place:</strong> ${escape(birthPlace)}</p>
      <p><strong>Question:</strong> ${escape(question)}</p>
    </div>

    <h3 style="color:#6c63ff;margin:14px 0 6px;">Your Answer</h3>
    <p>${escape(engines.summary)}</p>

    <!-- ASTROLOGY -->
    <h3 style="color:#6c63ff;margin:20px 0 6px;">Astrology</h3>
    <p>${escape(ast.summary)}</p>
    <p><strong>Planetary Positions:</strong> ${escape(ast.planetaryPositions)}</p>
    <p><strong>Ascendant:</strong> ${escape(ast.ascendant)}</p>
    <p><strong>Houses:</strong> ${escape(ast.houses)}</p>
    <p><strong>Family:</strong> ${escape(ast.family)}</p>
    <p><strong>Love:</strong> ${escape(ast.loveHouse)}</p>
    <p><strong>Health:</strong> ${escape(ast.health)}</p>
    <p><strong>Career:</strong> ${escape(ast.career)}</p>

    <!-- NUMEROLOGY -->
    <h3 style="color:#6c63ff;margin:20px 0 6px;">Numerology</h3>
    <p>${escape(num.summary)}</p>
    <p><strong>Life Path:</strong> ${escape(num.lifePath)}</p>
    <p><strong>Expression:</strong> ${escape(num.expression)}</p>
    <p><strong>Personality:</strong> ${escape(num.personality)}</p>
    <p><strong>Soul Urge:</strong> ${escape(num.soulUrge)}</p>
    <p><strong>Maturity:</strong> ${escape(num.maturity)}</p>

    <!-- PALMISTRY -->
    <h3 style="color:#6c63ff;margin:20px 0 6px;">Palmistry</h3>
    <p>${escape(palm.summary)}</p>
    <p><strong>Life Line:</strong> ${escape(palm.lifeLine)}</p>
    <p><strong>Head Line:</strong> ${escape(palm.headLine)}</p>
    <p><strong>Heart Line:</strong> ${escape(palm.heartLine)}</p>
    <p><strong>Fate Line:</strong> ${escape(palm.fateLine)}</p>
    <p><strong>Thumb:</strong> ${escape(palm.thumb)}</p>
    <p><strong>Index Finger:</strong> ${escape(palm.indexFinger)}</p>
    <p><strong>Middle Finger:</strong> ${escape(palm.middleFinger)}</p>
    <p><strong>Ring Finger:</strong> ${escape(palm.ringFinger)}</p>
    <p><strong>Pinky Finger:</strong> ${escape(palm.pinkyFinger)}</p>
    <p><strong>Mounts:</strong> ${escape(palm.mounts)}</p>
    <p><strong>Marriage Lines:</strong> ${escape(palm.marriage)}</p>
    <p><strong>Children Lines:</strong> ${escape(palm.children)}</p>
    <p><strong>Travel Lines:</strong> ${escape(palm.travelLines)}</p>
    <p><strong>Stress Lines:</strong> ${escape(palm.stressLines)}</p>

    <p style="margin-top:25px;color:#888;font-size:0.9rem;">
      Sent automatically by your AI Insight System.
    </p>

  </div>
  `;
}

/* ============================================================
   3) TECHNICAL MODE ENGINE → returns structured JSON
============================================================ */
export async function generateInsights({ question, enginesInput }) {
  const prompt = `
Return STRICT JSON ONLY:

{
  "insights": string,
  "recommendations": string,
  "summary": string
}

Question: "${question}"
`;

  const out = await completeJson(prompt);
  return out || {};
}

/* ============================================================
   Helpers
============================================================ */
function escape(str = "") {
  return String(str).replace(/[&<>"]/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;"
  }[c] || c));
}
