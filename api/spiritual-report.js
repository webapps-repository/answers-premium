// /api/spiritual-report.js
import { formidable } from "formidable";
import { classifyQuestion } from "./utils/classify-question.js";
import { verifyRecaptcha } from "./utils/verify-recaptcha.js";
import { personalSummaries, technicalSummary } from "./utils/generate-insights.js";
import { generatePdfBuffer } from "./utils/generate-pdf.js";
import { sendEmailHTML } from "./utils/send-email.js";

export const config = { api: { bodyParser: false } };

const safe = (v, d = "") =>
  v == null ? d : Array.isArray(v) ? String(v[0] ?? d) : String(v);

const toISO = (ddmmyyyy) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(ddmmyyyy || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ddmmyyyy;
};

// Numerology ----------------------------------------------------
const MAP = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8
};
const reduce = (n)=>{while(n>9 && ![11,22,33].includes(n))n=String(n).split("").reduce((a,b)=>a+(+b||0),0);return n;};
const letters = s => (s||"").toUpperCase().replace(/[^A-Z]/g,"");
const vowels  = s => (s||"").toUpperCase().replace(/[^AEIOUY]/g,"");
const cons    = s => (s||"").toUpperCase().replace(/[^A-Z]|[AEIOUY]/g,"");
const sum     = s => reduce(letters(s).split("").reduce((t,c)=>t+(MAP[c]||0),0));
const sumV    = s => reduce(vowels(s).split("").reduce((t,c)=>t+(MAP[c]||0),0));
const sumC    = s => reduce(cons(s).split("").reduce((t,c)=>t+(MAP[c]||0),0));
const life    = iso => reduce((iso||"").replace(/\D/g,"").split("").reduce((t,d)=>t+(+d||0),0));

// Handler -------------------------------------------------------
export default async function handler(req, res) {
  // CORS --------------------------------------------------------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  // Form --------------------------------------------------------
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    allowEmptyFiles: true,
    maxFileSize: 10 * 1024 * 1024
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("formidable error:", err);
      return res.status(400).json({ success: false, error: "parse_error" });
    }

    // reCAPTCHA -------------------------------------------------
    const token = safe(fields["g-recaptcha-response"]);
    const rc = await verifyRecaptcha(token);
    if (!rc.ok) return res.status(403).json({ success: false, error: "recaptcha_failed", details: rc });

    // Extract ---------------------------------------------------
    const question = safe(fields.question);
    const email = safe(fields.email);
    const fullName = safe(fields.name);
    const birthdate = safe(fields.birthdate);
    const birthISO = toISO(birthdate);
    const birthTime = safe(fields.birthtime, "Unknown");
    const birthPlace = [
      safe(fields.birthcity),
      safe(fields.birthstate),
      safe(fields.birthcountry)
    ].filter(Boolean).join(", ");

    // User checkbox overrides classifier ------------------------
    const flag = safe(fields.isPersonal).toLowerCase();
    const isPersonal = ["yes","true","on","personal"].includes(flag);

    const classification = await classifyQuestion(question);
    const decoratedQ = `${question}

[Hint: classifier=${classification.type}, conf=${classification.confidence}]`;

    // Numerology ------------------------------------------------
    let numerologyPack = {};
    if (isPersonal) {
      const lp = life(birthISO);
      const expr = sum(fullName);
      const pers = sumC(fullName);
      const soul = sumV(fullName);
      const mat = reduce(lp + expr);
      numerologyPack = { lifePath: lp, expression: expr, personality: pers, soulUrge: soul, maturity: mat };
    }

    // Insights ---------------------------------------------------
    let answer = "", astro = "", num = "", palm = "";
    if (isPersonal) {
      const p = await personalSummaries({
        fullName, birthISO, birthTime, birthPlace, question: decoratedQ, numerologyPack
      });
      answer = p.answer;
      astro = p.astrologySummary;
      num = p.numerologySummary;
      palm = p.palmistrySummary;
    } else {
      const t = await technicalSummary(question);
      answer = t.answer;
      numerologyPack = { technicalKeyPoints: t.keyPoints, technicalNotes: t.notes };
    }

    // PDF --------------------------------------------------------
    const pdf = await generatePdfBuffer({
      headerBrand: "Melodies Web",
      titleText: "Your Answer",
      mode: isPersonal ? "personal" : "technical",
      question,
      answer,
      fullName,
      birthdate,
      birthTime,
      birthPlace,
      astrologySummary: astro,
      numerologySummary: num,
      palmistrySummary: palm,
      numerologyPack
    });

    // Email ------------------------------------------------------
    if (email) {
      await sendEmailHTML({
        to: email,
        subject: "Your Answer",
        html: `<p><b>Question:</b> ${question}</p><p>${answer}</p><p>PDF attached.</p>`,
        attachments: [{ filename: "Your_Answer.pdf", buffer: pdf }]
      });
    }

    // Response ---------------------------------------------------
    res.json({
      success: true,
      type: isPersonal ? "personal" : "technical",
      answer,
      astrologySummary: astro,
      numerologySummary: num,
      palmistrySummary: palm
    });
  });
}
