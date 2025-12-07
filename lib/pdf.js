// /lib/pdf.js

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * insights = output from generateInsights()
 * Returns: Buffer of the PDF file.
 */
export async function generatePDF(insights) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const pageWidth = 595.28; // A4-ish
  const pageHeight = 841.89;

  function newPage() {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    return { page, y: pageHeight - margin };
  }

  let { page, y } = newPage();

  function addTitle(text) {
    const fontSize = 22;
    if (y < margin + fontSize * 2) {
      ({ page, y } = newPage());
    }

    page.drawText(text, {
      x: margin,
      y,
      size: fontSize,
      font: fontBold,
      color: rgb(0.3, 0.1, 0.5),
    });
    y -= fontSize + 10;

    // Gradient-style divider (simulated with line)
    page.drawLine({
      start: { x: margin, y: y },
      end: { x: pageWidth - margin, y: y },
      thickness: 2,
      color: rgb(0.6, 0.4, 0.9),
    });
    y -= 20;
  }

  function addSectionHeading(text) {
    const fontSize = 16;
    if (y < margin + fontSize * 2) {
      ({ page, y } = newPage());
    }

    page.drawText(text, {
      x: margin,
      y,
      size: fontSize,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.6),
    });
    y -= fontSize + 8;
  }

  function addParagraph(text) {
    const fontSize = 11;
    const lineHeight = fontSize + 4;
    const maxWidth = pageWidth - margin * 2;

    const words = text.split(/\s+/);
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const width = fontRegular.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth) {
        if (y < margin + lineHeight) {
          ({ page, y } = newPage());
        }
        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font: fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) {
      if (y < margin + lineHeight) {
        ({ page, y } = newPage());
      }
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineHeight + 4;
    }
    y -= 4;
  }

  function addBulletList(items) {
    const fontSize = 11;
    const lineHeight = fontSize + 4;
    const maxWidth = pageWidth - margin * 2 - 15;

    for (const item of items) {
      const words = item.split(/\s+/);
      let line = "";
      let firstLine = true;

      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const width = fontRegular.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth) {
          if (y < margin + lineHeight) {
            ({ page, y } = newPage());
          }
          page.drawText(firstLine ? "• " : "  ", {
            x: margin,
            y,
            size: fontSize,
            font: fontBold,
          });
          page.drawText(line, {
            x: margin + 12,
            y,
            size: fontSize,
            font: fontRegular,
          });
          y -= lineHeight;
          line = word;
          firstLine = false;
        } else {
          line = testLine;
        }
      }

      if (line) {
        if (y < margin + lineHeight) {
          ({ page, y } = newPage());
        }
        page.drawText(firstLine ? "• " : "  ", {
          x: margin,
          y,
          size: fontSize,
          font: fontBold,
        });
        page.drawText(line, {
          x: margin + 12,
          y,
          size: fontSize,
          font: fontRegular,
        });
        y -= lineHeight;
      }
    }
    y -= 6;
  }

  const { person, question, astrology, numerology, palmistry, meta } = insights;

  // === COVER PAGE ===
  addTitle("Premium Spiritual Report");
  addSectionHeading(person.fullName || "Your Cosmic Blueprint");

  addParagraph(
    `Prepared for ${person.fullName || "you"} on ${new Date(
      meta.createdAt || Date.now()
    ).toLocaleString()}`
  );

  addParagraph(
    `Date of birth: ${person.dateOfBirth || "Unknown"} ${
      person.timeOfBirth ? `at ${person.timeOfBirth}` : ""
    }`
  );

  if (person.birthPlace) {
    addParagraph(`Birth place: ${person.birthPlace}`);
  }

  if (question) {
    addSectionHeading("Your Key Question");
    addParagraph(question);
  }

  // === ASTROLOGY SECTION ===
  addSectionHeading("Astrology: Natal Blueprint");

  if (astrology.offline) {
    addParagraph(
      astrology.meta?.message ||
        "Astrology data is presented in a simplified, intuitive format."
    );
  } else {
    addParagraph(
      "This section explores your natal chart, planetary placements, houses and key aspects that shape your personality and life themes."
    );
  }

  if (astrology.natal) {
    const { sunSign, moonSign, risingSign } = astrology.natal;
    addBulletList([
      `Sun sign: ${sunSign || "Unknown"}`,
      `Moon sign: ${moonSign || "Unknown"}`,
      `Rising (Ascendant): ${risingSign || "Unknown"}`,
    ]);
  }

  // You can extend this to render houses/aspects as tables later.
  addParagraph(
    "Your chart weaves together these energies into a unique cosmic fingerprint, guiding your emotional needs, mindset, relationships and life direction."
  );

  // === NUMEROLOGY SECTION ===
  addSectionHeading("Numerology: Soul Codes");

  const core = numerology.coreNumbers || {};
  addBulletList([
    `Life Path: ${core.lifePath ?? "–"}`,
    `Expression: ${core.expression ?? "–"}`,
    `Soul Urge: ${core.soulUrge ?? "–"}`,
    `Personality: ${core.personality ?? "–"}`,
    `Birthday: ${core.birthday ?? "–"}`,
  ]);

  addParagraph(
    "These core numbers describe your soul’s journey, natural talents, emotional desires and the way others first perceive you."
  );

  const pin = numerology.pinnacles || {};
  const chal = numerology.challenges || {};
  addBulletList([
    `First Pinnacle: ${pin.first ?? "–"}`,
    `Second Pinnacle: ${pin.second ?? "–"}`,
    `First Challenge: ${chal.first ?? "–"}`,
    `Second Challenge: ${chal.second ?? "–"}`,
  ]);

  addParagraph(
    "Pinnacles reveal long-term cycles of opportunity and growth, while challenge numbers show the lessons your soul is actively working through."
  );

  // === PALMISTRY SECTION ===
  addSectionHeading("Palmistry: Messages in Your Hands");

  if (palmistry.offline) {
    addParagraph(
      palmistry.meta?.message ||
        "Your hands suggest a sensitive and perceptive spirit, with strong potential for intuitive growth."
    );
    if (palmistry.summary) {
      addParagraph(palmistry.summary);
    }
  } else if (palmistry.raw) {
    addParagraph(
      "Below is a distilled interpretation of your palm image, focusing on lines, mounts and markings with the strongest messages for you."
    );
    addParagraph(palmistry.raw);
  } else {
    addParagraph(
      "Palmistry insights were not available for this report, but your hands remain a living map of your evolving path."
    );
  }

  // === CLOSING SECTION ===
  addSectionHeading("Integration & Next Steps");

  addParagraph(
    "This premium report weaves together astrology, numerology and palmistry to illuminate your path. Use these insights as a mirror, not a cage—your free will, choices and daily actions are the most powerful forces in your life."
  );

  addBulletList([
    "Revisit this report during key transitions – birthdays, new jobs, big moves.",
    "Highlight the phrases that resonate most and keep them somewhere visible.",
    "Treat any challenges as invitations to grow, not fixed limitations.",
  ]);

  addParagraph(
    "Thank you for trusting this process. May this guide support you in aligning with your deepest truth and highest potential."
  );

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
