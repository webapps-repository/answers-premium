// /api/detailed-report.js
// Generates PDF for both personal & technical questions

import { formidable } from "formidable";
import { generatePdfBuffer } from "./utils/generate-pdf.js";
import { sendEmailHTML } from "./utils/send-email.js";

export const config = { api: { bodyParser: false } };

const safe = (v,d="") => v==null?d:Array.isArray(v)?String(v[0]??d):String(v);

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
  if(req.method==="OPTIONS") return res.status(200).end();
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});

  const form = formidable({multiples:false});
  form.parse(req, async(err,fields)=>{
    if(err) return res.status(400).json({success:false, error:"bad form"});

    const email = safe(fields.email,"");
    const question = safe(fields.question,"");
    const payload = JSON.parse(safe(fields.payload,"{}"));

    if(!email){
      return res.status(200).json({ askEmail:true });
    }

    // generate PDF
    const pdf = await generatePdfBuffer({
      headerBrand:"Melodies Web",
      titleText:"Your Detailed Answer",
      question,
      ...payload
    });

    await sendEmailHTML({
      to:email,
      subject:`Detailed Report: ${question}`,
      html:`<p>Your full detailed report PDF is attached.</p>`,
      attachments:[{filename:"Detailed_Report.pdf", buffer:pdf}]
    });

    return res.status(200).json({success:true, sent:true});
  });
}

