// /api/spiritual-report.js
// Handles question classification (personal vs technical),
// generates AI summaries, produces PDFs, and emails via Resend.

import { formidable } from "formidable";
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { Resend } from "resend";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();  // stop here for preflight
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // --- Now safe to parse Formidable after preflight done ---
  const form = formidable({ multiples: false, keepExtensions: true });
}

// ---------- Helpers ----------
function safeStr(x, fallback = "") {
  if (x == null) return fallback;
  if (Array.isArray(x)) return String(x[0] ?? fallback);
  return String(x);
}
function toIsoFromDDMMYYYY(d) {
  if (!d) return "";
  const parts = d.split("-").map(p => p.trim());
  if (parts.length !== 3) return d;
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
}
function epochIso() { return new Date().toISOString(); }
function fallbackClassify(question) {
  const q = (question||"").toLowerCase();
  const hints = ["my","should i","will i","born","birth","love","career","future","marriage","health"];
  return hints.some(h => q.includes(h)) ? "personal" : "technical";
}

// ---------- Numerology ----------
const P_MAP = {A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8};
const reduceNum = n => {while(n>9&&![11,22,33].includes(n))n=String(n).split("").reduce((a,b)=>a+(+b||0),0);return n;};
const onlyLetters = s => (s||"").toUpperCase().replace(/[^A-Z]/g,"");
const onlyVowels = s => (s||"").toUpperCase().replace(/[^AEIOUY]/g,"");
const onlyCons = s => (s||"").toUpperCase().replace(/[^A-Z]|[AEIOUY]/g,"");
function lifePathFromISO(d){const digits=(d||"").replace(/\D/g,"");return reduceNum([...digits].reduce((a,b)=>a+(+b||0),0));}
function nameSum(n){const s=onlyLetters(n);return reduceNum([...s].reduce((a,c)=>a+(P_MAP[c]||0),0));}
function soulUrge(n){const s=onlyVowels(n);return reduceNum([...s].reduce((a,c)=>a+(P_MAP[c]||0),0));}
function personalityNum(n){const s=onlyCons(n);return reduceNum([...s].reduce((a,c)=>a+(P_MAP[c]||0),0));}
function maturityNumber(lp,expr){return reduceNum(Number(lp||0)+Number(expr||0));}

// ---------- Handler ----------
export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type,Authorization");
  if(req.method==="OPTIONS")return res.status(200).end();
  if(req.method!=="POST")return res.status(405).end();

  const openai = process.env.OPENAI_API_KEY ? new OpenAI({apiKey:process.env.OPENAI_API_KEY}) : null;
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  const form=formidable({multiples:false,keepExtensions:true});
  form.parse(req,async(err,fields)=>{
    if(err)return res.status(500).json({success:false,error:"Form parse failed"});

    const question=safeStr(fields.question).trim();
    const email=safeStr(fields.email).trim();
    const fullName=safeStr(fields.name).trim();
    const birthdateDDMM=safeStr(fields.birthdate);
    const birthdateISO=toIsoFromDDMMYYYY(birthdateDDMM);
    const birthTime=safeStr(fields.birthtime,"Unknown");
    const birthPlace=[safeStr(fields.birthcity),safeStr(fields.birthstate),safeStr(fields.birthcountry)]
        .filter(Boolean).join(", ");
    const type=fallbackClassify(question);
    const isPersonal=type==="personal";

    // --- Numerology ---
    let numerologyNumbers=null;
    if(isPersonal){
      const lp=lifePathFromISO(birthdateISO);
      const expr=nameSum(fullName);
      const pers=personalityNum(fullName);
      const soul=soulUrge(fullName);
      const mat=maturityNumber(lp,expr);
      numerologyNumbers={lifePath:lp,expression:expr,personality:pers,soulUrge:soul,maturity:mat};
    }

    // --- AI answers ---
    let answer=""; let astro=""; let numSum=""; let palm="";
    try{
      if(openai){
        if(isPersonal){
          const prompt=`Provide JSON {"answer":"short","astrologySummary":"short","numerologySummary":"short","palmistrySummary":"short"} for:\nName:${fullName}\nDOB:${birthdateISO}\nQuestion:${question}`;
          const r=await openai.chat.completions.create({
            model:"gpt-4o-mini",
            messages:[{role:"user",content:prompt}],
            temperature:0.6,
          });
          const txt=r.choices?.[0]?.message?.content?.trim()||"{}";
          const js=JSON.parse(txt);
          answer=js.answer||"Insight generated.";
          astro=js.astrologySummary||"Astrology unavailable.";
          numSum=js.numerologySummary||"Numerology unavailable.";
          palm=js.palmistrySummary||"Palmistry unavailable.";
        }else{
          const r=await openai.chat.completions.create({
            model:"gpt-4o-mini",
            messages:[{role:"user",content:`Summarize briefly:\n${question}`}],
            temperature:0.5,
          });
          answer=r.choices?.[0]?.message?.content?.trim()||"Here is your concise answer.";
        }
      } else {
        answer="OpenAI key missing — running in fallback mode.";
      }
    }catch(e){answer="AI generation error: "+e.message;}

    // --- PDF ---
    const pdf=await generatePdfBuffer({
      headerBrand:"Melodies Web",
      title:"Your Answer",
      mode:type,
      question,
      answer,
      fullName,
      birthdate:birthdateDDMM,
      birthTime,
      birthPlace,
      astrologySummary:astro,
      numerologySummary:numSum,
      palmistrySummary:palm,
      numerologyPack:numerologyNumbers,
    });

    // --- Email via Resend ---
    if(email && resend){
      try{
        await resend.emails.send({
          from:"Melodies Web <noreply@melodiesweb.app>",
          to:email,
          subject:"Your Detailed Answer",
          html:`<p><strong>Question:</strong> ${question}</p>
                <p>${answer}</p>
                <p><small>A detailed PDF is attached.</small></p>`,
          attachments:[{
            filename:"Your_Answer.pdf",
            content:pdf.toString("base64"),
          }],
        });
      }catch(e){
        console.error("Email failed:",e);
      }
    }

    res.status(200).json({
      success:true,
      type,
      answer,
      astrologySummary:astro,
      numerologySummary:numSum,
      palmistrySummary:palm,
    });
  });
}
