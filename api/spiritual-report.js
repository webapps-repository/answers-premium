// /api/spiritual-report.js
// MAIN HANDLER — personal/technical logic + astrology/numerology/palmistry + PDF + email

import { formidable } from "formidable";
import { classifyQuestion } from "./utils/classify-question.js";
import { verifyRecaptcha } from "./utils/verify-recaptcha.js";
import { personalSummaries, technicalSummary } from "./utils/generate-insights.js";
import { generatePdfBuffer } from "./utils/generate-pdf.js";
import { sendEmailHTML } from "./utils/send-email.js";

export const config = {
  api: { bodyParser: false }
};

// safe helpers
const safe = (v, d = "") =>
  v == null ? d : Array.isArray(v) ? String(v[0] ?? d) : String(v);

const toISO = (ddmmyyyy) => {
  const s = safe(ddmmyyyy);
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
};

// Numerology helpers
const MAP = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
  J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
  S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8
};

const reduceNum = (n)=>{
  const keep = (x)=>x===11||x===22||x===33;
  while(n>9 && !keep(n)){
    n = String(n).split("").reduce((s,d)=>s+(+d||0),0);
  }
  return n;
};

const letters = (s)=>(s||"").toUpperCase().replace(/[^A-Z]/g,"");
const vowels = (s)=>(s||"").toUpperCase().replace(/[^AEIOUY]/g,"");
const cons   = (s)=>(s||"").toUpperCase().replace(/[^A-Z]|[AEIOUY]/g,"");

const sumLetters = (s)=>reduceNum(letters(s).split("").reduce((t,c)=>t+(MAP[c]||0),0));
const sumVowels  = (s)=>reduceNum(vowels(s).split("").reduce((t,c)=>t+(MAP[c]||0),0));
const sumCons    = (s)=>reduceNum(cons(s).split("").reduce((t,c)=>t+(MAP[c]||0),0));

const lifePath = (iso)=>reduceNum((iso||"").replace(/\D/g,"").split("").reduce((t,d)=>t+(+d||0),0));

export default async function handler(req, res) {
  // ---- CORS ----
  res.setHeader("Access-Control-Allow-Origin", "*"); 
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ success:false, error:"Method not allowed" });

  // ---- Formidable ----
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    allowEmptyFiles: true,
    minFileSize: 0,
    maxFileSize: 10 * 1024 * 1024
  });

  try {
    form.parse(req, async (err, fields, files) => {
      if (err){
        console.error("formidable error:", err);
        return res.status(400).json({ success:false, error:"Form parse error", detail:err.message });
      }

      // ---- reCAPTCHA ----
      const token = safe(fields["g-recaptcha-response"]);
      const rc = await verifyRecaptcha(token);
      if (!rc.ok){
        return res.status(403).json({ success:false, error:"reCAPTCHA failed", details:rc });
      }

      // ---- INPUTS ----
      const question = safe(fields.question).trim();
      const fullName = safe(fields.name).trim();
      const email    = safe(fields.email).trim();

      const userMarkedPersonal = safe(fields.isPersonal).toLowerCase() === "yes";

      const birthDDMM = safe(fields.birthdate);
      const birthISO  = toISO(birthDDMM);
      const birthTime = safe(fields.birthtime, "Unknown");
      const birthPlace = [
        safe(fields.birthcity),
        safe(fields.birthstate),
        safe(fields.birthcountry)
      ].filter(Boolean).join(", ");

      const palmImage = files.palmImage;
      const palmImagePath = palmImage?.size > 0 ? palmImage.filepath : null;

      // classifier (used as hint only)
      let classifier = { type:"unknown", confidence:0, source:"none" };
      try {
        classifier = await classifyQuestion(question);
      } catch {}

      const isPersonal = userMarkedPersonal;

      const decoratedQuestion = `
${question}

[system classifier hint: type=${classifier.type}, confidence=${classifier.confidence}]
[personal mode (from checkbox) = ${isPersonal}]
`;

      // ---- Numerology ----
      let numerologyPack = {};
      if (isPersonal){
        const lp  = lifePath(birthISO);
        const exp = sumLetters(fullName);
        const per = sumCons(fullName);
        const sou = sumVowels(fullName);
        const mat = reduceNum(lp + exp);

        numerologyPack = {
          lifePath: lp,
          expression: exp,
          personality: per,
          soulUrge: sou,
          maturity: mat
        };
      }

      // ---- Insights ----
      let answer="", astrologySummary="", numerologySummary="", palmistrySummary="";

      if (isPersonal){
        const palmBase64 = palmImagePath
          ? Buffer.from(await import("fs").then(fs=>fs.readFileSync(palmImagePath))).toString("base64")
          : null;

        const result = await personalSummaries({
          fullName,
          birthISO,
          birthTime,
          birthPlace,
          question: decoratedQuestion,
          numerologyPack,
          analyzePalm: !!palmBase64,
          palmImageBase64: palmBase64
        });

        answer            = result.answer || "";
        astrologySummary  = result.astrologySummary || "";
        numerologySummary = result.numerologySummary || "";
        palmistrySummary  = result.palmistrySummary || "";

      } else {
        const t = await technicalSummary(decoratedQuestion);
        answer = t.answer || "";
        numerologyPack = {
          technicalKeyPoints: t.keyPoints || [],
          technicalNotes: t.notes || ""
        };
      }

      // ---- PDF ----
      const pdf = await generatePdfBuffer({
        headerBrand: "Melodies Web",
        titleText: "Your Answer",
        mode: isPersonal ? "personal" : "technical",

        question,
        answer,

        fullName,
        birthdate: birthDDMM,
        birthTime,
        birthPlace,

        astrologySummary,
        numerologySummary,
        palmistrySummary,

        numerologyPack
      });

      // ---- EMAIL ----
      if (email){
        await sendEmailHTML({
          to: email,
          subject: "Your Answer",
          html: `
          <div style="font-family:system-ui;max-width:700px;margin:auto;">
            <h2 style="text-align:center;">Melodies Web</h2>
            <h3 style="text-align:center;">Your Answer</h3>
            <p><strong>Question:</strong> ${question}</p>
            <p>${answer}</p>
            <p style="margin-top:20px;color:#777;">Your detailed PDF is attached.</p>
          </div>
          `,
          attachments:[
            { filename:"Your_Answer.pdf", buffer:pdf }
          ]
        });
      }

      return res.status(200).json({
        success:true,
        type: isPersonal ? "personal" : "technical",
        answer,
        astrologySummary,
        numerologySummary,
        palmistrySummary
      });
    });
  } catch(e) {
    console.error("MAIN ERROR:", e);
    return res.status(500).json({ success:false, error:"Server error", detail:e?.message });
  }
}
