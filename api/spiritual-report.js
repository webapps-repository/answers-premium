// Core handler (CORS + reCAPTCHA + classify + insights + PDF + email)
import { formidable } from "formidable";
import { classifyQuestion } from "./utils/classify-question.js";
import { verifyRecaptcha } from "./utils/verify-recaptcha.js";
import { personalSummaries, technicalSummary } from "./utils/generate-insights.js";
import { generatePdfBuffer } from "./utils/generate-pdf.js";
import { sendEmailHTML } from "./utils/send-email.js";

export const config = { api: { bodyParser: false } };

// helpers
const safe = (v, d = "") => (v == null ? d : Array.isArray(v) ? String(v[0] ?? d) : String(v));
const toISO = (ddmmyyyy) => {
  const s = safe(ddmmyyyy);
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
};

// numerology (local, pythagorean)
const MAP = {A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8};
const reduce = (n)=>{ while(n>9 && ![11,22,33].includes(n)) n=String(n).split("").reduce((a,b)=>a+(+b||0),0); return n; };
const letters = s => (s||"").toUpperCase().replace(/[^A-Z]/g,"");
const vowels  = s => (s||"").toUpperCase().replace(/[^AEIOUY]/g,"");
const cons    = s => (s||"").toUpperCase().replace(/[^A-Z]|[AEIOUY]/g,"");
const sumName = s => reduce(letters(s).split("").reduce((t,c)=>t+(MAP[c]||0),0));
const sumV    = s => reduce(vowels(s).split("").reduce((t,c)=>t+(MAP[c]||0),0));
const sumC    = s => reduce(cons(s).split("").reduce((t,c)=>t+(MAP[c]||0),0));
const life    = iso => reduce((iso||"").replace(/\D/g,"").split("").reduce((t,d)=>t+(+d||0),0));

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*"); // tighten later
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const form = formidable({multiples: false, keepExtensions: true, allowEmptyFiles: true, minFileSize: 0,  maxFileSize: 10 * 1024 * 1024, });

  try {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("❌ formidable parse error:", err);
        return res.status(400).json({
          success: false,
          error: "File upload error",
          detail: err.message,
        });
      }
      
      const palmImage = files.palmImage;
      const palmImagePath = palmImage && palmImage.size > 0 ? palmImage.filepath : null;

      // reCAPTCHA
      const token = safe(fields["g-recaptcha-response"]);
      const rc = await verifyRecaptcha(token);
      if (!rc.ok) {
        return res.status(403).json({ error: "reCAPTCHA verification failed", details: rc });
      }

      // inputs
      const question  = safe(fields.question).trim();
      const email     = safe(fields.email).trim();
      const fullName  = safe(fields.name).trim();
      const birthDDMM = safe(fields.birthdate);
      const birthISO  = toISO(birthDDMM);
      const birthTime = safe(fields.birthtime, "Unknown");
      const birthPlace = [safe(fields.birthcity), safe(fields.birthstate), safe(fields.birthcountry)]
        .filter(Boolean).join(", ");

      // classify
      const cls = await classifyQuestion(question);
      const isPersonal = cls.type === "personal";

      // numerology pack
      let numerologyPack = {};
      if (isPersonal) {
        const lp = life(birthISO);
        const expr = sumName(fullName);
        const pers = sumC(fullName);
        const soul = sumV(fullName);
        const mat  = reduce(lp + expr);
        numerologyPack = { lifePath: lp, expression: expr, personality: pers, soulUrge: soul, maturity: mat };
      }

      // insights
      let answer = "", astrologySummary = "", numerologySummary = "", palmistrySummary = "";
      if (isPersonal) {
        const s = await personalSummaries({
          fullName, birthISO, birthTime, birthPlace, question, numerologyPack
        });
        answer = s.answer || "Here is your personal answer.";
        astrologySummary  = s.astrologySummary  || "";
        numerologySummary = s.numerologySummary || "";
        palmistrySummary  = s.palmistrySummary  || "";
      } else {
        const t = await technicalSummary(question);
        answer = t.answer || "Here is a concise answer.";
        numerologyPack = {
          technicalKeyPoints: Array.isArray(t.keyPoints) ? t.keyPoints : [],
          technicalNotes: t.notes || "",
        };
      }

      // PDF
      const pdf = await generatePdfBuffer({
        headerBrand: "Melodies Web",
        titleText: "Your Answer",
        mode: isPersonal ? "personal" : "technical",
        question, answer,
        fullName, birthdate: birthDDMM, birthTime, birthPlace,
        astrologySummary, numerologySummary, palmistrySummary,
        numerologyPack
      });

      // Email (if provided)
      if (email) {
        const html = `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:720px;margin:auto;color:#222;line-height:1.55">
            <h2 style="text-align:center;margin:0 0 8px 0;">Melodies Web</h2>
            <h3 style="text-align:center;margin:0 0 16px 0;">Your Answer</h3>
            <p><b>Question:</b> ${question || "—"}</p>
            <p>${answer}</p>
            <p style="color:#666;font-size:13px;margin-top:16px;">Your detailed PDF is attached.</p>
          </div>`;
        await sendEmailHTML({
          to: email,
          subject: "Your Answer",
          html,
          attachments: [{ filename: "Your_Answer.pdf", buffer: pdf }],
        });
      }

      // Web response
      return res.status(200).json({
        success: true,
        type: isPersonal ? "personal" : "technical",
        answer,
        astrologySummary,
        numerologySummary,
        palmistrySummary,
      });
    });
  } catch (e) {
    console.error("unhandled error:", e);
    return res.status(500).json({ error: "Server error", detail: String(e?.message || e) });
  }
}
