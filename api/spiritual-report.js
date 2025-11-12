// /api/spiritual-report.js
// Handles form input, classifies question, generates AI summary, PDF, and sends via Resend.

import { formidable } from "formidable";
import OpenAI from "openai";
import { Resend } from "resend";
import { generatePdfBuffer } from "./utils/generatePdf.js";

export const config = { api: { bodyParser: false } };

// ---------- Helpers ----------
const safeStr = (v, f = "") => (Array.isArray(v) ? String(v[0] ?? f) : String(v ?? f));
const toIso = (d) => {
  if (!d) return "";
  const p = d.split("-").map(x => x.trim());
  if (p.length !== 3) return d;
  const [dd, mm, yyyy] = p;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
};
const classify = (q) => {
  const s = (q || "").toLowerCase();
  const pers = ["my","should i","will i","born","love","marriage","career","future"];
  return pers.some(x => s.includes(x)) ? "personal" : "technical";
};

// ---------- Numerology ----------
const MAP = {A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8};
const reduce = n => { while(n>9&&![11,22,33].includes(n)) n=String(n).split("").reduce((a,b)=>a+(+b||0),0); return n; };
const clean = s => (s||"").toUpperCase().replace(/[^A-Z]/g,"");
const onlyV = s => clean(s).replace(/[^AEIOUY]/g,"");
const onlyC = s => clean(s).replace(/[AEIOUY]/g,"");
const sum = s => reduce([...s].reduce((a,c)=>a+(MAP[c]||0),0));
const lifePath = dob => reduce([...dob.replace(/\D/g,"")].reduce((a,b)=>a+(+b||0),0));

// ---------- Main Handler ----------
export default async function handler(req, res) {
  try {
    // --- CORS ---
    const allowed = ["https://zzqejx-u8.myshopify.com", "https://answers-rust.vercel.app"];
    const origin = req.headers.origin || "";
    res.setHeader("Access-Control-Allow-Origin", allowed.includes(origin) ? origin : allowed[0]);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

    // --- Init clients ---
    const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    // --- Parse form ---
    const form = formidable({ multiples: false });
    form.parse(req, async (err, fields) => {
      if (err) return res.status(500).json({ success: false, error: "Form parse failed" });

      const question = safeStr(fields.question);
      const name = safeStr(fields.name);
      const email = safeStr(fields.email);
      const dobIso = toIso(safeStr(fields.birthdate));
      const time = safeStr(fields.birthtime);
      const place = [safeStr(fields.birthcity), safeStr(fields.birthstate), safeStr(fields.birthcountry)].filter(Boolean).join(", ");
      const type = classify(question);
      const isPersonal = type === "personal";

      // --- Numerology ---
      let nums = null;
      if (isPersonal) {
        nums = {
          lifePath: lifePath(dobIso),
          expression: sum(clean(name)),
          personality: sum(onlyC(name)),
          soulUrge: sum(onlyV(name))
        };
      }

      // --- AI answer ---
      let answer = "Processing...", astro = "", numSum = "", palm = "";
      try {
        if (openai) {
          if (isPersonal) {
            const prompt = `Provide JSON {"answer":"short","astrologySummary":"short","numerologySummary":"short","palmistrySummary":"short"} for:\nName:${name}\nDOB:${dobIso}\nQuestion:${question}`;
            const r = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.6,
            });
            const txt = r.choices?.[0]?.message?.content?.trim() || "{}";
            try {
              const js = JSON.parse(txt);
              answer = js.answer ?? "Insight generated.";
              astro = js.astrologySummary ?? "";
              numSum = js.numerologySummary ?? "";
              palm = js.palmistrySummary ?? "";
            } catch {
              answer = txt;
            }
          } else {
            const r = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: `Answer shortly: ${question}` }],
            });
            answer = r.choices?.[0]?.message?.content?.trim() ?? "Here is your answer.";
          }
        } else answer = "OpenAI key missing.";
      } catch (e) {
        answer = "AI error: " + e.message;
      }

      // --- PDF ---
      const pdf = await generatePdfBuffer({
        headerBrand: "Melodies Web",
        title: "Your Answer",
        mode: type,
        question,
        answer,
        fullName: name,
        birthdate: fields.birthdate,
        birthTime: time,
        birthPlace: place,
        astrologySummary: astro,
        numerologySummary: numSum,
        palmistrySummary: palm,
        numerologyPack: nums,
      });

      // --- Email ---
      if (email && resend) {
        try {
          await resend.emails.send({
            from: "Melodies Web <noreply@melodiesweb.app>",
            to: email,
            subject: "Your Detailed Answer",
            html: `<p>Your detailed report for <b>${question}</b> is attached.</p>`,
            attachments: [{ filename: "Your_Answer.pdf", content: pdf.toString("base64") }],
          });
        } catch (e) {
          console.error("Email send error:", e);
        }
      }

      res.status(200).json({
        success: true,
        type,
        answer,
        astrologySummary: astro,
        numerologySummary: numSum,
        palmistrySummary: palm,
      });
    });
  } catch (err) {
    console.error("Fatal error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
