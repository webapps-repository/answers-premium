// /lib/pdf.js
import { PDFDocument, StandardFonts } from "pdf-lib";

/**
 * Very simple HTML-to-PDF: strips tags and prints as plain text.
 * If you had a Chromium/puppeteer-based version before, plug it in here instead.
 */
export async function generatePDFBufferFromHTML(html) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();

  const fontSize = 10;
  const margin = 40;

  const wrapped = wrapText(text, {
    maxWidth: width - margin * 2,
    font,
    fontSize
  });

  page.drawText(wrapped, {
    x: margin,
    y: height - margin,
    size: fontSize,
    font,
    lineHeight: fontSize * 1.4
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Simple text wrapper for pdf-lib
function wrapText(text, { maxWidth, font, fontSize }) {
  const words = text.split(/\s+/);
  let line = "";
  let result = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, fontSize);

    if (width > maxWidth && line) {
      result += line + "\n";
      line = w;
    } else {
      line = test;
    }
  }
  if (line) result += line;
  return result;
}
