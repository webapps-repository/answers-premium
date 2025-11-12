// /api/utils/generatePdf.js

import getStream from "get-stream";
import PDFKit from "pdfkit";

const line = (doc,h=6)=>doc.moveDown(h/12);
const title = (doc,t)=>doc.fontSize(14).fillColor("#111").text(t,{underline:true}).moveDown(0.5);
const header = (doc,brand)=>{doc.fontSize(10).fillColor("#666").text(brand,{align:"center"});doc.moveDown(0.2);};

export async function generatePdfBuffer({
  headerBrand="Melodies Web", title:"Your Answer", mode="personal",
  question, answer, fullName, birthdate, birthTime, birthPlace,
  astrologySummary, numerologySummary, palmistrySummary, numerologyPack={}
}){
  const doc=new PDFKit({margin:56,info:{Title:title,Author:"Melodies Web"}});
  const chunks=[];doc.on("data",c=>chunks.push(c));doc.on("end",()=>{});

  header(doc,headerBrand);
  doc.fontSize(20).fillColor("#000").text(title,{align:"center"});
  line(doc,10);

  if(question){title(doc,"Question");doc.fontSize(12).fillColor("#222").text(question);line(doc,10);}
  title(doc,"Answer");doc.fontSize(12).fillColor("#222").text(answer||"—");line(doc,12);

  if(mode==="technical"){
    const kp=numerologyPack.technicalKeyPoints||[];
    if(kp.length){title(doc,"Key Points");kp.forEach(p=>doc.text("• "+p));line(doc,6);}
    if(numerologyPack.technicalNotes){title(doc,"Notes");doc.text(numerologyPack.technicalNotes);line(doc,6);}
  }else{
    title(doc,"Your Details");
    doc.fontSize(12).text(`Name: ${fullName||"—"}`)
      .text(`Date of Birth: ${birthdate||"—"}`)
      .text(`Time of Birth: ${birthTime||"—"}`)
      .text(`Place: ${birthPlace||"—"}`);line(doc,8);
    title(doc,"Astrology");doc.text(astrologySummary||"—");line(doc,8);
    title(doc,"Numerology");doc.text(numerologySummary||"—");line(doc,6);
    const np=numerologyPack||{};
    ["lifePath","expression","personality","soulUrge","maturity"].forEach(k=>{
      if(np[k]!=null)doc.text(`${k}: ${np[k]}`);
    });
    line(doc,6);
    title(doc,"Palmistry");doc.text(palmistrySummary||"—");line(doc,6);
  }
  doc.fontSize(10).fillColor("#777")
    .text("This report is for informational purposes only.",{align:"center"});
  doc.end();
  return await getStream.buffer(doc);
}
