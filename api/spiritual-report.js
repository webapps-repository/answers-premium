// /api/spiritual-report.js
// Main handler: CORS + reCAPTCHA + classifier + insights + PDF + email (Resend)

import { formidable } from "formidable";
import { classifyQuestion } from "./utils/classify-question.js";
import { verifyRecaptcha } from "./utils/verify-recaptcha.js";
import { personalSummaries, technicalSummary } from "./utils/generate-insights.js";
import { generatePdfBuffer } from "./utils/generate-pdf.js";
import { sendEmailHTML } from "./utils/send-email.js";

export const config = {
  api: { bodyParser: false }
};

// ---------------- Helpers ----------------
const safe = (v, d = "") =>
  v == null ? d : Array.isArray(v) ? String(v[0] ?? d) : String(v);

const toISO = (ddmmyyyy) => {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(ddmmyyyy);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ddmmyyyy;
};

// Numerology (local Pythagorean)
const MAP = {A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8};
const reduce = (n)=>{ while (n>9 && ![11,22,33].includes(n)) n = String(n).split("").reduce((s,d)=>s+(+d||0),0); return n; };
const letters = s => (s||"").toUpperCase().replace(/[^A-Z]/g,"");
const vowels  = s => (s||"").toUpperCase().replace(/[^AEIOUY]/g,"");
const cons    = s => (s||"").toUpperCase().replace(/[^A-Z]|[AEIOUY]/g,"");
const sumName = s => reduce([...letters(s)].reduce((x,c)=>x+(MAP[c]||0),0));
const sumV    = s => reduce([...vowels(s)].reduce((x,c)=>x+(MAP[c]||0),0));
const sumC    = s => reduce([...cons(s)].reduce((x,c)=>x+(MAP[c]||0),0));
const life    = iso=> reduce([...iso.replace(/\D/g,"")].reduce((x,d)=>x+(+d||0),0));

// ---------------------------------------------------
export default async function handler(req, res) {

  // --- CORS for Shopify embeds ---
  res.setHeader("Access-Control-Allow-Origin", "*"); // tighten later
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const form = formidable({
    multiples: false,
    keepExtensions: true,
    allowEmptyFiles: true,
    minFileSize: 0,
    maxFileSize: 10 * 1024 * 1024 // 10MB
  });

  try {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("❌ Formidable error:", err);
        return res.status(400).json({ success:false, error:"File upload error", detail:err.message });
      }

      // Palm image
      const palmFile = files.palmImage;
      const palmPath = palmFile && palmFile.size > 0 ? palmFile.filepath : null;

      // reCAPTCHA
      const token = safe(fields["g-recaptcha-response"]);
      const rc = await verifyRecaptcha(token);
      if (!rc.ok) {
        return res.status(403).json({ success:false, error:"reCAPTCHA failed", details:rc });
      }

      // Basic fields
      const question = safe(fields.question).trim();
      const email    = safe(fields.email).trim();
      const fullName = safe(fields.name).trim();

      const dobDDMM  = safe(fields.birthdate);
      const dobISO   = toISO(dobDDMM);
      const birthTime = safe(fields.birthtime || "Unknown");
      const birthPlace = [safe(fields.birthcity), safe(fields.birthstate), safe(fields.birthcountry)]
        .filter(Boolean)
        .join(", ");

      // --- CLASSIFY ---
      const cls = await classifyQuestion(question);
      const isPersonal = cls.type === "personal";

      // --- NUMEROLOGY ---
      let numerologyPack = {};
      if (isPersonal) {
        const lp = life(dobISO);
        const expr = sumName(fullName);
        const per  = sumC(fullName);
        const soul = sumV(fullName);
        const mat  = reduce(lp + expr);
        numerologyPack = { lifePath: lp, expression: expr, personality: per, soulUrge: soul, maturity: mat };
      }

      // --- INSIGHTS ---
      let answer = "";
      let astrologySummary = "";
      let numerologySummary = "";
      let palmistrySummary = "";

      if (isPersonal) {
        const p = await personalSummaries({
          fullName,
          birthISO: dobISO,
          birthTime,
          birthPlace,
          question,
          numerologyPack
        });
        answer             = p.answer || "";
        astrologySummary   = p.astrologySummary  || "";
        numerologySummary  = p.numerologySummary || "";
        palmistrySummary   = p.palmistrySummary  || "";
      } else {
        const t = await technicalSummary(question);
        answer = t.answer || "";
        numerologyPack = {
          technicalKeyPoints: t.keyPoints || [],
          technicalNotes: t.notes || ""
        };
      }

      // --- PDF ---
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
        astrologySummary,
        numerologySummary,
        palmistrySummary,
        numerologyPack
      });

      // --- EMAIL via Resend ---
      if (email) {
        const html = `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
                      max-width:720px;margin:auto;line-height:1.6;color:#222">
            <h2 style="text-align:center">Melodies Web</h2>
            <h3 style="text-align:center">Your Answer</h3>
            <p><strong>Question:</strong> ${question}</p>
            <p>${answer}</p>
            <p style="font-size:13px;color:#666">Your detailed PDF is attached.</p>
          </div>
        `;

        await sendEmailHTML({
          to: email,
          subject: "Your Answer",
          html,
          attachments: [{ filename:"Your_Answer.pdf", buffer: pdf }]
        });
      }

      // ---- FINAL RESPONSE (for Shopify frontend) ----
      return res.status(200).json({
        success: true,
        type: isPersonal ? "personal" : "technical",
        answer,
        astrologySummary,
        numerologySummary,
        palmistrySummary
      });
    });

  } catch (e) {
    console.error("❌ Handler error:", e);
    return res.status(500).json({ success:false, error:"Server error", detail:String(e) });
  }
}
