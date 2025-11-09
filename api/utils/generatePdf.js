// /api/utils/generatePdf.js
import getStream from "get-stream";

// Dynamic import is safest on Vercel
let PDFDocument;
try {
  PDFDocument = (await import("pdfkit")).default; // pdfkit ^0.17.x
} catch (err) {
  console.error("Failed to load PDFKit:", err);
  throw err;
}

// Approximate 1.5 line spacing via lineGap
const LINE_GAP = 6; // works well for 12pt text

function heading(doc, text) {
  maybePageBreak(doc, 42);
  doc
    .moveDown(0.2)
    .fontSize(18)
    .fillColor("#4B0082")
    .text(text, { underline: true })
    .moveDown(0.4);
}

function subheading(doc, text) {
  maybePageBreak(doc, 28);
  doc
    .fontSize(13)
    .fillColor("#4B0082")
    .text(text)
    .moveDown(0.1);
}

function paragraph(doc, text = "") {
  maybePageBreak(doc, 60);
  doc
    .fontSize(12)
    .fillColor("#222")
    .text(text || "—", { lineGap: LINE_GAP })
    .moveDown(0.2);
}

function detailsBlock(doc, kvPairs = []) {
  kvPairs.forEach(([label, value]) => {
    maybePageBreak(doc, 24);
    doc.fontSize(12).fillColor("#222")
      .text(`${label}: ${value || "—"}`, { lineGap: LINE_GAP });
  });
  doc.moveDown(0.4);
}

function maybePageBreak(doc, needed = 40) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
}

export async function generatePdfBuffer({
  fullName,
  birthdate,
  birthTime,
  birthPlace,
  question,

  // narrative content from OpenAI
  answer,
  astrology = {},
  numerology = {},
  palmistry = {},
}) {
  const doc = new PDFDocument({ margin: 50 });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  doc.on("end", () => console.log("PDF generation complete"));

  // Title
  doc
    .fontSize(22)
    .fillColor("#4B0082")
    .text("Personal Spiritual Report", { align: "center" })
    .moveDown(0.8);

  // Details (no icons; full width)
  detailsBlock(doc, [
    ["Name", fullName],
    ["Date of Birth", birthdate],
    ["Time of Birth", birthTime || "Unknown"],
    ["Birth Place", birthPlace],
    ["Question", question || "—"],
  ]);

  // Answer
  heading(doc, "Answer to Your Question");
  paragraph(doc, answer);

  // Astrology (summary + subsections)
  heading(doc, "Astrology");
  paragraph(doc, astrology.summary);

  subheading(doc, "Planetary Positions");
  paragraph(doc, astrology.planetaryPositions);

  subheading(doc, "Ascendant (Rising)");
  paragraph(doc, astrology.ascendant);

  subheading(doc, "Houses");
  paragraph(doc, astrology.houses);

  subheading(doc, "Family");
  paragraph(doc, astrology.family);

  subheading(doc, "Love");
  paragraph(doc, astrology.loveHouse);

  subheading(doc, "Health & Wellbeing");
  paragraph(doc, astrology.health);

  subheading(doc, "Work, Career & Business");
  paragraph(doc, astrology.career);

  // Numerology (full-width narrative)
  heading(doc, "Numerology");
  paragraph(doc, numerology.summary);

  subheading(doc, "Life Path");
  paragraph(doc, numerology.lifePath);

  subheading(doc, "Expression");
  paragraph(doc, numerology.expression);

  subheading(doc, "Personality");
  paragraph(doc, numerology.personality);

  subheading(doc, "Soul Urge");
  paragraph(doc, numerology.soulUrge);

  subheading(doc, "Maturity");
  paragraph(doc, numerology.maturity);

  // Palmistry (full-width narrative)
  heading(doc, "Palmistry");
  paragraph(doc, palmistry.summary);

  subheading(doc, "Life Line");
  paragraph(doc, palmistry.lifeLine);

  subheading(doc, "Head Line");
  paragraph(doc, palmistry.headLine);

  subheading(doc, "Heart Line");
  paragraph(doc, palmistry.heartLine);

  subheading(doc, "Fate Line");
  paragraph(doc, palmistry.fateLine);

  subheading(doc, "Thumb");
  paragraph(doc, palmistry.thumb);

  subheading(doc, "Index Finger");
  paragraph(doc, palmistry.indexFinger);

  subheading(doc, "Middle Finger");
  paragraph(doc, palmistry.middleFinger);

  subheading(doc, "Ring Finger");
  paragraph(doc, palmistry.ringFinger);

  subheading(doc, "Pinky Finger");
  paragraph(doc, palmistry.pinkyFinger);

  subheading(doc, "Mounts");
  paragraph(doc, palmistry.mounts);

  subheading(doc, "Marriage / Relationship");
  paragraph(doc, palmistry.marriage);

  subheading(doc, "Children");
  paragraph(doc, palmistry.children);

  subheading(doc, "Travel Lines");
  paragraph(doc, palmistry.travelLines);

  subheading(doc, "Stress Lines");
  paragraph(doc, palmistry.stressLines);

  // Footer
  doc
    .moveDown(0.6)
    .fontSize(10)
    .fillColor("#666")
    .text("This report is for informational and entertainment purposes only.", {
      align: "center",
    });

  doc.end();
  return await getStream.buffer(doc);
}
