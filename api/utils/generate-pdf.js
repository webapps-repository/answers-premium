// /api/utils/generate-pdf.js
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
  palmistry,
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });

      const chunks = [];
      doc.on("data", (d) => chunks.push(d));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).text("Melodies Web — Detailed Report", {
        align: "center",
      }).moveDown(2);

      // Question
      doc.fontSize(12).text(`Your Question: "${question}"`).moveDown();

      // Personal data
      if (mode === "personal") {
        doc.text(`Name: ${fullName || "N/A"}`);
        doc.text(`Birth Date: ${birthDate || "N/A"}`);
        doc.text(`Birth Time: ${birthTime || "N/A"}`);
        doc.text(`Birth Place: ${birthPlace || "N/A"}`).moveDown();
      }

      // Short Answer
      createHeader(doc, "Summary Answer");
      doc.fontSize(11).text(insights.shortAnswer).moveDown();

      // ----------------------------------------------------
      // PERSONAL MODE CONTENT
      // ----------------------------------------------------
      if (mode === "personal") {
        createHeader(doc, "Astrological Interpretation");
        doc.text(insights.interpretations.astrology).moveDown();
        buildTable(doc, "Astrological Data", astrology);

        createHeader(doc, "Numerological Interpretation");
        doc.text(insights.interpretations.numerology).moveDown();
        buildTable(doc, "Numerology Data", numerology);

        createHeader(doc, "Palmistry Interpretation");
        doc.text(insights.interpretations.palmistry).moveDown();
        buildTable(doc, "Palmistry Features", palmistry?.features);

        createHeader(doc, "Combined Synthesis");
        doc.text(insights.interpretations.combined).moveDown();

        createHeader(doc, "Timeline & Forecast");
        doc.text(insights.interpretations.timeline).moveDown();

        createHeader(doc, "Recommendations");
        doc.text(insights.interpretations.recommendations).moveDown();
      }

      // ----------------------------------------------------
      // TECHNICAL MODE CONTENT
      // ----------------------------------------------------
      if (mode === "technical") {
        createHeader(doc, "Key Points");
        doc.text("• " + insights.keyPoints.join("\n• ")).moveDown();

        createHeader(doc, "Detailed Explanation");
        doc.text(insights.explanation).moveDown();

        createHeader(doc, "Recommendations");
        doc.text(insights.recommendations).moveDown();
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
function createHeader(doc, title) {
  doc.moveDown().fontSize(14).fillColor("#222")
    .text(title, { underline: true })
    .moveDown(0.5);
}

function buildTable(doc, title, obj) {
  if (!obj) return;
  doc.fontSize(11).fillColor("#000").text(`${title}:`);
  Object.entries(obj).forEach(([k, v]) => {
    doc.text(`${k}: ${v}`);
  });
  doc.moveDown();
}
