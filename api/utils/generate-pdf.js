// /api/utils/generate-pdf.js
import getStream from "get-stream";

let PDFDocument;
try {
  PDFDocument = (await import("pdfkit")).default;
} catch (e) {
  console.error("PDFKit load error:", e);
  throw e;
}

export async function generatePdfBuffer(opts={}) {
  const doc = new PDFDocument({
    margin: 50,
    info: { Title: opts.titleText || "Your Answer", Author: "Melodies Web" }
  });

  const chunks=[];
  doc.on("data", c => chunks.push(c));
  doc.on("end", ()=>{});

  // Header
  doc.fontSize(10).fillColor("#555").text(opts.headerBrand || "Melodies Web",{align:"center"});
  doc.moveDown(0.5);
  doc.fontSize(20).fillColor("#000").text(opts.titleText || "Your Answer",{align:"center"});
  doc.moveDown(1);

  // Question
  doc.fontSize(14).fillColor("#222").text("Question",{underline:true});
  doc.moveDown(0.4);
  doc.fontSize(12).text(opts.question || "—");
  doc.moveDown(1);

  // Answer
  doc.fontSize(14).text("Answer",{underline:true});
  doc.moveDown(0.4);
  doc.fontSize(12).text(opts.answer || "—");
  doc.moveDown(1);

  if (opts.mode === "technical") {
    const pack = opts.numerologyPack || {};
    if (Array.isArray(pack.technicalKeyPoints)) {
      doc.fontSize(14).text("Key Points",{underline:true}); doc.moveDown(0.4);
      pack.technicalKeyPoints.forEach(p=>doc.fontSize(12).text("• "+p));
      doc.moveDown(1);
    }
    if (pack.technicalNotes) {
      doc.fontSize(14).text("Notes",{underline:true}); doc.moveDown(0.4);
      doc.fontSize(12).text(pack.technicalNotes);
      doc.moveDown(1);
    }
  } else {
    doc.fontSize(14).text("Your Details",{underline:true});
    doc.moveDown(0.4);
    doc.fontSize(12)
      .text(`Name: ${opts.fullName || "—"}`)
      .text(`Date of Birth: ${opts.birthdate || "—"}`)
      .text(`Time: ${opts.birthTime || "—"}`)
      .text(`Place: ${opts.birthPlace || "—"}`);
    doc.moveDown(1);

    doc.fontSize(14).text("Astrology",{underline:true});
    doc.moveDown(0.4);
    doc.fontSize(12).text(opts.astrologySummary || "—");
    doc.moveDown(1);

    doc.fontSize(14).text("Numerology",{underline:true});
    doc.moveDown(0.4);
    doc.fontSize(12).text(opts.numerologySummary || "—");
    doc.moveDown(0.6);

    const np = opts.numerologyPack || {};
    for (const [key,val] of Object.entries(np)) {
      if (["lifePath","expression","personality","soulUrge","maturity"].includes(key)) {
        doc.fontSize(12).fillColor("#111").text(`${key}: ${val}`);
        doc.fontSize(11).fillColor("#444").text(`Meaning: Interpretation for ${key} ${val}.`);
        doc.moveDown(0.5);
      }
    }
    doc.moveDown(1);

    doc.fontSize(14).text("Palmistry",{underline:true});
    doc.moveDown(0.4);
    doc.fontSize(12).text(opts.palmistrySummary || "—");
    doc.moveDown(1);
  }

  doc.fontSize(10).fillColor("#777").text("This report is for informational purposes only.",{align:"center"});
  doc.end();

  return await getStream.buffer(doc);
}
