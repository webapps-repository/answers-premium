// /api/spiritual-report.js
// MAIN ROUTE — personal & technical short-answer engine (no PDF here)

import { formidable } from "formidable";
import { classifyQuestion } from "./utils/classify-question.js";
import { verifyRecaptcha } from "./utils/verify-recaptcha.js";
import { personalSummaries, technicalSummary } from "./utils/generate-insights.js";
import { sendEmailHTML } from "./utils/send-email.js";

export const config = {
  api: { bodyParser: false },
};

// Helpers
const safe = (v, d = "") =>
  v == null ? d : Array.isArray(v) ? String(v[0] ?? d) : String(v);

const toISO = (ddmmyyyy) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(ddmmyyyy || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ddmmyyyy;
};

// Numerology
const MAP = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
  J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
  S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8
};
const reduce = n => {
  const keep = [11,22,33];
  while (n>9 && !keep.includes(n)) {
    n = String(n).split("").reduce((a,b)=>a+(+b||0),0);
  }
  return n;
};
const sumLetters = s =>
  reduce((s||"").toUpperCase().replace(/[^A-Z]/g,"").split("").reduce((t,c)=>t+(MAP[c]||0),0));
const sumVowels = s =>
  reduce((s||"").toUpperCase().replace(/[^AEIOUY]/g,"").split("").reduce((t,c)=>t+(MAP[c]||0),0));
const sumCons = s =>
  reduce((s||"").toUpperCase().replace(/[^A-Z]|[AEIOUY]/g,"").split("").reduce((t,c)=>t+(MAP[c]||0),0));

const lifePathFromISO = iso =>
  reduce((iso||"").replace(/\D/g,"").split("").reduce((t,d)=>t+(+d||0),0));

// MAIN HANDLER
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = formidable({
    multiples: false,
    keepExtensions: true,
    allowEmptyFiles: true,
    minFileSize: 0,
    maxFileSize: 12 * 1024 * 1024,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Formidable error:", err);
      return res.status(400).json({ success:false, error:"Form parse error", detail:err.message });
    }

    // reCAPTCHA
    const token = safe(fields["g-recaptcha-response"], "");
    const rc = await verifyRecaptcha(token);
    if (!rc.ok) {
      return res.status(403).json({ success:false, error:"Recaptcha failed" });
    }

    // Read inputs
    const question = safe(fields.question).trim();
    const isPersonalFlag = safe(fields.isPersonal).toLowerCase();
    const isPersonal = ["yes","true","on","personal"].includes(isPersonalFlag);

    const email = safe(fields.email, "");
    const fullName = safe(fields.name, "");
    const birthDDMM = safe(fields.birthdate);
    const birthISO = toISO(birthDDMM);
    const birthTime = safe(fields.birthtime,"Unknown");
    const birthPlace = [safe(fields.birthcity), safe(fields.birthstate), safe(fields.birthcountry)]
      .filter(Boolean).join(", ");

    // Classifier (for OpenAI hint only)
    let classifier = {type:"unknown", confidence:0, source:"fallback"};
    try { classifier = await classifyQuestion(question); } catch {}

    // Numerology (if personal)
    let numerologyPack = {};
    if (isPersonal) {
      const lp = lifePathFromISO(birthISO);
      const expr = sumLetters(fullName);
      const pers = sumCons(fullName);
      const soul = sumVowels(fullName);
      const mat = reduce(lp + expr);

      numerologyPack = { lifePath:lp, expression:expr, personality:pers, soulUrge:soul, maturity:mat };
    }

    // Insights
    let answer="", astrologySummary="", numerologySummary="", palmistrySummary="";
    const decoratedQuestion = `${question}\n\n[classifier hint: ${classifier.type}, ${classifier.confidence}]`;

    if (isPersonal) {
      const s = await personalSummaries({
        question: decoratedQuestion,
        fullName,
        birthISO,
        birthTime,
        birthPlace,
        numerologyPack
      });

      answer = s.answer || "Your personal answer is ready.";
      astrologySummary = s.astrologySummary || "";
      numerologySummary = s.numerologySummary || "";
      palmistrySummary = s.palmistrySummary || "";

      // Send personal PDF email
      if (email) {
        await sendEmailHTML({
          to: email,
          subject: `Your Detailed Answer: ${question}`,
          html: `<p>Your detailed PDF report is attached.</p>`,
          attachments: []
        });
      }

    } else {
      const t = await technicalSummary(decoratedQuestion);
      answer = t.answer || "Your answer is ready.";
      numerologyPack = {
        technicalKeyPoints: Array.isArray(t.keyPoints) ? t.keyPoints : [],
        technicalNotes: t.notes || ""
      };
    }

    // Send short answer to frontend
    return res.status(200).json({
      success: true,
      isPersonal,
      answer,
      astrologySummary,
      numerologySummary,
      palmistrySummary,
      numerologyPack
    });
  });
}
