// /api/utils/generate-pdf.js
import PDFDocument from "pdfkit";

export async function generatePdfBuffer(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const chunks = [];

      const safe = (val) => (val ? String(val) : "");

      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // Title
      doc.fontSize(20).text(safe(data.headerBrand), { align: "center" });
      doc.moveDown(1);
      doc.fontSize(14).text("Your Detailed Report", { align: "center" });
      doc.moveDown(2);

      // Question + Answer
      doc.fontSize(12).text(`Question: ${safe(data.question)}`);
      doc.moveDown();
      doc.text(`Answer: ${safe(data.answer)}`);
      doc.moveDown(2);

      // Astrology
      if (safe(data.astrologySummary)) {
        doc.fontSize(14).text("Astrology", { underline: true });
        doc.fontSize(12).text(safe(data.astrologySummary));
        doc.moveDown(2);
      }

      // Numerology
      if (safe(data.numerologySummary)) {
        doc.fontSize(14).text("Numerology", { underline: true });
        doc.fontSize(12).text(safe(data.numerologySummary));
        doc.moveDown(2);
      }

      // Palmistry
      if (safe(data.palmistrySummary)) {
        doc.fontSize(14).text("Palmistry", { underline: true });
        doc.fontSize(12).text(safe(data.palmistrySummary));
        doc.moveDown(2);
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
