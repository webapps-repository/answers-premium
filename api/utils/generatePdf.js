import getStream from "get-stream";
import PDFKit from "pdfkit";

function line(doc, h = 6) {
  doc.moveDown(h / 12);
}
function sectionTitle(doc, text) {
  doc.fontSize(14).fillColor("#111").text(text, { underline: true });
  line(doc, 0.5);
}
function headerBrand(doc, brandText) {
  doc.fontSize(10).fillColor("#666").text(brandText, { align: "center" });
  line(doc, 0.2);
}

export async function generatePdfBuffer({
  headerBrand: brand = "Melodies Web",
  title = "Your Answer",
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
}) {
  const doc = new PDFKit({ margin: 56, info: { Title: title } });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  doc.on("end", () => {});

  headerBrand(doc, brand);
  doc.fontSize(20).fillColor("#000").text(title, { align: "center" });
  line(doc, 10);

  sectionTitle(doc, "Question");
  doc.fontSize(12).text(question || "—");
  line(doc, 8);

  sectionTitle(doc, "Answer");
  doc.fontSize(12).text(answer || "—");
  line(doc, 10);

  if (mode === "personal") {
    sectionTitle(doc, "Your Details");
    doc.text(`Name: ${fullName || "—"}`);
    doc.text(`DOB: ${birthdate || "—"}`);
    doc.text(`Time: ${birthTime || "Unknown"}`);
    doc.text(`Place: ${birthPlace || "—"}`);
    line(doc, 8);

    sectionTitle(doc, "Astrology");
    doc.text(astrologySummary || "—");
    line(doc, 8);

    sectionTitle(doc, "Numerology");
    doc.text(numerologySummary || "—");
    Object.entries(numerologyPack).forEach(([k, v]) => {
      doc.text(`${k}: ${v ?? "—"}`);
    });
    line(doc, 8);

    sectionTitle(doc, "Palmistry");
    doc.text(palmistrySummary || "—");
  }

  doc.end();
  return await getStream.buffer(doc);
}
