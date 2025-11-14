// /api/utils/classify-question.js

import OpenAI from "openai";

let openai=null;
if (process.env.OPENAI_API_KEY)
  openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});

function fallback(q){
  const s=(q||"").toLowerCase();
  const hints=[
    "my","me","should i","will i","love","relationship","born","date of birth",
    "astrology","numerology","palm","future","career","health"
  ];
  return {
    type: hints.some(k=>s.includes(k)) ? "personal":"technical",
    confidence:0.55,
    source:"fallback"
  };
}

export async function classifyQuestion(question){
  if (!openai) return fallback(question);

  try {
    const prompt = `
Return ONLY JSON:
{
  "type": "personal" | "technical",
  "confidence": number
}

Question: "${question}"
`;

    const r = await openai.chat.completions.create({
      model:"gpt-4o",
      temperature:0,
      messages:[
        {role:"system",content:"Return valid JSON only."},
        {role:"user",content:prompt}
      ]
    });

    const txt=r.choices[0].message.content.trim();
    const obj=JSON.parse(txt);

    if (obj.type==="personal"||obj.type==="technical")
      return {...obj,source:"openai"};

    return fallback(question);

  } catch(e){
    console.error("classifier error",e);
    return fallback(question);
  }
}
