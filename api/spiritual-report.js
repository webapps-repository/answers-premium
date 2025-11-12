import { formidable } from "formidable";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { sendEmailWithAttachment } from "./utils/sendEmail.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const config = { api: { bodyParser: false } };

// ------------------ Helpers ------------------
function safeStr(v, d = "") {
  if (!v) return d;
  if (Array.isArray(v)) return v[0] ?? d;
  return String(v);
}
function toIsoDate(d) {
  if (!d) return "";
  const parts = d.split("-");
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : d;
}
function fallbackClassify(q) {
  const text = (q || "").toLowerCase();
  const personal = ["my", "should i", "will i", "born", "marriage", "love", "career", "future"];
  return personal.some((k) => text.includes(k)) ? "personal" : "technical";
}

// ------------------ Numerology ------------------
const MAP = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8 };
const reduce = (n)=>{while(n>9&&![11,22,33].includes(n))n=String(n).split("").reduce((a,b)=>a+ +b,0);return n;};
const only = (s,f)=>[...s.toUpperCase().replace(/[^A-Z]/g,"")].filter(f);
const val = (arr)=>reduce(arr.reduce((a,c)=>a+(MAP[c]||0),0));
const numerology = (name,dob)=>({
  lifePath: reduce([...dob.replace(/\D/g,"")].reduce((a,b)=>a+ +b,0)),
  expression: val(only(name,()=>true)),
  personality: val(only(name,(c)=>!"AEIOUY".includes(c))),
  soulUrge: val(only(name,(c)=>"AEIOUY".includes(c))),
});

// ------------------ Main Handler ------------------
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const form = formidable({ multiples: false });
  form.parse(req, async (err, fields) => {
    if (err) return res.status(500).json({ error: "parse" });

    const q = safeStr(fields.question);
    const name = safeStr(fields.name);
    const email = safeStr(fields.email);
    const dobIso = toIsoDate(safeStr(fields.birthdate));
    const btime = safeStr(fields.birthtime);
    const place = [safeStr(fields.birthcity), safeStr(fields.birthstate), safeStr(fields.birthcountry)].filter(Boolean).join(", ");
    const type = fallbackClassify(q);

    let answer = "", astro = "", numText = "", palm = "";
    let numerics = {};

    if (type === "personal") {
      numerics = numerology(name, dobIso);
      answer = "Your chart suggests transformation and positive movement ahead.";
      astro = "Astrological patterns show upcoming progress and new beginnings.";
      numText = "Numerology highlights adaptability and change, especially over the next cycle.";
      palm = "Palmistry reveals support and growth lines strengthening in the near term.";
    } else {
      answer = "Here is your concise answer. Data-driven logic applies for this query.";
    }

    const pdf = await generatePdfBuffer({
      headerBrand: "Melodies Web",
      title: "Your Answer",
      mode: type,
      question: q,
      answer,
      fullName: name,
      birthdate: fields.birthdate,
      birthTime: btime,
      birthPlace: place,
      astrologySummary: astro,
      numerologySummary: numText,
      palmistrySummary: palm,
      numerologyPack: numerics,
    });

    if (email)
      await sendEmailWithAttachment({
        to: email,
        subject: "Your Answer",
        html: `<p>Your detailed answer is attached.</p>`,
        buffer: pdf,
        filename: "Your_Answer.pdf",
      });

    res.json({
      success: true,
      type,
      answer,
      astrologySummary: astro,
      numerologySummary: numText,
      palmistrySummary: palm,
    });
  });
}
