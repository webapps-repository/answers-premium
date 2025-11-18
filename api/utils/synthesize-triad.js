// /api/utils/synthesize-triad.js

export function synthesizeTriad({
  question,
  intent,
  astrology,
  numerology,
  palmistry
}) {
  const shortAnswer =
    `Your question "${question}" shows strong developmental movement in the area of ${intent}. ` +
    `Astrology, numerology and palmistry patterns all point toward meaningful progress ahead.`;

  /* ASTRO */
  const astroInterpretation = `
Your chart highlights internal motivations and emotional influences connected to your question.
• Sun: ${astrology?.sun}
• Moon: ${astrology?.moon}
• Rising: ${astrology?.rising}
Key transits: ${astrology?.transit1}, ${astrology?.transit2}
  `;

  /* NUMEROLOGY */
  const numerologyInterpretation = numerology
    ? `
Your Life Path ${numerology.lifePath} (${numerology.lifePathMeaning})
and your current Personal Year ${numerology.personalYear} (${numerology.personalYearMeaning})
shape the timing and emotional tone of your question.
`
    : "No numerology data provided.";

  /* PALMISTRY */
  const palmInterpretation = `
Palm features reflect deeper emotional + subconscious patterns influencing your situation.
Heart Line: ${palmistry?.features?.heartLine}
Head Line: ${palmistry?.features?.headLine}
Life Line: ${palmistry?.features?.lifeLine}
Fate Line: ${palmistry?.features?.fateLine}
`;

  /* COMBINED */
  const combined = `
Astrology = motivations & energy cycles  
Numerology = timing & life-cycle patterns  
Palmistry = subconscious emotional direction  

Together, they reveal a unified answer to your question "${question}".
`;

  /* TIMELINE */
  const timeline = `
Most significant movement occurs during Personal Year ${numerology?.personalYear}.  
Astrological transits such as ${astrology?.transit1} support forward momentum.  
`;

  /* RECOMMENDATIONS */
  const recommendations = `
1. Follow supportive astrological transits for decision-making.
2. Align your actions with your Personal Year themes.
3. Use intuition highlighted by your palm lines.
`;

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
