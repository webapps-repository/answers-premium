// /api/utils/generate-pdf.js
import getStream from "get-stream";
let PDFDocument;

try {
  PDFDocument = (await import("pdfkit")).default;
} catch (e) {
  console.error("PDFKit load error:", e);
  throw e;
}

export async function generatePdfBuffer({
  headerBrand = "Melodies Web",
  titleText = "Your Answer",
  mode = "personal",

  question,
  answer,

  fullName,
  birthdate,
  birthTime,
  birthPlace,

  astrologySummary,
  numerologySummary,
  palmistrySummary,

  numerologyPack = {},
  astrologyChart = null,
  palmistryData = null
}) {
  const doc = new PDFDocument({ margin: 56 });
  const chunks = [];
  doc.on("data", c => chunks.push(c));

  // HEADER
  doc.fontSize(10).text(headerBrand, { align: "center" });
  doc.fontSize(22).text(titleText, { align: "center" });
  doc.moveDown(1.0);

  // QUESTION
  doc.fontSize(14).text("Question", { underline: true });
  doc.fontSize(12).text(question);
  doc.moveDown(1);

  // ANSWER
  doc.fontSize(14).text("Answer", { underline: true });
  doc.fontSize(12).text(answer);
  doc.moveDown(1.4);

  if (mode === "technical") {
    if (Array.isArray(numerologyPack.technicalKeyPoints)) {
      doc.fontSize(14).text("Key Points", { underline: true });
      numerologyPack.technicalKeyPoints.forEach(p => doc.text("• " + p));
      doc.moveDown(1);
    }
    if (numerologyPack.technicalNotes) {
      doc.fontSize(14).text("Notes", { underline: true });
      doc.fontSize(12).text(numerologyPack.technicalNotes);
    }
    doc.end();
    return await getStream.buffer(doc);
  }

  // PERSONAL REPORT CONTENT
  doc.fontSize(14).text("Your Details", { underline: true });
  doc.fontSize(12)
    .text(`Name: ${fullName}`)
    .text(`Date of Birth: ${birthdate}`)
    .text(`Time: ${birthTime}`)
    .text(`Place: ${birthPlace}`);
  doc.moveDown(1.4);

  // ASTROLOGY
  doc.fontSize(14).text("Astrology", { underline: true });
  doc.fontSize(12).text(astrologySummary);
  doc.moveDown(1);

  // Insert astrology chart image if exists
  if (astrologyChart) {
    try {
      doc.image(astrologyChart, { width: 420 });
      doc.moveDown(1);
    } catch {}
  }

  // NUMEROLOGY
  doc.fontSize(14).text("Numerology", { underline: true });
  doc.fontSize(12).text(numerologySummary);
  doc.moveDown(1);

  const nums = [
    ["Life Path", numerologyPack.lifePath],
    ["Expression", numerologyPack.expression],
    ["Personality", numerologyPack.personality],
    ["Soul Urge", numerologyPack.soulUrge],
    ["Maturity", numerologyPack.maturity],
  ];

  nums.forEach(([label, val]) => {
    doc.fontSize(12).text(`${label}: ${val}`);
    doc.moveDown(0.3);
  });

  doc.moveDown(1);

  // PALMISTRY
  doc.fontSize(14).text("Palmistry", { underline: true });
  doc.fontSize(12).text(palmistrySummary);

  if (palmistryData?.image) {
    doc.moveDown(1);
    try {
      doc.image(palmistryData.image, { width: 300 });
    } catch {}
  }

  doc.end();
  return await getStream.buffer(doc);
}
