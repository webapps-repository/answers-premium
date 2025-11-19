// /api/utils/synthesize-triad.js
// Triad AI alignment: astrology + numerology + palmistry → unified answer

import OpenAI from "openai";

const openai =
  process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Fallback (no AI / AI error) → static generator
function staticTriad({
  question,
  intent,
  astrology,
  numerology,
  palmistry
}) {
  const shortAnswer = `
Your question: "${question}"

Based on the combined energies of your chart, numerology, and palm, there is a meaningful
shift unfolding in the area of ${intent}. You are being guided toward greater clarity,
alignment, and self-awareness around this topic.
  `.trim();

  const astroInterpretation = `
Astrologically, your Sun, Moon, and Rising signs shape how you experience this question.

• Sun: ${astrology?.sun}
• Moon: ${astrology?.moon}
• Rising: ${astrology?.rising}

These placements describe your core drive, emotional needs, and the way you show up in the world.
  `;

  const numerologyInterpretation = `
Numerology highlights the deeper life themes and timing around your question.

• Life Path ${numerology?.lifePath}: ${numerology?.lifePathMeaning || "Key life lessons and direction."}
• Personal Year ${numerology?.personalYear}: Emphasises growth in the area of ${intent}.
• Personal Month ${numerology?.personalMonth}: A short-term window for adjusting course.
  `;

  const palmInterpretation = `
Palmistry adds insight into how you actually live and embody your path.

• Heart Line: ${palmistry?.features?.heartLine}
• Head Line: ${palmistry?.features?.headLine}
• Life Line: ${palmistry?.features?.lifeLine}
• Fate Line: ${palmistry?.features?.fateLine}
• Sun Line: ${palmistry?.features?.sunLine}
• Marriage Lines: ${palmistry?.features?.marriageLines}
  `;

  const combined = `
When all three systems are combined, your question "${question}" is framed as a key turning point.
Astrology shows the "why", numerology shows the "when", and palmistry shows "how you actually carry it".

Together they indicate that your path in ${intent} is moving through a period of adjustment that
ultimately supports deeper authenticity and long-term alignment.
  `;

  const timeline = `
The strongest movement appears during your Personal Year ${numerology?.personalYear},
especially around months ${numerology?.personalMonthRange || "that emphasise reflection and realignment"}.
  `;

  const recommendations = `
Recommendations:
1. Reflect honestly on what feels aligned vs. forced in this area of life.
2. Use the current numerology cycle to time important decisions rather than rushing.
3. Pay attention to emotional and intuitive signals shown in your Moon and heart line.
4. Take small, concrete steps that honour your true direction rather than old habits.
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

// ================================================
// MAIN: GPT-4.1 triad synthesis with fallback
// ================================================
export async function synthesizeTriad({
  question,
  intent,
  astrology,
  numerology,
  palmistry
}) {
  // If no OpenAI key → static fallback
  if (!openai) {
    return staticTriad({ question, intent, astrology, numerology, palmistry });
  }

  try {
    const prompt = `
You are a world-class spiritual analyst combining:

• Western astrology (Placidus, tropical)
• Pythagorean numerology
• Classical + modern palmistry

User question:
"${question}"

Context:
- Intent / theme: ${intent}
- Astrology (summary JSON will be provided).
- Numerology (life path, cycles, etc.).
- Palmistry (lines and features).

You MUST return STRICT JSON ONLY, no markdown, exactly in this shape:

{
  "shortAnswer": "2–4 sentences directly answering the user's question in plain language.",
  "astroInterpretation": "2–5 paragraphs explaining the astrological picture in relation to the question.",
  "numerologyInterpretation": "2–4 paragraphs interpreting the numerology cycles and core numbers.",
  "palmInterpretation": "2–4 paragraphs interpreting the palm features in context of the question.",
  "combined": "2–4 paragraphs weaving all three systems into one clear story.",
  "timeline": "1–3 paragraphs focusing on timing windows, cycles, and when energy is strongest.",
  "recommendations": "A set of 4–8 practical recommendations, in paragraph form or light bullets."
}

Make the tone grounded, kind, specific, and realistic. Avoid fatalism, and emphasise agency + consent.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You synthesise astrology, numerology, and palmistry into grounded, practical guidance."
        },
        {
          role: "user",
          content: JSON.stringify({
            instructions: prompt,
            question,
            intent,
            astrology,
            numerology,
            palmistry
          })
        }
      ]
    });

    const parsed = completion.choices[0].message.parsed;

    return {
      shortAnswer: parsed.shortAnswer,
      astroInterpretation: parsed.astroInterpretation,
      numerologyInterpretation: parsed.numerologyInterpretation,
      palmInterpretation: parsed.palmInterpretation,
      combined: parsed.combined,
      timeline: parsed.timeline,
      recommendations: parsed.recommendations
    };
  } catch (err) {
    console.error("Triad LLM error:", err);
    // Safe fallback
    return staticTriad({ question, intent, astrology, numerology, palmistry });
  }
}
