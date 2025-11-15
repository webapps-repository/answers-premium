// /api/spiritual-report.js
// SHORT ANSWER HANDLER — personal + technical
// CORS + FormData + reCAPTCHA v2 + classifier-hint + numerology

import { formidable } from "formidable";
import { verifyRecaptcha } from "./utils/verify-recaptcha.js";
import { classifyQuestion } from "./utils/classify-question.js";
import { personalSummaries, technicalSummary } from "./utils/generate-insights.js";

export const config = { api: { bodyParser: false } };

// helpers
const safe = (v, d = "") =>
  v == null ? d : Array.isArray(v) ? String(v[0] ?? d) : String(v);

const toISO = (ddmmyyyy) => {
  const s = safe(ddmmyyyy);
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
};

// numerology helpers
const MAP = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8 };
const reduce = n => { while (n>9 && ![11,22,33].includes(n)) n = String(n).split("").reduce((a,b)=>a+(+b||0),0); return n; };
const letters = s => (s||"").toUpperCase().replace(/[^A-Z]/g,"");
const vowels  = s => (s||"").toUpperCase().replace(/[^AEIOUY]/g,"");
const cons    = s => (s||"").toUpperCase().replace(/[^A-Z]|[AEIOUY]/g,"");
const sumL = s => reduce(letters(s).split("").reduce((t,c)=>t+(MAP[c]||0),0));
const sumV = s => reduce(vowels(s).split("").reduce((t,c)=>t+(MAP[c]||0),0));
const sumC = s => reduce(cons(s).split("").reduce((t,c)=>t+(MAP[c]||0),0));
const life = iso =>
  reduce((iso||"").replace(/\D/g,"").split("").reduce((t,d)=>t+(+d||0),0));

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Formidable
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    allowEmptyFiles: true,
    minFileSize: 0,
    maxFileSize: 8 * 1024 * 1024
  });

  try {
    form.parse(req, async (err, fields) => {

      if (err) {
        console.error("❌ parse error", err);
        return res.status(400).json({ error: "Parse error", detail: err.message });
      }

      const token = safe(fields["g-recaptcha-response"]);
      const rc = await verifyRecaptcha(token);

      if (!rc.ok) {
        return res.status(403).json({ error: "reCAPTCHA failed", details: rc });
      }

      const question = safe(fields.question).trim();
      const isPersonal = ["yes","on","true","personal"].includes(
        safe(fields.isPersonal).toLowerCase()
      );

      const email = safe(fields.email).trim();
      const fullName = safe(fields.name).trim();
      const birthISO = toISO(safe(fields.birthdate));
      const birthTime = safe(fields.birthtime,"Unknown");
      const birthPlace = [
        safe(fields.birthcity),
        safe(fields.birthstate),
        safe(fields.birthcountry)
      ].filter(Boolean).join(", ");

      // classifier hint only
      let cls = { type:"unknown", confidence:0, source:"fallback" };
      try { cls = await classifyQuestion(question); } catch {}

      const decorated = `${question}

[Classifier: type=${cls.type}, conf=${cls.confidence}, userMarked=${isPersonal}]`;

      // numerology
      let numerologyPack = {};
      if (isPersonal) {
        const lp = life(birthISO);
        const expr = sumL(fullName);
        const pers = sumC(fullName);
        const soul = sumV(fullName);
        const mat  = reduce(lp + expr);
        numerologyPack = { lifePath:lp, expression:expr, personality:pers, soulUrge:soul, maturity:mat };
      }

      // insights
      let answer="", astro="", num="", palm="";

      if (isPersonal) {
        const out = await personalSummaries({
          fullName, birthISO, birthTime, birthPlace,
          question: decorated, numerologyPack
        });
        answer = out.answer;
        astro  = out.astrologySummary;
        num    = out.numerologySummary;
        palm   = out.palmistrySummary;
      } else {
        const out = await technicalSummary(decorated);
        answer = out.answer;
      }

      // censor detection
      let censored = false;
      const lc = (answer||"").toLowerCase();
      if (lc.includes("policy") || lc.includes("not permitted") || lc.includes("cannot assist")) {
        answer = "⚠️ Censored by OpenAI — this question cannot be answered.";
        censored = true;
      }

      return res.status(200).json({
        success: true,
        personal: isPersonal,
        answer,
        astrologySummary: astro,
        numerologySummary: num,
        palmistrySummary: palm,
        numerologyPack,
        censored
      });

    });
  } catch (e) {
    console.error("❌ spiritual-report error", e);
    return res.status(500).json({ error: "server error", detail: String(e) });
  }
}
