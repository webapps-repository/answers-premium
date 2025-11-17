// /api/utils/synthesize-triad.js
// UPDATED — meaningful short answer, safe intent, no repetition,
// improved interpretation text.

export function synthesizeTriad({
  question,
  intent,
  astrology,
  numerology,
  palmistry,
}) {
  const shortAnswer = generateShortAnswer({
    question,
    intent,
    astrology,
    numerology,
    palmistry,
  });

  const astroInterpretation = generateAstrologicalInterpretation({
    question,
    intent,
    astrology,
  });

  const numerologyInterpretation = generateNumerologicalInterpretation({
    question,
    intent,
    numerology,
  });

  const palmInterpretation = generatePalmistryInterpretation({
    question,
    intent,
    palmistry,
  });

  const combined = generateCombinedSynthesis({
    question,
    intent,
    astrology,
    numerology,
    palmistry,
  });

  const timeline = generateTimeline({
    intent,
    astrology,
    numerology,
  });

  const recommendations = generateRecommendations({
    intent,
    astrology,
    numerology,
    palmistry,
  });

  return {
    shortAnswer,
    astroInterpretation,
    numerologyInterpretation,
    palmInterpretation,
    combined,
    timeline,
    recommendations,
  };
}

// ===============================================================
// SHORT ANSWER — rewritten to be meaningful & contextual
// ===============================================================
function generateShortAnswer({ question, intent, astrology, numerology }) {
  const readableIntent = intent?.replace(/_/g, " ") || "your situation";

  return `
Your question — "${question}" — connects strongly to themes of ${readableIntent}.
Your current numerology cycle and astrological patterns both show that clarity and
forward movement are forming. You are entering a period where decisions become easier,
inner direction strengthens, and external conditions begin aligning in your favor.
  `.trim();
}

// ===============================================================
function generateAstrologicalInterpretation({ question, intent, astrology }) {
  return `
Astrologically, the energy around ${intent} connects deeply with your core chart patterns.

• Sun: ${astrology?.sun || "N/A"}
• Moon: ${astrology?.moon || "N/A"}
• Rising: ${astrology?.rising || "N/A"}

These placements describe the motivations and emotional tone behind your question:
"${question}". They highlight how internal drives and emotional needs shape your
experience and upcoming developments.
  `;
}

// ===============================================================
function generateNumerologicalInterpretation({ question, intent, numerology }) {
  return `
Numerologically, you are moving through a ${numerology?.personalYear} Personal Year,
with emphasis on ${intent}. Your Life Path number (${numerology?.lifePath}) adds deeper
context to the lessons unfolding at this stage.

• Life Path: ${numerology?.lifePath} — ${numerology?.lifePathMeaning}
• Personal Year: ${numerology?.personalYear} — ${numerology?.personalYearMeaning}

These influences shape how you interpret and respond to your question:
"${question}". Timing strongly supports growth, alignment, and forward momentum.
  `;
}

// ===============================================================
function generatePalmistryInterpretation({ question, intent, palmistry }) {
  return `
Your palm shows patterns that relate strongly to ${intent}:

• Heart Line: ${palmistry?.features?.heartLine}
• Head Line: ${palmistry?.features?.headLine}
• Life Line: ${palmistry?.features?.lifeLine}
• Fate Line: ${palmistry?.features?.fateLine}

These features highlight emotional tendencies, decision-making patterns, life strength,
and direction — all directly influencing your concerns around "${question}".
  `;
}

// ===============================================================
function generateCombinedSynthesis({
  question,
  intent,
  astrology,
  numerology,
  palmistry,
}) {
  return `
When astrology, numerology, and palmistry are combined, a clear message emerges:

Your chart shows the underlying motivations and energy patterns.
Your numerology cycle reveals the timing and growth themes.
Your palmistry features reflect your internal direction and subconscious patterns.

Together, these systems indicate that your path regarding ${intent} is aligning toward
greater clarity and resolution. Your question — "${question}" — is part of a deeper shift
that is becoming more defined and actionable.
  `;
}

// ===============================================================
function generateTimeline({ intent, astrology, numerology }) {
  return `
The strongest movement in this area is expected during your Personal Year ${
    numerology?.personalYear
  }, especially months ${numerology?.personalMonthRange || "N/A"}.

Astrological transits relevant to ${intent} include:
• ${astrology?.transit1 || "A supportive major transit approaching"}
• ${astrology?.transit2 || "A stabilizing secondary alignment"}

Together, these mark a window of progress, insight, and momentum.
  `;
}

// ===============================================================
function generateRecommendations({ intent, astrology, numerology, palmistry }) {
  return `
Recommended actions to make the most of current cycles:

1. Lean into strengths shown in your Sun + Rising signs.
2. Align key decisions with your Personal Year numerology themes.
3. Follow emotional cues reflected in your Moon placement.
4. Take action during favourable transit periods.
5. Trust intuitive patterns shown in your palm features.

These steps help you move strongly forward in matters related to ${intent}.
  `;
}
