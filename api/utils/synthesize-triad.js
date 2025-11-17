// /api/utils/synthesize-triad.js
// -----------------------------------------------------------
// Merges Astrology + Numerology + Palmistry into unified report
// -----------------------------------------------------------

export function synthesizeTriad({
  question,
  intent,
  astrology,
  numerology,
  palmistry,
}) {
  return {
    shortAnswer: generateShortAnswer({ question, intent, astrology, numerology }),
    astroInterpretation: generateAstrologyInterpretation({
      question,
      intent,
      astrology,
    }),
    numerologyInterpretation: generateNumerologyInterpretation({
      question,
      intent,
      numerology,
    }),
    palmInterpretation: generatePalmistryInterpretation({
      question,
      intent,
      palmistry,
    }),
    combined: generateCombinedSynthesis({
      question,
      intent,
      astrology,
      numerology,
      palmistry,
    }),
    timeline: generateTimeline({ intent, astrology, numerology }),
    recommendations: generateRecommendations({
      intent,
      astrology,
      numerology,
      palmistry,
    }),
  };
}

// ==========================================================
// SHORT ANSWER
// ==========================================================
function generateShortAnswer({ question, intent, astrology, numerology }) {
  return `The energies around your question — "${question}" — show strong movement in the area of ${intent}. Both your chart and numerology indicate clarity emerging over the coming cycle.`;
}

// ==========================================================
// ASTROLOGY SECTION
// ==========================================================
function generateAstrologyInterpretation({ question, intent, astrology }) {
  return `
Your astrological configuration gives significant insight into your question about ${intent}.

Key placements:
• Sun: ${astrology?.sun}
• Moon: ${astrology?.moon}
• Rising: ${astrology?.rising}

These highlight your emotional drivers, identity path, and how life events align with your question: "${question}".
  `;
}

// ==========================================================
// NUMEROLOGY SECTION
// ==========================================================
function generateNumerologyInterpretation({ question, intent, numerology }) {
  return `
Numerology reveals the timing + personal cycles influencing your question.

• Life Path ${numerology?.lifePath}: ${numerology?.lifePathMeaning}
• Personal Year ${numerology?.personalYear}: ${numerology?.personalYearMeaning}

This cycle influences how events unfold around "${question}" in the domain of ${intent}.
  `;
}

// ==========================================================
// PALMISTRY SECTION
// ==========================================================
function generatePalmistryInterpretation({ question, intent, palmistry }) {
  return `
Your palm reveals deeper subconscious patterns shaping this area.

• Heart Line: ${palmistry?.features?.heartLine}
• Head Line: ${palmistry?.features?.headLine}
• Life Line: ${palmistry?.features?.lifeLine}
• Fate Line: ${palmistry?.features?.fateLine}

These reflect emotional, mental, and energetic themes connected to your question: "${question}".
  `;
}

// ==========================================================
// COMBINED SYNTHESIS
// ==========================================================
function generateCombinedSynthesis({
  question,
  intent,
  astrology,
  numerology,
  palmistry,
}) {
  return `
Astrology shows **why** this area matters.
Numerology shows **when** movement occurs.
Palmistry shows **how** your personal patterns shape the path forward.

Together they reveal a unified message regarding: "${question}"
The direction of ${intent} is aligning toward clarity and resolution.
  `;
}

// ==========================================================
// TIMELINE (ASTROLOGY + NUMEROLOGY)
// ==========================================================
function generateTimeline({ intent, astrology, numerology }) {
  return `
Your strongest momentum appears in:
• Personal Year ${numerology?.personalYear}
• Months ${numerology?.personalMonthRange}

Astrological support:
• ${astrology?.transit1}
• ${astrology?.transit2}

This is the window where progress in ${intent} accelerates.
  `;
}

// ==========================================================
// RECOMMENDATIONS
// ==========================================================
function generateRecommendations({ intent, astrology, numerology, palmistry }) {
  return `
To align with these energies:

1. Lean into the strengths shown in your Sun and Rising signs.
2. Follow the rhythm of your Personal Year cycle.
3. Notice emotional cues from your Moon placement.
4. Take action during beneficial transit periods.
5. Align decisions with the intuitive indicators shown in your palm.

These steps help you manifest the best outcome in the domain of ${intent}.
  `;
}
