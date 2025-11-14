// /api/utils/generate-pdf.js
import getStream from "get-stream";

let PDFDocument;
try {
  PDFDocument = (await import("pdfkit")).default;
} catch (e) {
  console.error("PDFKit load error:", e);
}

export async function generatePdfBuffer({
  headerBrand,
  titleText,
  mode,
  question,
  answer,
  fullName,
  birthdate,
  birthTime,
  birthPlace,
  astrologySummary,
  numerologySummary,
  palmistrySummary,
  numerologyPack
}) {
  const doc = new PDFDocument({
    margin: 50,
    size: "A4"
  });

  const chunks = [];
  doc.on("data", c => chunks.push(c));
  doc.on("end", () => {});

  // Header
  doc
    .fontSize(22)
    .text(headerBrand, { align: "center" })
    .moveDown(0.5);

  doc
    .fontSize(18)
    .text(titleText, { align: "center" })
    .moveDown(1.2);

  // Question + Answer
  doc.fontSize(12);

  doc.text(`Question: ${question}`).moveDown(0.8);

  doc
    .fontSize(14)
    .text("Your Answer", { underline: true })
    .moveDown(0.4);

  doc
    .fontSize(12)
    .text(answer)
    .moveDown(1.4);

  if (mode === "personal") {
    doc
      .fontSize(14)
      .text("Astrology Summary", { underline: true })
      .moveDown(0.4);
    doc
      .fontSize(12)
      .text(astrologySummary)
      .moveDown(1.4);

    doc
      .fontSize(14)
      .text("Numerology Summary", { underline: true })
      .moveDown(0.4);
    doc
      .fontSize(12)
      .text(numerologySummary)
      .moveDown(1.4);

    doc
      .fontSize(14)
      .text("Palmistry Summary", { underline: true })
      .moveDown(0.4);
    doc
      .fontSize(12)
      .text(palmistrySummary)
      .moveDown(1.4);

    // Numerology details
    doc
      .fontSize(14)
      .text("Numerology Details", { underline: true })
      .moveDown(0.4);

    doc.fontSize(12);
    Object.entries(numerologyPack).forEach(([key, val]) => {
      doc.text(`${key}: ${val}`);
    });
  } else {
    doc
      .fontSize(14)
      .text("Technical Notes", { underline: true })
      .moveDown(0.4);

    if (numerologyPack.technicalKeyPoints) {
      numerologyPack.technicalKeyPoints.forEach(k => {
        doc.text(`• ${k}`);
      });
    }
    if (numerologyPack.technicalNotes) {
      doc.moveDown(0.6).text(numerologyPack.technicalNotes);
    }
  }

  doc.end();
  return await getStream.buffer(doc);
}
