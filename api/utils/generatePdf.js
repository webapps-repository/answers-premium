import getStream from "get-stream";
import PDFKit from "pdfkit";

export async function generatePdfBuffer({
  headerBrand="Melodies Web", title="Your Answer", mode="personal",
  question, answer, fullName, birthdate, birthTime, birthPlace,
  astrologySummary, numerologySummary, palmistrySummary, numerologyPack={}
}){
  const doc=new PDFKit({margin:56,info:{Title:title,Author:"Melodies Web"}});
  const chunks=[]; doc.on("data",c=>chunks.push(c)); doc.on("end",()=>{});
  const line=h=>doc.moveDown(h/12);
  const h1=t=>doc.fontSize(14).fillColor("#000").text(t,{underline:true}).moveDown(0.4);

  // Header
  doc.fontSize(10).fillColor("#666").text(headerBrand,{align:"center"}).moveDown(0.3);
  doc.fontSize(20).fillColor("#000").text(title,{align:"center"}); line(8);

  if(question){h1("Question");doc.fontSize(12).text(question);line(6);}
  h1("Answer");doc.fontSize(12).text(answer||"—");line(8);

  if(mode==="technical"){
    if(numerologyPack.technicalKeyPoints?.length){
      h1("Key Points");
      numerologyPack.technicalKeyPoints.forEach(p=>doc.text("• "+p));
      line(6);
    }
    if(numerologyPack.technicalNotes){h1("Notes");doc.text(numerologyPack.technicalNotes);line(6);}
  }else{
    h1("Your Details");
    doc.text(`Name: ${fullName||"—"}`).text(`Date of Birth: ${birthdate||"—"}`)
       .text(`Time of Birth: ${birthTime||"—"}`).text(`Place: ${birthPlace||"—"}`);line(6);
    h1("Astrology");doc.text(astrologySummary||"—");line(6);
    h1("Numerology");doc.text(numerologySummary||"—");line(6);
    const np=numerologyPack;
    ["lifePath","expression","personality","soulUrge","maturity"].forEach(k=>{
      const v=np[k]; if(v) doc.text(`${k[0].toUpperCase()+k.slice(1)} — ${v}`).moveDown(0.2);
    });
    line(6);
    h1("Palmistry");doc.text(palmistrySummary||"—");line(6);
  }
  doc.fontSize(10).fillColor("#777").text("This report is for informational purposes only.",{align:"center"});
  doc.end(); return await getStream.buffer(doc);
}
