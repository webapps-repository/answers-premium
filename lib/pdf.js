// /lib/pdf.js
// Unified PERSONAL + TECHNICAL PDF generator
// Compatible with new insights.js, triad.js, ai.js, engines.js, utils.js

import PDFDocument from "pdfkit";
import { safeString } from "../lib/utils.js";

// ----------------------------------------------------------
// Helper: Create a section title
// ----------------------------------------------------------
function section(doc, title) {
  doc
    .moveDown(1)
    .fontSize(16)
    .fillColor("#333")
    .text(title, { underline: true })
    .moveDown(0.5);
}

// ----------------------------------------------------------
// Helper: Table-like K:V rendering
// ----------------------------------------------------------
function renderKeyValueBlock(doc, obj) {
  if (!obj || typeof obj !== "object") return;
  Object.entries(obj).forEach(([k, v]) => {
    doc
      .fontSize(11)
      .fillColor("#000")
      .text(`${k}: ${safeString(v)}`);
  });
  doc.moveDown(1);
}

// ----------------------------------------------------------
// PERSONAL PDF
// ----------------------------------------------------------
function buildPersonalPDF(doc, {
  question,
  fullName,
  birthDate,
  birthTime,
  birthPlace,
  insights,
  astrology,
  numerology,
  palmistry
}) {
  // HEADER
  doc
    .fontSize(22)
    .fillColor("#000")
    .text("Your Personal Spiritual Report", { align: "center" })
    .moveDown(2);

  // Birth info
  doc.fontSize(12).fillColor("#000").text(`Your Question: "${question}"`);
  doc.text(`Name: ${safeString(fullName)}`);
  doc.text(`Birth Date: ${safeString(birthDate)}`);
  doc.text(`Birth Time: ${safeString(birthTime)}`);
  doc.text(`Birth Place: ${safeString(birthPlace)}`);
  doc.moveDown(1.5);

  // SUMMARY
  section(doc, "Your Answer");
  doc.fontSize(12).text(safeString(insights.shortAnswer)).moveDown(1.5);

  // ASTROLOGY
  section(doc, "Astrological Summary");
  doc.fontSize(12).text(safeString(insights.interpretations.astrology));
  doc.moveDown(0.5);

  section(doc, "Astrological Data");
  renderKeyValueBlock(doc, astrology);

  // NUMEROLOGY
  section(doc, "Numerological Summary");
  doc.fontSize(12).text(safeString(insights.interpretations.numerology));
  doc.moveDown(0.5);

  section(doc, "Numerology Data");
  renderKeyValueBlock(doc, numerology);

  // PALMISTRY
  section(doc, "Palmistry Summary");
  doc.fontSize(12).text(safeString(insights.interpretations.palmistry));
  doc.moveDown(0.5);

  section(doc, "Palmistry Features");
  renderKeyValueBlock(doc, palmistry?.features || palmistry);

  // COMBINED
  section(doc, "Combined Alignment (Astro + Numero + Palm)");
  doc.fontSize(12).text(safeString(insights.interpretations.combined));

  // TIMELINE
  section(doc, "Timeline & Forecast");
  doc.fontSize(12).text(safeString(insights.interpretations.timeline));

  // RECOMMENDATIONS
  section(doc, "Guidance & Recommendations");
  doc.fontSize(12).text(safeString(insights.interpretations.recommendations));

  doc.end();
}

// ----------------------------------------------------------
// TECHNICAL PDF
// ----------------------------------------------------------
function buildTechnicalPDF(doc, { question, insights }) {
  doc
    .fontSize(22)
    .fillColor("#000")
    .text("Technical Report", { align: "center" })
    .moveDown(2);

  // Summary
  section(doc, "Summary");
  doc.fontSize(12).text(safeString(insights.shortAnswer));
  doc.moveDown(1);

  // Key points
  section(doc, "Key Points");
  const kp = Array.isArray(insights.keyPoints)
    ? insights.keyPoints
    : [];

  if (kp.length === 0) {
    doc.text("No key points provided.");
  } else {
    kp.forEach((p) => {
      doc.text("• " + safeString(p));
    });
  }
  doc.moveDown(1);

  // Explanation
  section(doc, "Detailed Explanation");
  doc.fontSize(12).text(safeString(insights.explanation)).moveDown(1);

  // Recommendations
  section(doc, "Recommendations");
  doc.fontSize(12).text(safeString(insights.recommendations)).moveDown(1);

  doc.end();
}

// ----------------------------------------------------------
// MAIN EXPORT: generatePDF()
// ----------------------------------------------------------
export function generatePDF(opts) {
  const {
    mode = "personal",
    question = "",
    fullName,
    birthDate,
    birthTime,
    birthPlace,
    insights = {},
    astrology,
    numerology,
    palmistry
  } = opts;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });

      const chunks = [];
      doc.on("data", (d) => chunks.push(d));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      if (mode === "technical") {
        buildTechnicalPDF(doc, { question, insights });
      } else {
        buildPersonalPDF(doc, {
          question,
          fullName,
          birthDate,
          birthTime,
          birthPlace,
          insights,
          astrology,
          numerology,
          palmistry
        });
      }
    } catch (err) {
      reject(err);
    }
  });
}
