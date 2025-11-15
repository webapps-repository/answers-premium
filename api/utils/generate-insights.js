// /api/utils/generate-insights.js
import OpenAI from "openai";
let client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey:process.env.OPENAI_API_KEY }) : null;

const fallbackPersonal = () => ({
  answer: "Your personal answer is ready.",
  astrologySummary:"Astrology unavailable.",
  numerologySummary:"Numerology unavailable.",
  palmistrySummary:"Palmistry unavailable."
});

const fallbackTechnical = () => ({
  answer:"Here is a concise technical answer.",
  keyPoints:[],
  notes:""
});

export async function personalSummaries(data){
  if(!client) return fallbackPersonal();

  const prompt = `
Provide a SHORT direct answer first (1–2 sentences).

Then provide:
- astrologySummary (2–4 sentences)
- numerologySummary (2–4 sentences)
- palmistrySummary (2–4 sentences)

Return JSON ONLY.

USER DATA:
${JSON.stringify(data,null,2)}
  `;

  try{
    const r = await client.chat.completions.create({
      model:"gpt-4o",
      temperature:0.3,
      messages:[{role:"user",content:prompt}]
    });

    return JSON.parse(r.choices[0].message.content.trim());
  }catch(e){
    console.error("personalSummaries error", e);
    return fallbackPersonal();
  }
}

export async function technicalSummary(question){
  if(!client) return fallbackTechnical();

  const prompt = `
Provide a SHORT technical answer (1–2 sentences).

Also provide:
- keyPoints (3–6 concise bullets)
- notes (1–2 sentences)

Return JSON ONLY.

Question: "${question}"
`;

  try{
    const r = await client.chat.completions.create({
      model:"gpt-4o",
      temperature:0.2,
      messages:[{role:"user",content:prompt}]
    });

    return JSON.parse(r.choices[0].message.content.trim());
  }catch(e){
    console.error("technicalSummary error", e);
    return fallbackTechnical();
  }
}
