// /api/spiritual-report.js
// Main backend handler: CORS + reCAPTCHA + personal/technical logic + numerology + classifier context + OpenAI summaries + PDF + email

import { formidable } from "formidable";
import { classifyQuestion } from "./utils/classify-question.js";
import { verifyRecaptcha } from "./utils/verify-recaptcha.js";
import { personalSummaries, technicalSummary } from "./utils/generate-insights.js";
import { generatePdfBuffer } from "./utils/generate-pdf.js";
import { sendEmailHTML } from "./utils/send-email.js";

export const config = { api: { bodyParser: false } };

// ----- Helpers -----
const safe = (v, d = "") =>
  v == null ? d : Array.isArray(v) ? String(v[0] ?? d) : String(v);

const toISO = (ddmmyyyy) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(ddmmyyyy || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ddmmyyyy;
};

// ----- Numerology (local) -----
const MAP = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
  J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
  S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8
};
const reduce = (n)=>{while(n>9&&![11,22,33].includes(n))n=[...String(n)].reduce((a,b)=>a+ +b,0);return n;};
const letters   = s => (s||"").toUpperCase().replace(/[^A-Z]/g,"");
const vowels    = s => (s||"").toUpperCase().replace(/[^AEIOUY]/g,"");
const cons      = s => (s||"").toUpperCase().replace(/[^A-Z]|[AEIOUY]/g,"");
const sumL      = s => reduce([...letters(s)].reduce((t,c)=>t+(MAP[c]||0),0));
const sumV      = s => reduce([...vowels(s)].reduce((t,c)=>t+(MAP[c]||0),0));
const sumC      = s => reduce([...cons(s)].reduce((t,c)=>t+(MAP[c]||0),0));
const lifePath  = iso => reduce([...iso.replace(/\D/g,"")].reduce((t,d)=>t+(+d||0),0));

export default async function handler(req, res) {

  // ----- CORS -----
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  // ----- Formidable (safe) -----
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    allowEmptyFiles: true,
    minFileSize: 0,
    maxFileSize: 10 * 1024 * 1024
  });

  try {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("❌ formidable parse error:", err);
        return res.status(400).json({
          success: false,
          error: "File upload error",
          detail: err.message
        });
      }

      // Palm image optional
      const palm = files.palmImage;
      const palmPath = palm && palm.size > 0 ? palm.filepath : null;

      // ----- reCAPTCHA -----
      const token = safe(fields["g-recaptcha-response"]);
      const check = await verifyRecaptcha(token);
      if (!check.ok)
        return res.status(403).json({ success:false, error:"reCAPTCHA failed", details:check });

      // ----- Extract inputs -----
      const question   = safe(fields.question).trim();
      const email      = safe(fields.email).trim();
      const fullName   = safe(fields.name).trim();

      const dobDDMM    = safe(fields.birthdate);
      const dobISO     = toISO(dobDDMM);
      const birthTime  = safe(fields.birthtime,"Unknown");
      const birthPlace = [safe(fields.birthcity), safe(fields.birthstate), safe(fields.birthcountry)]
                          .filter(Boolean).join(", ");

      // ---- User checkbox controls personal logic ----
      const personalFlag = safe(fields.isPersonal).toLowerCase();
      const isPersonal = ["yes","true","on","personal"].includes(personalFlag);

      // ---- Classifier still used ONLY as metadata for OpenAI ----
      let classifier = { type:"unknown", confidence:0, source:"fallback" };
      try { classifier = await classifyQuestion(question); }
      catch(e){ console.warn("classifier failed",e); }

      const decoratedQuestion = `${question}

[Classifier hint: type=${classifier.type}, confidence=${classifier.confidence}, userMarkedPersonal=${isPersonal}]`;

      // ----- Numerology -----
      let numerologyPack = {};
      if (isPersonal) {
        const lp = lifePath(dobISO);
        const expr = sumL(fullName);
        const pers = sumC(fullName);
        const soul = sumV(fullName);
        const mat = reduce(lp + expr);
        numerologyPack = { lifePath:lp, expression:expr, personality:pers, soulUrge:soul, maturity:mat };
      }

      // ----- OpenAI summaries -----
      let answer="", astro="", numSum="", palmSum="";
      if (isPersonal) {
        const out = await personalSummaries({ fullName, birthISO:dobISO, birthTime, birthPlace, question:decoratedQuestion, numerologyPack });
        answer = out.answer || "Your personal answer is ready.";
        astro  = out.astrologySummary  || "";
        numSum = out.numerologySummary || "";
        palmSum= out.palmistrySummary  || "";
      } else {
        const t = await technicalSummary(decoratedQuestion);
        answer = t.answer || "Here is your concise answer.";
        numerologyPack = {
          technicalKeyPoints: Array.isArray(t.keyPoints)?t.keyPoints:[],
          technicalNotes: t.notes || ""
        };
      }

      // ----- PDF -----
      const pdf = await generatePdfBuffer({
        headerBrand: "Melodies Web",
        titleText: "Your Answer",
        mode: isPersonal ? "personal" : "technical",
        question,
        answer,
        fullName,
        birthdate: dobDDMM,
        birthTime,
        birthPlace,
        astrologySummary: astro,
        numerologySummary: numSum,
        palmistrySummary: palmSum,
        numerologyPack
      });

      // ----- Email -----
      if (email) {
        const html = `
          <div style="font-family:system-ui,Arial,sans-serif;max-width:720px;margin:auto;color:#222;">
            <h2 style="text-align:center;">Melodies Web</h2>
            <h3 style="text-align:center;">Your Answer</h3>
            <p><strong>Question:</strong> ${question}</p>
            <p>${answer}</p>
            <p style="font-size:13px;color:#666;">Your detailed PDF is attached.</p>
          </div>
        `;

        await sendEmailHTML({
          to: email,
          subject: "Your Answer",
          html,
          attachments:[{ filename:"Your_Answer.pdf", buffer:pdf }]
        });
      }

      // ----- Frontend JSON -----
      return res.status(200).json({
        success: true,
        type: isPersonal?"personal":"technical",
        answer,
        astrologySummary: astro,
        numerologySummary: numSum,
        palmistrySummary: palmSum
      });
    });

  } catch (e) {
    console.error("❌ spiritual-report fatal:", e);
    return res.status(500).json({ success:false, error:"Server error", detail:String(e) });
  }
}
