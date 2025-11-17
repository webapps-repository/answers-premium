// /api/utils/synthesize-triad.js
// This file merges astrology + numerology + palmistry + question intent
// into a single unified interpretation for PDFs and on-page display.

export function synthesizeTriad({
  question,
  intent,           // “love”, “career”, “spiritual”, “money”, “health”, etc.
  astrology,
  numerology,
  palmistry
}) {
  // ---------------------------------------------
  // 1. Short Answer (1–2 sentences, very direct)
  // ---------------------------------------------
  const shortAnswer = generateShortAnswer({
    question,
    intent,
    astrology,
    numerology,
    palmistry
  });

  // ---------------------------------------------
  // 2. Astrological Interpretation (contextualized)
  // ---------------------------------------------
  const astroInterpretation = generateAstrologicalInterpretation({
    question,
    intent,
    astrology
  });

  // ---------------------------------------------
  // 3. Numerology Interpretation (contextualized)
  // ---------------------------------------------
  const numerologyInterpretation =
    generateNumerologicalInterpretation({
      question,
      intent,
      numerology
    });

  // ---------------------------------------------
  // 4. Palmistry Interpretation (contextualized)
  // ---------------------------------------------
  const palmInterpretation = generatePalmistryInterpretation({
    question,
    intent,
    palmistry
  });

  // ---------------------------------------------
  // 5. Combined Synthesis (triangulation)
  // ---------------------------------------------
  const combined = generateCombinedSynthesis({
    question,
    intent,
    astrology,
    numerology,
    palmistry
  });

  // ---------------------------------------------
  // 6. Timeline / Forecast
  // ---------------------------------------------
  const timeline = generateTimeline({
    intent,
    astrology,
    numerology
  });

  // ---------------------------------------------
  // 7. Actionable Recommendations
  // ---------------------------------------------
  const recommendations = generateRecommendations({
    intent,
    astrology,
    numerology,
    palmistry
  });

  // Unified structure returned to insights → PDF → API
  return {
    shortAnswer,
    astroInterpretation,
    numerologyInterpretation,
    palmInterpretation,
    combined,
    timeline,
    recommendations
  };
}

// ========================================================================
// SUPPORTING GENERATORS — Each produces a specific section of the report
// ========================================================================

function generateShortAnswer({ question, intent, astrology, numerology }) {
  return `Based on your chart and numerology profile, the energy around your question — "${question}" — shows significant movement in the area of ${intent}, with clear indications of progress and clarity forming over the coming cycle.`;
}

// ------------------------------------------------------------------------

function generateAstrologicalInterpretation({ question, intent, astrology }) {
  return `
Your astrological chart provides meaningful insight into your question about ${intent}.
Your core planetary placements (Sun, Moon, Rising) highlight the internal motivations behind this concern, while specific houses related to the topic reveal the deeper influences at play.

Key influences shaping your situation include:
• Sun: ${astrology?.sun || "N/A"}
• Moon: ${astrology?.moon || "N/A"}
• Rising: ${astrology?.rising || "N/A"}

These placements show how your natural tendencies and emotional patterns connect directly to your question: "${question}".
`;
}

// ------------------------------------------------------------------------

function generateNumerologicalInterpretation({
  question,
  intent,
  numerology
}) {
  return `
Numerologically, your Life Path (${numerology?.lifePath}) and current Personal Year (${numerology?.personalYear}) play a defining role in how this situation unfolds.

• Life Path ${numerology?.lifePath}: ${numerology?.lifePathMeaning}
• Personal Year ${numerology?.personalYear}: ${numerology?.personalYearMeaning}

These numbers influence how you should interpret and respond to your question about ${intent}. The energies of this cycle specifically highlight themes of growth, alignment, and timing relevant to "${question}".
`;
}

// ------------------------------------------------------------------------

function generatePalmistryInterpretation({ question, intent, palmistry }) {
  return `
Your palm features give additional insight into the deeper patterns influencing your concern about ${intent}.

Heart Line: ${palmistry?.features?.heartLine}
Head Line: ${palmistry?.features?.headLine}
Life Line: ${palmistry?.features?.lifeLine}
Fate Line: ${palmistry?.features?.fateLine}

These indicators reflect personal emotional patterns, decision-making tendencies, energy cycles, and life direction themes that directly relate to "${question}".`;
}

// ------------------------------------------------------------------------

function generateCombinedSynthesis({
  question,
  intent,
  astrology,
  numerology,
  palmistry
}) {
  return `
When all three systems are combined — astrology, numerology, and palmistry — the message becomes clear:

Your astrological placements reveal the motivations and energies behind your question.
Your numerology cycle shows the timing and developmental themes surrounding this concern.
Your palmistry features reveal the subconscious emotional and directional patterns influencing the path ahead.

Together, these form a unified answer to your question:
"${question}"

This alignment indicates that your path in the area of ${intent} is moving toward resolution through a combination of self-awareness, timing, and emotional clarity.
`;
}

// ------------------------------------------------------------------------

function generateTimeline({ intent, astrology, numerology }) {
  return `
The timing outlook suggests the strongest movement in this area will occur during your current Personal Year ${
    numerology?.personalYear
  }, specifically during months ${
    numerology?.personalMonthRange || "N/A"
  }.

Astrologically, favorable periods may arise when key planets related to ${intent} activate significant transits such as:
• ${astrology?.transit1 || "Major supportive transit approaching"}
• ${astrology?.transit2 || "Additional positive planetary alignment"}

Together these indicate a clear window for progress, clarity, and forward momentum.
`;
}

// ------------------------------------------------------------------------

function generateRecommendations({ intent, astrology, numerology }) {
  return `
To make the most of the energies in your chart and numerology cycle, consider the following action steps:

1. Lean into your natural strengths shown in your Sun and Rising placements.
2. Align your efforts with the themes of your Personal Year and Personal Month cycles.
3. Pay attention to emotional signals reflected in your Moon placement.
4. Make proactive decisions during supportive transit periods.
5. Trust the deeper intuitive patterns shown in your palm features.

By integrating these steps, you align yourself with the strongest possible outcome in matters of ${intent}.
`;
}
