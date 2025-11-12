// /api/spiritual-report.js
import { formidable } from "formidable";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

// ---------- Config ----------
export const config = { api: { bodyParser: false } };

// ---------- Initialize OpenAI Safely ----------
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn("⚠️ OPENAI_API_KEY missing — using fallback classifier and local responses.");
}

// ---------- Helpers ----------
function safeStr(v, d = "") {
  if (!v) return d;
  if (Array.isArray(v)) return String(v[0]);
  return String(v);
}

// dd-mm-yyyy → yyyy-mm-dd
function toIsoDate(d) {
  if (!d) return "";
  const p = d.split("-");
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : d;
}

// fallback classifier
function fallbackClassify(q) {
  const t = (q || "").toLowerCase();
  const personal = [
    "my", "should i", "will i", "born", "marriage", "love", "career", "future", "health",
    "astrology", "numerology", "relationship", "spiritual", "life path", "dream"
  ];
  const hit = personal.some(k => t.includes(k));
  return { type: hit ? "personal" : "technical", confidence: 0.5, source: "fallback" };
}

async function classifyQuestion(question) {
  if (!openai) return fallbackClassify(question);
  try {
    const r = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return JSON only. Classify as personal or technical." },
        { role: "user", content: `Classify this question as {"type": "personal"|"technical", "confidence": number}: """${question}"""` }
      ],
      temperature: 0,
    });
    const txt = r.choices?.[0]?.message?.content?.trim() || "{}";
    const json = JSON.parse(txt);
    if (json.type) return json;
  } catch (e) {
    console.warn("Classifier error:", e.message);
  }
  return fallbackClassify(question);
}

// ---------- Numerology (Pythagorean local) ----------
const MAP = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
  J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
  S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8
};
const reduce = n => {
  while (n > 9 && ![11,22,33].includes(n))
    n = String(n).split("").reduce((a,b)=>a + +b,0);
  return n;
};
const onlyLetters = s => (s || "").toUpperCase().replace(/[^A-Z]/g, "");
const vowels = "AEIOUY";
function numerology(name, dobIso) {
  const clean = onlyLetters(name);
  const nums = [...clean].map(ch => MAP[ch] || 0);
  const total = reduce(nums.reduce((a,b)=>a+b,0));
  const soul = reduce([...clean].filter(c => vowels.includes(c)).map(c => MAP[c]||0).reduce((a,b)=>a+b,0));
  const pers = reduce([...clean].filter(c => !vowels.includes(c)).map(c => MAP[c]||0).reduce((a,b)=>a+b,0));
  const life = reduce([...dobIso.replace(/\D/g,"")].reduce((a,b)=>a+ +b,0));
  const mat = reduce(total + life);
  return { lifePath: life, expression: total, personality: pers, soulUrge: soul, maturity: mat };
}

// ---------- Main Handler ----------
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = formidable({ multiples: false, keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Parse error:", err);
      return res.status(500).json({ success:false, error:"Form parsing failed" });
    }

    try {
      const question = safeStr(fields.question).trim();
      const fullName = safeStr(fields.name);
      const email = safeStr(fields.email);
      const birthdate = safeStr(fields.birthdate);
      const birthIso = toIsoDate(birthdate);
      const birthtime = safeStr(fields.birthtime);
      const birthcity = safeStr(fields.birthcity);
      const birthstate = safeStr(fields.birthstate);
      const birthcountry = safeStr(fields.birthcountry);
      const place = [birthcity, birthstate, birthcountry].filter(Boolean).join(", ");

      // classify question
      const classification = await classifyQuestion(question);
      const isPersonal = classification.type === "personal";

      // Build summaries
      let answer = "", astrologySummary = "", numerologySummary = "", palmistrySummary = "";
      let numerics = {};

      if (isPersonal) {
        numerics = numerology(fullName, birthIso);

        // use OpenAI for personalized content
        if (openai) {
          try {
            const prompt = `
User: ${fullName}
DOB: ${birthdate}
Question: ${question}
Provide JSON only:
{
  "answer": "concise 2-3 sentence personal insight",
  "astrologySummary": "short paragraph about astrology context",
  "numerologySummary": "short paragraph interpreting numerology numbers",
  "palmistrySummary": "short paragraph about palmistry patterns"
}`;
            const r = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: "Return valid JSON only." }, { role: "user", content: prompt }],
              temperature: 0.7,
            });
            const txt = r.choices?.[0]?.message?.content?.trim() || "{}";
            const js = JSON.parse(txt);
            answer = js.answer || "Your chart suggests transformation and movement ahead.";
            astrologySummary = js.astrologySummary || "Astrological influences show opportunities approaching.";
            numerologySummary = js.numerologySummary || "Numerology highlights adaptability and progress.";
            palmistrySummary = js.palmistrySummary || "Palmistry indicates steady development and support lines strengthening.";
          } catch (e) {
            console.warn("OpenAI personal response error:", e.message);
            answer = "Personal insights generated locally.";
          }
        } else {
          // fallback personal summaries
          numerics = numerology(fullName, birthIso);
          answer = "Your chart suggests transformation and positive movement ahead.";
          astrologySummary = "Astrological patterns show new opportunities approaching.";
          numerologySummary = "Numerology highlights adaptability and life changes.";
          palmistrySummary = "Palmistry reveals support and growth lines strengthening soon.";
        }
      } else {
        // technical answer
        if (openai) {
          try {
            const r = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "Answer concisely, JSON only." },
                { role: "user", content: `Create JSON: {"answer":"direct summary","keyPoints":["bullet1","bullet2"],"notes":"optional"} for question: """${question}"""` },
              ],
              temperature: 0.5,
            });
            const txt = r.choices?.[0]?.message?.content?.trim() || "{}";
            const js = JSON.parse(txt);
            answer = js.answer || "Here is your concise answer.";
            numerics = {
              technicalKeyPoints: js.keyPoints || [],
              technicalNotes: js.notes || "",
            };
          } catch (e) {
            console.warn("OpenAI technical error:", e.message);
            answer = "Concise response generated locally.";
          }
        } else {
          answer = "Here is your concise answer based on local logic.";
        }
      }

      // ---------- Generate PDF ----------
      let pdfBuffer = null;
      try {
        pdfBuffer = await generatePdfBuffer({
          headerBrand: "Melodies Web",
          title: "Your Answer",
          mode: isPersonal ? "personal" : "technical",
          question,
          answer,
          fullName,
          birthdate,
          birthTime: birthtime,
          birthPlace: place,
          astrologySummary,
          numerologySummary,
          palmistrySummary,
          numerologyPack: numerics,
        });
      } catch (e) {
        console.error("PDF generation failed:", e.message);
      }

      // ---------- Email ----------
      if (email && pdfBuffer) {
        try {
          await sendEmailWithAttachment({
            to: email,
            subject: "Your Answer",
            html: `<p><strong>Your Question:</strong> ${question}</p><p>Your detailed report is attached.</p>`,
            buffer: pdfBuffer,
            filename: "Your_Answer.pdf",
          });
        } catch (e) {
          console.warn("Email send failed:", e.message);
        }
      }

      // ---------- Respond ----------
      return res.status(200).json({
        success: true,
        type: isPersonal ? "personal" : "technical",
        answer,
        astrologySummary,
        numerologySummary,
        palmistrySummary,
        classification,
      });
    } catch (err) {
      console.error("Handler error:", err);
      return res.status(500).json({ success:false, error:err.message });
    }
  });
}
