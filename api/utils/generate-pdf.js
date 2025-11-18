// /api/utils/generate-pdf.js
// Enhanced PDF builder for unified detailed spiritual reports + technical reports

import PDFDocument from "pdfkit";

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
      const doc = new PDFDocument({ size: "A4", margin: 40 });

      const chunks = [];
      doc.on("data", (d) => chunks.push(d));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // ------------------------------
      // HEADER
      // ------------------------------
      doc
        .fontSize(20)
        .text("Melodies Web — Detailed Report", { align: "center" })
        .moveDown(2);

      // ------------------------------
      // QUESTION
      // ------------------------------
      doc
        .fontSize(12)
        .text(`Your Question: "${question}"`, { align: "left" })
        .moveDown();

      if (mode === "personal") {
        doc.text(`Name: ${fullName || "N/A"}`);
        doc.text(`Birth Date: ${birthDate || "N/A"}`);
        doc.text(`Birth Time: ${birthTime || "N/A"}`);
        doc.text(`Birth Place: ${birthPlace || "N/A"}`);
        doc.moveDown();
      }

      // ------------------------------
      // SUMMARY ANSWER
      // ------------------------------
      createSectionHeader(doc, "Summary Answer");
      doc
        .fontSize(11)
        .fillColor("black")
        .text(insights.shortAnswer || "No summary available.", { align: "left" })
        .moveDown(1.5);

      // ======================================================
      // PERSONAL MODE
      // ======================================================
      if (mode === "personal") {
        // Astrology
        createSectionHeader(doc, "Astrological Interpretation");
        doc.text(insights.interpretations?.astrology || "N/A", { align: "left" }).moveDown();
        createAstrologyTables(doc, astrology);

        // Numerology
        createSectionHeader(doc, "Numerological Interpretation");
        doc.text(insights.interpretations?.numerology || "N/A", { align: "left" }).moveDown();
        createNumerologyTable(doc, numerology);

        // Palmistry
        createSectionHeader(doc, "Palmistry Interpretation");
        doc.text(insights.interpretations?.palmistry || "N/A", { align: "left" }).moveDown();
        createPalmistryTable(doc, palmistry);

        // Combined Synthesis
        createSectionHeader(doc, "Combined Synthesis (Astrology + Numerology + Palmistry)");
        doc.text(insights.interpretations?.combined || "N/A", { align: "left" }).moveDown();

        // Timeline
        createSectionHeader(doc, "Timeline & Forecast");
        doc.text(insights.interpretations?.timeline || "N/A", { align: "left" }).moveDown();

        // Recommendations
        createSectionHeader(doc, "Guidance & Recommendations");
        doc.text(insights.interpretations?.recommendations || "N/A", { align: "left" }).moveDown();
      }

      // ======================================================
      // TECHNICAL MODE — FULLY PATCHED SAFE VERSION
      // ======================================================
      if (mode === "technical") {
        // Flexible keyPoint handling
        const keyPoints =
          insights.keyPointsFinal ||
          insights.keyPoints ||
          [];

        createSectionHeader(doc, "Key Points");

        if (Array.isArray(keyPoints)) {
          doc.text("• " + keyPoints.join("\n• "), { align: "left" }).moveDown();
        } else if (typeof keyPoints === "string") {
          doc.text(keyPoints, { align: "left" }).moveDown();
        } else {
          doc.text("No key points available.", { align: "left" }).moveDown();
        }

        // Detailed Explanation
        createSectionHeader(doc, "Detailed Explanation");

        if (Array.isArray(insights.explanation)) {
          doc.text(insights.explanation.join("\n\n"), { align: "left" }).moveDown();
        } else {
          doc.text(insights.explanation || "No explanation provided.", { align: "left" }).moveDown();
        }

        // Recommendations
        createSectionHeader(doc, "Recommendations");

        const recs = insights.recommendations;

        if (Array.isArray(recs)) {
          doc.text("• " + recs.join("\n• "), { align: "left" }).moveDown();
        } else {
          doc.text(recs || "No recommendations available.", { align: "left" }).moveDown();
        }
      }

      // END PDF
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/* ======================================================
   HELPERS
====================================================== */

function createSectionHeader(doc, title) {
  doc
    .moveDown()
    .fontSize(14)
    .fillColor("#333")
    .text(title, { underline: true })
    .moveDown(0.5);
}

function createAstrologyTables(doc, astrology) {
  if (!astrology) return;
  doc.fontSize(11).text("Astrological Data:", { align: "left" });
  for (const [k, v] of Object.entries(astrology)) {
    doc.text(`${k}: ${v}`);
  }
  doc.moveDown();
}

function createNumerologyTable(doc, numerology) {
  if (!numerology) return;
  doc.fontSize(11).text("Numerology Data:", { align: "left" });
  for (const [k, v] of Object.entries(numerology)) {
    doc.text(`${k}: ${v}`);
  }
  doc.moveDown();
}

function createPalmistryTable(doc, palmistry) {
  if (!palmistry) return;
  doc.fontSize(11).text("Palmistry Data:", { align: "left" });
  for (const [k, v] of Object.entries(palmistry)) {
    doc.text(`${k}: ${v}`);
  }
  doc.moveDown();
}
