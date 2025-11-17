// /api/utils/generate-pdf.js
// Enhanced PDF builder for unified detailed spiritual reports + technical reports

import PDFDocument from "pdfkit";
import { promisify } from "util";
import fs from "fs";

export function generatePDF({
  mode = "personal",
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
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40
      });

      // ------------------------------
      // Buffer PDF into memory
      // ------------------------------
      const chunks = [];
      doc.on("data", (d) => chunks.push(d));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // ------------------------------
      // HEADER
      // ------------------------------
      doc
        .fontSize(20)
        .text("Melodies Web — Detailed Report", {
          align: "center"
        })
        .moveDown(2);

      // ------------------------------
      // Intro
      // ------------------------------
      doc
        .fontSize(12)
        .text(`Your Question: "${question}"`, {
          align: "left"
        })
        .moveDown();

      if (mode === "personal") {
        doc.text(`Name: ${fullName || "N/A"}`);
        doc.text(`Birth Date: ${birthDate || "N/A"}`);
        doc.text(`Birth Time: ${birthTime || "N/A"}`);
        doc.text(`Birth Place: ${birthPlace || "N/A"}`);
        doc.moveDown();
      }

      doc
        .fontSize(14)
        .fillColor("#333")
        .text("Summary Answer", { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(11)
        .fillColor("black")
        .text(insights.shortAnswer, { align: "left" })
        .moveDown(1.5);

      // ===========================================
      // PERSONAL REPORT SECTIONS
      // ===========================================
      if (mode === "personal") {
        // ------------------------------
        // ASTROLOGY INTERPRETATION
        // ------------------------------
        createSectionHeader(doc, "Astrological Interpretation");
        doc.text(insights.interpretations.astrology, { align: "left" }).moveDown();

        createAstrologyTables(doc, astrology);

        // ------------------------------
        // NUMEROLOGY
        // ------------------------------
        createSectionHeader(doc, "Numerological Interpretation");
        doc.text(insights.interpretations.numerology, { align: "left" }).moveDown();

        createNumerologyTable(doc, numerology);

        // ------------------------------
        // PALMISTRY
        // ------------------------------
        createSectionHeader(doc, "Palmistry Interpretation");
        doc.text(insights.interpretations.palmistry, { align: "left" }).moveDown();

        createPalmistryTable(doc, palmistry);

        // ------------------------------
        // COMBINED SYNTHESIS
        // ------------------------------
        createSectionHeader(doc, "Combined Synthesis (Astrology + Numerology + Palmistry)");
        doc.text(insights.interpretations.combined, { align: "left" }).moveDown();

        // ------------------------------
        // TIMELINE / FORECAST
        // ------------------------------
        createSectionHeader(doc, "Timeline & Forecast");
        doc.text(insights.interpretations.timeline, { align: "left" }).moveDown();

        // ------------------------------
        // RECOMMENDATIONS
        // ------------------------------
        createSectionHeader(doc, "Guidance & Recommendations");
        doc.text(insights.interpretations.recommendations, { align: "left" }).moveDown();
      }

      // ===========================================
      // TECHNICAL REPORT SECTIONS
      // ===========================================
      if (mode === "technical") {
        createSectionHeader(doc, "Key Points");
        doc.text(insights.keyPoints.join("\n• "), { align: "left" }).moveDown();

        createSectionHeader(doc, "Detailed Explanation");
        doc.text(insights.explanation, { align: "left" }).moveDown();
      }
