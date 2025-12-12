// /lib/pdf.js
import PDFDocument from "pdfkit";

/**
 * Generate a simple PDF for the premium report.
 * (Matches the current usage in detailed-report.js)
 */
export async function generatePDF({ email, created }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // -------------------------
      // PDF CONTENT
      // -------------------------
      doc.fontSize(22).text("Your Premium Spiritual Report", { align: "center" });
      doc.moveDown(2);

      doc.fontSize(14).text(`Prepared for: ${email}`);
      doc.text(`Generated at: ${created}`);
      doc.moveDown(2);

      doc.fontSize(12).text(
        "This is your premium extended insight. Your full multi-modality report system " +
        "(astrology, numerology, palmistry) is not yet enabled in this build, but the " +
        "PDF generator is fully functional and verified."
      );

      doc.moveDown();
      doc.text(
        "In upcoming versions, this report will include:\n" +
        "• Full natal chart interpretation\n" +
        "• Numerology life-path analysis\n" +
        "• Palmistry intuitive reading\n\n" +
        "Thank you for supporting the development process!"
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
