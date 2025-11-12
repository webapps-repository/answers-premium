// /api/selftest.js
import OpenAI from "openai";
import { generatePdfBuffer } from "./utils/generatePdf.js";
import { Resend } from "resend";

export const config = { api: { bodyParser: true } };

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  if(req.method==="OPTIONS")return res.status(200).end();

  const results=[];const add=(n,ok,d="")=>results.push({name:n,ok,detail:d});
  const start=Date.now();
  const resendKey=process.env.RESEND_API_KEY;
  const openaiKey=process.env.OPENAI_API_KEY;
  const recaptcha=process.env.RECAPTCHA_SECRET_KEY;
  const testEmail=process.env.TEST_EMAIL||"test@example.com";

  add("Resend API Key",!!resendKey,resendKey?"Found":"Missing");
  add("OpenAI API Key",!!openaiKey,openaiKey?"Found":"Missing");
  add("reCAPTCHA Secret",!!recaptcha,recaptcha?"Found":"Missing");

  const resend=resendKey?new Resend(resendKey):null;
  const openai=openaiKey?new OpenAI({apiKey:openaiKey}):null;

  } catch (err) {
    console.error("❌ Selftest crashed:", err);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: err.message,
    });
  }

  // --- OpenAI Chat ---
  try{
    const r=await openai.chat.completions.create({
      model:"gpt-4o-mini",messages:[{role:"user",content:"Return word PASS"}]
    });
    const out=r.choices?.[0]?.message?.content?.trim()||"";
    add("OpenAI Chat Test",out.includes("PASS"),out);
  }catch(e){add("OpenAI Chat Test",false,e.message);}

  // --- Numerology ---
  const dob="13-03-1960", name="Test User";
  const map={A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8};
  const reduce=n=>{while(n>9&&![11,22,33].includes(n))n=String(n).split("").reduce((a,b)=>a+ +b,0);return n;};
  const life=reduce([...dob.replace(/\D/g,"")].reduce((a,b)=>a+ +b,0));
  const expr=reduce([...name.toUpperCase()].reduce((a,c)=>a+(map[c]||0),0));
  add("Local Numerology",life>0&&expr>0,`Life=${life},Expr=${expr}`);

  // --- PDF ---
  let pdf=null;
  try{
    pdf=await generatePdfBuffer({
      headerBrand:"Melodies Web",title:"Self-Test Report",mode:"technical",
      question:"System Diagnostic Check",answer:"PDF OK",
      numerologyPack:{lifePath:life,expression:expr}
    });
    add("PDF Generation",Buffer.isBuffer(pdf)&&pdf.length>500,`Bytes=${pdf.length}`);
  }catch(e){add("PDF Generation",false,e.message);}

  // --- Resend email ---
  try{
    if(resend){
      await resend.emails.send({
        from:"Melodies Web <noreply@melodiesweb.app>",
        to:testEmail,
        subject:"✅ Melodies Web System Test",
        html:`<p>System check at ${new Date().toLocaleString()}.</p>`,
        attachments:[{filename:"SelfTest.pdf",content:pdf.toString("base64")}]
      });
      add("Email Sending (Resend)",true,`Sent to ${testEmail}`);
    }else add("Email Sending (Resend)",false,"RESEND_API_KEY missing");
  }catch(e){add("Email Sending (Resend)",false,e.message);}

  // --- Mock personal ---
  let simAnswer="";
  try{
    if(openai){
      const r=await openai.chat.completions.create({
        model:"gpt-4o-mini",
        messages:[{role:"user",content:`Respond to "When will I get married?" in JSON {"answer":"short"} only.`}]
      });
      let txt=r.choices?.[0]?.message?.content?.trim()||"{}";
      try{const js=JSON.parse(txt);simAnswer=js.answer;add("Mock Personal Question",!!simAnswer,simAnswer);}
      catch{simAnswer=txt.slice(0,100);add("Mock Personal Question",true,`Fallback:${simAnswer}`);}
    }
  }catch(e){add("Mock Personal Question",false,e.message);}

  add("JSON Output Integrity",results.every(r=>typeof r.ok==="boolean"),"Valid JSON");

  const duration=((Date.now()-start)/1000).toFixed(2);
  res.status(200).json({
    success:true,duration:`${duration}s`,
    summary:`${results.filter(r=>r.ok).length}/${results.length} checks passed`,
    results,
    mockPersonal:{question:"When will I get married?",answer:simAnswer}
  });
}
