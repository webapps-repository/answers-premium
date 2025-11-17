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
  palmistry
}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });

      const chunks = [];
      doc.on("data", d => chunks.push(d));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      doc.fontSize(20)
        .text("Melodies Web — Detailed Report", { align: "center" })
        .moveDown();

      doc.fontSize(12)
        .text(`Your Question: "${question}"`)
        .moveDown();

      if (mode === "personal") {
        doc.text(`Name: ${fullName || "N/A"}`);
        doc.text(`Birth Date: ${birthDate || "N/A"}`);
        doc.text(`Birth Time: ${birthTime || "N/A"}`);
        doc.text(`Birth Place: ${birthPlace || "N/A"}`);
        doc.moveDown();
      }

      // summary
      doc.fontSize(14)
        .text("Summary", { underline: true })
        .moveDown(0.5);

      doc.fontSize(11)
        .text(insights.shortAnswer)
        .moveDown();

      // personal sections
      if (mode === "personal") {
        section(doc, "Astrology Interpretation", insights.interpretations.astrology);
        section(doc, "Numerology Interpretation", insights.interpretations.numerology);
        section(doc, "Palmistry Interpretation", insights.interpretations.palmistry);
        section(doc, "Combined Synthesis", insights.interpretations.combined);
        section(doc, "Timeline & Forecast", insights.interpretations.timeline);
        section(doc, "Recommendations", insights.interpretations.recommendations);
      }

      // technical sections
      if (mode === "technical") {
        section(doc, "Key Points", "• " + insights.keyPoints.join("\n• "));
        section(doc, "Explanation", insights.explanation);
        section(doc, "Recommendations", insights.recommendations);
      }

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
}

function section(doc, title, content) {
  doc.moveDown()
    .fontSize(14)
    .text(title, { underline: true })
    .moveDown(0.5);

  doc.fontSize(11).text(content).moveDown();
}
