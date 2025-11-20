// /lib/insights.js
import { analyzePalm, analyzeNumerology, analyzeAstrology } from "../lib/engines";

/**
 * Run all engines and return a single “insights” object.
 * Replaces generate-insights.js and synthesize-triad.js.
 */
export async function generateInsights({ question, meta, enginesInput }) {
  const { palm, numerology, astrology } = enginesInput || {};

  const [palmResult, numerologyResult, astrologyResult] = await Promise.all([
    palm ? analyzePalm(palm) : null,
    numerology ? analyzeNumerology(numerology) : null,
    astrology ? analyzeAstrology(astrology) : null
  ]);

  // High-level synthesis you previously had in synthesize-triad.js
  const synthesis = {
    themes: [],
    alignment_score: 0.0,
    summary: ""
  };

  // Very basic synthesis logic – replace with your richer version.
  const bullets = [];

  if (palmResult?.overall) bullets.push(`Palmistry: ${palmResult.overall}`);
  if (numerologyResult?.summary) bullets.push(`Numerology: ${numerologyResult.summary}`);
  if (astrologyResult?.summary) bullets.push(`Astrology: ${astrologyResult.summary}`);

  synthesis.summary = bullets.join("\n");
  synthesis.themes = bullets.slice(0, 5);
  synthesis.alignment_score = 0.7; // placeholder; you can compute from engines

  return {
    question,
    meta: meta || {},
    palm: palmResult,
    numerology: numerologyResult,
    astrology: astrologyResult,
    synthesis
  };
}

/**
 * Generate the FINAL technical HTML report from insights.
 * This is the old generate-technical.js.
 */
export function generateTechnicalReportHTML(insights) {
  const { question, meta, palm, numerology, astrology, synthesis } = insights;

  // Server log for debugging full charts (as per your earlier choice "store full charts")
  console.log("FULL_INSIGHTS_FOR_DEBUG", JSON.stringify(insights, null, 2));

  // Minimal but structured HTML; style it however you want.
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Technical Spiritual Report</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 32px; line-height: 1.5; }
    h1, h2, h3 { margin-bottom: 0.4em; }
    .section { margin-bottom: 24px; }
    .tag { display: inline-block; padding: 2px 8px; margin-right: 8px; border-radius: 999px; border: 1px solid #ccc; font-size: 12px; }
    .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
    pre { white-space: pre-wrap; font-family: inherit; }
  </style>
</head>
<body>
  <h1>Technical Spiritual Report</h1>
  <div class="meta">
    <div><strong>Question:</strong> ${question || "N/A"}</div>
    ${meta?.email ? `<div><strong>Email:</strong> ${meta.email}</div>` : ""}
    ${meta?.name ? `<div><strong>Name:</strong> ${meta.name}</div>` : ""}
  </div>

  <div class="section">
    <h2>Synthesis Overview</h2>
    <p><strong>Alignment Score:</strong> ${(synthesis?.alignment_score ?? 0).toFixed(2)}</p>
    <pre>${synthesis?.summary || "No synthesis summary available."}</pre>
    <div>
      ${(synthesis?.themes || []).map(t => `<span class="tag">${t}</span>`).join(" ")}
    </div>
  </div>

  <div class="section">
    <h2>Palmistry</h2>
    <pre>${palm?.overall || "No palmistry data."}</pre>
  </div>

  <div class="section">
    <h2>Numerology</h2>
    <pre>${numerology?.summary || "No numerology data."}</pre>
  </div>

  <div class="section">
    <h2>Astrology</h2>
    <pre>${astrology?.summary || "No astrology data."}</pre>
  </div>
</body>
</html>
`;
}
