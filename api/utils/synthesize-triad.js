// /api/utils/synthesize-triad.js
// Fixed: produces real short answers, respects intent,
// works with missing data, no crashing, clean formatting.

export function synthesizeTriad({ question, intent, astrology, numerology, palmistry }) {
  // SAFE ACCESS
  const a = astrology || {};
  const n = numerology || {};
  const p = palmistry || {};

  const shortAnswer = generateShortAnswer({ question, intent, astrology: a, numerology: n, palmistry: p });

  return {
    shortAnswer,
    astroInterpretation: generateAstrologySection({ intent, astrology: a }),
    numerologyInterpretation: generateNumerologySection({ intent, numerology: n }),
    palmInterpretation: generatePalmistrySection({ intent, palmistry: p }),
    combined: generateCombinedSynthesis({ question, intent, astrology: a, numerology: n, palmistry: p }),
    timeline: generateTimeline({ intent, astrology: a, numerology: n }),
    recommendations: generateRecommendations({ intent, astrology: a, numerology: n, palmistry: p })
  };
}

/* ============================================================
   SHORT ANSWER (REAL, DIRECT)
============================================================ */

function generateShortAnswer({ question, intent, astrology, numerology, palmistry }) {
  const topic = intent && intent !== "general" ? intent : "your situation";

  const lp = numerology?.lifePath ? `life path ${numerology.lifePath}` : null;
  const sun = astrology?.sun || null;

  const hookParts = [];

  if (sun) hookParts.push(`your ${sun} Sun`);
  if (lp) hookParts.push(lp);
  if (palmistry?.features?.heartLine && topic === "love") {
    hookParts.push("your emotional patterns shown in the heart line");
  }

  const hook =
    hookParts.length > 0
      ? hookParts.join(", ")
      : "your current energetic pattern";

  return `Based on ${hook}, the energy around your question — "${question}" — shows meaningful movement in the area of ${topic}. A clearer path forward is emerging, with supportive timing and insight available to you now.`;
}

/* ============================================================
   ASTROLOGY
============================================================ */

function generateAstrologySection({ intent, astrology }) {
  return `
Your astrological energy gives insight into your concern about ${intent}.

• Sun: ${astrology.sun || "N/A"}
• Moon: ${astrology.moon || "N/A"}
• Rising: ${astrology.rising || "N/A"}

These placements describe your personality core, emotional habits, and instinctive approach. Together, they colour the way you experience and respond to this situation.
`.trim();
}

/* ============================================================
   NUMEROLOGY
============================================================ */

function generateNumerologySection({ intent, numerology }) {
  if (!numerology || !numerology.lifePath) {
    return `
Numerology insight is limited because birth information was incomplete, 
but your intuitive path still supports better clarity around ${intent}.
`.trim();
  }

  return `
Your numerology adds timing and meaning to your situation.

• Life Path ${numerology.lifePath}: ${numerology.lifePathMeaning}
• Personal Year ${numerology.personalYear}: ${numerology.personalYearMeaning}

These cycles reveal the emotional themes and opportunities influencing your progress around ${intent}.
`.trim();
}

/* ============================================================
   PALMISTRY
============================================================ */

function generatePalmistrySection({ intent, palmistry }) {
  if (!palmistry || !palmistry.features) {
    return `
A palm image was not available, so general palmistry principles were applied.
`.trim();
  }

  const f = palmistry.features;

  return `
Your palm offers additional insight into deeper tendencies influencing your situation.

• Heart Line: ${f.heartLine || "N/A"}
• Head Line: ${f.headLine || "N/A"}
• Life Line: ${f.lifeLine || "N/A"}
• Fate Line: ${f.fateLine || "N/A"}

Together these show emotional patterns, decision-making style, vitality, and long-term momentum relevant to your question about ${intent}.
`.trim();
}

/* ============================================================
   COMBINED TRIAD
============================================================ */

function generateCombinedSynthesis({ question, intent, astrology, numerology, palmistry }) {
  return `
When astrology, numerology, and palmistry are combined, a unified message emerges:

Astrology highlights the motivations and energies shaping your experience of ${intent}.
Numerology reveals the timing, cycle progression, and unfolding momentum.
Palmistry shows your emotional wiring and long-term trajectory.

Together, they address your question:
"${question}"

The combined triad suggests that clarity and progress are available with aligned action, emotional honesty, and timing awareness.
`.trim();
}

/* ============================================================
   TIMELINE / FORECAST
============================================================ */

function generateTimeline({ intent, astrology, numerology }) {
  const py = numerology?.personalYear
    ? `during Personal Year ${numerology.personalYear}, especially months ${numerology.personalMonthRange}.`
    : "as your personal cycle shifts in the coming phase.";

  return `
Forecast insight suggests the most supportive movement for ${intent} will occur ${py}

Astrologically, you may also experience shifts when:
• ${astrology.transit1 || "Planetary energy becomes supportive"}
• ${astrology.transit2 || "A secondary alignment strengthens your direction"}

These periods highlight elevated clarity and momentum.
`.trim();
}

/* ============================================================
   RECOMMENDATIONS
============================================================ */

function generateRecommendations({ intent, astrology, numerology, palmistry }) {
  return `
Recommended actions to navigate this situation:

1. Lean into your natural strengths shown in the Sun and Rising signs.
2. Honour emotional cycles reflected in your Moon placement.
3. Follow the themes of your current numerology cycle for best timing.
4. Watch for physical intuition and subtle internal cues shown in your palm lines.
5. Take proactive steps when supportive energy or timing becomes clear.

Aligning these three systems strengthens your outcome in matters of ${intent}.
`.trim();
}
